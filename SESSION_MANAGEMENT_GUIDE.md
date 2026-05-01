# StratDyn Session Management Guide

## Overview
This guide documents the complete workflow for managing StratDyn experiment sessions, from pre-experiment preparation through post-experiment data organization. All processes are designed for consistency and data integrity across sessions 1-30.

---

## BEFORE EXPERIMENT

### 1. Change SessionId
Update `stratdyn.js` at line 292:
```javascript
let sessionId = 'sessionX'; // Change X to current session number
```

### 2. Commit and Push
```bash
git add stratdyn.js
git commit -m "Set sessionId to sessionX for experiment"
git push
```

### 3. Deploy to AWS
SSH into the server and redeploy:
```bash
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org
cd stratdyn
git pull  # Pulls current branch (feature/ui-intention-finalchoice)
docker build -t stratdyn-app:latest .
docker-compose down && docker-compose up -d
```

**CRITICAL:** Always rebuild Docker image - Docker caches old code.

### 4. Verify Deployment - Check Logs
```bash
docker logs stratdyn-app-1 | grep sessionId
# Should show: "sessionId: sessionX"
```

### 5. Verify Server Accessibility
Test that login page is actually accessible:
```bash
curl -s https://game.code-lab.org | head -20
# Should show HTML login page content
```

### 6. Claude AI Reports Ready
Once logs confirm correct sessionId AND login page is accessible, I will report: **"Ready for test"**

### 6. User Tests with Test Data
You run tests with users: `test-1`, `test-2`, etc.
- Test all user workflows
- Verify data storage is working correctly
- Document any issues

### 7. Request Test Data Download
You message: "download the test and see whether it is fine and check it"

### 8. Claude Downloads, Verifies, and Cleans Up Test Data

**A. Download test data:**
```bash
./download_data.sh
```

**B. Verify test data integrity:**
- Check file line counts match expected format
- Verify test-1, test-2 usernames in data
- Sample head/tail to confirm data structure

**C. Delete test data locally:**
```bash
rm remote-data/task_*_sessionX.csv
rm remote-data/training_task_*_sessionX.csv
rm remote-data/demographics_survey_*_sessionX.csv
rm remote-data/postsurvey_*_sessionX.csv
rm remote-data/consent_log_sessionX.csv
```

**D. Delete test data from AWS:**
```bash
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "rm stratdyn/logs/*_sessionX.csv"
```

**E. Report ready for actual experiment:**
"Test data verified and deleted. Ready for actual experiment."

### 9. User Runs Actual Experiment
You conduct the actual experiment with real participants.

---

## AFTER EXPERIMENT

### 1. Download Session Data
You message: "download the data"

I execute:
```bash
./download_data.sh
```

### 2. Verify Data Integrity
Check for session X data:
- Task files: 49 lines each (1 header + 24 tasks × 2 users)
- Training files: 11 lines each (1 header + 10 training tasks)
- Survey files present for both groups
- Sample head/tail to confirm structure

**Verify data consistency:**
- Control and treatment task files have equal line counts (both should be 49)
- Both groups have same number of participants
```bash
# Check line counts match
wc -l remote-data/task_control_sessionX.csv remote-data/task_treatment_sessionX.csv
# Both should be 49
```

### 3. Organize Session Data - Create Directory Structure
Create organized folder structure matching sessions 1-11:

```
remote-data/session_X/
├── control/
│   ├── task_control_sessionX.csv
│   ├── training_task_control_sessionX.csv
│   ├── demographics_survey_control_sessionX.csv
│   └── postsurvey_control_sessionX.csv
├── treatment/
│   ├── task_treatment_sessionX.csv
│   ├── training_task_treatment_sessionX.csv
│   ├── demographics_survey_treatment_sessionX.csv
│   └── postsurvey_treatment_sessionX.csv
└── logs/
    └── consent_log_sessionX.csv
```

### 4. Move Files to Appropriate Directories
- Control group CSV files → `session_X/control/`
- Treatment group CSV files → `session_X/treatment/`
- Consent logs → `session_X/logs/`

### 5. Verify Organization Complete
Confirm all files are in correct locations and none are missing.

---

## Pre-Experiment Checklist

- [ ] SessionId updated in `stratdyn.js:292`
- [ ] Git commit: `"Set sessionId to sessionX for experiment"`
- [ ] Git push to remote
- [ ] Docker image rebuilt on AWS
- [ ] Docker containers restarted
- [ ] Logs confirm correct sessionId
- [ ] Ready for test message sent

---

## Post-Experiment Checklist

- [ ] Data downloaded via `./download_data.sh`
- [ ] Data integrity verified
- [ ] `session_X/` directory structure created
- [ ] Control files organized in `session_X/control/`
- [ ] Treatment files organized in `session_X/treatment/`
- [ ] Logs organized in `session_X/logs/`
- [ ] All files accounted for and in correct locations

---

## Session Data Structure Reference

### File Naming Convention
```
task_[control/treatment]_session[X].csv
training_task_[control/treatment]_session[X].csv
demographics_survey_[control/treatment]_session[X].csv
postsurvey_[control/treatment]_session[X].csv
consent_log_session[X].csv
```

### Expected File Counts per Session
- Task files: 2 (1 control + 1 treatment)
- Training task files: 2 (1 control + 1 treatment)
- Demographics survey files: 2 (1 control + 1 treatment)
- Post-survey files: 2 (1 control + 1 treatment)
- Consent logs: 1

**Total: 9 files per session**

---

## Session Data Line Count Reference

### Task Files
- Expected: 49 lines per file (1 header + 24 tasks × 2 users)
- Both control and treatment should have 49 lines

### Training Task Files
- Expected: 11 lines per file (1 header + 10 training tasks)
- Both control and treatment should have 11 lines

### Survey Files
- Demographics: 1 line (header + 1 data row per group)
- Post-survey: 1 line (header + 1 data row per group)

---

## Directory Organization Example: Session 11

```
remote-data/
├── session_1/
├── session_2/
├── ...
├── session_10/
└── session_11/
    ├── control/
    │   ├── task_control_session11.csv
    │   ├── training_task_control_session11.csv
    │   ├── demographics_survey_control_session11.csv
    │   └── postsurvey_control_session11.csv
    ├── treatment/
    │   ├── task_treatment_session11.csv
    │   ├── training_task_treatment_session11.csv
    │   ├── demographics_survey_treatment_session11.csv
    │   └── postsurvey_treatment_session11.csv
    └── logs/
        └── consent_log_session11.csv
```

---

## Troubleshooting

### Issue: Deployment logs don't show correct sessionId
**Solution:** 
1. Verify code change was pushed
2. Rebuild Docker image: `docker build -t stratdyn-app:latest .`
3. Restart containers: `docker-compose down && docker-compose up -d`
4. Check logs again

### Issue: Test data doesn't download properly
**Solution:**
1. Verify server logs show data was collected
2. Check file permissions on server
3. Verify `download_data.sh` script runs without errors

### Issue: Data line counts don't match expected
**Solution:**
1. Count completed pairs: `wc -l remote-data/task_*_sessionX.csv`
2. Verify both test users appear in data
3. Check for incomplete task sequences

---

## Important Reminders

1. **Always rebuild Docker image after code changes** - Docker caches old code
2. **Verify deployment before declaring ready** - Check logs for correct sessionId
3. **Delete test data before actual experiment** - Prevents data contamination
4. **Organize immediately after experiment** - Prevents file confusion
5. **Maintain consistent naming** - Keep format: `session_X` for directories, `sessionX` for sessionId
6. **Backup data** - Keep organized session folders as master copies

---

## Session Tracking

Track all sessions (1-30) in SESSION_CHECKLIST.md with completion status for each phase.
