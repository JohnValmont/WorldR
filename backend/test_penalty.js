const allocNew = { launched_year: 4, launched_month: 1 };
const allocOld = { launched_year: 1, launched_month: 1 };
const currentWorldYear = 4;
const currentWorldMonth = 1;

function getPenalty(alloc) {
  const launchedYear = Number(alloc.launched_year || currentWorldYear);
  const launchedMonth = Number(alloc.launched_month || currentWorldMonth);
  const ageMonths = Math.max(0, (currentWorldYear - launchedYear) * 12 + (currentWorldMonth - launchedMonth));
  
  let agePenaltyMult = 1.0;
  if (ageMonths > 12) {
    agePenaltyMult = Math.max(0.40, 1.0 - ((ageMonths - 12) * 0.025));
  }
  return { ageMonths, agePenaltyMult };
}

console.log("New car penalty:", getPenalty(allocNew));
console.log("Old car (3 years) penalty:", getPenalty(allocOld));
