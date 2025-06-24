#!/bin/bash

echo "🚀 Starting Accelo API Dashboard..."
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if .env exists, if not copy from example
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "📋 Creating .env file from .env.example..."
    cp .env.example .env
    echo ""
fi

# Start the server
echo "🌐 Starting server on http://localhost:8080"
echo "📊 Dashboard: http://localhost:8080"
echo "⚙️  Settings: http://localhost:8080/settings"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================="
echo ""

npm start