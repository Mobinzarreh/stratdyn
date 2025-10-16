# 🐛 Bug Fix #2: Partner Synchronization Stuck After Decision

## Date
October 16, 2025 - 10:40 AM

## Problem
**Symptom:** After submitting final decision in Task 1 Part 2, the system just waits forever and doesn't advance to Task 2.

**User Impact:** Cannot progress past first task completion.

---

## Root Cause

### Two Issues

**Issue 1: Race Condition (Same as Before)**
```javascript
// OLD CODE (BUGGY)
if (partnerProgress >= currentTaskIndex) {
    currentTaskIndex++;
    io.emit("update-content");  // ❌ Race condition!
}
```

Same problem as the pre-survey bug - `io.emit()` broadcasts before state updates complete.

**Issue 2: Single-User Testing**
When testing with only user01 (without user02 in a second browser):
- user01 completes task
- System checks if partner (user02) also completed
- `userProgress[user02]` is undefined → defaults to -3
- Condition `partnerProgress >= currentTaskIndex` fails
- user01 stuck waiting forever

---

## Solution

### The Fix

```javascript
// NEW CODE (FIXED)
if (partnerProgress >= currentTaskIndex) {
    currentTaskIndex++;
    console.log(`Both ${username} and ${partner} completed task ${currentTaskIndex-1}. Advancing to task ${currentTaskIndex}`);
    
    // Show next content to both users directly (avoid race condition)
    setImmediate(() => {
        if (currentTaskIndex < experiment.tasks.length) {
            // Show next task Part 1 (Intention)
            if (users[username]) showDesignTask(users[username].socket, 'intention');
            if (users[partner]) showDesignTask(users[partner].socket, 'intention');
        } else if (currentTaskIndex === experiment.tasks.length) {
            // Show post-survey
            if (users[username]) showPostSurveyScreen(users[username].socket);
            if (users[partner]) showPostSurveyScreen(users[partner].socket);
        } else {
            // Show thank you
            if (users[username]) showThankYouScreen(users[username].socket);
            if (users[partner]) showThankYouScreen(users[partner].socket);
        }
    });
} else {
    console.log(`${username} completed task ${currentTaskIndex}, waiting for ${partner}...`);
    // Show wait screen to this user
    showWaitScreen(socket);
}
```

### Key Improvements

1. **No io.emit():** Direct function calls to show content
2. **setImmediate():** Ensures state updates complete first
3. **Both Users Updated:** Explicitly shows content to both username AND partner
4. **Wait Screen:** User who finishes first sees wait screen
5. **Conditional Logic:** Handles tasks, post-survey, and thank you screens

---

## What Changed

### Partner Sync Flow (Fixed)

**Scenario 1: user01 finishes first**
```
user01 submits decision
    ↓
userProgress[user01] = 0
    ↓
Check partner: userProgress[user02] = undefined (-3)
    ↓
partnerProgress (-3) < currentTaskIndex (0) ❌
    ↓
Show wait screen to user01 ✅
    ↓
user01 sees "Waiting for partner..."
```

**Scenario 2: user02 finishes second**
```
user02 submits decision
    ↓
userProgress[user02] = 0
    ↓
Check partner: userProgress[user01] = 0 ✅
    ↓
partnerProgress (0) >= currentTaskIndex (0) ✅
    ↓
currentTaskIndex++ (now 1)
    ↓
setImmediate(() => {
    showDesignTask(user01.socket, 'intention')
    showDesignTask(user02.socket, 'intention')
})
    ↓
BOTH users see Task 2 Part 1 ✅
```

---

## Testing Requirements

### IMPORTANT: Must Test With TWO Browsers!

**Why?** The partner synchronization logic requires BOTH users to be online and completing tasks.

### Test Setup

**Browser 1:**
1. Open http://localhost:3000
2. Login: user01/pass01
3. Complete demographics → pre-survey → Task 1

**Browser 2 (Incognito):**
1. Open http://localhost:3000 (Ctrl+Shift+N)
2. Login: user02/pass02
3. Complete demographics → pre-survey → Task 1

### Expected Behavior

**Test A: Fast User Waits**
- Browser 1 (user01): Complete Task 1 Part 1 & Part 2 FIRST
- ✅ user01 should see "Waiting for partner..." screen
- Browser 2 (user02): Complete Task 1 Part 1 & Part 2
- ✅ BOTH browsers should advance to Task 2 simultaneously

**Test B: Both Complete Together**
- Both browsers: Complete Task 2 at roughly same time
- ✅ Both should advance to Task 3 together
- ✅ No waiting screen needed

**Test C: Slow User Catches Up**
- Browser 2 (user02): Complete Task 3 FIRST
- ✅ user02 sees wait screen
- Browser 1 (user01): Complete Task 3
- ✅ BOTH advance to Task 4 together

---

## Console Messages

### Watch Server Terminal For:

**When first user completes:**
```
user01 completed task 0, waiting for user02...
```

**When second user completes:**
```
Both user01 and user02 completed task 0. Advancing to task 1
```

**These messages confirm sync is working!**

---

## Single-User Testing Note

**Cannot test alone!** If you try to test with only user01:
- user01 will submit decision
- System checks for user02 (not logged in)
- user02 progress = undefined → -3
- Condition fails: -3 < 0
- user01 sees wait screen forever

**Solution:** Always test paired experiments with BOTH users in separate browsers.

---

## Files Changed

### stratdyn.js (Lines ~446-474)

**Before:**
```javascript
if (partnerProgress >= currentTaskIndex) {
    currentTaskIndex++;
    io.emit("update-content");  // ❌
    console.log(`Both completed...`);
} else {
    console.log(`Waiting for partner...`);
}
```

**After:**
```javascript
if (partnerProgress >= currentTaskIndex) {
    currentTaskIndex++;
    console.log(`Both completed...`);
    
    setImmediate(() => {
        if (currentTaskIndex < experiment.tasks.length) {
            if (users[username]) showDesignTask(users[username].socket, 'intention');
            if (users[partner]) showDesignTask(users[partner].socket, 'intention');
        } else if (currentTaskIndex === experiment.tasks.length) {
            if (users[username]) showPostSurveyScreen(users[username].socket);
            if (users[partner]) showPostSurveyScreen(users[partner].socket);
        } else {
            if (users[username]) showThankYouScreen(users[username].socket);
            if (users[partner]) showThankYouScreen(users[partner].socket);
        }
    });
} else {
    console.log(`Waiting for partner...`);
    showWaitScreen(socket);  // ✅ Show wait screen
}
```

---

## Status
- [x] Bug identified
- [x] Fix implemented
- [x] Syntax validated
- [x] Server restarted (PID 13199)
- [ ] Testing with TWO browsers (user needs to test)

---

## Next Steps

1. **Open Browser 1:** http://localhost:3000 → Login: user01/pass01
2. **Open Browser 2 (Incognito):** http://localhost:3000 → Login: user02/pass02
3. **Test Flow:**
   - Both: Complete demographics + pre-survey
   - user01: Complete Task 1 Part 1 & 2 → Should see wait screen
   - user02: Complete Task 1 Part 1 & 2 → Both should advance to Task 2
   - Continue testing 2-3 tasks to verify consistency
4. **Watch server terminal** for sync messages
5. **Report back** if it works or if new issues appear

---

## Related Fixes

- **Fix #1:** Pre-survey auto-advance loop (BUG_FIX_AUTO_ADVANCE.md)
- **Fix #2:** Partner sync stuck (this document)

**Pattern:** Both bugs caused by `io.emit("update-content")` race conditions. Solution: Use `setImmediate()` + direct function calls.
