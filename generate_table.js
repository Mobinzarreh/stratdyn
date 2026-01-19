const fs = require('fs');
const { calculateUPercentile, calculateRiskDominance, calculateRPercentile } = require('./utils/calculations');

const experiment = JSON.parse(fs.readFileSync('./data/experiment.json'));

const users = ['user01', 'user02', 'user03', 'user04'];

function getUserTaskSequence(username) {
    const assignments = experiment.assignments[username];
    const distractionTasks = experiment.distraction_tasks || [];
    const insertAfterFocalCounts = experiment.distraction_positions || [5, 11, 17, 22, 25];
    
    let sequence = [];
    let assignmentIndex = 0;
    let focalTaskCount = 0;
    let distractionIdx = 0;
    
    // Training tasks
    for (let i = 0; i < 2 && assignmentIndex < assignments.length; i++) {
        sequence.push({
            task: experiment.tasks[assignments[assignmentIndex]],
            originalIndex: assignments[assignmentIndex],
            isDistraction: false
        });
        assignmentIndex++;
    }
    
    // Focal tasks with distractions
    while (assignmentIndex < assignments.length) {
        sequence.push({
            task: experiment.tasks[assignments[assignmentIndex]],
            originalIndex: assignments[assignmentIndex],
            isDistraction: false
        });
        focalTaskCount++;
        
        if (distractionIdx < distractionTasks.length && 
            insertAfterFocalCounts[distractionIdx] === focalTaskCount) {
            sequence.push({
                task: distractionTasks[distractionIdx],
                originalIndex: -1,
                isDistraction: true
            });
            distractionIdx++;
        }
        
        assignmentIndex++;
    }
    
    return sequence;
}

function getTaskLabel(index) {
    if (index < 2) return `Training Task ${index + 1}`;
    const taskNum = index - 1;
    return `Task ${taskNum}`;
}

function getTaskNumber(task) {
    if (task.isDistraction) {
        return 'Distraction';
    }
    const match = task.label.match(/Task (\d+)/);
    return match ? parseInt(match[1]) : 'Unknown';
}

const userSequences = {};
users.forEach(user => {
    userSequences[user] = getUserTaskSequence(user);
});

const maxTasks = Math.max(...users.map(user => userSequences[user].length));

console.log('\\begin{tabular}{|c|c|c|c|c|}');
console.log('\\hline');
console.log('uiTaskNumber & User & uValue & uiIndividualDifficulty & rPercentile & task \\\\');
console.log('\\hline');

for (let uiTask = 1; uiTask <= 30; uiTask++) {
    const seqIndex = uiTask + 1; // since uiTask 1 = seqIndex 2
    if (seqIndex >= maxTasks) break;
    
    const rowData = [];
    users.forEach(user => {
        const seq = userSequences[user];
        if (seqIndex < seq.length) {
            const taskObj = seq[seqIndex];
            const task = taskObj.task;
            const uValue = task.uValue;
            const uPercentile = calculateUPercentile(uValue, experiment.tasks, task);
            const partner = experiment.partners[user];
            const partnerSeq = userSequences[partner];
            let rPercentile = 'N/A';
            if (seqIndex < partnerSeq.length) {
                const partnerTask = partnerSeq[seqIndex].task;
                const partnerU = partnerTask.uValue;
                const rValue = calculateRiskDominance(uValue, partnerU);
                rPercentile = calculateRPercentile(rValue, experiment.tasks, task);
            }
            const taskNum = getTaskNumber(task);
            rowData.push(`${user} & ${uValue} & ${uPercentile} & ${rPercentile} & ${taskNum}`);
        }
    });
    
    if (rowData.length > 0) {
        console.log(`${uiTask} & ${rowData.join(' \\\\ \\hline ' + uiTask + ' & ')} \\\\`);
        console.log('\\hline');
    }
}

console.log('\\end{tabular}');