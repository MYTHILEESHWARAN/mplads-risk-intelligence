"""
Model evaluation against synthetic ground truth.
Computes real precision@K, recall and F1 on synthetic data with injected anomalies.
All metrics labeled: 'measured on synthetic data with injected anomalies'.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import RiskAnalysis
from app.models.extended import GroundTruth

router = APIRouter()


@router.get("/api/evaluation/metrics")
def get_evaluation_metrics(db: Session = Depends(get_db)):
    """
    Compute precision@K, recall and F1 against synthetic ground truth.
    IMPORTANT: These metrics are measured on SYNTHETIC data with injected anomalies.
    They do not represent real-world performance on actual MPLADS data.
    """
    gt_rows = db.query(GroundTruth).all()
    if not gt_rows:
        return {
            "message": "No ground truth data available. Run generate_synthetic.py first.",
            "metrics": None,
        }

    gt_map = {g.project_id: g for g in gt_rows}
    ra_rows = db.query(RiskAnalysis).filter(
        RiskAnalysis.project_id.in_(list(gt_map.keys()))
    ).all()

    if not ra_rows:
        return {"message": "No risk analyses found for synthetic projects.", "metrics": None}

    # True positive: model flags HIGH/CRITICAL, ground truth is HIGH/CRITICAL
    HIGH_LEVELS = {"HIGH", "CRITICAL"}

    tp = fp = fn = tn = 0
    scores_with_gt = []

    for ra in ra_rows:
        gt = gt_map.get(ra.project_id)
        if not gt:
            continue
        predicted_high = ra.risk_level in HIGH_LEVELS
        actual_high = gt.ground_truth_risk_level in HIGH_LEVELS
        scores_with_gt.append({
            "project_id": ra.project_id,
            "predicted_score": ra.unified_risk_score,
            "predicted_level": ra.risk_level,
            "ground_truth_level": gt.ground_truth_risk_level,
            "anomaly_type": gt.injected_anomaly_type,
            "correct": predicted_high == actual_high,
        })
        if predicted_high and actual_high: tp += 1
        elif predicted_high and not actual_high: fp += 1
        elif not predicted_high and actual_high: fn += 1
        else: tn += 1

    precision = round(tp / max(tp + fp, 1), 3)
    recall = round(tp / max(tp + fn, 1), 3)
    f1 = round(2 * precision * recall / max(precision + recall, 0.001), 3)
    accuracy = round((tp + tn) / max(len(scores_with_gt), 1), 3)

    # Precision@K
    sorted_by_score = sorted(scores_with_gt, key=lambda x: x["predicted_score"], reverse=True)
    def precision_at_k(k):
        top_k = sorted_by_score[:k]
        return round(sum(1 for x in top_k if x["ground_truth_level"] in HIGH_LEVELS) / max(k, 1), 3)

    return {
        "disclaimer": (
            "These metrics are measured on SYNTHETIC data with injected anomalies. "
            "They do not represent real-world performance on actual MPLADS data."
        ),
        "metrics": {
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "accuracy": accuracy,
            "precision_at_10": precision_at_k(10),
            "precision_at_25": precision_at_k(25),
            "true_positives": tp,
            "false_positives": fp,
            "false_negatives": fn,
            "true_negatives": tn,
            "total_evaluated": len(scores_with_gt),
        },
        "anomaly_breakdown": {
            atype: {
                "total": sum(1 for x in scores_with_gt if x["anomaly_type"] == atype),
                "correctly_flagged": sum(1 for x in scores_with_gt if x["anomaly_type"] == atype and x["correct"]),
            }
            for atype in set(x["anomaly_type"] for x in scores_with_gt)
        },
        "data_provenance": "SYNTHETIC",
    }
