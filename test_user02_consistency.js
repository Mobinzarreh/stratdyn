const exp = require('./data/experiment.json');
delete require.cache[require.resolve('./utils/calculations.js')];
const { calculateUPercentile, calculateRiskDominance, calculateRPercentile } = require('./utils/calculations');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║    SIMULATION: Intention → Choice Consistency Check            ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const username = 'user02';
const partner = exp.partners[username];

console.log(`Testing ${username} (partner: ${partner})\n`);

// Test positions 2-6 (first few main tasks after training)
for (let taskIndex = 2; taskIndex <= 6; taskIndex++) {
  const assignmentIndex = exp.assignments[username][taskIndex];
  const task = exp.tasks[assignmentIndex];
  const partnerAssignmentIndex = exp.assignments[partner][taskIndex];
  const partnerTask = exp.tasks[partnerAssignmentIndex];
  
  // STAGE 1: Intention
  const intentionMyU = task.uValue;
  const intentionMyPct = calculateUPercentile(intentionMyU, exp.tasks);
  const intentionPartnerU = partnerTask.uValue;
  const intentionR = calculateRiskDominance(intentionMyU, intentionPartnerU);
  const intentionRPct = calculateRPercentile(intentionR, exp.tasks);
  
  // STAGE 2: Choice (should be IDENTICAL)
  const choiceMyU = task.uValue;
  const choiceMyPct = calculateUPercentile(choiceMyU, exp.tasks);
  const choicePartnerU = partnerTask.uValue;
  const choiceR = calculateRiskDominance(choiceMyU, choicePartnerU);
  const choiceRPct = calculateRPercentile(choiceR, exp.tasks);
  
  const consistent = (intentionMyPct === choiceMyPct) && (intentionRPct === choiceRPct);
  const status = consistent ? '✅' : '❌';
  
  console.log(`${status} Position ${taskIndex}: ${task.label} (u=${task.uValue})`);
  console.log(`   ${username}: Task[${assignmentIndex}]`);
  console.log(`   ${partner}: Task[${partnerAssignmentIndex}] (u=${partnerTask.uValue})`);
  console.log(`   Intention: u-pct=${intentionMyPct}%, R-pct=${intentionRPct}%`);
  console.log(`   Choice:    u-pct=${choiceMyPct}%, R-pct=${choiceRPct}%`);
  console.log(`   Payoffs: A=${task.options[0].upside}/${task.options[0].downside}, B=${task.options[1].upside}/${task.options[1].downside}, C=${task.options[2].upside}/${task.options[2].downside}`);
  
  if (!consistent) {
    console.log(`   ❌ INCONSISTENT!`);
  }
  console.log('');
}
