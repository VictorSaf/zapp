#!/bin/bash
cd /Users/victorsafta/work/z_app/frontend
npm run dev > frontend-dev.log 2>&1 &
echo "Frontend started in background with PID $!"
sleep 5
echo "Checking if service is running..."
curl -s http://localhost:5173/ > /dev/null && echo "✅ Frontend is running at http://localhost:5173" || echo "❌ Frontend not responding"
echo "Check frontend-dev.log for details"