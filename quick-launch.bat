@echo off
echo ================================
echo InsightShield Quick Launch
echo ================================
echo.
echo Starting Backend Server...
start "InsightShield Backend" cmd /k "cd backend && node server.js"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "InsightShield Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo ================================
echo Opening Browser...
echo ================================
start http://localhost:5173

echo.
echo ✅ InsightShield is launching!
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Test Accounts:
echo   Mentor:  sarah@insight.com / password123
echo   Student: daksh@insight.com / password123
echo.
echo Keep the backend and frontend windows open!
echo Press any key to exit this window...
pause >nul
