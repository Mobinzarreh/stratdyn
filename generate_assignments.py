#!/usr/bin/env python3
"""
Generate task assignments for the stratdyn experiment.

Pairing Logic:
- Each participant encounters all possible paired u-level combinations
- For a participant with u = 0.62, they face partners with u = 0.62, 0.67, 0.72, 0.77, 0.82
- 25 focal tasks (5 u-levels × 5 repetitions each)
- 5 distraction tasks interspersed
- Total: 30 tasks per participant
"""

import json
import random

# Task indices by u-value
# Tasks 0-4: u=0.62 (indices 0,1,2,3,4)
# Tasks 5-9: u=0.67 (indices 5,6,7,8,9)
# Tasks 10-14: u=0.72 (indices 10,11,12,13,14)
# Tasks 15-19: u=0.77 (indices 15,16,17,18,19)
# Tasks 20-24: u=0.82 (indices 20,21,22,23,24)
# Tasks 25-29: Distraction (indices 25,26,27,28,29)

U_VALUES = [0.62, 0.67, 0.72, 0.77, 0.82]

# Map u-value to task indices
def get_task_indices_for_u(u_value):
    """Return list of task indices for a given u-value"""
    if u_value == 0.62:
        return [0, 1, 2, 3, 4]
    elif u_value == 0.67:
        return [5, 6, 7, 8, 9]
    elif u_value == 0.72:
        return [10, 11, 12, 13, 14]
    elif u_value == 0.77:
        return [15, 16, 17, 18, 19]
    elif u_value == 0.82:
        return [20, 21, 22, 23, 24]
    else:
        raise ValueError(f"Unknown u-value: {u_value}")

def generate_assignments_for_pair(user1, user2, u1, u2):
    """
    Generate task assignments for a pair of users.
    
    Each user encounters their partner at all 5 u-levels:
    - User1 with u1 faces User2 at u=0.62, 0.67, 0.72, 0.77, 0.82
    - User2 with u2 faces User1 at u=0.62, 0.67, 0.72, 0.77, 0.82
    
    Returns: (user1_assignments, user2_assignments)
    """
    # Get task indices for each user's u-value
    user1_tasks = get_task_indices_for_u(u1)
    user2_tasks = get_task_indices_for_u(u2)
    
    # Each user needs to face their partner at all 5 u-levels
    # This means 5 tasks where they're paired on matching indices
    
    user1_assignments = []
    user2_assignments = []
    
    # For each of the 5 u-values, select one task from each user's pool
    for i, target_u in enumerate(U_VALUES):
        # User1 gets a task with their u-value (u1)
        # User2 gets a task with the target u-value
        user1_task = user1_tasks[i % len(user1_tasks)]
        
        # User2's task depends on which u-level we want them at
        user2_task_pool = get_task_indices_for_u(target_u)
        user2_task = user2_task_pool[i % len(user2_task_pool)]
        
        user1_assignments.append(user1_task)
        user2_assignments.append(user2_task)
    
    # Now we have 5 focal tasks for each user
    # We need to add 5 more focal tasks to make 10 focal tasks each
    # (Each user should experience all their own tasks)
    
    # Add remaining tasks from user1's pool
    remaining_user1 = [t for t in user1_tasks if t not in user1_assignments]
    user1_assignments.extend(remaining_user1)
    
    # For user2, we need to complete the pairing logic
    # User2 also needs to face user1 at all 5 u-levels
    # This means user2 needs to face tasks with u1 value
    user1_u_tasks = get_task_indices_for_u(u1)
    
    # Add tasks where user2 faces user1's u-level
    for i, target_u in enumerate(U_VALUES):
        if target_u == u1:
            continue  # Skip if already covered
        user2_task_pool = get_task_indices_for_u(u2)
        # Find a task not yet assigned
        for task in user2_task_pool:
            if task not in user2_assignments:
                user2_assignments.append(task)
                break
    
    # Fill remaining with user2's own tasks
    remaining_user2 = [t for t in user2_tasks if t not in user2_assignments]
    user2_assignments.extend(remaining_user2)
    
    # Ensure we have exactly 25 focal tasks (5 from each u-level)
    # Pad if needed
    while len(user1_assignments) < 25:
        user1_assignments.append(random.choice(user1_tasks))
    while len(user2_assignments) < 25:
        user2_assignments.append(random.choice(user2_tasks))
    
    # Trim to 25 if over
    user1_assignments = user1_assignments[:25]
    user2_assignments = user2_assignments[:25]
    
    # Add 5 distraction tasks at specific positions (interspersed)
    distraction_indices = [25, 26, 27, 28, 29]
    distraction_positions = [5, 11, 17, 23, 29]  # Positions to insert distractions
    
    for i, pos in enumerate(distraction_positions):
        user1_assignments.insert(pos, distraction_indices[i])
        user2_assignments.insert(pos, distraction_indices[i])
    
    return user1_assignments, user2_assignments


def generate_crossed_pairing_assignments():
    """
    Generate assignments where partners encounter each other at all u-level combinations.
    
    Strategy: Create a 5x5 matrix where each cell (i,j) represents a pairing where:
    - Actor 1 has u-value from row i (0.62, 0.67, 0.72, 0.77, 0.82)
    - Actor 2 has u-value from column j (0.62, 0.67, 0.72, 0.77, 0.82)
    
    For each pair, we need 25 focal tasks covering all (i,j) combinations.
    This ensures each actor encounters their partner at ALL u-level combinations.
    """
    
    assignments = {}
    partners = {}
    
    # Create assignments for user pairs
    users = ["user01", "user02", "user03", "user04", "user05", "user06"]
    
    for pair_idx in range(0, len(users), 2):
        if pair_idx + 1 >= len(users):
            break
            
        user1 = users[pair_idx]
        user2 = users[pair_idx + 1]
        
        # Set up partnership
        partners[user1] = user2
        partners[user2] = user1
        
        # Build assignments: 25 focal tasks covering all u-level combinations
        user1_focal = []
        user2_focal = []
        
        # Create 5x5 pairing matrix where both users experience all pairings
        # Row = user1's u-value, Column = user2's u-value
        task_counter = 0
        for actor1_u_idx, actor1_u in enumerate(U_VALUES):
            # Actor 1 uses tasks from their u-level
            actor1_tasks = get_task_indices_for_u(actor1_u)
            
            for actor2_u_idx, actor2_u in enumerate(U_VALUES):
                # Actor 2 uses tasks from their u-level  
                actor2_tasks = get_task_indices_for_u(actor2_u)
                
                # Use different tasks within each u-level to add variety
                # Each actor uses all 5 tasks from their u-level across the 5 pairings
                user1_focal.append(actor1_tasks[actor2_u_idx % len(actor1_tasks)])
                user2_focal.append(actor2_tasks[actor1_u_idx % len(actor2_tasks)])
                
                task_counter += 1
        
        # Now we have 25 focal tasks for each user covering all pairings
        # Intersperse 5 distraction tasks
        distraction_tasks = [25, 26, 27, 28, 29]
        distraction_positions = [5, 11, 17, 23, 29]  # After every 5 focal tasks
        
        # Insert distractions into both users' sequences
        user1_full = user1_focal.copy()
        user2_full = user2_focal.copy()
        
        for i, dist_task in enumerate(distraction_tasks):
            pos = distraction_positions[i]
            user1_full.insert(pos, dist_task)
            user2_full.insert(pos, dist_task)
        
        assignments[user1] = user1_full
        assignments[user2] = user2_full
    
    return assignments, partners


# Generate assignments
print("Generating task assignments...")
assignments, partners = generate_crossed_pairing_assignments()

# Load existing experiment.json
with open('/home/mzarreh/projects2/stratdyn/data/experiment.json', 'r') as f:
    experiment = json.load(f)

# Update assignments and partners
experiment['assignments'] = assignments
experiment['partners'] = partners

# Save back to file
with open('/home/mzarreh/projects2/stratdyn/data/experiment.json', 'w') as f:
    json.dump(experiment, f, indent=4)

print("✓ Updated experiment.json with new assignments and partners")
print(f"\nGenerated assignments for {len(assignments)} users:")
for user in sorted(assignments.keys()):
    print(f"  {user}: partner = {partners[user]}, tasks = {len(assignments[user])}")
    
print("\nTask sequence structure:")
print("  Tasks 0-4: u=0.62, then Distraction Task 1")
print("  Tasks 5-9: u=0.67, then Distraction Task 2")
print("  Tasks 10-14: u=0.72, then Distraction Task 3")
print("  Tasks 15-19: u=0.77, then Distraction Task 4")
print("  Tasks 20-24: u=0.82, then Distraction Task 5")
print("\nTotal: 30 tasks (25 focal + 5 distraction)")

# Verify the pairing logic
print("\n" + "="*70)
print("=== PAIRING VERIFICATION ===")
print("="*70)

user1 = "user01"
user2 = partners[user1]

# Load tasks to verify
with open('/home/mzarreh/projects2/stratdyn/data/experiment.json', 'r') as f:
    exp = json.load(f)
    tasks = exp['tasks']

print(f"\nPair: {user1} ↔ {user2}")
print(f"\nShowing all 25 focal task pairings (excluding distractions):\n")
print(f"{'Pos':<5} {'User1 Task':<15} {'u1':<6} {'User2 Task':<15} {'u2':<6} {'R-value'}")
print("-" * 70)

from math import log

focal_count = 0
pairing_matrix = {}  # Track which (u1, u2) combinations we've seen

for i, (task1_idx, task2_idx) in enumerate(zip(assignments[user1], assignments[user2])):
    task1 = tasks[task1_idx]
    task2 = tasks[task2_idx]
    
    # Skip distraction tasks for this analysis
    if task1.get('isDistraction') or task2.get('isDistraction'):
        continue
    
    focal_count += 1
    u1 = task1['uValue']
    u2 = task2['uValue']
    
    # Calculate R value
    r_value = 0.5 * log(u1/(1-u1)) + 0.5 * log(u2/(1-u2))
    
    # Track pairing
    pair_key = (u1, u2)
    pairing_matrix[pair_key] = pairing_matrix.get(pair_key, 0) + 1
    
    print(f"{i:<5} {task1['label']:<15} {u1:<6} {task2['label']:<15} {u2:<6} {r_value:>7.3f}")

print("\n" + "="*70)
print("=== PAIRING MATRIX: Count of each (u1, u2) combination ===")
print("="*70)
print(f"\n{'u1 \\ u2':<10}", end="")
for u2 in U_VALUES:
    print(f"{u2:<8}", end="")
print()
print("-" * 50)

for u1 in U_VALUES:
    print(f"{u1:<10}", end="")
    for u2 in U_VALUES:
        count = pairing_matrix.get((u1, u2), 0)
        print(f"{count:<8}", end="")
    print()

print("\n" + "="*70)
print("VERIFICATION RESULT:")
all_pairs_covered = all(pairing_matrix.get((u1, u2), 0) > 0 
                        for u1 in U_VALUES for u2 in U_VALUES)
if all_pairs_covered:
    print("✓ SUCCESS: All 25 u-level combinations are covered!")
    print(f"  Each participant encounters their partner at ALL u-levels.")
else:
    print("✗ WARNING: Some u-level combinations are missing!")
    missing = [(u1, u2) for u1 in U_VALUES for u2 in U_VALUES 
               if pairing_matrix.get((u1, u2), 0) == 0]
    print(f"  Missing combinations: {missing}")
print("="*70)
