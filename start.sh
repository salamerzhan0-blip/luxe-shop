#!/bin/bash
# Run this script to install dependencies and start the backend
set -e

echo "📦 Installing Go dependencies..."
cd "$(dirname "$0")/backend"
go mod tidy
go mod download

echo "🚀 Starting backend server on http://localhost:8080"
go run main.go
