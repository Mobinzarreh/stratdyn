module.exports = function(io) {
    const fs = require('fs');
    var _ = require('lodash');
    const { calculateUPercentile, calculateRiskDominance, calculateRPercentile, getTaskUValue } = require('./utils/calculations');

    // read the admin credentials from file
    const adminCredentials = JSON.parse(
        fs.readFileSync('./data/adminCredentials.json')
    );

    // read the user credentials from file
    const userCredentials = JSON.parse(
        fs.readFileSync('./data/userCredentials.json')
    );

    // read the user credentials from file
    const experiment = JSON.parse(
        fs.readFileSync('./data/experiment.json')
    );

    // Log session metadata including distraction task toggle
    const sessionMetadata = {
        session_id: `session_${Date.now()}`,
        use_distraction_tasks: experiment.use_distraction_tasks || false,
        timestamp: new Date().toISOString()
    };
    console.log('=== SESSION METADATA ===');
    console.log(JSON.stringify(sessionMetadata, null, 2));
    console.log('========================');

    /**
     * Build the task sequence for the experiment
     * If use_distraction_tasks is true, insert distraction tasks at specified positions
     * Returns an array of task objects in presentation order
     */
    function buildTaskSequence() {
        const useDistraction = experiment.use_distraction_tasks || false;
        const baseTasks = experiment.tasks.slice(); // Copy all tasks (training + focal)
        
        if (!useDistraction) {
            // No distraction tasks - return base tasks as-is
            console.log(`Task sequence: ${baseTasks.length} tasks (distraction DISABLED)`);
            return baseTasks;
        }
        
        // Build sequence with distraction tasks inserted
        const distractionTasks = experiment.distraction_tasks || [];
        const positions = experiment.distraction_positions || [3, 9, 15, 20, 27];
        
        // Start with training tasks (indices 0-1)
        const trainingTasks = baseTasks.slice(0, 2);
        const focalTasks = baseTasks.slice(2); // Tasks 1-25 (indices 2-26)
        
        // Build the final sequence
        let finalSequence = [...trainingTasks];
        let distractionIndex = 0;
        
        // Positions are 1-indexed positions in focal task sequence
        // Position 3 means after the 1st focal task (index 0 in focal array)
        for (let i = 0; i < focalTasks.length; i++) {
            finalSequence.push(focalTasks[i]);
            
            // Check if we need to insert a distraction task after this focal task
            // Position N means after focal task N (1-indexed)
            const focalPosition = i + 1; // 1-indexed position
            if (distractionIndex < distractionTasks.length && positions.includes(focalPosition + 2)) {
                // +2 because positions include training tasks
                const distTask = { ...distractionTasks[distractionIndex] };
                distTask.sequenceIndex = finalSequence.length;
                finalSequence.push(distTask);
                distractionIndex++;
            }
        }
        
        // If there are remaining distraction tasks (e.g., position 27 = after all focal tasks)
        while (distractionIndex < distractionTasks.length) {
            const distTask = { ...distractionTasks[distractionIndex] };
            distTask.sequenceIndex = finalSequence.length;
            finalSequence.push(distTask);
            distractionIndex++;
        }
        
        console.log(`Task sequence: ${finalSequence.length} tasks (distraction ENABLED)`);
        console.log(`  - Training: 2, Focal: ${focalTasks.length}, Distraction: ${distractionTasks.length}`);
        
        return finalSequence;
    }

    // Build the task sequence once at startup
    const taskSequence = buildTaskSequence();
    
    /**
     * Get the effective task sequence for a user
     * Maps user assignment indices to actual task objects
     */
    function getUserTaskSequence(username) {
        const useDistraction = experiment.use_distraction_tasks || false;
        
        if (!useDistraction) {
            // Simple case: assignments directly map to tasks
            return experiment.assignments[username].map(idx => experiment.tasks[idx]);
        }
        
        // With distraction: we need to interleave distraction tasks
        // User assignments still refer to focal task indices (0-1 = training, 2-26 = focal)
        // We insert distraction tasks AFTER specific focal task counts
        const assignments = experiment.assignments[username];
        const distractionTasks = experiment.distraction_tasks || [];
        // distraction_positions now means: insert after this many focal tasks
        // e.g., [5, 11, 17, 22, 25] means insert after focal task 5, 11, 17, 22, 25
        const insertAfterFocalCounts = experiment.distraction_positions || [5, 11, 17, 22, 25];
        
        let sequence = [];
        let assignmentIndex = 0;
        let focalTaskCount = 0; // Count of focal tasks seen (excluding training)
        let distractionIdx = 0;
        
        // Process training tasks first (assignments 0, 1)
        for (let i = 0; i < 2 && assignmentIndex < assignments.length; i++) {
            sequence.push({
                task: experiment.tasks[assignments[assignmentIndex]],
                originalIndex: assignments[assignmentIndex],
                assignmentIndex: assignmentIndex,
                isDistraction: false
            });
            assignmentIndex++;
        }
        
        // Process focal tasks with distraction insertions
        while (assignmentIndex < assignments.length) {
            // Add focal task
            sequence.push({
                task: experiment.tasks[assignments[assignmentIndex]],
                originalIndex: assignments[assignmentIndex],
                assignmentIndex: assignmentIndex,
                isDistraction: false
            });
            focalTaskCount++;
            
            // Check if distraction task should be inserted after this focal task count
            if (distractionIdx < distractionTasks.length && 
                insertAfterFocalCounts[distractionIdx] === focalTaskCount) {
                sequence.push({
                    task: distractionTasks[distractionIdx],
                    originalIndex: -1, // Distraction tasks don't have original index
                    assignmentIndex: -1,
                    isDistraction: true,
                    distractionIndex: distractionIdx
                });
                distractionIdx++;
            }
            
            assignmentIndex++;
        }
        
        return sequence;
    }

    /**
     * Get proper task label for display
     * @param {string} username - The user
     * @param {number} seqIndex - The sequence index
     * @returns {string} - Human-readable task label
     */
    function getTaskLabel(username, seqIndex) {
        if (seqIndex === undefined || seqIndex === null) return 'Not Started';
        if (seqIndex === -4) return 'Consent Page';
        if (seqIndex === -3) return 'Briefing';
        if (seqIndex === -2) return 'Demographics Survey';
        if (seqIndex === -1) return 'Demographics Survey';  // In case of -1, show demographics
        if (seqIndex === 0) return 'Training Task 1';
        if (seqIndex === 1) return 'Training Task 2';
        
        const userSequence = getUserTaskSequence(username);
        const totalSeqLength = userSequence.length;
        
        if (seqIndex >= totalSeqLength) return 'Post-Survey';
        if (seqIndex >= totalSeqLength + 1) return 'Complete';
        
        // For seqIndex >= 2, determine if focal or distraction
        if (seqIndex >= 2 && seqIndex < userSequence.length) {
            const seqItem = userSequence[seqIndex];
            if (seqItem.isDistraction) {
                return seqItem.task.label || 'Distraction Task';
            } else {
                // Count focal tasks up to this position
                let focalCount = 0;
                for (let i = 2; i <= seqIndex; i++) {
                    if (!userSequence[i].isDistraction) {
                        focalCount++;
                    }
                }
                return `Task ${focalCount}`;
            }
        }
        
        return 'Unknown';
    }

    // define space to save decisions
    // When distraction is enabled, we need space for more tasks
    const totalTaskSlots = experiment.use_distraction_tasks 
        ? experiment.tasks.length + (experiment.distraction_tasks?.length || 0)
        : experiment.tasks.length;
        
    experiment.decisions = {};
    Object.keys(experiment.assignments).forEach((user) => {
        experiment.decisions[user] = Array.from(Array(totalTaskSlots), ()=> {
            return {
                "intention": null,
                "intentionTimestamp": null,
                "design": null,
                "strategy": null,
                "uValue": null,
                "uPercentile": null,
                "rValue": null,
                "rPercentile": null,
                "score": null,
                "isDistraction": false,
                "isTraining": false
            };
        });
    });

    // INDEPENDENT USER SOLUTION: Each user tracks their own progress
    let autoAdvance = true; // Set to true for testing, false for admin-controlled sessions
    
    // Per-user task index: {username: taskIndex}
    // NEW FLOW with Consent, Briefing, and Training Tasks:
    // -4 = consent, -3 = briefing, -2 = demographics
    // 0-1 = training tasks (2 practice tasks, not analyzed)
    // 2-31 = main experiment (30 tasks)
    // 32 = post-survey, 33+ = thank you
    const userTaskIndex = {};
    
    // RANDOMIZATION: Store presented option order per user per task
    // Structure: { "user01": { "0": ["B", "A", "C", "Y"], "1": [...], ... }, ... }
    const userOptionOrder = {};
    
    // PARTNER SYNCHRONIZATION: Track who completed which task
    // Structure: { "user01": 5, "user02": 4, ... } = user01 completed up to task 5
    const userTaskCompletion = {};

    let timestamp = Math.floor(new Date().getTime() / 1000);
    let sessionId = 'session1_pilot'; // Can be changed as needed

    // Ensure logs directory exists
    const logsDir = './logs';
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
        console.log('Created logs directory');
    }

    // Helper function to get log files based on user group
    function getLogFiles(group) {
        return {
            task: `${logsDir}/task_${group}_${sessionId}.csv`,
            trainingTask: `${logsDir}/training_task_${group}_${sessionId}.csv`, // Separate file for training data
            presurvey: `${logsDir}/presurvey_${group}_${sessionId}.csv`,
            postsurvey: `${logsDir}/postsurvey_${group}_${sessionId}.csv`,
            demographics: `${logsDir}/demographics_survey_${group}_${sessionId}.csv`
        };
    }

    // Initialize log files for both groups
    const createdLogFiles = new Set();
    
    function initializeLogFiles(group) {
        if (createdLogFiles.has(group)) return; // Already created for this group
        
        const logFiles = getLogFiles(group);
        
        // Create main task log file with new headers (includes distraction flag)
        fs.writeFile(
            logFiles.task, 
            "timestamp,username,group,partner,task,distraction,training,intention,intentionTimestamp,intentionTimeSpent,uValue,uPercentile,rValue,rPercentile,finalChoice,designName,finalChoiceTimestamp,choiceTimeSpent,totalTimeSpent,presentedOrder,pointsEarned,pointsLostPenalty,scoreNet,partnerScore\r\n",
            err => {
                if (err) {
                    console.error(err);
                }
            }
        );

        // Create training task log file (separate from main analysis)
        fs.writeFile(
            logFiles.trainingTask, 
            "timestamp,username,group,partner,task,distraction,training,intention,intentionTimestamp,intentionTimeSpent,uValue,uPercentile,rValue,rPercentile,finalChoice,finalChoiceTimestamp,choiceTimeSpent,totalTimeSpent,presentedOrder,pointsEarned,pointsLostPenalty,scoreNet,partnerScore\r\n",
            err => {
                if (err) {
                    console.error(err);
                }
            }
        );

        // Create pre-survey log file
        fs.writeFile(
            logFiles.presurvey, 
            "timestamp,username,group,q1t2,q2r3,q3c1,q4r2,q5t1,q6r1,q7c3,q8t3,q9c2\r\n",
            err => {
                if (err) {
                    console.error(err);
                }
            }
        );

        // Create post-survey log file
        fs.writeFile(
            logFiles.postsurvey, 
            "timestamp,username,group,q1c2,q2r1,q3t3,q4r2,q5t1,q6c3,q7t2,q8c1,q9r3\r\n",
            err => {
                if (err) {
                    console.error(err);
                }
            }
        );

        // Create demographics survey log file
        fs.writeFile(
            logFiles.demographics, 
            "timestamp,username,group,demographics-survey-q1,demographics-survey-q2,demographics-survey-q3,demographics-survey-q4,demographics-survey-q5,demographics-survey-q6,demographics-survey-q7,demographics-survey-q8\r\n",
            err => {
                if (err) {
                    console.error(err);
                }
            }
        );
        
        createdLogFiles.add(group);
    }

    // Initialize decline and reschedule log files in logs directory
    const declineLogPath = `${logsDir}/decline_log.csv`;
    const rescheduleLogPath = `${logsDir}/reschedule_log.csv`;
    
    if (!fs.existsSync(declineLogPath)) {
        fs.writeFileSync(declineLogPath, 'timestamp,username,group,event\n');
        console.log('Created decline_log.csv in logs directory');
    }
    if (!fs.existsSync(rescheduleLogPath)) {
        fs.writeFileSync(rescheduleLogPath, 'timestamp,username,group,email,phone,preferredTime\n');
        console.log('Created reschedule_log.csv in logs directory');
    }

    // keep track of logged-in users and admins
    // users structure: {username: {socket: socket, group: 'treatment'|'control'}}
    const users = {};
    const admins = {};

    // RANDOMIZATION FUNCTION: Shuffle collaborative options (A, B, C), keep Y last
    function shuffleCollaborativeOptions(task, username, taskIndex) {
        // Check if we already have a randomized order for this user+task
        if (!userOptionOrder[username]) {
            userOptionOrder[username] = {};
        }
        
        if (userOptionOrder[username][taskIndex]) {
            // Use existing order (consistency within task between Part 1 and Part 2)
            const savedOrder = userOptionOrder[username][taskIndex];
            const reorderedOptions = savedOrder.map(label => 
                task.options.find(opt => opt.label === label)
            );
            task.options = reorderedOptions;
            task.presentedOrder = savedOrder;
            console.log(`User ${username} Task ${taskIndex}: Using saved order = ${savedOrder.join(',')}`);
            return task;
        }
        
        // First time seeing this task - create new randomization
        // Separate collaborative (A, B, C) from individual (Y)
        const collaborative = task.options.slice(0, 3); // A, B, C
        const individual = task.options[3]; // Y
        
        // Fisher-Yates shuffle (true randomization)
        for (let i = collaborative.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [collaborative[i], collaborative[j]] = [collaborative[j], collaborative[i]];
        }
        
        // Recombine: shuffled collaborative + individual at end
        task.options = [...collaborative, individual];
        
        // Store the presented order for logging and consistency
        task.presentedOrder = task.options.map(opt => opt.label);
        userOptionOrder[username][taskIndex] = task.presentedOrder;
        
        console.log(`User ${username} Task ${taskIndex}: New randomized order = ${task.presentedOrder.join(',')}`);
        return task;
    }

    // bind behavior to a new socket.io connection
    io.on('connection', (socket) => {
        // keep track of username
        var username = null;
        
        function showDesignTask(context, stage = 'intention', targetUsername = null) {
            try {
                // Use targetUsername if provided (for admin operations), otherwise use current username
                const activeUsername = targetUsername || username;
                // Get this user's current task index in the sequence
                const sequenceIndex = userTaskIndex[activeUsername] || 0;
                
                // Get the task sequence for this user (handles distraction task insertion)
                const userSequence = getUserTaskSequence(activeUsername);
            
            if (sequenceIndex < 0 || sequenceIndex >= userSequence.length) {
                console.error(`Invalid sequence index ${sequenceIndex} for ${activeUsername}`);
                return;
            }
            
            const seqItem = userSequence[sequenceIndex];
            const isDistraction = seqItem.isDistraction || false;
            
            // DEBUG: Log what we're retrieving
            console.log(`showDesignTask [${stage}] - User: ${activeUsername}, SeqIndex: ${sequenceIndex}, IsDistraction: ${isDistraction}`);
            
            // Get the task data
            let task;
            if (isDistraction) {
                // Distraction task - use directly from the sequence item
                task = JSON.parse(JSON.stringify(seqItem.task));
                task.isDistraction = true;
                console.log(`  [DISTRACTION] Task Label: ${task.label}`);
            } else {
                // Regular task - use the originalIndex from sequence item (which is the task index)
                task = JSON.parse(JSON.stringify(experiment.tasks[seqItem.originalIndex]));
                task.isDistraction = false;
                console.log(`  Task Label: ${task.label}, u-Value: ${task.uValue}`);
            }
            
            console.log(`  Original Options:`, task.options.map(o => `${o.label}(${o.upside}/${o.downside})`).join(', '));
            
            // Get partner info
            task.partner = experiment.partners[activeUsername];
            
            // Get partner's task for R calculation (only for non-distraction tasks)
            if (!isDistraction && task.partner) {
                const partnerSequence = getUserTaskSequence(task.partner);
                if (sequenceIndex < partnerSequence.length && !partnerSequence[sequenceIndex].isDistraction) {
                    const partnerSeqItem = partnerSequence[sequenceIndex];
                    task.partnerTask = JSON.parse(JSON.stringify(experiment.tasks[partnerSeqItem.originalIndex]));
                } else {
                    // Partner is on a different task type at this sequence position - use a copy
                    task.partnerTask = JSON.parse(JSON.stringify(task));
                    delete task.partnerTask.partnerTask; // Prevent circular reference
                }
            } else {
                // For distraction tasks, create a minimal partnerTask (not needed but prevents errors)
                task.partnerTask = { uValue: task.uValue || 0.5 }; // Minimal object, no circular reference
            }
            
            // RANDOMIZATION: Ensure consistent option order between intention and choice stages
            task = shuffleCollaborativeOptions(task, activeUsername, sequenceIndex);
            console.log(`  [${stage.toUpperCase()}] Options:`, task.options.map(o => `${o.label}(${o.upside}/${o.downside})`).join(', '));
            
            // Calculate percentiles
            const myUValue = task.uValue;
            let myUPercentile, rPercentile, rValue;
            
            if (isDistraction) {
                // Distraction tasks use fixed percentiles
                myUPercentile = task.individual_percentile;
                rPercentile = task.paired_percentile;
                rValue = 0; // Not meaningful for distraction tasks
                console.log(`  [DISTRACTION] Fixed percentiles: U=${myUPercentile}%, R=${rPercentile}%`);
            } else if (task.isTraining) {
                // Training tasks use fixed example values - SAME FOR ALL USERS
                // but DIFFERENT between Training Task 1 and Training Task 2
                if (sequenceIndex === 0) {
                    // Training Task 1: lower difficulty
                    myUPercentile = 25;
                    rPercentile = 75;
                } else {
                    // Training Task 2: higher difficulty
                    myUPercentile = 60;
                    rPercentile = 40;
                }
                rValue = 0;
                console.log(`  [TRAINING] Fixed values (Task ${sequenceIndex + 1}): U=${myUPercentile}%, R=${rPercentile}%`);
            } else {
                // Focal tasks - calculate percentiles from focal tasks only
                myUPercentile = calculateUPercentile(myUValue, experiment.tasks, task);
                const partnerUValue = task.partnerTask.uValue;
                rValue = calculateRiskDominance(myUValue, partnerUValue);
                rPercentile = calculateRPercentile(rValue, experiment.tasks, task);
                console.log(`  [FOCAL] Calculated: U=${myUPercentile}%, R=${rPercentile}%`);
            }
            
            task.uValue = myUValue;
            task.uPercentile = myUPercentile;
            task.rValue = rValue;
            task.rPercentile = rPercentile;
            
            // Get user group
            const userGroup = users[activeUsername] ? users[activeUsername].group : 'treatment';
            task.userGroup = userGroup;
            task.stage = stage;
            
            // Determine task numbering for UI
            const useDistraction = experiment.use_distraction_tasks || false;
            const totalDisplayTasks = useDistraction ? 30 : 25; // 25 focal + 5 distraction OR just 25 focal
            
            if (task.isTraining) {
                task.taskNumber = sequenceIndex + 1; // Training Task 1 or 2
                task.totalTasks = 2;
                task.taskLabel = `Training Task ${sequenceIndex + 1}`;
            } else {
                // For UI display, use sequential numbering (1-30) for all non-training tasks
                // This counts position in sequence minus the 2 training tasks
                const displayPosition = sequenceIndex - 1; // sequenceIndex 2 becomes display 1
                task.totalTasks = totalDisplayTasks;
                
                if (isDistraction) {
                    task.taskLabel = task.label; // Use the distraction task label (e.g., "Distr_Collab_1")
                    task.taskNumber = displayPosition; // Sequential position for progress
                } else {
                    // For focal tasks, count ALL tasks (focal + distraction) seen so far for sequential numbering
                    // This ensures after distraction Task 6, the next focal is Task 7
                    task.taskLabel = `Task ${displayPosition}`;
                    task.taskNumber = displayPosition;
                }
            }
            
            // Progress calculation
            const totalSeqLength = userSequence.length;
            task.progress = Math.round(100 * (sequenceIndex + 1) / totalSeqLength);
            
            // DEBUG: Log final task being sent
            console.log(`  ╔═══════════════════════════════════════════════════════════`);
            console.log(`  ║ SENDING TO CLIENT - ${activeUsername}`);
            console.log(`  ║ Stage: ${stage.toUpperCase()}, IsDistraction: ${isDistraction}`);
            console.log(`  ║ SeqIndex: ${sequenceIndex}, TaskLabel: ${task.taskLabel}`);
            console.log(`  ║ U-Percentile: ${task.uPercentile}%, R-Percentile: ${task.rPercentile}%`);
            console.log(`  ║ Options: ${task.options.map(o => `${o.label}(${o.upside}/${o.downside})`).join(', ')}`);
            console.log(`  ╚═══════════════════════════════════════════════════════════\n`);
            
            // Remove partnerTask before sending to client (not needed client-side, prevents any circular ref issues)
            const taskToSend = { ...task };
            delete taskToSend.partnerTask;
            
            // send a socket.io show design task
            console.log(`  >>> Emitting 'show-design-task' to ${activeUsername}...`);
            context.emit('show-design-task', taskToSend);
            console.log(`  >>> Emit completed for ${activeUsername}`);
            } catch (error) {
                console.error(`Error in showDesignTask for ${activeUsername}:`, error);
                console.error(`Stack trace:`, error.stack);
            }
        }

        function showWelcomeScreen(context) {
            // send a socket.io show welcome screen
            context.emit('show-welcome-screen');
        }

        function showConsentScreen(context) {
            // send a socket.io show consent screen
            context.emit('show-consent-screen');
        }

        function showBriefingScreen(context) {
            // send a socket.io show briefing screen
            context.emit('show-briefing-screen');
        }

        function showDemographicsSurveyScreen(context) {
            // send a socket.io show demographics survey screen
            context.emit('show-demographics-survey-screen');
        }

        // NOTE: showSurveyScreen (pre-survey) was removed from the experiment flow.
        // Participants now go directly from Demographics Survey to Training Task 1.

        function showPostSurveyScreen(context) {
            // send a socket.io show post survey screen
            context.emit('show-postsurvey-screen');
        }

        function showWaitScreen(context) {
            // send a socket.io show wait screen
            context.emit('show-wait-screen');
        }

        function showThankYouScreen(context, reason = 'unspecified') {
            // send a socket.io show thank you screen
            try {
                const targetUser = username || 'unknown';
                const idx = userTaskIndex[targetUser];
                console.log(`[THANK-YOU] Emitting show-thank-you-screen for ${targetUser} | reason=${reason} | index=${idx}`);
            } catch (e) {
                console.log('[THANK-YOU] Emitting show-thank-you-screen (logging failed)', e);
            }
            context.emit('show-thank-you-screen');
        }

        function showAdminScreen(context) {
            let decisions = {};
            
            // Get all users (both online and offline)
            let allUsers = new Set([
                ...Object.keys(users),
                ...Object.keys(experiment.decisions)
            ]);
            
            allUsers.forEach((user) => {
                // Get this user's current task index
                const taskIndex = userTaskIndex[user] !== undefined ? userTaskIndex[user] : -4;
                const userGroup = users[user] ? users[user].group : (experiment.decisions[user] ? 'unknown' : 'unknown');
                
                // Build task label using helper function
                const userSequence = getUserTaskSequence(user);
                const totalSeqLength = userSequence.length;
                const taskLabel = getTaskLabel(user, taskIndex);
                
                // Initialize user decision info
                decisions[user] = {
                    "online": user in users,
                    "group": userGroup,
                    "task": taskLabel,
                    "intention": null,
                    "design": null,
                    "strategy": null,
                    "score": null,
                    "totalScore": 0
                };
                
                // Add task-specific data if user is on a task
                if (taskIndex >= 0 && taskIndex < totalSeqLength && experiment.decisions[user] && experiment.decisions[user][taskIndex]) {
                    decisions[user].intention = experiment.decisions[user][taskIndex].intention;
                    decisions[user].design = experiment.decisions[user][taskIndex].design;
                    decisions[user].strategy = experiment.decisions[user][taskIndex].strategy;
                    decisions[user].score = experiment.decisions[user][taskIndex].score;
                }
                
                // Calculate total scores across completed tasks (exclude training, include distraction if enabled)
                // SCORING RULES:
                // - Training tasks: NEVER count toward scoring
                // - Focal tasks: ALWAYS count toward scoring
                // - Distraction tasks: count ONLY if use_distraction_tasks is enabled
                if (experiment.decisions[user]) {
                    let totalScoreWithPenalty = 0;  // Net score (for ranking and compensation)
                    let totalScoreNoPenalty = 0;    // Earned points only (for analysis)
                    
                    const userSequence = getUserTaskSequence(user);
                    const totalTasks = userSequence.length;
                    
                    for (let i = 2; i < totalTasks; i++) { // Start from index 2 to skip training tasks
                        if (experiment.decisions[user][i]) {
                            const decision = experiment.decisions[user][i];
                            // Skip training tasks (should already be excluded by starting at i=2)
                            if (decision.isTraining) continue;
                            
                            // Add net score (with penalty) for compensation/ranking
                            if (decision.score) {
                                totalScoreWithPenalty += decision.score;
                            }
                            // Add earned points (without penalty) for analysis
                            if (decision.pointsEarned) {
                                totalScoreNoPenalty += decision.pointsEarned;
                            }
                        }
                    }
                    decisions[user].totalScore = totalScoreWithPenalty; // Used for ranking/compensation
                    decisions[user].totalScoreNoPenalty = totalScoreNoPenalty; // Used for analysis
                }
            });
            
            // Calculate overall progress (average of all users)
            let totalProgress = 0;
            let userCount = allUsers.size;
            allUsers.forEach(user => {
                const taskIndex = userTaskIndex[user] !== undefined ? userTaskIndex[user] : -2;
                const userSeq = getUserTaskSequence(user);
                const totalUserTasks = userSeq.length;
                // Progress: -4(consent) to totalUserTasks(post-survey) => 0% to 100%
                // -4 = 0%, -3 = ~3%, -2 = ~6%, 0 = ~9%, ..., totalUserTasks = 100%
                totalProgress += Math.round(100 * (taskIndex + 5) / (totalUserTasks + 6));
            });
            const avgProgress = userCount > 0 ? Math.round(totalProgress / userCount) : 0;
            
            // send a socket.io show admin screen
            context.emit('show-admin-screen', {
                "progress": avgProgress,
                "decisions": decisions
            });
        }

        function showContent(context) {
            if (username == null) {
                // if not logged in, show welcome screen
                showWelcomeScreen(context);
            } else if (username in admins) {
                // if admin logged in, show admin screen
                showAdminScreen(context);
            } else {
                // Get this user's current task index
                const taskIndex = userTaskIndex[username] !== undefined ? userTaskIndex[username] : -4; // Default to consent
                
                // Get total tasks for this user (includes distraction if enabled)
                const userSequence = getUserTaskSequence(username);
                const totalTasks = userSequence.length;
                
                console.log(`[CONTENT] User=${username} taskIndex=${taskIndex} totalTasks=${totalTasks}`);
                if (taskIndex === -4) {
                    // Show consent page
                    showConsentScreen(context);
                } else if (taskIndex === -3) {
                    // Show briefing page
                    showBriefingScreen(context);
                } else if (taskIndex === -2) {
                    // Show demographics survey
                    showDemographicsSurveyScreen(context);
                } else if (taskIndex < totalTasks) {
                    // Show task (0-1 = training, 2+ = main experiment including distraction)
                    showDesignTask(context, 'intention', username);
                } else if (taskIndex === totalTasks) {
                    // Show post-survey
                    showPostSurveyScreen(context);
                } else {
                    // Show thank you screen
                    showThankYouScreen(context);
                }
            }
        }

        // bind behavior to a socket.io login request
        socket.on('login-request', (request) => {
            console.log(`Login attempt: username=${request.username}, passcode=${request.passcode}`);
            console.log(`Available users: ${Object.keys(userCredentials).join(', ')}`);
            // check if username and passcode patch admin or user credential
            if (
                request.hasOwnProperty('username') 
                && request.username in adminCredentials
                && request.hasOwnProperty('passcode')
                && request.passcode == adminCredentials[request.username]
            ) {
                // authentication successful; update the authenticated username
                username = request.username;
                // register admin socket
                admins[username] = socket;
                console.log(`Admin login successful: ${username}`);
            } else if (
                request.hasOwnProperty('username') 
                && request.username in userCredentials
                && request.hasOwnProperty('passcode')
            ) {
                // Support both old (string) and new (object) format
                const userCred = userCredentials[request.username];
                const passcode = typeof userCred === 'string' ? userCred : userCred.passcode;
                const group = typeof userCred === 'string' ? 'treatment' : userCred.group;
                console.log(`User credentials check - username=${request.username}, expected passcode=${passcode}, received passcode=${request.passcode}`);
                
                if (request.passcode == passcode) {
                    // authentication successful; update the authenticated username
                    username = request.username;
                    // register user socket with group info
                    users[username] = { socket: socket, group: group };
                    
                    // Initialize log files for this group if not already done
                    initializeLogFiles(group);
                    
                    // Initialize user's task index if first time logging in
                    if (!userTaskIndex.hasOwnProperty(username)) {
                        userTaskIndex[username] = -4; // Start at consent page
                        console.log(`New user ${username} - starting at consent page`);
                    } else {
                        console.log(`Returning user ${username} - resuming at index ${userTaskIndex[username]}`);
                    }
                    
                    // notify admins of new user
                    Object.keys(admins).forEach(admin => {
                        showAdminScreen(admins[admin]);
                    });
                } else {
                    // authentication NOT successful
                    console.log(`User login failed: ${request.username} - passcode mismatch`);
                    username = null;
                }
            } else {
                // authentication NOT successful
                console.log(`Login failed: username not found or missing fields`);
                username = null;
            }
            // send a socket.io login response message with group info
            socket.emit('login-response', {
                username: username,
                group: username && users[username] ? users[username].group : null
            });
            showContent(socket);
        });

        // bind behavior to a socket.io content request
        socket.on('content-request', () => {
            showContent(socket)
        });

        // bind behavior to a socket.io intention submission (Part 1)
        socket.on('submit-intention', (request) => {
            if (username != null) {
                console.log('Intention submitted:', request);
                
                // Get this user's current task index
                const taskIndex = userTaskIndex[username];
                
                // Get task sequence to check if this is a distraction task
                const userSequence = getUserTaskSequence(username);
                const seqItem = userSequence[taskIndex];
                const isDistraction = seqItem ? seqItem.isDistraction : false;
                
                // save the intention and timing
                experiment.decisions[username][taskIndex].intention = request.intention;
                experiment.decisions[username][taskIndex].intentionTimestamp = Date.now();
                experiment.decisions[username][taskIndex].intentionTimeSpent = request.timeSpent || 0;
                experiment.decisions[username][taskIndex].intentionStartTime = request.startTime || Date.now();
                experiment.decisions[username][taskIndex].isDistraction = isDistraction;
                experiment.decisions[username][taskIndex].isTraining = (taskIndex === 0 || taskIndex === 1);
                
                // Get task data and calculate percentile
                let uValue, uPercentile;
                if (isDistraction) {
                    const distTask = seqItem.task;
                    uValue = distTask.uValue;
                    uPercentile = distTask.individual_percentile;
                    console.log(`  [DISTRACTION] Using fixed percentile: ${uPercentile}%`);
                } else {
                    const myTask = experiment.tasks[experiment.assignments[username][taskIndex]];
                    uValue = myTask.uValue;
                    uPercentile = calculateUPercentile(uValue, experiment.tasks, myTask);
                }
                
                experiment.decisions[username][taskIndex].uValue = uValue;
                experiment.decisions[username][taskIndex].uPercentile = uPercentile;
                
                console.log(`\n>>> INTENTION SAVED for ${username}:`);
                console.log(`    TaskIndex: ${taskIndex}, IsDistraction: ${isDistraction}`);
                console.log(`    Intention: ${request.intention}, TimeSpent: ${request.timeSpent}s`);
                console.log(`    U-Value: ${uValue}, U-Percentile: ${uPercentile}%`);
                console.log(`>>> Now transitioning to CHOICE stage...\n`);
                
                // Now show Part 2 (choice stage) - MUST pass username explicitly
                showDesignTask(socket, 'choice', username);
            }
        });

        socket.on('submit-decision', (request) => {
            if (username != null) {
                console.log('Final decision submitted:', request);
                
                // Get this user's current task index
                const taskIndex = userTaskIndex[username];
                
                // Get task sequence to check if this is a distraction task
                const userSequence = getUserTaskSequence(username);
                const seqItem = userSequence[taskIndex];
                const isDistraction = seqItem ? seqItem.isDistraction : false;
                const isTrainingTask = (taskIndex === 0 || taskIndex === 1);
                
                // Save timing information
                const choiceTimeSpent = request.timeSpent || 0;
                const totalTimeSpent = request.totalTimeSpent || choiceTimeSpent;
                experiment.decisions[username][taskIndex].choiceTimeSpent = choiceTimeSpent;
                experiment.decisions[username][taskIndex].totalTimeSpent = totalTimeSpent;
                experiment.decisions[username][taskIndex].choiceStartTime = request.startTime || Date.now();
                experiment.decisions[username][taskIndex].isDistraction = isDistraction;
                experiment.decisions[username][taskIndex].isTraining = isTrainingTask;
                
                // Calculate time penalty
                let timePenalty = 0;
                const isTrainingTask1 = (taskIndex === 0);
                const TOTAL_TIME_LIMIT = isTrainingTask1 ? 180 : 90;
                const GRACE_PERIOD = 10;
                
                if (totalTimeSpent > TOTAL_TIME_LIMIT + GRACE_PERIOD) {
                    const overtime = totalTimeSpent - (TOTAL_TIME_LIMIT + GRACE_PERIOD);
                    timePenalty = Math.round(overtime);
                    console.log(`⚠️ ${username} overtime: ${totalTimeSpent.toFixed(1)}s total (limit: ${TOTAL_TIME_LIMIT}s, penalty: -${timePenalty} points)`);
                } else if (totalTimeSpent > TOTAL_TIME_LIMIT) {
                    console.log(`ℹ️ ${username} in grace period: ${totalTimeSpent.toFixed(1)}s total (limit: ${TOTAL_TIME_LIMIT}s, no penalty)`);
                }
                
                experiment.decisions[username][taskIndex].pointsLostPenalty = timePenalty;
                experiment.decisions[username][taskIndex].timePenalty = timePenalty;
                
                // save the task decision (final choice)
                experiment.decisions[username][taskIndex].design = request.design.replace("\xa0", " ");
                if (request.strategy) {
                    experiment.decisions[username][taskIndex].strategy = request.strategy.replace("\xa0", " ");
                }
                
                // Get task data for scoring
                let myTask;
                if (isDistraction) {
                    myTask = seqItem.task;
                } else {
                    myTask = experiment.tasks[experiment.assignments[username][taskIndex]];
                }
                
                // Calculate and store R percentile
                let partner = experiment.partners[username];
                if (partner != null && !isDistraction) {
                    const partnerSequence = getUserTaskSequence(partner);
                    const partnerSeqItem = partnerSequence[taskIndex];
                    
                    if (partnerSeqItem && !partnerSeqItem.isDistraction) {
                        const partnerTask = experiment.tasks[experiment.assignments[partner][taskIndex]];
                        const myUValue = myTask.uValue;
                        const partnerUValue = partnerTask.uValue;
                        const rValue = calculateRiskDominance(myUValue, partnerUValue);
                        const rPercentile = calculateRPercentile(rValue, experiment.tasks, myTask);
                        
                        experiment.decisions[username][taskIndex].rValue = rValue;
                        experiment.decisions[username][taskIndex].rPercentile = rPercentile;
                    }
                } else if (isDistraction) {
                    // Distraction tasks use fixed R percentile
                    experiment.decisions[username][taskIndex].rValue = 0;
                    experiment.decisions[username][taskIndex].rPercentile = myTask.paired_percentile;
                }
                
                // Payoff calculation - only if partner has also completed this task
                var myScore = null;
                var partnerScore = null;
                let partnerHasSubmitted = false;
                
                if (partner != null && experiment.decisions[partner]){
                    if (experiment.decisions[partner][taskIndex] && experiment.decisions[partner][taskIndex].design){
                        partnerHasSubmitted = true;
                        let myDesign = experiment.decisions[username][taskIndex].design.replace("\xa0", " ");
                        let partnerDesign = experiment.decisions[partner][taskIndex].design.replace("\xa0", " ");
                        
                        // Get partner's task
                        let partnerTask;
                        const partnerSequence = getUserTaskSequence(partner);
                        const partnerSeqItem = partnerSequence[taskIndex];
                        if (partnerSeqItem && partnerSeqItem.isDistraction) {
                            partnerTask = partnerSeqItem.task;
                        } else {
                            partnerTask = experiment.tasks[experiment.assignments[partner][taskIndex]];
                        }

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

                        experiment.decisions[username][taskIndex].pointsEarned = myScore;
                        experiment.decisions[partner][taskIndex].pointsEarned = partnerScore;
                        experiment.decisions[username][taskIndex].score = myScore;
                        experiment.decisions[partner][taskIndex].score = partnerScore;
                    }
                }

                const userGroup = users[username] ? users[username].group : 'treatment';
                const logFiles = getLogFiles(userGroup);
                const decision = experiment.decisions[username][taskIndex];
                
                // Calculate net score
                const pointsEarned = decision.pointsEarned || 0;
                const pointsLostPenalty = timePenalty;
                const netScore = pointsEarned - pointsLostPenalty;
                experiment.decisions[username][taskIndex].score = netScore;
                
                // Determine log file (training vs main tasks)
                const logFile = isTrainingTask ? logFiles.trainingTask : logFiles.task;
                
                console.log({
                    "user": username,
                    "group": userGroup,
                    "taskIndex": taskIndex,
                    "taskLabel": myTask.label,
                    "isDistraction": isDistraction,
                    "isTraining": isTrainingTask,
                    "intention": decision.intention,
                    "design": request.design,
                    "uValue": decision.uValue,
                    "uPercentile": decision.uPercentile,
                    "rValue": decision.rValue,
                    "rPercentile": decision.rPercentile,
                    "points_earned": pointsEarned,
                    "score_net": netScore,
                    "partnerScore": partnerScore
                });
                
                // notify admins of new decision
                Object.keys(admins).forEach(admin => {
                    showAdminScreen(admins[admin]);
                });
                
                // Helper function to write a user's decision to CSV
                function writeUserToCSV(user, partnerUser, userScore, partnerUserScore) {
                    const userDecision = experiment.decisions[user][taskIndex];
                    const userSequence = getUserTaskSequence(user);
                    const userSeqItem = userSequence[taskIndex];
                    const userIsDistraction = userSeqItem ? userSeqItem.isDistraction : false;
                    
                    let userTask;
                    if (userIsDistraction) {
                        userTask = userSeqItem.task;
                    } else {
                        userTask = experiment.tasks[experiment.assignments[user][taskIndex]];
                    }
                    
                    const userGroup = users[user] ? users[user].group : 'treatment';
                    const userLogFiles = getLogFiles(userGroup);
                    const userLogFile = isTrainingTask ? userLogFiles.trainingTask : userLogFiles.task;
                    
                    const userPointsEarned = userScore || 0;
                    const userPenalty = userDecision.pointsLostPenalty || 0;
                    const userNetScore = userPointsEarned - userPenalty;
                    
                    userDecision.pointsEarned = userPointsEarned;
                    userDecision.score = userNetScore;
                    
                    console.log(`📝 Writing CSV for ${user}: Task ${userTask.label}, Distraction=${userIsDistraction}, Earned=${userPointsEarned}, Net=${userNetScore}`);
                    
                    fs.appendFile(
                        userLogFile, 
                        Date.now() + "," + 
                        user + "," + 
                        userGroup + "," + 
                        experiment.partners[user] + "," + 
                        userTask.label + "," + 
                        (userIsDistraction ? "true" : "false") + "," +
                        (isTrainingTask ? "true" : "false") + "," +
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
                        userPointsEarned + "," +
                        userPenalty + "," +
                        userNetScore + "," + 
                        (partnerUserScore || '') + "\r\n",
                        err => {
                            if (err) {
                              console.error(err);
                            }
                        }
                    );
                }
                
                // DEFERRED CSV WRITING: Only write CSV when BOTH users have submitted
                if (partnerHasSubmitted) {
                    console.log(`✅ Both ${username} and ${partner} have submitted for task ${taskIndex}. Writing CSV for both.`);
                    writeUserToCSV(username, partner, myScore, partnerScore);
                    writeUserToCSV(partner, username, partnerScore, myScore);
                } else {
                    console.log(`⏳ ${username} submitted first for task ${taskIndex}. Deferring CSV write until partner ${partner} submits.`);
                }
                
                // PARTNER SYNCHRONIZATION: Mark completion and check if partner ready
                if (autoAdvance) {
                    userTaskCompletion[username] = taskIndex;
                    
                    let partnerCompleted = userTaskCompletion[partner] >= taskIndex;
                    
                    if (partnerCompleted) {
                        userTaskIndex[username]++;
                        userTaskIndex[partner]++;
                        
                        console.log(`✅ Both ${username} and ${partner} completed task ${taskIndex}. Advancing both to ${taskIndex + 1}`);
                        
                        setImmediate(() => {
                            const nextIndex = userTaskIndex[username];
                            const totalUserTasks = userSequence.length;
                            
                            if (nextIndex < totalUserTasks) {
                                if (users[username]) showDesignTask(users[username].socket, 'intention', username);
                                if (users[partner]) showDesignTask(users[partner].socket, 'intention', partner);
                            } else if (nextIndex === totalUserTasks) {
                                if (users[username]) showPostSurveyScreen(users[username].socket);
                                if (users[partner]) showPostSurveyScreen(users[partner].socket);
                            } else {
                                if (users[username]) showThankYouScreen(users[username].socket);
                                if (users[partner]) showThankYouScreen(users[partner].socket);
                            }
                        });
                    } else {
                        console.log(`⏳ ${username} waiting for ${partner} to complete task ${taskIndex}...`);
                        if (users[username]) {
                            // Use proper task label for waiting message
                            let taskLabel;
                            if (taskIndex === 0) {
                                taskLabel = 'Training Task 1';
                            } else if (taskIndex === 1) {
                                taskLabel = 'Training Task 2';
                            } else {
                                // For main tasks (2+), use sequential numbering
                                const displayPosition = taskIndex - 1; // seqIndex 2 = Task 1, etc.
                                taskLabel = `Task ${displayPosition}`;
                            }
                            users[username].socket.emit('show-partner-waiting', {
                                partner: partner,
                                taskLabel: taskLabel
                            });
                        }
                    }
                }
            }
        });

        // Removed submit-collabBelief handler - replaced by submit-intention

        
        // PRE-SURVEY REMOVED - No longer part of experiment flow
        // Participants go directly from demographics survey to first training task
        // socket.on('submit-survey', (request) => {
        //     if (username != null) {
        //         console.log({
        //             "user": username,
        //             "results": request
        //         });
        //         console.log(request)
        //         // TODO change to log file
        //         console.log(
        //             username + "\t" 
        //             + request["q1t2"] + "\t" 
        //             + request["q2r3"] + "\t"
        //             + request["q3c1"] + "\t"
        //             + request["q4r2"] + "\t"
        //             + request["q5t1"] + "\t"
        //             + request["q6r1"] + "\t"
        //             + request["q7c3"] + "\t"
        //             + request["q8t3"] + "\t"
        //             + request["q9c2"]
        //         );

        //         const userGroup = users[username] ? users[username].group : 'treatment';
        //         const logFiles = getLogFiles(userGroup);
        //         
        //         fs.appendFile(
        //             logFiles.presurvey, 
        //             Date.now() + "," + username + "," + userGroup + "," + request["q1t2"] + "," + request["q2r3"] + 
        //             "," +  request["q3c1"] + "," +request["q4r2"] + "," + request["q5t1"] + "," + 
        //             request["q6r1"] + "," + request["q7c3"] + "," + request["q8t3"]  + "," + 
        //             request["q9c2"] +  "\r\n",
        //             err => {
        //                 if (err) {
        //                   console.error(err);
        //                 }
        //             }
        //         );
        //         
        //         // Auto-advance to next stage if enabled
        //         if (autoAdvance) {
        //             userTaskIndex[username] = 0; // Move to first task
        //             console.log(`${username} completed pre-survey. Advancing to task 0`);
        //             // Give time for index to update, then show content
        //             setImmediate(() => {
        //                 showDesignTask(socket, 'intention', username);
        //             });
        //         }
        //     }
        // });


        socket.on('submit-postsurvey', (request) => {
            if (username != null) {
                console.log({
                    "user": username,
                    "results": request
                });
                console.log(request)
                // TODO change to log file
                console.log(
                    username + "\t" 
                    + request["q1c2"] + "\t" 
                    + request["q2r1"] + "\t"
                    + request["q3t3"] + "\t"
                    + request["q4r2"] + "\t"
                    + request["q5t1"] + "\t"
                    + request["q6c3"] + "\t"
                    + request["q7t2"] + "\t"
                    + request["q8c1"] + "\t"
                    + request["q9r3"]
                );
                const userGroup = users[username] ? users[username].group : 'treatment';
                const logFiles = getLogFiles(userGroup);
                
                fs.appendFile(
                    logFiles.postsurvey, 
                    Date.now() + "," + username + "," + userGroup + "," + request["q1c2"] + "," + request["q2r1"] + 
                    "," +  request["q3t3"] + "," +request["q4r2"] + "," + request["q5t1"] + "," + 
                    request["q6c3"] + "," + request["q7t2"] + "," + request["q8c1"]  + "," + 
                    request["q9r3"] +  "\r\n",
                    err => {
                        if (err) {
                          console.error(err);
                        }
                    }
                );
                
                // Auto-advance to thank you screen if enabled
                if (autoAdvance) {
                    userTaskIndex[username]++;
                    console.log(`${username} completed post-survey. Advancing to thank you`);
                    setImmediate(() => {
                        showThankYouScreen(socket);
                    });
                }
            }
        });

        // Consent form submission
        socket.on('submit-consent', (request) => {
            if (username != null) {
                console.log(`${username} submitted consent: ${request.consent}`);
                
                // Auto-advance to briefing page
                if (autoAdvance && request.consent === 'agree') {
                    userTaskIndex[username] = -3; // Move to briefing
                    console.log(`${username} consented. Advancing to briefing`);
                    setImmediate(() => {
                        showBriefingScreen(socket);
                    });
                } else if (request.consent === 'decline') {
                    // User declined after warning - handle partner notification
                    console.log(`*** CONSENT DECLINED: ${username} declined participation ***`);
                    
                    // Log decline event to file
                    const userGroup = users[username] ? users[username].group : 'unknown';
                    const declineLogEntry = `${new Date().toISOString()},${username},${userGroup},DECLINED_CONSENT\n`;
                    fs.appendFile(declineLogPath, declineLogEntry, (err) => {
                        if (err) console.error('Error logging decline:', err);
                    });
                    
                    // Find partner if exists
                    const partner = experiment.partners[username];
                    if (partner && users[partner]) {
                        console.log(`Notifying partner ${partner} of decline`);
                        // Notify partner
                        users[partner].socket.emit('partner-declined', {
                            decliningUser: username
                        });
                    } else {
                        console.log(`No active partner found for ${username}`);
                        // If no partner, just end for this user
                        socket.emit('experiment-ended', {
                            reason: 'user-declined'
                        });
                    }
                } else if (request.consent !== 'agree') {
                    // User did not consent (old flow for backward compatibility)
                    console.log(`${username} did not consent. Ending session.`);
                    showThankYouScreen(socket);
                }
            }
        });

        // Handle reschedule info submission from non-declining partner
        socket.on('submit-reschedule-info', (request) => {
            if (username != null) {
                const userGroup = users[username] ? users[username].group : 'unknown';
                
                if (request.wantsReschedule && request.contactInfo) {
                    console.log(`*** RESCHEDULE REQUEST: ${username} wants to reschedule ***`);
                    console.log(`Contact: ${request.contactInfo.email} ${request.contactInfo.phone || '(no phone)'}`);
                    
                    // Log reschedule request
                    const rescheduleEntry = `${new Date().toISOString()},${username},${userGroup},WANTS_RESCHEDULE,${request.contactInfo.email},${request.contactInfo.phone || 'N/A'}\n`;
                    fs.appendFile(rescheduleLogPath, rescheduleEntry, (err) => {
                        if (err) console.error('Error logging reschedule:', err);
                    });
                } else {
                    console.log(`*** ${username} declined reschedule opportunity ***`);
                    
                    // Log no-reschedule decision
                    const noRescheduleEntry = `${new Date().toISOString()},${username},${userGroup},NO_RESCHEDULE,N/A,N/A\n`;
                    fs.appendFile(rescheduleLogPath, noRescheduleEntry, (err) => {
                        if (err) console.error('Error logging no-reschedule:', err);
                    });
                }
                
                // End experiment for this user with compensation message
                socket.emit('experiment-ended', {
                    reason: 'partner-declined',
                    compensation: 5
                });
            }
        });

        // Briefing page submission
        socket.on('submit-briefing', (request) => {
            if (username != null) {
                console.log(`${username} completed briefing`);
                
                // Auto-advance to demographics
                if (autoAdvance) {
                    userTaskIndex[username] = -2; // Move to demographics
                    console.log(`${username} completed briefing. Advancing to demographics`);
                    setImmediate(() => {
                        showDemographicsSurveyScreen(socket);
                    });
                }
            }
        });

        socket.on('submit-demographics-survey', (request) => {
            if (username != null) {
                console.log({
                    "user": username,
                    "results": request
                });
                console.log(request)
                // TODO change to log file
                console.log(
                    username + "\t" 
                    + request["demographics-survey-q1"] + "\t" 
                    + request["demographics-survey-q2"] + "\t"
                    + request["demographics-survey-q3"] + "\t"
                    + request["demographics-survey-q4"] + "\t"
                    + request["demographics-survey-q5"] + "\t"
                    + request["demographics-survey-q6"] + "\t"
                    + request["demographics-survey-q7"] + "\t"
                    + request["demographics-survey-q8"]
                );
                const userGroup = users[username] ? users[username].group : 'treatment';
                const logFiles = getLogFiles(userGroup);
                
                fs.appendFile(
                    logFiles.demographics, 
                    Date.now() + "," + username + "," + userGroup + "," + request["demographics-survey-q1"] + "," + 
                    request["demographics-survey-q2"] + "," +  request["demographics-survey-q3"] + 
                    "," +request["demographics-survey-q4"] + "," + request["demographics-survey-q5"] + 
                    ","  + request["demographics-survey-q6"] + "," + request["demographics-survey-q7"] + 
                    "," + request["demographics-survey-q8"] +
                    "\r\n",
                    err => {
                        if (err) {
                          console.error(err);
                        }
                    }
                );
                
                // Auto-advance to next stage if enabled
                if (autoAdvance) {
                    userTaskIndex[username] = 0; // Move directly to first training task
                    console.log(`${username} completed demographics. Advancing to first training task (index=0)`);
                    
                    // Verify user has assignments before attempting to show task
                    if (!experiment.assignments[username]) {
                        console.error(`ERROR: No assignments found for ${username}. Cannot advance to training task.`);
                        socket.emit('show-error-screen', { 
                            message: 'Your account is not properly configured. Please contact the administrator.' 
                        });
                        return;
                    }
                    
                    // Show design task directly (no setImmediate needed)
                    try {
                        console.log(`Calling showDesignTask for ${username} with socket connected: ${socket.connected}`);
                        showDesignTask(socket, 'intention', username);
                        console.log(`showDesignTask completed for ${username}`);
                    } catch (error) {
                        console.error(`Error showing design task for ${username}:`, error);
                        // Fallback: try again or show error
                        socket.emit('show-error-screen', { 
                            message: 'Error loading training task. Please refresh the page.' 
                        });
                    }
                }
            }
        });

        // Admin move users: Move multiple users forward or back
        socket.on('admin-move-users', (request) => {
            if (username in admins) {
                const targetUsers = request.usernames || [];
                const steps = request.steps || 0; // Positive = forward, negative = back
                
                if (targetUsers.length === 0) {
                    console.log(`⚠️ Admin ${username} attempted to move users but none selected`);
                    return;
                }
                
                const direction = steps > 0 ? 'forward' : 'back';
                const absSteps = Math.abs(steps);
                console.log(`🔧 Admin ${username} moving ${targetUsers.length} users ${direction} by ${absSteps} steps: ${targetUsers.join(', ')}`);
                
                targetUsers.forEach((targetUser) => {
                    if (userTaskIndex[targetUser] === undefined) {
                        console.log(`⚠️ User ${targetUser} not found, skipping`);
                        return;
                    }
                    
                    // Get user's task sequence to determine proper bounds
                    const userSequence = getUserTaskSequence(targetUser);
                    const totalSeqLength = userSequence.length;
                    
                    const currentIndex = userTaskIndex[targetUser];
                    // Max index: totalSeqLength = post-survey, totalSeqLength+1 = thank you
                    // Min index: -4 (consent), but skip -1 as it's not a valid state
                    const newIndex = Math.max(-4, Math.min(totalSeqLength + 1, currentIndex + steps));
                    const adjustedNewIndex = (newIndex === -1) ? (steps > 0 ? 0 : -2) : newIndex;
                    
                    if (adjustedNewIndex === currentIndex) {
                        console.log(`  ${targetUser}: Already at boundary, no change`);
                        return;
                    }
                    
                    console.log(`  ${targetUser}: ${currentIndex} → ${adjustedNewIndex} (${getTaskLabel(targetUser, currentIndex)} → ${getTaskLabel(targetUser, adjustedNewIndex)})`);
                    
                    // If moving backward, clear decisions after the new position
                    if (steps < 0) {
                        if (experiment.decisions[targetUser]) {
                            for (let i = adjustedNewIndex + 1; i < experiment.decisions[targetUser].length; i++) {
                                experiment.decisions[targetUser][i] = {
                                    "intention": null,
                                    "intentionTimestamp": null,
                                    "design": null,
                                    "strategy": null,
                                    "uValue": null,
                                    "uPercentile": null,
                                    "rValue": null,
                                    "rPercentile": null,
                                    "score": null,
                                    "isDistraction": false,
                                    "isTraining": false
                                };
                            }
                        }
                        
                        // Clear cached option orders after the new position
                        if (userOptionOrder[targetUser]) {
                            for (let i = adjustedNewIndex + 1; i < totalSeqLength; i++) {
                                if (userOptionOrder[targetUser][i]) {
                                    delete userOptionOrder[targetUser][i];
                                }
                            }
                        }
                        
                        // Clear task completion tracking
                        if (userTaskCompletion[targetUser] !== undefined && userTaskCompletion[targetUser] >= adjustedNewIndex) {
                            userTaskCompletion[targetUser] = adjustedNewIndex - 1;
                        }
                    }
                    
                    // Update user's task index
                    userTaskIndex[targetUser] = adjustedNewIndex;
                    
                    // Show appropriate content to the target user if online
                    if (users[targetUser]) {
                        setImmediate(() => {
                            if (adjustedNewIndex === -4) {
                                showConsentScreen(users[targetUser].socket);
                            } else if (adjustedNewIndex === -3) {
                                showBriefingScreen(users[targetUser].socket);
                            } else if (adjustedNewIndex === -2) {
                                showDemographicsSurveyScreen(users[targetUser].socket);
                            } else if (adjustedNewIndex >= 0 && adjustedNewIndex < totalSeqLength) {
                                showDesignTask(users[targetUser].socket, 'intention', targetUser);
                            } else if (adjustedNewIndex === totalSeqLength) {
                                showPostSurveyScreen(users[targetUser].socket);
                            } else {
                                showThankYouScreen(users[targetUser].socket);
                            }
                        });
                    }
                });
                
                console.log(`✅ Moved ${targetUsers.length} users ${direction} by ${absSteps} steps`);
                
                // Notify all admins of the changes
                Object.keys(admins).forEach(admin => {
                    showAdminScreen(admins[admin]);
                });
            }
        });
        
        // Admin back-step: Move a user back by multiple steps (LEGACY - keeping for compatibility)
        socket.on('admin-backstep-user', (request) => {
            if (username in admins) {
                const targetUser = request.username;
                const stepsBack = request.stepsBack || 1;
                
                if (targetUser && userTaskIndex[targetUser] !== undefined) {
                    // Use the new admin-move-users handler
                    socket.emit('admin-move-users', {
                        usernames: [targetUser],
                        steps: -stepsBack
                    });
                }
            }
        });

        // bind behavior to admin reset all request
        socket.on('admin-reset-all', () => {
            if (username in admins) {
                console.log(`🔴 ADMIN RESET: Admin ${username} initiated complete reset of all users and data`);
                
                // Reset all user state
                userTaskIndex = {};
                userTaskCompletion = {};
                users = {};
                admins[username] = socket; // Keep the requesting admin connected
                
                // Clear experiment decisions
                experiment.decisions = {};
                
                // Reinitialize experiment.json to fresh state
                experiment = initializeExperiment();
                
                // Save clean experiment state to file
                try {
                    fs.writeFileSync(
                        './data/experiment.json',
                        JSON.stringify(experiment, null, 2)
                    );
                    console.log(`✅ Experiment data reset and saved to experiment.json`);
                } catch (err) {
                    console.error(`❌ Error saving reset experiment data: ${err}`);
                }
                
                // Clear CSV log files
                try {
                    fs.writeFileSync(
                        declineLogPath,
                        'timestamp,username,group,task_index,reason,timestamp_iso\n'
                    );
                    fs.writeFileSync(
                        rescheduleLogPath,
                        'timestamp,username,group,task_index,reason,timestamp_iso\n'
                    );
                    console.log(`✅ CSV log files cleared`);
                } catch (err) {
                    console.error(`❌ Error clearing log files: ${err}`);
                }
                
                // Broadcast reload to all connected clients
                io.emit('force-reload', {
                    message: 'The experiment has been reset by an administrator. Please refresh the page.'
                });
                
                console.log(`🔄 All users reset, all data deleted, clients notified`);
            } else {
                console.warn(`⚠️ Non-admin ${username} attempted to reset all users`);
            }
        });

        // bind behavior to a socket.io logout request
        socket.on('logout-request', () => {
            if (username in users) {
                // remove user socket
                delete users[username];
            } else if (username in admins) {
                // remove admin socket
                delete admins[username];
            }
            // reset the username
            username = null;
            // send a socket.io logout response
            socket.emit('logout-response');
            // show the next content
            showContent(socket);
            // notify admins of logout
            Object.keys(admins).forEach(admin => {
                showAdminScreen(admins[admin]);
            });
        });

        // bind behavior to a socket.io return prev task
        socket.on('return-prev', () => {
            if (username in admins && currentTaskIndex >= -1) {
                // increment the current task index
                currentTaskIndex -= 1;
                // request all clients to update content
                io.emit("update-content");
            }
        });

        // bind behavior to a socket.io advance next task
        socket.on('advance-next', () => {
            if (username in admins && currentTaskIndex < experiment.tasks.length+1) {
                // increment the current task index
                currentTaskIndex += 1;
                // request all clients to update content
                io.emit("update-content");
            }
        });

        // bind behavior to socket.io disconnect
        socket.on('disconnect', () => {
            if (username) {
                console.log(`⚠️ User ${username} disconnected`);
                
                // Remove user from active users
                if (username in users) {
                    delete users[username];
                    console.log(`Removed ${username} from active users`);
                }
                
                // Remove admin from active admins
                if (username in admins) {
                    delete admins[username];
                    console.log(`Removed admin ${username} from active admins`);
                }
                
                // Notify remaining admins of the disconnection
                Object.keys(admins).forEach(admin => {
                    showAdminScreen(admins[admin]);
                });
            }
        });
    });
};