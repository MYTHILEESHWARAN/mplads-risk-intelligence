# MPLADS Risk Intelligence

**AI-Powered Anomaly, Fraud and Inefficiency Detection System for MPLADS**

> SIH 2026 · Problem Statement **SIH26102** · Theme: Smart Automation · Category: Software
> Team: **AI Avengers**

> **AI recommends, humans decide.** This system flags risk indicators and anomalies to support prioritisation of human review. It does not make findings of wrongdoing. All final determinations rest with authorised government officers.

---

## Table of Contents

1. [What this project does](#what-this-project-does)
2. [Current state](#current-state--what-is-real-vs-demo)
3. [Tech stack](#tech-stack)
4. [Project structure](#project-structure)
5. [Pages](#pages)
6. [How to run](#how-to-run)
7. [Environment variables](#environment-variables)
8. [Running tests](#running-tests)
9. [AI/ML pipeline](#aiml-pipeline)
10. [Data provenance](#data-provenance)
11. [Upgrade roadmap](#upgrade-roadmap-next-phases)
12. [How to push to GitHub](#how-to-push-to-github)
13. [Known limitations](#known-limitations)
14. [Team](#team)

---

## What this project does

MPLADS Risk Intelligence helps government officials identify high-risk, anomalous or non-compliant MPLADS projects. It computes a unified risk score across five dimensions — financial anomaly, execution mismatch, duplicate detection, compliance, and evidence completeness — and surfaces human-readable explanations for every flag.

Key capabilities today:

- **Unified Risk Score** computed from 5 weighted ML/rule sub-scores (formula: F×0.25 + E×0.20 + D×0.15 + C×0.15 + Ev×0.25)
- **Isolation Forest** financial anomaly detection (scikit-learn, with statistical fallback)
- **TF-IDF cosine + Haversine** duplicate project detection
- **Rule-based** compliance engine (6 configurable rules)
- **XGBoost** delay prediction (library installed; rule-based logic active — no pre-trained model file; by design for demo)
- **Explainability** — human-readable "Why was this flagged?" reasons (no fraud claims)
- **Alert generation** across 6 alert types
- **Investigation queue** with assign/escalate/resolve workflow
- **Demo fallback** — frontend works fully without the backend; shows a visible "Demo Data" banner
- **Add Project** modal with full validation and duplicate-ID detection
- **Dashboard live refresh** after project creation

---

## Current State — What is Real vs Demo

| Feature | Status | Notes |
|---------|--------|-------|
| Isolation Forest (financial anomaly) | **Real ML** | Runs via scikit-learn on ≥10 projects |
| TF-IDF duplicate detection | **Real ML** | Active fallback (Sentence Transformers not installed) |
| XGBoost (delay prediction) | **Library installed** | Rule-based logic used; no pre-trained model file |
| Compliance engine | **Real rule-based** | 6 configurable rules |
| Evidence risk | **Real formula** | Document completeness scoring |
| Unified risk score | **Real formula** | Verified: F×0.25 + E×0.20 + D×0.15 + C×0.15 + Ev×0.25 |
| Risk level classification | **Real** | 0-30 LOW / 31-60 MEDIUM / 61-80 HIGH / 81-100 CRITICAL |
| Dashboard statistics | **Live from DB** | Counts from actual project records; no hardcoding |
| Add Project | **Real** | POST /api/projects; persists to SQLite/PostgreSQL |
| Re-analyse button | **Real** | Calls POST /api/projects/{id}/analyze; persists RiskAnalysis row |
| Investigate button | **Partial** | Navigates to Investigation Queue; full case management is Phase 5 of roadmap |
| Map | **SVG mock** | No paid API; upgrade to d3-geo + India TopoJSON is in roadmap |
| Reports / Downloads | **Not implemented** | Roadmap Phase 8 |
| Official data import | **Not implemented** | Roadmap Phase 3 |
| SHAP explainability | **Not implemented** | Roadmap Phase 4 |
| JWT Auth / RBAC | **Not implemented** | Demo login only; roadmap Phase 10 |
| Data provenance tags | **Not implemented** | Roadmap Phase 2 |
| All data | **SYNTHETIC** | 22 fictional projects, fictional MP names. No real person is attached to any risk score. |

---

## Tech Stack

### Frontend

| | |
|--|--|
| Language | **JavaScript (JSX)** |
| Framework | **React 18** |
| Build tool | **Vite 5** |
| Styling | **Tailwind CSS 3** |
| Charts | **Recharts** |
| Icons | **Lucide React** |
| HTTP client | **Axios** |
| Routing | **React Router v6** |

### Backend

| | |
|--|--|
| Language | **Python 3.14** |
| Framework | **FastAPI** |
| Database | **SQLite** (local/demo) · **PostgreSQL** (production) |
| ORM | **SQLAlchemy 2** |
| Validation | **Pydantic v2** |
| Server | **Uvicorn** |
| ML — Anomaly | **scikit-learn** (Isolation Forest + TF-IDF) |
| ML — Delay | **XGBoost** |
| Data | **NumPy · Pandas** |
| Tests | **pytest** |
| Container | **Docker + docker-compose** |

---

## Project Structure

```
AI AVENGERS/
├── README.md
├── .gitignore
│
├── mplads-frontend/                  # React frontend
│   ├── src/
│   │   ├── pages/                    # 11 pages
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Projects.jsx          # + Add Project modal
│   │   │   ├── ProjectDetails.jsx
│   │   │   ├── RiskAlerts.jsx
│   │   │   ├── InvestigationQueue.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── RiskMap.jsx
│   │   │   ├── EvidenceReview.jsx
│   │   │   ├── Compliance.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/ui/            # Reusable components
│   │   │   ├── StatCard.jsx
│   │   │   ├── RiskBadge.jsx
│   │   │   ├── RiskScore.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── ChartCard.jsx
│   │   │   ├── LoadingState.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── DemoBanner.jsx
│   │   │   └── PageHeader.jsx
│   │   ├── layouts/                  # AppLayout, Sidebar, Topbar
│   │   ├── services/api.js           # API layer + demo-data fallback
│   │   ├── data/mockData.js          # 22 fictional projects (SYNTHETIC)
│   │   ├── hooks/useToast.js
│   │   └── utils/formatters.js
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── .env                          # VITE_API_BASE_URL (not committed)
│   └── .env.example
│
└── backend/                          # FastAPI backend
    ├── app/
    │   ├── main.py                   # App entry point + CORS
    │   ├── config.py                 # Settings from .env
    │   ├── database.py               # SQLAlchemy engine (SQLite/PG)
    │   ├── models/                   # SQLAlchemy ORM models
    │   │   ├── project.py            # Project, RiskAnalysis
    │   │   ├── alert.py
    │   │   ├── investigation.py
    │   │   ├── evidence.py
    │   │   └── compliance.py
    │   ├── schemas/                  # Pydantic request/response schemas
    │   ├── routes/                   # API route handlers (17 endpoints)
    │   │   ├── health.py
    │   │   ├── dashboard.py
    │   │   ├── projects.py           # includes POST /api/projects
    │   │   ├── alerts.py
    │   │   ├── investigations.py
    │   │   ├── analytics.py
    │   │   ├── evidence.py
    │   │   └── compliance.py
    │   ├── services/
    │   │   └── risk_service.py       # Risk analysis orchestration
    │   └── ml/                       # 6 AI/ML modules
    │       ├── financial_anomaly.py  # Isolation Forest + z-score
    │       ├── execution_risk.py     # Mismatch formula + XGBoost
    │       ├── duplicate_detection.py# TF-IDF + Haversine
    │       ├── compliance_engine.py  # 6 rule-based checks
    │       ├── evidence_risk.py      # Completeness scoring
    │       └── unified_score.py      # Weighted composite + explanations
    ├── data/
    │   └── seed.py                   # Seeds 22 fictional projects + analysis
    ├── tests/
    │   ├── conftest.py
    │   ├── test_health.py
    │   ├── test_projects.py
    │   └── test_ml.py
    ├── smoke_test.py                 # 57-test AI/ML smoke test
    ├── requirements.txt              # Python 3.14 compatible wheels
    ├── Dockerfile
    ├── docker-compose.yml
    ├── .env                          # Database URL + settings (not committed)
    ├── .env.example
    └── README.md                     # Backend-specific docs
```

---

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Login | `/login` | Demo login · 4 officer roles (MP, District Officer, State Officer, Ministry) |
| Dashboard | `/dashboard` | Live KPI cards · risk charts · top-risk table · auto-refreshes on navigation |
| Projects | `/projects` | Searchable/filterable table · **Add Project modal** · pagination |
| Project Details | `/projects/:id` | Risk profile · score breakdown · Why Flagged · Duplicate analysis · Re-analyse |
| Risk Alerts | `/alerts` | 6 alert types · severity filter · Mark Reviewed · Investigate |
| Investigation Queue | `/investigations` | Priority queue · assign officer · escalate · resolve |
| Analytics | `/analytics` | 8 charts — district risk, agency risk, progress mismatch, expenditure trends |
| Risk Map | `/risk-map` | SVG India map · project markers by risk level · click-to-view panel |
| Evidence Review | `/evidence` | Document completeness · preview modal |
| Compliance | `/compliance` | Rule-based compliance scores · expandable check details |
| Settings | `/settings` | Risk weights · thresholds · notification prefs · API URL |

---

## How to Run

### Option 1 — Frontend only (instant demo, no Python needed)

Works immediately on any machine with Node.js 18+.

```bat
cd mplads-frontend
npm install
npm run dev
```

Open **http://localhost:5173**

Click **Demo Login** → pick any role → full dashboard on synthetic demo data.
A **"Demo Data"** banner appears confirming the backend is not connected.

---

### Option 2 — Full stack (Frontend + Backend on SQLite)

Requires Python 3.11+ (tested on 3.14).

#### Terminal 1 — Backend

```bat
cd backend

:: Create virtual environment
python -m venv venv
venv\Scripts\activate

:: Install all dependencies (prebuilt wheels — no Visual C++ needed)
pip install -r requirements.txt

:: Seed SQLite database with 22 fictional projects + risk analysis
python -m data.seed

:: Start API server
python -m uvicorn app.main:app --reload --port 8000
```

- API: **http://localhost:8000**
- Swagger docs: **http://localhost:8000/docs**
- ReDoc: **http://localhost:8000/redoc**

#### Terminal 2 — Frontend

```bat
cd mplads-frontend
npm install
npm run dev
```

Open **http://localhost:5173**

The Demo Data banner disappears once the backend responds.

---

### Option 3 — Docker (PostgreSQL + Backend)

Requires Docker Desktop.

```bat
cd backend
docker-compose up --build
```

The compose file starts PostgreSQL and the backend together, runs the seed script automatically, and exposes the API on port 8000.

Then start the frontend in a separate terminal:

```bat
cd mplads-frontend
npm run dev
```

---

### Build for production

```bat
cd mplads-frontend
npm run build
:: Output in mplads-frontend/dist/
```

---

## Environment Variables

### Backend — `backend/.env`

Copy from `backend/.env.example` and fill in:

```env
# ── Database ────────────────────────────────────────────────
# Local demo (SQLite — no PostgreSQL needed):
DATABASE_URL=sqlite:///./mplads_demo.db

# Production PostgreSQL (uncomment and fill):
# DATABASE_URL=postgresql://mplads_user:mplads_password@localhost:5432/mplads_db

# ── Application ─────────────────────────────────────────────
APP_NAME=MPLADS Risk Intelligence
APP_VERSION=1.0.0
DEBUG=true
SECRET_KEY=change_this_to_a_long_random_string_in_production

# ── CORS ────────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# ── Risk score weights (must sum to 1.0) ────────────────────
WEIGHT_FINANCIAL=0.25
WEIGHT_EXECUTION=0.20
WEIGHT_DUPLICATE=0.15
WEIGHT_COMPLIANCE=0.15
WEIGHT_EVIDENCE=0.25

# ── ML thresholds ───────────────────────────────────────────
DUPLICATE_SEMANTIC_THRESHOLD=0.80
DUPLICATE_GEO_THRESHOLD_KM=5.0
MISMATCH_HIGH_THRESHOLD=30
MISMATCH_CRITICAL_THRESHOLD=50
```

### Frontend — `mplads-frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8000
```

> **Never commit `.env` files.** Both are in `.gitignore`.

---

## Running Tests

### pytest (backend unit + API tests)

```bat
cd backend
venv\Scripts\activate
pytest tests/ -v
```

Tests use an in-memory SQLite database. No PostgreSQL or backend server needed.

### AI/ML smoke test

```bat
cd backend
python smoke_test.py
```

Expected result:

```
PASS  : 57
FAIL  :  0
SKIP  :  0
Total : 57
```

Covers: Pydantic validation, Isolation Forest, progress mismatch (5 thresholds), TF-IDF duplicate detection, Haversine distance, XGBoost import, delay prediction, compliance rules, evidence scoring, unified score formula (9 cases), risk level classification (8 boundaries), explainability output, fraud-claim check, alert generation (6 types), full end-to-end pipeline.

---

## AI/ML Pipeline

```
Project record (from DB)
        │
        ├─ Financial Anomaly ──── Isolation Forest (scikit-learn, ≥10 samples)
        │                         Statistical z-score fallback (<10 samples)
        │                         Output: financial_risk  0–100
        │
        ├─ Execution Risk ──────── Mismatch formula  (financial% − physical%)
        │                          XGBoost delay prediction (rule-based fallback)
        │                          Output: execution_risk  0–100
        │
        ├─ Duplicate Detection ─── TF-IDF cosine similarity
        │                          Haversine geographical distance
        │                          Combined: 0.6×semantic + 0.4×geo
        │                          Output: duplicate_risk  0–100
        │
        ├─ Compliance Engine ───── 6 configurable rule checks
        │                          Output: compliance_risk  0–100
        │
        ├─ Evidence Risk ──────── Document completeness (5 required types)
        │                          Penalty: Missing×0.6 + Mismatch×0.3 + Pending×0.1
        │                          Output: evidence_risk   0–100
        │
        └─ Unified Score ─────────────────────────────────────────────────────
                                   score = F×0.25 + E×0.20 + D×0.15 + C×0.15 + Ev×0.25
                                   Clamped to 0–100
                                   ┌─────────────────────────────┐
                                   │  0–30   →  LOW              │
                                   │ 31–60   →  MEDIUM           │
                                   │ 61–80   →  HIGH             │
                                   │ 81–100  →  CRITICAL         │
                                   └─────────────────────────────┘
```

Weights are configurable in Settings and stored per analysis run.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/dashboard` | Dashboard KPIs + top risk projects |
| GET | `/api/projects` | List projects (search, filter, sort, paginate) |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/{id}` | Project details |
| GET | `/api/projects/{id}/risk` | Risk breakdown |
| GET | `/api/projects/{id}/duplicates` | Duplicate detection result |
| GET | `/api/projects/{id}/evidence` | Evidence records |
| GET | `/api/projects/{id}/compliance` | Compliance checks |
| POST | `/api/projects/{id}/analyze` | Run full risk analysis |
| GET | `/api/alerts` | List risk alerts |
| GET | `/api/investigations` | Investigation queue |
| POST | `/api/investigations/{id}/assign` | Assign officer |
| POST | `/api/investigations/{id}/status` | Update status |
| GET | `/api/analytics` | Analytics data |
| GET | `/api/risk-map` | Geographic risk data |
| GET | `/api/evidence` | All evidence records |
| GET | `/api/compliance` | All compliance records |

Full interactive docs at **http://localhost:8000/docs**

---

## Data Provenance

All data currently in this system is **SYNTHETIC**.

- 22 fictional MPLADS-style projects generated by `backend/data/seed.py`
- Fictional MP names — no real person is attached to any score
- Labeled `SYNTHETIC` in the codebase
- Anomalies are deliberately injected for demonstration

Future data provenance tags (roadmap Phase 2):
`OFFICIAL_IMPORT` | `SYNTHETIC` | `USER_ENTERED` | `CALCULATED` | `MODEL_OUTPUT`

Official data may only be imported via the `/api/import` endpoint (roadmap Phase 3) from CSV/XLSX exported from the official MPLADS portal. Imported rows will be labeled `OFFICIAL_IMPORT`. Synthetic and official data will never be mixed in aggregates without a visible toggle.

---

## Upgrade Roadmap (Next Phases)

Based on the master upgrade specification (MPLADS-UPGRADE-MASTER-PROMPT.md):

| Phase | Work | Status |
|-------|------|--------|
| 1 | **Audit** — `AUDIT.md` + `BUTTON_INVENTORY.md` | Pending |
| 2 | **Trust layer** — Provenance tags, offline banner, self-check endpoint (`GET /api/system/self-check`), Model Transparency page, `analysis_runs` table | Pending |
| 3 | **Data model** — MPs, constituencies, fund ledger, time-series, ground-truth table, synthetic generator (1,500–3,000 projects, 5 FYs), official importer | Pending |
| 4 | **AI engine upgrade** — Feature engineering, peer-group IF, SHAP, score ledger, evaluation metrics, What-if simulator | Pending |
| 5 | **Core UX** — Design system tokens, rebuilt Dashboard, Project Details tabs (Glass Box), real case management, Re-analyse with run history | Pending |
| 6 | **MP/Constituency/State pages** — Fund Flow Sankey, Agencies network | Pending |
| 7 | **Map v2** — d3-geo + India TopoJSON, choropleth, drill-down | Pending |
| 8 | **Reports Center** — PDF/Excel/CSV/JSON, 8 report types | Pending |
| 9 | **Game-changers** — Command palette (Ctrl+K), Investigation Brief PDF, Time machine, Scorecards | Pending |
| 10 | **Polish** — Animation (Framer Motion), i18n (English/Hindi/Tamil), WCAG AA, Playwright E2E tests | Pending |
| 11 | **Hardening** — JWT + RBAC (row-level), Docker prod config, README update, architecture diagram | Pending |

---

## How to Push to GitHub

### Step 1 — Create a .gitignore file

Create `c:\AI AVENGERS\.gitignore` with this content:

```gitignore
# Python
__pycache__/
*.py[cod]
*.pyo
venv/
.venv/
*.db
*.sqlite3
mplads_demo.db
test_mplads.db
.pytest_cache/
htmlcov/
.coverage

# Secrets — NEVER commit these
backend/.env
mplads-frontend/.env

# Node
node_modules/
mplads-frontend/dist/
mplads-frontend/.vite/

# IDE
.vscode/
.idea/
*.swp
.DS_Store
Thumbs.db

# Temp / test artifacts
backend/_trace.py
backend/_patch.py
backend/smoke_test_output.txt
```

### Step 2 — Create the GitHub repository

1. Go to **https://github.com/new**
2. Name: `mplads-risk-intelligence`
3. Visibility: **Private** (recommended — contains government-style data)
4. Leave "Add README" **unchecked** (we already have one)
5. Click **Create repository**
6. Copy the URL shown: `https://github.com/YOUR_USERNAME/mplads-risk-intelligence.git`

### Step 3 — Initialize and push

Run from `c:\AI AVENGERS\`:

```bat
:: Initialize repository
git init

:: Set identity (first time only on this machine)
git config user.name "Your Name"
git config user.email "your@email.com"

:: Stage everything
git add .

:: Check what will be committed (make sure .env files are NOT listed)
git status

:: First commit
git commit -m "feat: MPLADS Risk Intelligence v1.0 - SIH 2026

- React frontend: 11 pages, demo fallback, Add Project modal, live dashboard refresh
- FastAPI backend: 17 endpoints, SQLite/PostgreSQL, Docker support
- AI/ML: Isolation Forest, XGBoost, TF-IDF duplicate detection, compliance engine
- Unified risk score: F*0.25 + E*0.20 + D*0.15 + C*0.15 + Ev*0.25
- 22 fictional seed projects with full risk analysis pipeline
- 57 AI/ML smoke tests: 57 PASS, 0 FAIL, 0 SKIP
- Problem: SIH26102 | Theme: Smart Automation | Team: AI Avengers"

:: Connect to GitHub (replace with your actual URL)
git remote add origin https://github.com/YOUR_USERNAME/mplads-risk-intelligence.git

:: Push
git branch -M main
git push -u origin main
```

### Step 4 — Verify

1. Refresh the GitHub page — all folders should appear
2. Confirm `.env` files are **absent** from GitHub
3. Check `README.md` renders correctly on the repo homepage

### Future commits

```bat
git add .
git commit -m "describe your change"
git push
```

---

## Known Limitations

1. **Map is SVG only** — not a real geographic map. Upgrade to d3-geo + India TopoJSON is in the roadmap.
2. **XGBoost delay model** — the library is installed and importable, but no pre-trained model file exists. Rule-based fallback is used instead. The smoke test confirms this is by design.
3. **Sentence Transformers not installed** — TF-IDF is the active duplicate detection tier. Sentence Transformers would improve semantic quality but requires a model download (~90 MB).
4. **Demo login only** — no JWT authentication or row-level RBAC. Roadmap Phase 10.
5. **No reports/downloads yet** — PDF, Excel, and CSV export are roadmap Phase 8.
6. **No official data import** — only synthetic data. Roadmap Phase 3.
7. **Static "verified" labels** — some UI badges say "Verified" without a real runtime check behind them. These will be replaced with a self-check-driven status system in Phase 2.

---

## Team

**AI Avengers**
SIH 2026 · Problem Statement SIH26102 · Theme: Smart Automation · Category: Software
 