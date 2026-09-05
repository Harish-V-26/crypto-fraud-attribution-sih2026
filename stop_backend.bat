@echo off
title Stop Backend Server
cls
echo Stopping FastAPI Backend on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Terminating Process PID %%a...
    taskkill /F /T /PID %%a >nul 2>&1
)
echo Backend stopped successfully.
pause
