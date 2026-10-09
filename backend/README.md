# MPLADS Risk Intelligence — Backend

**AI-powered anomaly, fraud and inefficiency detection system for MPLADS**  
SIH 2026 · Problem Statement SIH26102 · Theme: Smart Automation

> **Important:** This system is a decision-support tool. The AI detects anomalies and generates risk-based investigation recommendations. All final determinations — including any finding of fraud or irregularity — rest solely with authorised human officers.

---

## Architecture

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Settings from environment variables
│   ├── database.py          # SQLAlchemy engine + session (PostgreSQL / SQLite fallback)
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── project.py       # Project, RiskAnalysis
│   │   ├── alert.py         # Alert
│   │   ├── investigation.py # Investigation
│   │   ├── evidence.py      # Evidence
│   │   └── compliance.py    # ComplianceCheck
│   ├── schemas/             # Pydantic request/response schemas
│   ├── routes/              # FastAPI routers
│   │   ├── health.py        # GET /api/health
│   │   ├── dashboard.py     # GET /api/dashboard
│   │   ├── projects.py      # GET/POST /api/projects/*
│   │   ├── alerts.py        # GET /api/alerts
│   │   ├── investigations.py# GET/POST /api/investigations/*
│   │   ├── analytics.py     # GET /api/analytics
│   │   ├── evidence.py      # GET /api/evidence
│   │   └── compliance.py    # GET /api/compliance
│   ├── services/
│   │   └── risk_service.py  # Risk analysis orchestration
│   ├── ml/
│   │   ├── financial_anomaly.py   # Isolation Forest + statistical fallback
│   │   ├── execution_risk.py      # Progress mismatch + XGBoost delay prediction
│   │   ├── duplicate_detection.py # Sentence Transformers + TF-IDF fallback
│   │   ├── compliance_engine.py   # Rule-based compliance checks
│   │   ├── evidence_risk.py       # Evidence completeness scoring
│   │   └── unified_score.py       # Weighted composite score + explainability
│   └── utils/
│       └── helpers.py       # Error/success response helpers
├── data/
│   └── seed.py              # Database seed script (22 fictional projects)
├── tests/
│   ├── conftest.py          # Pytest fixtures (SQLite in-memory test DB)
│   ├── test_health.py
│   ├── test_projects.py
│   └── test_ml.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/dashboard` | Dashboard KPIs and top risk projects |
| GET | `/api/projects` | List projects (search, filter, paginate) |
| GET | `/api/projects/{id}` | Single project details |
| GET | `/api/projects/{id}/risk` | Risk breakdown for a project |
| GET | `/api/projects/{id}/duplicates` | Duplicate detection result |
| GET | `/api/projects/{id}/evidence` | Evidence records |
| GET | `/api/projects/{id}/compliance` | Compliance check results |
| POST | `/api/projects/{id}/analyze` | Trigger full risk analysis |
| GET | `/api/alerts` | List risk alerts |
| GET | `/api/investigations` | Investigation queue |
| POST | `/api/investigations/{id}/assign` | Assign officer |
| POST | `/api/investigations/{id}/status` | Update investigation status |
| GET | `/api/analytics` | Analytics data |
| GET | `/api/risk-map` | Geographic risk data |
| GET | `/api/evidence` | All evidence records |
| GET | `/api/compliance` | All compliance records |

Interactive docs available at `http://localhost:8000/docs`

---

## ML Pipeline

### 1. Financial Anomaly Detection
- **Algorithm:** Isolation Forest (scikit-learn)
- **Fallback:** Statistical z-score based on expenditure ratio vs peer projects
- **Input:** sanction amount, estimated cost, actual expenditure, project type, district, agency
- **Output:** financial_risk score 0–100

### 2. Execution Risk (Progress Mismatch)
- **Algorithm:** Deterministic formula on `financial_progress − physical_progress`
- **Thresholds:** ≤10pp LOW · 11–30pp MEDIUM · 31–50pp HIGH · >50pp CRITICAL
- **Delay Prediction:** XGBoost (falls back to rule-based when model unavailable)

### 3. Duplicate Detection
- **Algorithm:** Sentence Transformers cosine similarity (semantic) + Haversine distance (geographic)
- **Fallback:** TF-IDF cosine similarity → Jaccard keyword similarity
- **Threshold:** semantic ≥ 80% AND geographic proximity triggers duplicate flag

### 4. Compliance Engine
- Rule-based checks: required fields, approval info, timeline, progress updates, completion evidence, supporting docs
- Returns per-rule status (Passed / Failed / Pending) and compliance_score 0–100

### 5. Evidence Risk
- Checks completeness across 5 required evidence types
- Penalises missing (×0.6), mismatched (×0.3), and pending (×0.1) items

### 6. Unified Risk Score
```
score = financial×0.25 + execution×0.20 + duplicate×0.15 + compliance×0.15 + evidence×0.25
```
- 0–30 → LOW · 31–60 → MEDIUM · 61–80 → HIGH · 81–100 → CRITICAL
- Weights configurable via environment variables

---

## Installation

### Prerequisites
- Python 3.11+
- PostgreSQL 14+ (optional — SQLite used automatically if unavailable)

### Quick Start (without Docker)

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy and configure environment
copy .env.example .env
# Edit .env with your DATABASE_URL if using PostgreSQL

# 5. Seed database
python -m data.seed

# 6. Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker (Recommended)

```bash
# Start PostgreSQL + backend together
docker-compose up --build

# The seed script runs automatically on first start
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | SQLite fallback | PostgreSQL connection string |
| `SECRET_KEY` | dev key | JWT secret — change in production |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed frontend origins |
| `WEIGHT_FINANCIAL` | `0.25` | Financial risk weight |
| `WEIGHT_EXECUTION` | `0.20` | Execution risk weight |
| `WEIGHT_DUPLICATE` | `0.15` | Duplicate risk weight |
| `WEIGHT_COMPLIANCE` | `0.15` | Compliance risk weight |
| `WEIGHT_EVIDENCE` | `0.25` | Evidence risk weight |
| `DUPLICATE_SEMANTIC_THRESHOLD` | `0.80` | Semantic similarity threshold |
| `DUPLICATE_GEO_THRESHOLD_KM` | `5.0` | Geographic proximity threshold |

---

## Running Tests

```bash
# From the backend/ directory
pytest tests/ -v

# With coverage
pytest tests/ -v --tb=short
```

---

## Connecting the Frontend

The React frontend (in `mplads-frontend/`) automatically falls back to demo data if the backend is unavailable. To connect:

1. Ensure backend is running on `http://localhost:8000`
2. Frontend `.env` already has `VITE_API_BASE_URL=http://localhost:8000`
3. Start frontend: `cd mplads-frontend && npm run dev`
4. Open `http://localhost:5173`
