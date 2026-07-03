import json
import os
import tempfile
from datetime import datetime, time, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import BackgroundTasks, UploadFile
from sqlalchemy import String
from sqlalchemy.orm import Session, selectinload

from app.core.constants import (
    CANDIDATE_ALLOWED_SORT_FIELDS,
    CANDIDATE_SOURCE_CAREERS_PAGE,
    CANDIDATE_SOURCE_REFERRAL,
    DEFAULT_SALARY_EXPECTATION,
    DEFAULT_SCORING_CRITERIA,
    MATCH_SCORE_MODERATE_FIT_THRESHOLD,
    MATCH_SCORE_STRONG_FIT_THRESHOLD,
)
from app.core.database import SessionLocal
from app.core.exceptions import (
    CandidateNotFoundError,
    InvalidCandidateJsonError,
    InvalidDateFormatError,
    JobNotFoundError,
    JobNotFoundForCandidateError,
    OnlyPdfSupportedError,
    ResumeParsingFailedError,
)
from app.core.logger import logger
from app.models.candidate import Candidates
from app.models.candidate_evaluation import CandidateEvaluations
from app.models.candidate_note import CandidateNotes
from app.models.candidate_stage_history import CandidateStageHistory
from app.models.job import Jobs
from app.models.user import Users
from app.schemas.activity_log import ActionType
from app.schemas.candidate import CandidateCreate, CandidateStage, DateRangeFilter, EvaluationStatus, JobScopeFilter, Tier
from app.schemas.job import JobStatus
from app.services.activity_log import log_activity
from app.services.cv_store import save_cv
from app.services.evaluator import evaluate_candidate
from app.services.parser import parse_candidate_cv

_CANDIDATE_LOAD_OPTIONS = (
    selectinload(Candidates.notes).selectinload(CandidateNotes.author),
    selectinload(Candidates.stage_history).selectinload(CandidateStageHistory.changed_by),
    selectinload(Candidates.evaluation),
)

# Every post-application funnel stage, mapped to its counts key in
# get_recruitment_report's aggregate_funnel_counts.
_FUNNEL_STAGE_KEYS = {
    CandidateStage.SCREENING: "screened",
    CandidateStage.SHORTLISTED: "shortlisted",
    CandidateStage.INTERVIEW: "interviewed",
    CandidateStage.FINAL_REVIEW: "finalReview",
    CandidateStage.OFFER: "offer",
    CandidateStage.HIRED: "hired",
    CandidateStage.REJECTED: "rejected",
}


async def parse_resume(file: UploadFile) -> dict:
    if not file.filename.lower().endswith(".pdf"):
        raise OnlyPdfSupportedError()

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
        raise ResumeParsingFailedError()
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def _upsert_evaluation(db: Session, candidate_id: UUID) -> CandidateEvaluations:
    evaluation = db.query(CandidateEvaluations).filter(CandidateEvaluations.candidate_id == candidate_id).first()
    if not evaluation:
        evaluation = CandidateEvaluations(candidate_id=candidate_id)
        db.add(evaluation)
    return evaluation


def _set_evaluation_result(
    evaluation: CandidateEvaluations,
    summary: Optional[str],
    scores: list,
    strengths: list,
    weaknesses: list,
) -> None:
    evaluation.summary = summary
    evaluation.scores = scores
    evaluation.strengths = strengths
    evaluation.weaknesses = weaknesses
    evaluation.evaluated_at = datetime.now()


async def run_background_evaluation(candidate_id: UUID, job_id: UUID, candidate_data: dict) -> None:
    db = SessionLocal()
    try:
        job = db.query(Jobs).filter(Jobs.id == job_id).first()
        if not job:
            logger.error(
                f"Job {job_id} not found for background evaluation of candidate {candidate_id}"
            )
            return

        candidate = db.query(Candidates).filter(Candidates.id == candidate_id).first()
        if not candidate:
            logger.error(
                f"Candidate {candidate_id} not found for background evaluation"
            )
            return

        logger.info(
            f"Starting background evaluation for candidate {candidate.name} (ID: {candidate_id})"
        )

        eval_result = await evaluate_candidate(
            candidate_data=candidate_data,
            job_description=job.description,
            scoring_criteria=job.scoring_criteria or DEFAULT_SCORING_CRITERIA,
        )

        match_score = eval_result.get("match_score", 0)
        tier = Tier.WEAK_FIT
        if match_score >= MATCH_SCORE_STRONG_FIT_THRESHOLD:
            tier = Tier.STRONG_FIT
        elif match_score >= MATCH_SCORE_MODERATE_FIT_THRESHOLD:
            tier = Tier.MODERATE_FIT

        candidate.match_score = match_score
        candidate.tier = tier
        candidate.evaluation_status = EvaluationStatus.SUCCESS

        evaluation = _upsert_evaluation(db, candidate.id)
        _set_evaluation_result(
            evaluation,
            summary=eval_result.get("summary", ""),
            scores=eval_result.get("criteria_scores", []),
            strengths=eval_result.get("strengths", []),
            weaknesses=eval_result.get("weaknesses", []),
        )

        log_activity(
            db=db,
            action_type=ActionType.CANDIDATE_EVALUATED,
            description=f"System evaluated candidate {candidate.name} (Match: {match_score}%)",
            user_name="System (Evaluator)",
            user_email=(candidate.personal_info or {}).get("email", ""),
            job_id=job.id,
            candidate_id=candidate.id,
        )
        db.commit()
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
            candidate = db.query(Candidates).filter(Candidates.id == candidate_id).first()
            if candidate:
                candidate.evaluation_status = EvaluationStatus.FAILED
                candidate.match_score = 0
                candidate.tier = None

                evaluation = _upsert_evaluation(db, candidate.id)
                _set_evaluation_result(evaluation, summary=None, scores=[], strengths=[], weaknesses=[])
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
    submitted_by: Optional[Users] = None,
) -> Candidates:
    try:
        cand_dict = json.loads(candidate_json)
        cand_obj = CandidateCreate(**cand_dict)
    except Exception as e:
        logger.warning(f"Invalid candidate JSON on submission: {e}")
        raise InvalidCandidateJsonError()

    job = db.query(Jobs).filter(Jobs.id == cand_obj.job_id).first()
    if not job:
        raise JobNotFoundError()

    cand_data = cand_obj.model_dump()

    cv_filename = None
    if file:
        if not file.filename.lower().endswith(".pdf"):
            raise OnlyPdfSupportedError()
        cv_filename = save_cv(file)

    # Extract nested fields
    personal = cand_data.get("personal_info", {}) or {}
    prof_summary = cand_data.get("professional_summary", {}) or {}
    exp_list = cand_data.get("experience", []) or []
    edu_list = cand_data.get("education", []) or []

    flat_name = (
        personal.get("full_name")
        or f"{personal.get('first_name', '')} {personal.get('last_name', '')}".strip()
        or "Unknown"
    )
    flat_email = personal.get("email") or ""
    flat_experience = float(prof_summary.get("total_experience_years") or 0.0)

    meta_salary = (
        prof_summary.get("expected_salary")
        or cand_data.get("custom_fields", {}).get("salaryExpectation")
        or DEFAULT_SALARY_EXPECTATION
    )
    meta_notice = f"{prof_summary.get('notice_period_days', 0)} days"
    source = CANDIDATE_SOURCE_REFERRAL if submitted_by else CANDIDATE_SOURCE_CAREERS_PAGE

    db_candidate = Candidates(
        job_id=cand_obj.job_id,
        name=flat_name,
        experience=flat_experience,
        skills=cand_data.get("skills", []),
        achievements=cand_data.get("achievements", []),
        salary_expectation=meta_salary,
        notice_period=meta_notice,
        source=source,
        personal_info=personal,
        professional_summary=prof_summary,
        experience_history=exp_list,
        education_history=edu_list,
        projects=cand_data.get("projects", []),
        certifications_history=cand_data.get("certifications", []),
        languages_history=cand_data.get("languages", []),
        awards=cand_data.get("awards", []),
        publications=cand_data.get("publications", []),
        candidate_preferences=cand_data.get("candidate_preferences", {}),
        custom_fields=cand_data.get("custom_fields", {}),
        match_score=0,
        tier=Tier.PENDING,
        evaluation_status=EvaluationStatus.PENDING,
        stage=CandidateStage.APPLIED,
        cv_filelink=cv_filename,
        applied_date=datetime.now(),
    )

    db.add(db_candidate)

    # Atomic increment of applicant count (H9)
    db.query(Jobs).filter(Jobs.id == job.id).update({Jobs.applicants: Jobs.applicants + 1})

    db.flush()

    # Seed stage history — system-generated, no acting user, so the actor
    # fields stay null.
    db.add(CandidateStageHistory(
        candidate_id=db_candidate.id,
        stage=CandidateStage.APPLIED,
        changed_at=db_candidate.applied_date,
    ))

    background_tasks.add_task(
        run_background_evaluation,
        candidate_id=db_candidate.id,
        job_id=job.id,
        candidate_data=cand_data,
    )

    if submitted_by:
        log_activity(
            db=db,
            action_type=ActionType.CANDIDATE_APPLIED,
            description=f"{submitted_by.name} ({submitted_by.role}) added candidate {db_candidate.name} as a referral for job '{job.title}'",
            user_name=submitted_by.name,
            user_email=submitted_by.email,
            job_id=job.id,
            candidate_id=db_candidate.id,
        )
    else:
        log_activity(
            db=db,
            action_type=ActionType.CANDIDATE_APPLIED,
            description=f"Candidate {db_candidate.name} applied for job '{job.title}'",
            user_name="System (Applicant)",
            user_email=flat_email,
            job_id=job.id,
            candidate_id=db_candidate.id,
        )

    db.commit()
    db.refresh(db_candidate)
    return db_candidate


def get_filter_options(db: Session) -> dict:
    """
    All option lists the recruiter view's candidate filter bar needs, in one
    call: stages and tiers are fixed enums (every value is always offered,
    even ones with zero candidates right now, matching a normal dropdown);
    sources is genuinely dynamic data, since new intake channels can appear
    without a code change.
    """
    source_rows = db.query(Candidates.source).distinct().all()
    return {
        "stages": [s.value for s in CandidateStage],
        "tiers": [t.value for t in Tier if t != Tier.PENDING],
        "sources": sorted(r[0] for r in source_rows if r[0]),
    }


def get_paginated(
    db: Session,
    page: int,
    size: int,
    jobId: Optional[UUID],
    search: Optional[str],
    minScore: Optional[int],
    minExp: Optional[float],
    stage: Optional[str],
    tiers: Optional[List[str]],
    source: Optional[str],
    sort_by: str,
    sort_order: str,
) -> dict:
    query = db.query(Candidates).options(*_CANDIDATE_LOAD_OPTIONS)

    if jobId:
        query = query.filter(Candidates.job_id == jobId)
    else:
        query = query.join(Jobs).filter(Jobs.status == JobStatus.ACTIVE)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Candidates.name.ilike(search_filter))
            | (Candidates.skills.cast(String).ilike(search_filter))
        )

    if minScore is not None and minScore > 0:
        query = query.filter(Candidates.match_score >= minScore)

    if minExp is not None and minExp > 0:
        query = query.filter(Candidates.experience >= minExp)

    if source:
        query = query.filter(Candidates.source == source)

    if stage and stage != "All":
        query = query.filter(Candidates.stage == stage)

    if tiers:
        actual_tiers = []
        for t in tiers:
            if "," in t:
                actual_tiers.extend(t.split(","))
            else:
                actual_tiers.append(t)
        valid_tiers = {t.value for t in Tier}
        actual_tiers = [t for t in actual_tiers if t in valid_tiers]
        if actual_tiers:
            query = query.filter(Candidates.tier.in_(actual_tiers))

    # Sorting
    if sort_by not in CANDIDATE_ALLOWED_SORT_FIELDS:
        sort_by = "match_score"

    sort_column = getattr(Candidates, sort_by, Candidates.match_score)

    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    total = query.count()
    offset = (page - 1) * size
    candidates = query.offset(offset).limit(size).all()
    pages = (total + size - 1) // size if total > 0 else 0

    return {
        "items": candidates,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


def get_recruitment_report(db: Session, start: str, end: str) -> dict:
    try:
        start_dt = datetime.combine(datetime.strptime(start, "%Y-%m-%d"), time.min)
        end_dt = datetime.combine(datetime.strptime(end, "%Y-%m-%d"), time.max)
    except Exception:
        raise InvalidDateFormatError()

    # 1. Filter jobs posted within the date range
    filtered_jobs = db.query(Jobs).filter(Jobs.posted_date >= start_dt, Jobs.posted_date <= end_dt).all()
    job_ids = [j.id for j in filtered_jobs]

    # 2. Filter candidates whose applied_date is in the range, and who belong to the filtered jobs
    if job_ids:
        filtered_candidates = (
            db.query(Candidates)
            .options(selectinload(Candidates.stage_history))
            .filter(
                Candidates.job_id.in_(job_ids),
                Candidates.applied_date >= start_dt,
                Candidates.applied_date <= end_dt,
            )
            .all()
        )
    else:
        filtered_candidates = []

    # Helper function to aggregate funnel counts
    def aggregate_funnel_counts(candidates_list):
        counts = {"applied": 0, **{key: 0 for key in _FUNNEL_STAGE_KEYS.values()}}
        for c in candidates_list:
            counts["applied"] += 1
            reached = {h.stage for h in c.stage_history}
            for stage, key in _FUNNEL_STAGE_KEYS.items():
                if stage in reached:
                    counts[key] += 1
        return counts

    # Compute overall cumulative funnel counts for filtered candidates
    summary_stats = aggregate_funnel_counts(filtered_candidates)
    summary_stats["jobs"] = len(filtered_jobs)

    # Map each job to its funnel breakdown
    job_breakdown = []
    for job in filtered_jobs:
        job_candidates = [c for c in filtered_candidates if c.job_id == job.id]
        job_stats = aggregate_funnel_counts(job_candidates)

        job_breakdown.append({
            "id": job.id,
            "title": job.title,
            "department": job.department,
            "status": job.status,
            "postedDate": job.posted_date.isoformat() if job.posted_date else "",
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


def get_by_id(db: Session, candidate_id: UUID) -> Candidates:
    candidate = (
        db.query(Candidates)
        .options(*_CANDIDATE_LOAD_OPTIONS)
        .filter(Candidates.id == candidate_id)
        .first()
    )
    if not candidate:
        raise CandidateNotFoundError()
    return candidate


def update_stage(db: Session, candidate_id: UUID, new_stage: str, current_user) -> Candidates:
    candidate = db.query(Candidates).filter(Candidates.id == candidate_id).first()
    if not candidate:
        raise CandidateNotFoundError()

    old_stage = candidate.stage
    candidate.stage = new_stage

    if old_stage != candidate.stage:
        if old_stage == CandidateStage.REJECTED:
            # Un-rejecting: drop the Rejected entry instead of leaving it
            # alongside the new stage — moving someone off Rejected
            # shouldn't leave a permanent mark on their record. Every other
            # transition (including moving *into* Rejected) appends below,
            # same as usual.
            db.query(CandidateStageHistory).filter(
                CandidateStageHistory.candidate_id == candidate.id,
                CandidateStageHistory.stage == CandidateStage.REJECTED,
            ).delete()

        db.add(CandidateStageHistory(
            candidate_id=candidate.id,
            stage=candidate.stage,
            changed_at=datetime.now(),
            changed_by_user_id=current_user.id,
        ))

    log_activity(
        db=db,
        action_type=ActionType.CANDIDATE_STAGE_UPDATED,
        description=f"Moved candidate {candidate.name} from {old_stage} to {candidate.stage}",
        user_name=current_user.name,
        user_email=current_user.email,
        job_id=candidate.job_id,
        candidate_id=candidate.id,
    )

    db.commit()
    return get_by_id(db, candidate.id)


def add_note(db: Session, candidate_id: UUID, content: str, current_user) -> Candidates:
    candidate = db.query(Candidates).filter(Candidates.id == candidate_id).first()
    if not candidate:
        raise CandidateNotFoundError()

    db.add(CandidateNotes(
        candidate_id=candidate.id,
        author_user_id=current_user.id,
        content=content,
        created_at=datetime.now(),
    ))

    log_activity(
        db=db,
        action_type=ActionType.CANDIDATE_NOTE_ADDED,
        description=f"Added note to candidate {candidate.name}",
        user_name=current_user.name,
        user_email=current_user.email,
        job_id=candidate.job_id,
        candidate_id=candidate.id,
    )

    db.commit()
    return get_by_id(db, candidate.id)


def _candidate_eval_data(candidate: Candidates) -> dict:
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


def retry_evaluation(db: Session, candidate_id: UUID, background_tasks: BackgroundTasks) -> Candidates:
    candidate = db.query(Candidates).filter(Candidates.id == candidate_id).first()
    if not candidate:
        raise CandidateNotFoundError()

    job = db.query(Jobs).filter(Jobs.id == candidate.job_id).first()
    if not job:
        raise JobNotFoundForCandidateError()

    candidate.evaluation_status = EvaluationStatus.PENDING
    db.commit()
    db.refresh(candidate)

    background_tasks.add_task(
        run_background_evaluation,
        candidate_id=candidate.id,
        job_id=job.id,
        candidate_data=_candidate_eval_data(candidate),
    )
    return get_by_id(db, candidate.id)


def _date_range_start(date_range: DateRangeFilter) -> Optional[datetime]:
    now = datetime.now()
    if date_range == DateRangeFilter.TODAY:
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if date_range == DateRangeFilter.WEEK:
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start_of_today - timedelta(days=start_of_today.weekday())
    if date_range == DateRangeFilter.YEAR:
        return now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    return None


def _evaluation_query(db: Session, date_range: DateRangeFilter, job_scope: JobScopeFilter):
    query = db.query(Candidates).join(Jobs, Candidates.job_id == Jobs.id)

    start = _date_range_start(date_range)
    if start is not None:
        query = query.filter(Candidates.applied_date >= start)

    if job_scope == JobScopeFilter.OPEN:
        query = query.filter(Jobs.status == JobStatus.ACTIVE)

    return query


def get_evaluation_overview(
    db: Session,
    page: int,
    size: int,
    date_range: DateRangeFilter = DateRangeFilter.TODAY,
    job_scope: JobScopeFilter = JobScopeFilter.OPEN,
) -> dict:
    query = _evaluation_query(db, date_range, job_scope).options(*_CANDIDATE_LOAD_OPTIONS)

    total = query.count()
    offset = (page - 1) * size
    candidates = (
        query.order_by(Candidates.applied_date.desc())
        .offset(offset)
        .limit(size)
        .all()
    )
    pages = (total + size - 1) // size if total > 0 else 0

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
    date_range: DateRangeFilter = DateRangeFilter.TODAY,
    job_scope: JobScopeFilter = JobScopeFilter.OPEN,
) -> int:
    candidates = (
        _evaluation_query(db, date_range, job_scope)
        .filter(Candidates.evaluation_status == EvaluationStatus.FAILED)
        .all()
    )

    for candidate in candidates:
        candidate.evaluation_status = EvaluationStatus.PENDING
    db.commit()

    for candidate in candidates:
        background_tasks.add_task(
            run_background_evaluation,
            candidate_id=candidate.id,
            job_id=candidate.job_id,
            candidate_data=_candidate_eval_data(candidate),
        )

    return len(candidates)
