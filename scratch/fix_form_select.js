const fs = require('fs');

const path = 'd:/WorldR/frontend/src/app/drennia/business';

let ds = fs.readFileSync(path + '/DesignStudio.tsx', 'utf8');

const formSelectStr = `
const FormSelect = ({ label, value, onChange, disabled, options }: any) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} style={{ width: '100%', padding: '8px', background: '#0e0e0e', border: '1px solid #2a2a2a', color: '#fff' }}>
      {options?.map((o: any) => <option key={o.id} value={o.id}>{o.name || o.label}</option>)}
    </select>
  </div>
);
`;

if (!ds.includes('const FormSelect =')) {
  ds = ds.replace('export default function DesignStudio', formSelectStr + '\nexport default function DesignStudio');
}

// Revert <select className="..."  label="..." ... /> back to <FormSelect label="..." ... />
ds = ds.replace(/<select className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100"\s+/g, '<FormSelect ');

fs.writeFileSync(path + '/DesignStudio.tsx', ds);
