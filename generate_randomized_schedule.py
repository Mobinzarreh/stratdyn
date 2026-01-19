#!/usr/bin/env python3
"""
Generate Randomized Task Schedule for StratDyn Experiment

Requirements:
1. 20 focal tasks: off-diagonal (u1 ≠ u2), fully randomized
2. 5 diagonal tasks: u1 = u2, symmetric pairing
3. 5 distraction tasks: asymmetric pairing (partners get different distraction tasks)

Total: 30 tasks per user (excluding training)

Output: CSV with columns:
- ui_task_number (1-30, after training)
- user1_task_type (focal/diagonal/distraction)
- user1_task_id (raw task index)
- user1_u_value
- user1_u_percentile
- user2_task_type
- user2_task_id
- user2_u_value
- user2_u_percentile
- r_percentile (paired difficulty)
"""

import json
import random
import math
import csv
from pathlib import Path

# Constants
U_VALUES = [0.62, 0.67, 0.72, 0.77, 0.82]
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR / "data"

# Task index mapping (0-indexed in tasks array)
# Index 0-1: Training tasks
# Index 2-6: u=0.62 (Task 1-5)
# Index 7-11: u=0.67 (Task 6-10)
# Index 12-16: u=0.72 (Task 11-15)
# Index 17-21: u=0.77 (Task 16-20)
# Index 22-26: u=0.82 (Task 21-25)

U_VALUE_TO_TASK_INDICES = {
    0.62: [2, 3, 4, 5, 6],
    0.67: [7, 8, 9, 10, 11],
    0.72: [12, 13, 14, 15, 16],
    0.77: [17, 18, 19, 20, 21],
    0.82: [22, 23, 24, 25, 26],
}

def calculate_u_percentile(u):
    """
    Calculate u-percentile based on ranking among unique u-values in focal tasks.
    Uses the same logic as utils/calculations.js
    """
    if u <= 0 or u >= 1:
        return 0
    
    # Count how many unique u values are less than or equal to current u
    count_less_or_equal = sum(1 for u_val in U_VALUES if u_val <= u)
    
    # Calculate percentile (0 = easiest, 100 = hardest)
    if len(U_VALUES) <= 1:
        return 50
    
    percentile = ((count_less_or_equal - 1) / (len(U_VALUES) - 1)) * 100
    return round(max(0, min(100, percentile)))

def calculate_risk_dominance(u1, u2):
    """
    Calculate risk dominance (R) from two players' u values.
    Formula: R = 0.5 * ln(u1 / (1 - u1)) + 0.5 * ln(u2 / (1 - u2))
    """
    if u1 >= 1 or u1 <= 0 or u2 >= 1 or u2 <= 0:
        return 0
    
    term1 = 0.5 * math.log(u1 / (1 - u1))
    term2 = 0.5 * math.log(u2 / (1 - u2))
    
    return term1 + term2

def calculate_r_percentile(u1, u2):
    """
    Calculate r-percentile based on ranking among ALL possible R values from focal tasks.
    Uses the same logic as utils/calculations.js
    """
    # Calculate current R value
    r_value = calculate_risk_dominance(u1, u2)
    
    # Calculate all possible R values from pairings of focal task u-values (5x5 = 25 combinations)
    all_r_values = []
    for u_i in U_VALUES:
        for u_j in U_VALUES:
            all_r_values.append(calculate_risk_dominance(u_i, u_j))
    
    # Sort R values
    all_r_values.sort()
    
    if len(all_r_values) <= 1:
        return 50
    
    # Count how many R values are less than or equal to current R
    count_less_or_equal = sum(1 for r in all_r_values if r <= r_value)
    
    # Calculate percentile (0 = easiest collaboration, 100 = hardest)
    percentile = ((count_less_or_equal - 1) / (len(all_r_values) - 1)) * 100
    
    return round(max(0, min(100, percentile)))

def get_task_index_for_u(u_value, used_indices):
    """Get a task index for a given u-value, avoiding already used indices."""
    available = [idx for idx in U_VALUE_TO_TASK_INDICES[u_value] if idx not in used_indices]
    if not available:
        # If all used, allow reuse (should have 5 tasks per u-value)
        available = U_VALUE_TO_TASK_INDICES[u_value]
    return random.choice(available)

def generate_off_diagonal_pairings():
    """Generate 20 off-diagonal (u1, u2) combinations where u1 ≠ u2."""
    pairings = []
    for u1 in U_VALUES:
        for u2 in U_VALUES:
            if u1 != u2:
                pairings.append((u1, u2))
    return pairings

def generate_diagonal_pairings():
    """Generate 5 diagonal (u1, u2) combinations where u1 = u2."""
    return [(u, u) for u in U_VALUES]

def generate_distraction_pairings():
    """
    Generate 5 distraction task pairings.
    Partners get DIFFERENT distraction tasks at the same position.
    Using rotation: User1 gets [0,1,2,3,4], User2 gets [2,3,4,0,1] (offset by 2)
    """
    user1_distractions = [0, 1, 2, 3, 4]
    user2_distractions = [2, 3, 4, 0, 1]  # Offset by 2 to ensure difference
    return list(zip(user1_distractions, user2_distractions))

def get_distraction_r_percentiles(d1_idx, d2_idx, distraction_tasks):
    """
    Get the r-percentiles for a distraction task pairing.
    Each user sees their own task's fixed paired_percentile value.
    Returns: (user1_r_percentile, user2_r_percentile)
    """
    # Get paired_percentile from each distraction task
    p1 = distraction_tasks[d1_idx].get('paired_percentile', 50)
    p2 = distraction_tasks[d2_idx].get('paired_percentile', 50)
    
    # Return both values separately (no averaging)
    return p1, p2

def generate_schedule(seed=None):
    """
    Generate the full 30-task schedule for a user pair.
    
    Returns a list of 30 task entries, each containing:
    - ui_task_number
    - task_type (focal/diagonal/distraction)
    - user1_task_id, user1_u_value, user1_u_percentile
    - user2_task_id, user2_u_value, user2_u_percentile
    - r_percentile
    """
    if seed is not None:
        random.seed(seed)
    
    # Load experiment data to get distraction task u-values
    with open(DATA_DIR / "experiment.json", "r") as f:
        experiment = json.load(f)
    
    distraction_tasks = experiment.get("distraction_tasks", [])
    distraction_u_values = [d.get("uValue", 0.72) for d in distraction_tasks]
    
    # Generate all pairings
    off_diagonal = generate_off_diagonal_pairings()  # 20 pairs
    diagonal = generate_diagonal_pairings()          # 5 pairs
    distractions = generate_distraction_pairings()   # 5 pairs of distraction indices
    
    # Track used task indices per u-value for each user
    user1_used = {u: [] for u in U_VALUES}
    user2_used = {u: [] for u in U_VALUES}
    
    schedule = []
    
    # Create task entries for off-diagonal focal tasks
    for u1, u2 in off_diagonal:
        task1_idx = get_task_index_for_u(u1, user1_used[u1])
        task2_idx = get_task_index_for_u(u2, user2_used[u2])
        user1_used[u1].append(task1_idx)
        user2_used[u2].append(task2_idx)
        
        r_perc = calculate_r_percentile(u1, u2)
        schedule.append({
            'task_type': 'focal',
            'user1_task_id': task1_idx,
            'user1_u_value': u1,
            'user1_u_percentile': calculate_u_percentile(u1),
            'user2_task_id': task2_idx,
            'user2_u_value': u2,
            'user2_u_percentile': calculate_u_percentile(u2),
            'user1_r_percentile': r_perc,
            'user2_r_percentile': r_perc,
        })
    
    # Create task entries for diagonal focal tasks
    for u1, u2 in diagonal:
        task1_idx = get_task_index_for_u(u1, user1_used[u1])
        task2_idx = get_task_index_for_u(u2, user2_used[u2])
        user1_used[u1].append(task1_idx)
        user2_used[u2].append(task2_idx)
        
        r_perc = calculate_r_percentile(u1, u2)
        schedule.append({
            'task_type': 'diagonal',
            'user1_task_id': task1_idx,
            'user1_u_value': u1,
            'user1_u_percentile': calculate_u_percentile(u1),
            'user2_task_id': task2_idx,
            'user2_u_value': u2,
            'user2_u_percentile': calculate_u_percentile(u2),
            'user1_r_percentile': r_perc,
            'user2_r_percentile': r_perc,
        })
    
    # Create task entries for distraction tasks
    for d1_idx, d2_idx in distractions:
        u1 = distraction_u_values[d1_idx]
        u2 = distraction_u_values[d2_idx]
        
        # Get separate r-percentiles for each user (no averaging)
        r_perc1, r_perc2 = get_distraction_r_percentiles(d1_idx, d2_idx, distraction_tasks)
        
        schedule.append({
            'task_type': 'distraction',
            'user1_task_id': f'D{d1_idx}',  # D0-D4 for distraction indices
            'user1_u_value': u1,
            'user1_u_percentile': calculate_u_percentile(u1),
            'user2_task_id': f'D{d2_idx}',
            'user2_u_value': u2,
            'user2_u_percentile': calculate_u_percentile(u2),
            'user1_r_percentile': r_perc1,
            'user2_r_percentile': r_perc2,
        })
    
    # Smart shuffling: distribute distractions evenly and avoid consecutive same u-values
    schedule = smart_shuffle(schedule)
    
    # Add UI task numbers (1-30)
    for i, entry in enumerate(schedule):
        entry['ui_task_number'] = i + 1
    
    return schedule

def smart_shuffle(schedule):
    """
    Shuffle the schedule intelligently to:
    1. Distribute distraction tasks evenly across the 30 tasks
    2. Minimize consecutive same u-values for each user
    """
    # Separate by type
    focal_tasks = [s for s in schedule if s['task_type'] == 'focal']
    diagonal_tasks = [s for s in schedule if s['task_type'] == 'diagonal']
    distraction_tasks = [s for s in schedule if s['task_type'] == 'distraction']
    
    # Shuffle each group
    random.shuffle(focal_tasks)
    random.shuffle(diagonal_tasks)
    random.shuffle(distraction_tasks)
    
    # Combine focal and diagonal for initial sequence
    main_tasks = focal_tasks + diagonal_tasks
    random.shuffle(main_tasks)
    
    # Place distraction tasks at evenly spaced positions (every 6 tasks)
    # Positions: 5, 11, 17, 23, 29 (roughly evenly distributed)
    distraction_positions = [5, 11, 17, 23, 29]
    
    # Build final schedule
    final_schedule = []
    main_idx = 0
    dist_idx = 0
    
    for i in range(30):
        if i in distraction_positions and dist_idx < len(distraction_tasks):
            final_schedule.append(distraction_tasks[dist_idx])
            dist_idx += 1
        else:
            if main_idx < len(main_tasks):
                final_schedule.append(main_tasks[main_idx])
                main_idx += 1
    
    # Optimize to reduce consecutive same u-values
    final_schedule = reduce_consecutive_u_values(final_schedule)
    
    return final_schedule

def reduce_consecutive_u_values(schedule):
    """
    Swap tasks to minimize consecutive same u-values for both users.
    """
    max_iterations = 100
    
    for iteration in range(max_iterations):
        improved = False
        
        for i in range(len(schedule) - 1):
            # Skip if either is a distraction task (keep them in place)
            if schedule[i]['task_type'] == 'distraction' or schedule[i+1]['task_type'] == 'distraction':
                continue
            
            # Check if current position has consecutive same u-values
            u1_same = schedule[i]['user1_u_value'] == schedule[i+1]['user1_u_value']
            u2_same = schedule[i]['user2_u_value'] == schedule[i+1]['user2_u_value']
            
            if u1_same or u2_same:
                # Try to find a swap partner further down that would reduce conflicts
                for j in range(i+2, min(i+10, len(schedule))):
                    if schedule[j]['task_type'] == 'distraction':
                        continue
                    
                    # Temporarily swap and check if it improves
                    schedule[i+1], schedule[j] = schedule[j], schedule[i+1]
                    
                    # Check new consecutive pairs
                    new_u1_same = schedule[i]['user1_u_value'] == schedule[i+1]['user1_u_value']
                    new_u2_same = schedule[i]['user2_u_value'] == schedule[i+1]['user2_u_value']
                    
                    # Check if next pair also improved (if exists)
                    next_improved = True
                    if i+2 < len(schedule) and schedule[i+2]['task_type'] != 'distraction':
                        old_u1_same = schedule[i+1]['user1_u_value'] == schedule[i+2]['user1_u_value']
                        old_u2_same = schedule[i+1]['user2_u_value'] == schedule[i+2]['user2_u_value']
                        next_improved = not old_u1_same and not old_u2_same
                    
                    # Keep swap if it improved
                    if (not new_u1_same and not new_u2_same) and next_improved:
                        improved = True
                        break
                    else:
                        # Revert swap
                        schedule[i+1], schedule[j] = schedule[j], schedule[i+1]
                
                if improved:
                    break
        
        if not improved:
            break
    
    return schedule

def export_to_csv(schedule, filename="task_schedule.csv"):
    """Export the schedule to a CSV file."""
    output_path = SCRIPT_DIR / filename
    
    fieldnames = [
        'ui_task_number',
        'task_type',
        'user1_task_id',
        'user1_u_value',
        'user1_u_percentile',
        'user1_r_percentile',
        'user2_task_id',
        'user2_u_value',
        'user2_u_percentile',
        'user2_r_percentile',
    ]
    
    with open(output_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(schedule)
    
    print(f"CSV exported to: {output_path}")
    return output_path

def print_schedule_summary(schedule):
    """Print a summary of the schedule for verification."""
    print("\n" + "="*80)
    print("TASK SCHEDULE SUMMARY")
    print("="*80)
    
    # Count by type
    focal_count = sum(1 for s in schedule if s['task_type'] == 'focal')
    diagonal_count = sum(1 for s in schedule if s['task_type'] == 'diagonal')
    distraction_count = sum(1 for s in schedule if s['task_type'] == 'distraction')
    
    print(f"\nTask counts:")
    print(f"  - Focal (off-diagonal, u1≠u2): {focal_count}")
    print(f"  - Diagonal (u1=u2):            {diagonal_count}")
    print(f"  - Distraction (asymmetric):    {distraction_count}")
    print(f"  - Total:                       {len(schedule)}")
    
    # Verify off-diagonal constraint
    print(f"\nOff-diagonal constraint check:")
    violations = [s for s in schedule if s['task_type'] == 'focal' and s['user1_u_value'] == s['user2_u_value']]
    if violations:
        print(f"  ❌ VIOLATION: {len(violations)} focal tasks have u1 = u2")
    else:
        print(f"  ✓ All focal tasks satisfy u1 ≠ u2")
    
    # Verify distraction asymmetry
    print(f"\nDistraction asymmetry check:")
    distraction_entries = [s for s in schedule if s['task_type'] == 'distraction']
    symmetric_distractions = [s for s in distraction_entries if s['user1_task_id'] == s['user2_task_id']]
    if symmetric_distractions:
        print(f"  ❌ VIOLATION: {len(symmetric_distractions)} distraction tasks are symmetric")
    else:
        print(f"  ✓ All distraction tasks are asymmetric (different tasks for partners)")
    
    # R-percentile distribution (using user1's values for summary)
    r_values = [s['user1_r_percentile'] for s in schedule]
    print(f"\nR-percentile distribution:")
    print(f"  - Min: {min(r_values):.2f}")
    print(f"  - Max: {max(r_values):.2f}")
    print(f"  - Mean: {sum(r_values)/len(r_values):.2f}")
    print(f"  - Distinct values: {len(set(r_values))}")
    
    # Print full table
    print("\n" + "="*80)
    print("FULL SCHEDULE (30 tasks)")
    print("="*80)
    print(f"{'UI#':<4} {'Type':<12} {'U1 Task':<8} {'u1':<6} {'u1%':<7} {'r1%':<6} {'U2 Task':<8} {'u2':<6} {'u2%':<7} {'r2%':<6}")
    print("-"*90)
    
    for entry in schedule:
        print(f"{entry['ui_task_number']:<4} "
              f"{entry['task_type']:<12} "
              f"{str(entry['user1_task_id']):<8} "
              f"{entry['user1_u_value']:<6} "
              f"{entry['user1_u_percentile']:<7.2f} "
              f"{entry['user1_r_percentile']:<6.2f} "
              f"{str(entry['user2_task_id']):<8} "
              f"{entry['user2_u_value']:<6} "
              f"{entry['user2_u_percentile']:<7.2f} "
              f"{entry['user2_r_percentile']:<6.2f}")
    
    # Check for consecutive same u-values
    print("\n" + "="*80)
    print("CONSECUTIVE U-VALUE CHECK")
    print("="*80)
    
    consecutive_u1 = 0
    consecutive_u2 = 0
    for i in range(len(schedule) - 1):
        if schedule[i]['user1_u_value'] == schedule[i+1]['user1_u_value']:
            consecutive_u1 += 1
            print(f"  Task {schedule[i]['ui_task_number']}-{schedule[i+1]['ui_task_number']}: User1 u={schedule[i]['user1_u_value']} → {schedule[i+1]['user1_u_value']}")
        if schedule[i]['user2_u_value'] == schedule[i+1]['user2_u_value']:
            consecutive_u2 += 1
            print(f"  Task {schedule[i]['ui_task_number']}-{schedule[i+1]['ui_task_number']}: User2 u={schedule[i]['user2_u_value']} → {schedule[i+1]['user2_u_value']}")
    
    print(f"\nTotal consecutive same u-values:")
    print(f"  - User1: {consecutive_u1}")
    print(f"  - User2: {consecutive_u2}")
    
    # Check distraction distribution
    print("\n" + "="*80)
    print("DISTRACTION TASK DISTRIBUTION")
    print("="*80)
    distraction_positions = [i+1 for i, s in enumerate(schedule) if s['task_type'] == 'distraction']
    print(f"Distraction tasks at positions: {distraction_positions}")
    
    # Calculate gaps between distractions
    if len(distraction_positions) > 1:
        gaps = [distraction_positions[i+1] - distraction_positions[i] for i in range(len(distraction_positions)-1)]
        print(f"Gaps between distractions: {gaps}")
        print(f"Average gap: {sum(gaps)/len(gaps):.1f} tasks")

def main():
    print("Generating randomized task schedule...")
    print("Seed: 42 (for reproducibility - change for different randomization)")
    
    # Generate with a fixed seed for reproducibility during review
    schedule = generate_schedule(seed=42)
    
    # Print summary and full table
    print_schedule_summary(schedule)
    
    # Export to CSV
    csv_path = export_to_csv(schedule)
    
    print("\n" + "="*80)
    print("NEXT STEPS")
    print("="*80)
    print("1. Review the schedule above and the CSV file")
    print("2. If acceptable, confirm to proceed with implementation")
    print("3. To generate a different randomization, change the seed value")
    print("="*80)

if __name__ == "__main__":
    main()
