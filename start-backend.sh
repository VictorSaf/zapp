#!/bin/bash

echo "Starting ZAEUS Backend Services..."

# Start API Service
echo "Starting API Service on port 3000..."
cd backend/api-service
npm run dev &
API_PID=$!

# Start AI Orchestrator
echo "Starting AI Orchestrator on port 3001..."
cd ../ai-orchestrator
npm run dev &
AI_PID=$!

echo "Backend services started!"
echo "API Service PID: $API_PID"
echo "AI Orchestrator PID: $AI_PID"

# Wait for both processes
wait $API_PID $AI_PID