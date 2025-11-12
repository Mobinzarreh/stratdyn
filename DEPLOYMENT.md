# Deployment Guide

## Prerequisites
- Docker installed on your local machine (for testing)
- SSH access to AWS server: `ec2-user@game.code-lab.org`
- Private key file provided by Dr. Grogan

## Local Testing

### 1. Build and run with Docker Compose:
```bash
docker-compose up --build
```

### 2. Test the application:
- Open browser: http://localhost:3000
- Verify the experiment interface loads correctly
- Test with multiple browser windows to simulate paired participants

### 3. Stop the containers:
```bash
docker-compose down
```

## AWS Deployment

### 1. Connect to AWS server via SSH:
```bash
ssh -i /path/to/private-key.pem ec2-user@game.code-lab.org
```

Or use VS Code Remote-SSH:
- Install "Remote - SSH" extension
- Add SSH host: `ec2-user@game.code-lab.org`
- Configure to use your private key

### 2. Clone your repository on the server:
```bash
git clone https://github.com/Mobinzarreh/stratdyn.git
cd stratdyn
git checkout feature/ui-intention-finalchoice
```

### 3. Create logs directory:
```bash
mkdir -p logs
```

### 4. Build and run with Docker Compose:
```bash
docker-compose up -d --build
```

The `-d` flag runs containers in the background (detached mode).

### 5. Check logs:
```bash
docker-compose logs -f stratdyn
```

Press Ctrl+C to exit logs view.

### 6. Verify it's running:
```bash
docker ps
```

You should see the `stratdyn-app` container running.

## Updating the Application

When you push changes to GitHub:

```bash
# On AWS server
cd stratdyn
git pull origin feature/ui-intention-finalchoice
docker-compose down
docker-compose up -d --build
```

## Useful Docker Commands

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Remove old images to free space
docker image prune -a

# Access container shell (for debugging)
docker exec -it stratdyn-app sh
```

## Data Persistence

- CSV logs are stored in `./logs` directory (persisted on host)
- Experiment data in `./data` directory (persisted on host)
- Both survive container restarts

## Traefik Integration (Later)

Dr. Grogan mentioned using Traefik as a reverse proxy. This will:
- Enable HTTPS with automatic SSL certificates
- Route `game.code-lab.org` to your container
- Handle multiple applications on the same server

This will be configured after basic deployment is working.

## Troubleshooting

### Port already in use:
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
```

### Container won't start:
```bash
# Check logs
docker-compose logs stratdyn
```

### Permission issues with logs:
```bash
# On host machine
chmod -R 777 logs/
```

## Security Notes

- Keep your private SSH key secure (treat it like a password)
- Don't commit the private key to Git
- Don't commit real experiment data to public repositories
- Use `.gitignore` to exclude sensitive files
