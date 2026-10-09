"""
MPLADS Risk Intelligence — Synthetic Data Generator
====================================================
Generates ~200 synthetic projects across 15 states, 30 fictional MPs,
5 financial years. Injects labeled anomalies with ground truth.
Seeded RNG for reproducibility.

Run: python -m data.generate_synthetic   (from backend/ directory)

All data is FICTIONAL. is_synthetic=True on every record.
No real MPs, constituencies or fund data.
"""
import sys, os, random, math, json, hashlib
from datetime import date, timedelta, datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SEED = 42
rng = random.Random(SEED)

# ── Fictional MPs (30 across 15 states) ──────────────────────────────────────
STATES = [
    "Uttar Pradesh", "Bihar", "Maharashtra", "Tamil Nadu", "West Bengal",
    "Madhya Pradesh", "Rajasthan", "Gujarat", "Karnataka", "Andhra Pradesh",
    "Telangana", "Odisha", "Punjab", "Haryana", "Chhattisgarh",
]

FICTIONAL_NAMES = [
    "Rajendra Bhushan","Meera Devi Tomar","Suresh Kumar Pandey","Anita Singh Rathore",
    "Vikram Narayan Das","Priya Kumari Saxena","Ashok Prasad Verma","Sunita Bai Yadav",
    "Ramesh Chandra Gupta","Kavita Shukla","Mohan Lal Tripathi","Sarita Devi Mishra",
    "Dinesh Kumar Joshi","Rekha Patel","Arjun Singh Thakur","Nirmala Devi Chauhan",
    "Pramod Rajan","Sudha Krishnamurthy","Balram Sinha","Geeta Rani Mehta",
    "Harish Prasad","Uma Shankar Nair","Deepak Kumar Shah","Laxmi Bai Patil",
    "Naresh Choudhary","Sangeeta Tiwari","Bhupendra Rao","Kamla Devi Bisht",
    "Rakesh Awasthi","Pooja Banerjee",
]

CONSTITUENCIES = [
    "North District","South Rural","East Urban","West Valley","Central Plains",
    "Hill Region","River Basin","Forest Circle","Coastal Area","Desert Zone",
    "Plateau Sector","Mountain Pass","Lakeshore","Industrial Belt","Agricultural Zone",
]

PARTIES = ["INC", "BJP", "SP", "BSP", "TMC", "DMK", "TDP", "BJD", "AAP", "JDU"]

CATEGORIES = [
    "Road Construction", "Water Supply", "Healthcare", "Education",
    "Sanitation", "Bridge", "Agriculture", "Electrification",
    "Government Building", "Flood Management",
]

AGENCIES = [
    "PWD", "Jal Nigam", "UPRNN", "DRDA", "WRD", "PGVCL",
    "TNSCB", "KMC", "BSRDCL", "CGRDC", "HSVP", "CHB",
]

DISTRICTS = {
    "Uttar Pradesh": ["Varanasi","Lucknow","Agra","Prayagraj","Mathura","Amethi"],
    "Bihar": ["Patna","Katihar","Begusarai","Muzaffarpur","Gaya","Bhagalpur"],
    "Maharashtra": ["Pune","Nashik","Nagpur","Aurangabad","Kolhapur","Solapur"],
    "Tamil Nadu": ["Chennai","Coimbatore","Madurai","Sivaganga","Salem","Trichy"],
    "West Bengal": ["Kolkata","Nadia","Howrah","Burdwan","Siliguri","Kharagpur"],
    "Madhya Pradesh": ["Bhopal","Indore","Morena","Gwalior","Jabalpur","Ujjain"],
    "Rajasthan": ["Jaipur","Jodhpur","Udaipur","Kota","Ajmer","Bikaner"],
    "Gujarat": ["Ahmedabad","Surat","Gandhinagar","Vadodara","Rajkot","Bhavnagar"],
    "Karnataka": ["Bengaluru","Mysuru","Hubli","Mangaluru","Belgaum","Tumkur"],
    "Andhra Pradesh": ["Vijayawada","Visakhapatnam","Guntur","Tirupati","Nellore","Kurnool"],
    "Telangana": ["Hyderabad","Warangal","Nizamabad","Karimnagar","Khammam","Mahbubnagar"],
    "Odisha": ["Bhubaneswar","Cuttack","Rourkela","Berhampur","Sambalpur","Puri"],
    "Punjab": ["Amritsar","Ludhiana","Chandigarh","Jalandhar","Patiala","Bathinda"],
    "Haryana": ["Gurugram","Faridabad","Rohtak","Hisar","Ambala","Panipat"],
    "Chhattisgarh": ["Raipur","Bilaspur","Rajnandgaon","Durg","Korba","Jagdalpur"],
}

# Base costs per category (lognormal center in INR)
BASE_COSTS = {
    "Road Construction": 3_000_000, "Water Supply": 2_500_000,
    "Healthcare": 2_000_000, "Education": 1_500_000,
    "Sanitation": 1_200_000, "Bridge": 5_000_000,
    "Agriculture": 2_000_000, "Electrification": 3_500_000,
    "Government Building": 2_500_000, "Flood Management": 4_000_000,
}

# India bounding box for coordinate generation
INDIA_LAT = (8.4, 37.6)
INDIA_LON = (68.7, 97.25)

FINANCIAL_YEARS = ["2019-20", "2020-21", "2021-22", "2022-23", "2023-24"]
ANOMALY_TYPES = [
    "overspend", "progress_gap", "deadline_overrun",
    "missing_docs", "cost_unit_outlier", "round_payment", "none"
]


def lognormal_cost(base, sigma=0.35):
    return max(500_000, rng.lognormvariate(math.log(base), sigma))


def rand_date(start_year=2019, end_year=2024):
    d = date(start_year, 1, 1) + timedelta(days=rng.randint(0, 365 * (end_year - start_year)))
    return d


def rand_coord(state):
    # rough lat/lon per state
    state_centers = {
        "Uttar Pradesh": (26.8, 80.9), "Bihar": (25.4, 85.1),
        "Maharashtra": (19.7, 75.7), "Tamil Nadu": (10.8, 78.7),
        "West Bengal": (22.9, 87.8), "Madhya Pradesh": (23.5, 77.5),
        "Rajasthan": (27.0, 74.2), "Gujarat": (22.3, 71.2),
        "Karnataka": (15.3, 75.7), "Andhra Pradesh": (15.9, 79.7),
        "Telangana": (17.4, 78.5), "Odisha": (20.9, 84.2),
        "Punjab": (31.1, 75.3), "Haryana": (29.1, 76.1),
        "Chhattisgarh": (21.3, 81.7),
    }
    clat, clon = state_centers.get(state, (20.0, 78.0))
    return (round(clat + rng.uniform(-2, 2), 4), round(clon + rng.uniform(-2, 2), 4))


def generate_projects(n=200):
    projects = []
    members = []
    fund_ledger = []
    expenditure_entries = []
    progress_updates = []
    ground_truth = []
    data_quality_issues = []

    # Generate 30 fictional MPs
    for i, name in enumerate(FICTIONAL_NAMES):
        state = STATES[i % len(STATES)]
        m = {
            "member_code": f"SYN-MP-{i+1:03d}",
            "name": name,
            "house": "Lok Sabha" if i < 25 else "Rajya Sabha",
            "party": rng.choice(PARTIES),
            "state": state,
            "constituency_name": CONSTITUENCIES[i % len(CONSTITUENCIES)],
            "term_start": date(2019, 5, 1),
            "term_end": date(2024, 5, 1),
            "is_synthetic": True,
        }
        members.append(m)
        # Fund ledger entries per MP per FY
        unspent = rng.uniform(0, 500_000)
        for fy in FINANCIAL_YEARS:
            released = round(rng.uniform(4_000_000, 5_500_000), -3)  # ~5 Cr per year
            spent = round(released * rng.uniform(0.6, 0.98), -3)
            fund_ledger.append({
                "member_code": m["member_code"],
                "financial_year": fy,
                "entitlement": 5_000_000,
                "installment_no": rng.choice([1, 2]),
                "amount_released": released,
                "released_date": rand_date(int(fy[:4]), int(fy[:4]) + 1),
                "interest_earned": round(released * 0.04 * rng.uniform(0.3, 0.8), 2),
                "unspent_opening": round(unspent, 2),
                "unspent_closing": round(max(0, unspent + released - spent), 2),
                "source": "SYNTHETIC",
            })
            unspent = max(0, unspent + released - spent)

    # Generate projects
    for i in range(n):
        state = rng.choice(STATES)
        district = rng.choice(DISTRICTS[state])
        mp_idx = rng.randint(0, len(members) - 1)
        mp = members[mp_idx]
        category = rng.choice(CATEGORIES)
        base_cost = BASE_COSTS[category]
        estimated = round(lognormal_cost(base_cost), -3)
        anomaly = rng.choices(ANOMALY_TYPES, weights=[5, 8, 6, 5, 3, 3, 70])[0]
        fy = rng.choice(FINANCIAL_YEARS)
        start = rand_date(int(fy[:4]), int(fy[:4]) + 1)
        duration_days = rng.randint(180, 900)
        expected_end = start + timedelta(days=duration_days)
        today = date.today()

        # Physical progress based on time elapsed
        elapsed_frac = min(1.0, (today - start).days / max(duration_days, 1))
        pp_base = min(100, elapsed_frac * rng.uniform(0.7, 1.1) * 100)

        # Inject anomaly
        if anomaly == "overspend":
            actual_exp = round(estimated * rng.uniform(1.3, 1.8), -3)
            fp = round(min(100, pp_base + rng.uniform(0, 5)), 1)
            pp = round(pp_base, 1)
            severity = "HIGH"
        elif anomaly == "progress_gap":
            actual_exp = round(estimated * rng.uniform(0.5, 0.8), -3)
            fp = round(min(100, pp_base + rng.uniform(25, 55)), 1)
            pp = round(max(0, pp_base - rng.uniform(5, 15)), 1)
            severity = "HIGH"
        elif anomaly == "deadline_overrun":
            expected_end = start + timedelta(days=rng.randint(60, 180))  # short deadline, now past
            actual_exp = round(estimated * rng.uniform(0.4, 0.7), -3)
            fp = round(pp_base * rng.uniform(0.5, 0.8), 1)
            pp = round(fp * rng.uniform(0.7, 0.95), 1)
            severity = "MEDIUM"
        elif anomaly == "cost_unit_outlier":
            actual_exp = round(estimated * rng.uniform(1.8, 3.0), -3)
            fp = round(min(100, pp_base + rng.uniform(0, 10)), 1)
            pp = round(pp_base, 1)
            severity = "HIGH"
        elif anomaly == "round_payment":
            actual_exp = round(estimated * rng.uniform(0.3, 0.9), -3)
            fp = round(min(100, pp_base + rng.uniform(0, 8)), 1)
            pp = round(pp_base, 1)
            severity = "LOW"
        elif anomaly == "missing_docs":
            actual_exp = round(estimated * rng.uniform(0.4, 0.85), -3)
            fp = round(pp_base, 1)
            pp = round(pp_base, 1)
            severity = "MEDIUM"
        else:
            actual_exp = round(estimated * rng.uniform(0.5, 1.05), -3)
            fp = round(min(100, pp_base + rng.uniform(-3, 5)), 1)
            pp = round(pp_base, 1)
            severity = "LOW"

        fp = max(0, min(100, fp))
        pp = max(0, min(100, pp))
        if today < expected_end and pp < 100:
            status = "In Progress"
        elif today > expected_end and pp < 100:
            status = "Delayed"
        elif pp >= 99:
            status = "Completed"
        else:
            status = "In Progress"

        lat, lon = rand_coord(state)
        pid = f"SYN-{i+1:04d}"
        project_name = f"{category} - {district} {rng.choice(['Phase I','Phase II','Unit A','Block B','Zone C','Sector D'])}"

        p = {
            "project_id": pid,
            "project_name": project_name,
            "mp_name": mp["name"],
            "constituency": mp["constituency_name"],
            "district": district,
            "state": state,
            "project_type": category,
            "agency": rng.choice(AGENCIES),
            "sanction_amount": estimated,
            "estimated_cost": estimated,
            "actual_expenditure": actual_exp,
            "physical_progress": pp,
            "financial_progress": fp,
            "sanction_date": start - timedelta(days=rng.randint(10, 60)),
            "start_date": start,
            "expected_completion_date": expected_end,
            "actual_completion_date": start + timedelta(days=duration_days + rng.randint(0, 60)) if status == "Completed" else None,
            "latitude": lat,
            "longitude": lon,
            "status": status,
        }
        projects.append(p)

        # Ground truth
        gt_risk = "LOW" if anomaly == "none" else ("MEDIUM" if severity == "LOW" else ("HIGH" if severity == "MEDIUM" else "CRITICAL"))
        ground_truth.append({
            "project_id": pid,
            "injected_anomaly_type": anomaly,
            "anomaly_severity": severity,
            "ground_truth_risk_level": gt_risk,
            "notes": f"Synthetic anomaly injected: {anomaly}",
        })

        # Expenditure entries (3-8 payments)
        n_payments = rng.randint(3, 8)
        remaining = actual_exp
        cumulative = 0.0
        for j in range(n_payments):
            if j == 0:
                amt = round(actual_exp * rng.uniform(0.15, 0.30), -2)
                ptype = "advance"
            elif j == n_payments - 1:
                amt = remaining
                ptype = "final"
            else:
                amt = round(actual_exp * rng.uniform(0.10, 0.25), -2)
                ptype = "running"
            if anomaly == "round_payment":
                amt = round(amt / 100000) * 100000  # round to nearest lakh
            remaining = max(0, remaining - amt)
            cumulative += amt
            edate = start + timedelta(days=rng.randint(0, max(1, (today - start).days)))
            expenditure_entries.append({
                "project_id": pid,
                "entry_date": edate,
                "amount": round(amt, 2),
                "payment_type": ptype,
                "voucher_ref": f"VCH-{pid}-{j+1:02d}",
                "cumulative_total": round(cumulative, 2),
            })

        # Progress updates
        n_updates = rng.randint(2, 6)
        for k in range(n_updates):
            udate = start + timedelta(days=rng.randint(0, max(1, (today - start).days)))
            prog_val = round(min(100, pp * (k + 1) / n_updates + rng.uniform(-5, 5)), 1)
            progress_updates.append({
                "project_id": pid,
                "update_date": udate,
                "physical_progress_pct": max(0, min(100, prog_val)),
                "updated_by": f"officer_{rng.randint(1, 20)}",
            })

        # Data quality issues for some projects
        if anomaly == "missing_docs":
            data_quality_issues.append({
                "project_id": pid,
                "field_name": "completion_certificate",
                "issue_type": "missing_value",
                "severity": "HIGH",
                "detail": "Completion certificate not uploaded",
            })
        if actual_exp > estimated * 1.25:
            data_quality_issues.append({
                "project_id": pid,
                "field_name": "actual_expenditure",
                "issue_type": "invalid_range",
                "severity": "HIGH",
                "detail": f"Expenditure {actual_exp:,.0f} exceeds estimate {estimated:,.0f} by {(actual_exp/estimated - 1)*100:.0f}%",
            })

    return {
        "members": members,
        "fund_ledger": fund_ledger,
        "projects": projects,
        "expenditure_entries": expenditure_entries,
        "progress_updates": progress_updates,
        "ground_truth": ground_truth,
        "data_quality_issues": data_quality_issues,
    }


def seed_synthetic(clear_existing=False):
    from app.database import SessionLocal, init_db
    from app.models.project import Project, RiskAnalysis
    from app.models.extended import (
        Member, FundLedger, ExpenditureEntry, ProgressUpdate, GroundTruth, DataQualityIssue
    )
    from app.services.risk_service import analyse_project, determine_alert_type
    from app.models.alert import Alert
    from app.models.investigation import Investigation
    import json as _json

    init_db()
    db = SessionLocal()

    try:
        if clear_existing:
            print("Clearing existing synthetic data...")
            for model in [DataQualityIssue, GroundTruth, ProgressUpdate,
                          ExpenditureEntry, FundLedger, Member]:
                db.query(model).delete()
            # Only delete SYN- prefixed projects
            db.query(Project).filter(Project.project_id.like("SYN-%")).delete()
            db.commit()

        data = generate_projects(200)
        print(f"Inserting {len(data['members'])} members...")
        for m in data["members"]:
            if not db.query(Member).filter(Member.member_code == m["member_code"]).first():
                db.add(Member(**m))
        db.commit()

        print(f"Inserting {len(data['fund_ledger'])} fund ledger entries...")
        for fl in data["fund_ledger"]:
            db.add(FundLedger(**fl))
        db.commit()

        print(f"Inserting {len(data['projects'])} projects...")
        all_project_dicts = []
        for pd in data["projects"]:
            if db.query(Project).filter(Project.project_id == pd["project_id"]).first():
                continue
            p_data = {k: v for k, v in pd.items()}
            db.add(Project(**p_data))
            all_project_dicts.append({k: str(v) if hasattr(v, 'isoformat') else v for k, v in pd.items()})
        db.commit()

        print(f"Inserting {len(data['expenditure_entries'])} expenditure entries...")
        for ee in data["expenditure_entries"]:
            db.add(ExpenditureEntry(**ee))
        db.commit()

        print(f"Inserting {len(data['progress_updates'])} progress updates...")
        for pu in data["progress_updates"]:
            db.add(ProgressUpdate(**pu))
        db.commit()

        print(f"Inserting ground truth for {len(data['ground_truth'])} projects...")
        for gt in data["ground_truth"]:
            if not db.query(GroundTruth).filter(GroundTruth.project_id == gt["project_id"]).first():
                db.add(GroundTruth(**gt))
        db.commit()

        print(f"Inserting {len(data['data_quality_issues'])} data quality issues...")
        for dqi in data["data_quality_issues"]:
            db.add(DataQualityIssue(**dqi))
        db.commit()

        # Run risk analysis on synthetic projects
        print("Running risk analysis on synthetic projects...")
        all_db_projects = [
            {k: str(v) if hasattr(v, 'isoformat') else v
             for k, v in {
                "project_id": p.project_id, "project_name": p.project_name,
                "mp_name": p.mp_name, "constituency": p.constituency,
                "district": p.district, "state": p.state,
                "project_type": p.project_type, "agency": p.agency,
                "sanction_amount": p.sanction_amount, "estimated_cost": p.estimated_cost,
                "actual_expenditure": p.actual_expenditure,
                "physical_progress": p.physical_progress, "financial_progress": p.financial_progress,
                "sanction_date": p.sanction_date, "start_date": p.start_date,
                "expected_completion_date": p.expected_completion_date,
                "status": p.status, "latitude": p.latitude, "longitude": p.longitude,
             }.items()}
            for p in db.query(Project).filter(Project.project_id.like("SYN-%")).all()
        ]

        alert_counter = db.query(Alert).count() + 1
        inv_counter = db.query(Investigation).count() + 1

        for pd_dict in all_db_projects[:50]:  # Limit to 50 for speed
            pid = pd_dict["project_id"]
            try:
                result = analyse_project(pd_dict, all_db_projects, [])
                ra = db.query(RiskAnalysis).filter(RiskAnalysis.project_id == pid).first()
                if not ra:
                    ra = RiskAnalysis(project_id=pid)
                    db.add(ra)
                ra.financial_risk = result["financial_risk"]
                ra.execution_risk = result["execution_risk"]
                ra.duplicate_risk = result["duplicate_risk"]
                ra.compliance_risk = result["compliance_risk"]
                ra.evidence_risk = result["evidence_risk"]
                ra.unified_risk_score = result["unified_risk_score"]
                ra.risk_level = result["risk_level"]
                ra.delay_probability = result.get("delay_probability")
                ra.predicted_delay_days = result.get("predicted_delay_days")
                ra.flagged_reasons = _json.dumps(result["flagged_reasons"])
                db.commit()

                alerts = determine_alert_type(result, pd_dict)
                for a_data in alerts[:2]:
                    al = Alert(
                        alert_id=f"SYN-ALT-{alert_counter:04d}",
                        project_id=pid,
                        project_name=pd_dict["project_name"],
                        district=pd_dict["district"],
                        alert_type=a_data["alert_type"],
                        severity=a_data["severity"],
                        risk_score=result["unified_risk_score"],
                        reason=a_data["reason"],
                        status="New",
                    )
                    db.add(al)
                    alert_counter += 1

                if result["risk_level"] in ("HIGH", "CRITICAL"):
                    inv = Investigation(
                        investigation_id=f"SYN-INV-{inv_counter:04d}",
                        project_id=pid,
                        project_name=pd_dict["project_name"],
                        district=pd_dict["district"],
                        risk_score=result["unified_risk_score"],
                        risk_level=result["risk_level"],
                        risk_factors=_json.dumps(["Financial Anomaly", "Progress Mismatch"]),
                        priority=1 if result["risk_level"] == "CRITICAL" else 2,
                        assigned_officer="Unassigned",
                        status="New",
                    )
                    db.add(inv)
                    inv_counter += 1
                db.commit()
            except Exception as e:
                print(f"  Warning: analysis failed for {pid}: {e}")
                db.rollback()
                continue

        print(f"✓ Synthetic data generation complete.")
        print(f"  Members: {len(data['members'])}")
        print(f"  Projects: {len(data['projects'])}")
        print(f"  Fund ledger entries: {len(data['fund_ledger'])}")
        print(f"  Expenditure entries: {len(data['expenditure_entries'])}")
        print(f"  Ground truth records: {len(data['ground_truth'])}")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        import traceback; traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--clear", action="store_true", help="Clear existing synthetic data first")
    args = parser.parse_args()
    seed_synthetic(clear_existing=args.clear)
