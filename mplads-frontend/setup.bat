@echo off
:: ============================================================
:: MPLADS Risk Intelligence — Frontend Setup Script (Windows)
:: ============================================================

echo.
echo  MPLADS Risk Intelligence — Frontend Setup
echo  ==========================================

:: Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found.
    echo         Download from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js found.

:: Install
if not exist "node_modules" (
    echo [..] Installing npm dependencies...
    npm install --legacy-peer-deps
    echo [OK] Dependencies installed.
) else (
    echo [OK] node_modules already exists.
)

:: Start dev server
echo.
echo  Starting frontend on http://localhost:5173
echo  (Backend demo fallback active if FastAPI is not running)
echo.
npm run dev
