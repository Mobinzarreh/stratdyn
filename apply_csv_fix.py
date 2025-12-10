#!/usr/bin/env python3
"""
Apply the CSV deferred writing fix to stratdyn.js

The bug: When user01 submitted first, their CSV row was written immediately
with score=0 because partner hadn't submitted yet. When user02 submitted,
scores were calculated correctly but user01's CSV row already had wrong data.

The fix: CSV writing is now deferred until BOTH partners have submitted.
"""

import re

# Read the file
with open('stratdyn.js', 'r') as f:
    content = f.read()

# Find and replace the payoff calculation section
old_code = '''                // Payoff calculation - only if partner has also completed this task
                var myScore = null;
                var partnerScore = null;
                if (partner != null && experiment.decisions[partner]){
                    if (experiment.decisions[partner][taskIndex] && experiment.decisions[partner][taskIndex].design){
                        let myDesign = experiment.decisions[username][taskIndex].design.replace("\\xa0", " ");
                        let myTask = experiment.tasks[experiment.assignments[username][taskIndex]];
                        let partnerDesign = experiment.decisions[partner][taskIndex].design.replace("\\xa0", " ");
                        let partnerTask = experiment.tasks[experiment.assignments[partner][taskIndex]];

                        for (let myDesignIndex = 0; myDesignIndex < 4; myDesignIndex++) {
                            if (myDesign === myTask.options[myDesignIndex].label) {
                                for (let partnerDesignIndex = 0; partnerDesignIndex < 4; partnerDesignIndex++) {
                                    if (partnerDesign === partnerTask.options[partnerDesignIndex].label) {
                                        if (myDesignIndex < 3 && partnerDesignIndex < 3) {
                                            myScore = parseInt(myTask.options[myDesignIndex].upside);
                                            partnerScore = parseInt(partnerTask.options[partnerDesignIndex].upside);
                                        } else if (myDesignIndex < 3 && partnerDesignIndex >= 3) {
                                            myScore = parseInt(myTask.options[myDesignIndex].downside);
                                            partnerScore = parseInt(partnerTask.options[partnerDesignIndex].upside);
                                        } else if (myDesignIndex >= 3 && partnerDesignIndex < 3) {
                                            myScore = parseInt(myTask.options[myDesignIndex].upside);
                                            partnerScore = parseInt(partnerTask.options[partnerDesignIndex].downside);
                                        } else if (myDesignIndex >= 3 && partnerDesignIndex >= 3) {
                                            myScore = parseInt(myTask.options[myDesignIndex].downside);
                                            partnerScore = parseInt(partnerTask.options[partnerDesignIndex].downside);
                                        }
                                    }
                                }
                            }
                        }

                        // Store earned points (before penalty) separately for statistical analysis
                        experiment.decisions[username][taskIndex].pointsEarned = myScore;
                        experiment.decisions[partner][taskIndex].pointsEarned = partnerScore;
                        
                        // score field will be updated to net score (earned - penalty) after penalty calculation
                        experiment.decisions[username][taskIndex].score = myScore;
                        experiment.decisions[partner][taskIndex].score = partnerScore;
                    }
                }'''

new_code = '''                // Payoff calculation - only if partner has also completed this task
                var myScore = null;
                var partnerScore = null;
                let partnerHasSubmitted = false;
                
                if (partner != null && experiment.decisions[partner]){
                    if (experiment.decisions[partner][taskIndex] && experiment.decisions[partner][taskIndex].design){
                        partnerHasSubmitted = true;
                        let myDesign = experiment.decisions[username][taskIndex].design.replace("\\xa0", " ");
                        let myTask = experiment.tasks[experiment.assignments[username][taskIndex]];
                        let partnerDesign = experiment.decisions[partner][taskIndex].design.replace("\\xa0", " ");
                        let partnerTask = experiment.tasks[experiment.assignments[partner][taskIndex]];

                        for (let myDesignIndex = 0; myDesignIndex < 4; myDesignIndex++) {
                            if (myDesign === myTask.options[myDesignIndex].label) {
                                for (let partnerDesignIndex = 0; partnerDesignIndex < 4; partnerDesignIndex++) {
                                    if (partnerDesign === partnerTask.options[partnerDesignIndex].label) {
                                        if (myDesignIndex < 3 && partnerDesignIndex < 3) {
                                            myScore = parseInt(myTask.options[myDesignIndex].upside);
                                            partnerScore = parseInt(partnerTask.options[partnerDesignIndex].upside);
                                        } else if (myDesignIndex < 3 && partnerDesignIndex >= 3) {
                                            myScore = parseInt(myTask.options[myDesignIndex].downside);
                                            partnerScore = parseInt(partnerTask.options[partnerDesignIndex].upside);
                                        } else if (myDesignIndex >= 3 && partnerDesignIndex < 3) {
                                            myScore = parseInt(myTask.options[myDesignIndex].upside);
                                            partnerScore = parseInt(partnerTask.options[partnerDesignIndex].downside);
                                        } else if (myDesignIndex >= 3 && partnerDesignIndex >= 3) {
                                            myScore = parseInt(myTask.options[myDesignIndex].downside);
                                            partnerScore = parseInt(partnerTask.options[partnerDesignIndex].downside);
                                        }
                                    }
                                }
                            }
                        }

                        // Store earned points (before penalty) separately for statistical analysis
                        experiment.decisions[username][taskIndex].pointsEarned = myScore;
                        experiment.decisions[partner][taskIndex].pointsEarned = partnerScore;
                        
                        // score field will be updated to net score (earned - penalty) after penalty calculation
                        experiment.decisions[username][taskIndex].score = myScore;
                        experiment.decisions[partner][taskIndex].score = partnerScore;
                    }
                }'''

if old_code in content:
    content = content.replace(old_code, new_code)
    print("✅ Part 1: Added partnerHasSubmitted tracking")
else:
    print("❌ Part 1: Could not find the old code block to replace")
    exit(1)

# Now replace the CSV writing section
old_csv_code = '''                // Write to CSV with separated earned points and penalties for statistical analysis
                // Use training log file for training tasks (indices 0-1), main log file for analysis tasks
                fs.appendFile(
                    logFile, 
                    Date.now() + "," + 
                    username + "," + 
                    userGroup + "," + 
                    experiment.partners[username] + "," + 
                    task.label + "," + 
                    (decision.intention || '') + "," + 
                    (decision.intentionTimestamp || '') + "," + 
                    (decision.intentionTimeSpent || 0) + "," +
                    (decision.uValue || '') + "," + 
                    (decision.uPercentile || '') + "," + 
                    (decision.rValue || '') + "," + 
                    (decision.rPercentile || '') + "," + 
                    request.design + "," + 
                    (request.designName || '') + "," + 
                    Date.now() + "," + 
                    choiceTimeSpent + "," +
                    (totalTimeSpent || choiceTimeSpent) + "," +
                    (userOptionOrder[username] && userOptionOrder[username][taskIndex] ? userOptionOrder[username][taskIndex].join(';') : 'A;B;C;Y') + "," +
                    pointsEarned + "," +
                    pointsLostPenalty + "," +
                    netScore + "," + 
                    (partnerScore || '') + "\\r\\n",
                    err => {
                        if (err) {
                          console.error(err);
                        }
                    }
                );'''

new_csv_code = '''                // Helper function to write a user's decision to CSV
                function writeUserToCSV(user, partnerUser, userScore, partnerUserScore) {
                    const userDecision = experiment.decisions[user][taskIndex];
                    const userTask = experiment.tasks[experiment.assignments[user][taskIndex]];
                    const csvUserGroup = users[user] ? users[user].group : 'treatment';
                    const csvLogFiles = getLogFiles(csvUserGroup);
                    const csvLogFile = isTrainingTask ? csvLogFiles.trainingTask : csvLogFiles.task;
                    
                    // Calculate net score for this user
                    const csvPointsEarned = userScore || 0;
                    const csvPenalty = userDecision.pointsLostPenalty || 0;
                    const csvNetScore = csvPointsEarned - csvPenalty;
                    
                    // Update the decision object with final scores
                    userDecision.pointsEarned = csvPointsEarned;
                    userDecision.score = csvNetScore;
                    
                    console.log(`📝 Writing CSV for ${user}: Task ${userTask.label}, Earned=${csvPointsEarned}, Penalty=${csvPenalty}, Net=${csvNetScore}, PartnerScore=${partnerUserScore || ''}`);
                    
                    fs.appendFile(
                        csvLogFile, 
                        Date.now() + "," + 
                        user + "," + 
                        csvUserGroup + "," + 
                        experiment.partners[user] + "," + 
                        userTask.label + "," + 
                        (userDecision.intention || '') + "," + 
                        (userDecision.intentionTimestamp || '') + "," + 
                        (userDecision.intentionTimeSpent || 0) + "," +
                        (userDecision.uValue || '') + "," + 
                        (userDecision.uPercentile || '') + "," + 
                        (userDecision.rValue || '') + "," + 
                        (userDecision.rPercentile || '') + "," + 
                        userDecision.design + "," + 
                        (userDecision.designName || '') + "," + 
                        Date.now() + "," + 
                        (userDecision.choiceTimeSpent || 0) + "," +
                        (userDecision.totalTimeSpent || userDecision.choiceTimeSpent || 0) + "," +
                        (userOptionOrder[user] && userOptionOrder[user][taskIndex] ? userOptionOrder[user][taskIndex].join(';') : 'A;B;C;Y') + "," +
                        csvPointsEarned + "," +
                        csvPenalty + "," +
                        csvNetScore + "," + 
                        (partnerUserScore || '') + "\\r\\n",
                        err => {
                            if (err) {
                              console.error(err);
                            }
                        }
                    );
                }
                
                // DEFERRED CSV WRITING: Only write CSV when BOTH users have submitted
                // This ensures scores are calculated correctly for both users
                if (partnerHasSubmitted) {
                    // This is the SECOND user to submit - write BOTH users' data now
                    console.log(`✅ Both ${username} and ${partner} have submitted for task ${taskIndex}. Writing CSV for both.`);
                    
                    // Write current user's data (the second submitter)
                    writeUserToCSV(username, partner, myScore, partnerScore);
                    
                    // Write partner's data (the first submitter - their data was deferred)
                    writeUserToCSV(partner, username, partnerScore, myScore);
                } else {
                    // This is the FIRST user to submit - defer CSV writing until partner submits
                    console.log(`⏳ ${username} submitted first for task ${taskIndex}. Deferring CSV write until partner ${partner} submits.`);
                }'''

if old_csv_code in content:
    content = content.replace(old_csv_code, new_csv_code)
    print("✅ Part 2: Replaced CSV writing with deferred logic")
else:
    print("❌ Part 2: Could not find the CSV writing code block to replace")
    # Try to find a portion of it
    if "// Write to CSV with separated earned points" in content:
        print("   Found the comment but structure may differ")
    exit(1)

# Write the modified content
with open('stratdyn.js', 'w') as f:
    f.write(content)

print("✅ Fix applied successfully!")
print("   - Added partnerHasSubmitted flag")
print("   - Added writeUserToCSV helper function")
print("   - CSV writing now deferred until both partners submit")
