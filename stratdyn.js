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
    // -2 = demographics, -1 = pre-survey, 0-29 = tasks, 30 = post-survey, 31+ = thank you
    const userTaskIndex = {};

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
            "timestamp,username,group,partner,task,intention,intentionTimestamp,uValue,uPercentile,rValue,rPercentile,finalChoice,finalChoiceTimestamp,score,partnerScore\r\n",
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
            task.taskNumber = taskIndex + 1; // Send sequential task number (1-30)
            
            // compute the progress percentage
            task.progress = Math.round(100*(taskIndex+1)/(experiment.tasks.length+1));
            // send a socket.io show design task
            context.emit('show-design-task', task);
        }

        function showWelcomeScreen(context) {
            // send a socket.io show welcome screen
            context.emit('show-welcome-screen');
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
            Object.keys(experiment.decisions).forEach((user) => {
                let totalScore = 0;
                for (let taskIndex = 4; taskIndex < Math.min(currentTaskIndex + 1, experiment.tasks.length); taskIndex++) {
                    totalScore += experiment.decisions[user][taskIndex].score || 0;
                }
                if (currentTaskIndex >= 0 && currentTaskIndex < experiment.tasks.length) {
                    const userGroup = users[user] ? users[user].group : 'unknown';
                    decisions[user] = {
                        "online": user in users,
                        "group": userGroup,
                        "task": experiment.tasks[experiment.assignments[user][currentTaskIndex]].label,
                        "intention": experiment.decisions[user][currentTaskIndex].intention,
                        "design": experiment.decisions[user][currentTaskIndex].design,
                        "strategy": experiment.decisions[user][currentTaskIndex].strategy,
                        "score": experiment.decisions[user][currentTaskIndex].score,
                        "totalScore": totalScore
                    };
                } else {
                    decisions[user] = {
                        "online": user in users,
                        "group": users[user] ? users[user].group : 'unknown'
                    };
                }
            });
            // send a socket.io show admin screen
            context.emit('show-admin-screen', {
                "progress": progress = Math.round(100*(currentTaskIndex+2)/(experiment.tasks.length+3)),
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
                const taskIndex = userTaskIndex[username] || -2; // Default to demographics
                
                if (taskIndex < -1) {
                    // Show demographics survey
                    showDemographicsSurveyScreen(context);
                } else if (taskIndex < 0) {
                    // Show pre-survey
                    showSurveyScreen(context);
                } else if (taskIndex < experiment.tasks.length) {
                    // Show next task
                    showDesignTask(context);
                } else if (taskIndex === experiment.tasks.length) {
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
                        userTaskIndex[username] = -2; // Start at demographics
                        console.log(`New user ${username} - starting at demographics`);
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
                
                // save the intention
                experiment.decisions[username][taskIndex].intention = request.intention;
                experiment.decisions[username][taskIndex].intentionTimestamp = Date.now();
                
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
                // (This is optional - can be calculated offline later)
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
                    "design": request.design,
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
                
                // Write to CSV with new format
                fs.appendFile(
                    logFiles.task, 
                    Date.now() + "," + 
                    username + "," + 
                    userGroup + "," + 
                    experiment.partners[username] + "," + 
                    task.label + "," + 
                    (decision.intention || '') + "," + 
                    (decision.intentionTimestamp || '') + "," + 
                    (decision.uValue || '') + "," + 
                    (decision.uPercentile || '') + "," + 
                    (decision.rValue || '') + "," + 
                    (decision.rPercentile || '') + "," + 
                    request.design + "," + 
                    Date.now() + "," + 
                    (myScore || '') + "," + 
                    (partnerScore || '') + "\r\n",
                    err => {
                        if (err) {
                          console.error(err);
                        }
                    }
                );
                
                // INDEPENDENT USER SOLUTION: Advance THIS user only (no partner synchronization!)
                if (autoAdvance) {
                    userTaskIndex[username]++;
                    console.log(`${username} completed task ${taskIndex}. Advancing to index ${userTaskIndex[username]}`);
                    
                    // Show next content to this user only
                    setImmediate(() => {
                        const nextIndex = userTaskIndex[username];
                        if (nextIndex < experiment.tasks.length) {
                            // Show next task Part 1 (Intention)
                            showDesignTask(socket, 'intention');
                        } else if (nextIndex === experiment.tasks.length) {
                            // Show post-survey
                            showPostSurveyScreen(socket);
                        } else {
                            // Show thank you
                            showThankYouScreen(socket);
                        }
                    });
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