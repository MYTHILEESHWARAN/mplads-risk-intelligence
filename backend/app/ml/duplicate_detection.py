"""
Duplicate Project Detection.

Uses Sentence Transformers + cosine similarity when available.
Falls back to TF-IDF cosine similarity when sentence-transformers is unavailable.
Falls back to keyword-based similarity when neither is available.
"""
import math
import logging
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# Optional heavy imports
try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    ST_AVAILABLE = True
    _model = None

    def _get_st_model():
        global _model
        if _model is None:
            try:
                _model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception as e:
                logger.warning(f"Could not load SentenceTransformer model: {e}")
                return None
        return _model

except ImportError:
    ST_AVAILABLE = False
    logger.warning("sentence-transformers not available.")


try:
    import numpy as np
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity as sk_cosine
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


# ─── Geographical distance (Haversine) ───────────────────────────────────────

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def geographical_similarity(distance_km: float, threshold_km: float = 5.0) -> float:
    """Returns a 0-1 score; 1.0 = same location."""
    if distance_km <= 0:
        return 1.0
    if distance_km >= threshold_km * 3:
        return 0.0
    return max(0.0, 1.0 - (distance_km / (threshold_km * 3)))


# ─── Semantic similarity ─────────────────────────────────────────────────────

def _st_similarity(text1: str, text2: str) -> float:
    model = _get_st_model() if ST_AVAILABLE else None
    if model is None:
        return _tfidf_similarity(text1, text2)
    try:
        embs = model.encode([text1, text2])
        dot = float(np.dot(embs[0], embs[1]))
        norm = float(np.linalg.norm(embs[0]) * np.linalg.norm(embs[1])) or 1.0
        return max(0.0, min(1.0, dot / norm))
    except Exception as e:
        logger.warning(f"ST similarity failed: {e}")
        return _tfidf_similarity(text1, text2)


def _tfidf_similarity(text1: str, text2: str) -> float:
    if not SKLEARN_AVAILABLE:
        return _keyword_similarity(text1, text2)
    try:
        vec = TfidfVectorizer(ngram_range=(1, 2))
        tfidf = vec.fit_transform([text1, text2])
        sim = sk_cosine(tfidf[0], tfidf[1])[0][0]
        return float(sim)
    except Exception:
        return _keyword_similarity(text1, text2)


def _keyword_similarity(text1: str, text2: str) -> float:
    """Simple Jaccard-based fallback."""
    def tokenize(t):
        return set(t.lower().split())
    s1, s2 = tokenize(text1), tokenize(text2)
    intersection = s1 & s2
    union = s1 | s2
    return len(intersection) / len(union) if union else 0.0


def compute_semantic_similarity(text1: str, text2: str) -> float:
    if ST_AVAILABLE:
        return _st_similarity(text1, text2)
    return _tfidf_similarity(text1, text2)


# ─── Main duplicate detection ─────────────────────────────────────────────────

def find_duplicates(
    target: dict,
    all_projects: List[dict],
    semantic_threshold: float = 0.80,
    geo_threshold_km: float = 5.0,
) -> dict:
    """
    Find the most similar project to `target`.
    Returns duplicate analysis result.
    """
    target_text = f"{target.get('project_name', '')} {target.get('project_type', '')} {target.get('district', '')}"
    target_lat = target.get("latitude")
    target_lon = target.get("longitude")

    best = None
    best_sem = 0.0
    best_geo = 0.0
    best_dist = None

    for p in all_projects:
        if p.get("project_id") == target.get("project_id"):
            continue

        p_text = f"{p.get('project_name', '')} {p.get('project_type', '')} {p.get('district', '')}"
        sem = compute_semantic_similarity(target_text, p_text)

        geo = 0.0
        dist_km = None
        if target_lat and target_lon and p.get("latitude") and p.get("longitude"):
            dist_km = haversine_km(target_lat, target_lon, p["latitude"], p["longitude"])
            geo = geographical_similarity(dist_km, geo_threshold_km)

        combined = (sem * 0.6) + (geo * 0.4)

        if combined > (best_sem * 0.6 + best_geo * 0.4):
            best = p
            best_sem = sem
            best_geo = geo
            best_dist = dist_km

    if best is None:
        return {"semantic_similarity": 0, "geographical_similarity": 0, "distance_km": None, "matched_project": None, "duplicate_risk": 0}

    sem_pct = round(best_sem * 100, 1)
    geo_pct = round(best_geo * 100, 1)

    # Duplicate risk: high only when BOTH semantic AND geo thresholds exceeded
    is_duplicate = best_sem >= semantic_threshold
    if is_duplicate:
        duplicate_risk = min(100.0, 50 + sem_pct * 0.3 + geo_pct * 0.2)
    else:
        duplicate_risk = min(50.0, sem_pct * 0.4 + geo_pct * 0.1)

    return {
        "semantic_similarity": sem_pct,
        "geographical_similarity": geo_pct,
        "distance_km": round(best_dist, 2) if best_dist is not None else None,
        "matched_project": best,
        "duplicate_risk": round(duplicate_risk, 1),
    }
