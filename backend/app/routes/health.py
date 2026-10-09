from fastapi import APIRouter
from datetime import datetime
from app.config import settings

router = APIRouter()


@router.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
    }
