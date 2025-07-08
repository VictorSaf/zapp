#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend/api-service"
npm run dev > api-service.log 2>&1 &
echo "API Service started in background with PID $!"
sleep 5
echo "Checking if service is running..."
curl -s http://localhost:3000/health || echo "Service not ready yet"
