# StratDyn New Experiment - Implementation Summary

## ✅ COMPLETED: Tasks 1 & 2

### 1. New Task Data Structure Created
- **File**: `/data/experiment.json` (old version backed up as `experiment_old_backup.json`)
- **Total Tasks**: 30 (25 focal + 5 distraction)

#### Focal Tasks (25):
- **Task 1-5**: u = 0.62 (easiest collaboration difficulty)
- **Task 6-10**: u = 0.67
- **Task 11-15**: u = 0.72
- **Task 16-20**: u = 0.77
- **Task 21-25**: u = 0.82 (hardest collaboration difficulty)

#### Distraction Tasks (5):
- **Distraction Task 1-5**: u values of 0.50, 0.55, 0.60, 0.65, 0.70
- These feature prisoner's dilemma dynamics with positive downside values

#### Task Structure:
Each task has:
- `label`: Task identifier (e.g., "Task 1", "Distraction Task 1")
- `uValue`: Normalized deviation loss (0.62, 0.67, 0.72, 0.77, 0.82)
- `isDistraction`: Boolean flag for distraction tasks
- `options`: Array of 4 choices:
  - **A, B, C**: Collaborative options (upside: 64-90, downside: varies)
  - **Y**: Independent option (always 50/50)

### 2. Calculation Functions Created
- **File**: `/utils/calculations.js`

#### Functions:
1. **`calculateUPercentile(uValue, allTasks)`**
   - Converts u value to percentile (0-100)
   - 0 = easiest to collaborate, 100 = hardest
   
2. **`calculateRiskDominance(u1, u2)`**
   - Formula: `R = 0.5 * ln(u1 / (1 - u1)) + 0.5 * ln(u2 / (1 - u2))`
   - Calculates paired collaboration difficulty from both players' u values
   
3. **`calculateRPercentile(rValue, allTasks)`**
   - Converts R value to percentile (0-100)
   - Based on all possible paired u value combinations
   
4. **`getTaskUValue(taskIndex, allTasks)`**
   - Helper function to retrieve u value for a specific task

#### Usage:
- Works in both Node.js (backend) and browser (frontend)
- Backend: `const {calculateUPercentile} = require('./utils/calculations.js')`
- Frontend: `window.StratDynCalculations.calculateUPercentile(...)`

---

## 📋 NEXT STEPS

### 3. Modify Backend for Two-Stage Decisions
- Update `stratdyn.js` to add:
  - `submit-intention` socket handler (Part 1)
  - Modify `submit-decision` handler (Part 2)
  - Update decision data structure to include: intention, uPercentile, rValue, rPercentile

### 4. Update CSV Logging
- Add new columns: intention, intentionTimestamp, uValue, uPercentile, rValue, rPercentile
- Log both stages of each task

### 5. Create Part 1 (Intention) UI
- Build intention stage interface (see screenshot 1)
- Table with A, B, C, Y options
- Individual difficulty slider
- Intention scale (1-10)

### 6. Modify Part 2 (Choice) UI  
- Update choice stage interface (see screenshot 2)
- Same table as Part 1
- TWO sliders: Individual & Paired difficulty
- Radio buttons for final choice

### 7. Update Task Assignments & Pairing
- Ensure each participant sees all u-level combinations with their partner

### 8. Remove Robot Advisor
- Clean up robot/mediator features from old experiment

### 9. End-to-End Testing
- Test complete experimental flow

---

## 🎯 Key Experimental Design Points

1. **Two-Part Decision Process**:
   - **Part 1 (Intention)**: See individual difficulty → state intention (1-10)
   - **Part 2 (Choice)**: See both individual & paired difficulty → make final choice

2. **Information Display**:
   - Individual Collaboration Difficulty: u percentile (0-100)
   - Paired Collaboration Difficulty: R percentile (0-100)

3. **Risk Communication**:
   - Participants told that collaborative designs have 5% technical failure risk
   - (Not implemented in actual payoffs - just framing)

4. **Task Order**:
   - 5 distraction tasks interspersed with 25 focal tasks
   - Ensures participants encounter all paired u-level combinations

---

## 📁 Files Created/Modified

- ✅ `/data/experiment.json` - New task structure (30 tasks)
- ✅ `/data/experiment_old_backup.json` - Backup of original
- ✅ `/utils/calculations.js` - U and R calculation functions
- ⏳ `/stratdyn.js` - TO BE MODIFIED for two-stage decisions
- ⏳ `/public/index.html` - TO BE MODIFIED for new UI
- ⏳ `/public/index.js` - TO BE MODIFIED for new logic

---

Would you like to proceed with Step 3 (Backend modifications)?
