# Control vs Treatment Group Implementation

## Current System vs New System

### **CURRENT IMPLEMENTATION** ❌
```javascript
// stratdyn.js - Lines 35-39 (HARDCODED)
let taskLogFile = "task_experimentalgroup_" + 'session7.csv';
let preSurveyLogFile = "presurvey_experimentalgroup_" + 'session7.csv';
let postSurveyLogFile = "postsurvey_experimentalgroup_" + 'session7.csv';
let demographicsSurveyLogFile = "demographics_survey_experimentalgroup_" + 'session7.csv';
```

**userCredentials.json** (CURRENT):
```json
{
    "user0059": "pass0059",
    "user0060": "pass0060"
}
```

**Problem**: 
- Group is hardcoded in filenames
- All users treated as "experimentalgroup"
- No way to differentiate control vs treatment
- Must manually change code for different groups

---

## **RECOMMENDED NEW IMPLEMENTATION** ✅

### **1. Enhanced User Credentials Structure**

**userCredentials.json** (NEW):
```json
{
    "user01": {
        "passcode": "pass01",
        "group": "treatment"
    },
    "user02": {
        "passcode": "pass02",
        "group": "treatment"
    },
    "user03": {
        "passcode": "pass03",
        "group": "control"
    },
    "user04": {
        "passcode": "pass04",
        "group": "control"
    }
}
```

### **2. Backend Changes (stratdyn.js)**

```javascript
// OLD (HARDCODED):
let taskLogFile = "task_experimentalgroup_" + 'session7.csv';

// NEW (DYNAMIC):
let taskLogFile = `task_${userGroup}_session7.csv`;
// Produces: "task_treatment_session7.csv" or "task_control_session7.csv"
```

### **3. Login Logic Changes**

**BEFORE:**
```javascript
socket.on('login-request', (request) => {
    if (request.username in userCredentials
        && request.passcode == userCredentials[request.username]) {
        username = request.username;
        users[username] = socket;
    }
});
```

**AFTER:**
```javascript
socket.on('login-request', (request) => {
    if (request.username in userCredentials) {
        const userCred = userCredentials[request.username];
        // Support both old (string) and new (object) format
        const passcode = typeof userCred === 'string' ? userCred : userCred.passcode;
        const group = typeof userCred === 'string' ? 'treatment' : userCred.group;
        
        if (request.passcode == passcode) {
            username = request.username;
            users[username] = { socket: socket, group: group };
        }
    }
});
```

### **4. UI Conditional Display**

**Treatment Group** (Part 2):
```html
<!-- Show BOTH sliders -->
<div class="difficulty-slider">
    <label>Individual Collaboration Difficulty: 40%</label>
    <div class="slider">...</div>
</div>
<div class="difficulty-slider">
    <label>Paired Collaboration Difficulty: 50%</label>
    <div class="slider">...</div>
</div>
```

**Control Group** (Part 2):
```html
<!-- Show ONLY Individual slider -->
<div class="difficulty-slider">
    <label>Individual Collaboration Difficulty: 40%</label>
    <div class="slider">...</div>
</div>
<!-- Paired slider HIDDEN -->
```

### **5. Data Logging**

**CSV Files** (automatically created per group):
- `task_treatment_session1.csv`
- `task_control_session1.csv`
- `presurvey_treatment_session1.csv`
- `presurvey_control_session1.csv`
- etc.

**Log Row** (includes group info):
```csv
timestamp,username,group,partner,task,intention,uValue,uPercentile,rValue,rPercentile,finalChoice,score
1634567890,user01,treatment,user02,Task 1,7,0.62,20,0.15,35,A,90
```

---

## **Implementation Benefits** ✅

| Feature | Current | New Approach |
|---------|---------|--------------|
| Group Assignment | Hardcoded in code | Per-user in JSON |
| Flexibility | Must edit code | Edit JSON only |
| Mixed Sessions | Impossible | Possible |
| Data Separation | Manual | Automatic |
| Conditional UI | N/A | Group-based |
| Backward Compatible | N/A | Yes (supports old format) |

---

## **Experimental Design Mapping**

### **Part 1 - Intention Stage** (BOTH GROUPS SAME)
✅ Show decision table (A, B, C, Y with payoffs)  
✅ Show Individual Collaboration Difficulty slider (u percentile: 0-100)  
✅ Ask intention question (1-10 scale)  
✅ Submit and proceed to Part 2  

### **Part 2 - Choice Stage** (DIFFERS BY GROUP)

**Treatment Group:**
✅ Show decision table (same as Part 1)  
✅ Show Individual Collaboration Difficulty slider (u percentile)  
✅ **Show Paired Collaboration Difficulty slider (R percentile)** ← KEY DIFFERENCE  
✅ Make final choice (A, B, C, or Y)  
✅ Submit decision  

**Control Group:**
✅ Show decision table (same as Part 1)  
✅ Show Individual Collaboration Difficulty slider (u percentile)  
❌ **NO Paired Collaboration Difficulty slider** ← KEY DIFFERENCE  
✅ Make final choice (A, B, C, or Y)  
✅ Submit decision  

---

## **Implementation Steps**

1. ✅ Update `userCredentials.json` structure (add group field)
2. ✅ Modify login handler to read group from credentials
3. ✅ Store user group in session/socket data
4. ✅ Make CSV filename generation dynamic based on user group
5. ✅ Pass group info to frontend via socket
6. ✅ Conditionally show/hide R percentile slider in Part 2 UI
7. ✅ Log group assignment in all CSV files

---

## **Sample Implementation Code**

### Backend (stratdyn.js):
```javascript
// Store user info with group
const users = {}; // OLD: {username: socket}
const users = {}; // NEW: {username: {socket: socket, group: 'treatment'}}

// Dynamic log files
function getLogFiles(userGroup, sessionId) {
    return {
        task: `task_${userGroup}_session${sessionId}.csv`,
        presurvey: `presurvey_${userGroup}_session${sessionId}.csv`,
        postsurvey: `postsurvey_${userGroup}_session${sessionId}.csv`,
        demographics: `demographics_survey_${userGroup}_session${sessionId}.csv`
    };
}
```

### Frontend (index.js):
```javascript
// Receive user group from backend
socket.on('login-response', (data) => {
    if (data.success) {
        username = data.username;
        userGroup = data.group; // 'treatment' or 'control'
    }
});

// In Part 2 UI rendering:
if (userGroup === 'treatment') {
    showPairedDifficultySlider(rPercentile);
} else {
    hidePairedDifficultySlider();
}
```

---

## **Next Steps** 🎯

1. **Decide**: Use enhanced userCredentials with group field?
2. **Update**: Modify login logic to handle groups
3. **Implement**: Conditional UI based on group
4. **Test**: Verify both groups work correctly

**Recommendation**: Proceed with enhanced approach for maximum flexibility! ✅
