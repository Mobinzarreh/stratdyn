# Comprehensive Pre-Testing Checklist & System Status

## ✅ System Health Check (October 16, 2025)

### Core System Status
- ✅ **Server Running**: Yes (PID 1874)
- ✅ **Port**: 3000
- ✅ **Syntax Check**: All JavaScript files pass
- ✅ **VS Code Errors**: None
- ✅ **Auto-Advance**: Enabled (true)
- ✅ **Start Point**: Demographics survey (currentTaskIndex = -2)
- ✅ **Session ID**: session1

### Files Verified
- ✅ stratdyn.js (main server)
- ✅ app.js
- ✅ package.json
- ✅ public/index.html (UI)
- ✅ public/index.js (client logic)
- ✅ public/images/stevens.png (exists, 116KB)
- ✅ data/experiment.json (30 tasks)
- ✅ data/userCredentials.json (6 users)
- ✅ data/adminCredentials.json
- ✅ utils/calculations.js

### User Configuration
**Total Users**: 6 (3 pairs)
**Groups**: 
- Treatment (3 users): user01, user02, user05 - See u + R percentiles
- Control (3 users): user03, user04, user06 - See only u percentile

**Pairings**:
- Pair 1: user01 ↔ user02 (both treatment)
- Pair 2: user03 ↔ user04 (both control)
- Pair 3: user05 ↔ user06 (mixed: treatment + control)

### Recent Fixes Verified
- ✅ **Issue 1 Fixed**: Car Design column removed from tables
- ✅ **Issue 2 Fixed**: Partner synchronization implemented (userProgress tracking)
- ✅ **Issue 3 Fixed**: Sequential task numbering (1 of 30, 2 of 30, etc.)

### Data Storage
- ✅ 8 CSV files exist from previous testing
- 📝 Files will be overwritten on next test (same sessionId)
- 💡 Consider backing up if you want to keep old test data

---

## 🧪 Complete Testing Guide

### Prerequisites - Before You Start
1. ☐ **Open TWO browsers** (or one regular + one incognito)
   - Browser 1: http://localhost:3000
   - Browser 2: http://localhost:3000 (incognito mode)

2. ☐ **Open Server Terminal** (optional but recommended)
   - Watch for sync messages: "user01 completed task X, waiting for user02..."
   
3. ☐ **Open Browser Console** (F12) in both browsers
   - Check for JavaScript errors

4. ☐ **Backup Existing Data** (if needed)
   ```bash
   cd /home/mzarreh/projects2/stratdyn
   mkdir backup_$(date +%Y%m%d_%H%M%S)
   mv *_session1.csv backup_*/
   ```

---

## 📋 Testing Checklist

### Phase 1: Basic Functionality (Single User)

#### Test 1.1: Treatment User Login & UI
Browser 1:
- ☐ Go to http://localhost:3000
- ☐ Login: `user01` / `pass01`
- ☐ **Verify**: Welcome screen shows Stevens image
- ☐ **Verify**: Demographics survey appears

#### Test 1.2: Demographics Survey
- ☐ Fill out all fields (age, gender, etc.)
- ☐ Click "Continue"
- ☐ **Verify**: Automatically advances to Pre-Survey
- ☐ **Verify**: No loading spinner stuck

#### Test 1.3: Pre-Survey
- ☐ Answer all 9 questions
- ☐ Click "Continue"
- ☐ **Verify**: Advances to Task 1

#### Test 1.4: Task 1 - Part 1 (Intention)
- ☐ **Verify**: Shows "Task 1 of 30" (not "Task 1" or confusing number)
- ☐ **Verify**: Table has 4 rows (A, B, C, Y)
- ☐ **Verify**: Table has NO "Car Design" column ✓
- ☐ **Verify**: Columns are: Design Strategy, Design Name, Decision, Payoffs
- ☐ **Verify**: Individual Difficulty slider shows (visual only)
- ☐ **Verify**: Intention slider (1-10) is movable
- ☐ Move intention slider to any value (e.g., 7)
- ☐ Click "Submit My Intention"
- ☐ **Verify**: Advances to Part 2

#### Test 1.5: Task 1 - Part 2 (Choice)
- ☐ **Verify**: Shows "Task 1 of 30"
- ☐ **Verify**: Same table structure (no Car Design column)
- ☐ **Verify**: Individual Difficulty slider visible
- ☐ **Verify**: Paired Difficulty (R) slider IS VISIBLE (treatment user)
- ☐ Click on a table row (A, B, C, or Y)
- ☐ **Verify**: Row highlights in blue
- ☐ Click "Submit My Decision"
- ☐ **Verify**: System shows "waiting for user02..." in terminal (if checking)

---

### Phase 2: Partner Synchronization (Two Users)

#### Test 2.1: Setup Both Users
Browser 1:
- ☐ Login: `user01` / `pass01`
- ☐ Complete demographics and pre-survey to reach Task 1

Browser 2:
- ☐ Login: `user02` / `pass02`
- ☐ Complete demographics and pre-survey to reach Task 1

#### Test 2.2: Test Synchronization - Scenario A (Fast vs Slow)
**Goal**: Verify system waits for slower user

Browser 1 (Fast user):
- ☐ Part 1: Submit intention immediately
- ☐ **Verify**: Advances to Part 2
- ☐ Part 2: Make choice and submit
- ☐ **Verify**: STAYS on Task 1 (waiting for user02)
- ☐ **Verify**: Terminal shows "user01 completed task 0, waiting for user02..."

Browser 2 (Slow user):
- ☐ Still on Part 1
- ☐ **Verify**: Can still submit intention (not skipped)
- ☐ Submit intention
- ☐ **Verify**: Advances to Part 2
- ☐ Make choice and submit
- ☐ **Verify**: Terminal shows "Both user01 and user02 completed task 0. Advancing to task 1"

Both Browsers:
- ☐ **Verify**: BOTH advance to Task 2 of 30 simultaneously

#### Test 2.3: Test Synchronization - Scenario B (Different Stages)
**Goal**: Verify users can be at different stages within same task

Browser 1:
- ☐ Complete Part 1 (intention)
- ☐ Complete Part 2 (choice)
- ☐ **Verify**: Waits on Task 2

Browser 2:
- ☐ Still on Part 1 of Task 2
- ☐ Take time (20-30 seconds)
- ☐ **Verify**: Browser 1 still waiting
- ☐ Complete Part 1
- ☐ Take more time on Part 2
- ☐ **Verify**: Browser 1 still waiting
- ☐ Complete Part 2

Both Browsers:
- ☐ **Verify**: Both advance to Task 3 of 30

#### Test 2.4: Complete Multiple Tasks
- ☐ Complete 3-5 tasks together
- ☐ **Verify**: Task numbers are sequential (1, 2, 3, 4, 5)
- ☐ **Verify**: No tasks skipped
- ☐ **Verify**: Synchronization works consistently

---

### Phase 3: Control Group Testing

#### Test 3.1: Control User Login
Browser 1:
- ☐ Refresh/logout from user01
- ☐ Login: `user03` / `pass03`
- ☐ Complete demographics and pre-survey

#### Test 3.2: Control Group UI Verification
Task 1 - Part 2:
- ☐ **Verify**: Individual Difficulty (u) slider IS visible
- ☐ **CRITICAL**: Paired Difficulty (R) slider is HIDDEN
- ☐ **Verify**: No "R percentile" anywhere on screen
- ☐ Complete the task

#### Test 3.3: Control Group Synchronization
Browser 1: user03
Browser 2: user04
- ☐ Repeat synchronization tests from Phase 2
- ☐ **Verify**: Synchronization works for control group too

---

### Phase 4: Mixed Group Testing

#### Test 4.1: Treatment + Control Pair
Browser 1: `user05` / `pass05` (treatment)
Browser 2: `user06` / `pass06` (control)

- ☐ Both complete demographics/pre-survey
- ☐ Both reach Task 1 Part 2
- ☐ **Verify**: user05 sees R percentile
- ☐ **Verify**: user06 does NOT see R percentile
- ☐ Complete task
- ☐ **Verify**: Synchronization works across different groups

---

### Phase 5: Data Verification

#### Test 5.1: Check CSV Files Were Created
```bash
cd /home/mzarreh/projects2/stratdyn
ls -lh *_session1.csv
```

Expected files:
- ☐ task_treatment_session1.csv
- ☐ task_control_session1.csv
- ☐ presurvey_treatment_session1.csv
- ☐ presurvey_control_session1.csv
- ☐ postsurvey_treatment_session1.csv (if completed)
- ☐ postsurvey_control_session1.csv (if completed)
- ☐ demographics_survey_treatment_session1.csv
- ☐ demographics_survey_control_session1.csv

#### Test 5.2: Verify CSV Content
```bash
# Check headers
head -1 task_treatment_session1.csv
```

Expected headers:
```
timestamp,username,group,partner,task,intention,intentionTimestamp,uValue,uPercentile,rValue,rPercentile,finalChoice,finalChoiceTimestamp,score,partnerScore
```

- ☐ **Verify**: All 15 columns present
- ☐ **Verify**: Data has values (not empty)

```bash
# Check a few data rows
head -5 task_treatment_session1.csv
```

- ☐ **Verify**: Timestamps are filled
- ☐ **Verify**: Usernames correct (user01, user02, user05)
- ☐ **Verify**: Group is "treatment"
- ☐ **Verify**: Partner names correct
- ☐ **Verify**: Intention values (1-10)
- ☐ **Verify**: u/R percentiles have values
- ☐ **Verify**: Final choices (A, B, C, or Y)

#### Test 5.3: Verify Control Group CSV
```bash
head -5 task_control_session1.csv
```

- ☐ **Verify**: Usernames correct (user03, user04, user06)
- ☐ **Verify**: Group is "control"
- ☐ **Verify**: R values ARE logged (even though not shown to user)

---

### Phase 6: Full Experiment Flow (Optional - Takes ~30-45 min)

#### Test 6.1: Complete All 30 Tasks
Browser 1: Any user
- ☐ Complete all 30 tasks
- ☐ **Verify**: Numbers go from 1 to 30 sequentially
- ☐ **Verify**: No crashes or errors
- ☐ **Verify**: Post-survey appears after Task 30

#### Test 6.2: Post-Survey and Completion
- ☐ Complete post-survey (9 questions)
- ☐ Click "Continue"
- ☐ **Verify**: Thank you screen appears
- ☐ **Verify**: Stevens image shows on thank you screen

---

### Phase 7: Admin Panel (Optional)

#### Test 7.1: Admin Login
Browser 1:
- ☐ Login: `admin` / `attila`
- ☐ **Verify**: Admin panel appears
- ☐ **Verify**: Shows list of all 6 users
- ☐ **Verify**: Shows online/offline status
- ☐ **Verify**: Shows user groups (treatment/control)

#### Test 7.2: Admin Controls (if autoAdvance = false)
- ☐ Previous button works
- ☐ Next button works
- ☐ All users advance together when Next clicked

---

## ⚠️ Known Issues to Watch For

### Issue: Browser Cache
**Symptom**: Old version of page loads, changes not visible
**Solution**: Hard refresh (Ctrl+Shift+R)

### Issue: Port Already in Use
**Symptom**: Server won't start
**Solution**: 
```bash
pkill -f "node.*www"
npm start
```

### Issue: CSV Files Not Updating
**Symptom**: Old data in CSV files
**Solution**: Files are appended, not replaced. Delete old files:
```bash
rm *_session1.csv
```

### Issue: Users Get Desynchronized
**Symptom**: One user advances, other stuck
**Solution**: This should NOT happen with new fix. If it does:
1. Check terminal for error messages
2. Check browser console for errors
3. Report the issue (this is a bug)

---

## 🎯 Success Criteria

Your system is working correctly if:

### UI/UX
- ✅ No "Car Design" column visible
- ✅ Task numbers are sequential (1 of 30, 2 of 30, etc.)
- ✅ Stevens image displays on all screens
- ✅ Tables are clean and well-formatted
- ✅ Sliders work and show correct values

### Treatment vs Control
- ✅ Treatment users see TWO sliders (u + R)
- ✅ Control users see ONE slider (u only)
- ✅ Group assignment is consistent throughout

### Partner Synchronization
- ✅ Fast user waits for slow user
- ✅ Both users must complete before advancing
- ✅ Terminal shows sync messages
- ✅ No user gets skipped
- ✅ Both users see same task number

### Data Logging
- ✅ CSV files created for both groups
- ✅ All columns have data
- ✅ Intention values (1-10) logged
- ✅ Final choices (A/B/C/Y) logged
- ✅ u and R percentiles logged
- ✅ Timestamps present
- ✅ Partner names correct

### Overall Flow
- ✅ Login → Demographics → Pre-survey → 30 Tasks → Post-survey → Thank you
- ✅ Auto-advance works
- ✅ No crashes or freezes
- ✅ No JavaScript errors in console
- ✅ No server errors in terminal

---

## 📝 Testing Notes Template

Use this to record your findings:

```
TEST DATE: _______________
TESTER: _______________

PHASE 1 - Single User:
- Treatment user (user01): ☐ Pass ☐ Fail
  Issues: _______________

PHASE 2 - Synchronization:
- Fast vs Slow test: ☐ Pass ☐ Fail
  Issues: _______________
- Different stages test: ☐ Pass ☐ Fail
  Issues: _______________

PHASE 3 - Control Group:
- UI verification: ☐ Pass ☐ Fail
  R percentile hidden: ☐ Yes ☐ No
  Issues: _______________

PHASE 4 - Mixed Group:
- user05 + user06: ☐ Pass ☐ Fail
  Issues: _______________

PHASE 5 - Data:
- CSV files created: ☐ Yes ☐ No
- Data looks correct: ☐ Yes ☐ No
  Issues: _______________

OVERALL ASSESSMENT:
☐ Ready for real experiment
☐ Minor issues need fixing
☐ Major issues found

NOTES:
_______________________________________________
_______________________________________________
```

---

## 🚀 Quick Start Command

```bash
# Start fresh testing session
cd /home/mzarreh/projects2/stratdyn

# Backup old data (optional)
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
mv *_session1.csv backups/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null

# Verify server is running
ps aux | grep "node.*www" | grep -v grep

# If not running, start it
# npm start

# Open browsers
echo "✓ Server ready at http://localhost:3000"
echo ""
echo "Test users:"
echo "  Treatment: user01/pass01, user02/pass02, user05/pass05"
echo "  Control:   user03/pass03, user04/pass04, user06/pass06"
echo "  Admin:     admin/attila"
```

---

## ✅ Final Pre-Flight Checklist

Before starting tests:
- ☐ Server is running
- ☐ No syntax errors
- ☐ Two browsers ready
- ☐ Terminal visible (for watching sync messages)
- ☐ Browser consoles open (F12)
- ☐ This checklist printed/visible
- ☐ Ready to take notes

**Everything looks great! You're ready to test! 🎉**

Good luck with your experiment! 🚀
