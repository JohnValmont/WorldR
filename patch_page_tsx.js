const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend/src/app/drennia/exchange/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Update imports to include companyApi
content = content.replace(
  `import { exchangeApi, characterApi } from '../../../lib/api';`,
  `import { exchangeApi, characterApi, companyApi } from '../../../lib/api';`
);

// 2. Fetch myCompanies in Bourse component (starts around line 748)
const oldSwr = `  const { data: charData } = useSWR('my-character', () => characterApi.getMe().then(r => r.data), { revalidateOnFocus: false });
  const { data: pipeline } = useSWR('ipo-pipeline-count', () => exchangeApi.getPipeline(), { refreshInterval: 20000 });`;
const newSwr = `  const { data: charData } = useSWR('my-character', () => characterApi.getMe().then(r => r.data), { revalidateOnFocus: false });
  const { data: pipeline } = useSWR('ipo-pipeline-count', () => exchangeApi.getPipeline(), { refreshInterval: 20000 });
  const { data: myCompaniesData } = useSWR('my-companies-bourse', () => companyApi.getMy().then(r => r.data), { revalidateOnFocus: false });
  const myFinanceFirms = myCompaniesData?.companies?.filter((c: any) => c.industry_id === 'finance') || [];`;

content = content.replace(oldSwr, newSwr);

// 3. Pass myFinanceFirms to OrderTicket
content = content.replace(
  `{activeId && !showQuickIpo && <OrderTicket companyId={activeId} lastClose={active?.last_price ?? null} onPlaced={onPlaced} />}`,
  `{activeId && !showQuickIpo && <OrderTicket companyId={activeId} lastClose={active?.last_price ?? null} onPlaced={onPlaced} myFinanceFirms={myFinanceFirms} />}`
);

// 4. Update OrderTicket signature and state
const oldTicketSig = `function OrderTicket({ companyId, lastClose, onPlaced }: { companyId: string; lastClose: number | null; onPlaced: () => void }) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState(lastClose != null ? String(lastClose) : '');
  const [quantity, setQuantity] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);`;
  
const newTicketSig = `function OrderTicket({ companyId, lastClose, onPlaced, myFinanceFirms = [] }: { companyId: string; lastClose: number | null; onPlaced: () => void; myFinanceFirms?: any[] }) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState(lastClose != null ? String(lastClose) : '');
  const [quantity, setQuantity] = useState('');
  const [purchaserCompanyId, setPurchaserCompanyId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);`;

content = content.replace(oldTicketSig, newTicketSig);

// 5. Update OrderTicket API call
const oldSubmit = `    try {
      setBusy(true);
      setMsg(null);
      const p = Number(price);
      const q = Number(quantity);
      if (!p || !q) throw new Error('Invalid inputs');
      const result = await exchangeApi.placeOrder(companyId, { side, price: p, quantity: q });`;
const newSubmit = `    try {
      setBusy(true);
      setMsg(null);
      const p = Number(price);
      const q = Number(quantity);
      if (!p || !q) throw new Error('Invalid inputs');
      const result = await exchangeApi.placeOrder(companyId, { side, price: p, quantity: q, purchaserCompanyId: purchaserCompanyId || undefined });`;

content = content.replace(oldSubmit, newSubmit);

// 6. Add Buy As dropdown to OrderTicket UI
const oldPlaceOrderUI = `      <style>{placeholderStyle}</style>
      <div style={{ ...label, marginBottom: '12px' }}>Place Order</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>`;

const newPlaceOrderUI = `      <style>{placeholderStyle}</style>
      <div style={{ ...label, marginBottom: '12px' }}>Place Order</div>
      
      {myFinanceFirms.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Buy/Sell As</div>
          <select 
            value={purchaserCompanyId} 
            onChange={e => setPurchaserCompanyId(e.target.value)}
            style={{ width: '100%', padding: '6px', background: T.bg, border: \`1px solid \${T.border}\`, color: T.ivory, ...mono, fontSize: '11px' }}
          >
            <option value="">Personal Wallet</option>
            {myFinanceFirms.map(f => (
              <option key={f.id} value={f.id}>{f.name} (Firm)</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>`;

content = content.replace(oldPlaceOrderUI, newPlaceOrderUI);

fs.writeFileSync(file, content);
console.log('Successfully patched page.tsx');
