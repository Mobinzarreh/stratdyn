const exp = require('./data/experiment.json');

console.log('=== Task 5 investigation ===\n');

console.log('USER01 progression:');
let focalCount = 0;
for (let i = 2; i <= 10; i++) {
  const assignIndex = exp.assignments.user01[i];
  const task = exp.tasks[assignIndex];
  const isFocal = !task.isTraining && !task.isDistraction;
  if (isFocal) {
    focalCount++;
    console.log(`taskIndex ${i}: Task ${focalCount} -> ${task.label} (uValue: ${task.uValue})`);
    if (task.options) {
      console.log(`  Options: K=${task.options[0].upside}/${task.options[0].downside}, M=${task.options[1].upside}/${task.options[1].downside}, L=${task.options[2].upside}/${task.options[2].downside}`);
    }
  } else {
    console.log(`taskIndex ${i}: DISTRACTION (${task.label}) -> uValue: ${task.uValue}`);
    if (task.options) {
      console.log(`  Options: K=${task.options[0].upside}/${task.options[0].downside}, M=${task.options[1].upside}/${task.options[1].downside}, L=${task.options[2].upside}/${task.options[2].downside}`);
    }
  }
}

console.log('\nUSER02 progression:');
focalCount = 0;
for (let i = 2; i <= 10; i++) {
  const assignIndex = exp.assignments.user02[i];
  const task = exp.tasks[assignIndex];
  const isFocal = !task.isTraining && !task.isDistraction;
  if (isFocal) {
    focalCount++;
    console.log(`taskIndex ${i}: Task ${focalCount} -> ${task.label} (uValue: ${task.uValue})`);
    if (task.options) {
      console.log(`  Options: K=${task.options[0].upside}/${task.options[0].downside}, M=${task.options[1].upside}/${task.options[1].downside}, L=${task.options[2].upside}/${task.options[2].downside}`);
    }
  } else {
    console.log(`taskIndex ${i}: DISTRACTION (${task.label}) -> uValue: ${task.uValue}`);
    if (task.options) {
      console.log(`  Options: K=${task.options[0].upside}/${task.options[0].downside}, M=${task.options[1].upside}/${task.options[1].downside}, L=${task.options[2].upside}/${task.options[2].downside}`);
    }
  }
}
