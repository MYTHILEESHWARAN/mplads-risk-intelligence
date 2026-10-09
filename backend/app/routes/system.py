"""
System self-check endpoint.
Executes real runtime probes for each ML module and returns honest status.
Status is VERIFIED only if the probe passes right now.
"""
import time
import logging
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import Project, RiskAnalysis, AnalysisRun

router = APIRouter()
logger = logging.getLogger(__name__)


def _probe_isolation_forest() -> dict:
    start = time.time()
    try:
        from sklearn.ensemble import IsolationForest
        import numpy as np
        X = np.array([[1.0, 1.0, 1.0, 1.0, 0, 0, 0]] * 12)
        X[0] = [10.0, 10.0, 50.0, 5.0, 0, 0, 0]  # anomalous
        clf = IsolationForest(n_estimators=10, random_state=42)
        clf.fit(X)
        probe = np.array([[10.0, 10.0, 50.0, 5.0, 0, 0, 0]])
        score = float(clf.score_samples(probe)[0])
        normal = np.array([[1.0, 1.0, 1.0, 1.0, 0, 0, 0]])
        normal_score = float(clf.score_samples(normal)[0])
        passed = score < normal_score  # anomaly should score lower
        return {
            "status": "VERIFIED" if passed else "IMPLEMENTED_UNVERIFIED",
            "probe_anomaly_score": round(score, 4),
            "probe_normal_score": round(normal_score, 4),
            "passed": passed,
            "latency_ms": round((time.time() - start) * 1000, 1),
            "library": "scikit-learn",
            "note": "Trains fresh on probe data. No saved model artifact.",
        }
    except ImportError:
        return {"status": "NOT_IMPLEMENTED", "passed": False, "note": "scikit-learn not installed"}
    except Exception as e:
        return {"status": "ERROR", "passed": False, "error": str(e)}


def _probe_xgboost() -> dict:
    start = time.time()
    try:
        import xgboost as xgb
        version = xgb.__version__
        # XGBoost is installed but no trained model exists — rule-based fallback is active
        return {
            "status": "IMPLEMENTED_UNVERIFIED",
            "passed": True,
            "library": f"xgboost=={version}",
            "note": "Library installed. No pre-trained delay model file exists. Rule-based fallback is active.",
            "latency_ms": round((time.time() - start) * 1000, 1),
        }
    except ImportError:
        return {"status": "NOT_IMPLEMENTED", "passed": False, "note": "xgboost not installed"}


def _probe_tfidf() -> dict:
    start = time.time()
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        docs = [
            "Community water supply rural village Lucknow",
            "Community water supply rural village extension Lucknow",
            "Digital library education block resource",
        ]
        vec = TfidfVectorizer()
        tfidf = vec.fit_transform(docs)
        sim_pair = float(cosine_similarity(tfidf[0], tfidf[1])[0][0])
        sim_diff = float(cosine_similarity(tfidf[0], tfidf[2])[0][0])
        passed = sim_pair > sim_diff
        return {
            "status": "VERIFIED" if passed else "IMPLEMENTED_UNVERIFIED",
            "passed": passed,
            "similar_pair_score": round(sim_pair, 4),
            "different_pair_score": round(sim_diff, 4),
            "library": "scikit-learn TF-IDF",
            "note": "Similar docs score higher than different docs.",
            "latency_ms": round((time.time() - start) * 1000, 1),
        }
    except ImportError:
        return {"status": "NOT_IMPLEMENTED", "passed": False, "note": "scikit-learn not installed"}
    except Exception as e:
        return {"status": "ERROR", "passed": False, "error": str(e)}


def _probe_sentence_transformers() -> dict:
    try:
        from sentence_transformers import SentenceTransformer
        return {
            "status": "IMPLEMENTED_UNVERIFIED",
            "passed": True,
            "note": "sentence-transformers installed but model not loaded (TF-IDF is active fallback). Load 'all-MiniLM-L6-v2' to enable.",
        }
    except ImportError:
        return {
            "status": "NOT_IMPLEMENTED",
            "passed": False,
            "note": "sentence-transformers not installed. TF-IDF cosine similarity is active.",
        }


def _probe_haversine() -> dict:
    start = time.time()
    try:
        from app.ml.duplicate_detection import haversine_km
        dist = haversine_km(26.8467, 80.9462, 26.8512, 80.9389)
        passed = 0.5 < dist < 2.0  # known pair ~0.88 km
        return {
            "status": "VERIFIED" if passed else "IMPLEMENTED_UNVERIFIED",
            "passed": passed,
            "probe_distance_km": round(dist, 3),
            "expected_range": "0.5–2.0 km",
            "latency_ms": round((time.time() - start) * 1000, 1),
        }
    except Exception as e:
        return {"status": "ERROR", "passed": False, "error": str(e)}


def _probe_compliance_rules() -> dict:
    start = time.time()
    try:
        from app.ml.compliance_engine import run_compliance_checks
        good_project = {
            "project_name": "Test", "mp_name": "Test MP", "constituency": "C",
            "district": "D", "state": "S", "project_type": "Road", "agency": "A",
            "sanction_amount": 1e6, "estimated_cost": 1e6,
            "sanction_date": "2023-01-01", "start_date": "2023-03-01",
            "expected_completion_date": "2027-01-01",
            "financial_progress": 50, "physical_progress": 48, "status": "In Progress",
        }
        result = run_compliance_checks(good_project, [
            {"evidence_type": "Project Photo", "verification_status": "Verified"},
            {"evidence_type": "Work Order", "verification_status": "Verified"},
        ])
        passed = result["compliance_score"] > 50 and len(result["checks"]) == 6
        return {
            "status": "VERIFIED" if passed else "IMPLEMENTED_UNVERIFIED",
            "passed": passed,
            "probe_compliance_score": result["compliance_score"],
            "rules_evaluated": len(result["checks"]),
            "latency_ms": round((time.time() - start) * 1000, 1),
        }
    except Exception as e:
        return {"status": "ERROR", "passed": False, "error": str(e)}


def _probe_unified_score() -> dict:
    start = time.time()
    try:
        from app.ml.unified_score import compute_unified_score, get_risk_level
        # Known fixture: F=100, E=0, D=0, C=0, Ev=0 → should equal 25.0
        score = compute_unified_score(100, 0, 0, 0, 0)
        level = get_risk_level(25)
        passed = abs(score - 25.0) < 0.1 and level == "LOW"
        return {
            "status": "VERIFIED" if passed else "IMPLEMENTED_UNVERIFIED",
            "passed": passed,
            "fixture_input": "F=100, E=0, D=0, C=0, Ev=0",
            "fixture_expected": 25.0,
            "fixture_got": score,
            "risk_level_for_25": level,
            "latency_ms": round((time.time() - start) * 1000, 1),
        }
    except Exception as e:
        return {"status": "ERROR", "passed": False, "error": str(e)}


def _probe_database(db: Session) -> dict:
    start = time.time()
    try:
        db.expire_all()
        project_count = db.query(Project).count()
        risk_count = db.query(RiskAnalysis).count()
        run_count = db.query(AnalysisRun).count()
        return {
            "status": "VERIFIED",
            "passed": True,
            "projects": project_count,
            "risk_analyses": risk_count,
            "analysis_runs": run_count,
            "latency_ms": round((time.time() - start) * 1000, 1),
        }
    except Exception as e:
        return {"status": "ERROR", "passed": False, "error": str(e)}


@router.get("/api/system/self-check")
def system_self_check(db: Session = Depends(get_db)):
    """
    Execute real runtime probes for each ML module.
    Status is VERIFIED only if the probe passes right now.
    This endpoint is the source of truth for the Model Transparency page.
    """
    checked_at = datetime.utcnow().isoformat()

    modules = {
        "isolation_forest": _probe_isolation_forest(),
        "xgboost_delay": _probe_xgboost(),
        "tfidf_duplicate": _probe_tfidf(),
        "sentence_transformers": _probe_sentence_transformers(),
        "haversine_geo": _probe_haversine(),
        "compliance_rules": _probe_compliance_rules(),
        "unified_score": _probe_unified_score(),
        "database": _probe_database(db),
    }

    verified = sum(1 for m in modules.values() if m.get("status") == "VERIFIED")
    total = len(modules)
    all_passed = all(m.get("passed", False) for m in modules.values())

    return {
        "checked_at": checked_at,
        "overall_status": "HEALTHY" if all_passed else "DEGRADED",
        "verified_count": verified,
        "total_modules": total,
        "modules": modules,
        "disclaimer": (
            "Status is VERIFIED only if the probe passed at the time shown. "
            "Scores are risk indicators to support human review — not findings of wrongdoing."
        ),
    }
