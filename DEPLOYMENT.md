# Deployment Guide

## Prerequisites
- SSH access to AWS server: `ec2-user@game.code-lab.org`
- Private key file: `~/.ssh/career-game.pem`
- Git repository access to push to myfork

## Quick Deployment (Standard Workflow)

### 1. Commit and push changes locally:
```bash
cd /path/to/stratdyn
git add .
git commit -m "Description of changes"
git push myfork feature/ui-intention-finalchoice
```

### 2. Deploy to AWS (one command):
```bash
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org \
  'cd ~/stratdyn && \
   git pull origin feature/ui-intention-finalchoice && \
   docker build -t stratdyn-app:latest . && \
   docker-compose down && \
   docker-compose up -d'
```

**Note**: Build Docker image separately (not with `--build` flag) due to buildx version on server.

### 3. Verify deployment:
```bash
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org \
  'docker ps && docker logs stratdyn-app --tail=20'
```

Look for:
- ✅ `stratdyn-app` container status: "Up X seconds"
- ✅ Log shows: "Loaded task schedule: 30 tasks"
- ✅ Application URL: https://game.code-lab.org

## Step-by-Step Deployment (First Time)

### 1. Setup SSH key (one-time):
```bash
# Verify key exists and has correct permissions
ls -la ~/.ssh/career-game.pem
chmod 400 ~/.ssh/career-game.pem  # If needed
```

### 2. Initial server setup (one-time):
```bash
# SSH to server
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org

# Clone repository
git clone https://github.com/Mobinzarreh/stratdyn.git ~/stratdyn
cd ~/stratdyn
git checkout feature/ui-intention-finalchoice

# Create directories
mkdir -p logs data
```

### 3. Deploy application:
```bash
# Build Docker image
docker build -t stratdyn-app:latest .

# Start containers
docker-compose up -d

# Verify
docker ps
docker logs stratdyn-app --tail=30
```

## Updating the Application

Whenever you make changes:

```bash
# Local machine: commit and push
git add .
git commit -m "Your changes"
git push myfork feature/ui-intention-finalchoice

# Deploy to AWS server (remote command)
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org \
  'cd ~/stratdyn && \
   git pull origin feature/ui-intention-finalchoice && \
   docker build -t stratdyn-app:latest . && \
   docker-compose down && \
   docker-compose up -d'
```

## Useful Docker Commands

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View logs (live stream)
docker logs -f stratdyn-app

# View logs (last 50 lines)
docker logs stratdyn-app --tail=50

# Stop containers
docker-compose down

# Restart containers (without rebuild)
docker-compose restart

# Rebuild image and restart (if buildx available)
docker-compose up -d --build

# Rebuild image separately (current working method)
docker build -t stratdyn-app:latest .
docker-compose down
docker-compose up -d

# Remove old images to free space
docker image prune -a

# Access container shell (for debugging)
docker exec -it stratdyn-app sh

# Clear logs from container
docker exec stratdyn-app rm -f /app/logs/*.csv
```

## Data Persistence

- CSV logs are stored in `./logs` directory (mounted to container)
- Experiment data in `./data` directory (mounted to container)
- Both directories persist across container restarts
- Data survives `docker-compose down` but NOT `docker-compose down --volumes`

## Architecture

The application runs with two Docker containers:
1. **stratdyn-app**: Node.js application (port 3000)
2. **stratdyn-reverse-proxy**: Traefik reverse proxy (ports 80, 443)

Traefik provides:
- HTTPS with automatic SSL certificates
- Routes `game.code-lab.org` to the application
- Secure external access

## Troubleshooting

### "compose build requires buildx 0.17 or later"
**Solution**: Build image separately instead of using `--build` flag:
```bash
docker build -t stratdyn-app:latest .
docker-compose up -d
```

### Container won't start:
```bash
# Check logs for errors
docker logs stratdyn-app --tail=100

# Check container status
docker ps -a
```

### Permission issues with logs:
```bash
# On host machine
chmod -R 777 logs/
```

### Port already in use:
```bash
# Check what's using the port
docker ps -a

# Stop all containers
docker-compose down

# Remove stuck containers
docker rm -f stratdyn-app
```

### Changes not appearing after deployment:
1. Hard refresh browser: `Ctrl+Shift+R` (clears cache)
2. Verify correct files deployed:
   ```bash
   ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org \
     'docker exec stratdyn-app ls -la /app/public/'
   ```
3. Check container was actually rebuilt:
   ```bash
   docker ps  # Check "Created" timestamp
   ```

## Security Notes

- Keep your private SSH key secure (treat it like a password)
- Don't commit the private key to Git
- Don't commit real experiment data to public repositories
- Use `.gitignore` to exclude sensitive files
