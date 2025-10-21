# Feedback #2: Technical & Functional Details Implementation Plan

## Current State Analysis

### ✅ What We Have:
- Independent user progression (NO synchronization)
- Timestamps logged in CSV
- Admin dashboard (view only)

### ❌ What's Missing:
1. Admin back-step function
2. Waiting screen synchronization
3. Visible countdown timer
4. Timer penalties/warnings

---

## Implementation Tasks

### Task 1: Re-implement Partner Synchronization
**Issue:** We removed synchronization for independent users. Need to add it back!

**Requirements:**
- After user submits decision (Part 2), show waiting screen
- Wait for partner to also complete same task
- Both advance together when ready
- Server handles synchronization

### Task 2: Admin Back-Step Function
**Requirements:**
- Admin can revert user to previous task
- Only admin control (not users)
- Clear any responses after revert point

### Task 3: Countdown Timer (60 seconds)
**Requirements:**
- Visual timer on each task screen
- Starts when task presented
- Client-side only (visual feedback)
- Separate timers for Part 1 (Intention) and Part 2 (Choice)?

### Task 4: Timer Behavior
**Options:**
- **Soft constraint (recommended):** Warning when time up, but can continue
- **Penalty:** Deduct points if over time
- **Hard constraint:** Force submission at 0 seconds

### Task 5: Enhanced Timestamp Logging
**Current:** Basic timestamps
**Need:** Detailed event timestamps for analysis

---

## Questions to Address

### Q1: Timer Duration
- Same 60s for both Part 1 (Intention) and Part 2 (Choice)?
- Or different durations?

### Q2: Timer Behavior
- What happens at 0 seconds?
  - Warning message?
  - Points penalty?
  - Force submission?
  - Just visual indicator?

### Q3: Synchronization Point
- Wait after Part 1 (Intention)?
- Wait after Part 2 (Choice)? ← Recommended
- Or both?

---

## Implementation Order

1. **Re-add partner synchronization** (30 min)
2. **Add countdown timer UI** (20 min)
3. **Implement timer warnings** (15 min)
4. **Add admin back-step function** (30 min)
5. **Enhanced timestamp logging** (15 min)

**Total:** ~2 hours

---

## Ready to proceed with all 5 tasks?
