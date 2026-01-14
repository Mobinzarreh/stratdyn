# AWS Deployment Checklist

## Critical: Always Rebuild Docker Image After Code Changes

Docker containers run from **images**, not live code files. Changing files without rebuilding will have **NO EFFECT**.

---

## Standard Deployment Process

### 1. Local Changes
- [ ] Make and test code changes locally
- [ ] Commit changes to git
  ```bash
  git add <files>
  git commit -m "Description of changes"
  ```
- [ ] Push to remote repository
  ```bash
  git push origin <branch-name>
  # or
  git push myfork <branch-name>
  ```

### 2. Deploy to AWS Server
- [ ] SSH into the server
  ```bash
  ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org
  cd stratdyn
  ```

- [ ] Pull latest changes
  ```bash
  git pull myfork <branch-name>
  ```

- [ ] **CRITICAL: Rebuild Docker image**
  ```bash
  docker build -t stratdyn-app:latest .
  ```
  ⚠️ **Skipping this step means your changes won't be deployed!**

- [ ] Restart containers with new image
  ```bash
  docker-compose down
  docker-compose up -d
  ```

### 3. Verification
- [ ] Check container is running
  ```bash
  docker-compose ps
  ```

- [ ] Verify recent logs show no errors
  ```bash
  docker-compose logs --tail=20 stratdyn
  ```

- [ ] **Verify your changes are active** by checking:
  - For sessionId changes: Check log file names created
  - For code changes: Test the affected functionality
  - For config changes: Check logs for expected values

---

## Quick Reference Commands

### Full deployment (from local machine):
```bash
# After committing and pushing locally:
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "cd stratdyn && git pull myfork <branch> && docker build -t stratdyn-app:latest . && docker-compose down && docker-compose up -d"
```

### Check what's running in the container:
```bash
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "docker exec stratdyn-app grep 'sessionId' /app/stratdyn.js"
```

### View live logs:
```bash
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "cd stratdyn && docker-compose logs -f stratdyn"
```

---

## Common Mistakes to Avoid

❌ **Running `docker-compose up -d` without rebuilding**
- Result: Old code still runs
- Fix: Always run `docker build` first

❌ **Changing files directly on the server**
- Result: Changes lost on next deployment
- Fix: Always make changes locally, commit, and deploy

❌ **Not verifying deployment worked**
- Result: Think changes are live when they're not
- Fix: Always check logs or test functionality after deployment

---

## Session ID Changes (Special Case)

When changing sessionId for a new pilot/session:

1. **Before changing**: Download current session data
   ```bash
   scp -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org:~/stratdyn/logs/*_session<N>_pilot.csv remote-data/
   ```

2. **Change sessionId** in stratdyn.js (line ~236)

3. **Deploy following standard process above**

4. **Verify new session files will be created**:
   - Check container has new sessionId: 
     ```bash
     docker exec stratdyn-app grep 'let sessionId' /app/stratdyn.js
     ```
   - Test with a login and verify new CSV files are created

---

## Emergency Rollback

If deployment breaks production:

```bash
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org
cd stratdyn
git reset --hard <previous-commit-hash>
docker build -t stratdyn-app:latest .
docker-compose down && docker-compose up -d
```

---

## Notes

- **Docker builds take ~30 seconds** - this is normal
- **Always test locally** before deploying to production
- **Data in `/logs` directory persists** across container restarts (it's mounted as a volume)
- **Environment variables** require container restart to take effect
