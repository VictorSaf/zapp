#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/frontend"
npm run dev > frontend-dev.log 2>&1 &
echo "Frontend started in background with PID $!"
sleep 5
echo "Checking if service is running..."
curl -s http://localhost:5173/ > /dev/null && echo "✅ Frontend is running at http://localhost:5173" || echo "❌ Frontend not responding"
echo "Check frontend-dev.log for details"
