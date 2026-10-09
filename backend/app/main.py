"""
MPLADS Risk Intelligence — FastAPI Application Entry Point
"""
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.routes import health, projects, dashboard, alerts, investigations, analytics, evidence, compliance, system, settings
from app.routes import members, evaluation
from app.routes import reports

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "AI-powered anomaly, fraud and inefficiency detection system for MPLADS. "
        "This system is a decision-support tool. Final determinations are made by authorised human officers."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(health.router, tags=["Health"])
app.include_router(dashboard.router, tags=["Dashboard"])
app.include_router(projects.router, tags=["Projects"])
app.include_router(alerts.router, tags=["Alerts"])
app.include_router(investigations.router, tags=["Investigations"])
app.include_router(analytics.router, tags=["Analytics"])
app.include_router(evidence.router, tags=["Evidence"])
app.include_router(compliance.router, tags=["Compliance"])
app.include_router(system.router, tags=["System"])
app.include_router(settings.router, tags=["Settings"])
app.include_router(members.router, tags=["Members"])
app.include_router(evaluation.router, tags=["Evaluation"])

# ─── Startup ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup_event():
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    init_db()
    logger.info("Database initialised.")


# ─── Global error handler ────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "An internal error occurred.", "error_code": "INTERNAL_ERROR"},
    )
