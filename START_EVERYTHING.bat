@echo off
echo ================================================
echo   MPLADS Risk Intelligence - Launcher
echo ================================================
echo.
echo Step 1: Opening browser...
start "" "http://localhost:5173/login"
echo.
echo Step 2: Starting frontend...
start "Frontend" cmd /k "cd /d "c:\AI AVENGERS\mplads-frontend" && npm run dev"
echo.
echo Step 3: Starting backend...
start "Backend" cmd /k "cd /d "c:\AI AVENGERS\backend" && START_BACKEND.bat"
echo.
echo Both windows launched. Frontend is immediate.
echo Backend takes 2-3 min on first run (installing packages).
pause
