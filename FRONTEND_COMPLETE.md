# Frontend Implementation Complete

## Overview
The frontend has been successfully updated to support the two-stage decision process (Intention → Choice) with conditional information display based on experimental group (treatment vs control).

## Files Modified

### 1. `/public/index.html`

#### Added: Part 1 (Intention Stage) Section
- **New Section ID**: `#intention`
- **Location**: Between `#wait` and `#demographics-survey` sections
- **Components**:
  - Progress bar showing task completion percentage
  - Task label display
  - Decision table showing all 4 options (A, B, C, Y) with payoffs
  - **Individual Collaboration Difficulty slider** (visual only, displays u percentile 0-100)
  - **Intention question**: "What is your intention towards collaboration?" with slider (1-10 scale)
  - Submit button to advance to Part 2

#### Modified: Part 2 (Choice Stage) Section
- **Section ID**: `#design` (existing, modified)
- **Removed**: `collabBelief` form and slider (no longer needed)
- **Removed**: Robot image and button from main view (kept in modal for compatibility)
- **Added**: Two difficulty information cards:
  - **Individual Collaboration Difficulty** (u percentile) - shown to all users
  - **Paired Collaboration Difficulty** (R percentile) - shown only to treatment group
- **Kept**: Decision table with all 4 options
- **Kept**: Collaborative/Individual icon indicators
- **Kept**: Submit button for final decision

### 2. `/public/index.js`

#### New Global Variables
```javascript
var userGroup = null;  // Stores 'treatment' or 'control' from login
```

#### Updated Handlers

##### Login Response Handler
- **Changed**: Now expects object `{username, group}` instead of just username string
- **Added**: Stores `userGroup` globally for conditional display logic
- **Added**: Console logging for debugging

##### Intention Slider Handler
```javascript
$("#intention-slider").on("input", function() {
    $("#intention-value").text($(this).val());
});
```
- Updates displayed value as user moves slider (1-10)

##### Intention Form Submit Handler
```javascript
$("#intention-form").on("submit", (event) => {
    // Prevent default form submission
    // Show spinner, disable button
    // Emit 'submit-intention' socket event with intention value
});
```

##### Show Design Task Handler
- **Major Rewrite**: Now handles two stages based on `response.stage` property
- **Part 1 (stage === 'intention')**:
  - Shows `#intention` screen, hides `#design`
  - Populates decision table with task options
  - Sets u percentile slider to `response.uPercentile`
  - Resets intention slider to 5
  - Enables submit button
  
- **Part 2 (stage === 'choice')**:
  - Shows `#design` screen, hides `#intention`
  - Populates decision table with task options
  - Sets u percentile slider to `response.uPercentile`
  - **Conditional Display**: Shows/hides R percentile based on `userGroup`
    - Treatment group: Shows paired difficulty (R percentile)
    - Control group: Hides paired difficulty container
  - Enables table row selection
  - Robot button remains hidden initially

##### All Screen Handlers Updated
- Added `#intention` to the list of screens to hide when showing other screens
- Ensures only one screen is visible at a time
- Affects: `show-welcome-screen`, `show-demographics-survey-screen`, `show-survey-screen`, `show-postsurvey-screen`, `show-admin-screen`, `show-wait-screen`, `show-thank-you-screen`

##### Removed Handler
- **Deleted**: `collabBelief-form` submit handler (no longer needed)

##### Table Row Click Handler
- **Modified**: Removed check for `$("#collabBelief").prop("disabled")`
- Now only checks if spinner is visible before allowing row selection

## Data Flow

### Login Flow
1. User submits login form
2. Backend validates and returns `{username: 'user0059', group: 'treatment'}`
3. Frontend stores `userGroup = 'treatment'`
4. Used later to conditionally show R percentile

### Part 1 (Intention Stage) Flow
1. Backend emits `show-design-task` with `stage: 'intention'`
2. Frontend displays:
   - Task options and payoffs in table
   - u percentile slider (visual only, cannot be changed)
   - Intention question slider (1-10, interactive)
3. User moves intention slider (1-10)
4. User clicks "Submit Intention"
5. Frontend emits `submit-intention` event with `{intention: 7}`
6. Backend saves intention, calculates u percentile, emits Part 2

### Part 2 (Choice Stage) Flow
1. Backend emits `show-design-task` with `stage: 'choice'`
2. Frontend displays:
   - Task options and payoffs in table
   - u percentile slider (visual only)
   - R percentile slider (visual only, **only if userGroup === 'treatment'**)
   - Interactive table for selecting option
3. User clicks a table row (A, B, C, or Y)
4. User clicks "Confirm Decision"
5. Frontend emits `submit-decision` event with design choice
6. Backend saves decision, calculates scores, advances to next task

## Conditional Display Logic

### Treatment Group (userGroup === 'treatment')
- Part 1: Sees u percentile
- Part 2: Sees BOTH u percentile AND R percentile

### Control Group (userGroup === 'control')
- Part 1: Sees u percentile
- Part 2: Sees ONLY u percentile (R percentile container is hidden)

Implementation:
```javascript
if (userGroup === 'treatment') {
    $("#design-r-container").show();
    $("#design-r-percentile").val(response.rPercentile);
    $("#design-r-value").text(Math.round(response.rPercentile));
} else {
    $("#design-r-container").hide();
}
```

## UI/UX Improvements

### Visual Hierarchy
- Clear two-stage process with distinct screens
- Progress bars on both stages
- Card-based layout for difficulty information
- Color-coded sliders (gradient possible via CSS)

### User Guidance
- Explicit instructions on each screen
- "Easier" to "Harder" labels on difficulty sliders
- "1 - Definitely will NOT" to "10 - Definitely WILL" labels on intention
- Live value display as sliders move

### Accessibility
- Disabled sliders for information-only displays (u and R percentiles)
- Enabled slider for user input (intention)
- Clear button states (disabled when waiting)
- Spinner feedback during submission

## Remaining Old Code (For Cleanup Later)

### Robot Feature (Still Present)
- Robot modal HTML still exists
- Chart.js visualization code still present
- Robot button references still in code
- To be removed in task 9

### Partner Belief Code (Still Present)
- `partnerCollabBelief` variable still declared
- `update-collab-belief` socket handler still present
- Used by robot feature, can be removed with task 9

## Testing Checklist

### Basic Flow
- [ ] Login with treatment user → see group stored correctly
- [ ] Login with control user → see group stored correctly
- [ ] Demographics survey → Pre-survey → Tasks

### Part 1 (Intention Stage)
- [ ] Task label displays correctly
- [ ] Decision table shows all 4 options with correct payoffs
- [ ] u percentile slider shows correct value (cannot be moved)
- [ ] Intention slider starts at 5, can be moved 1-10
- [ ] Displayed value updates as slider moves
- [ ] Submit button emits correct event
- [ ] Automatically advances to Part 2

### Part 2 (Choice Stage)  
- [ ] Task label displays correctly (same task)
- [ ] Decision table shows same options
- [ ] u percentile slider shows correct value
- [ ] **Treatment group**: R percentile slider visible with correct value
- [ ] **Control group**: R percentile slider hidden
- [ ] Can select a table row
- [ ] Submit button confirms decision
- [ ] Advances to next task Part 1

### End-to-End
- [ ] Complete all 30 tasks (intention + choice for each)
- [ ] Post-survey appears after task 30
- [ ] Thank you screen appears at end
- [ ] CSV files contain all data (intention, u/R percentiles, etc.)

## Known Issues / Notes

1. **Robot feature**: Still present but hidden. Will be removed in task 9.

2. **Backward compatibility**: Old robot/mediator code kept for now to avoid breaking existing functionality.

3. **Percentile display**: Currently shows rounded integer (e.g., "72%"). Could be formatted with decimals if needed.

4. **Slider styling**: Using default Bootstrap range slider. Could be enhanced with custom CSS for better visual appeal (e.g., color gradients for difficulty).

5. **Mobile responsiveness**: Decision table may need horizontal scrolling on small screens. Consider responsive design improvements.

## Next Steps

1. **Task 8**: Update pairing logic in experiment.json for all u-level combinations
2. **Task 9**: Remove robot advisor feature completely
3. **Task 10**: End-to-end testing with actual users

## Files Summary

**Modified:**
- `/public/index.html` - Added intention stage, modified choice stage
- `/public/index.js` - Added two-stage handlers, conditional R display

**Backend (Already Complete):**
- `/stratdyn.js` - Two-stage socket handlers
- `/utils/calculations.js` - Percentile calculations
- `/data/experiment.json` - 30 tasks with u values
- `/data/userCredentials.json` - Group assignments

**Not Modified:**
- `/public/style.css` - Could add custom styling for sliders
- Survey screens - Working as before
- Admin interface - Shows group and intention data
