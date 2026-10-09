"""
Application configuration loaded from environment variables.
"""
import os
from typing import List
from dotenv import load_dotenv

load_dotenv()


class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "MPLADS Risk Intelligence")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./mplads_demo.db"   # Default: SQLite for local/demo mode
    )

    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev_secret_key_replace_in_production")

    # CORS
    CORS_ORIGINS: List[str] = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
        if o.strip()
    ]

    # Risk score weights
    WEIGHT_FINANCIAL: float = float(os.getenv("WEIGHT_FINANCIAL", "0.25"))
    WEIGHT_EXECUTION: float = float(os.getenv("WEIGHT_EXECUTION", "0.20"))
    WEIGHT_DUPLICATE: float = float(os.getenv("WEIGHT_DUPLICATE", "0.15"))
    WEIGHT_COMPLIANCE: float = float(os.getenv("WEIGHT_COMPLIANCE", "0.15"))
    WEIGHT_EVIDENCE: float = float(os.getenv("WEIGHT_EVIDENCE", "0.25"))

    # Thresholds
    DUPLICATE_SEMANTIC_THRESHOLD: float = float(os.getenv("DUPLICATE_SEMANTIC_THRESHOLD", "0.80"))
    DUPLICATE_GEO_THRESHOLD_KM: float = float(os.getenv("DUPLICATE_GEO_THRESHOLD_KM", "5.0"))
    MISMATCH_HIGH_THRESHOLD: int = int(os.getenv("MISMATCH_HIGH_THRESHOLD", "30"))
    MISMATCH_CRITICAL_THRESHOLD: int = int(os.getenv("MISMATCH_CRITICAL_THRESHOLD", "50"))


settings = Settings()
