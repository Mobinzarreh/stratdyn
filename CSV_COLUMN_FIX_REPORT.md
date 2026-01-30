# CSV Column Mapping Bug Fix Report

**Date:** January 27, 2026  
**Status:** ✅ FIXED AND DEPLOYED

---

## Problem Summary

The CSV export contained incorrectly mapped column data due to an extra field (`isTrainingTask`) being written in the wrong position. This caused a cascade of misaligned data across all subsequent columns.

---

## Root Cause Analysis

### Issue Location
**File:** `stratdyn.js`  
**Lines:** 1083-1109 (CSV data writing function)

### The Problem
An incorrect field `isTrainingTask` was being written at position 8 (after `distraction` column), which shifted all subsequent column data by one position to the right.

**Incorrect code (line 1094):**
```javascript
(isTrainingTask ? "true" : "false") + "," +  // ❌ WRONG! Should not be here
(userDecision.intention !== undefined && userDecision.intention !== null ? userDecision.intention : '') + "," + 
```

This caused:
- The `intention` column to contain `isTrainingTask` boolean values
- The `intentionTimestamp` column to contain actual intention values
- All subsequent columns shifted by one position

---

## Column-by-Column Analysis

### CSV Header (25 columns):
```
timestamp,username,group,partner,task,uiTaskNumber,distraction,intention,intentionTimestamp,intentionTimeSpent,uValue,uPercentile,rValue,rPercentile,uiIndividualDifficulty,uiPairedDifficulty,finalChoice,finalChoiceTimestamp,choiceTimeSpent,totalTimeSpent,presentedOrder,pointsEarned,pointsLostPenalty,scoreNet,partnerScore
```

### Before Fix (INCORRECT Mapping):

| Position | Header Name | What Was Written | Expected Value |
|----------|-------------|------------------|----------------|
| 1 | timestamp | Date.now() | ✓ Correct |
| 2 | username | user | ✓ Correct |
| 3 | group | userGroup | ✓ Correct |
| 4 | partner | experiment.partners[user] | ✓ Correct |
| 5 | task | userTask.label | ✓ Correct |
| 6 | uiTaskNumber | uiTaskNumber | ✓ Correct |
| 7 | distraction | userIsDistraction boolean | ✓ Correct |
| 8 | **intention** | **isTrainingTask boolean** | ❌ WRONG! Should be intention value (0-100) |
| 9 | **intentionTimestamp** | **userDecision.intention** | ❌ WRONG! Should be timestamp |
| 10 | **intentionTimeSpent** | **userDecision.intentionTimestamp** | ❌ WRONG! Should be time in seconds |
| 11 | **uValue** | **userDecision.intentionTimeSpent** | ❌ WRONG! Should be u-value (0.0-1.0) |
| 12 | **uPercentile** | **userDecision.uValue** | ❌ WRONG! Should be percentile (0-100) |
| 13 | **rValue** | **userDecision.uPercentile** | ❌ WRONG! Should be r-value |
| 14 | **rPercentile** | **userDecision.rValue** | ❌ WRONG! Should be percentile (0-100) |
| 15 | **uiIndividualDifficulty** | **userDecision.rPercentile** | ❌ WRONG! Should be u-percentile |
| 16 | **uiPairedDifficulty** | **userDecision.uPercentile (duplicate)** | ❌ WRONG! Should be r-percentile |
| 17 | **finalChoice** | **partner's uPercentile** | ❌ WRONG! Should be design choice (K/M/L/Y) |
| 18+ | ... | All shifted by 2 positions | ❌ ALL WRONG |

### After Fix (CORRECT Mapping):

| Position | Header Name | What Is Written | Status |
|----------|-------------|-----------------|--------|
| 1 | timestamp | Date.now() | ✓ Correct |
| 2 | username | user | ✓ Correct |
| 3 | group | userGroup | ✓ Correct |
| 4 | partner | experiment.partners[user] | ✓ Correct |
| 5 | task | userTask.label | ✓ Correct |
| 6 | uiTaskNumber | uiTaskNumber | ✓ Correct |
| 7 | distraction | userIsDistraction boolean | ✓ Correct |
| 8 | **intention** | **userDecision.intention** | ✅ FIXED - Now correct! |
| 9 | **intentionTimestamp** | **userDecision.intentionTimestamp** | ✅ FIXED |
| 10 | **intentionTimeSpent** | **userDecision.intentionTimeSpent** | ✅ FIXED |
| 11 | **uValue** | **userDecision.uValue** | ✅ FIXED |
| 12 | **uPercentile** | **userDecision.uPercentile** | ✅ FIXED |
| 13 | **rValue** | **userDecision.rValue** | ✅ FIXED |
| 14 | **rPercentile** | **userDecision.rPercentile** | ✅ FIXED |
| 15 | **uiIndividualDifficulty** | **userDecision.uPercentile** | ✅ FIXED |
| 16 | **uiPairedDifficulty** | **userDecision.rPercentile** | ✅ FIXED |
| 17 | **finalChoice** | **userDecision.design** | ✅ FIXED |
| 18 | **finalChoiceTimestamp** | **Date.now()** | ✅ FIXED |
| 19 | **choiceTimeSpent** | **userDecision.choiceTimeSpent** | ✅ FIXED |
| 20 | **totalTimeSpent** | **userDecision.totalTimeSpent** | ✅ FIXED |
| 21 | **presentedOrder** | **userOptionOrder[user][taskIndex].join(';')** | ✅ FIXED |
| 22 | **pointsEarned** | **userPointsEarned** | ✅ FIXED |
| 23 | **pointsLostPenalty** | **userPenalty** | ✅ FIXED |
| 24 | **scoreNet** | **userNetScore** | ✅ FIXED |
| 25 | **partnerScore** | **partnerUserScore** | ✅ FIXED |

---

## What Was Changed

### File: `stratdyn.js` (lines 1083-1109)

**Removed:**
```javascript
(isTrainingTask ? "true" : "false") + "," +  // Line 1094 - REMOVED
```

**Also Fixed:**
Changed line 1102 from:
```javascript
(experiment.decisions[partnerUser]...uPercentile...) + ","  // Partner's uPercentile
```

To:
```javascript
(userDecision.rPercentile !== undefined && userDecision.rPercentile !== null ? userDecision.rPercentile : '') + ","
```

This ensures:
- **uiIndividualDifficulty** (column 15) correctly shows the user's u-percentile (individual difficulty shown in UI)
- **uiPairedDifficulty** (column 16) correctly shows the user's r-percentile (paired difficulty shown in UI)

---

## Column Definitions (Corrected)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| timestamp | number | Unix timestamp (milliseconds) when decision was recorded | 1769531156892 |
| username | string | User ID | user01, user02 |
| group | string | Experimental group | treatment, control |
| partner | string | Partner's user ID | user02 |
| task | string | Task name/label | Massachusetts, Distr_Collab_1 |
| uiTaskNumber | number | Task number shown to user (1-24) | 5 |
| distraction | boolean | Whether this is a distraction task | true, false |
| **intention** | **number** | **User's Stage 1 intention (0-100)** | **60** |
| **intentionTimestamp** | **number** | **Unix timestamp when intention submitted** | **1769531153751** |
| **intentionTimeSpent** | **number** | **Seconds spent on intention stage** | **7.819** |
| **uValue** | **number** | **Task's u-value (0.0-1.0)** | **0.82** |
| **uPercentile** | **number** | **User's u-percentile rank (0-100)** | **100** |
| **rValue** | **number** | **Calculated r-value for this pair** | **1.002947857343397** |
| **rPercentile** | **number** | **User's r-percentile rank (0-100)** | **58** |
| **uiIndividualDifficulty** | **number** | **U-percentile shown to user in UI** | **100** |
| **uiPairedDifficulty** | **number** | **R-percentile shown to user in UI (null for control)** | **0** |
| finalChoice | string | User's final design choice | K, M, L, Y |
| finalChoiceTimestamp | number | Unix timestamp when final choice submitted | 1769531156892 |
| choiceTimeSpent | number | Seconds spent on choice stage | 3.06 |
| totalTimeSpent | number | Total seconds for entire task | 10.957 |
| presentedOrder | string | Order options were presented (semicolon-separated) | M;K;L;Y |
| pointsEarned | number | Points earned from this task | 50 |
| pointsLostPenalty | number | Points lost due to time penalty | 0 |
| scoreNet | number | Net score (earned - penalty) | 50 |
| partnerScore | number | Partner's score for this task | 50 |

---

## Impact on Distraction Tasks

For distraction tasks, the fix now correctly records:
- **intention**: The actual slider value (0-100) from Stage 1
- **uValue**: The distraction task's u-value (0.62 for Collab, 0.82 for Defect)
- **uPercentile**: The distraction task's individual_percentile (0 for Collab, 100 for Defect)
- **rValue**: 0 (not applicable for distraction tasks)
- **rPercentile**: The distraction task's paired_percentile (0 for Collab, 100 for Defect)
- **uiIndividualDifficulty**: 0 for Collab, 100 for Defect
- **uiPairedDifficulty**: 0 for Collab, 100 for Defect

---

## Deployment Status

✅ **Fix deployed to production:** January 27, 2026 at 17:00 UTC  
✅ **Application URL:** https://game.code-lab.org  
✅ **Git commit:** 1e11ef4e

---

## Testing Instructions

1. Complete a few tasks with two test users (user01, user02)
2. Download the CSV data using `./download_data.sh`
3. Verify the following:
   - Column 8 (`intention`) contains numerical values (0-100), not "true"/"false"
   - Column 9 (`intentionTimestamp`) contains timestamps (13-digit numbers)
   - Column 11 (`uValue`) contains decimal values (0.0-1.0)
   - Column 12 (`uPercentile`) contains percentile values (0-100)
   - For distraction tasks: uPercentile should be 0 or 100 (not 0.62 or 0.82)
   - All columns align correctly with their headers

---

## Notes

- **Old data** (before this fix) will have incorrect column mappings and should not be used for analysis
- **New data** (after deployment at 17:00 UTC on Jan 27, 2026) will have correct mappings
- Training task CSV files use the same structure and are also fixed
- The header structure was already correct; only the data writing logic had the bug

---

## Related Fixes

This deployment also includes the earlier fix for distraction task percentile display (reading from `task.individual_percentile` and `task.paired_percentile` instead of schedule data).
