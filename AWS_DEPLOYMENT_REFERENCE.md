# AWS Deployment Guide - StratDyn Experiment

## Overview
This guide documents the deployment process for the StratDyn strategic decision-making experiment to AWS EC2.

## Prerequisites
- SSH private key: `~/.ssh/career-game.pem`
- AWS server: `game.code-lab.org` (Public IP: `54.196.227.82`)
- Docker and docker-compose installed on AWS server
- Git repository access

## Quick Deployment Commands

### 1. Check Current Status
```bash
# Check what's currently deployed
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "cd stratdyn && git log --oneline -3"
```

### 2. Deploy Latest Changes
```bash
# Pull latest changes from fork
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "cd stratdyn && git pull myfork feature/ui-intention-finalchoice"

# Stop containers
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "cd stratdyn && docker-compose down"

# Start containers (rebuilds automatically)
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "cd stratdyn && docker-compose up -d"
```

### 3. Verify Deployment
```bash
# Check containers are running
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "cd stratdyn && docker-compose ps"

# Check application logs
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "cd stratdyn && docker-compose logs -f --tail=20 stratdyn"

# Test application accessibility
curl -s -o /dev/null -w "%{http_code}" https://game.code-lab.org/
```

## Detailed Deployment Process

### Step 1: Local Preparation
```bash
# Ensure all changes are committed and pushed to fork
cd /home/mzarreh/projects2/stratdyn
git add -A
git commit -m "Deployment commit message"
git push myfork feature/ui-intention-finalchoice
```

### Step 2: Connect to AWS Server
```bash
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org
```

### Step 3: Update Code on Server
```bash
cd stratdyn
git pull myfork feature/ui-intention-finalchoice
```

### Step 4: Deploy with Docker
```bash
# Stop existing containers
docker-compose down

# Start new containers (uses cached images if no changes)
docker-compose up -d

# If you need to force rebuild (rare)
# docker-compose up --build -d
```

### Step 5: Verify Deployment Success
```bash
# Check container status
docker-compose ps

# Check application is responding
curl -I https://game.code-lab.org/

# Monitor logs for any errors
docker-compose logs -f stratdyn
```

## Troubleshooting

### Common Issues

#### 1. SSH Connection Issues
```bash
# Check SSH key permissions
ls -la ~/.ssh/career-game.pem
# Should be: -rw------- 1 user user 1679 date career-game.pem

# Fix permissions if needed
chmod 400 ~/.ssh/career-game.pem

# Alternative connection methods:
# Via domain: ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org
# Via IP:     ssh -i ~/.ssh/career-game.pem ec2-user@54.196.227.82
```

#### 2. Git Pull Issues
```bash
# If pull fails, check current branch
git branch -v

# Ensure on correct branch
git checkout feature/ui-intention-finalchoice

# Force pull if needed (CAUTION: loses local changes)
git reset --hard myfork/feature/ui-intention-finalchoice
```

#### 3. Docker Issues
```bash
# Check Docker is running
docker --version
docker-compose --version

# Clean up if containers fail to start
docker-compose down
docker system prune -f
docker-compose up -d
```

#### 4. Application Not Responding
```bash
# Check container logs
docker-compose logs stratdyn

# Check if port 3000 is bound
netstat -tlnp | grep 3000

# Restart application
docker-compose restart stratdyn
```

### Log Analysis
```bash
# View recent application logs
docker-compose logs --tail=50 stratdyn

# Follow logs in real-time
docker-compose logs -f stratdyn

# Check for specific errors
docker-compose logs stratdyn | grep -i error
```

## Key Files and Directories

### Local Development
- `/home/mzarreh/projects2/stratdyn/` - Main project directory
- `stratdyn.js` - Main application server
- `test_zero_values.js` - Validation tests for 0 value handling
- `docker-compose.yml` - Local development setup

### AWS Server
- `/home/ec2-user/stratdyn/` - Deployment directory
- `logs/` - Application log files
- `data/` - Experiment data and configurations

## Recent Fixes Deployed

### Commit: 989bc9d6 - "Fix systematic 0 value handling"
- **Intentions**: Values of `0` now log correctly (not as empty strings)
- **Difficulty percentiles**: `0%` values preserved in `uiIndividualDifficulty` and `uiPairedDifficulty`
- **Score calculations**: Tasks earning 0 points included in totals
- **CSV integrity**: All legitimate `0` values maintained in exports

### Testing After Deployment
1. Access https://game.code-lab.org/
2. Have participants complete tasks
3. Verify CSV exports contain `0` values where expected
4. Check that user01's tasks 1-4 show `0` in difficulty columns

## Emergency Rollback

```bash
# Connect to server
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org

# Rollback to previous commit
cd stratdyn
git log --oneline -5  # Find previous working commit
git reset --hard <commit-hash>

# Redeploy
docker-compose down
docker-compose up -d
```

## Monitoring and Maintenance

### Regular Checks
```bash
# Daily health check
curl -f https://game.code-lab.org/ > /dev/null && echo "OK" || echo "FAIL"

# Check disk space
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "df -h"

# Check application uptime
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "docker-compose ps"
```

### Log Rotation
```bash
# View log sizes
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "ls -lh stratdyn/logs/"

# Clean old logs if needed
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "find stratdyn/logs/ -name '*.log' -mtime +30 -delete"
```

## Contact Information
- **Developer**: Mobin Zarreh
- **Project**: StratDyn Strategic Decision Making Experiment
- **Supervisor**: Dr. Grogan
- **Institution**: Code Lab, University Research
- **AWS Server**: game.code-lab.org (54.196.227.82)

---

*Last updated: January 9, 2026*
*Document version: 1.0*</content>
<parameter name="filePath">/home/mzarreh/projects2/stratdyn/AWS_DEPLOYMENT_REFERENCE.md