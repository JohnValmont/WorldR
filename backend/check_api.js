const fetch = require('node-fetch');
async function check() {
  const companyId = '3c0fb155-3ed0-4e99-8a24-9af4f7b33351';
  try {
    const res = await fetch('http://localhost:4000/api/companies/' + companyId + '/cap-table', {
      headers: {
        'Authorization': 'Bearer ' + 'dummy_token' // Wait, I might need auth
      }
    });
    console.log(res.status);
  } catch (e) {}
}
check();
