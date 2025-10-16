# 🚨 Fundamental Design Issues - Analysis & Recommendations

## Date
October 16, 2025 - 10:45 AM

---

## Issues Identified

### Issue #1: Users Logged Out After First Decision ❌
**Symptom:** After submitting final decision in Task 1, system returns to login page

**Root Cause:** When the first user completes a task and the partner hasn't, we call:
```javascript
showWaitScreen(socket);
```

However, `socket` might be a stale reference or there's a disconnection happening.

---

### Issue #2: Late Joiners Skip Surveys ❌
**Symptom:** When user01 is on Task 1 and user02 logs in later, user02 goes directly to Task 1 (skipping demographics and pre-survey)

**Root Cause:** **GLOBAL `currentTaskIndex`** - All users share the same task index!

```javascript
var currentTaskIndex = -3;  // ❌ GLOBAL STATE!
```

When user01 advances from demographics (-2) → pre-survey (-1) → task 0, the global `currentTaskIndex` changes. Then when user02 logs in and calls `showContent()`, it sees `currentTaskIndex = 0` and shows Task 1 instead of demographics.

---

## Why This Is Critical

### Current Architecture (Flawed)
```
Global State:
├── currentTaskIndex = 0 (shared by ALL users)
├── userProgress = { user01: 0, user02: -1 }
└── users = { user01: {...}, user02: {...} }

Login Flow:
user02 logs in
    ↓
showContent(socket) called
    ↓
Checks: if (currentTaskIndex < -1) show demographics
    ↓
currentTaskIndex = 0 (because user01 advanced it!)
    ↓
Shows Task 1 to user02 ❌ WRONG!
```

### What Should Happen
```
Per-User State:
├── userTaskIndex = { 
│       user01: 0,     // On Task 1
│       user02: -2     // On demographics
│   }
├── userProgress = { user01: 0, user02: -1 }
└── users = { user01: {...}, user02: {...} }

Login Flow:
user02 logs in
    ↓
showContent(socket) called
    ↓
Checks: if (userTaskIndex[user02] < -1) show demographics
    ↓
userTaskIndex[user02] = -2 ✅
    ↓
Shows demographics to user02 ✅ CORRECT!
```

---

## Architectural Solutions

### Option A: Per-User Task Index (RECOMMENDED)

**Concept:** Track each user's current stage separately

**Implementation:**
```javascript
// Instead of:
var currentTaskIndex = -3;  // ❌ Global

// Use:
var userTaskIndex = {};  // ✅ Per-user
// Example: { user01: 0, user02: -2, user03: -1 }
```

**Changes Required:**
1. Initialize `userTaskIndex[username] = -3` on login
2. Replace all `currentTaskIndex` with `userTaskIndex[username]`
3. Partner sync checks both users' individual indices
4. Each user progresses independently through surveys
5. Partner sync only applies to actual tasks (index >= 0)

**Pros:**
- ✅ Users can join at different times
- ✅ Each user completes their own surveys
- ✅ Clean separation of concerns
- ✅ No race conditions from global state

**Cons:**
- ⚠️ Requires significant refactoring (~50-100 lines)
- ⚠️ Must test all edge cases

---

### Option B: Session-Based Progression (ALTERNATIVE)

**Concept:** Lock users into sessions - all users must join before starting

**Implementation:**
```javascript
var sessionStarted = false;
var requiredUsers = ['user01', 'user02', 'user03', 'user04', 'user05', 'user06'];

// On login:
if (!sessionStarted && allUsersJoined()) {
    sessionStarted = true;
    currentTaskIndex = -2;  // Start everyone together
    io.emit("session-started");
}
```

**Pros:**
- ✅ Simpler implementation
- ✅ Everyone starts together
- ✅ Easier to manage

**Cons:**
- ❌ Users must all be present at start time
- ❌ If one user disconnects, entire session breaks
- ❌ Not flexible for real-world experiments

---

### Option C: Hybrid Approach (BEST FOR YOUR USE CASE)

**Concept:** Per-user indices + synchronized task stages

**Implementation:**
```javascript
var userTaskIndex = {};  // Individual progress
var userProgress = {};   // Task completion tracking

// Users progress independently through:
// -3 (wait) → -2 (demographics) → -1 (pre-survey)

// Partner sync starts at task 0:
// Both partners must be at task 0+ to see tasks
// If partner not ready, show "Waiting for partner to complete surveys..."
```

**Workflow:**
1. user01 logs in → demographics → pre-survey → reaches task 0
2. user01 sees: "Waiting for partner (user02) to complete surveys..."
3. user02 logs in (later) → demographics → pre-survey → reaches task 0
4. BOTH advance to Task 1 together
5. From this point, standard partner sync applies

**Pros:**
- ✅ Flexible timing - users can join late
- ✅ Everyone completes surveys
- ✅ Partner sync only for actual tasks
- ✅ Clear user messaging

**Cons:**
- ⚠️ Moderate complexity
- ⚠️ Need to update wait screen messages

---

## Immediate Fixes (Without Major Refactoring)

### Quick Fix #1: Fix Wait Screen Logout Issue

**Problem:** `showWaitScreen(socket)` might be using stale socket reference

**Solution:**
```javascript
// Instead of:
showWaitScreen(socket);

// Use:
if (users[username]) {
    showWaitScreen(users[username].socket);
}
```

---

### Quick Fix #2: Prevent Late Joiners From Skipping

**Problem:** Late joiners see advanced `currentTaskIndex`

**Temporary Solution:** Add user-specific tracking
```javascript
// Add at top with other vars:
var userStartedSurveys = {};

// In login handler:
if (!userStartedSurveys[username]) {
    userStartedSurveys[username] = false;
    // Force show demographics
    showDemographicsSurveyScreen(socket);
    return;
}

// After demographics submitted:
userStartedSurveys[username] = true;
```

This forces new users to start at demographics regardless of global `currentTaskIndex`.

---

## My Recommendation

### SHORT-TERM (Next 30 minutes)
Apply **Quick Fixes #1 and #2** to make testing viable today.

**Why?** 
- Minimal code changes
- Gets testing back on track
- Buys time for proper refactoring

### MEDIUM-TERM (Before production)
Implement **Option C: Hybrid Approach** with per-user task indices.

**Why?**
- Proper architecture for paired experiments
- Handles real-world scenarios (late joiners, disconnections)
- Scalable and maintainable

### LONG-TERM (Future experiments)
Consider framework/library for managing:
- User sessions
- Paired synchronization
- State management
- Disconnection recovery

---

## Implementation Plan

### Phase 1: Emergency Fixes (NOW)
1. Fix wait screen socket reference
2. Add userStartedSurveys tracking
3. Force demographics for new logins
4. Test with 2 browsers

### Phase 2: Per-User Index (BEFORE PRODUCTION)
1. Add `userTaskIndex = {}` 
2. Initialize on login: `userTaskIndex[username] = -3`
3. Replace `currentTaskIndex` with `userTaskIndex[username]` in:
   - showContent()
   - submit-demographics-survey
   - submit-survey (pre-survey)
   - submit-decision (with partner check)
4. Update partner sync to compare indices
5. Comprehensive testing

### Phase 3: Enhanced UX (POLISH)
1. Better wait messages ("Waiting for partner to finish surveys...")
2. Progress indicators per user
3. Disconnection handling
4. Admin dashboard showing each user's status

---

## Questions to Consider

1. **Should late joiners be allowed?**
   - If YES → Must use per-user indices (Option A or C)
   - If NO → Can use session lock (Option B)

2. **What happens if a user disconnects mid-experiment?**
   - Should partner wait indefinitely?
   - Should we have a timeout?
   - Can disconnected user rejoin?

3. **Should surveys be synchronized?**
   - Current design: No (good!)
   - Tasks: Yes (good!)

4. **How many sessions will you run?**
   - Multiple sessions → Need session management
   - Single session → Can hardcode more

---

## Decision Time

**What do you want to do?**

**Option 1:** Quick fixes only (test today, refactor later)
**Option 2:** Full per-user index refactoring (proper fix, 1-2 hours work)
**Option 3:** Hybrid approach (best balance, ~45 min work)

Let me know and I'll implement whichever you choose!
