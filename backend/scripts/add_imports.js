const fs = require('fs');
let orig = fs.readFileSync('src/api/controllers/manufacturing.controller.ts', 'utf8');
orig = orig.replace("import { MARKET_SEGMENTS } from '../constants/marketSegments';", "import { MARKET_SEGMENTS } from '../constants/marketSegments';\nimport { runNpcBrainForCompany } from '../services/npcBrain.service';");
fs.writeFileSync('src/api/controllers/manufacturing.controller.ts', orig);
