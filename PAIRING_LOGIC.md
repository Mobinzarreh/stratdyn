# Task Pairing Logic Documentation

## Overview
The experiment uses a sophisticated pairing system where each participant encounters their partner at ALL possible combinations of individual collaboration difficulties (u-values).

## U-Values and Task Distribution
- **5 U-levels**: 0.62, 0.67, 0.72, 0.77, 0.82
- **25 Focal tasks**: 5 tasks per u-level (Tasks 1-25)

## Task Index Mapping
```
Tasks 0-4   (Task 1-5):    u = 0.62
Tasks 5-9   (Task 6-10):   u = 0.67
Tasks 10-14 (Task 11-15):  u = 0.72
Tasks 15-19 (Task 16-20):  u = 0.77
Tasks 20-24 (Task 21-25):  u = 0.82
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

## Example: user01 ↔ user02

### User01's Task Sequence (first 10 focal tasks):
```
Position  Task       u1    Partner Task  u2    R-value
0         Task 1     0.62  Task 1        0.62  0.490
1         Task 2     0.62  Task 6        0.67  0.599
2         Task 3     0.62  Task 11       0.72  0.717
3         Task 4     0.62  Task 16       0.77  0.849
4         Task 5     0.62  Task 21       0.82  1.003
5         [Distraction Task 1]
6         Task 6     0.67  Task 2        0.62  0.599
7         Task 7     0.67  Task 7        0.67  0.708
8         Task 8     0.67  Task 12       0.72  0.826
9         Task 9     0.67  Task 17       0.77  0.958
...
```

### Pattern Analysis
- **Rows** (User01): Stays at one u-level for 5 consecutive tasks
- **Columns** (User02): Cycles through all u-levels (0.62 → 0.67 → 0.72 → 0.77 → 0.82)

This ensures:
1. **User01** faces their partner at u = 0.62, 0.67, 0.72, 0.77, 0.82 ✓
2. **User02** faces their partner at u = 0.62, 0.67, 0.72, 0.77, 0.82 ✓

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
Distraction tasks are inserted at positions 5, 11, 17, 23, 29 (after every 5 focal tasks):
- Position 5: Distraction Task 1 (u=0.50)
- Position 11: Distraction Task 2 (u=0.55)
- Position 17: Distraction Task 3 (u=0.60)
- Position 23: Distraction Task 4 (u=0.65)
- Position 29: Distraction Task 5 (u=0.70)

Both partners experience the same distraction tasks at the same positions.

## Experiment Goals Achieved

✓ **Complete Coverage**: Every participant encounters their partner at all 5 u-levels
✓ **Balanced Design**: Each u-level combination appears exactly once
✓ **Systematic Progression**: Clear structure from low to high difficulty
✓ **Risk Dominance Variety**: Full range of R-values from 0.490 to 1.516
✓ **Consistent Experience**: Both partners in a pair complete the same 30 tasks (but in different orders)

## Implementation Details

### Partners
```json
{
  "user01": "user02",
  "user02": "user01",
  "user03": "user04",
  "user04": "user03",
  "user05": "user06",
  "user06": "user05"
}
```

### Assignment Structure
Each user has a 30-element array of task indices (0-29) representing their unique task sequence.

### How to Add More Users
To add a new pair of users:
1. Add entries to `partners` object (bidirectional)
2. Generate assignments using the `generate_assignments.py` script
3. Ensure the pairing matrix verification passes (all 25 combinations covered)

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
