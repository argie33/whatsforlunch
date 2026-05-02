#!/bin/bash
# Start WhatsFresh - Full Stack

echo "🎉 Starting WhatsFresh..."
echo ""

# Kill any existing processes
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "http.server" 2>/dev/null || true
sleep 2

# Start Backend
echo "▶ Backend API..."
cd services/local-mock
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
sleep 5

if curl -s http://localhost:4000/health > /dev/null; then
  echo "✓ Backend running (PID: $BACKEND_PID)"
else
  echo "✗ Backend failed. Check /tmp/backend.log"
  exit 1
fi

# Start Web Server
echo "▶ Web Server..."
cd ../..
python -m http.server 8000 > /tmp/server.log 2>&1 &
SERVER_PID=$!
sleep 2

if curl -s http://localhost:8000/app.html > /dev/null; then
  echo "✓ Web server running (PID: $SERVER_PID)"
else
  echo "✗ Web server failed"
  exit 1
fi

# Seed data
echo "▶ Seeding data..."
bash seed-data.sh 2>&1 | grep "✓"

echo ""
echo "=========================================="
echo "✅ WhatsFresh is READY"
echo "=========================================="
echo ""
echo "🌐 OPEN: http://localhost:8000/app.html"
echo "📱 SIGN IN: demo@whatsfresh.app"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep running
wait
