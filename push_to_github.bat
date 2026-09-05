@echo off
title [SIH 2026] Git Push to GitHub
color 0B
cls
echo ============================================================
echo   Pushing Crypto Fraud Attribution System to GitHub
echo   Repository: https://github.com/Harish-V-26/crypto-fraud-attribution-sih2026.git
echo ============================================================
echo.
cd /d %~dp0
git branch -M main
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ============================================================
    echo   SUCCESS! All code has been pushed to GitHub.
    echo ============================================================
) else (
    echo ============================================================
    echo   If prompted for password, please use your GitHub Personal
    echo   Access Token (PAT) or authenticate in your browser window.
    echo ============================================================
)
echo.
pause
