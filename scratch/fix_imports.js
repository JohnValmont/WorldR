const fs = require('fs');
const newKeys = ['procuringComponent', 'setProcuringComponent', 'handleProcureComponent', 'handleSavePrice', 'handleSaveAllocation', 'handleProcessAdmin'];
const path = 'd:/WorldR/frontend/src/app/drennia/business';

const extraImports = `import {
  Card, Button, StatCard, DataRow, EmptyState as UIEmptyState, Badge, StatusDot, SectionHeading, Tabs, ProgressBar
} from '@/components/ui';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line
} from 'recharts';
import { T } from '../../../lib/theme';
`;

const files = fs.readdirSync(path).filter(f => f.endsWith('.tsx') && f !== 'ManufacturingDeskTab.tsx' && f !== 'ManufacturingContext.tsx' && f !== 'EquityDeskTab.tsx' && f !== 'page.tsx');
for (const f of files) {
  let p = path + '/' + f;
  let c = fs.readFileSync(p, 'utf8');
  if (!c.includes('@/components/ui')) {
    c = extraImports + c;
  }
  c = c.replace(/Badge, EmptyState\r?\n\s*}\s*=\s*useManufacturing\(\);/, 'Badge, EmptyState,\n    ' + newKeys.join(', ') + '\n  } = useManufacturing();');
  fs.writeFileSync(p, c);
}
let mfg = fs.readFileSync(path + '/ManufacturingDeskTab.tsx', 'utf8');
mfg = mfg.replace(/Badge, EmptyState\r?\n\s*};\r?\n/, 'Badge, EmptyState,\n    ' + newKeys.join(', ') + '\n  };\n');
fs.writeFileSync(path + '/ManufacturingDeskTab.tsx', mfg);
