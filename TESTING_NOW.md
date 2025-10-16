# 🧪 Live Testing Session - October 16, 2025

## ✅ Pre-Test Status
- Server: Running (http://localhost:3000)
- Old data: Backed up
- Branch: feature/ui-intention-finalchoice ✓

---

## 🎯 Quick Test Plan (15-20 minutes)

### Test 1: Treatment User (5 min)
**Browser 1**: http://localhost:3000

**Step 1.1: Login**
- Username: `user01`
- Password: `pass01`
- ✓ Stevens image shows?
- ✓ Demographics survey appears?

**Step 1.2: Demographics**
- Fill: Age, Gender, Language, etc.
- Click "Continue"
- ✓ Auto-advances to pre-survey?

**Step 1.3: Pre-Survey**
- Answer 9 questions (use any values)
- Click "Continue"
- ✓ Auto-advances to Task 1?

**Step 1.4: Task 1 - Part 1 (Intention)**
- ✓ Shows "Task 1 of 30"? (NOT "Task 1" alone)
- ✓ Table has NO "Car Design" column?
- ✓ 4 options visible (A, B, C, Y)?
- ✓ Individual Difficulty slider (visual)?
- ✓ Intention slider (1-10) movable?
- Move slider to 7
- Click "Submit My Intention"

**Step 1.5: Task 1 - Part 2 (Choice)**
- ✓ Shows "Task 1 of 30"?
- ✓ Individual Difficulty slider?
- ✓ Paired Difficulty (R) slider VISIBLE? (treatment)
- Click row A (or B/C/Y)
- ✓ Row highlights blue?
- Click "Submit My Decision"
- ✓ STAYS on Task 1? (waiting for user02)

**CHECKPOINT**: user01 is now waiting for partner ✓

---

### Test 2: Partner Synchronization (10 min)
**Browser 2**: http://localhost:3000 (Incognito: Ctrl+Shift+N)

**Step 2.1: user02 Setup**
- Username: `user02`
- Password: `pass02`
- Complete demographics quickly
- Complete pre-survey quickly
- Reach Task 1 Part 1

**Step 2.2: Test Sync - Part 1**
- Browser 1 (user01): Already on Part 2, waiting
- Browser 2 (user02): Still on Part 1
- ✓ user01 NOT skipped ahead?
- Submit intention (user02)
- ✓ user02 advances to Part 2?

**Step 2.3: Test Sync - Part 2**
- Both browsers: Now on Task 1 Part 2
- Browser 1 (user01): Already submitted
- Browser 2 (user02): Make choice
- Click row and submit
- ✓ BOTH browsers advance to Task 2?

**Step 2.4: Verify Sequential Numbers**
- Both browsers: Should show "Task 2 of 30"
- Complete Task 2 (both users)
- ✓ Both show "Task 3 of 30"?
- ✓ Numbers are sequential (not 2 → 11 → 16)?

---

### Test 3: Control Group (5 min)
**Browser 3**: http://localhost:3000 (new tab or window)

**Step 3.1: Control User Login**
- Username: `user03`
- Password: `pass03`
- Complete demographics + pre-survey
- Reach Task 1 Part 2

**Step 3.2: Verify R is Hidden**
- ✓ Individual Difficulty slider visible?
- ✓ Paired Difficulty (R) slider HIDDEN?
- ✓ NO mention of "R percentile"?

**CRITICAL**: Control group should NOT see R percentile!

---

## 📊 Data Verification (2 min)

### Check CSV Files
```bash
cd /home/mzarreh/projects2/stratdyn
ls -lh *_session1.csv
```

**Expected files:**
- task_treatment_session1.csv
- task_control_session1.csv
- demographics_survey_treatment_session1.csv
- demographics_survey_control_session1.csv
- presurvey_treatment_session1.csv
- presurvey_control_session1.csv

### Check CSV Content
```bash
# View headers
head -1 task_treatment_session1.csv

# View data
head -3 task_treatment_session1.csv | tail -2
```

**Verify:**
- ✓ 15 columns present?
- ✓ Intention values (1-10)?
- ✓ Final choices (A/B/C/Y)?
- ✓ u and R percentiles?
- ✓ Partner names correct?

---

## ✅ Success Criteria

### UI/UX
- [ ] No "Car Design" column
- [ ] Sequential task numbers (1, 2, 3...)
- [ ] Stevens image displays
- [ ] Tables look clean

### Groups
- [ ] Treatment sees u + R (2 sliders)
- [ ] Control sees only u (1 slider)

### Synchronization
- [ ] Fast user waits for slow user
- [ ] Both advance together
- [ ] No one skipped

### Data
- [ ] CSV files created
- [ ] All fields populated
- [ ] Correct groups

---

## 🐛 Issues Found

**Record any problems here:**

Issue 1:
- What: _______________________
- When: _______________________
- Browsers: _______________________

Issue 2:
- What: _______________________
- When: _______________________
- Browsers: _______________________

---

## 📝 Test Results

Date: ________________
Time: ________________

**Overall Status:**
- [ ] ✅ All tests passed - Ready for production!
- [ ] ⚠️ Minor issues - Need small fixes
- [ ] ❌ Major issues - Need significant work

**Notes:**
_________________________________________
_________________________________________
_________________________________________

---

## 🚀 Ready to Start?

1. Open Browser 1: http://localhost:3000
2. Open Browser 2 (incognito): Ctrl+Shift+N → http://localhost:3000
3. Follow the steps above
4. Check off items as you go ✓

**Let's test!** 🎯
