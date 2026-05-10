#!/bin/bash
# Start WhatsFresh - Full Stack Local

echo "🍽️  Starting WhatsFresh..."
echo ""

# Kill any existing processes
echo "Cleaning up old processes..."
taskkill /F /IM node.exe 2>/dev/null || true
sleep 2

# Start Backend API
echo "Starting Backend API on http://localhost:4000..."
cd /c/Users/arger/code/whatsforlunch/services/local-mock
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 5
if curl -s http://localhost:4000/health > /dev/null 2>&1; then
  echo "✓ Backend API: http://localhost:4000 (RUNNING)"
else
  echo "✗ Backend failed to start. Check /tmp/backend.log"
  tail -20 /tmp/backend.log
  exit 1
fi

# Start Web Server
echo ""
echo "Starting Web Server on http://localhost:8000..."
cd /c/Users/arger/code/whatsforlunch
python -m http.server 8000 > /tmp/server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
sleep 2

if curl -s http://localhost:8000/app.html > /dev/null 2>&1; then
  echo "✓ Web Server: http://localhost:8000 (RUNNING)"
else
  echo "✗ Web Server failed to start"
  exit 1
fi

# Seed data
echo ""
echo "Seeding sample data..."
bash seed-data.sh 2>&1 | grep "✓"

echo ""
echo "=========================================="
echo "✅ READY TO TEST"
echo "=========================================="
echo ""
echo "🌐 OPEN IN BROWSER:"
echo "   http://localhost:8000/app.html"
echo ""
echo "📱 SIGN IN WITH:"
echo "   demo@whatsfresh.app"
echo ""
echo "📊 BACKEND:"
echo "   GraphQL: http://localhost:4000/graphql"
echo "   Health:  http://localhost:4000/health"
echo ""
echo "💻 OPEN CONSOLE: F12 to see real API logs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep running
wait
