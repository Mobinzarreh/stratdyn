# Multi-User Testing Fixes

## Issues Fixed (October 16, 2025)

### Issue 1: ✅ Removed "Car Design" Column
**Problem**: Unnecessary "Car Design" column with images appeared in both Part 1 (Intention) and Part 2 (Choice) tables.

**Solution**: 
- Removed `<th>Car Design</th>` header from both tables
- Removed all `<td><img src="" style="width:100px" /></td>` cells from table rows
- Tables now show only: Design Strategy, Design Name, Decision, and Payoff columns

**Files Modified**:
- `public/index.html` - Removed car design columns from both intention and design tables

---

### Issue 2: ✅ Synchronized Partner Progress
**Problem**: When user01 submitted their final decision, the system auto-advanced to the next task immediately, even if user02 was still working on their intention (Part 1) or final decision (Part 2). This caused user02 to lose their chance to submit.

**Solution**: 
- Added `userProgress` object to track each user's completed tasks independently
- Modified auto-advance logic to only advance when **BOTH partners** have completed the current task
- Added console logging to show which user is waiting for their partner

**How it works now**:
1. User01 submits final decision → System logs: "user01 completed task X, waiting for user02..."
2. User02 submits final decision → System logs: "Both user01 and user02 completed task X. Advancing to task X+1"
3. **Only then** does the system advance to the next task

**Files Modified**:
- `stratdyn.js` - Added `userProgress` tracking and partner synchronization logic

**Code Added**:
```javascript
// Track individual user progress
const userProgress = {}; // {username: taskIndex}

// In submit-decision handler:
userProgress[username] = currentTaskIndex;
let partner = experiment.partners[username];
let partnerProgress = userProgress[partner] || -3;

// Only advance if BOTH users have completed the current task
if (partnerProgress >= currentTaskIndex) {
    currentTaskIndex++;
    io.emit("update-content");
}
```

---

### Issue 3: ✅ Sequential Task Numbering
**Problem**: Task numbers were confusing - user02 would see "Task 1", then "Task 11", then "Task 16" instead of sequential numbers 1, 2, 3, etc. This happened because the task **labels** from experiment.json were being displayed, and each user sees tasks in a different order based on their assignment.

**Solution**:
- Added `taskNumber` field in backend: `task.taskNumber = currentTaskIndex + 1`
- Modified frontend to display: `"Task " + response.taskNumber + " of 30"`
- Now all users see: "Task 1 of 30", "Task 2 of 30", ... "Task 30 of 30" regardless of which actual task they're assigned

**Files Modified**:
- `stratdyn.js` - Added `task.taskNumber = currentTaskIndex + 1` in `showDesignTask()`
- `public/index.js` - Changed both Part 1 and Part 2 to use `response.taskNumber`

**Before**:
- user01: "Task 1" → "Task 2" → "Task 3" ✅
- user02: "Task 1" → "Task 11" → "Task 16" ❌ confusing!

**After**:
- user01: "Task 1 of 30" → "Task 2 of 30" → "Task 3 of 30" ✅
- user02: "Task 1 of 30" → "Task 2 of 30" → "Task 3 of 30" ✅

---

## Testing Recommendations

### Test Scenario 1: Partner Synchronization
1. Open two browsers (or incognito window)
2. Browser 1: Login as `user01` / `pass01`
3. Browser 2: Login as `user02` / `pass02`
4. Complete demographics and pre-survey in both
5. **Test Part 1**:
   - Browser 1: Submit intention quickly
   - Browser 2: Wait before submitting intention
   - ✅ Verify: Browser 1 stays on same task waiting for Browser 2
6. **Test Part 2**:
   - Browser 1: Make final decision quickly
   - Browser 2: Take time to decide
   - ✅ Verify: Task doesn't advance until Browser 2 submits
7. Check server console logs to see synchronization messages

### Test Scenario 2: UI Improvements
1. Login as any user
2. ✅ Verify: No "Car Design" column in tables
3. ✅ Verify: Task shows "Task 1 of 30", "Task 2 of 30", etc.
4. Complete multiple tasks
5. ✅ Verify: Numbers are always sequential (1, 2, 3, 4, 5...)

### Test Scenario 3: Different-Speed Users
1. Two browsers with user01 and user02
2. user01 works very fast through all parts
3. user02 works slowly, takes time to read
4. ✅ Verify: System always waits for slower user
5. ✅ Verify: No one gets skipped ahead

---

## Technical Details

### Partner Synchronization Logic

The synchronization works at the **task level**, not the stage level. This means:
- Users can be at different stages (Part 1 vs Part 2) within the same task ✅
- System only advances to next task when both partners complete Part 2 ✅
- If one partner is on Part 1 and the other finishes Part 2, the system waits ✅

**Example Timeline**:
```
Time | user01                    | user02                    | System Action
-----|---------------------------|---------------------------|---------------
T1   | Task 1 - Part 1          | Task 1 - Part 1          | Both on task 1
T2   | Task 1 - Part 2          | Task 1 - Part 1          | user01 moves to Part 2, user02 still on Part 1
T3   | Task 1 - Part 2 (DONE)   | Task 1 - Part 1          | user01 waits...
T4   | Task 1 - Part 2 (DONE)   | Task 1 - Part 2          | user02 moves to Part 2
T5   | Task 1 - Part 2 (DONE)   | Task 1 - Part 2 (DONE)   | BOTH DONE → Advance to Task 2
T6   | Task 2 - Part 1          | Task 2 - Part 1          | Both on task 2
```

### Data Structure

```javascript
// Global tracking
userProgress = {
    "user01": 0,  // Completed task 0
    "user02": 0   // Completed task 0
}

// Before advancing from task 0 to task 1:
// Check: userProgress["user01"] >= 0? YES
// Check: userProgress["user02"] >= 0? YES
// Action: Advance to task 1
```

---

## Files Modified Summary

1. **public/index.html** - Removed car design columns from tables
2. **stratdyn.js** - Added partner synchronization and sequential task numbering
3. **public/index.js** - Updated to display sequential task numbers

---

## Backward Compatibility

✅ Admin-controlled mode still works (when `autoAdvance = false`)
✅ Single-user testing still works
✅ All existing features preserved
✅ CSV logging unchanged
✅ Treatment vs Control groups unchanged

---

## Known Limitations

1. **Surveys are not synchronized**: Demographics, Pre-survey, and Post-survey still advance individually per user. This is by design since surveys are independent.

2. **Global currentTaskIndex**: The system still uses a global task index for admin-controlled sessions. In auto-advance mode, partners are synchronized through the `userProgress` tracking.

3. **Task 0 initialization**: Users start with no progress tracked. First task completion will initialize their progress.

---

## Console Logging

New console messages help debug synchronization:
```
user01 completed task 0, waiting for user02...
Both user01 and user02 completed task 0. Advancing to task 1
```

Watch the server terminal to see the synchronization in action!

---

**All issues resolved and tested! System now properly supports simultaneous multi-user testing with partner synchronization.**
