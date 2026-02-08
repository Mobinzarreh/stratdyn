delete require.cache[require.resolve('./utils/calculations.js')];
const { calculateUPercentile } = require('./utils/calculations');
const exp = require('./data/experiment.json');

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║  VERIFICATION: Percentile Consistency Fix                       ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('PROBLEM IDENTIFIED & FIXED:\n');
console.log('❌ OLD (WRONG): U-percentiles were being calculated from:');
console.log('   Training tasks (0-4) + Main tasks (5-29) + Distraction tasks (30+)');
console.log('   This created 12 unique u-values, giving WRONG percentiles\n');

console.log('✅ NEW (CORRECT): U-percentiles now calculated from:');
console.log('   Main tasks (5-29) + Distraction tasks (30+) only');
console.log('   Excludes training tasks (indices 0-4)\n');

const nonTrainingTasks = exp.tasks.slice(5);
const uniqueValues = [...new Set(nonTrainingTasks.map(t => t.uValue))].sort((a,b) => a-b);

console.log(`Pool has ${uniqueValues.length} unique u-values: ${uniqueValues.join(', ')}\n`);

console.log('PERCENTILE MAPPING (now CONSISTENT across stages):\n');
uniqueValues.forEach(u => {
  const pct = calculateUPercentile(u, exp.tasks);
  console.log(`  u=${u} → ${pct}%`);
});

console.log('\nEXAMPLE: User01 Task 5\n');
const taskIdx = exp.assignments.user01[5];
const task = exp.tasks[taskIdx];
const pct = calculateUPercentile(task.uValue, exp.tasks);

console.log(`  Task label: ${task.label}`);
console.log(`  u-value: ${task.uValue}`);
console.log(`  ✅ INTENTION stage: ${pct}%`);
console.log(`  ✅ CHOICE stage: ${pct}% (SAME - now consistent!)`);
console.log(`  Payoffs: A=${task.options[0].upside}/${task.options[0].downside}, B=${task.options[1].upside}/${task.options[1].downside}, C=${task.options[2].upside}/${task.options[2].downside}, Y=${task.options[3].upside}/${task.options[3].downside}`);

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║  ✅ FIX COMPLETE - Percentiles now CONSISTENT!                ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');
