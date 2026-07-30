const fs = require('fs');
const tsCode = fs.readFileSync('src/api/services/npcBrain.service.ts', 'utf-8');

// Extract just the decideNpcActions function logic.
// Or wait, I can just transpile it using typescript compiler.
const ts = require('typescript');
const jsCode = ts.transpileModule(tsCode, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
fs.writeFileSync('npcBrain_temp.js', jsCode);

const { decideNpcActions } = require('./npcBrain_temp.js');

const input = {
  reasonCode: null,
  marketShareThisArc: 0,
  marketSharePrevArc: 0,
  unitsSoldLastArc: 0,
  unitsProducedLastArc: 0,
  inventoryInStock: 0,
  targetUnits: 0,
  factoryCapacity: 400,
  availableCash: 45000000,
  manufacturingCostPerUnit: 14000,
  marketingTier: 'none',
  brandAwareness: 20,
  salePrice: 20000
};

const output = decideNpcActions(input);
console.log("OUTPUT:", output);
