$(document).ready(function() {
    // establish socket.io connection
    var socket = io();

    // store user group (treatment/control)
    var userGroup = null;
    
    // Timer variables - POOLED TIMER SYSTEM (90 seconds total, 180 for training)
    var timerInterval = null;
    var taskStartTime = null; // Start time for the entire task (both stages)
    var intentionEndTime = null; // When intention stage ended
    var timerDuration = 0; // in seconds (for display purposes)
    var currentStage = null; // 'intention' or 'choice'
    var isTrainingTask = false; // Track if current task is training
    
    // Timer constants - will be set dynamically based on task type
    var TOTAL_TASK_TIME = 90; // Default for main tasks, 180 for training
    var INTENTION_DISPLAY_TIME = 30; // Default for main tasks, 60 for training

    // Timer functions
    function startTimer(duration, stage) {
        // Clear any existing timer
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        timerDuration = duration;
        currentStage = stage;
        
        if (stage === 'intention') {
            // Start of task - initialize task start time
            taskStartTime = Date.now();
            intentionEndTime = null;
        } else if (stage === 'choice') {
            // Record when intention stage ended
            if (!intentionEndTime) {
                intentionEndTime = Date.now();
            }
        }
        
        // Update timer display immediately
        updateTimerDisplay();
        
        // Update timer every 100ms for smooth countdown
        timerInterval = setInterval(updateTimerDisplay, 100);
    }
    
    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }
    
    function getTotalElapsedTime() {
        // Get total time elapsed since task started
        if (!taskStartTime) return 0;
        return (Date.now() - taskStartTime) / 1000; // in seconds
    }
    
    function getStageElapsedTime() {
        // Get time elapsed in current stage only
        if (currentStage === 'intention') {
            return getTotalElapsedTime();
        } else if (currentStage === 'choice') {
            if (!intentionEndTime) return 0;
            return (Date.now() - intentionEndTime) / 1000;
        }
        return 0;
    }
    
    function updateTimerDisplay() {
        const totalElapsed = getTotalElapsedTime();
        const totalRemaining = Math.max(0, TOTAL_TASK_TIME - totalElapsed);
        
        // Determine which timer element to update
        const timerElement = currentStage === 'intention' ? $("#intention-timer") : $("#design-timer");
        const containerElement = currentStage === 'intention' ? $("#intention-timer-container") : $("#design-timer-container");
        
        if (currentStage === 'intention') {
            // Intention stage: Show only first 30 seconds countdown
            const stageElapsed = getStageElapsedTime();
            const stageRemaining = Math.max(0, INTENTION_DISPLAY_TIME - stageElapsed);
            
            const minutes = Math.floor(stageRemaining / 60);
            const seconds = Math.floor(stageRemaining % 60);
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (stageRemaining > 5) {
                // Normal time - green
                timerElement.html(`<i class="bi-clock"></i> Time: ${timeString}`);
                containerElement.removeClass("alert-warning alert-danger").addClass("alert-success");
            } else if (stageRemaining > 0) {
                // Warning time (5s or less) - yellow
                timerElement.html(`<i class="bi-exclamation-triangle"></i> <strong>Warning:</strong> ${timeString} remaining!`);
                containerElement.removeClass("alert-success alert-danger").addClass("alert-warning");
            } else {
                // Time expired for intention display - show 0:00 (but no penalty)
                timerElement.html(`<i class="bi-clock"></i> Time: 0:00`);
                containerElement.removeClass("alert-success alert-warning").addClass("alert-danger");
            }
        } else {
            // Choice stage: Show remaining time from total 90-second pool
            const minutes = Math.floor(totalRemaining / 60);
            const seconds = Math.floor(totalRemaining % 60);
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (totalRemaining > 5) {
                // Normal time - green
                timerElement.html(`<i class="bi-clock"></i> Time: ${timeString}`);
                containerElement.removeClass("alert-warning alert-danger").addClass("alert-success");
            } else if (totalRemaining > 0) {
                // Warning time (5s or less) - yellow
                timerElement.html(`<i class="bi-exclamation-triangle"></i> <strong>Warning:</strong> ${timeString} remaining!`);
                containerElement.removeClass("alert-success alert-danger").addClass("alert-warning");
            } else {
                // Overtime - red (penalties apply after 10s grace)
                const overtime = totalElapsed - TOTAL_TASK_TIME;
                const overtimeStr = `${Math.floor(overtime / 60)}:${Math.floor(overtime % 60).toString().padStart(2, '0')}`;
                timerElement.html(`<i class="bi-alarm"></i> <strong>Over Time:</strong> +${overtimeStr}`);
                containerElement.removeClass("alert-success alert-warning").addClass("alert-danger");
            }
        }
    }

    // bind behavior to clicks on table row (tr) elements contained within the design table body
    $("#design tbody").on("click", "tr", (event) => {
        if (!$("#design .spinner-border").hasClass("d-none")) {
            // do not make changes if waiting
            return;
        }
        if ($(event.currentTarget).hasClass("table-active")) {
            // clicked row is currently marked as "active"; deactivate it
            $(event.currentTarget).removeClass("table-active");
            // disable the design submission button
            $("#design-button").prop("disabled", true);
            // remove the background from collaborative and individual icons
            $("#design-collaborative, #design-individual").removeClass("bg-warning-subtle");
        } else {
            // deactivate all sibling rows of the clicked row
            $(event.currentTarget).siblings().removeClass("table-active");
            // activate clicked row
            $(event.currentTarget).addClass("table-active");
            // enable the design submission button
            $("#design-button").prop("disabled", false);
            if($(event.currentTarget).data("strategy") == "collaborative") {
                // add the background to the collaborative icon
                $("#design-collaborative").addClass("bg-warning-subtle");
                // remove the background from the individual icon
                $("#design-individual").removeClass("bg-warning-subtle");
            } else {
                // remove the background from the collaborative icon
                $("#design-collaborative").removeClass("bg-warning-subtle");
                // add the background to the individual icon
                $("#design-individual").addClass("bg-warning-subtle");
            }
        }
    });


    // bind behavior to login form submissions
    $("#login-form").on("submit", (event) => {
        // send a socket.io login request with the username and passcode
        socket.emit("login-request", { "username": $("#username-input").val(), "passcode": $("#passcode-input").val() });
        // bypass the default form submission process
        event.preventDefault();
    });

    // bind behavior to the socket.io login response
    socket.on("login-response", (response) => {
        if (response.username) {
            // response contains a valid username; user is logged in
            // store user group for conditional display
            userGroup = response.group;
            console.log("Logged in as:", response.username, "Group:", userGroup);
            // unset invalid flags on form inputs
            $("#username-input, #passcode-input").removeClass("is-invalid");
            // hide the login button
            $("#login-button").addClass("d-none");
            // unhide the logout text
            $("#logout-text").removeClass("d-none");
            // set the logout text to the logged-in username
            $("#logout-username").text(response.username);
            // hide the login modal dialog
            $("#login-modal").modal('hide');
        } else {
            // response does NOT contain a valid username; user is not logged in
            // set invalid flags on form inputs
            $("#username-input, #passcode-input").addClass("is-invalid");
        }
    });

    // bind behavior to clicks on the logout link
    $("#logout-username").on("click", () => {
        // send a socket.io request to logout
        socket.emit("logout-request");
    });

    // bind behavior to consent form submission
    $("#consent-form").on("submit", (event) => {
        event.preventDefault();
        const agreed = $("#consent-checkbox").is(":checked");
        // send consent response to server
        socket.emit("submit-consent", {
            consent: agreed ? 'agree' : 'disagree'
        });
    });

    // bind behavior to consent decline button
    $("#consent-decline-button").on("click", () => {
        // Show warning modal instead of directly declining
        const declineModal = new bootstrap.Modal(document.getElementById('decline-warning-modal'));
        declineModal.show();
    });

    // bind behavior to confirm decline button in modal
    $("#confirm-decline-button").on("click", () => {
        // User confirmed decline after warning
        socket.emit("submit-consent", {
            consent: 'decline'
        });
        // Close the modal
        const declineModal = bootstrap.Modal.getInstance(document.getElementById('decline-warning-modal'));
        declineModal.hide();
    });

    // bind behavior to briefing continue button
    $("#briefing-continue-button").on("click", () => {
        // send briefing completion to server
        socket.emit("submit-briefing", {});
    });

    // Handle reschedule option change (show/hide contact info)
    $("input[name='reschedule-option']").on("change", function() {
        if ($(this).val() === "yes") {
            $("#contact-info-section").show();
        } else {
            $("#contact-info-section").hide();
        }
    });

    // Handle reschedule form submission
    $("#submit-reschedule-button").on("click", () => {
        const wantsReschedule = $("input[name='reschedule-option']:checked").val() === "yes";
        const contactInfo = wantsReschedule ? {
            email: $("#contact-email").val().trim(),
            phone: $("#contact-phone").val().trim()
        } : null;

        // Send reschedule response to server
        socket.emit("submit-reschedule-info", {
            wantsReschedule: wantsReschedule,
            contactInfo: contactInfo
        });

        // Close modal and show thank you message
        const rescheduleModal = bootstrap.Modal.getInstance(document.getElementById('reschedule-modal'));
        rescheduleModal.hide();
    });

    // bind behavior to intention slider changes
    $("#intention-slider").on("input", function() {
        $("#intention-value").text($(this).val());
        // Enable submit button once slider is moved from default position
        $("#intention-button").prop("disabled", false);
    });

    // bind behavior to intention form submission
    $("#intention-form").on("submit", (event) => {
        event.preventDefault();
        // Stop timer and get elapsed time from intention stage
        stopTimer();
        const intentionTimeSpent = getStageElapsedTime(); // Time spent in intention stage only
        
        // show spinner and disable button
        $("#intention-button .spinner-border").removeClass("d-none");
        $("#intention-button").prop("disabled", true);
        // send intention to server with timing data
        socket.emit("submit-intention", {
            intention: parseInt($("#intention-slider").val()),
            timeSpent: intentionTimeSpent,
            startTime: taskStartTime // Send task start time for record keeping
        });
    });

    // bind behavior to clicks on the design button
    $("#design-button").on("click", () => {
        // Stop timer and get TOTAL elapsed time (from start of task)
        stopTimer();
        const totalTimeSpent = getTotalElapsedTime(); // Total time for entire task
        const choiceTimeSpent = getStageElapsedTime(); // Time spent in choice stage only
        
        // show spinner on button and update text
        $("#design .spinner-border").removeClass("d-none");
        $("#design .design-button-label").text("Waiting...");
        // disable editing and remove table hover
        $("#design-button").prop("disabled", true);
        $("#design table").removeClass("table-hover");
        // send a socket.io request to submit the design with timing data
        socket.emit("submit-decision", {
            "task": $("#design .task-label").text(),
            "design": $("#design .table-active .design-label").text(),
            "designName": $("#design .table-active .design-name").text(),
            "strategy": $("#design .table-active").data("strategy"),
            "upside": parseInt($("#design .table-active .design-upside").text()),
            "downside": parseInt($("#design .table-active .design-downside").text()),
            "timeSpent": choiceTimeSpent, // Time spent in choice stage
            "totalTimeSpent": totalTimeSpent, // Total time for penalty calculation
            "startTime": taskStartTime
        });
    });

    var currentDesignTask = null;

    // Function to animate percentile markers from center to final position
    function animatePercentileMarker(markerId, labelId, valueId, finalPercentile, delay = 0) {
        const $marker = $(markerId);
        const $label = $(labelId);
        const $value = $(valueId);
        
        // Show loading state
        $marker.addClass("computing");
        $label.html('<i class="spinner-border spinner-border-sm"></i>');
        $value.html('<i class="spinner-border spinner-border-sm"></i>');
        
        setTimeout(() => {
            // Remove loading state
            $marker.removeClass("computing");
            
            // Start from center (50%)
            $marker.css({
                "left": "50%",
                "transition": "none"
            });
            
            // Small delay to ensure start position is set
            setTimeout(() => {
                // Animate to final position with smooth transition
                $marker.css({
                    "left": finalPercentile + "%",
                    "transition": "left 1.5s ease-in-out"
                });
                
                // Animate the number counting up/down
                const startVal = 50;
                const endVal = Math.round(finalPercentile);
                const duration = 1500; // 1.5 seconds
                const startTime = Date.now();
                
                const animateNumber = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // Ease-in-out function
                    const easeProgress = progress < 0.5 
                        ? 2 * progress * progress 
                        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                    
                    const currentVal = Math.round(startVal + (endVal - startVal) * easeProgress);
                    $label.text(currentVal + "%");
                    $value.text(currentVal);
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateNumber);
                    } else {
                        $label.text(endVal + "%");
                        $value.text(endVal);
                    }
                };
                
                animateNumber();
            }, 50);
        }, delay);
    }

    // bind behavior to the socket.io show design task
    socket.on("show-design-task", (response) => {
        console.log("Received show-design-task:", response);
        
        // save the current design task
        currentDesignTask = response;
        
        // Set timer durations based on task type
        isTrainingTask = response.isTraining || false;
        const taskNumber = response.taskNumber || 0;
        
        if (isTrainingTask && taskNumber === 1) {
            // Training Task 1: Extended time to learn UI and interface
            TOTAL_TASK_TIME = 180; // 3 minutes for learning
            INTENTION_DISPLAY_TIME = 60; // 1 minute shown for intention stage
            console.log("Training Task 1 - using 180s total time (60s intention display) for UI learning");
        } else {
            // Training Task 2 and all main tasks: Standard timing
            TOTAL_TASK_TIME = 90; // 90 seconds
            INTENTION_DISPLAY_TIME = 30; // 30 seconds shown for intention stage
            if (isTrainingTask && taskNumber === 2) {
                console.log("Training Task 2 - using 90s total time (30s intention display) - same as main tasks");
            }
        }

        if (response.stage === 'intention') {
            // Part 1: Show Intention Stage
            $("#welcome, #admin, #wait, #thank-you, #main-survey, #demographics-survey, #main-postsurvey, #design, #consent, #briefing").collapse("hide");
            $("#intention").collapse("show");
            
            // set the progress bar
            $("#intention .progress").attr("aria-valuenow", response.progress);
            $("#intention .progress-bar").css("width", response.progress + "%");
            
            // set the task label - show "Training Task X of 2" or "Task X of 30"
            if (response.isTraining) {
                $("#intention .intention-task-label").text(`Training Task ${response.taskNumber} of ${response.totalTasks}`);
            } else {
                $("#intention .intention-task-label").text(`Task ${response.taskNumber} of ${response.totalTasks}`);
            }
            
            // update the design options in the table
            $("#intention tbody tr").each((index, element) => {
                let option = response.options[index];
                // Set image path based on option label and task number
                let imagePath = "";
                if (option.label === "Y") {
                    imagePath = "Design_images/Y/Individual.png";
                } else {
                    // For A, B, C - use task-specific images
                    // taskNumber is 1-32 (includes training tasks)
                    const taskNum = response.taskNumber + (response.isTraining ? 0 : 2); // Training tasks 1-2, Main tasks start at 3
                    imagePath = `Design_images/${option.label}/${option.label} (${taskNum}).png`;
                }
                $(element).find(".intention-design-image").attr("src", imagePath);
                $(element).find(".intention-design-name").text(option.designName || option.label);
                $(element).find(".intention-design-upside").text(option.upside);
                $(element).find(".intention-design-downside").text(option.downside);
            });
            
            // Update the unified difficulty display with marker positions
            // Individual difficulty (u-percentile) - always shown (black marker)
            // Animate the marker from center to final position
            animatePercentileMarker(
                "#intention-u-marker",
                "#intention-u-label", 
                "#intention-u-value",
                response.uPercentile,
                500 // 500ms delay before starting animation
            );
            
            // Paired difficulty (R-percentile) - only for treatment group in Part 2
            // In Part 1 (intention stage), R marker stays hidden for everyone
            $("#intention-r-marker").hide();
            $("#intention-r-legend").hide();
            
            // reset intention slider and button state (0-100 scale, default 50)
            $("#intention-slider").val(50);
            $("#intention-value").text(50);
            $("#intention-button").prop("disabled", true); // Start disabled - requires slider interaction
            $("#intention-button .spinner-border").addClass("d-none");
            
            // Start timer for intention stage (dynamic: 60s for training, 30s for main)
            startTimer(INTENTION_DISPLAY_TIME, 'intention');
            
        } else {
            // Part 2: Show Choice Stage
            $("#welcome, #admin, #wait, #thank-you, #main-survey, #demographics-survey, #main-postsurvey, #intention, #consent, #briefing").collapse("hide");
            $("#design").collapse("show");
            
            // hide spinner on button and update text
            $("#design .spinner-border").addClass("d-none");
            $("#design .design-button-label").text("Confirm Decision");
            
            // remove active status from any table rows
            $("#design tbody tr").removeClass("table-active");
            // remove background from collaborative and individual icons
            $("#design-collaborative, #design-individual").removeClass("bg-warning-subtle");
            
            // enable table hover and disable button initially
            $("#design-button").prop("disabled", true);
            $("#design table").addClass("table-hover");

            // set the progress bar to the correct value
            $("#design .progress").attr("aria-valuenow", response.progress);
            $("#design .progress-bar").css("width", response.progress + "%");

            // set the task label - show "Training Task X of 2" or "Task X of 30"
            if (response.isTraining) {
                $("#design .task-label").text(`Training Task ${response.taskNumber} of ${response.totalTasks}`);
            } else {
                $("#design .task-label").text(`Task ${response.taskNumber} of ${response.totalTasks}`);
            }

            // update the design attributes for each option
            $("#design tbody tr").each((index, element) => {
                let option = response.options[index];
                // Set image path based on option label and task number
                let imagePath = "";
                if (option.label === "Y") {
                    imagePath = "Design_images/Y/Individual.png";
                } else {
                    // For A, B, C - use task-specific images
                    // taskNumber is 1-32 (includes training tasks)
                    const taskNum = response.taskNumber + (response.isTraining ? 0 : 2); // Training tasks 1-2, Main tasks start at 3
                    imagePath = `Design_images/${option.label}/${option.label} (${taskNum}).png`;
                }
                $(element).find(".design-image").attr("src", imagePath);
                $(element).find(".design-name").text(option.designName || option.label);
                $(element).find(".design-upside").text(option.upside);
                $(element).find(".design-downside").text(option.downside);
            });
            
            // Update the unified difficulty display with marker positions
            // Individual difficulty (u-percentile) - always shown (black marker)
            // Animate the marker from center to final position
            animatePercentileMarker(
                "#design-u-marker",
                "#design-u-label", 
                "#design-u-value",
                response.uPercentile,
                500 // 500ms delay before starting animation
            );
            
            // Show/hide R percentile marker based on user group
            if (userGroup === 'treatment') {
                // Treatment group: Show purple paired difficulty marker with animation
                $("#design-r-marker").show();
                $("#design-r-legend").css("display", "flex"); // Use flex for proper alignment
                
                // Animate R marker with slight delay after U marker
                animatePercentileMarker(
                    "#design-r-marker",
                    "#design-r-label", 
                    "#design-r-value",
                    response.rPercentile,
                    1200 // 1200ms delay (starts after u-marker animation begins)
                );
            } else {
                // Control group: Hide paired difficulty marker
                $("#design-r-marker").hide();
                $("#design-r-legend").hide();
            }
            
            // Start timer for choice stage (dynamic: 120s remaining for training, 60s for main)
            const choiceDisplayTime = TOTAL_TASK_TIME - INTENTION_DISPLAY_TIME;
            startTimer(choiceDisplayTime, 'choice');
        }
    });




    // bind behavior to clicks on the logout link
    $("#next-button").on("click", () => {
        // send a socket.io request to advance to the next task
        socket.emit("advance-next");
    });

    // bind behavior to clicks on the logout link
    $("#prev-button").on("click", () => {
        // send a socket.io request to advance to the next task
        socket.emit("return-prev");
    });
    
    // Quick select buttons for user selection
    $("#select-all-users").on("click", () => {
        $("#admin-move-users option").prop("selected", true);
    });
    
    $("#select-no-users").on("click", () => {
        $("#admin-move-users option").prop("selected", false);
    });
    
    $("#select-online-users").on("click", () => {
        $("#admin-move-users option").prop("selected", false);
        $("#admin-move-users option[data-online='true']").prop("selected", true);
    });
    
    $("#select-pairs").on("click", () => {
        // Select users in pairs (user01+user02, user03+user04, etc.)
        $("#admin-move-users option").prop("selected", false);
        $("#admin-move-users option").each(function() {
            const username = $(this).val();
            const userNum = parseInt(username.replace(/\D/g, ''));
            // Select pairs: 1-2, 3-4, 5-6, etc.
            if (userNum % 2 === 1 || userNum % 2 === 0) {
                $(this).prop("selected", true);
            }
        });
    });
    
    $("#select-treatment").on("click", () => {
        $("#admin-move-users option").prop("selected", false);
        $("#admin-move-users option[data-group='treatment']").prop("selected", true);
    });
    
    $("#select-control").on("click", () => {
        $("#admin-move-users option").prop("selected", false);
        $("#admin-move-users option[data-group='control']").prop("selected", true);
    });
    
    // bind behavior to admin advance button
    $("#admin-advance-button").on("click", () => {
        const selectedUsers = $("#admin-move-users").val();
        const steps = parseInt($("#admin-move-steps").val());
        
        if (!selectedUsers || selectedUsers.length === 0) {
            alert("Please select at least one user to advance.");
            return;
        }
        
        if (!steps || steps < 1) {
            alert("Please enter a valid number of steps (minimum 1).");
            return;
        }
        
        const userList = selectedUsers.join(", ");
        const userText = selectedUsers.length === 1 ? "user" : `${selectedUsers.length} users`;
        
        // Confirm action
        if (confirm(`Advance ${userText} (${userList}) forward by ${steps} step(s)?`)) {
            console.log(`Admin advancing ${selectedUsers.length} users forward ${steps} steps`);
            socket.emit("admin-move-users", {
                usernames: selectedUsers,
                steps: steps
            });
        }
    });
    
    // bind behavior to admin back-step button
    $("#admin-backstep-button").on("click", () => {
        const selectedUsers = $("#admin-move-users").val();
        const steps = parseInt($("#admin-move-steps").val());
        
        if (!selectedUsers || selectedUsers.length === 0) {
            alert("Please select at least one user to move back.");
            return;
        }
        
        if (!steps || steps < 1) {
            alert("Please enter a valid number of steps (minimum 1).");
            return;
        }
        
        const userList = selectedUsers.join(", ");
        const userText = selectedUsers.length === 1 ? "user" : `${selectedUsers.length} users`;
        
        // Confirm action
        if (confirm(`Move ${userText} (${userList}) back by ${steps} step(s)? This will clear their responses after the new position.`)) {
            console.log(`Admin moving ${selectedUsers.length} users back ${steps} steps`);
            socket.emit("admin-move-users", {
                usernames: selectedUsers,
                steps: -steps // Negative for backward
            });
        }
    });

    // bind behavior to confirm checkbox for reset all
    $("#admin-reset-confirm-check").on("change", () => {
        const isChecked = $("#admin-reset-confirm-check").prop("checked");
        $("#admin-reset-all-button").prop("disabled", !isChecked);
    });

    // bind behavior to reset all button
    $("#admin-reset-all-button").on("click", () => {
        if (!$("#admin-reset-confirm-check").prop("checked")) {
            alert("Please confirm that you understand the consequences of resetting all data.");
            return;
        }
        
        // Final confirmation
        if (confirm("⚠️ FINAL WARNING: This will permanently delete ALL experiment data, logs, and user decisions. This cannot be undone. Are you absolutely sure?")) {
            console.log("Admin resetting all users and deleting data");
            socket.emit("admin-reset-all", {});
        }
    });

    // bind behavior to the socket.io logout response
    socket.on("logout-response", () => {
        // show the login button
        $("#login-button").removeClass("d-none");
        // hide the logout text
        $("#logout-text").addClass("d-none");
        // reset the logout username to blank
        $("#logout-username").text("");
    });

    // bind behavior to the socket.io show welcome screen
    socket.on("show-welcome-screen", (response) => {
        // hide the wait, design and thank you screens
        $("#admin, #wait, #design, #thank-you, #main-survey, #main-postsurvey, #demographics-survey, #intention, #consent, #briefing").collapse("hide");
        // show the welcome screen
        $("#welcome").collapse("show");
    });

    // bind behavior to the socket.io show consent screen
    socket.on("show-consent-screen", (response) => {
        // hide all other screens
        $("#admin, #wait, #design, #thank-you, #welcome, #main-survey, #main-postsurvey, #demographics-survey, #intention, #briefing").collapse("hide");
        // reset form
        $("#consent-checkbox").prop("checked", false);
        // show the consent screen
        $("#consent").collapse("show");
    });

    // bind behavior to the socket.io show briefing screen
    socket.on("show-briefing-screen", (response) => {
        // hide all other screens
        $("#admin, #wait, #design, #thank-you, #welcome, #main-survey, #main-postsurvey, #demographics-survey, #intention, #consent").collapse("hide");
        // show the briefing screen
        $("#briefing").collapse("show");
    });

    // bind behavior to the socket.io show demographics survey screen
    socket.on("show-demographics-survey-screen", (response) => {
        // hide the wait, design and thank you and main survey screens
        $("#admin, #wait, #design, #thank-you, #welcome, #main-survey, #main-postsurvey, #intention, #consent, #briefing").collapse("hide");
        $("#demographics-survey-form input").prop("disabled", false);
        $("#demographics-survey-form button:submit").prop("disabled", false);
        $("#demographics-survey-form button:submit .spinner-border").addClass("d-none");
        // show the demographics survey screen
        $("#demographics-survey").collapse("show");
    });

    // bind behavior to demographics survey form submissions
    $("#demographics-survey-form").on("submit", (event) => {
        event.preventDefault();
        
        // Validate all required fields are filled
        const q1 = $("input:radio[name=demographics-survey-q1]:checked").val();
        const q2 = $("#demographics-survey-q2").val();
        const q3 = $("#demographics-survey-q3").val();
        const q4 = $("#demographics-survey-q4").val();
        const q5 = $("#demographics-survey-q5").val();
        const q6 = $("input:radio[name=demographics-survey-q6]:checked").val();
        const q7 = $("input:radio[name=demographics-survey-q7]:checked").val();
        const q8 = $("input:radio[name=demographics-survey-q8]:checked").val();
        
        if (!q1 || !q2 || !q3 || !q4 || !q5 || !q6 || !q7 || !q8) {
            alert("Please answer all questions before submitting.");
            return;
        }
        
        // send a socket.io demographics survey submit with the responses
        socket.emit("submit-demographics-survey", {
            "demographics-survey-q1": q1,
            "demographics-survey-q2": q2,
            "demographics-survey-q3": q3,
            "demographics-survey-q4": q4,
            "demographics-survey-q5": q5,
            "demographics-survey-q6": q6,
            "demographics-survey-q7": q7,
            "demographics-survey-q8": q8
        });
        $("#demographics-survey-form button:submit").prop("disabled", true);
        $("#demographics-survey-form button:submit .spinner-border").removeClass("d-none");
    });


    // bind behavior to the socket.io show survey screen
    socket.on("show-survey-screen", (response) => {
        // hide the wait, design and thank you screens
        $("#admin, #wait, #design, #thank-you, #welcome, #demographics-survey, #main-postsurvey, #intention, #consent, #briefing").collapse("hide");
        $("#survey-form input").prop("disabled", false);
        $("#survey-form button:submit").prop("disabled", false);
        $("#survey-form button:submit .spinner-border").addClass("d-none");
        // show the welcome screen
        $("#main-survey").collapse("show");
    });

    // bind behavior to survey form submissions
    $("#survey-form").on("submit", (event) => {
        // send a socket.io survey submit with the responses
        socket.emit("submit-survey", {
            "q1t2": parseInt($("#survey-q1t2").val()),
            "q2r3": parseInt($("#survey-q2r3").val()),
            "q3c1": parseInt($("#survey-q3c1").val()),
            "q4r2": parseInt($("#survey-q4r2").val()),
            "q5t1": parseInt($("#survey-q5t1").val()),
            "q6r1": parseInt($("#survey-q6r1").val()),
            "q7c3": parseInt($("#survey-q7c3").val()),
            "q8t3": parseInt($("#survey-q8t3").val()),
            "q9c2": parseInt($("#survey-q9c2").val())
        });
        $("#survey-form input").prop("disabled", true);
        $("#survey-form button:submit").prop("disabled", true);
        $("#survey-form button:submit .spinner-border").removeClass("d-none");
        // bypass the default form submission process
        event.preventDefault();
    });

    // bind behavior to the socket.io post show post survey screen
    socket.on("show-postsurvey-screen", (response) => {
        // hide the wait, design and thank you, demogragraphics and main survey screens
        $("#admin, #wait, #design, #thank-you, #welcome, #demographics-survey, #main-survey, #intention, #consent, #briefing").collapse("hide");
        $("#postsurvey-form input").prop("disabled", false);
        $("#postsurvey-form button:submit").prop("disabled", false);
        $("#postsurvey-form button:submit .spinner-border").addClass("d-none");
        // show the welcome screen
        $("#main-postsurvey").collapse("show");
    });

    // bind behavior to post survey form submissions
    $("#postsurvey-form").on("submit", (event) => {
        event.preventDefault();
        
        // Validate all sliders have been moved from default position
        const q1 = $("#postsurvey-q1c2").val();
        const q2 = $("#postsurvey-q2r1").val();
        const q3 = $("#postsurvey-q3t3").val();
        const q4 = $("#postsurvey-q4r2").val();
        const q5 = $("#postsurvey-q5t1").val();
        const q6 = $("#postsurvey-q6c3").val();
        const q7 = $("#postsurvey-q7t2").val();
        const q8 = $("#postsurvey-q8c1").val();
        const q9 = $("#postsurvey-q9r3").val();
        
        if (!q1 || !q2 || !q3 || !q4 || !q5 || !q6 || !q7 || !q8 || !q9) {
            alert("Please answer all 9 questions before submitting.");
            return;
        }
        
        // send a socket.io post survey submit with the responses
        socket.emit("submit-postsurvey", {
            "q1c2": parseInt(q1),
            "q2r1": parseInt(q2),
            "q3t3": parseInt(q3),
            "q4r2": parseInt(q4),
            "q5t1": parseInt(q5),
            "q6c3": parseInt(q6),
            "q7t2": parseInt(q7),
            "q8c1": parseInt(q8),
            "q9r3": parseInt(q9)
        });
        $("#postsurvey-form input").prop("disabled", true);
        $("#postsurvey-form button:submit").prop("disabled", true);
        $("#postsurvey-form button:submit .spinner-border").removeClass("d-none");
    });
    

    // bind behavior to the socket.io show admin screen
    socket.on("show-admin-screen", (response) => {
        console.log(response);
        // hide the wait, design and thank you screens
        $("#welcome, #wait, #design, #thank-you, #main-survey, #demographics-survey, #main-postsurvey, #intention, #consent, #briefing").collapse("hide");
        // show the admin screen
        $("#admin").collapse("show");
        // set the progress bar to the correct value
        $("#admin .progress").attr("aria-valuenow", response.progress);
        $("#admin .progress-bar").css("width", response.progress + "%");
        // reset table rows
        $("#admin tbody").empty();
        // update button state
        $("#prev-button").prop("disabled", response.progress <= -1);
        $("#next-button").prop("disabled", response.progress >= 100);
        
        // Populate user multi-select for move controls
        $("#admin-move-users").empty();
        
        // update user status table
        let users = Object.keys(response.decisions);
        users.forEach((user) => {
            console.log(user);
            console.log(response.decisions[user]);
            console.log(response.decisions[user].online);
            
            // Add user to move multi-select with data attributes for filtering
            const isOnline = response.decisions[user].online;
            const group = response.decisions[user].group || 'unknown';
            const task = response.decisions[user].task;
            
            $("#admin-move-users").append(
                $("<option>")
                    .val(user)
                    .text(user + " - " + task + (isOnline ? " 🟢" : " 🔴"))
                    .attr("data-online", isOnline)
                    .attr("data-group", group)
            );
            
            let row = (
                "<tr><th scope='row'>" 
                + (
                    response.decisions[user].online ? 
                    "<i class='bi-person-fill-check text-success me-1'></i>" :
                    "<i class='bi-person-slash text-danger me-1'></i>"
                ) + user
                + "</th>"
            );
            if (response.decisions[user]) {
                row += (
                     "<td>" + response.decisions[user].task + "</td>"
                     + "<td>" + (
                        response.decisions[user].design ?
                        response.decisions[user].design : ""
                     ) + "</td>"
                     + "<td>" + (
                        response.decisions[user].strategy ?
                        (
                            response.decisions[user].strategy=="collaborative" ? 
                            "<span class='text-success'><i class='bi-c-circle-fill'></i> collaborative</span>" : 
                            "<span class='text-danger'><i class='bi-info-circle-fill'></i> individual</span>"
                        ) : ""
                    ) + "</td>"
                    + "<td>" + (
                        response.decisions[user].score ?
                        (
                            response.decisions[user].score 
                            + " (" + response.decisions[user].totalScore + ")"
                        ) : ""
                    ) + "</td>"
                );
            } else {
                row += "<td></td><td></td><td></td>";
            }
            row += "</tr>"
            $("#admin tbody").append($(row));
        });
    });

    // bind behavior to the socket.io show wait screen
    socket.on("show-wait-screen", (response) => {
        // hide the welcome, admin, design, and thank you screens
        $("#welcome, #admin, #design, #thank-you, #main-survey, #demographics-survey, #main-postsurvey, #intention, #consent, #briefing").collapse("hide");
        // show the wait screen
        $("#wait").collapse("show");
    });

    // bind behavior to partner waiting screen (after submitting decision)
    socket.on("show-partner-waiting", (response) => {
        console.log("Waiting for partner:", response.partner, "to complete task", response.taskNumber);
        // hide all other screens
        $("#welcome, #admin, #design, #thank-you, #main-survey, #demographics-survey, #main-postsurvey, #intention, #consent, #briefing").collapse("hide");
        // update wait screen message
        $("#wait-message").html(`
            <div class="alert alert-info">
                <h4><i class="bi-hourglass-split"></i> Waiting for Partner</h4>
                <p>You have completed Task ${response.taskNumber}. Please wait while your partner completes their decision...</p>
            </div>
        `);
        // show the wait screen
        $("#wait").collapse("show");
    });

    // bind behavior to the socket.io update content
    socket.on("update-content", (response) => {
        socket.emit("content-request");
    });



    // bind behavior to the socket.io show thank you screen
    socket.on("show-thank-you-screen", (response) => {
        // hide the admin, wait, design and welcome screens
        $("#admin, #wait, #design, #welcome, #main-survey, #demographics-survey, #main-postsurvey, #intention, #consent, #briefing").collapse("hide");
        // show the welcome screen
        $("#thank-you").collapse("show");
    });

    // Handle partner declined notification
    socket.on("partner-declined", (response) => {
        console.log("Partner declined participation");
        // Show reschedule modal to non-declining partner
        const rescheduleModal = new bootstrap.Modal(document.getElementById('reschedule-modal'));
        rescheduleModal.show();
    });

    // Handle experiment ended (after decline confirmed)
    socket.on("experiment-ended", (response) => {
        console.log("Experiment ended:", response.reason);
        // Hide all screens and show thank you
        $("#admin, #wait, #design, #welcome, #main-survey, #demographics-survey, #main-postsurvey, #intention, #consent, #briefing").collapse("hide");
        
        // Customize thank you message based on who declined
        if (response.reason === "user-declined") {
            $("#thank-you").html(`
                <div class="container">
                    <div class="row">
                        <div class="col">
                            <h1>Thank You</h1>
                            <p>Thank you for your time. You may now close this page.</p>
                        </div>
                    </div>
                </div>
            `);
        } else if (response.reason === "partner-declined") {
            $("#thank-you").html(`
                <div class="container">
                    <div class="row">
                        <div class="col">
                            <h1>Experiment Session Ended</h1>
                            <p>Your compensation of $5 will be processed shortly.</p>
                            <p>If you indicated interest in rescheduling, we will contact you soon.</p>
                            <p>Thank you for your understanding. You may now close this page.</p>
                        </div>
                    </div>
                </div>
            `);
        }
        
        $("#thank-you").collapse("show");
    });

    // bind behavior to force reload (when admin resets all)
    socket.on("force-reload", (response) => {
        console.log("Force reload signal received from server:", response.message);
        
        // Show alert
        alert("⚠️ " + response.message);
        
        // Reload page after a short delay
        setTimeout(() => {
            location.reload();
        }, 1000);
    });
});

