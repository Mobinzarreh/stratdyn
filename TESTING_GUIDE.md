# Complete Testing Guide for Stratdyn Experiment

## Prerequisites Check

Before testing, ensure you have:
- ✅ Node.js installed
- ✅ All dependencies installed (`npm install`)
- ✅ Test user credentials in `data/userCredentials.json`

## Step 1: Prepare Your Testing Environment

### 1.1 Open Two Terminal Windows

You'll need:
- **Terminal 1**: To run the server
- **Terminal 2**: To monitor CSV log files

### 1.2 Clear Old Test Data (Optional)

If you want a clean start, backup or remove old CSV files:
```bash
# Create backup directory
mkdir -p test_backups
# Move old test files
mv task_treatment_session1.csv test_backups/ 2>/dev/null
mv task_control_session1.csv test_backups/ 2>/dev/null
```

## Step 2: Start the Server

### 2.1 In Terminal 1, start the server:
```bash
cd /home/mzarreh/projects2/stratdyn
npm start
```

### 2.2 Look for confirmation:
```
Stratdyn server listening on port 3000
```

### 2.3 Keep this terminal open and watch for any errors

## Step 3: Test Treatment Group User (Sees u + R)

### 3.1 Open Your Browser
- Go to: `http://localhost:3000`
- Open **Developer Console** (F12 or Ctrl+Shift+I)
- Keep Console open to watch for JavaScript errors

### 3.2 Login as Treatment User
- Username: `user0059`
- Passcode: `pass0059`
- Click "Login"

**✓ Expected:** You should proceed to demographics survey

### 3.3 Complete Demographics Survey
Fill out the form with test data:
- Age: 25
- Gender: Any option
- Click "Continue"

**✓ Expected:** You should see pre-survey questions

### 3.4 Complete Pre-Survey
Answer all questions (just use any values for testing):
- Answer all slider/text questions
- Click "Continue"

**✓ Expected:** You should see **Part 1: Intention Stage**

### 3.5 Part 1: Intention Stage (First Task)

**What you should see:**
1. **Decision Table** with 4 rows:
   - Option A, B, C (collaborative)
   - Option Y (independent)
2. **Individual Collaboration Difficulty** slider
   - Shows u percentile (0-100)
   - **Visual only** - you cannot move it
3. **Question:** "What is your intention towards collaboration?"
   - Slider from 1-10
   - **You CAN move this slider**

**Test Actions:**
1. Note the u percentile value displayed
2. Move the intention slider to any value (e.g., 7)
3. Click "Submit My Intention"

**✓ Expected:** Screen changes to **Part 2: Final Choice Stage**

### 3.6 Part 2: Final Choice Stage (First Task)

**What you should see:**
1. **Same Decision Table** with options A, B, C, Y
2. **Two Sliders** (both visual only):
   - Individual Collaboration Difficulty (u percentile)
   - **Paired Collaboration Difficulty (R percentile)** ← IMPORTANT!
3. Question: "Which option do you choose?"

**Test Actions:**
1. ✅ **VERIFY: R percentile slider IS visible** (treatment group sees this)
2. Note both u and R values
3. Click on one of the table rows (A, B, C, or Y)
4. Selected row should highlight in blue
5. Click "Submit My Decision"

**✓ Expected:** Screen advances to Part 1 of Task 2

### 3.7 Complete a Few More Tasks

Repeat Part 1 → Part 2 for 2-3 more tasks to verify consistency:
- Part 1: Set intention → Submit
- Part 2: Check R IS visible → Make choice → Submit
- Verify no errors in console

## Step 4: Test Control Group User (Sees only u)

### 4.1 Logout and Login as Control User

**In the browser:**
- Refresh the page (Ctrl+R) or go back to `http://localhost:3000`
- Username: `user0061`
- Passcode: `pass0061`
- Click "Login"

### 4.2 Complete Demographics and Pre-Survey
(Same as before - use test data)

### 4.3 Part 1: Intention Stage

**Should be identical to treatment group:**
- Decision table visible
- u percentile slider visible
- Intention slider (1-10) functional
- Submit intention

### 4.4 Part 2: Final Choice Stage

**CRITICAL TEST:**
1. Look at the sliders section
2. ✅ **VERIFY: R percentile slider is NOT visible** (control group shouldn't see this)
3. ✅ **VERIFY: Only u percentile slider is visible**
4. Make a choice and submit

**✓ Expected:** Control group sees ONLY Individual Difficulty (u), NOT Paired Difficulty (R)

### 4.5 Complete 2-3 More Tasks
Verify R remains hidden throughout all tasks for control group.

## Step 5: Verify Data Logging

### 5.1 In Terminal 2, check CSV files were created:
```bash
cd /home/mzarreh/projects2/stratdyn
ls -lh task_treatment_session1.csv task_control_session1.csv
```

### 5.2 Check Treatment Group CSV:
```bash
cat task_treatment_session1.csv
```

**✓ Expected Headers:**
```
timestamp,username,group,partner,task,intention,intentionTimestamp,uValue,uPercentile,rValue,rPercentile,finalChoice,finalChoiceTimestamp,score,partnerScore
```

**✓ Expected Data:**
- Each task should have one row
- `group` column should say "treatment"
- `intention` should have values 1-10
- `uValue`, `uPercentile`, `rValue`, `rPercentile` should have numbers
- `finalChoice` should be A, B, C, or Y
- Both timestamps should be present

### 5.3 Check Control Group CSV:
```bash
cat task_control_session1.csv
```

**✓ Expected:**
- Same headers as treatment
- `group` column should say "control"
- All fields should be populated
- R values ARE logged even though not shown to user

## Step 6: Test Complete Flow (Optional)

If you want to test the entire experiment end-to-end:

### 6.1 Complete All 30 Tasks
- This will take 10-15 minutes
- Part 1 → Part 2 for each task
- Watch for any errors or inconsistencies

### 6.2 Complete Post-Survey
After task 30, you should see:
- Post-survey questions
- Answer all questions
- Click "Continue"

### 6.3 See Thank You Screen
**✓ Expected:** Thank you message appears

## Step 7: Verification Checklist

Go through this checklist:

### User Interface:
- [ ] Part 1: u percentile slider visible (visual only)
- [ ] Part 1: Intention slider functional (1-10)
- [ ] Part 2: Treatment sees u AND R percentiles
- [ ] Part 2: Control sees ONLY u percentile
- [ ] Part 2: Table row selection works (highlights blue)
- [ ] All buttons work correctly
- [ ] No visual glitches or broken layouts

### Data Logging:
- [ ] task_treatment_session1.csv created
- [ ] task_control_session1.csv created
- [ ] Both have correct headers (15 columns)
- [ ] All fields populated correctly
- [ ] Timestamps in correct format
- [ ] Group field matches user group
- [ ] Intention values (1-10) logged
- [ ] Final choice (A/B/C/Y) logged

### Browser Console:
- [ ] No JavaScript errors
- [ ] No 404 errors (missing files)
- [ ] No socket connection errors

### Server Terminal:
- [ ] Server starts without errors
- [ ] No error messages during testing
- [ ] Socket connections established
- [ ] No crashes or warnings

## Step 8: Test Pairing Logic (Advanced)

To verify the 5×5 pairing matrix works:

### 8.1 Check experiment assignments:
```bash
cat data/experiment.json | grep -A 5 "assignments"
```

### 8.2 Run Python verification:
```bash
python3 generate_assignments.py
```

**✓ Expected:** Should show a 5×5 matrix with all combinations filled

## Common Issues and Solutions

### Issue: "Cannot GET /"
**Solution:** Make sure server is running (`npm start`)

### Issue: "Connection refused"
**Solution:** Check port 3000 is not in use: `lsof -i :3000`

### Issue: CSV files not created
**Solution:** Check file permissions in project directory

### Issue: R percentile shows for control group
**Solution:** Check browser console for errors, verify userGroup is set correctly

### Issue: Intention slider doesn't work
**Solution:** Check browser console, verify jQuery is loaded

### Issue: Table selection doesn't highlight
**Solution:** Verify Bootstrap CSS is loaded

## Next Steps After Testing

### If Everything Works:
1. Document any observations
2. System is ready for pilot testing with real participants
3. Consider creating test accounts for actual session

### If You Find Bugs:
1. Note the exact steps to reproduce
2. Check browser console for error messages
3. Check server terminal for backend errors
4. Report issue with details

## Quick Test Script

For rapid testing, you can use this sequence:

```bash
# Terminal 1: Start server
npm start

# Terminal 2: Monitor logs
watch -n 2 'wc -l task_*_session1.csv'

# Browser: Test both groups
# user0059/pass0059 (treatment) - verify R visible
# user0061/pass0061 (control) - verify R hidden

# Verify CSVs
cat task_treatment_session1.csv | head -2
cat task_control_session1.csv | head -2
```

## Testing Completed!

Once you've verified all items in the checklist, the system is ready for production use.
