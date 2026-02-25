#!/bin/bash

echo "================================"
echo "InsightShield Quick Launch"
echo "================================"
echo ""

# Check if node_modules exist
if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo "Starting Backend Server..."
cd backend
node server.js > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

sleep 3

echo "Starting Frontend Server..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

sleep 5

echo ""
echo "================================"
echo "✅ InsightShield is running!"
echo "================================"
echo ""
echo "Backend:  http://localhost:5000 (PID: $BACKEND_PID)"
echo "Frontend: http://localhost:5173 (PID: $FRONTEND_PID)"
echo ""
echo "Test Accounts:"
echo "  Mentor:  sarah@insight.com / password123"
echo "  Student: daksh@insight.com / password123"
echo ""
echo "Logs:"
echo "  Backend:  tail -f backend.log"
echo "  Frontend: tail -f frontend.log"
echo ""
echo "To stop servers:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Try to open browser
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:5173
elif command -v open > /dev/null; then
    open http://localhost:5173
else
    echo "Please open http://localhost:5173 in your browser"
fi

echo "Press Ctrl+C when done (servers will continue running)"
echo ""

# Keep script running
tail -f frontend.log
