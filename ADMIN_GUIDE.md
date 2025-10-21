# 📊 Admin Guide for stratdyn Experiment

## Date: October 16, 2025

---

## 🔑 Admin Access

### Login Credentials
```
Username: admin
Password: attila
```

### How to Access
1. Open browser: http://localhost:3000
2. Enter credentials above
3. You'll see the admin dashboard

---

## 📱 Current Admin Dashboard Features

### What You Can See:
- ✅ **Progress bar** - Overall experiment progress
- ✅ **User table** - Shows all users and their current status:
  - Username
  - Online/offline status
  - Current task
  - Group (treatment/control)
  - Current design choice
  - Strategy
  - Score
  - Total score

### Current Controls:
- ⚠️ **Previous/Next buttons** - Currently disabled (not functional in auto-advance mode)

---

## ⚠️ Current Limitations

### What You CANNOT Do (Yet):
- ❌ Force user to go back to previous task
- ❌ Reset a user's answer
- ❌ Manually advance users
- ❌ Edit submitted responses
- ❌ Restart a user from specific point

### Why These Don't Exist:
The system was designed for **independent user progression** with **auto-advance enabled**. Admin control was meant for synchronized sessions where admin controls when everyone advances together.

---

## 🛠️ Handling Common Admin Scenarios

### Scenario 1: User Enters Wrong Answer

**Current Solution (Manual):**
1. Stop the server
2. Edit the CSV file directly:
   ```bash
   nano task_treatment_session1.csv
   # Find the row with wrong data
   # Edit the values
   # Save (Ctrl+O, Enter, Ctrl+X)
   ```
3. Restart server

**Better Solution (Recommended):**
- Implement admin controls to reset specific task for specific user
- Would you like me to add this feature?

---

### Scenario 2: User Wants to Go Back

**Current Status:** ❌ Not possible with current system

**Why:** With `userTaskIndex` tracking, once a user advances, they can't go back because:
- Data already logged to CSV
- Task index already incremented
- No "undo" mechanism

**Options:**
1. **Accept it** - Users can't go back (like most online surveys)
2. **Add reset feature** - Admin can reset user to specific task
3. **Logout/login** - User starts over from beginning

---

### Scenario 3: User Gets Stuck

**Steps:**
1. Check server terminal for errors
2. Check browser console (F12) for errors
3. Check user's current `userTaskIndex`:
   - Look at server logs
   - Admin dashboard shows current task
4. Restart server if needed
5. User can logout and login again

---

## 🎯 Best Practices as Admin

### Before Experiment Starts

#### 1. **Test Everything**
```bash
# Clear old data
mkdir -p test_backups/$(date +%Y%m%d_%H%M%S)
mv *_session1.csv test_backups/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null

# Restart server
pkill -f "node.*www" && sleep 2 && npm start
```

- Login as each test user (user01, user02, etc.)
- Complete 2-3 tasks
- Verify CSV data is logging correctly
- Check both treatment and control groups

#### 2. **Prepare Session**
- [ ] Set `sessionId` in stratdyn.js if needed
- [ ] Verify user credentials are correct
- [ ] Check `autoAdvance = true` (for independent mode)
- [ ] Clear old CSV files or backup
- [ ] Test server is accessible from participant machines

#### 3. **Document Everything**
- Note start time
- Record which users are assigned to which groups
- Keep track of any issues during session

---

### During Experiment

#### 1. **Monitor Admin Dashboard**
- Keep admin page open: http://localhost:3000 (logged in as admin)
- Watch for users coming online
- Check progress regularly
- Look for anyone stuck

#### 2. **Watch Server Terminal**
Monitor for messages like:
```
New user user01 - starting at demographics
user01 completed demographics. Advancing to pre-survey
user01 completed pre-survey. Advancing to task 0
user01 completed task 0. Advancing to index 1
```

Look for errors or users stuck at same index

#### 3. **Be Ready to Help**
- Have this guide open
- Know how to restart server
- Have backup of CSV files
- Know user credentials

#### 4. **Don't Interrupt**
- ⚠️ Don't restart server while users are active
- ⚠️ Don't edit CSV files while experiment running
- ⚠️ Don't change code during live session

---

### After Each Session

#### 1. **Backup Data Immediately**
```bash
# Create timestamped backup
mkdir -p experiment_data/session_$(date +%Y%m%d_%H%M%S)
cp *_session1.csv experiment_data/session_$(date +%Y%m%d_%H%M%S)/

# Or use descriptive name
mkdir -p experiment_data/session1_treatment_control
cp *_session1.csv experiment_data/session1_treatment_control/
```

#### 2. **Verify Data Quality**
```bash
# Check row counts
wc -l task_treatment_session1.csv
wc -l task_control_session1.csv

# View sample data
head -5 task_treatment_session1.csv

# Check for missing values
grep ",," task_treatment_session1.csv
```

#### 3. **Document Session**
Create notes file:
```bash
nano experiment_data/session1_notes.txt
```

Include:
- Date and time
- Number of participants
- Any technical issues
- Users who had problems
- Data quality notes

---

## 📋 Pre-Session Checklist

### 1 Day Before:
- [ ] Test complete workflow with all user accounts
- [ ] Backup current data
- [ ] Update sessionId if running multiple sessions
- [ ] Verify all 6 users work correctly
- [ ] Check treatment vs control group assignments

### 2 Hours Before:
- [ ] Clear test data
- [ ] Restart server fresh
- [ ] Test one user login
- [ ] Check admin dashboard works
- [ ] Verify internet/network connection

### 30 Minutes Before:
- [ ] Final server restart
- [ ] Admin dashboard open and monitoring
- [ ] Terminal visible to watch logs
- [ ] Prepare user instructions/links

### During Session:
- [ ] Don't touch server
- [ ] Monitor admin dashboard
- [ ] Watch terminal for errors
- [ ] Be ready to help users

### After Session:
- [ ] Backup all CSV files immediately
- [ ] Document any issues
- [ ] Check data completeness
- [ ] Thank participants!

---

## 🚨 Emergency Procedures

### Server Crashes
```bash
# Check what happened
tail -50 /home/mzarreh/projects2/stratdyn/npm-debug.log

# Restart server
cd /home/mzarreh/projects2/stratdyn
npm start

# Users can refresh browser and continue
```

### User Can't Login
1. Check username/password in `data/userCredentials.json`
2. Verify server is running
3. Check browser console for errors
4. Try different browser

### Data Not Saving
1. Check file permissions
2. Check disk space: `df -h`
3. Check server errors in terminal
4. Verify CSV files exist and are writable

### Browser Shows Blank Page
1. Hard refresh: Ctrl+Shift+R
2. Clear browser cache
3. Check server is running
4. Check browser console (F12)

---

## 📊 Data Management

### CSV File Structure

**task_[group]_session1.csv:**
```
timestamp,username,group,partner,task,intention,intentionTimestamp,uValue,uPercentile,rValue,rPercentile,finalChoice,finalChoiceTimestamp,score,partnerScore
```

**presurvey_[group]_session1.csv:**
```
timestamp,username,group,q1t2,q2r3,q3c1,q4r2,q5t1,q6r1,q7c3,q8t3,q9c2
```

**demographics_survey_[group]_session1.csv:**
```
timestamp,username,group,age,gender,language,education,experience,country,consent
```

### Expected Files:
- `task_treatment_session1.csv` (user01, user02, user05)
- `task_control_session1.csv` (user03, user04, user06)
- `presurvey_treatment_session1.csv`
- `presurvey_control_session1.csv`
- `demographics_survey_treatment_session1.csv`
- `demographics_survey_control_session1.csv`
- `postsurvey_treatment_session1.csv`
- `postsurvey_control_session1.csv`

### Data Validation Checks:
```bash
# Count completed tasks per user
grep "user01" task_treatment_session1.csv | wc -l  # Should be 30

# Check for duplicates
sort task_treatment_session1.csv | uniq -d

# Verify all users present
cut -d',' -f2 task_treatment_session1.csv | sort | uniq
```

---

## 🔧 Advanced Admin Features (To Be Implemented)

Would you like me to add any of these features?

### 1. **Reset User to Specific Task**
- Admin can set user back to specific task number
- Clears responses after that point
- Useful if user made mistake

### 2. **Manual User Advancement Control**
- Admin can force user to next task
- Override auto-advance for specific user
- Useful if user stuck

### 3. **Edit/Delete Response**
- Admin can modify submitted responses
- Delete incorrect entries
- Useful for data quality

### 4. **Real-Time User Monitoring**
- See which task each user is currently on
- See how long on current task
- Alert if user stuck for too long

### 5. **Session Management**
- Pause/resume experiment
- Lock out new logins
- End session for all users

### 6. **Data Export**
- Download CSV from admin interface
- Export to different formats
- Summary statistics view

---

## 📞 Quick Reference

### Access Admin:
```
http://localhost:3000
Username: admin
Password: attila
```

### Restart Server:
```bash
pkill -f "node.*www" && sleep 2 && npm start
```

### Backup Data:
```bash
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
cp *_session1.csv backups/$(date +%Y%m%d_%H%M%S)/
```

### Check Server:
```bash
ps aux | grep "node.*www" | grep -v grep
```

### View Logs:
```bash
tail -f /var/log/syslog  # System logs
# Or watch terminal where npm start is running
```

---

## ❓ Need New Admin Features?

Let me know if you want me to implement:
1. User reset functionality
2. Response editing
3. Better monitoring
4. Session controls
5. Anything else!

I can add these features to help you manage the experiment better.
