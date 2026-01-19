# Quick Deployment Reference

## 🚀 Standard Deployment (Most Common)

```bash
# 1. Commit and push your changes
git add .
git commit -m "Description of changes"
git push myfork feature/ui-intention-finalchoice

# 2. Deploy to AWS (one command)
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org \
  'cd ~/stratdyn && \
   git pull origin feature/ui-intention-finalchoice && \
   docker build -t stratdyn-app:latest . && \
   docker-compose down && \
   docker-compose up -d'

# 3. Verify
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org \
  'docker ps && docker logs stratdyn-app --tail=20'
```

## 📚 Documentation Files

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide with all commands and troubleshooting
- **[deploy.sh](deploy.sh)** - Automated deployment script (runs the commands above)
- **[MANUAL_DEPLOY.sh](MANUAL_DEPLOY.sh)** - Step-by-step manual instructions if automation fails

## ✅ Quick Checks

**Is it deployed?**
```bash
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org 'docker ps'
```

**See live logs:**
```bash
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org 'docker logs -f stratdyn-app'
```

**Application URL:** https://game.code-lab.org

**Clear browser cache after deployment:** Press `Ctrl+Shift+R`

## 🔧 Common Issues

### "compose build requires buildx 0.17 or later"
✅ **Fixed**: Build image separately (already done in commands above)

### Changes not showing
✅ **Solution**: Hard refresh browser with `Ctrl+Shift+R`

### Container not starting
```bash
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org \
  'docker logs stratdyn-app --tail=100'
```

---

For complete documentation, see **[DEPLOYMENT.md](DEPLOYMENT.md)**
