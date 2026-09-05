@echo off
title [SIH 2026] Backend Live Telemetry Terminal
color 0A
cls
echo ============================================================
echo   [SIH 2026] Crypto Fraud Attribution — Backend Live Terminal
echo   Streaming all web requests, traces, ML scores, and telemetry
echo ============================================================
echo.
cd /d %~dp0backend
set PYTHONUNBUFFERED=1
set PYTHONIOENCODING=utf-8
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
