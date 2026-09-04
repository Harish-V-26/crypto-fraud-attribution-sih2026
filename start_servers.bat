@echo off
echo ============================================================
echo   Crypto Fraud Attribution System — SIH 2026  v2.0
echo ============================================================
echo.

echo [1/2] Starting FastAPI backend (port 8000)...
start "FastAPI Backend" cmd /k "cd /d %~dp0backend && pip install -q -r requirements.txt && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak > nul

echo [2/2] Starting React frontend (port 5173)...
start "React Frontend" cmd /k "cd /d %~dp0frontend-react && npm run dev"

echo.
echo ============================================================
echo   Dashboard:    http://localhost:5173
echo   API Docs:     http://localhost:8000/docs
echo   Old frontend: Open frontend\index.html directly
echo ============================================================
echo.
echo Both servers are starting. Press any key to exit this window.
pause > nul
