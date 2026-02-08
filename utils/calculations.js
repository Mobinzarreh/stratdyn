/**
 * Utility functions for calculating u percentile and risk dominance (R)
 * 
 * IMPORTANT: All percentile calculations use ONLY the 20 focal tasks.
 * Training tasks and distraction tasks are EXCLUDED from percentile computations.
 */

/**
 * Calculate u percentile (0-100) based on task's u value relative to focal tasks only
 * EXCLUDES: training tasks (isTraining=true) and distraction tasks (isDistraction=true)
 * INCLUDES: only focal tasks (isFocal=true)
 * @param {number} uValue - The u value of the current task (e.g., 0.62, 0.67, etc.)
 * @param {array} allTasks - Array of all task objects with uValue property
 * @param {object} taskData - Optional: the current task object (to check if distraction)
 * @returns {number} - Percentile from 0 to 100
 */
function calculateUPercentile(uValue, allTasks, taskData = null) {
    // If this is a distraction task, return its fixed percentile
    if (taskData && taskData.isDistraction && taskData.individual_percentile !== undefined) {
        return taskData.individual_percentile;
    }
    
    // If this is a training task, return 0 (not used for analysis)
    if (taskData && taskData.isTraining) {
        return 0;
    }
    
    // Filter to include ONLY focal tasks (exclude training and distraction)
    const focalTasks = allTasks.filter(task => 
        task.isFocal === true && 
        !task.isTraining && 
        !task.isDistraction
    );
    
    // Fallback: if no isFocal flag, use old logic (tasks from index 5 onwards that aren't distraction)
    const tasksToUse = focalTasks.length > 0 ? focalTasks : allTasks.filter((task, index) => 
        index >= 5 && !task.isDistraction && !task.isTraining
    );
    
    if (tasksToUse.length === 0) {
        console.warn('No focal tasks found for percentile calculation');
        return 50; // Default to middle
    }
    
    // Get all UNIQUE u values from focal tasks only
    const uniqueUValues = [...new Set(tasksToUse.map(task => task.uValue))].sort((a, b) => a - b);
    
    // Count how many UNIQUE u values are less than or equal to current u
    const countLessOrEqual = uniqueUValues.filter(u => u <= uValue).length;
    
    // Calculate percentile (0 = easiest, 100 = hardest)
    // Using unique u values for the calculation, not total task count
    if (uniqueUValues.length <= 1) {
        return 50; // Only one unique value
    }
    
    const percentile = ((countLessOrEqual - 1) / (uniqueUValues.length - 1)) * 100;
    
    return Math.round(Math.max(0, Math.min(100, percentile)));
}

/**
 * Calculate risk dominance (R) from two players' u values
 * Formula: R = 0.5 * ln(u1 / (1 - u1)) + 0.5 * ln(u2 / (1 - u2))
 * @param {number} u1 - Player 1's u value
 * @param {number} u2 - Player 2's u value
 * @returns {number} - Risk dominance value
 */
function calculateRiskDominance(u1, u2) {
    // Handle edge cases
    if (u1 >= 1 || u1 <= 0 || u2 >= 1 || u2 <= 0) {
        console.warn('u values must be between 0 and 1 (exclusive)');
        return 0;
    }
    
    const term1 = 0.5 * Math.log(u1 / (1 - u1));
    const term2 = 0.5 * Math.log(u2 / (1 - u2));
    
    return term1 + term2;
}

/**
 * Calculate R percentile based on all possible R values from focal tasks only
 * EXCLUDES training tasks and distraction tasks from the u-value pool
 * @param {number} rValue - The R value for the current pair
 * @param {array} allTasks - Array of all task objects
 * @param {object} taskData - Optional: the current task object (to check if distraction)
 * @returns {number} - Percentile from 0 to 100
 */
function calculateRPercentile(rValue, allTasks, taskData = null) {
    // If this is a distraction task, return its fixed percentile
    if (taskData && taskData.isDistraction && taskData.paired_percentile !== undefined) {
        return taskData.paired_percentile;
    }
    
    // If this is a training task, return 0 (not used for analysis)
    if (taskData && taskData.isTraining) {
        return 0;
    }
    
    // Filter to include ONLY focal tasks (exclude training and distraction)
    const focalTasks = allTasks.filter(task => 
        task.isFocal === true && 
        !task.isTraining && 
        !task.isDistraction
    );
    
    // Fallback: if no isFocal flag, use old logic
    const tasksToUse = focalTasks.length > 0 ? focalTasks : allTasks.filter((task, index) => 
        index >= 5 && !task.isDistraction && !task.isTraining
    );
    
    if (tasksToUse.length === 0) {
        console.warn('No focal tasks found for R percentile calculation');
        return 50; // Default to middle
    }
    
    // Get all unique u values from focal tasks only
    const uniqueUValues = [...new Set(tasksToUse.map(task => task.uValue))];
    
    // Calculate all possible R values from pairings of focal task u-values
    const allRValues = [];
    for (let u1 of uniqueUValues) {
        for (let u2 of uniqueUValues) {
            allRValues.push(calculateRiskDominance(u1, u2));
        }
    }
    
    // Sort R values
    allRValues.sort((a, b) => a - b);
    
    if (allRValues.length <= 1) {
        return 50; // Only one possible R value
    }
    
    // Count how many R values are less than or equal to current R
    const countLessOrEqual = allRValues.filter(r => r <= rValue).length;
    
    // Calculate percentile (0 = easiest collaboration, 100 = hardest)
    const percentile = ((countLessOrEqual - 1) / (allRValues.length - 1)) * 100;
    
    return Math.round(Math.max(0, Math.min(100, percentile)));
}

/**
 * Get the u value for a specific task index
 * @param {number} taskIndex - Index of the task
 * @param {array} allTasks - Array of all task objects
 * @returns {number} - The u value for that task
 */
function getTaskUValue(taskIndex, allTasks) {
    if (taskIndex < 0 || taskIndex >= allTasks.length) {
        console.warn('Invalid task index');
        return 0;
    }
    return allTasks[taskIndex].uValue;
}

// Export for Node.js (backend)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateUPercentile,
        calculateRiskDominance,
        calculateRPercentile,
        getTaskUValue
    };
}

// Also make available for browser (frontend)
if (typeof window !== 'undefined') {
    window.StratDynCalculations = {
        calculateUPercentile,
        calculateRiskDominance,
        calculateRPercentile,
        getTaskUValue
    };
}
