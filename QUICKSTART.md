# Stratdyn Experiment - Quick Start Guide

## 📋 Overview
This is a two-stage collaborative decision-making experiment with treatment vs control groups.
- **Treatment group**: Sees both Individual (u) and Paired (R) difficulty percentiles
- **Control group**: Sees only Individual (u) difficulty percentile

## 🚀 Starting the Server

### From Terminal:
```bash
cd /home/mzarreh/projects2/stratdyn
npm start
```

The server will start on **port 3000**

### To Stop the Server:
Press `Ctrl+C` in the terminal, or:
```bash
pkill -f "node.*www"
```

## 🌐 Access the Application

Open your browser and go to:
```
http://localhost:3000
```

## 👤 Login Credentials

### Treatment Group Users (see u + R percentiles):
- **user01** / pass01
- **user02** / pass02
- **user05** / pass05

### Control Group Users (see only u percentile):
- **user03** / pass03
- **user04** / pass04
- **user06** / pass06

### Admin (controls experiment flow):
- **admin** / attila

### User Pairing:
- user01 ↔ user02 (both treatment)
- user03 ↔ user04 (both control)
- user05 ↔ user06 (mixed: treatment + control)

## 🧪 Testing Mode

The system is currently in **auto-advance mode** for easy testing.

### What Auto-Advance Does:
- After demographics survey → automatically advances to pre-survey
- After pre-survey → automatically advances to first task
- After each task → automatically advances to next task
- After all 30 tasks → advances to post-survey
- After post-survey → shows thank you screen

### To Disable Auto-Advance (for real experiment):
Edit `stratdyn.js` line 41:
```javascript
let autoAdvance = false; // Change true to false
```

Then restart the server. With auto-advance off, you'll need an admin to control progression.

## 📊 Experiment Flow

1. **Login** (user credentials)
2. **Demographics Survey** (age, gender, etc.)
3. **Pre-Survey** (9 questions)
4. **30 Tasks** - Each task has two stages:
   - **Part 1: Intention** (1-10 scale)
   - **Part 2: Final Choice** (A, B, C, or Y)
5. **Post-Survey** (9 questions)
6. **Thank You Screen**

## 🔍 Key Testing Scenarios

### Scenario 1: Test Treatment Group
1. Login as `user01` / `pass01`
2. Complete demographics & pre-survey
3. In **Part 2** of any task, verify:
   - ✅ You see **TWO sliders**: Individual (u) AND Paired (R) difficulty
4. Complete 2-3 tasks to verify consistency

### Scenario 2: Test Control Group
1. Login as `user03` / `pass03`
2. Complete demographics & pre-survey
3. In **Part 2** of any task, verify:
   - ✅ You see **ONE slider**: Only Individual (u) difficulty
   - ✅ R percentile slider is **hidden**
4. Complete 2-3 tasks to verify consistency

### Scenario 3: Test Full Flow
1. Login as any user
2. Complete all surveys and 30 tasks
3. Verify thank you screen appears
4. Check CSV files were created (see below)

## 📁 Data Files

### CSV Logs (created automatically):
```
task_treatment_session1.csv       # Treatment group task data
task_control_session1.csv         # Control group task data
presurvey_treatment_session1.csv  # Treatment pre-survey
presurvey_control_session1.csv    # Control pre-survey
postsurvey_treatment_session1.csv # Treatment post-survey
postsurvey_control_session1.csv   # Control post-survey
demographics_survey_treatment_session1.csv
demographics_survey_control_session1.csv
```

### View CSV Files:
```bash
cd /home/mzarreh/projects2/stratdyn

# Check if files exist
ls -lh *_session1.csv

# View treatment group task data
cat task_treatment_session1.csv

# View control group task data
cat task_control_session1.csv

# Count how many tasks completed
wc -l task_treatment_session1.csv
```

### CSV Columns (task files):
```
timestamp,username,group,partner,task,intention,intentionTimestamp,
uValue,uPercentile,rValue,rPercentile,finalChoice,finalChoiceTimestamp,
score,partnerScore
```

## 🐛 Troubleshooting

### Server Won't Start
**Error**: Port 3000 already in use
```bash
# Check what's using port 3000
lsof -i :3000

# Kill existing node process
pkill -f "node.*www"

# Try starting again
npm start
```

### Server Crashes
**Error**: Cannot read properties of undefined
- Check that you're using valid user credentials (user01-user06)
- Check that experiment.json has assignments for all users

### Page Doesn't Load
```bash
# Check if server is running
ps aux | grep node

# Check for errors in terminal
# Look for any red error messages

# Restart server
pkill -f "node.*www"
npm start
```

### Surveys Don't Advance
- Make sure `autoAdvance = true` in stratdyn.js
- Check browser console (F12) for JavaScript errors
- Verify server terminal shows no errors

### R Percentile Shows for Control Group (or vice versa)
- Check user credentials in `data/userCredentials.json`
- user01, user02, user05 should have `"group": "treatment"`
- user03, user04, user06 should have `"group": "control"`

## 🔧 Configuration Files

### Important Files:
```
/home/mzarreh/projects2/stratdyn/
├── stratdyn.js                    # Main server (backend logic)
├── public/
│   ├── index.html                 # Frontend UI
│   └── index.js                   # Frontend JavaScript
├── data/
│   ├── experiment.json            # 30 tasks + assignments
│   ├── userCredentials.json       # User logins + groups
│   └── adminCredentials.json      # Admin login
└── utils/
    └── calculations.js            # u/R percentile calculations
```

### Change Session ID:
Edit `stratdyn.js` line 43:
```javascript
let sessionId = 'session1'; // Change to 'session2', etc.
```
This creates new CSV files for each session.

## 📝 Making Changes

### Add New Users:
Edit `data/userCredentials.json`:
```json
{
    "user07": {
        "passcode": "pass07",
        "group": "treatment"
    }
}
```

Also add to `data/experiment.json` in `partners` and `assignments` sections.

### Change Number of Tasks:
- Requires modifying `data/experiment.json`
- Run `python3 generate_assignments.py` to regenerate assignments

### Modify Survey Questions:
- Edit `public/index.html` (search for "demographics-survey" or "main-survey")

## 🎯 Ready for Real Experiment

Before running the actual experiment:

1. **Disable Auto-Advance**:
   ```javascript
   let autoAdvance = false;
   ```

2. **Reset CSV Files**:
   ```bash
   rm *_session1.csv
   # Or create a new session:
   # Change sessionId = 'session2' in stratdyn.js
   ```

3. **Admin Control**:
   - Open admin panel: http://localhost:3000 (login as admin/attila)
   - Use "Next" button to advance all users together
   - Monitor user progress in real-time

4. **Test with Real Users**:
   - Have users login with their credentials
   - Admin advances everyone through stages together
   - All users see same task at same time

## 📚 Additional Documentation

- `TESTING_GUIDE.md` - Detailed step-by-step testing instructions
- `ROBOT_REMOVAL_COMPLETE.md` - Changes made to remove robot feature
- `CONTROL_VS_TREATMENT.md` - Group system implementation
- `BACKEND_COMPLETE.md` - Two-stage backend implementation
- `FRONTEND_COMPLETE.md` - Two-stage UI implementation
- `PAIRING_LOGIC.md` - 5×5 pairing matrix explanation

## 💡 Quick Tips

- **Browser Console**: Press F12 to see JavaScript errors
- **Server Logs**: Watch terminal for backend errors
- **Test Both Groups**: Always test treatment AND control users
- **CSV Verification**: Check CSV files after each test
- **Auto-Advance**: Great for testing, disable for real experiments
- **Session Management**: Change sessionId for each new experiment run

## 🆘 Need Help?

1. Check terminal for error messages
2. Check browser console (F12) for JavaScript errors
3. Verify you're using correct credentials (user01-user06)
4. Make sure server is running (`npm start`)
5. Try restarting the server
6. Check documentation files listed above

## 🎉 Success Indicators

Your system is working correctly if:
- ✅ Server starts without errors
- ✅ Users can login successfully
- ✅ Demographics survey advances to pre-survey
- ✅ Pre-survey advances to tasks
- ✅ Part 1 (Intention) advances to Part 2 (Choice)
- ✅ Treatment users see TWO sliders (u + R)
- ✅ Control users see ONE slider (u only)
- ✅ Tasks advance automatically (with autoAdvance=true)
- ✅ CSV files are created and contain data
- ✅ All 30 tasks can be completed
- ✅ Thank you screen appears at the end

---

**Last Updated**: October 2025  
**Project**: Stratdyn Collaborative Decision-Making Experiment  
**Version**: Two-Stage Design (Intention + Choice) with u/R Percentiles
