#!/bin/bash

# Deployment Script for StratDyn Experiment
# Deploys to AWS server: game.code-lab.org

set -e  # Exit on any error

echo "========================================="
echo "StratDyn Deployment Script"
echo "========================================="
echo ""

# Configuration
SSH_KEY="~/.ssh/career-game.pem"
SSH_HOST="ec2-user@game.code-lab.org"
BRANCH="feature/ui-intention-finalchoice"
DEPLOY_DIR="stratdyn"

echo "📡 Connecting to AWS server: $SSH_HOST"
echo "📂 Branch: $BRANCH"
echo ""

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found at: $SSH_KEY"
    echo "   Please ensure your SSH key is configured"
    exit 1
fi

echo "✅ SSH key found"
echo ""

# Deploy commands
echo "🚀 Starting deployment..."
echo ""

ssh -i "$SSH_KEY" "$SSH_HOST" << 'EOF'
set -e

echo "📂 Navigating to deployment directory..."
cd ~/stratdyn

echo "📥 Pulling latest changes..."
git fetch --all
git checkout feature/ui-intention-finalchoice
git pull origin feature/ui-intention-finalchoice

echo "📊 Ensuring directories exist..."
mkdir -p logs
mkdir -p data

echo "🔨 Building Docker image..."
docker build -t stratdyn-app:latest .

echo "🐳 Stopping existing containers..."
docker-compose down

echo "🚀 Starting containers..."
docker-compose up -d

echo "⏳ Waiting for containers to start..."
sleep 5

echo "✅ Checking container status..."
docker ps | grep stratdyn || echo "⚠️  Warning: Container may not be running"

echo ""
echo "📋 Recent logs:"
docker logs stratdyn-app --tail=20

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""
echo "Application URL: https://game.code-lab.org"
echo ""
echo "To view live logs, run:"
echo "  ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org"
echo "  docker logs -f stratdyn-app"
echo ""
EOF

echo ""
echo "🎉 Deployment finished successfully!"
echo ""
