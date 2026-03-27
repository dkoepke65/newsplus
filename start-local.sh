#!/bin/bash
# Start Newsplus Locally

echo "🚀 Starting Newsplus locally..."

# Kill any existing node processes on ports 3002 and 5173
lsof -ti:3002 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Start backend
echo "📡 Starting backend on http://localhost:3002"
cd /Users/dkoepke/.openclaw/workspace/newsplus/backend
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
echo "🖥️  Starting frontend on http://localhost:5173"
cd /Users/dkoepke/.openclaw/workspace/newsplus/frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Newsplus is running!"
echo "   Backend:  http://localhost:3002"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID