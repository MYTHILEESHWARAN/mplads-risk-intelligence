"""
MPLADS Risk Intelligence — Database Seed Script
Populates the database with fictional demo data.
All data is for demonstration purposes only.
Run: python -m data.seed   (from the backend/ directory)
"""
import sys
import os
import json
import logging
from datetime import date, datetime

# Allow running from backend/ directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, init_db
from app.models.project import Project, RiskAnalysis
from app.models.alert import Alert
from app.models.investigation import Investigation
from app.models.evidence import Evidence
from app.models.compliance import ComplianceCheck
from app.services.risk_service import analyse_project, determine_alert_type

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ─── Raw fictional project data ───────────────────────────────────────────────
SEED_PROJECTS = [
    {
        "project_id": "MPL-1001", "project_name": "Rural Road Connectivity - Rampur Block",
        "mp_name": "Rajesh Kumar Sharma", "constituency": "Varanasi North",
        "district": "Varanasi", "state": "Uttar Pradesh", "project_type": "Road Construction",
        "agency": "PWD Varanasi", "sanction_amount": 2500000, "estimated_cost": 2500000,
        "actual_expenditure": 2175000, "physical_progress": 82.0, "financial_progress": 87.0,
        "sanction_date": date(2023, 4, 1), "start_date": date(2023, 6, 15),
        "expected_completion_date": date(2024, 6, 15), "latitude": 25.3176, "longitude": 82.9739, "status": "In Progress",
    },
    {
        "project_id": "MPL-1002", "project_name": "Primary Health Centre Renovation",
        "mp_name": "Sunita Devi Yadav", "constituency": "Allahabad East",
        "district": "Prayagraj", "state": "Uttar Pradesh", "project_type": "Healthcare",
        "agency": "UPRNN", "sanction_amount": 1800000, "estimated_cost": 1800000,
        "actual_expenditure": 1850000, "physical_progress": 38.0, "financial_progress": 87.0,
        "sanction_date": date(2023, 3, 15), "start_date": date(2023, 5, 1),
        "expected_completion_date": date(2024, 3, 1), "latitude": 25.4358, "longitude": 81.8463, "status": "In Progress",
    },
    {
        "project_id": "MPL-1003", "project_name": "Community Water Supply - Chandpur Village",
        "mp_name": "Anil Kumar Gupta", "constituency": "Lucknow Central",
        "district": "Lucknow", "state": "Uttar Pradesh", "project_type": "Water Supply",
        "agency": "Jal Nigam UP", "sanction_amount": 3200000, "estimated_cost": 3200000,
        "actual_expenditure": 4890000, "physical_progress": 72.0, "financial_progress": 75.0,
        "sanction_date": date(2022, 9, 10), "start_date": date(2022, 11, 1),
        "expected_completion_date": date(2024, 5, 1), "latitude": 26.8467, "longitude": 80.9462, "status": "In Progress",
    },
    {
        "project_id": "MPL-1004", "project_name": "Community Water Supply - Chandpur Extension",
        "mp_name": "Meera Pandey", "constituency": "Lucknow West",
        "district": "Lucknow", "state": "Uttar Pradesh", "project_type": "Water Supply",
        "agency": "Jal Nigam UP", "sanction_amount": 3100000, "estimated_cost": 3100000,
        "actual_expenditure": 3050000, "physical_progress": 68.0, "financial_progress": 70.0,
        "sanction_date": date(2022, 10, 1), "start_date": date(2022, 12, 1),
        "expected_completion_date": date(2024, 6, 1), "latitude": 26.8512, "longitude": 80.9389, "status": "In Progress",
    },
    {
        "project_id": "MPL-1005", "project_name": "Anganwadi Centre Construction - Sector 7",
        "mp_name": "Pramod Singh Tomar", "constituency": "Agra Urban",
        "district": "Agra", "state": "Uttar Pradesh", "project_type": "Education",
        "agency": "DRDA Agra", "sanction_amount": 900000, "estimated_cost": 900000,
        "actual_expenditure": 895000, "physical_progress": 95.0, "financial_progress": 99.0,
        "sanction_date": date(2023, 1, 10), "start_date": date(2023, 3, 1),
        "expected_completion_date": date(2023, 12, 31), "actual_completion_date": date(2023, 12, 28),
        "latitude": 27.1767, "longitude": 78.0081, "status": "Completed",
    },
    {
        "project_id": "MPL-1006", "project_name": "Street Lighting - NH-24 Stretch",
        "mp_name": "Divya Rawat", "constituency": "Haridwar",
        "district": "Haridwar", "state": "Uttarakhand", "project_type": "Infrastructure",
        "agency": "UPCL", "sanction_amount": 1500000, "estimated_cost": 1500000,
        "actual_expenditure": 420000, "physical_progress": 15.0, "financial_progress": 28.0,
        "sanction_date": date(2022, 7, 1), "start_date": date(2022, 9, 1),
        "expected_completion_date": date(2023, 9, 1), "latitude": 29.9457, "longitude": 78.1642, "status": "Delayed",
    },
    {
        "project_id": "MPL-1007", "project_name": "Panchayat Bhawan - Khaira Gram",
        "mp_name": "Ravi Shankar Prasad", "constituency": "Patna Sahib",
        "district": "Patna", "state": "Bihar", "project_type": "Government Building",
        "agency": "BSRDCL", "sanction_amount": 2000000, "estimated_cost": 2000000,
        "actual_expenditure": 1950000, "physical_progress": 90.0, "financial_progress": 97.0,
        "sanction_date": date(2023, 2, 14), "start_date": date(2023, 4, 1),
        "expected_completion_date": date(2024, 4, 1), "latitude": 25.5941, "longitude": 85.1376, "status": "In Progress",
    },
    {
        "project_id": "MPL-1008", "project_name": "Flood Relief Infrastructure - Kosi Zone",
        "mp_name": "Tariq Anwar", "constituency": "Katihar",
        "district": "Katihar", "state": "Bihar", "project_type": "Flood Management",
        "agency": "WRD Bihar", "sanction_amount": 5000000, "estimated_cost": 5000000,
        "actual_expenditure": 7800000, "physical_progress": 42.0, "financial_progress": 78.0,
        "sanction_date": date(2022, 5, 1), "start_date": date(2022, 7, 1),
        "expected_completion_date": date(2023, 12, 31), "latitude": 25.5660, "longitude": 87.5957, "status": "Delayed",
    },
    {
        "project_id": "MPL-1009", "project_name": "Rural Electrification - 12 Villages",
        "mp_name": "Amit Shah", "constituency": "Gandhinagar",
        "district": "Gandhinagar", "state": "Gujarat", "project_type": "Electrification",
        "agency": "PGVCL", "sanction_amount": 4200000, "estimated_cost": 4200000,
        "actual_expenditure": 4100000, "physical_progress": 96.0, "financial_progress": 97.0,
        "sanction_date": date(2022, 11, 1), "start_date": date(2023, 1, 1),
        "expected_completion_date": date(2024, 1, 1), "latitude": 23.2156, "longitude": 72.6369, "status": "In Progress",
    },
    {
        "project_id": "MPL-1010", "project_name": "Irrigation Canal Lining - Block D",
        "mp_name": "Narendra Singh Tomar", "constituency": "Morena",
        "district": "Morena", "state": "Madhya Pradesh", "project_type": "Irrigation",
        "agency": "WRD MP", "sanction_amount": 3800000, "estimated_cost": 3800000,
        "actual_expenditure": 3950000, "physical_progress": 55.0, "financial_progress": 58.0,
        "sanction_date": date(2023, 5, 1), "start_date": date(2023, 7, 1),
        "expected_completion_date": date(2024, 12, 31), "latitude": 26.4975, "longitude": 78.0261, "status": "In Progress",
    },
    {
        "project_id": "MPL-1011", "project_name": "School Building Renovation - Dist. Govt. School",
        "mp_name": "P. Chidambaram", "constituency": "Sivaganga",
        "district": "Sivaganga", "state": "Tamil Nadu", "project_type": "Education",
        "agency": "TNSCB", "sanction_amount": 1200000, "estimated_cost": 1200000,
        "actual_expenditure": 1180000, "physical_progress": 88.0, "financial_progress": 92.0,
        "sanction_date": date(2023, 6, 1), "start_date": date(2023, 8, 1),
        "expected_completion_date": date(2024, 8, 1), "latitude": 9.8473, "longitude": 78.4772, "status": "In Progress",
    },
    {
        "project_id": "MPL-1012", "project_name": "Rural Road - Bypass Link Chandpur",
        "mp_name": "Anil Kumar Gupta", "constituency": "Lucknow Central",
        "district": "Lucknow", "state": "Uttar Pradesh", "project_type": "Road Construction",
        "agency": "PWD UP", "sanction_amount": 2800000, "estimated_cost": 2800000,
        "actual_expenditure": 1200000, "physical_progress": 20.0, "financial_progress": 43.0,
        "sanction_date": date(2022, 8, 15), "start_date": date(2022, 10, 1),
        "expected_completion_date": date(2023, 10, 1), "latitude": 26.8532, "longitude": 80.9510, "status": "Delayed",
    },
    {
        "project_id": "MPL-1013", "project_name": "Drinking Water Pipeline - Tehsil HQ",
        "mp_name": "Anurag Thakur", "constituency": "Hamirpur",
        "district": "Hamirpur", "state": "Himachal Pradesh", "project_type": "Water Supply",
        "agency": "IPH Dept HP", "sanction_amount": 2100000, "estimated_cost": 2100000,
        "actual_expenditure": 2080000, "physical_progress": 94.0, "financial_progress": 99.0,
        "sanction_date": date(2023, 3, 1), "start_date": date(2023, 5, 1),
        "expected_completion_date": date(2024, 5, 1), "latitude": 31.6860, "longitude": 76.5210, "status": "In Progress",
    },
    {
        "project_id": "MPL-1014", "project_name": "Community Hall - Sector 14 Gurgaon",
        "mp_name": "Deepender Singh Hooda", "constituency": "Rohtak",
        "district": "Gurgaon", "state": "Haryana", "project_type": "Government Building",
        "agency": "HSVP", "sanction_amount": 3500000, "estimated_cost": 3500000,
        "actual_expenditure": 3450000, "physical_progress": 48.0, "financial_progress": 55.0,
        "sanction_date": date(2023, 1, 1), "start_date": date(2023, 3, 1),
        "expected_completion_date": date(2024, 9, 1), "latitude": 28.4595, "longitude": 77.0266, "status": "In Progress",
    },
    {
        "project_id": "MPL-1015", "project_name": "Solar Power Plant - 50kW Capacity",
        "mp_name": "Smriti Irani", "constituency": "Amethi",
        "district": "Amethi", "state": "Uttar Pradesh", "project_type": "Renewable Energy",
        "agency": "UPNEDA", "sanction_amount": 2200000, "estimated_cost": 2200000,
        "actual_expenditure": 2240000, "physical_progress": 100.0, "financial_progress": 100.0,
        "sanction_date": date(2022, 12, 1), "start_date": date(2023, 1, 15),
        "expected_completion_date": date(2023, 12, 1), "actual_completion_date": date(2023, 11, 30),
        "latitude": 26.1542, "longitude": 81.7116, "status": "Completed",
    },
    {
        "project_id": "MPL-1016", "project_name": "Bridge Construction - Nala Crossing",
        "mp_name": "Bhupesh Baghel", "constituency": "Rajnandgaon",
        "district": "Rajnandgaon", "state": "Chhattisgarh", "project_type": "Bridge",
        "agency": "CGRDC", "sanction_amount": 6000000, "estimated_cost": 6000000,
        "actual_expenditure": 5800000, "physical_progress": 30.0, "financial_progress": 61.0,
        "sanction_date": date(2022, 6, 1), "start_date": date(2022, 8, 15),
        "expected_completion_date": date(2024, 8, 15), "latitude": 21.0970, "longitude": 81.0380, "status": "In Progress",
    },
    {
        "project_id": "MPL-1017", "project_name": "Playground Development - Rural Sports",
        "mp_name": "Kirron Kher", "constituency": "Chandigarh",
        "district": "Chandigarh", "state": "Chandigarh", "project_type": "Sports",
        "agency": "CHB", "sanction_amount": 800000, "estimated_cost": 800000,
        "actual_expenditure": 790000, "physical_progress": 97.0, "financial_progress": 98.0,
        "sanction_date": date(2023, 7, 1), "start_date": date(2023, 9, 1),
        "expected_completion_date": date(2024, 3, 1), "latitude": 30.7333, "longitude": 76.7794, "status": "In Progress",
    },
    {
        "project_id": "MPL-1018", "project_name": "Veterinary Hospital - Block Level",
        "mp_name": "Giriraj Singh", "constituency": "Begusarai",
        "district": "Begusarai", "state": "Bihar", "project_type": "Healthcare",
        "agency": "AHD Bihar", "sanction_amount": 1600000, "estimated_cost": 1600000,
        "actual_expenditure": 800000, "physical_progress": 10.0, "financial_progress": 50.0,
        "sanction_date": date(2022, 4, 1), "start_date": date(2022, 6, 1),
        "expected_completion_date": date(2023, 12, 1), "latitude": 25.4181, "longitude": 86.1298, "status": "Delayed",
    },
    {
        "project_id": "MPL-1019", "project_name": "Footpath & Drain - Urban Area Sector 3",
        "mp_name": "Mahua Moitra", "constituency": "Krishnanagar",
        "district": "Nadia", "state": "West Bengal", "project_type": "Infrastructure",
        "agency": "KMC", "sanction_amount": 1100000, "estimated_cost": 1100000,
        "actual_expenditure": 1090000, "physical_progress": 92.0, "financial_progress": 95.0,
        "sanction_date": date(2023, 4, 15), "start_date": date(2023, 6, 1),
        "expected_completion_date": date(2024, 6, 1), "latitude": 23.4010, "longitude": 88.4878, "status": "In Progress",
    },
    {
        "project_id": "MPL-1020", "project_name": "Digital Library - Block Resource Centre",
        "mp_name": "Rahul Gandhi", "constituency": "Wayanad",
        "district": "Wayanad", "state": "Kerala", "project_type": "Education",
        "agency": "KPWD", "sanction_amount": 1400000, "estimated_cost": 1400000,
        "actual_expenditure": 1380000, "physical_progress": 85.0, "financial_progress": 88.0,
        "sanction_date": date(2023, 5, 1), "start_date": date(2023, 7, 1),
        "expected_completion_date": date(2024, 7, 1), "latitude": 11.6854, "longitude": 76.1320, "status": "In Progress",
    },
    {
        "project_id": "MPL-1021", "project_name": "Cold Storage - Agri Produce Unit",
        "mp_name": "Hema Malini", "constituency": "Mathura",
        "district": "Mathura", "state": "Uttar Pradesh", "project_type": "Agriculture",
        "agency": "UPPCL", "sanction_amount": 4500000, "estimated_cost": 4500000,
        "actual_expenditure": 6200000, "physical_progress": 35.0, "financial_progress": 82.0,
        "sanction_date": date(2022, 3, 1), "start_date": date(2022, 5, 1),
        "expected_completion_date": date(2023, 11, 1), "latitude": 27.4924, "longitude": 77.6737, "status": "Delayed",
    },
    {
        "project_id": "MPL-1022", "project_name": "Solid Waste Management - Municipality",
        "mp_name": "Supriya Sule", "constituency": "Baramati",
        "district": "Pune", "state": "Maharashtra", "project_type": "Sanitation",
        "agency": "PMC", "sanction_amount": 2700000, "estimated_cost": 2700000,
        "actual_expenditure": 2650000, "physical_progress": 78.0, "financial_progress": 82.0,
        "sanction_date": date(2023, 2, 1), "start_date": date(2023, 4, 1),
        "expected_completion_date": date(2024, 10, 1), "latitude": 18.1522, "longitude": 74.5815, "status": "In Progress",
    },
]

SEED_EVIDENCE = [
    {"project_id": "MPL-1002", "project_name": "Primary Health Centre Renovation",
     "evidence_type": "Project Photo", "upload_date": date(2024, 1, 15),
     "verification_status": "Mismatch", "risk_status": "HIGH",
     "notes": "Photos show incomplete structure inconsistent with 87% financial progress.", "file_name": "phc_photo_jan24.jpg"},
    {"project_id": "MPL-1002", "project_name": "Primary Health Centre Renovation",
     "evidence_type": "Payment Record", "upload_date": date(2024, 2, 1),
     "verification_status": "Verified", "risk_status": "LOW",
     "notes": "Payment records match invoices.", "file_name": "payment_feb24.pdf"},
    {"project_id": "MPL-1002", "project_name": "Primary Health Centre Renovation",
     "evidence_type": "Work Order", "upload_date": None,
     "verification_status": "Missing", "risk_status": "HIGH",
     "notes": "Work order not submitted.", "file_name": None},
    {"project_id": "MPL-1002", "project_name": "Primary Health Centre Renovation",
     "evidence_type": "Completion Certificate", "upload_date": None,
     "verification_status": "Pending", "risk_status": "MEDIUM",
     "notes": "Awaiting from agency.", "file_name": None},
    {"project_id": "MPL-1003", "project_name": "Community Water Supply - Chandpur Village",
     "evidence_type": "Project Photo", "upload_date": date(2024, 3, 10),
     "verification_status": "Verified", "risk_status": "LOW",
     "notes": "Photos consistent with progress.", "file_name": "water_photo_mar24.jpg"},
    {"project_id": "MPL-1003", "project_name": "Community Water Supply - Chandpur Village",
     "evidence_type": "Work Order", "upload_date": date(2023, 1, 5),
     "verification_status": "Verified", "risk_status": "LOW",
     "notes": "Work order valid.", "file_name": "workorder_1003.pdf"},
    {"project_id": "MPL-1021", "project_name": "Cold Storage - Agri Produce Unit",
     "evidence_type": "Project Photo", "upload_date": date(2024, 4, 20),
     "verification_status": "Mismatch", "risk_status": "CRITICAL",
     "notes": "Aerial photo shows construction at ~30%, contradicting 82% financial claim.", "file_name": "cold_store_aerial.jpg"},
    {"project_id": "MPL-1021", "project_name": "Cold Storage - Agri Produce Unit",
     "evidence_type": "Completion Certificate", "upload_date": None,
     "verification_status": "Missing", "risk_status": "HIGH",
     "notes": "Not submitted.", "file_name": None},
    {"project_id": "MPL-1021", "project_name": "Cold Storage - Agri Produce Unit",
     "evidence_type": "Payment Record", "upload_date": date(2024, 2, 28),
     "verification_status": "Pending", "risk_status": "HIGH",
     "notes": "Multiple transactions to different vendors. Under review.", "file_name": "payment_coldstore.pdf"},
    {"project_id": "MPL-1008", "project_name": "Flood Relief Infrastructure - Kosi Zone",
     "evidence_type": "Supporting Document", "upload_date": date(2023, 11, 1),
     "verification_status": "Mismatch", "risk_status": "CRITICAL",
     "notes": "Disaster assessment does not justify expenditure level.", "file_name": "flood_assessment.pdf"},
    {"project_id": "MPL-1001", "project_name": "Rural Road Connectivity - Rampur Block",
     "evidence_type": "Project Photo", "upload_date": date(2024, 2, 10),
     "verification_status": "Verified", "risk_status": "LOW",
     "notes": "Photos match progress reports.", "file_name": "road_photo_feb24.jpg"},
    {"project_id": "MPL-1001", "project_name": "Rural Road Connectivity - Rampur Block",
     "evidence_type": "Work Order", "upload_date": date(2023, 6, 20),
     "verification_status": "Verified", "risk_status": "LOW",
     "notes": "Valid work order on record.", "file_name": "workorder_1001.pdf"},
]


def seed_database():
    db = SessionLocal()
    try:
        # Clear existing data
        logger.info("Clearing existing seed data...")
        for model in [ComplianceCheck, Evidence, Investigation, Alert, RiskAnalysis, Project]:
            db.query(model).delete()
        db.commit()

        # Insert projects
        logger.info(f"Inserting {len(SEED_PROJECTS)} projects...")
        project_objects = []
        for pd in SEED_PROJECTS:
            p = Project(**{k: v for k, v in pd.items() if k != "actual_completion_date" or pd.get(k)})
            if "actual_completion_date" in pd:
                p.actual_completion_date = pd["actual_completion_date"]
            db.add(p)
            project_objects.append(p)
        db.commit()

        # Insert evidence
        logger.info(f"Inserting {len(SEED_EVIDENCE)} evidence records...")
        for ed in SEED_EVIDENCE:
            e = Evidence(**ed)
            db.add(e)
        db.commit()

        # Run risk analysis for all projects
        logger.info("Running risk analysis for all projects...")
        all_project_dicts = [
            {k: str(v) if isinstance(v, date) else v for k, v in pd.items()}
            for pd in SEED_PROJECTS
        ]

        alert_counter = 1
        inv_counter = 1

        for pd in SEED_PROJECTS:
            pid = pd["project_id"]
            project_dict = {k: str(v) if isinstance(v, date) else v for k, v in pd.items()}

            ev_items = db.query(Evidence).filter(Evidence.project_id == pid).all()
            evidence_list = [{"evidence_type": e.evidence_type, "verification_status": e.verification_status} for e in ev_items]

            result = analyse_project(project_dict, all_project_dicts, evidence_list)

            # Save risk analysis
            dup = result.get("duplicate_result", {})
            matched = dup.get("matched_project")
            ra = RiskAnalysis(
                project_id=pid,
                financial_risk=result["financial_risk"],
                execution_risk=result["execution_risk"],
                duplicate_risk=result["duplicate_risk"],
                compliance_risk=result["compliance_risk"],
                evidence_risk=result["evidence_risk"],
                unified_risk_score=result["unified_risk_score"],
                risk_level=result["risk_level"],
                matched_project_id=matched.get("project_id") if matched else None,
                semantic_similarity=dup.get("semantic_similarity", 0),
                geographical_similarity=dup.get("geographical_similarity", 0),
                distance_km=dup.get("distance_km"),
                delay_probability=result.get("delay_probability"),
                predicted_delay_days=result.get("predicted_delay_days"),
                flagged_reasons=json.dumps(result["flagged_reasons"]),
            )
            db.add(ra)

            # Save compliance checks
            comp = result.get("compliance_result", {})
            for check in comp.get("checks", []):
                cc = ComplianceCheck(
                    project_id=pid,
                    project_name=pd["project_name"],
                    rule=check["rule"],
                    status=check["status"],
                    severity=check["severity"],
                    reason=check["reason"],
                    compliance_score=comp.get("compliance_score", 0),
                )
                db.add(cc)

            # Generate alerts
            alerts = determine_alert_type(result, project_dict)
            for a_data in alerts:
                alert = Alert(
                    alert_id=f"ALT-{alert_counter:03d}",
                    project_id=pid,
                    project_name=pd["project_name"],
                    district=pd["district"],
                    alert_type=a_data["alert_type"],
                    severity=a_data["severity"],
                    risk_score=result["unified_risk_score"],
                    reason=a_data["reason"],
                    status="New",
                )
                db.add(alert)
                alert_counter += 1

            # Create investigation for HIGH/CRITICAL projects
            if result["risk_level"] in ("HIGH", "CRITICAL"):
                risk_factors = []
                if result["financial_risk"] > 60: risk_factors.append("Financial Anomaly")
                if result["execution_risk"] > 60: risk_factors.append("Progress Mismatch")
                if result["duplicate_risk"] > 60: risk_factors.append("Possible Duplicate")
                if result["compliance_risk"] > 60: risk_factors.append("Compliance Violation")
                if result["evidence_risk"] > 60: risk_factors.append("Missing Evidence")

                priority = 1 if result["risk_level"] == "CRITICAL" else 2
                inv = Investigation(
                    investigation_id=f"INV-{inv_counter:03d}",
                    project_id=pid,
                    project_name=pd["project_name"],
                    district=pd["district"],
                    risk_score=result["unified_risk_score"],
                    risk_level=result["risk_level"],
                    risk_factors=json.dumps(risk_factors),
                    priority=priority,
                    assigned_officer="Unassigned",
                    status="New",
                )
                db.add(inv)
                inv_counter += 1

        db.commit()
        logger.info(f"✓ Seed complete: {len(SEED_PROJECTS)} projects, {len(SEED_EVIDENCE)} evidence records, "
                    f"{alert_counter - 1} alerts, {inv_counter - 1} investigations created.")

    except Exception as e:
        db.rollback()
        logger.error(f"Seed failed: {e}", exc_info=True)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
    seed_database()
    logger.info("Database seeded successfully.")
