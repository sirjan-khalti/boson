from fastapi import APIRouter
from .candidates import router as candidates_router
from .jobs import router as jobs_router
from .auth import router as auth_router
from .team import router as team_router
from .activity_logs import router as activity_logs_router

api_router = APIRouter()
api_router.include_router(candidates_router)
api_router.include_router(jobs_router)
api_router.include_router(auth_router)
api_router.include_router(team_router)
api_router.include_router(activity_logs_router)
