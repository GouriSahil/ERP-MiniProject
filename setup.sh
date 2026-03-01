#!/bin/bash

# ERP Mini Project Setup Script for Bun

set -e

echo "🚀 Setting up ERP Mini Project..."
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed."
    echo "   Install it from: https://bun.sh"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker"
    exit 1
fi

echo "✅ All prerequisites are installed"
echo ""

# Install dependencies with Bun
echo "📦 Installing dependencies with Bun..."
bun install
echo "✅ Dependencies installed"
echo ""

# Start MongoDB
echo "🐳 Starting MongoDB in Docker..."
docker-compose up -d
echo "✅ MongoDB started"
echo ""

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to be ready..."
sleep 5

# Check MongoDB connection
echo "🔍 Checking MongoDB connection..."
if docker exec erp-mongodb mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "✅ MongoDB is ready"
else
    echo "⚠️  MongoDB may not be fully ready yet. Check with: docker-compose logs -f"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the development servers, run:"
echo "  bun run dev"
echo ""
echo "Services:"
echo "  Frontend:  http://localhost:4200"
echo "  Backend:   http://localhost:3000"
echo "  Mongo UI:  http://localhost:8081 (admin/admin123)"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop MongoDB:"
echo "  docker-compose down"
echo ""
echo "Other useful commands:"
echo "  bun run dev:api      # Start backend only"
echo "  bun run dev:frontend # Start frontend only"
echo "  bun run build        # Build all packages"
echo "  bun run clean        # Clean node_modules"
