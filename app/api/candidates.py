import os
import tempfile
import json
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    BackgroundTasks,
    Query,
    Header,
    Request,
    status,
)
from sqlalchemy import String
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, time

from app.core.database import get_db, SessionLocal
from app.models.candidate import Candidate
from app.models.job import Job
from app.models.user import User
from app.services.activity_logger import log_activity
from app.schemas.activity_log import ActionType
from app.schemas.candidate import (
    CandidateCreate,
    CandidateResponse,
    CandidateStageUpdate,
    CandidateNoteCreate,
    PaginatedCandidatesResponse,
)
from app.services.parser import parse_candidate_cv
from app.services.evaluator import evaluate_candidate
from app.services.cv_store import save_cv
from app.core.config import settings
from app.api.dependencies import RequireRole, get_current_user
from app.core.logger import logger
from app.services.recaptcha import verify_recaptcha
from app.core.limiter import limiter

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.post("/parse")
@limiter.limit("10/minute")
async def parse_cv(
    request: Request,
    file: UploadFile = File(...),
    x_recaptcha_token: Optional[str] = Header(None, alias="X-Recaptcha-Token"),
):
    if settings.RECAPTCHA_API_KEY:
        is_valid = await verify_recaptcha(
            token=x_recaptcha_token,
            action="parse_resume",
            site_key=settings.RECAPTCHA_SITE_KEY,
            project_id=settings.RECAPTCHA_PROJECT_ID,
            api_key=settings.RECAPTCHA_API_KEY,
        )
        if not is_valid:
            raise HTTPException(
                status_code=400, detail="reCAPTCHA verification failed."
            )
    else:
        logger.warning(
            "reCAPTCHA API Key is not set. Bypassing verification for local development."
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        parsed_data = await parse_candidate_cv(tmp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    return parsed_data


async def evaluate_candidate_background(
    candidate_id: str, job_id: str, candidate_data: dict
):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error(
                f"Job {job_id} not found for background evaluation of candidate {candidate_id}"
            )
            return

        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            logger.error(
                f"Candidate {candidate_id} not found for background evaluation"
            )
            return

        logger.info(
            f"Starting background evaluation for candidate {candidate.name} (ID: {candidate_id})"
        )

        eval_result = await evaluate_candidate(
            candidate_data=candidate_data, job_description=job.description
        )

        match_score = eval_result.get("match_score", 0)
        tier = "Weak Fit"
        if match_score >= 80:
            tier = "Strong Fit"
        elif match_score >= 50:
            tier = "Moderate Fit"

        candidate.match = match_score
        candidate.tier = tier
        candidate.summary = eval_result.get("summary", "")
        candidate.scores = eval_result.get("criteria_scores", [])
        candidate.strengths = eval_result.get("strengths", [])
        candidate.weaknesses = eval_result.get("weaknesses", [])

        log_activity(
            db=db,
            action_type=ActionType.CANDIDATE_EVALUATED,
            description=f"System evaluated candidate {candidate.name} (Match: {match_score}%)",
            user_name="System (Evaluator)",
            user_email=candidate.email,
            job_id=job.id,
            candidate_id=candidate.id,
        )
        db.commit()
        db.flush()
        logger.info(
            f"Background evaluation successfully completed for candidate {candidate.name}"
        )
    except Exception as e:
        db.rollback()
        logger.error(
            f"Failed to evaluate candidate {candidate_id} in background: {str(e)}"
        )
    finally:
        db.close()


@router.post("/submit", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def submit_application(
    request: Request,
    background_tasks: BackgroundTasks,
    candidate: str = Form(...),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    try:
        cand_dict = json.loads(candidate)
        cand_obj = CandidateCreate(**cand_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid candidate JSON: {str(e)}")

    job = db.query(Job).filter(Job.id == cand_obj.jobId).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    cand_data = cand_obj.model_dump()

    cv_filename = None
    if file:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
        cv_filename = save_cv(file)

    cv_url = None
    if cv_filename:
        base_url = settings.BASE_URL
        cv_url = f"{base_url}/static/cvs/{cv_filename}"

    # Extract nested fields
    personal = cand_data.get("personal_info", {}) or {}
    prof_summary = cand_data.get("professional_summary", {}) or {}
    exp_list = cand_data.get("experience", []) or []
    edu_list = cand_data.get("education", []) or []
    cert_list = cand_data.get("certifications", []) or []
    lang_list = cand_data.get("languages", []) or []

    # Map flat compat fields
    flat_name = (
        personal.get("full_name")
        or f"{personal.get('first_name', '')} {personal.get('last_name', '')}".strip()
        or "Unknown"
    )
    flat_email = personal.get("email") or ""
    flat_phone = personal.get("phone") or ""
    flat_experience = float(prof_summary.get("total_experience_years") or 0.0)
    flat_education = edu_list[0].get("degree", "") if edu_list else ""
    flat_location = f"{personal.get('address', {}).get('city', '')}, {personal.get('address', {}).get('country', '')}".strip(
        ", "
    )
    flat_title = exp_list[0].get("job_title", "") if exp_list else ""
    flat_company = exp_list[0].get("company_name", "") if exp_list else ""

    # Map legacy nested collections for recruiter view compatibility
    legacy_edu = [
        {
            "degree": item.get("degree", ""),
            "school": item.get("institution_name", ""),
            "start": item.get("start_date", "")[:4] if item.get("start_date") else "",
            "end": item.get("end_date", "")[:4] if item.get("end_date") else "",
        }
        for item in edu_list
    ]
    legacy_work = [
        {
            "role": item.get("job_title", ""),
            "company": item.get("company_name", ""),
            "start": item.get("start_date", "")[:4] if item.get("start_date") else "",
            "end": item.get("end_date", "")[:4] if item.get("end_date") else "Present",
            "description": item.get("work_summary", ""),
        }
        for item in exp_list
    ]
    legacy_links = personal.get("profiles", {}) or {}
    legacy_certs = [item.get("name") for item in cert_list if item.get("name")]
    legacy_langs = [
        {"name": item.get("language"), "level": item.get("proficiency")}
        for item in lang_list
        if item.get("language")
    ]

    meta_salary = (
        prof_summary.get("expected_salary")
        or cand_data.get("custom_fields", {}).get("salaryExpectation")
        or "Negotiable"
    )
    meta_avail = cand_data.get("custom_fields", {}).get("availability") or "Immediate"
    meta_auth = (
        "Authorized"
        if prof_summary.get("authorized_to_work_in_nepal")
        else "Requires Sponsorship"
    )
    meta_notice = f"{prof_summary.get('notice_period_days', 0)} days"

    db_candidate = Candidate(
        jobId=cand_obj.jobId,
        name=flat_name,
        email=flat_email,
        phone=flat_phone,
        experience=flat_experience,
        education=flat_education,
        location=flat_location,
        title=flat_title,
        company=flat_company,
        educationHistory=legacy_edu,
        skills=cand_data.get("skills", []),
        languages=legacy_langs,
        certifications=legacy_certs,
        achievements=cand_data.get("achievements", []),
        links=legacy_links,
        workHistory=legacy_work,
        salaryExpectation=meta_salary,
        availability=meta_avail,
        workAuthorization=meta_auth,
        noticePeriod=meta_notice,
        source="Careers Page",
        personal_info=personal,
        professional_summary=prof_summary,
        experience_history=exp_list,
        education_history=edu_list,
        projects=cand_data.get("projects", []),
        certifications_history=cert_list,
        languages_history=lang_list,
        awards=cand_data.get("awards", []),
        publications=cand_data.get("publications", []),
        candidate_preferences=cand_data.get("candidate_preferences", {}),
        custom_fields=cand_data.get("custom_fields", {}),
        match=0,
        tier="Pending",
        summary="Evaluating candidate profile...",
        scores=[],
        strengths=[],
        weaknesses=[],
        stage="Applied",
        pastStages=["Applied"],
        cv_filelink=cv_filename,
        cvUrl=cv_url,
        appliedDate=datetime.now(timezone.utc),
    )

    db.add(db_candidate)
    
    # Atomic increment of applicant count (H9)
    db.query(Job).filter(Job.id == job.id).update({Job.applicants: Job.applicants + 1})

    db.flush()

    background_tasks.add_task(
        evaluate_candidate_background,
        candidate_id=db_candidate.id,
        job_id=job.id,
        candidate_data=cand_data,
    )

    log_activity(
        db=db,
        action_type=ActionType.CANDIDATE_APPLIED,
        description=f"Candidate {db_candidate.name} applied for job '{job.title}'",
        user_name="System (Applicant)",
        user_email=db_candidate.email,
        job_id=job.id,
        candidate_id=db_candidate.id,
    )

    db.commit()
    db.refresh(db_candidate)
    return db_candidate


@router.get("/fetch", response_model=PaginatedCandidatesResponse, dependencies=[Depends(get_current_user)])
def get_candidates(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=10000),
    jobId: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    minScore: Optional[int] = Query(None),
    minExp: Optional[float] = Query(None),
    stage: Optional[str] = Query(None),
    tiers: Optional[List[str]] = Query(None),
    sort_by: str = Query("match"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
):
    query = db.query(Candidate)

    if jobId:
        query = query.filter(Candidate.jobId == jobId)
    else:
        query = query.join(Job).filter(Job.status == "Active")

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Candidate.name.ilike(search_filter))
            | (Candidate.skills.cast(String).ilike(search_filter))
        )

    if minScore is not None and minScore > 0:
        query = query.filter(Candidate.match >= minScore)

    if minExp is not None and minExp > 0:
        query = query.filter(Candidate.experience >= minExp)

    if stage and stage != "All":
        query = query.filter(Candidate.stage == stage)

    if tiers:
        actual_tiers = []
        for t in tiers:
            if "," in t:
                actual_tiers.extend(t.split(","))
            else:
                actual_tiers.append(t)
        query = query.filter(Candidate.tier.in_(actual_tiers))

    # Sorting
    ALLOWED_SORT_FIELDS = {"name", "match", "experience", "stage", "appliedDate", "title", "location"}
    if sort_by not in ALLOWED_SORT_FIELDS:
        sort_by = "match"

    if sort_by == "appliedDate":
        sort_column = Candidate.appliedDate
    else:
        sort_column = getattr(Candidate, sort_by, Candidate.match)

    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    total = query.count()
    offset = (page - 1) * size
    candidates = query.offset(offset).limit(size).all()
    pages = (total + size - 1) // size if total > 0 else 0

    base_url = settings.BASE_URL
    for c in candidates:
        if c.cv_filelink and not c.cvUrl:
            c.cvUrl = f"{base_url}/static/cvs/{c.cv_filelink}"

    return {
        "items": candidates,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


@router.get("/reports", dependencies=[Depends(get_current_user)])
def get_recruitment_report(
    start: str = Query(...),
    end: str = Query(...),
    db: Session = Depends(get_db),
):
    try:
        start_dt = datetime.combine(datetime.strptime(start, "%Y-%m-%d"), time.min).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(datetime.strptime(end, "%Y-%m-%d"), time.max).replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    # 1. Filter jobs posted within the date range
    filtered_jobs = db.query(Job).filter(Job.postedDate >= start_dt, Job.postedDate <= end_dt).all()
    job_ids = [j.id for j in filtered_jobs]

    # 2. Filter candidates whose appliedDate is in the range, and who belong to the filtered jobs
    if job_ids:
        filtered_candidates = db.query(Candidate).filter(
            Candidate.jobId.in_(job_ids),
            Candidate.appliedDate >= start_dt,
            Candidate.appliedDate <= end_dt
        ).all()
    else:
        filtered_candidates = []

    # Helper function to aggregate funnel counts
    def aggregate_funnel_counts(candidates_list):
        counts = {
            "applied": 0,
            "screened": 0,
            "shortlisted": 0,
            "interviewed": 0,
            "finalReview": 0,
            "offer": 0,
            "hired": 0,
            "rejected": 0,
        }
        for c in candidates_list:
            counts["applied"] += 1
            past_stages = c.pastStages or []
            if "Screening" in past_stages or c.stage == "Screening":
                counts["screened"] += 1
            if "Shortlisted" in past_stages or c.stage == "Shortlisted":
                counts["shortlisted"] += 1
            if "Interview" in past_stages or c.stage == "Interview" or c.stage == "Interviewing":
                counts["interviewed"] += 1
            if "Final Review" in past_stages or c.stage == "Final Review":
                counts["finalReview"] += 1
            if "Offer" in past_stages or c.stage == "Offer":
                counts["offer"] += 1
            if "Hired" in past_stages or c.stage == "Hired":
                counts["hired"] += 1
            if "Rejected" in past_stages or c.stage == "Rejected":
                counts["rejected"] += 1
        return counts

    # Compute overall cumulative funnel counts for filtered candidates
    summary_stats = aggregate_funnel_counts(filtered_candidates)
    summary_stats["jobs"] = len(filtered_jobs)

    # Map each job to its funnel breakdown
    job_breakdown = []
    for job in filtered_jobs:
        job_candidates = [c for c in filtered_candidates if c.jobId == job.id]
        job_stats = aggregate_funnel_counts(job_candidates)
        
        job_breakdown.append({
            "id": job.id,
            "title": job.title,
            "department": job.department,
            "status": job.status,
            "postedDate": job.postedDate.isoformat() if job.postedDate else "",
            "applied": job_stats["applied"],
            "screened": job_stats["screened"],
            "shortlisted": job_stats["shortlisted"],
            "interviewed": job_stats["interviewed"],
            "finalReview": job_stats["finalReview"],
            "offer": job_stats["offer"],
            "hired": job_stats["hired"],
            "rejected": job_stats["rejected"],
        })

    return {
        "summaryStats": summary_stats,
        "jobBreakdown": job_breakdown,
    }


@router.get("/{candidate_id}", response_model=CandidateResponse, dependencies=[Depends(get_current_user)])
def get_candidate_by_id(
    candidate_id: str,
    db: Session = Depends(get_db),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    base_url = settings.BASE_URL
    if candidate.cv_filelink and not candidate.cvUrl:
        candidate.cvUrl = f"{base_url}/static/cvs/{candidate.cv_filelink}"

    return candidate


@router.post("/{candidate_id}/stage", response_model=CandidateResponse)
def update_candidate_stage(
    candidate_id: str,
    stage_update: CandidateStageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPERADMIN", "ADMIN", "RECRUITER"])),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    old_stage = candidate.stage
    candidate.stage = stage_update.stage

    if old_stage != candidate.stage:
        if candidate.pastStages is None:
            candidate.pastStages = []
        past = list(candidate.pastStages)
        past.append(old_stage)
        candidate.pastStages = past

    # Use the centralized activity logger
    log_activity(
        db=db,
        action_type=ActionType.CANDIDATE_STAGE_UPDATED,
        description=f"Moved candidate {candidate.name} from {old_stage} to {candidate.stage}",
        user_name=current_user.name,
        user_email=current_user.email,
        job_id=candidate.jobId,
        candidate_id=candidate.id,
    )

    db.commit()
    db.refresh(candidate)

    # Flatten fields for response
    # ... existing flatten logic handled in response_model ?
    # Actually just set basic fields if missing
    base_url = settings.BASE_URL
    if candidate.cv_filelink and not candidate.cvUrl:
        candidate.cvUrl = f"{base_url}/static/cvs/{candidate.cv_filelink}"

    return candidate


@router.post("/{candidate_id}/notes", response_model=CandidateResponse)
def add_candidate_note(
    candidate_id: str,
    note: CandidateNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPERADMIN", "ADMIN", "RECRUITER"])),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    new_note = {
        "author": current_user.email,
        "date": datetime.now(timezone.utc).isoformat()[:10],
        "content": note.content,
    }

    current_notes = list(candidate.notes) if candidate.notes else []
    current_notes.insert(0, new_note)
    candidate.notes = current_notes

    log_activity(
        db=db,
        action_type=ActionType.CANDIDATE_NOTE_ADDED,
        description=f"Added note to candidate {candidate.name}",
        user_name=current_user.name,
        user_email=current_user.email,
        job_id=candidate.jobId,
        candidate_id=candidate.id,
    )

    db.commit()
    db.refresh(candidate)

    base_url = settings.BASE_URL
    if candidate.cv_filelink and not candidate.cvUrl:
        candidate.cvUrl = f"{base_url}/static/cvs/{candidate.cv_filelink}"

    return candidate
