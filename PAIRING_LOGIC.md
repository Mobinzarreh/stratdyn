# Task Pairing Logic Documentation

## Overview
The experiment uses a sophisticated pairing system where each participant encounters their partner at ALL possible combinations of individual collaboration difficulties (u-values).

## U-Values and Task Distribution
- **5 U-levels**: 0.62, 0.67, 0.72, 0.77, 0.82
- **25 Focal tasks**: 5 tasks per u-level (Tasks 1-25)

## Task Index Mapping
```
Index 0-4:   Training tasks (TT1: u=0.5, TT2: u=0.75, TT3: u=0.85, TT4: u=0.55, TT5: u=0.90)
Index 2-6:   Focal tasks with u = 0.62
Index 7-11:  Focal tasks with u = 0.67
Index 12-16: Focal tasks with u = 0.72
Index 17-21: Focal tasks with u = 0.77
Index 22-26: Focal tasks with u = 0.82
```

## Pairing Matrix

For each pair of participants (e.g., user01 ↔ user02), the 25 focal tasks cover all possible (u1, u2) combinations:

| u1 \ u2 | 0.62 | 0.67 | 0.72 | 0.77 | 0.82 |
|---------|------|------|------|------|------|
| 0.62    |  1   |  1   |  1   |  1   |  1   |
| 0.67    |  1   |  1   |  1   |  1   |  1   |
| 0.72    |  1   |  1   |  1   |  1   |  1   |
| 0.77    |  1   |  1   |  1   |  1   |  1   |
| 0.82    |  1   |  1   |  1   |  1   |  1   |

**Total**: 5 × 5 = 25 unique pairings

## Randomized Partner U-Value Order

**IMPORTANT**: To prevent participants from noticing a predictable monotonic increase in difficulty sliders, the partner's u-value order is **randomized within each block**.

### Example: user01 ↔ user02 (Randomized)

Instead of a predictable sequence like:
```
Task 1: u1=0.62 ↔ u2=0.62  (R increases...)
Task 2: u1=0.62 ↔ u2=0.67
Task 3: u1=0.62 ↔ u2=0.72
Task 4: u1=0.62 ↔ u2=0.77
Task 5: u1=0.62 ↔ u2=0.82
```

The partner's u-values are shuffled within each block:
```
Task 1: u1=0.62 ↔ u2=0.72  (randomized order)
Task 2: u1=0.62 ↔ u2=0.62
Task 3: u1=0.62 ↔ u2=0.82
Task 4: u1=0.62 ↔ u2=0.67
Task 5: u1=0.62 ↔ u2=0.77
```

### What's Preserved:
- ✓ All 25 (u1, u2) combinations are covered exactly once
- ✓ User01 stays at one u-level for 5 consecutive tasks (block structure)
- ✓ Both partners experience the same pairing at each position

### What's Randomized:
- The ORDER in which partner u-values appear within each block
- This prevents visible monotonic increase in R-value sliders

## Risk Dominance (R) Coverage

The pairing creates a comprehensive range of R-values:

```
R = 0.5 × ln(u1/(1-u1)) + 0.5 × ln(u2/(1-u2))
```

**R-value range across all pairings**:
- Minimum: R = 0.490 (both at u=0.62)
- Maximum: R = 1.516 (both at u=0.82)
- **25 distinct R-values** covering the full spectrum of paired collaboration difficulty

## Distraction Tasks
Distraction tasks are inserted after specific counts of focal tasks (defined by `distraction_positions` [5,11,17,22,25]):
- After 5 focal tasks: Distr_Collab_1 (u=0.62, individual_percentile=0, paired_percentile=0)
- After 11 focal tasks: Distr_Collab_2 (u=0.62, individual_percentile=0, paired_percentile=0)
- After 17 focal tasks: Distr_Defect_1 (u=0.82, individual_percentile=100, paired_percentile=100)
- After 22 focal tasks: Distr_Defect_2 (u=0.82, individual_percentile=100, paired_percentile=100)
- After 25 focal tasks: Distr_Ambiguous_1 (u=0.72, individual_percentile=50, paired_percentile=50)

Both partners experience the same distraction tasks at the same positions.

## Experiment Goals Achieved

✓ **Complete Coverage**: Every participant encounters their partner at all 5 u-levels
✓ **Balanced Design**: Each u-level combination appears exactly once
✓ **Systematic Progression**: Clear structure from low to high difficulty
✓ **Risk Dominance Variety**: Full range of R-values from 0.490 to 1.516
✓ **Consistent Experience**: Both partners in a pair complete the same 35 tasks total (5 training + 25 focal + 5 distractions inserted)

## Implementation Details

### Partners
```json
{
  "user01": "user02",
  "user02": "user01",
  "user03": "user04",
  "user04": "user03"
}
```

### Assignment Structure
Each user has a 30-element array of task indices (0-29) representing their unique task sequence for the 5 training tasks + 25 focal tasks. Distraction tasks are inserted dynamically during task presentation at positions defined by `distraction_positions` [5,11,17,22,25], resulting in 35 total tasks experienced.

### How to Add More Users
To add a new pair of users (e.g., user05-user06):
1. Add entries to `partners` object (bidirectional) in experiment.json
2. Add user credentials to userCredentials.json
3. Generate assignments using the `generate_assignments.py` script
4. Ensure the pairing matrix verification passes (all 25 combinations covered)

## Verification
Run `python3 generate_assignments.py` to verify the pairing logic. It will:
1. Generate assignments for all users
2. Display the pairing matrix showing all (u1, u2) combinations
3. Verify that all 25 combinations are covered exactly once
4. Show R-values for each pairing

Example output:
```
✓ SUCCESS: All 25 u-level combinations are covered!
  Each participant encounters their partner at ALL u-levels.
```

## Research Questions Supported

This pairing design allows researchers to analyze:
1. **Individual Difficulty Effect**: How u-value affects collaboration intention and choice
2. **Paired Difficulty Effect**: How R-value (risk dominance) affects outcomes
3. **Treatment vs Control**: Impact of showing/hiding R information
4. **Progression Effects**: How experience with different difficulties changes behavior
5. **Interaction Effects**: How individual and paired difficulty interact

## Files Modified
- `/data/experiment.json`: Updated assignments and partners
- `/generate_assignments.py`: Script to generate pairing logic
- `/PAIRING_LOGIC.md`: This documentation file
