# AWS Deployment - Quick Guide for Mobin

## 🎯 What We Just Did

I've set up your application for Docker deployment to AWS. Here's what was created:

✅ **Dockerfile** - Instructions to build your app container  
✅ **docker-compose.yml** - Orchestrates running your container  
✅ **.dockerignore** - Excludes unnecessary files from Docker  
✅ **.env.example** - Template for environment variables  
✅ **DEPLOYMENT.md** - Complete deployment guide (detailed reference)  
✅ Updated **.gitignore** - Protects sensitive files  

## 📋 Prerequisites

- ✅ You have: SSH private key from Dr. Grogan
- ✅ You have: AWS server at `game.code-lab.org`
- ✅ Server has: Docker and docker-compose installed (Dr. Grogan did this)

## 🚀 Step-by-Step Deployment

### Step 1: Push Your Code to GitHub

```bash
git push myfork feature/ui-intention-finalchoice
```

### Step 2: Set Up Private Key (One-Time Setup)

Save the private key Dr. Grogan gave you:
```bash
# Create a safe place for it
mkdir -p ~/.ssh
mv /path/to/downloaded/key.pem ~/.ssh/aws-game-codelab.pem

# Set correct permissions (IMPORTANT!)
chmod 400 ~/.ssh/aws-game-codelab.pem
```

### Step 3: Connect via VS Code Remote-SSH (RECOMMENDED!)

This is the easiest way - you can edit files directly on the server!

1. **Install Extension**: In VS Code, install "Remote - SSH"

2. **Configure SSH**: 
   - Press `F1` or `Ctrl+Shift+P`
   - Type "Remote-SSH: Open SSH Configuration File"
   - Choose the first option (usually `~/.ssh/config`)
   - Add this:

```
Host aws-game
    HostName game.code-lab.org
    User ec2-user
    IdentityFile ~/.ssh/aws-game-codelab.pem
    ServerAliveInterval 60
```

3. **Connect**:
   - Click green button in bottom-left corner of VS Code (looks like "><")
   - Select "Connect to Host"
   - Choose "aws-game"
   - New VS Code window opens - you're now on AWS! 🎉

### Step 4: Deploy on AWS Server

In VS Code's terminal (or SSH session):

```bash
# Clone your repository
git clone https://github.com/Mobinzarreh/stratdyn.git
cd stratdyn

# Switch to your branch
git checkout feature/ui-intention-finalchoice

# Create directory for logs
mkdir -p logs

# Build and run with Docker
docker-compose up -d --build
```

Wait 30-60 seconds for the build to complete...

### Step 5: Verify It's Running

```bash
# Check container status
docker ps

# You should see output like:
# CONTAINER ID   IMAGE              COMMAND         STATUS          PORTS
# abc123def456   stratdyn_stratdyn  "npm start"     Up 30 seconds   0.0.0.0:3000->3000/tcp
```

Check the logs:
```bash
docker-compose logs -f stratdyn
```

You should see: "Server listening on port 3000" or similar.  
Press `Ctrl+C` to exit the log view.

### Step 6: Test It Works

From your local computer, try:
```bash
curl http://game.code-lab.org:3000
```

Or ask Dr. Grogan about the security group settings to make it accessible.

## 🔄 How to Update After Changes

When you make changes and push to GitHub:

```bash
# On AWS server (via VS Code Remote or SSH)
cd stratdyn

# Get latest code
git pull origin feature/ui-intention-finalchoice

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

## 📋 Common Commands

| What You Want | Command |
|---------------|---------|
| View running containers | `docker ps` |
| View logs | `docker-compose logs -f stratdyn` |
| Stop container | `docker-compose down` |
| Start container | `docker-compose up -d` |
| Rebuild & restart | `docker-compose up -d --build` |
| Check disk space | `df -h` |
| Clean old images | `docker image prune -a` |

## 🐛 Troubleshooting

### Can't Connect via SSH

```bash
# Make sure key has correct permissions
chmod 400 ~/.ssh/aws-game-codelab.pem

# Try connecting manually first
ssh -i ~/.ssh/aws-game-codelab.pem ec2-user@game.code-lab.org
```

If this works, VS Code Remote should also work.

### Container Won't Start

```bash
# Check what went wrong
docker-compose logs stratdyn

# Try rebuilding from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Port 3000 Already in Use

```bash
# Find what's using it
sudo lsof -i :3000

# Stop your old server if running
docker-compose down

# Or kill the process
sudo kill -9 <PID>
```

### Can't Access from Outside

- The AWS security group might be blocking port 3000
- Talk to Dr. Grogan about:
  - Opening port 3000, OR
  - Setting up Traefik (reverse proxy) for HTTPS access

## 📊 Where Your Data Lives

On the AWS server:
- **Application code**: `/home/ec2-user/stratdyn/`
- **CSV logs**: `/home/ec2-user/stratdyn/logs/`
- **Experiment data**: `/home/ec2-user/stratdyn/data/`

These directories are mounted as volumes, so data persists even if you restart containers.

## 🔒 Security Notes

**DO NOT**:
- ❌ Commit your private key to Git
- ❌ Share your private key with anyone
- ❌ Leave your private key in Downloads folder
- ❌ Commit real experiment data to public repositories

**DO**:
- ✅ Keep private key in `~/.ssh/` with 400 permissions
- ✅ Use `.gitignore` to exclude CSV files
- ✅ Backup experiment data separately
- ✅ Keep your GitHub repository up to date

## 🎓 Next Steps with Dr. Grogan

After basic deployment works, Dr. Grogan can help with:

1. **Traefik Setup** (Reverse Proxy)
   - Makes your app accessible at `https://game.code-lab.org`
   - Automatic SSL certificates (HTTPS)
   - Professional domain access

2. **Security Groups**
   - Configure which ports are accessible
   - Set up firewall rules

3. **Monitoring**
   - Track if server is running
   - Alert if it goes down

## 📚 Need More Details?

See `DEPLOYMENT.md` for the complete reference guide with:
- Detailed explanations of each file
- Advanced Docker commands
- Troubleshooting scenarios
- Data persistence details

## ✅ Success Checklist

You'll know it's working when:
- ✅ `docker ps` shows container running
- ✅ `docker-compose logs` shows no errors
- ✅ Server responds on port 3000
- ✅ Multiple users can access simultaneously
- ✅ CSV logs are being created in `logs/` directory
- ✅ Container survives restarts (`docker-compose down` then `up`)

## 🆘 Getting Help

1. **Check logs first**: `docker-compose logs -f`
2. **Check container status**: `docker ps -a`
3. **Ask Dr. Grogan** about:
   - AWS security group settings
   - Traefik configuration
   - Domain/DNS issues
4. **Google is your friend**: "docker compose <your issue>"

---

**You've got this!** 🚀

The Docker setup is complete. Once you deploy to AWS, your experiment will be accessible to participants over the internet!
