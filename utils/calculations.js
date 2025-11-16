/**
 * Utility functions for calculating u percentile and risk dominance (R)
 */

/**
 * Calculate u percentile (0-100) based on task's u value relative to all tasks
 * EXCLUDES training tasks (indices 0-1) from the percentile pool
 * Pool includes: main/focal tasks (2-26) and distraction tasks (27-31)
 * @param {number} uValue - The u value of the current task (e.g., 0.62, 0.67, etc.)
 * @param {array} allTasks - Array of all task objects with uValue property
 * @returns {number} - Percentile from 0 to 100
 */
function calculateUPercentile(uValue, allTasks) {
    // EXCLUDE training tasks (indices 0-1) from percentile calculation
    // Include only: main/focal tasks (2-26) and distraction tasks (27+)
    const nonTrainingTasks = allTasks.slice(2);
    
    // Get all UNIQUE u values from non-training tasks
    const uniqueUValues = [...new Set(nonTrainingTasks.map(task => task.uValue))].sort((a, b) => a - b);
    
    // Count how many UNIQUE u values are less than or equal to current u
    const countLessOrEqual = uniqueUValues.filter(u => u <= uValue).length;
    
    // Calculate percentile (0 = easiest, 100 = hardest)
    // Using unique u values for the calculation, not total task count
    const percentile = ((countLessOrEqual - 1) / (uniqueUValues.length - 1)) * 100;
    
    return Math.round(percentile);
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
 * Calculate R percentile based on all possible R values in the experiment
 * EXCLUDES training tasks from the u-value pool used to calculate R values
 * @param {number} rValue - The R value for the current pair
 * @param {array} allTasks - Array of all task objects
 * @returns {number} - Percentile from 0 to 100
 */
function calculateRPercentile(rValue, allTasks) {
    // EXCLUDE training tasks (indices 0-1) from R-value pool
    const nonTrainingTasks = allTasks.slice(2);
    
    // Get all unique u values from non-training tasks
    const uniqueUValues = [...new Set(nonTrainingTasks.map(task => task.uValue))];
    
    // Calculate all possible R values from pairings
    const allRValues = [];
    for (let u1 of uniqueUValues) {
        for (let u2 of uniqueUValues) {
            allRValues.push(calculateRiskDominance(u1, u2));
        }
    }
    
    // Sort R values
    allRValues.sort((a, b) => a - b);
    
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
