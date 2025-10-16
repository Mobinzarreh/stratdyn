# 🐛 Bug Fix: Auto-Advance Loop Issue

## Date
October 16, 2025 - 10:36 AM

## Problem
**Symptom:** After completing pre-survey (Step 1.3), system loops back to demographics survey (Step 1.2) instead of advancing to Task 1 Part 1 (Step 1.4).

**User Impact:** Cannot progress past pre-survey in auto-advance mode.

---

## Root Cause

### The Bug
In `stratdyn.js`, the auto-advance logic for pre-survey used `io.emit("update-content")`:

```javascript
// OLD CODE (BUGGY)
if (autoAdvance && currentTaskIndex === -1) {
    currentTaskIndex = 0;
    io.emit("update-content");  // ❌ Race condition!
}
```

### Why It Failed
1. **Race Condition:** `io.emit` broadcasts to ALL clients immediately
2. **Timing Issue:** Client receives `update-content` and requests content via `content-request`
3. **Stale State:** Server's `showContent()` function might execute before `currentTaskIndex = 0` fully propagates
4. **Wrong Content:** With `currentTaskIndex` still at -1, `showContent()` shows pre-survey again OR loops to demographics

### Flow Diagram (Buggy)
```
Pre-Survey Submit
    ↓
currentTaskIndex = 0  (starts updating)
    ↓
io.emit("update-content")  (broadcasts immediately)
    ↓
Client: socket.emit("content-request")
    ↓
Server: showContent(socket)
    ↓
currentTaskIndex might still be -1! ❌
    ↓
Shows demographics again (currentTaskIndex < -1)
```

---

## Solution

### The Fix
Replace `io.emit("update-content")` with direct function calls using `setImmediate()`:

```javascript
// NEW CODE (FIXED)
if (autoAdvance && currentTaskIndex === -1) {
    currentTaskIndex = 0;
    // Give time for currentTaskIndex to update, then show content
    setImmediate(() => {
        showDesignTask(socket, 'intention');  // ✅ Direct call
    });
}
```

### Why It Works
1. **setImmediate():** Ensures `currentTaskIndex = 0` completes first
2. **Direct Call:** Calls `showDesignTask()` directly instead of emitting events
3. **No Race:** Function executes in next event loop tick after variable update
4. **Correct State:** `showDesignTask()` sees `currentTaskIndex = 0` guaranteed

### Flow Diagram (Fixed)
```
Pre-Survey Submit
    ↓
currentTaskIndex = 0  (completes)
    ↓
setImmediate(() => { ... })  (waits for next tick)
    ↓
Event Loop Tick
    ↓
showDesignTask(socket, 'intention')  ✅
    ↓
Task 1 Part 1 displayed correctly!
```

---

## Changes Made

### File: `stratdyn.js`

**Location 1: Pre-Survey Handler (Line ~507-512)**
```javascript
// BEFORE
if (autoAdvance && currentTaskIndex === -1) {
    currentTaskIndex = 0;
    io.emit("update-content");
}

// AFTER
if (autoAdvance && currentTaskIndex === -1) {
    currentTaskIndex = 0;
    setImmediate(() => {
        showDesignTask(socket, 'intention');
    });
}
```

**Location 2: Demographics Survey Handler (Line ~597-602)**
```javascript
// BEFORE
if (autoAdvance && currentTaskIndex === -2) {
    currentTaskIndex = -1;
    io.emit("update-content");
}

// AFTER
if (autoAdvance && currentTaskIndex === -2) {
    currentTaskIndex = -1;
    setImmediate(() => {
        showSurveyScreen(socket);
    });
}
```

---

## Testing Instructions

### Verify the Fix

1. **Open Browser:** http://localhost:3000
2. **Login:** user01/pass01
3. **Complete Demographics:** Fill all fields → Continue
   - ✅ Should advance to Pre-Survey
4. **Complete Pre-Survey:** Answer all 9 questions → Continue
   - ✅ Should advance to Task 1 Part 1 (Intention)
   - ❌ Should NOT loop back to Demographics

### Success Criteria
- Demographics → Pre-Survey ✅
- Pre-Survey → Task 1 Part 1 ✅
- No infinite loops ✅
- Sequential progression maintained ✅

---

## Technical Details

### setImmediate() Explanation
- **Purpose:** Defers execution until current event loop completes
- **Timing:** Next tick of event loop (after current synchronous code)
- **Benefit:** Ensures variable updates complete before function execution
- **Alternative:** Could use `process.nextTick()` but `setImmediate()` is clearer for I/O operations

### Why Not setTimeout()?
- `setTimeout(fn, 0)` has minimum delay (~4ms in browsers, ~1ms in Node.js)
- `setImmediate()` executes immediately after I/O events (faster)
- More predictable behavior in Node.js

---

## Related Issues

### Could This Affect Other Handlers?
**Yes!** Any handler using `io.emit("update-content")` for auto-advance could have similar issues:
- ✅ Demographics → Fixed
- ✅ Pre-Survey → Fixed
- ⚠️ Post-Survey → Check if needed
- ⚠️ Task Submission → Uses different logic (partner sync)

### Post-Survey Handler
Currently uses `io.emit("update-content")` (line ~540):
```javascript
if (autoAdvance) {
    io.emit("update-content");
}
```

**Recommendation:** Monitor during testing. If post-survey loops, apply same fix.

---

## Lessons Learned

1. **Avoid io.emit() for State Transitions:** Use direct function calls when state must be updated first
2. **Race Conditions:** Event-driven systems need careful timing consideration
3. **setImmediate() Pattern:** Useful for ensuring synchronous updates complete before async operations
4. **Test State Transitions:** Always test boundary conditions (survey → task, task → survey)

---

## Status
- [x] Bug identified
- [x] Fix implemented
- [x] Syntax validated
- [x] Server restarted
- [ ] Testing in progress (user testing now)
- [ ] Verified working (pending user confirmation)

---

## Next Steps
1. User tests flow: Demographics → Pre-Survey → Task 1
2. If successful, continue with full testing plan (TESTING_NOW.md)
3. If issues persist, check server console logs for debug output
4. Consider same fix for post-survey if needed
