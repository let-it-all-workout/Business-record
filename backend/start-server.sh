#!/bin/bash
# Helper script to start the server cleanly

# Kill any existing server processes
echo "Checking for existing server processes..."
pkill -f "node.*backend/index.js" 2>/dev/null
pkill -f "npm.*server" 2>/dev/null
sleep 1

# Kill any process on port 3001
if lsof -ti:3001 > /dev/null 2>&1; then
  echo "Port 3001 is in use. Killing existing process..."
  lsof -ti:3001 | xargs kill -9 2>/dev/null
  sleep 1
fi

# Start the server
echo "Starting server on port 3001..."
npm run server


