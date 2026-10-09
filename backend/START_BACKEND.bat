@echo off
cd /d "c:\AI AVENGERS\backend"
echo Setting up backend...
if not exist venv python -m venv venv
venv\Scripts\pip install -r requirements.txt -q
venv\Scripts\python -m data.seed
echo Backend ready. Starting server...
venv\Scripts\python -m uvicorn app.main:app --reload
