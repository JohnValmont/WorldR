const BASE_URL = 'http://localhost:4000/api/v1';
async function run() {
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'infoforbiddengaming@gmail.com', password: 'test1234' })
  });
  const { accessToken: token } = await loginRes.json();
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  
  const compRes = await fetch(`${BASE_URL}/companies/my`, { headers });
  const myCompanies = await compRes.json();
  const mfgCo = myCompanies.find(c => c.industry_id === 'manufacturing');
  const companyId = mfgCo.id;
  
  console.log(`Processing arcs for company: ${companyId}`);
  for (let i = 1; i <= 15; i++) {
    const arcRes = await fetch(`${BASE_URL}/admin/manufacturing/process-company/${companyId}`, { method: 'POST', headers });
    const arcData = await arcRes.json();
    console.log(`Arc ${i} completed.`);
    if (arcData.models && arcData.models.length > 0) {
      console.log(`Model 0 stage: ${arcData.models[0].dev_stage}`);
    }
  }
}
run().catch(console.error);
