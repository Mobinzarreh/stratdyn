#!/bin/bash

# Manual Deployment Instructions for StratDyn
# Use this if automated deployment fails

echo "========================================="
echo "Manual Deployment Instructions"
echo "========================================="
echo ""
echo "Step 1: Connect to AWS Server"
echo "--------------------------------"
echo "Run this command:"
echo "  ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org"
echo ""
echo "If connection fails, verify:"
echo "  - Your SSH key exists at ~/.ssh/career-game.pem"
echo "  - Key has correct permissions: chmod 400 ~/.ssh/career-game.pem"
echo "  - The server is running and accessible"
echo ""
echo "Step 2: Once Connected, Run These Commands"
echo "-------------------------------------------"
cat << 'COMMANDS'
# Navigate to the deployment directory
cd ~/stratdyn

# Pull latest changes
git fetch --all
git checkout feature/ui-intention-finalchoice
git pull origin feature/ui-intention-finalchoice

# Build Docker image (separately, not with --build flag)
docker build -t stratdyn-app:latest .

# Stop containers
docker-compose down

# Start containers
docker-compose up -d

# Wait for startup
sleep 5

# Check if containers are running
docker ps

# View logs to verify everything loaded correctly
docker logs stratdyn-app --tail=30

# Look for this line in the logs:
# "Loaded task schedule: 30 tasks"
COMMANDS

echo ""
echo "Step 3: Verify Deployment"
echo "-------------------------"
echo "1. Check the logs above for 'Loaded task schedule: 30 tasks'"
echo "2. Open https://game.code-lab.org in your browser"
echo "3. Press Ctrl+Shift+R to hard refresh and clear cache"
echo "4. Login as user01 or user03 to test"
echo ""
echo "Step 4: Monitor Live Logs (Optional)"
echo "-------------------------------------"
echo "To see real-time logs:"
echo "  docker logs -f stratdyn-app"
echo ""
echo "Press Ctrl+C to exit the logs"
echo ""
echo "========================================="
echo "Troubleshooting"
echo "========================================="
echo ""
echo "If containers won't start:"
echo "  docker logs stratdyn-app --tail=100"
echo ""
echo "If buildx error occurs:"
echo "  Build separately (already shown above)"
echo "  Do NOT use: docker-compose up -d --build"
echo ""
echo "If port conflicts occur:"
echo "  docker-compose down"
echo "  docker ps -a"
echo "  docker rm -f stratdyn-app"
echo ""
echo "To clear logs from container:"
echo "  docker exec stratdyn-app rm -f /app/logs/*.csv"
echo ""
echo "========================================="
echo "Quick One-Liner Deployment"
echo "========================================="
echo ""
echo "From your local machine (recommended):"
echo ""
echo "ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org \\"
echo "  'cd ~/stratdyn && \\"
echo "   git pull origin feature/ui-intention-finalchoice && \\"
echo "   docker build -t stratdyn-app:latest . && \\"
echo "   docker-compose down && \\"
echo "   docker-compose up -d'"
echo ""
