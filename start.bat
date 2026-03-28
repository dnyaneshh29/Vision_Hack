@echo off
echo.
echo   NeuroFlow
echo   Starting backend + frontend...
echo.

:: Start backend in new window
start "NeuroFlow Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

:: Start frontend in new window
start "NeuroFlow Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 4 /nobreak >nul

echo   Backend  -^>  http://localhost:8000
echo   API Docs -^>  http://localhost:8000/docs
echo   Frontend -^>  http://localhost:5173
echo.
echo   Both servers running in separate windows.
echo   Close those windows to stop.
echo.
pause
