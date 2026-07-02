import json
import os
import tempfile
from datetime import datetime, time, timedelta, timezone
from typing import List, Optional

from fastapi import BackgroundTasks, UploadFile
from sqlalchemy import String
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import (
    CANDIDATE_SOURCE_CAREERS_PAGE,
    DEFAULT_SALARY_EXPECTATION,
    MATCH_SCORE_MODERATE_FIT_THRESHOLD,
    MATCH_SCORE_STRONG_FIT_THRESHOLD,
)
from app.core.database import SessionLocal
from app.core.exceptions import ServiceError
from app.core.logger import logger
from app.models.candidate import Candidate
from app.models.job import Job
from app.schemas.activity_log import ActionType
from app.schemas.candidate import CandidateCreate, EvaluationStatus, Tier
from app.services.activity_log import log_activity
from app.services.cv_store import save_cv
from app.services.evaluator import evaluate_candidate
from app.services.parser import parse_candidate_cv


def _attach_cv_url(candidate: Candidate) -> Candidate:
    if candidate.cv_filelink and not candidate.cvUrl:
        candidate.cvUrl = f"{settings.BASE_URL}/static/cvs/{candidate.cv_filelink}"
    return candidate


async def parse_resume(file: UploadFile) -> dict:
    if not file.filename.lower().endswith(".pdf"):
        raise ServiceError(400, "Only PDF files are supported.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        return await parse_candidate_cv(tmp_path)
    except Exception as e:
        # Parsing is just a convenience prefill — if it fails for any reason,
        # there's no need to treat it as a hard error. The applicant can just
        # fill the form manually.
        logger.warning(f"Resume parsing failed, falling back to manual entry: {e}")
        raise ServiceError(422, "Please enter your details manually.")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


async def run_background_evaluation(candidate_id: str, job_id: str, candidate_data: dict) -> None:
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
        tier = Tier.WEAK_FIT
        if match_score >= MATCH_SCORE_STRONG_FIT_THRESHOLD:
            tier = Tier.STRONG_FIT
        elif match_score >= MATCH_SCORE_MODERATE_FIT_THRESHOLD:
            tier = Tier.MODERATE_FIT

        candidate.match = match_score
        candidate.tier = tier
        candidate.evaluation_status = EvaluationStatus.SUCCESS
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
        # Best-effort: flag the candidate as failed instead of leaving it
        # silently stuck in PENDING forever. Leave scoring fields blank
        # rather than fabricating a tier/summary.
        try:
            candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
            if candidate:
                candidate.evaluation_status = EvaluationStatus.FAILED
                candidate.match = 0
                candidate.tier = None
                candidate.summary = None
                candidate.scores = []
                candidate.strengths = []
                candidate.weaknesses = []
                db.commit()
        except Exception:
            db.rollback()
            logger.error(f"Failed to flag candidate {candidate_id} as evaluation-failed", exc_info=True)
    finally:
        db.close()


async def submit_application(
    db: Session,
    candidate_json: str,
    file: Optional[UploadFile],
    background_tasks: BackgroundTasks,
) -> Candidate:
    try:
        cand_dict = json.loads(candidate_json)
        cand_obj = CandidateCreate(**cand_dict)
    except Exception as e:
        raise ServiceError(400, f"Invalid candidate JSON: {str(e)}")

    job = db.query(Job).filter(Job.id == cand_obj.jobId).first()
    if not job:
        raise ServiceError(404, "Job not found")

    cand_data = cand_obj.model_dump()

    cv_filename = None
    if file:
        if not file.filename.lower().endswith(".pdf"):
            raise ServiceError(400, "Only PDF files are allowed.")
        cv_filename = save_cv(file)

    cv_url = None
    if cv_filename:
        cv_url = f"{settings.BASE_URL}/static/cvs/{cv_filename}"

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
        or DEFAULT_SALARY_EXPECTATION
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
        noticePeriod=meta_notice,
        source=CANDIDATE_SOURCE_CAREERS_PAGE,
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
        tier=Tier.PENDING,
        evaluation_status=EvaluationStatus.PENDING,
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
        run_background_evaluation,
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


def get_paginated(
    db: Session,
    page: int,
    size: int,
    jobId: Optional[str],
    search: Optional[str],
    minScore: Optional[int],
    minExp: Optional[float],
    stage: Optional[str],
    tiers: Optional[List[str]],
    sort_by: str,
    sort_order: str,
) -> dict:
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

    for c in candidates:
        _attach_cv_url(c)

    return {
        "items": candidates,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


def get_recruitment_report(db: Session, start: str, end: str) -> dict:
    try:
        start_dt = datetime.combine(datetime.strptime(start, "%Y-%m-%d"), time.min).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(datetime.strptime(end, "%Y-%m-%d"), time.max).replace(tzinfo=timezone.utc)
    except Exception:
        raise ServiceError(400, "Invalid date format. Expected YYYY-MM-DD.")

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


def get_by_id(db: Session, candidate_id: str) -> Candidate:
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise ServiceError(404, "Candidate not found")
    return _attach_cv_url(candidate)


def update_stage(db: Session, candidate_id: str, new_stage: str, current_user) -> Candidate:
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise ServiceError(404, "Candidate not found")

    old_stage = candidate.stage
    candidate.stage = new_stage

    if old_stage != candidate.stage:
        if candidate.pastStages is None:
            candidate.pastStages = []
        past = list(candidate.pastStages)
        past.append(old_stage)
        candidate.pastStages = past

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
    return _attach_cv_url(candidate)


def add_note(db: Session, candidate_id: str, content: str, current_user) -> Candidate:
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise ServiceError(404, "Candidate not found")

    new_note = {
        "author": current_user.email,
        "date": datetime.now(timezone.utc).isoformat()[:10],
        "content": content,
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
    return _attach_cv_url(candidate)


def _candidate_eval_data(candidate: Candidate) -> dict:
    """Reconstruct the evaluation input dict from a stored Candidate row (used for retries)."""
    return {
        "personal_info": candidate.personal_info or {},
        "professional_summary": candidate.professional_summary or {},
        "skills": candidate.skills or [],
        "experience": candidate.experience_history or [],
        "education": candidate.education_history or [],
        "projects": candidate.projects or [],
        "certifications": candidate.certifications_history or [],
        "languages": candidate.languages_history or [],
        "achievements": candidate.achievements or [],
        "awards": candidate.awards or [],
        "candidate_preferences": candidate.candidate_preferences or {},
        "custom_fields": candidate.custom_fields or {},
    }


def retry_evaluation(db: Session, candidate_id: str, background_tasks: BackgroundTasks) -> Candidate:
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise ServiceError(404, "Candidate not found")

    job = db.query(Job).filter(Job.id == candidate.jobId).first()
    if not job:
        raise ServiceError(404, "Job not found for this candidate")

    candidate.evaluation_status = EvaluationStatus.PENDING
    db.commit()
    db.refresh(candidate)

    background_tasks.add_task(
        run_background_evaluation,
        candidate_id=candidate.id,
        job_id=job.id,
        candidate_data=_candidate_eval_data(candidate),
    )
    return _attach_cv_url(candidate)


def _date_range_start(date_range: str) -> Optional[datetime]:
    now = datetime.now(timezone.utc)
    if date_range == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if date_range == "week":
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start_of_today - timedelta(days=start_of_today.weekday())
    if date_range == "year":
        return now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    return None


def _evaluation_query(db: Session, date_range: str, job_scope: str):
    query = db.query(Candidate).join(Job, Candidate.jobId == Job.id)

    start = _date_range_start(date_range)
    if start is not None:
        query = query.filter(Candidate.appliedDate >= start)

    if job_scope == "open":
        query = query.filter(Job.status == "Active")

    return query


def get_evaluation_overview(
    db: Session,
    page: int,
    size: int,
    date_range: str = "today",
    job_scope: str = "open",
) -> dict:
    query = _evaluation_query(db, date_range, job_scope)

    total = query.count()
    offset = (page - 1) * size
    candidates = (
        query.order_by(Candidate.appliedDate.desc())
        .offset(offset)
        .limit(size)
        .all()
    )
    pages = (total + size - 1) // size if total > 0 else 0

    for c in candidates:
        _attach_cv_url(c)

    return {
        "items": candidates,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


def retry_all_failed_evaluations(
    db: Session,
    background_tasks: BackgroundTasks,
    date_range: str = "today",
    job_scope: str = "open",
) -> int:
    candidates = (
        _evaluation_query(db, date_range, job_scope)
        .filter(Candidate.evaluation_status == EvaluationStatus.FAILED)
        .all()
    )

    for candidate in candidates:
        candidate.evaluation_status = EvaluationStatus.PENDING
    db.commit()

    for candidate in candidates:
        background_tasks.add_task(
            run_background_evaluation,
            candidate_id=candidate.id,
            job_id=candidate.jobId,
            candidate_data=_candidate_eval_data(candidate),
        )

    return len(candidates)
