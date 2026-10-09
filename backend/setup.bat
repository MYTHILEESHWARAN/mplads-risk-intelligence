@echo off
:: ============================================================
:: MPLADS Risk Intelligence — Backend Setup Script (Windows)
:: Run this from the backend\ directory after installing Python 3.11+
:: ============================================================

echo.
echo  MPLADS Risk Intelligence — Backend Setup
echo  ==========================================

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found.
    echo         Download Python 3.11+ from https://www.python.org/downloads/
    echo         Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

echo [OK] Python found.

:: Create virtual environment
if not exist "venv" (
    echo [..] Creating virtual environment...
    python -m venv venv
    echo [OK] Virtual environment created.
) else (
    echo [OK] Virtual environment already exists.
)

:: Activate and install
echo [..] Installing dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet

if %errorlevel% neq 0 (
    echo [ERROR] pip install failed. Check requirements.txt and your internet connection.
    pause
    exit /b 1
)
echo [OK] Dependencies installed.

:: Seed database
echo [..] Seeding database...
python -m data.seed

if %errorlevel% neq 0 (
    echo [WARN] Seed script failed (this is OK if DB is already seeded).
)
echo [OK] Database ready.

:: Start server
echo.
echo  Starting FastAPI server on http://localhost:8000
echo  API docs available at http://localhost:8000/docs
echo.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
