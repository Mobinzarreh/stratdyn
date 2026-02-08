$(document).ready(function() {
    // establish socket.io connection
    var socket = io();

    // DEBUG: Log all socket events
    socket.onAny((event, ...args) => {
        console.log(`🔌 SOCKET EVENT: ${event}`, args);
    });

    // DEBUG: Check socket connection status
    console.log("🔌 Initial socket connection status:", socket.connected);
    socket.on('connect', () => {
        console.log("🔌 Socket connected, ID:", socket.id);
    });
    socket.on('disconnect', () => {
        console.log("🔌 Socket disconnected");
    });

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
        const fullName = $("#consent-name").val();
        const date = $("#consent-date").val();
        
        // Collect browser and system information for audit trail
        const userAgent = navigator.userAgent;
        const timestamp = new Date().toISOString();
        
        // send consent response to server with electronic signature data
        socket.emit("submit-consent", {
            consent: 'agree',
            fullName: fullName,
            date: date,
            recordingConsent: true,  // Recording is now mandatory
            userAgent: userAgent,
            consentTimestamp: timestamp
        });
    });

    // bind behavior to consent decline button
    $("#consent-decline-button").on("click", () => {
        // Show warning modal instead of directly declining
        const declineModal = new bootstrap.Modal(document.getElementById('decline-warning-modal'));
        declineModal.show();
    });

    // bind behavior to download consent PDF button
    $("#download-consent-pdf").on("click", () => {
        generateConsentPDF();
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

    // Helper function to stop briefing video
    function stopBriefingVideo() {
        const video = $("#briefing-video")[0];
        if (video) {
            video.pause();
            video.currentTime = 0;
            console.log("Briefing video stopped and reset");
        }
    }

    // bind behavior to briefing continue button
    $("#briefing-continue-button").on("click", () => {
        // Stop and reset video before advancing
        stopBriefingVideo();
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
        
        const intentionValue = parseInt($("#intention-slider").val());
        console.log(`[CLIENT] Submitting intention: ${intentionValue}, timeSpent: ${intentionTimeSpent}s`);
        
        // send intention to server with timing data
        socket.emit("submit-intention", {
            intention: intentionValue,
            timeSpent: intentionTimeSpent,
            startTime: taskStartTime // Send task start time for record keeping
        });
        
        console.log("[CLIENT] Intention submitted, waiting for server response...");
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
            "design": $("#design .table-active").attr("data-label"), // Send design name (K/M/L/Y)
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
        console.log("Current visible screens before hiding:", 
            $("#welcome").is(":visible") ? "welcome " : "",
            $("#wait").is(":visible") ? "wait " : "",
            $("#intention").is(":visible") ? "intention " : "",
            $("#demographics-survey").is(":visible") ? "demographics-survey " : ""
        );
        
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
            // Training Task 2-5 and all main tasks: Standard timing
            TOTAL_TASK_TIME = 90; // 90 seconds
            INTENTION_DISPLAY_TIME = 30; // 30 seconds shown for intention stage
            if (isTrainingTask && taskNumber >= 2 && taskNumber <= 5) {
                console.log(`Training Task ${taskNumber} - using 90s total time (30s intention display) - same as main tasks`);
            }
        }

        if (response.stage === 'intention') {
            // Part 1: Show Intention Stage
            console.log("Showing intention stage, hiding all other screens");
            // Stop briefing video if it's playing
            stopBriefingVideo();
            // Immediately hide all screens (no animation) to prevent overlap
            $("#welcome, #admin, #wait, #thank-you, #demographics-survey, #main-postsurvey, #design, #consent, #briefing").removeClass('show').hide();
            // Then show intention screen
            $("#intention").addClass('show').show();
            console.log("After screen changes:",
                $("#welcome").is(":visible") ? "welcome " : "",
                $("#wait").is(":visible") ? "wait " : "",
                $("#intention").is(":visible") ? "intention " : "",
                $("#demographics-survey").is(":visible") ? "demographics-survey " : ""
            );
            
            // set the progress bar
            $("#intention .progress").attr("aria-valuenow", response.progress);
            $("#intention .progress-bar").css("width", response.progress + "%");
            
            // set the task label - show "Training Task X of 2" or "Task X of 30"
            if (response.isTraining) {
                $("#intention .intention-task-label").text(`Training Task ${response.taskNumber} of ${response.totalTasks}`);
            } else {
                $("#intention .intention-task-label").text(`Task ${response.taskNumber} of ${response.totalTasks}`);
            }
            
            // Initialize tutorial for Training Task 1
            if (response.isTraining && response.taskNumber === 1) {
                // Allow re-trigger for Training Task 1
                sessionStorage.removeItem('tutorialCompleted');
                if (window.tutorialController) {
                    window.tutorialController.startTutorial();
                }
            }
            
            // update the design options in the table
            $("#intention tbody tr").each((index, element) => {
                let option = response.options[index];
                // Store the design name (K, M, L, or Y) in data attribute for later use
                $(element).attr("data-label", option.designName);
                // Set image path based on design name and task number
                // Mapping: K→A, M→B, L→C (folder names vs actual file names)
                const imageFileMap = { 'K': 'A', 'M': 'B', 'L': 'C', 'Y': 'Y' };
                let imagePath = "";
                if (option.designName === "Y") {
                    imagePath = "Design_images/Y/Individual.png";
                } else {
                    // For K, M, L - use task-specific images
                    // taskNumber is 1-32 (includes training tasks)
                    const taskNum = response.taskNumber + (response.isTraining ? 0 : 5); // Training tasks 1-5, Main tasks start at 6
                    const fileLetter = imageFileMap[option.designName];
                    imagePath = `Design_images/${option.designName}/${fileLetter} (${taskNum}).png`;
                }
                $(element).find(".intention-design-image").attr("src", imagePath);
                $(element).find(".intention-design-name").text(option.designName);
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
            console.log("Showing choice stage, hiding all other screens");
            // Stop briefing video if it's playing
            stopBriefingVideo();
            // Immediately hide all screens (no animation) to prevent overlap
            $("#welcome, #admin, #wait, #thank-you, #demographics-survey, #main-postsurvey, #intention, #consent, #briefing").removeClass('show').hide();
            // Then show design screen
            $("#design").addClass('show').show();
            console.log("After screen changes:",
                $("#welcome").is(":visible") ? "welcome " : "",
                $("#wait").is(":visible") ? "wait " : "",
                $("#design").is(":visible") ? "design " : "",
                $("#demographics-survey").is(":visible") ? "demographics-survey " : ""
            );
            
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
                // Store the design name (K, M, L, or Y) in data attribute for later use
                $(element).attr("data-label", option.designName);
                // Set image path based on design name and task number
                // Mapping: K→A, M→B, L→C (folder names vs actual file names)
                const imageFileMap = { 'K': 'A', 'M': 'B', 'L': 'C', 'Y': 'Y' };
                let imagePath = "";
                if (option.designName === "Y") {
                    imagePath = "Design_images/Y/Individual.png";
                } else {
                    // For K, M, L - use task-specific images
                    // taskNumber is 1-32 (includes training tasks)
                    const taskNum = response.taskNumber + (response.isTraining ? 0 : 5); // Training tasks 1-5, Main tasks start at 6
                    const fileLetter = imageFileMap[option.designName];
                    imagePath = `Design_images/${option.designName}/${fileLetter} (${taskNum}).png`;
                }
                $(element).find(".design-image").attr("src", imagePath);
                $(element).find(".design-name").text(option.designName);
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
            
            // Show/hide R percentile marker based on user group and r-percentile availability
            if (userGroup === 'treatment' && response.rPercentile !== null && response.rPercentile !== undefined) {
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
                // Control group OR no r-percentile: Hide paired difficulty marker
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
    
    // Tutorial Walkthrough Controller - Rebuilt for proper positioning
    window.tutorialController = {
        currentStep: -1,
        isActive: false,
        overlay: null,
        totalSteps: 3,
        
        // Step definitions with content
        steps: [
            {
                title: 'The Intention Slider',
                icon: '<i class="bi-sliders"></i>',
                content: `
                    <p><strong>Use the slider</strong> to indicate how likely you are to choose a collaborative option (0-100).</p>
                    <div class="tutorial-note">
                        <strong>Note:</strong> You must move the slider to enable the Submit button. 
                        (To submit 50% as your intention, move the slider away and return it to 50.)
                    </div>
                    <p>The slider starts at 50 — move it to reflect your actual intention.</p>
                `,
                target: '#intention-form .card.border-primary',
                position: 'above'
            },
            {
                title: 'Understanding Payoffs',
                icon: '<i class="bi-table"></i>',
                content: `
                    <p><strong>Collaborative options (A, B, C):</strong></p>
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        <li>If both you and your partner choose collaborative → you get the <strong>higher payoff</strong> (green column)</li>
                        <li>If you choose collaborative but partner chooses individual → you get the <strong>lower payoff</strong> (red column)</li>
                    </ul>
                    <p><strong>Individual option (Y):</strong> Same payoff regardless of what your partner chooses.</p>
                `,
                target: '#intention table.table',
                position: 'right'
            },
            {
                title: 'Submit Your Intention',
                icon: '<i class="bi-check-circle"></i>',
                content: `
                    <p>Once you move the slider, the <strong>Submit button turns blue</strong> and becomes clickable.</p>
                    <p>Click it when you're ready to proceed. You'll then wait briefly for your partner before Stage 2 begins.</p>
                `,
                target: '#intention-button',
                position: 'above',
                isLast: true
            }
        ],
        
        startTutorial: function() {
            // Check if tutorial was already completed in this session
            if (sessionStorage.getItem('tutorialCompleted') === 'true') {
                return;
            }
            
            const self = this;
            // Show welcome modal
            const welcomeModal = new bootstrap.Modal(document.getElementById('tutorial-welcome-modal'));
            welcomeModal.show();
            
            // Bind button events
            $('#tutorial-start-btn').off('click').on('click', function() {
                welcomeModal.hide();
                setTimeout(() => self.initializeTutorial(), 300);
            });
            
            $('#tutorial-skip-btn').off('click').on('click', function() {
                welcomeModal.hide();
                self.markCompleted();
            });
        },
        
        initializeTutorial: function() {
            this.isActive = true;
            this.currentStep = -1;
            
            // Create overlay
            this.overlay = $('<div class="tutorial-overlay"></div>');
            $('body').append(this.overlay);
            
            // Bind navigation buttons
            const self = this;
            $('#tutorial-btn-next').off('click').on('click', function() {
                self.nextStep();
            });
            $('#tutorial-btn-skip').off('click').on('click', function() {
                self.finishTutorial();
            });
            
            // Start with step 0
            this.showStep(0);
        },
        
        showStep: function(stepIndex) {
            if (stepIndex >= this.totalSteps) {
                this.finishTutorial();
                return;
            }
            
            // Remove previous highlights
            $('.tutorial-highlight').removeClass('tutorial-highlight');
            
            this.currentStep = stepIndex;
            const step = this.steps[stepIndex];
            const card = $('#tutorial-step-card');
            
            // Update card content
            $('#tutorial-step-icon').html(step.icon);
            $('#tutorial-step-title-text').text(step.title);
            $('#tutorial-step-badge').text(`Step ${stepIndex + 1} of ${this.totalSteps}`);
            $('#tutorial-step-body').html(step.content);
            
            // Update progress dots
            let dotsHtml = '';
            for (let i = 0; i < this.totalSteps; i++) {
                let dotClass = 'tutorial-progress-dot';
                if (i < stepIndex) dotClass += ' completed';
                if (i === stepIndex) dotClass += ' active';
                dotsHtml += `<div class="${dotClass}"></div>`;
            }
            $('#tutorial-progress').html(dotsHtml);
            
            // Update button text for last step
            if (step.isLast) {
                $('#tutorial-btn-next').text('Finish').removeClass('tutorial-btn-next').addClass('tutorial-btn-finish');
            } else {
                $('#tutorial-btn-next').text('Next →').removeClass('tutorial-btn-finish').addClass('tutorial-btn-next');
            }
            
            // Highlight target element
            const target = $(step.target);
            if (target.length) {
                target.addClass('tutorial-highlight');
            }
            
            // CRITICAL: Position card BEFORE showing it
            // Temporarily show with visibility:hidden to get dimensions
            card.css('visibility', 'hidden').show();
            
            // Calculate and apply position
            this.positionCard(step, target);
            
            // Now make it visible
            card.css('visibility', 'visible');
            
            // Smart scroll: ensure both target and card are visible
            if (target && target.length) {
                setTimeout(() => {
                    this.scrollToShowTargetAndCard(target, card, step);
                }, 50);
            }
        },
        
        scrollToShowTargetAndCard: function(target, card, step) {
            const targetRect = target[0].getBoundingClientRect();
            const cardRect = card[0].getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const margin = 30;
            
            // Determine what needs to be visible
            let minY, maxY;
            
            if (step.position === 'above' || step.position === 'below') {
                // Need vertical space for both
                minY = Math.min(targetRect.top, cardRect.top);
                maxY = Math.max(targetRect.bottom, cardRect.bottom);
            } else {
                // Side by side - just need target height
                minY = targetRect.top;
                maxY = targetRect.bottom;
            }
            
            // Check if both are already visible
            const isFullyVisible = minY >= margin && maxY <= viewportHeight - margin;
            
            if (!isFullyVisible) {
                // Calculate scroll needed
                const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                const totalHeight = maxY - minY;
                
                // If fits in viewport, center it
                if (totalHeight < viewportHeight - 2 * margin) {
                    const targetScrollTop = currentScroll + minY - (viewportHeight - totalHeight) / 2;
                    window.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                } else {
                    // Too tall - prioritize showing target at top
                    const targetScrollTop = currentScroll + targetRect.top - margin;
                    window.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                }
                
                // Reposition card after scroll completes
                setTimeout(() => {
                    this.positionCard(step, target);
                }, 400);
            }
        },
        
        positionCard: function(step, target) {
            const card = $('#tutorial-step-card');
            const pointer = $('#tutorial-pointer');
            
            // CRITICAL: Ensure card has fixed positioning
            card.css('position', 'fixed');
            
            if (!target || !target.length) {
                // No target - center card in viewport
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const cardWidth = card.outerWidth();
                const cardHeight = card.outerHeight();
                
                card.css({
                    top: (viewportHeight - cardHeight) / 2 + 'px',
                    left: (viewportWidth - cardWidth) / 2 + 'px'
                });
                pointer.hide();
                return;
            }
            
            // Reset pointer classes
            pointer.removeClass('tutorial-pointer-up tutorial-pointer-down tutorial-pointer-left tutorial-pointer-right');
            
            // Get dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const cardWidth = card.outerWidth();
            const cardHeight = card.outerHeight();
            const targetRect = target[0].getBoundingClientRect();
            const margin = 30;
            const pointerSize = 20;
            const gapBetween = 15; // Gap between card and target
            
            let finalPosition = { top: 0, left: 0, pointerClass: '', pointerOffset: 0 };
            
            // Try positions in order of preference based on step configuration
            const positions = this.calculatePositionOptions(targetRect, cardWidth, cardHeight, viewportWidth, viewportHeight, margin, gapBetween, pointerSize);
            
            // Select best position based on step.position preference
            let selectedPos = null;
            
            if (step.position === 'above' && positions.above.fits) {
                selectedPos = positions.above;
            } else if (step.position === 'below' && positions.below.fits) {
                selectedPos = positions.below;
            } else if (step.position === 'left' && positions.left.fits) {
                selectedPos = positions.left;
            } else if (step.position === 'right' && positions.right.fits) {
                selectedPos = positions.right;
            } else {
                // Fallback: use any position that fits, prioritize above/below for narrow elements, left/right for wide
                const targetIsWide = targetRect.width > cardWidth * 1.2;
                
                if (targetIsWide) {
                    // Try left/right first for wide elements
                    if (positions.right.fits) selectedPos = positions.right;
                    else if (positions.left.fits) selectedPos = positions.left;
                    else if (positions.below.fits) selectedPos = positions.below;
                    else if (positions.above.fits) selectedPos = positions.above;
                } else {
                    // Try above/below first for narrow elements
                    if (positions.below.fits) selectedPos = positions.below;
                    else if (positions.above.fits) selectedPos = positions.above;
                    else if (positions.right.fits) selectedPos = positions.right;
                    else if (positions.left.fits) selectedPos = positions.left;
                }
            }
            
            // If still no good position, force center with best vertical placement
            if (!selectedPos) {
                const centerX = (viewportWidth - cardWidth) / 2;
                let centerY;
                
                if (targetRect.bottom + cardHeight + margin < viewportHeight) {
                    centerY = targetRect.bottom + margin;
                    selectedPos = { top: centerY, left: centerX, pointerClass: 'tutorial-pointer-up', pointerOffset: 0, fits: false };
                } else if (targetRect.top - cardHeight - margin > 0) {
                    centerY = targetRect.top - cardHeight - margin;
                    selectedPos = { top: centerY, left: centerX, pointerClass: 'tutorial-pointer-down', pointerOffset: 0, fits: false };
                } else {
                    centerY = margin;
                    selectedPos = { top: centerY, left: centerX, pointerClass: '', pointerOffset: 0, fits: false };
                }
            }
            
            // Apply position
            card.css({
                top: selectedPos.top + 'px',
                left: selectedPos.left + 'px',
                position: 'fixed'  // Force fixed positioning
            });
            
            // Debug log
            console.log('Tutorial card positioned:', {
                step: step.title,
                position: { top: selectedPos.top, left: selectedPos.left },
                targetRect: { top: targetRect.top, left: targetRect.left, width: targetRect.width, height: targetRect.height },
                cardSize: { width: cardWidth, height: cardHeight }
            });
            
            // Position pointer
            if (selectedPos.pointerClass) {
                pointer.removeClass('tutorial-pointer-up tutorial-pointer-down tutorial-pointer-left tutorial-pointer-right');
                pointer.addClass(selectedPos.pointerClass);
                
                // Adjust pointer horizontal offset if card was shifted horizontally
                if (selectedPos.pointerClass.includes('up') || selectedPos.pointerClass.includes('down')) {
                    const targetCenterX = targetRect.left + targetRect.width / 2;
                    const cardCenterX = selectedPos.left + cardWidth / 2;
                    const offsetFromCenter = targetCenterX - cardCenterX;
                    
                    // Clamp offset to keep pointer on card
                    const maxOffset = cardWidth / 2 - 40;
                    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, offsetFromCenter));
                    
                    pointer.css({
                        'left': `calc(50% + ${clampedOffset}px)`,
                        'top': '',
                        'right': '',
                        'bottom': ''
                    });
                } else if (selectedPos.pointerClass.includes('left') || selectedPos.pointerClass.includes('right')) {
                    // For left/right pointers, adjust vertical offset
                    const targetCenterY = targetRect.top + targetRect.height / 2;
                    const cardCenterY = selectedPos.top + cardHeight / 2;
                    const offsetFromCenter = targetCenterY - cardCenterY;
                    
                    const maxOffset = cardHeight / 2 - 40;
                    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, offsetFromCenter));
                    
                    pointer.css({
                        'top': `calc(50% + ${clampedOffset}px)`,
                        'left': '',
                        'right': '',
                        'bottom': ''
                    });
                }
                
                pointer.show();
            } else {
                pointer.hide();
            }
        },
        
        calculatePositionOptions: function(targetRect, cardWidth, cardHeight, viewportWidth, viewportHeight, margin, gap, pointerSize) {
            const options = {};
            
            // ABOVE: card above target
            const aboveTop = targetRect.top - cardHeight - gap - pointerSize;
            const aboveLeft = targetRect.left + (targetRect.width / 2) - (cardWidth / 2);
            const aboveLeftClamped = Math.max(margin, Math.min(viewportWidth - cardWidth - margin, aboveLeft));
            options.above = {
                top: aboveTop,
                left: aboveLeftClamped,
                pointerClass: 'tutorial-pointer-down',
                fits: aboveTop >= margin && aboveLeftClamped + cardWidth <= viewportWidth - margin
            };
            
            // BELOW: card below target
            const belowTop = targetRect.bottom + gap + pointerSize;
            const belowLeft = targetRect.left + (targetRect.width / 2) - (cardWidth / 2);
            const belowLeftClamped = Math.max(margin, Math.min(viewportWidth - cardWidth - margin, belowLeft));
            options.below = {
                top: belowTop,
                left: belowLeftClamped,
                pointerClass: 'tutorial-pointer-up',
                fits: belowTop + cardHeight <= viewportHeight - margin && belowLeftClamped + cardWidth <= viewportWidth - margin
            };
            
            // LEFT: card to left of target
            const leftTop = targetRect.top + (targetRect.height / 2) - (cardHeight / 2);
            const leftTopClamped = Math.max(margin, Math.min(viewportHeight - cardHeight - margin, leftTop));
            const leftLeft = targetRect.left - cardWidth - gap - pointerSize;
            options.left = {
                top: leftTopClamped,
                left: leftLeft,
                pointerClass: 'tutorial-pointer-right',
                fits: leftLeft >= margin && leftTopClamped + cardHeight <= viewportHeight - margin
            };
            
            // RIGHT: card to right of target
            const rightTop = targetRect.top + (targetRect.height / 2) - (cardHeight / 2);
            const rightTopClamped = Math.max(margin, Math.min(viewportHeight - cardHeight - margin, rightTop));
            const rightLeft = targetRect.right + gap + pointerSize;
            options.right = {
                top: rightTopClamped,
                left: rightLeft,
                pointerClass: 'tutorial-pointer-left',
                fits: rightLeft + cardWidth <= viewportWidth - margin && rightTopClamped + cardHeight <= viewportHeight - margin
            };
            
            return options;
        },
        
        nextStep: function() {
            this.showStep(this.currentStep + 1);
        },
        
        finishTutorial: function() {
            this.isActive = false;
            this.currentStep = -1;
            
            // Hide card and remove highlights
            $('#tutorial-step-card').hide();
            $('.tutorial-highlight').removeClass('tutorial-highlight');
            
            // Remove overlay
            if (this.overlay) {
                this.overlay.remove();
                this.overlay = null;
            }
            
            this.markCompleted();
        },
        
        markCompleted: function() {
            // Mark tutorial as completed in session storage
            sessionStorage.setItem('tutorialCompleted', 'true');
        },
        
        skipTutorial: function() {
            this.finishTutorial();
        }
    };
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
        $("#admin, #wait, #design, #thank-you, #main-postsurvey, #demographics-survey, #intention, #consent, #briefing").collapse("hide");
        // show the welcome screen
        $("#welcome").collapse("show");
    });

    // bind behavior to the socket.io show consent screen
    socket.on("show-consent-screen", (response) => {
        // hide all other screens
        $("#admin, #wait, #design, #thank-you, #welcome, #main-postsurvey, #demographics-survey, #intention, #briefing").collapse("hide");
        // reset form
        $("#consent-checkbox").prop("checked", false);
        $("#consent-name").val("");
        
        // Use local timezone for today's date (IRB standard: consent must be dated same day)
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        // Auto-fill with today's date and restrict to today only (IRB-compliant)
        $("#consent-date").val(dateString);
        $("#consent-date").attr('min', dateString);
        $("#consent-date").attr('max', dateString);
        
        // show the consent screen
        $("#consent").collapse("show");
    });

    // bind behavior to the socket.io show briefing screen
    socket.on("show-briefing-screen", (response) => {
        // hide all other screens
        $("#admin, #wait, #design, #thank-you, #welcome, #main-postsurvey, #demographics-survey, #intention, #consent").collapse("hide");
        
        // Determine which video to show based on user group
        const videoFile = userGroup === 'control' ? 'briefing_control.mp4' : 'briefing_treatment.mp4';
        
        console.log("Loading briefing video for group:", userGroup, "File:", videoFile);
        
        // Set video source
        $("#briefing-video-source").attr("src", videoFile);
        $("#briefing-video")[0].load();
        
        // Update status and enable button once video is ready
        $("#briefing-video")[0].addEventListener('loadeddata', function() {
            console.log("Briefing video loaded successfully");
            $("#briefing-video-status").text("Video ready. You may watch the instructions and continue when ready.");
            $("#briefing-continue-button").prop("disabled", false);
        }, { once: true });
        
        // Handle video load errors
        $("#briefing-video")[0].addEventListener('error', function(e) {
            console.error("Error loading briefing video:", e);
            $("#briefing-video-status").text("Error loading video. Please refresh the page or contact the study administrator.");
        }, { once: true });
        
        // show the briefing screen
        $("#briefing").collapse("show");
    });

    // bind behavior to the socket.io show demographics survey screen
    socket.on("show-demographics-survey-screen", (response) => {
        // hide the wait, design and thank you and main survey screens
        $("#admin, #wait, #design, #thank-you, #welcome, #main-postsurvey, #intention, #consent, #briefing").collapse("hide");
        
        // Clear all form inputs to prevent browser auto-fill from showing previous data
        $("#demographics-survey-form input[type='radio']").prop("checked", false);
        $("#demographics-survey-form input[type='text']").val("");
        $("#demographics-survey-form textarea").val("");
        $("#demographics-survey-form input[type='checkbox']").prop("checked", false);
        
        // Re-enable all text inputs (in case they were disabled from previous "prefer not to answer")
        $("#demographics-survey-q2, #demographics-survey-q3, #demographics-survey-q4, #demographics-survey-q5").prop("disabled", false);
        
        $("#demographics-survey-form input").prop("disabled", false);
        $("#demographics-survey-form button:submit").prop("disabled", false);
        $("#demographics-survey-form button:submit .spinner-border").addClass("d-none");
        // show the demographics survey screen
        $("#demographics-survey").collapse("show");
    });

    // Handle "Prefer not to answer" checkboxes for demographics survey text inputs
    $("#demographics-survey-q2-prefer-not").on("change", function() {
        const isChecked = $(this).is(":checked");
        $("#demographics-survey-q2").prop("disabled", isChecked);
        if (isChecked) {
            $("#demographics-survey-q2").val("");
        }
    });
    
    $("#demographics-survey-q3-prefer-not").on("change", function() {
        const isChecked = $(this).is(":checked");
        $("#demographics-survey-q3").prop("disabled", isChecked);
        if (isChecked) {
            $("#demographics-survey-q3").val("");
        }
    });
    
    $("#demographics-survey-q4-prefer-not").on("change", function() {
        const isChecked = $(this).is(":checked");
        $("#demographics-survey-q4").prop("disabled", isChecked);
        if (isChecked) {
            $("#demographics-survey-q4").val("");
        }
    });
    
    $("#demographics-survey-q5-prefer-not").on("change", function() {
        const isChecked = $(this).is(":checked");
        $("#demographics-survey-q5").prop("disabled", isChecked);
        if (isChecked) {
            $("#demographics-survey-q5").val("");
        }
    });

    // bind behavior to demographics survey form submissions
    $("#demographics-survey-form").on("submit", (event) => {
        event.preventDefault();
        
        // Validate all required fields are filled
        const q1 = $("input:radio[name=demographics-survey-q1]:checked").val();
        const q2 = $("#demographics-survey-q2").val();
        const q2PreferNot = $("#demographics-survey-q2-prefer-not").is(":checked");
        const q3 = $("#demographics-survey-q3").val();
        const q3PreferNot = $("#demographics-survey-q3-prefer-not").is(":checked");
        const q4 = $("#demographics-survey-q4").val();
        const q4PreferNot = $("#demographics-survey-q4-prefer-not").is(":checked");
        const q5 = $("#demographics-survey-q5").val();
        const q5PreferNot = $("#demographics-survey-q5-prefer-not").is(":checked");
        const q6 = $("input:radio[name=demographics-survey-q6]:checked").val();
        const q7 = $("input:radio[name=demographics-survey-q7]:checked").val();
        const q8 = $("input:radio[name=demographics-survey-q8]:checked").val();
        
        if (!q1 || (!q2 && !q2PreferNot) || (!q3 && !q3PreferNot) || (!q4 && !q4PreferNot) || (!q5 && !q5PreferNot) || !q6 || !q7 || !q8) {
            alert("Please answer all questions before submitting.");
            return;
        }
        
        // send a socket.io demographics survey submit with the responses
        socket.emit("submit-demographics-survey", {
            "demographics-survey-q1": q1,
            "demographics-survey-q2": q2PreferNot ? "Prefer not to answer" : q2,
            "demographics-survey-q3": q3PreferNot ? "Prefer not to answer" : q3,
            "demographics-survey-q4": q4PreferNot ? "Prefer not to answer" : q4,
            "demographics-survey-q5": q5PreferNot ? "Prefer not to answer" : q5,
            "demographics-survey-q6": q6,
            "demographics-survey-q7": q7,
            "demographics-survey-q8": q8
        });
        // Immediately hide demographics survey and show loading state
        console.log("Hiding demographics survey and showing wait screen");
        $("#demographics-survey").removeClass('show').hide();
        $("#wait").addClass('show').show();
        $("#wait-message").html(`
            <h1>Please Wait</h1>
            <p>Submitting your demographics survey...</p>
            <div class="spinner-border text-primary mt-3" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `);
        $("#demographics-survey-form button:submit").prop("disabled", true);
        $("#demographics-survey-form button:submit .spinner-border").removeClass("d-none");
    });

    // NOTE: Pre-survey (show-survey-screen) has been removed from the experiment flow.
    // Participants now go directly from Demographics Survey to Training Task 1.

    // NOTE: show-postsurvey-screen handler is defined below after show-partner-waiting
    // to properly integrate with the waiting timeout fallback logic

    // bind behavior to post survey form submissions
    $("#postsurvey-form").on("submit", (event) => {
        event.preventDefault();
        console.log(">>> POST-SURVEY FORM SUBMITTED");
        
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
        const q10 = $("#postsurvey-q10comm").val();
        
        if (!q1 || !q2 || !q3 || !q4 || !q5 || !q6 || !q7 || !q8 || !q9 || !q10) {
            alert("Please answer all 10 questions before submitting.");
            console.log(">>> Validation failed - missing answers");
            return;
        }
        
        console.log(">>> Validation passed, emitting submit-postsurvey event");
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
            "q9r3": parseInt(q9),
            "q10comm": parseInt(q10)
        });
        console.log(">>> submit-postsurvey event emitted, disabling form");
        $("#postsurvey-form input").prop("disabled", true);
        $("#postsurvey-form button:submit").prop("disabled", true);
        $("#postsurvey-form button:submit .spinner-border").removeClass("d-none");
    });
    

    // bind behavior to the socket.io show admin screen
    socket.on("show-admin-screen", (response) => {
        console.log(response);
        // hide the wait, design and thank you screens
        $("#welcome, #wait, #design, #thank-you, #demographics-survey, #main-postsurvey, #intention, #consent, #briefing").collapse("hide");
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
                            + " (Total: " + response.decisions[user].totalScore 
                            + " | No Penalty: " + (response.decisions[user].totalScoreNoPenalty || response.decisions[user].totalScore) + ")"
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
        $("#welcome, #admin, #design, #thank-you, #demographics-survey, #main-postsurvey, #intention, #consent, #briefing").collapse("hide");
        // show the wait screen
        $("#wait").removeClass("hide").show();
    });

    // Track waiting state for fallback detection
    let waitingForPartnerTimeout = null;
    let currentWaitingTaskLabel = null;
    
    // bind behavior to partner waiting screen (after submitting decision)
    socket.on("show-partner-waiting", (response) => {
        console.log("Waiting for partner:", response.partner, "to complete", response.taskLabel);
        currentWaitingTaskLabel = response.taskLabel;
        
        // hide all other screens
        $("#welcome, #admin, #design, #thank-you, #demographics-survey, #main-postsurvey, #intention, #consent, #briefing").collapse("hide");
        // update wait screen message (more descriptive)
        $("#wait-message").html(`
            <div class="alert alert-info text-start">
                <h4 class="mb-2"><i class="bi-hourglass-split"></i> Waiting for Partner</h4>
                <p class="mb-1">You have completed <strong>${response.taskLabel}</strong>.</p>
                <p class="mb-1">Please wait while your partner <strong>${response.partner}</strong> submits their final decision. Once your partner finishes, both of you will advance to the next task together.</p>
                <p class="mb-0 text-muted">If your partner does not respond, please notify the session administrator or use the reschedule option.</p>
            </div>
        `);
        // show the wait screen
        $("#wait").removeClass("hide").show();
        
        // Clear any existing timeout
        if (waitingForPartnerTimeout) {
            clearTimeout(waitingForPartnerTimeout);
        }
        
        // Set a fallback timeout - if stuck waiting for 45 seconds on final task, request content refresh
        // Check if this is Task 30 (final task)
        if (response.taskLabel && response.taskLabel.includes("Task 30")) {
            console.log(">>> Final task detected (Task 30), setting fallback timeout");
            waitingForPartnerTimeout = setTimeout(() => {
                console.log(">>> Fallback: Still waiting after 45 seconds on Task 30, requesting content refresh");
                socket.emit("content-request");
            }, 45000);
        }
    });
    
    // Clear waiting timeout when we receive any screen transition event
    socket.on("show-postsurvey-screen", (response) => {
        try {
            console.log(">>> RECEIVED show-postsurvey-screen event");
            console.log(">>> Event data:", response);
            console.log(">>> Socket connected:", socket.connected);
            console.log(">>> Socket id:", socket.id);
            
            // Clear fallback timeout
            if (waitingForPartnerTimeout) {
                clearTimeout(waitingForPartnerTimeout);
                waitingForPartnerTimeout = null;
            }
            currentWaitingTaskLabel = null;
            
            // Hide ALL screens first using both methods to ensure clean state
            console.log(">>> Step 1: Hiding all screens");
            $("#admin, #design, #thank-you, #welcome, #demographics-survey, #intention, #consent, #briefing").removeClass('show').hide();
            $("#wait").removeClass('show').hide();
            
            console.log(">>> Step 2: Enabling post-survey form");
            $("#postsurvey-form input").prop("disabled", false);
            $("#postsurvey-form button:submit").prop("disabled", false);
            $("#postsurvey-form button:submit .spinner-border").addClass("d-none");
            
            // Show the post-survey screen using multiple methods to ensure visibility
            console.log(">>> Step 3: Showing post-survey screen");
            $("#main-postsurvey").removeClass('hide').removeClass('collapse').addClass('show').show();
            
            console.log(">>> Post-survey display commands completed");
            
            // Verification check after a short delay
            setTimeout(() => {
                console.log(">>> Post-survey visibility verification:");
                console.log("  #main-postsurvey display:", $("#main-postsurvey").css("display"));
                console.log("  #main-postsurvey visibility:", $("#main-postsurvey").css("visibility"));
                console.log("  #main-postsurvey has class 'show':", $("#main-postsurvey").hasClass("show"));
                console.log("  #main-postsurvey has class 'hide':", $("#main-postsurvey").hasClass("hide"));
                console.log("  #main-postsurvey is visible:", $("#main-postsurvey").is(':visible'));
                console.log("  #wait display:", $("#wait").css("display"));
                console.log("  #wait is visible:", $("#wait").is(':visible'));
                
                // If still not visible, force it
                if (!$("#main-postsurvey").is(':visible')) {
                    console.log(">>> WARNING: Post-survey still not visible, forcing display");
                    $("#main-postsurvey").css('display', 'block').css('visibility', 'visible');
                }
            }, 200);
        } catch (error) {
            console.error(">>> ERROR in show-postsurvey-screen handler:", error);
            console.error(">>> Stack trace:", error.stack);
        }
    });

    // bind behavior to the socket.io update content
    socket.on("update-content", (response) => {
        socket.emit("content-request");
    });



    // bind behavior to the socket.io show thank you screen
    socket.on("show-thank-you-screen", (response) => {
        try {
            console.log(">>> RECEIVED show-thank-you-screen event");
            console.log(">>> Event data:", response);
            
            // Clear any waiting timeout
            if (waitingForPartnerTimeout) {
                clearTimeout(waitingForPartnerTimeout);
                waitingForPartnerTimeout = null;
            }
            currentWaitingTaskLabel = null;
            
            // Hide ALL screens using consistent visibility methods
            console.log(">>> Step 1: Hiding all screens");
            $("#admin, #design, #welcome, #demographics-survey, #main-postsurvey, #intention, #consent, #briefing").removeClass('show').hide();
            $("#wait").removeClass('show').hide();
            
            // Show the thank you screen
            console.log(">>> Step 2: Showing thank-you screen");
            $("#thank-you").removeClass('hide').removeClass('collapse').addClass('show').show();
            
            console.log(">>> Thank-you display commands completed");
            
            // Verification check
            setTimeout(() => {
                console.log(">>> Thank-you visibility verification:");
                console.log("  #thank-you display:", $("#thank-you").css("display"));
                console.log("  #thank-you is visible:", $("#thank-you").is(':visible'));
                
                // If still not visible, force it
                if (!$("#thank-you").is(':visible')) {
                    console.log(">>> WARNING: Thank-you still not visible, forcing display");
                    $("#thank-you").css('display', 'block').css('visibility', 'visible');
                }
            }, 200);
        } catch (error) {
            console.error(">>> ERROR in show-thank-you-screen handler:", error);
            console.error(">>> Stack trace:", error.stack);
        }
    });

    // Handle error screen from server
    socket.on("show-error-screen", (response) => {
        console.error("Server error:", response.message);
        alert("Error: " + response.message);
        // Show wait screen with error message
        $("#admin, #design, #welcome, #demographics-survey, #main-postsurvey, #intention, #consent, #briefing, #thank-you").collapse("hide");
        $("#wait").collapse("show");
        $("#wait-message").html(`
            <h1>Error</h1>
            <p>${response.message}</p>
            <button class="btn btn-primary" onclick="location.reload()">Refresh Page</button>
        `);
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
        $("#admin, #wait, #design, #welcome, #demographics-survey, #main-postsurvey, #intention, #consent, #briefing").collapse("hide");
        
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

    // Function to generate consent form PDF
    function generateConsentPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set font and margins
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const maxLineWidth = pageWidth - (margin * 2);
        let yPosition = margin;
        
        // Helper function to add text with wrapping
        function addText(text, fontSize = 11, isBold = false) {
            doc.setFontSize(fontSize);
            if (isBold) {
                doc.setFont(undefined, 'bold');
            } else {
                doc.setFont(undefined, 'normal');
            }
            
            const lines = doc.splitTextToSize(text, maxLineWidth);
            lines.forEach(line => {
                if (yPosition > doc.internal.pageSize.getHeight() - margin) {
                    doc.addPage();
                    yPosition = margin;
                }
                doc.text(line, margin, yPosition);
                yPosition += fontSize * 0.5;
            });
            yPosition += 3; // Add spacing after paragraph
        }
        
        // Title
        addText('INFORMED CONSENT FOR PARTICIPATION IN RESEARCH', 14, true);
        yPosition += 5;
        
        addText('Principal Investigator: Dr. Paul Grogan', 11, true);
        addText('Institution: School of Computing and Augmented Intelligence, Arizona State University');
        yPosition += 5;
        
        // Study Purpose
        addText('STUDY PURPOSE', 12, true);
        addText('I am conducting a research study to understand factors that impact strategic decision-making in collaborative design tasks. This study focuses on how quantitative economic information influences collaborative decision-making behavior.');
        yPosition += 3;
        
        // Participation
        addText('PARTICIPATION', 12, true);
        addText('I am inviting your participation, which involves completing a brief demographics questionnaire and a series of five training and thirty experimental decision-making tasks with a partner. This study will take approximately 60 minutes to complete. Each task poses a design decision-making problem with outcomes based on your and your partner\'s decision. You have the right not to answer any question, and to stop participation at any time.');
        yPosition += 3;
        
        // Communication Protocol
        addText('COMMUNICATION PROTOCOL', 12, true);
        addText('During the experiment, you will work with your assigned partner via Zoom audio connection. You are permitted to communicate verbally with your partner about general strategies and approaches. However, you may NOT share your screen or share any quantitative information displayed on your interface. Video and chat functions will be disabled for this study.');
        yPosition += 3;
        
        // Technical Requirements
        addText('TECHNICAL REQUIREMENTS', 12, true);
        addText('To participate, you will need a computer with stable internet access, Zoom software, a working microphone and speakers or headphones, and a quiet environment for the duration of the study.');
        yPosition += 3;
        
        // Eligibility and Compensation
        addText('ELIGIBILITY AND COMPENSATION', 12, true);
        addText('To participate, you must be 18 years of age, have professional English proficiency, and either be a graduate of or currently enrolled with junior standing or higher in an undergraduate or graduate program related to engineering design. At the end of the session, participants are ranked based on the scores obtained with payoff across the experimental tasks and will privately receive gift cards worth $14, $16, $18, and $20. If your partner declines to participate, you will receive a $5 gift card for your time.');
        yPosition += 3;
        
        // Risks
        addText('RISKS', 12, true);
        addText('This study involves collaborative decision-making with a partner via audio connection. You may experience psychological discomfort from competitive task performance, social discomfort from partner interaction or disagreements, or minor stress from time-limited decisions. However, these risks are similar to other competitive activities and collaborative online activities played in group settings.');
        yPosition += 3;
        
        // Data Confidentiality
        addText('DATA CONFIDENTIALITY', 12, true);
        addText('Your responses will be anonymous. We will collect demographics information, task decisions and response times, survey responses, and audio recordings. All data will be de-identified by removing names and replacing them with participant codes. The results of this study may be used in reports, presentations, or publications but your name will not be used. De-identified data collected as a part of this study may be shared with other investigators for future research purposes. Data will be stored securely on password-protected servers.');
        yPosition += 3;
        
        // Audio Recording
        addText('AUDIO RECORDING', 12, true);
        addText('This session will be audio recorded via Zoom for research analysis purposes only. You may change your mind during the experiment by informing the researcher. Recordings will be stored securely and used only for research purposes.');
        yPosition += 3;
        
        // Withdrawal
        addText('WITHDRAWAL', 12, true);
        addText('You may withdraw from this study at any time by closing your browser or informing the researcher. If you withdraw before completing the experimental tasks, you will NOT receive compensation, and your partner will receive a $5 gift card for their time.');
        yPosition += 3;
        
        // Contact Information
        addText('CONTACT INFORMATION', 12, true);
        addText('If you have any questions concerning the research study, please contact the Principal Investigator Dr. Paul Grogan at paul.grogan@asu.edu or (602) 496-3495. If you have any questions about your rights as a research participant, or if you feel you have been placed at risk, you can contact the Chair of the Human Subjects Institutional Review Board, through the ASU Office of Research Integrity and Assurance, at (480) 965-6788.');
        yPosition += 3;
        
        // Electronic Consent Agreement
        addText('ELECTRONIC CONSENT AGREEMENT', 12, true);
        addText('By providing your information and agreeing to participate, you acknowledge that you have read this information, have had the opportunity to ask questions, and agree to participate in this research study.');
        yPosition += 10;
        
        // Add signature section
        addText('ELECTRONIC CONSENT RECORD', 12, true);
        yPosition += 5;
        
        // Get participant information from form fields
        const fullName = $("#consent-name").val() || "[Name not provided]";
        const consentDate = $("#consent-date").val() || "[Date not provided]";
        const currentTimestamp = new Date().toLocaleString();
        
        addText('Participant Name (Electronic Signature): ' + fullName, 11);
        addText('Date of Electronic Consent: ' + consentDate, 11);
        addText('Consent Method: Electronic signature by typing full name and date', 11);
        addText('Consent Status: ✓ AGREED TO PARTICIPATE', 11);
        yPosition += 5;
        
        // Add electronic signature confirmation
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text('ELECTRONIC SIGNATURE CONFIRMED', margin, yPosition);
        yPosition += 8;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
        doc.text('This document serves as electronic consent documentation.', margin, yPosition);
        doc.text('Consent was provided by typing full name and date, then submitting the form.', margin, yPosition + 6);
        yPosition += 15;
        
        addText('Document generated: ' + currentTimestamp, 10);
        
        // Save the PDF
        doc.save('Informed_Consent_Form.pdf');
    }
});

