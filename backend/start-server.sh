#!/bin/bash
set -e
cd "$(dirname "$0")"
echo "Starting API on port ${PORT:-3002}..."
npm start
