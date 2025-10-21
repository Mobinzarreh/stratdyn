# 📋 Advisor Feedback #1: Randomization Analysis & Implementation

**Date:** October 21, 2025  
**Advisor:** Dr. Paul T. Grogan  
**Topic:** Experiment Structure, Group Assignment, and Option Randomization

---

## ✅ Current Status: What's Working

### 1. User-Level Group Assignment ✅
**Implementation:** `data/userCredentials.json`
```json
{
    "user01": {"passcode": "pass01", "group": "treatment"},
    "user02": {"passcode": "pass02", "group": "treatment"},
    "user03": {"passcode": "pass03", "group": "control"},
    "user04": {"passcode": "pass04", "group": "control"},
    "user05": {"passcode": "pass05", "group": "treatment"},
    "user06": {"passcode": "pass06", "group": "control"}
}
```

**✅ Confirmed:** Group assignment is user-level, not global  
**✅ Confirmed:** Predetermined assignments work correctly  
**✅ Confirmed:** Treatment sees R percentile, control does not

### 2. Experiment Structure ✅
- Demographics survey ✅
- Pre-survey (main survey) ✅
- 30 experiment tasks ✅
- Post-survey ✅
- JSON configuration easily modifiable ✅

### 3. Pairing Logic ✅
**Implementation:** `data/experiment.json`
```json
"partners": {
    "user01": "user02",
    "user02": "user01",
    "user03": "user04",
    "user04": "user03",
    "user05": "user06",
    "user06": "user05"
}
```

**✅ Confirmed:** Predetermined pairs work correctly

---

## ❌ ISSUE FOUND: No Option Randomization!

### Current Implementation
Options are displayed in **FIXED ORDER** as defined in experiment.json:
1. Option A (collaborative)
2. Option B (collaborative)
3. Option C (collaborative)
4. Option Y (individual)

**Location:** `stratdyn.js` line 125-167 in `showDesignTask()`

### The Problem
```javascript
// Current code sends task.options as-is (NO randomization)
let task = JSON.parse(JSON.stringify(
    experiment.tasks[experiment.assignments[username][taskIndex]]
));
// ... task is sent to client with original option order
context.emit('show-design-task', task);
```

### Systematic Bias Risk
- Users may develop response patterns based on position (always choose top option)
- Order effects: options shown first may be chosen more often
- Learning effects: users may recognize patterns in fixed ordering

---

## 🎯 Solution: Implement True Randomization

### Requirements
1. **Randomize collaborative options (A, B, C)** for each task
2. **Keep Y (individual option) always last** (for consistency)
3. **Per-user, per-task randomization** (different for each user)
4. **Log the presented order** for analysis
5. **Map responses back to original labels** for payoff calculation

### Implementation Strategy

#### Option 1: Server-Side Randomization (RECOMMENDED)
**Pros:**
- ✅ Guaranteed randomization
- ✅ Easy to log presented order
- ✅ Client doesn't need changes
- ✅ Consistent across refreshes (can use seeded random)

**Cons:**
- ⚠️ Need to track randomization per user/task

#### Option 2: Client-Side Randomization
**Pros:**
- ✅ Simpler server code
- ✅ Automatic per-user variation

**Cons:**
- ❌ Harder to log/track
- ❌ Changes on page refresh
- ❌ Less control

**RECOMMENDATION:** Use Option 1 (Server-Side)

---

## 📝 Implementation Plan

### Step 1: Add Randomization Function
```javascript
// Add to stratdyn.js
function shuffleCollaborativeOptions(task, username, taskIndex) {
    // Separate collaborative (A, B, C) from individual (Y)
    const collaborative = task.options.slice(0, 3); // A, B, C
    const individual = task.options[3]; // Y
    
    // Fisher-Yates shuffle (true randomization)
    for (let i = collaborative.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [collaborative[i], collaborative[j]] = [collaborative[j], collaborative[i]];
    }
    
    // Recombine: shuffled collaborative + individual at end
    task.options = [...collaborative, individual];
    
    // Store the presented order for logging
    task.presentedOrder = task.options.map(opt => opt.label);
    
    return task;
}
```

### Step 2: Apply Randomization in showDesignTask()
```javascript
function showDesignTask(context, stage = 'intention') {
    const taskIndex = userTaskIndex[username] || 0;
    
    let task = JSON.parse(JSON.stringify(
        experiment.tasks[experiment.assignments[username][taskIndex]]
    ));
    
    // ... existing code for partner, u-value, r-value ...
    
    // NEW: Randomize collaborative option order
    task = shuffleCollaborativeOptions(task, username, taskIndex);
    
    // ... rest of existing code ...
    
    context.emit('show-design-task', task);
}
```

### Step 3: Log Presented Order in CSV
Update CSV headers to include:
```
timestamp,username,group,partner,task,intention,intentionTimestamp,uValue,uPercentile,rValue,rPercentile,finalChoice,finalChoiceTimestamp,presentedOrder,score,partnerScore
```

Add to logging:
```javascript
(task.presentedOrder ? task.presentedOrder.join(';') : 'A;B;C;Y') + ","
```

### Step 4: Verify Mapping in Payoff Calculation
Ensure payoff lookup uses **original labels**, not presented order.

Current code already does this correctly (uses `design` label like "A", "B", etc.)

---

## 🔬 Testing Plan

### Test 1: Verify Randomization
```javascript
// Add temporary logging
console.log(`User ${username} Task ${taskIndex}: Order = ${task.presentedOrder}`);
```

Run multiple users through same tasks, confirm different orders.

### Test 2: Verify True Randomness
- Run 100 trials
- Check distribution: each option should appear in each position ≈33% of time
- Chi-square test for uniformity

### Test 3: Verify Y Always Last
- Check all tasks
- Confirm Y (individual) never appears in positions 0, 1, 2

### Test 4: Verify Payoff Calculation
- User chooses "A" (which was presented in position 2)
- Partner chooses "B" (which was presented in position 1)
- Confirm payoffs calculated correctly using original labels

---

## 📊 Analysis Considerations

### Data You'll Have
1. `finalChoice` - The label chosen (A, B, C, or Y)
2. `presentedOrder` - The order shown to user (e.g., "B;C;A;Y")
3. Position chosen - Can derive from above

### Position Effect Analysis
```python
# Example analysis
df['position_chosen'] = df.apply(
    lambda row: row['presentedOrder'].split(';').index(row['finalChoice']), 
    axis=1
)

# Test for position bias
position_counts = df['position_chosen'].value_counts()
chi2_stat, p_value = chisquare(position_counts)
```

---

## 🤔 Design Questions for Dr. Grogan

### Question 1: Randomization Scope
Should randomization be:
- **A) Per-user, per-task** (different order each task, different for each user)
- **B) Per-user only** (same order for user across all tasks, but different users see different orders)
- **C) Per-task only** (all users see same random order for each task)

**Recommendation:** A (most rigorous)

### Question 2: Y Position
Should Y (individual option) be:
- **A) Always last** (as currently proposed)
- **B) Also randomized** (appears anywhere in list)

**Recommendation:** A (keeps individual vs collaborative distinction clear)

### Question 3: Seeded vs True Random
Should randomization be:
- **A) True random** (different each session)
- **B) Seeded by user ID** (reproducible for same user)

**Recommendation:** A (avoids potential patterns)

### Question 4: Intention Stage Randomization
Should option order be:
- **A) Same for Part 1 (Intention) and Part 2 (Choice)** within same task
- **B) Re-randomized between Part 1 and Part 2**

**Recommendation:** A (consistency within task)

---

## ✅ Implementation Checklist

- [ ] Add `shuffleCollaborativeOptions()` function
- [ ] Apply randomization in `showDesignTask()`
- [ ] Update CSV header to include `presentedOrder`
- [ ] Update CSV logging to save presented order
- [ ] Add console logging for verification
- [ ] Test with multiple users
- [ ] Verify statistical randomness
- [ ] Verify payoff calculations still work
- [ ] Remove debug logging before production
- [ ] Document randomization in methods section

---

## 📈 Expected Outcomes

### Before Randomization
- Users might always choose option A (position bias)
- Can't separate position effects from option effects
- Systematic bias in results

### After Randomization
- Position effects neutralized
- True preferences revealed
- More rigorous experimental design
- Can analyze position effects separately

---

## 🚀 Ready to Implement?

**Estimated Time:** 30-45 minutes

**Steps:**
1. Implement randomization function
2. Update CSV logging
3. Test with sample users
4. Verify randomness
5. Commit changes

**Should I proceed with implementation?**

Let me know if you want to discuss any design questions with Dr. Grogan first, or if you'd like me to implement this now.
