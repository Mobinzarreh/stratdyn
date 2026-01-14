# StratDyn Experiment Session Management Guide

## Overview
StratDyn is a collaborative decision-making experiment where **paired users** work together on tasks. Each session collects data from multiple user pairs simultaneously. This guide outlines the complete process for managing experiment sessions.

---

## Session Lifecycle

### 1. Pre-Session Preparation

#### A. Session ID Setup
**CRITICAL: Always change sessionId before starting a new session**

```javascript
// In stratdyn.js, line ~236
let sessionId = 'session3_pilot'; // Change this for each new session
```

**Why this matters:**
- Each session creates separate CSV files: `task_treatment_{sessionId}.csv`
- Prevents data mixing between sessions
- Allows parallel analysis of different sessions

#### B. User Credentials Preparation
- Ensure user credentials are set up in `data/userCredentials.json`
- Each pair needs unique usernames (e.g., user01/user02, user03/user04)
- Pairs are automatically formed based on login order

#### C. Server Deployment
**Follow DEPLOYMENT_CHECKLIST.md strictly:**
```bash
# 1. Commit and push changes locally
git add stratdyn.js
git commit -m "Change sessionId to session3_pilot"
git push myfork feature-branch

# 2. Deploy to AWS (CRITICAL: rebuild Docker image)
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org
cd stratdyn
git pull myfork feature-branch
docker build -t stratdyn-app:latest .  # ← DON'T SKIP THIS!
docker-compose down && docker-compose up -d

# 3. Verify deployment
docker-compose logs --tail=10 stratdyn
```

---

### 2. During Session Execution

#### A. User Management
- **Expected participants**: Multiple pairs (typically 10-20 pairs per session)
- **Login process**: Users access `https://game.code-lab.org` and enter passcodes
- **Pairing**: Automatic - first user becomes "odd", second becomes "even" in pair
- **Monitoring**: Check server logs for user activity:
  ```bash
  ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org
  cd stratdyn && docker-compose logs -f stratdyn
  ```

#### B. Task Sequence (Per Pair)
Each pair completes:
1. **Consent page** (initial setup)
2. **Pre-survey** (demographics)
3. **Training Tasks** (2 tasks to learn interface)
4. **Main Tasks** (25 focal tasks + 5 distraction tasks = 32 total)
5. **Post-survey** (experience feedback)

#### C. Data Collection Points
- **Real-time**: Task decisions logged immediately
- **Surveys**: Collected at start/end of session
- **Synchronization**: Partner responses required before proceeding

#### D. Session Monitoring
Monitor for:
- User login/logout events
- Task completion progress
- Any errors or disconnections
- Server performance

---

### 3. Post-Session Data Management

#### A. Immediate Data Download
**Download immediately after session ends:**
```bash
# From local machine
scp -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org:~/stratdyn/logs/*_{sessionId}.csv remote-data/
```

**Files to collect:**
- `task_treatment_{sessionId}.csv` - Main task data
- `training_task_treatment_{sessionId}.csv` - Training data
- `demographics_survey_treatment_{sessionId}.csv` - User demographics
- `presurvey_treatment_{sessionId}.csv` - Pre-session survey
- `postsurvey_treatment_{sessionId}.csv` - Post-session survey

#### B. Data Verification
**Check data integrity:**
```bash
# Count completed pairs
wc -l remote-data/task_treatment_{sessionId}.csv
# Should be: (number of pairs × 32 tasks × 2 users) + 1 header
# Example: 10 pairs = (10 × 32 × 2) + 1 = 641 lines

# Check for incomplete pairs
grep -c "user01\|user03\|user05" remote-data/task_treatment_{sessionId}.csv
grep -c "user02\|user04\|user06" remote-data/task_treatment_{sessionId}.csv
```

#### C. Data Backup
- Store downloaded files in organized folders: `data/session1_pilot/`, `data/session2_pilot/`
- Keep raw CSV files as master copies
- Document any data quality issues

---

### 4. Session Transition

#### A. Clean Up Previous Session
```bash
# Optional: Remove old session files from server (after backup)
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org
cd stratdyn && rm logs/*_session{old}_pilot.csv
```

#### B. Prepare Next Session
1. **Increment sessionId**: `session1_pilot` → `session2_pilot` → `session3_pilot`
2. **Update user credentials** if needed for new participants
3. **Deploy changes** following checklist
4. **Test with 1 pair** before full session

---

## Session Types and Naming Convention

### Pilot Sessions
- `session1_pilot`, `session2_pilot`, etc.
- Used for testing and small-scale data collection
- May have incomplete data or experimental conditions

### Main Experiment Sessions
- `session001`, `session002`, etc. (3-digit numbering)
- Full experimental sessions with complete protocols
- Production data for analysis

### Special Sessions
- `session_debug` - For debugging/testing
- `session_training` - For experimenter training
- `session_practice` - For participant practice

---

## Troubleshooting Common Issues

### Issue: Users can't connect
**Check:** Server logs, Docker container status
**Fix:** Restart containers, check network connectivity

### Issue: Data not saving to correct session
**Check:** Docker image was rebuilt after sessionId change
**Fix:** Rebuild image and redeploy

### Issue: Incomplete pairs
**Check:** User login patterns, disconnections
**Fix:** Document incomplete pairs, may need re-running

### Issue: Server performance issues
**Check:** Memory usage, concurrent users
**Fix:** Monitor logs, scale server if needed

---

## Quality Assurance Checklist

### Pre-Session
- [ ] SessionId updated in code
- [ ] Docker image rebuilt and deployed
- [ ] User credentials configured
- [ ] Server logs show correct sessionId
- [ ] Test login works

### During Session
- [ ] Monitor user logins and progress
- [ ] Check for error messages in logs
- [ ] Ensure pairs are forming correctly
- [ ] Monitor server performance

### Post-Session
- [ ] All CSV files downloaded
- [ ] Data completeness verified
- [ ] Files backed up securely
- [ ] SessionId incremented for next session

---

## Data Analysis Preparation

### File Organization
```
data/
├── session1_pilot/
│   ├── task_treatment_session1_pilot.csv
│   ├── training_task_treatment_session1_pilot.csv
│   └── survey_files...
├── session2_pilot/
│   └── ...
└── session001/
    └── ...
```

### Key Metrics to Track
- **Completion rate**: Pairs who finished all tasks
- **Task completion time**: Average time per task/pair
- **Synchronization success**: Partner waiting times
- **Data quality**: Missing responses, invalid entries

---

## Emergency Procedures

### Session Interruption
1. **Document what happened** (time, users affected, error messages)
2. **Download partial data** immediately
3. **Assess data completeness**
4. **Decide**: Continue session or restart with new sessionId

### Data Loss Prevention
- **Always download data immediately** after session
- **Keep multiple backups** of raw data
- **Document any data quality issues**
- **Never modify raw CSV files**

### Server Issues
- **Have backup server ready** if possible
- **Document all server changes**
- **Test recovery procedures** regularly

---

## Session Planning Template

**Session: [sessionId]**
**Date:** [YYYY-MM-DD]
**Expected pairs:** [number]
**Start time:** [HH:MM UTC]
**End time:** [HH:MM UTC]

**Pre-session checklist:**
- [ ] SessionId updated
- [ ] Deployed and verified
- [ ] User credentials ready
- [ ] Backup server available

**During session:**
- [ ] Monitor logs continuously
- [ ] Track completion progress
- [ ] Handle user issues promptly

**Post-session:**
- [ ] Data downloaded and verified
- [ ] Files backed up
- [ ] Session summary documented

---

## Contact and Support

For technical issues:
- Check DEPLOYMENT_CHECKLIST.md
- Review server logs
- Test with minimal user load first

For data issues:
- Verify file downloads immediately
- Check data completeness scripts
- Document any anomalies

Remember: **Data integrity is paramount** - always prioritize correct data collection over speed.