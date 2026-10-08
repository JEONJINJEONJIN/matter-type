@echo off
setlocal
title Matter Type - Local Server
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js LTS from https://nodejs.org/
  echo Then double-click START.cmd again.
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js LTS, then try again.
  pause
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo Installing dependencies for the first launch...
  call npm.cmd install
  if errorlevel 1 (
    echo Installation failed. Check the error above and your internet connection.
    pause
    exit /b 1
  )
)

echo Starting Matter Type. Your browser will open automatically.
echo Keep this window open while using the app.
echo To stop: press Ctrl+C, or close this window.
echo.
call npm.cmd run dev -- --open
if errorlevel 1 (
  echo The server could not start. See the error above.
  pause
  exit /b 1
)
endlocal
