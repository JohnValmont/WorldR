const fs = require('fs');
const file = 'backend/src/api/controllers/manufacturing.controller.ts';
let c = fs.readFileSync(file, 'utf8');

const priValidationStr = `
      // Validate and normalize engineering priorities
      const engineeringPriorities: Record<string, number> = rawPriorities ?? DEFAULT_ENGINEERING_PRIORITIES;
      let prioritySum = 0;
      for (const val of Object.values(engineeringPriorities)) {
        if (typeof val !== 'number' || val < 0) {
          return next(new AppError('Engineering priorities must be positive numbers', 400, 'INVALID_PRIORITIES'));
        }
        prioritySum += val;
      }
      if (Math.abs(prioritySum - 100) > 2) {
        return next(new AppError(\`Engineering priorities must sum to 100 (got \${prioritySum})\`, 400, 'INVALID_PRIORITIES'));
      }`;

c = c.replace(/\/\/ Validate and normalize engineering priorities[\s\S]*?\}?\s*if\s*\(Math.abs\(prioritySum\s*-\s*100\)\s*>\s*2\)\s*\{\s*return\s*next\(new\s*AppError.*?\);\s*\}/, priValidationStr.trim());

const budgetValidationStr = `
        // Build engineering design for engine
        const budgetAlloc: Record<string, number> = rawBudgetAlloc ?? {};
        // If no budget alloc supplied, distribute using defaults
        if (Object.keys(budgetAlloc).length === 0) {
          for (const bucket of BUDGET_BUCKETS) {
            budgetAlloc[bucket.id] = Math.round(BASE_DEV_COST * bucket.defaultPct);
          }
        } else {
          for (const val of Object.values(budgetAlloc)) {
            if (typeof val !== 'number' || val < 0) {
              throw new AppError('Budget allocations must be positive numbers', 400, 'INVALID_BUDGET');
            }
          }
        }
`;

c = c.replace(/\/\/ Build engineering design for engine[\s\S]*?budgetAlloc\[bucket\.id\] = Math\.round\(BASE_DEV_COST \* bucket\.defaultPct\);\s*\}\s*\}/, budgetValidationStr.trim());

fs.writeFileSync(file, c);
