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

    // define space to save decisions
    experiment.decisions = {};
    Object.keys(experiment.assignments).forEach((user) => {
        experiment.decisions[user] = Array.from(Array(experiment.tasks.length), ()=> {
            return {
                "intention": null,
                "intentionTimestamp": null,
                "design": null,
                "strategy": null,
                "uValue": null,
                "uPercentile": null,
                "rValue": null,
                "rPercentile": null,
                "score": null
            };
        });
    });

    // INDEPENDENT USER SOLUTION: Each user tracks their own progress
    let autoAdvance = true; // Set to true for testing, false for admin-controlled sessions
    
    // Per-user task index: {username: taskIndex}
    // NEW FLOW with Consent, Briefing, and Training Tasks:
    // -4 = consent, -3 = briefing, -2 = demographics, -1 = pre-survey
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
    let sessionId = 'session1'; // Can be changed as needed

    // Helper function to get log files based on user group
    function getLogFiles(group) {
        return {
            task: `task_${group}_${sessionId}.csv`,
            presurvey: `presurvey_${group}_${sessionId}.csv`,
            postsurvey: `postsurvey_${group}_${sessionId}.csv`,
            demographics: `demographics_survey_${group}_${sessionId}.csv`
        };
    }

    // Initialize log files for both groups
    const createdLogFiles = new Set();
    
    function initializeLogFiles(group) {
        if (createdLogFiles.has(group)) return; // Already created for this group
        
        const logFiles = getLogFiles(group);
        
        // Create task log file with new headers
        fs.writeFile(
            logFiles.task, 
            "timestamp,username,group,partner,task,intention,intentionTimestamp,intentionTimeSpent,uValue,uPercentile,rValue,rPercentile,finalChoice,finalChoiceTimestamp,choiceTimeSpent,presentedOrder,timePenalty,score,partnerScore\r\n",
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
            "timestamp,username,group,demographics-survey-q1,demographics-survey-q2,demographics-survey-q3,demographics-survey-q4,demographics-survey-q5,demographics-survey-q6,demographics-survey-q7\r\n",
            err => {
                if (err) {
                    console.error(err);
                }
            }
        );
        
        createdLogFiles.add(group);
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
        
        function showDesignTask(context, stage = 'intention') {
            // Get this user's current task index
            const taskIndex = userTaskIndex[username] || 0;
            
            // retrieve the current task and work with a cloned copy
            let task = JSON.parse(
                JSON.stringify(
                    experiment.tasks[experiment.assignments[username][taskIndex]]
                )
            );
            task.partner = experiment.partners[username];
            // clone partner task to avoid circular reference
            task.partnerTask = JSON.parse(
                JSON.stringify(
                    experiment.tasks[experiment.assignments[task.partner][taskIndex]]
                )
            );
            
            // RANDOMIZATION: Apply per-user, per-task randomization
            task = shuffleCollaborativeOptions(task, username, taskIndex);
            
            // Calculate u percentile for this task
            const myUValue = task.uValue;
            const myUPercentile = calculateUPercentile(myUValue, experiment.tasks);
            task.uValue = myUValue;
            task.uPercentile = myUPercentile;
            
            // Calculate R and R percentile for paired tasks (INDEPENDENT - uses pre-assigned partner task)
            const partnerUValue = task.partnerTask.uValue;
            const rValue = calculateRiskDominance(myUValue, partnerUValue);
            const rPercentile = calculateRPercentile(rValue, experiment.tasks);
            task.rValue = rValue;
            task.rPercentile = rPercentile;
            
            // Get user group
            const userGroup = users[username] ? users[username].group : 'treatment';
            task.userGroup = userGroup;
            task.stage = stage; // 'intention' or 'choice'
            
            // Determine if this is a training task or main task
            if (taskIndex === 0 || taskIndex === 1) {
                task.isTraining = true;
                task.taskNumber = taskIndex + 1; // Training Task 1 or 2
                task.totalTasks = 2;
                task.taskLabel = `Training Task ${taskIndex + 1}`;
            } else {
                task.isTraining = false;
                task.taskNumber = taskIndex - 1; // Main tasks: 1-30 (for taskIndex 2-31)
                task.totalTasks = 30;
                task.taskLabel = `Task ${taskIndex - 1}`;
            }
            
            // compute the progress percentage (include training tasks in progress)
            task.progress = Math.round(100*(taskIndex+1)/(experiment.tasks.length+1));
            // send a socket.io show design task
            context.emit('show-design-task', task);
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

        function showSurveyScreen(context) {
            // send a socket.io show survey screen
            context.emit('show-survey-screen');
        }

        function showPostSurveyScreen(context) {
            // send a socket.io show post survey screen
            context.emit('show-postsurvey-screen');
        }

        function showWaitScreen(context) {
            // send a socket.io show wait screen
            context.emit('show-wait-screen');
        }

        function showThankYouScreen(context) {
            // send a socket.io show thank you screen
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
                const taskIndex = userTaskIndex[user] !== undefined ? userTaskIndex[user] : -2;
                const userGroup = users[user] ? users[user].group : (experiment.decisions[user] ? 'unknown' : 'unknown');
                
                // Build task label based on user's position
                let taskLabel = '';
                if (taskIndex === -4) {
                    taskLabel = 'Consent Page';
                } else if (taskIndex === -3) {
                    taskLabel = 'Briefing';
                } else if (taskIndex === -2) {
                    taskLabel = 'Demographics Survey';
                } else if (taskIndex === -1) {
                    taskLabel = 'Pre-Survey';
                } else if (taskIndex === 0) {
                    taskLabel = 'Training Task 1';
                } else if (taskIndex === 1) {
                    taskLabel = 'Training Task 2';
                } else if (taskIndex >= 2 && taskIndex < experiment.tasks.length + 2) {
                    // Main tasks: taskIndex 2-31 display as "Task 3" through "Task 32"
                    taskLabel = `Task ${taskIndex + 1}`;
                } else if (taskIndex === experiment.tasks.length + 2) {
                    taskLabel = 'Post-Survey';
                } else {
                    taskLabel = 'Complete';
                }
                
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
                if (taskIndex >= 0 && taskIndex < experiment.tasks.length && experiment.decisions[user] && experiment.decisions[user][taskIndex]) {
                    decisions[user].intention = experiment.decisions[user][taskIndex].intention;
                    decisions[user].design = experiment.decisions[user][taskIndex].design;
                    decisions[user].strategy = experiment.decisions[user][taskIndex].strategy;
                    decisions[user].score = experiment.decisions[user][taskIndex].score;
                }
                
                // Calculate total score across all completed tasks
                if (experiment.decisions[user]) {
                    let totalScore = 0;
                    for (let i = 0; i < experiment.tasks.length; i++) {
                        if (experiment.decisions[user][i] && experiment.decisions[user][i].score) {
                            totalScore += experiment.decisions[user][i].score;
                        }
                    }
                    decisions[user].totalScore = totalScore;
                }
            });
            
            // Calculate overall progress (average of all users)
            let totalProgress = 0;
            let userCount = allUsers.size;
            allUsers.forEach(user => {
                const taskIndex = userTaskIndex[user] !== undefined ? userTaskIndex[user] : -2;
                totalProgress += Math.round(100 * (taskIndex + 2) / (experiment.tasks.length + 3));
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
                
                if (taskIndex === -4) {
                    // Show consent page
                    showConsentScreen(context);
                } else if (taskIndex === -3) {
                    // Show briefing page
                    showBriefingScreen(context);
                } else if (taskIndex === -2) {
                    // Show demographics survey
                    showDemographicsSurveyScreen(context);
                } else if (taskIndex === -1) {
                    // Show pre-survey
                    showSurveyScreen(context);
                } else if (taskIndex < experiment.tasks.length + 2) {
                    // Show task (0-1 = training, 2-31 = main experiment)
                    showDesignTask(context, 'intention');
                } else if (taskIndex === experiment.tasks.length + 2) {
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
            } else if (
                request.hasOwnProperty('username') 
                && request.username in userCredentials
                && request.hasOwnProperty('passcode')
            ) {
                // Support both old (string) and new (object) format
                const userCred = userCredentials[request.username];
                const passcode = typeof userCred === 'string' ? userCred : userCred.passcode;
                const group = typeof userCred === 'string' ? 'treatment' : userCred.group;
                
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
                    username = null;
                }
            } else {
                // authentication NOT successful
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
                
                // save the intention and timing
                experiment.decisions[username][taskIndex].intention = request.intention;
                experiment.decisions[username][taskIndex].intentionTimestamp = Date.now();
                experiment.decisions[username][taskIndex].intentionTimeSpent = request.timeSpent || 0; // Time in seconds
                experiment.decisions[username][taskIndex].intentionStartTime = request.startTime || Date.now();
                
                // Calculate and store u percentile
                const myTask = experiment.tasks[experiment.assignments[username][taskIndex]];
                const uValue = myTask.uValue;
                const uPercentile = calculateUPercentile(uValue, experiment.tasks);
                experiment.decisions[username][taskIndex].uValue = uValue;
                experiment.decisions[username][taskIndex].uPercentile = uPercentile;
                
                console.log({
                    "user": username,
                    "taskIndex": taskIndex,
                    "intention": request.intention,
                    "timeSpent": request.timeSpent,
                    "uValue": uValue,
                    "uPercentile": uPercentile
                });
                
                // Now show Part 2 (choice stage)
                showDesignTask(socket, 'choice');
            }
        });

        socket.on('submit-decision', (request) => {
            if (username != null) {
                console.log('Final decision submitted:', request);
                
                // Get this user's current task index
                const taskIndex = userTaskIndex[username];
                
                // Save timing information
                const choiceTimeSpent = request.timeSpent || 0; // Time in seconds
                experiment.decisions[username][taskIndex].choiceTimeSpent = choiceTimeSpent;
                experiment.decisions[username][taskIndex].choiceStartTime = request.startTime || Date.now();
                
                // Calculate time penalty based on graduated system
                let timePenalty = 0;
                const TIME_LIMIT = 60; // 60 seconds for choice
                const GRACE_PERIOD = 10; // 10 seconds grace
                
                if (choiceTimeSpent > TIME_LIMIT + GRACE_PERIOD) {
                    // Over grace period - apply graduated penalty
                    const overtime = choiceTimeSpent - (TIME_LIMIT + GRACE_PERIOD);
                    if (overtime <= 20) {
                        // 11-30s over: -0.5 points per second
                        timePenalty = Math.round(overtime * 0.5 * 10) / 10; // Round to 1 decimal
                    } else {
                        // 30s+ over: cap at -20 points
                        timePenalty = 20;
                    }
                    console.log(`⚠️ ${username} overtime: ${choiceTimeSpent}s (penalty: -${timePenalty} points)`);
                }
                experiment.decisions[username][taskIndex].timePenalty = timePenalty;
                
                // save the task decision (final choice)
                experiment.decisions[username][taskIndex].design = request.design.replace("\xa0", " ");
                if (request.strategy) {
                    experiment.decisions[username][taskIndex].strategy = request.strategy.replace("\xa0", " ");
                }
                
                // Calculate and store R percentile (INDEPENDENT - uses pre-assigned partner task)
                let partner = experiment.partners[username];
                if (partner != null) {
                    const myTask = experiment.tasks[experiment.assignments[username][taskIndex]];
                    const partnerTask = experiment.tasks[experiment.assignments[partner][taskIndex]];
                    const myUValue = myTask.uValue;
                    const partnerUValue = partnerTask.uValue; // Already known from experiment.json!
                    const rValue = calculateRiskDominance(myUValue, partnerUValue);
                    const rPercentile = calculateRPercentile(rValue, experiment.tasks);
                    
                    experiment.decisions[username][taskIndex].rValue = rValue;
                    experiment.decisions[username][taskIndex].rPercentile = rPercentile;
                }
                
                // Payoff calculation - only if partner has also completed this task
                var myScore = null;
                var partnerScore = null;
                if (partner != null && experiment.decisions[partner]){
                    if (experiment.decisions[partner][taskIndex] && experiment.decisions[partner][taskIndex].design){
                        let myDesign = experiment.decisions[username][taskIndex].design.replace("\xa0", " ");
                        let myTask = experiment.tasks[experiment.assignments[username][taskIndex]];
                        let partnerDesign = experiment.decisions[partner][taskIndex].design.replace("\xa0", " ");
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

                        experiment.decisions[username][taskIndex].score = myScore;
                        experiment.decisions[partner][taskIndex].score = partnerScore;
                    }
                }

                const userGroup = users[username] ? users[username].group : 'treatment';
                const logFiles = getLogFiles(userGroup);
                const decision = experiment.decisions[username][taskIndex];
                
                let task = experiment.tasks[experiment.assignments[username][taskIndex]];
                
                console.log({
                    "user": username,
                    "group": userGroup,
                    "taskIndex": taskIndex,
                    "taskLabel": task.label,
                    "intention": decision.intention,
                    "intentionTime": decision.intentionTimeSpent,
                    "design": request.design,
                    "choiceTime": choiceTimeSpent,
                    "timePenalty": timePenalty,
                    "strategy": request.strategy,
                    "uValue": decision.uValue,
                    "uPercentile": decision.uPercentile,
                    "rValue": decision.rValue,
                    "rPercentile": decision.rPercentile,
                    "score": myScore,
                    "partnerScore": partnerScore
                });
                
                // notify admins of new decision
                Object.keys(admins).forEach(admin => {
                    showAdminScreen(admins[admin]);
                });
                
                // Write to CSV with enhanced format including timing and penalty
                fs.appendFile(
                    logFiles.task, 
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
                    Date.now() + "," + 
                    choiceTimeSpent + "," +
                    (userOptionOrder[username] && userOptionOrder[username][taskIndex] ? userOptionOrder[username][taskIndex].join(';') : 'A;B;C;Y') + "," +
                    timePenalty + "," +
                    (myScore || '') + "," + 
                    (partnerScore || '') + "\r\n",
                    err => {
                        if (err) {
                          console.error(err);
                        }
                    }
                );
                
                // PARTNER SYNCHRONIZATION: Mark completion and check if partner ready
                if (autoAdvance) {
                    userTaskCompletion[username] = taskIndex;
                    
                    // Check if partner has also completed this task
                    let partnerCompleted = userTaskCompletion[partner] >= taskIndex;
                    
                    if (partnerCompleted) {
                        // Both users completed - advance both
                        userTaskIndex[username]++;
                        userTaskIndex[partner]++;
                        
                        console.log(`✅ Both ${username} and ${partner} completed task ${taskIndex}. Advancing both to ${taskIndex + 1}`);
                        
                        // Show next content to both users
                        setImmediate(() => {
                            const nextIndex = userTaskIndex[username];
                            if (nextIndex < experiment.tasks.length) {
                                // Show next task Part 1 (Intention)
                                if (users[username]) showDesignTask(users[username].socket, 'intention');
                                if (users[partner]) showDesignTask(users[partner].socket, 'intention');
                            } else if (nextIndex === experiment.tasks.length) {
                                // Show post-survey
                                if (users[username]) showPostSurveyScreen(users[username].socket);
                                if (users[partner]) showPostSurveyScreen(users[partner].socket);
                            } else {
                                // Show thank you
                                if (users[username]) showThankYouScreen(users[username].socket);
                                if (users[partner]) showThankYouScreen(users[partner].socket);
                            }
                        });
                    } else {
                        // Partner not ready - show waiting screen
                        console.log(`⏳ ${username} waiting for ${partner} to complete task ${taskIndex}...`);
                        if (users[username]) {
                            users[username].socket.emit('show-partner-waiting', {
                                partner: partner,
                                taskNumber: taskIndex + 1
                            });
                        }
                    }
                }
            }
        });

        // Removed submit-collabBelief handler - replaced by submit-intention

        
        socket.on('submit-survey', (request) => {
            if (username != null) {
                console.log({
                    "user": username,
                    "results": request
                });
                console.log(request)
                // TODO change to log file
                console.log(
                    username + "\t" 
                    + request["q1t2"] + "\t" 
                    + request["q2r3"] + "\t"
                    + request["q3c1"] + "\t"
                    + request["q4r2"] + "\t"
                    + request["q5t1"] + "\t"
                    + request["q6r1"] + "\t"
                    + request["q7c3"] + "\t"
                    + request["q8t3"] + "\t"
                    + request["q9c2"]
                );

                const userGroup = users[username] ? users[username].group : 'treatment';
                const logFiles = getLogFiles(userGroup);
                
                fs.appendFile(
                    logFiles.presurvey, 
                    Date.now() + "," + username + "," + userGroup + "," + request["q1t2"] + "," + request["q2r3"] + 
                    "," +  request["q3c1"] + "," +request["q4r2"] + "," + request["q5t1"] + "," + 
                    request["q6r1"] + "," + request["q7c3"] + "," + request["q8t3"]  + "," + 
                    request["q9c2"] +  "\r\n",
                    err => {
                        if (err) {
                          console.error(err);
                        }
                    }
                );
                
                // Auto-advance to next stage if enabled
                if (autoAdvance) {
                    userTaskIndex[username] = 0; // Move to first task
                    console.log(`${username} completed pre-survey. Advancing to task 0`);
                    // Give time for index to update, then show content
                    setImmediate(() => {
                        showDesignTask(socket, 'intention');
                    });
                }
            }
        });


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
                } else if (request.consent !== 'agree') {
                    // User did not consent - show thank you/exit
                    console.log(`${username} did not consent. Ending session.`);
                    showThankYouScreen(socket);
                }
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
                    + request["demographics-survey-q7"] 
                );
                const userGroup = users[username] ? users[username].group : 'treatment';
                const logFiles = getLogFiles(userGroup);
                
                fs.appendFile(
                    logFiles.demographics, 
                    Date.now() + "," + username + "," + userGroup + "," + request["demographics-survey-q1"] + "," + 
                    request["demographics-survey-q2"] + "," +  request["demographics-survey-q3"] + 
                    "," +request["demographics-survey-q4"] + "," + request["demographics-survey-q5"] + 
                    ","  + request["demographics-survey-q6"] + "," + request["demographics-survey-q7"]  +  
                    "\r\n",
                    err => {
                        if (err) {
                          console.error(err);
                        }
                    }
                );
                
                // Auto-advance to next stage if enabled
                if (autoAdvance) {
                    userTaskIndex[username] = -1; // Move to pre-survey
                    console.log(`${username} completed demographics. Advancing to pre-survey`);
                    // Give time for index to update, then show content
                    setImmediate(() => {
                        showSurveyScreen(socket);
                    });
                }
            }
        });

        // Admin back-step: Move a user back by multiple steps
        socket.on('admin-backstep-user', (request) => {
            if (username in admins) {
                const targetUser = request.username;
                const stepsBack = request.stepsBack || 1;
                
                if (targetUser && userTaskIndex[targetUser] !== undefined) {
                    const currentIndex = userTaskIndex[targetUser];
                    const newIndex = Math.max(-4, currentIndex - stepsBack); // Can't go before consent (-4)
                    
                    console.log(`🔧 Admin ${username} moving ${targetUser} from task ${currentIndex} back ${stepsBack} steps to ${newIndex}`);
                    
                    // Clear decisions after the new position
                    if (experiment.decisions[targetUser]) {
                        for (let i = newIndex + 1; i < experiment.decisions[targetUser].length; i++) {
                            if (experiment.decisions[targetUser][i]) {
                                console.log(`  Clearing ${targetUser} task ${i} data`);
                                delete experiment.decisions[targetUser][i];
                            }
                        }
                    }
                    
                    // Clear task completion tracking after new position
                    if (userTaskCompletion[targetUser] !== undefined && userTaskCompletion[targetUser] >= newIndex) {
                        userTaskCompletion[targetUser] = newIndex - 1;
                    }
                    
                    // Update user's task index
                    userTaskIndex[targetUser] = newIndex;
                    
                    // Show appropriate content to the target user
                    if (users[targetUser]) {
                        setImmediate(() => {
                            if (newIndex === -4) {
                                showConsentScreen(users[targetUser].socket);
                            } else if (newIndex === -3) {
                                showBriefingScreen(users[targetUser].socket);
                            } else if (newIndex === -2) {
                                showDemographicsSurveyScreen(users[targetUser].socket);
                            } else if (newIndex === -1) {
                                showSurveyScreen(users[targetUser].socket);
                            } else if (newIndex >= 0 && newIndex < experiment.tasks.length + 2) {
                                showDesignTask(users[targetUser].socket, 'intention');
                            } else if (newIndex === experiment.tasks.length + 2) {
                                showPostSurveyScreen(users[targetUser].socket);
                            } else {
                                showThankYouScreen(users[targetUser].socket);
                            }
                        });
                        
                        console.log(`✅ ${targetUser} moved to position ${newIndex}`);
                    } else {
                        console.log(`⚠️ ${targetUser} is not currently online`);
                    }
                    
                    // Notify all admins of the change
                    Object.keys(admins).forEach(admin => {
                        showAdminScreen(admins[admin]);
                    });
                }
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
    });
};