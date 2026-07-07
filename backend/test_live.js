async function run() {
  const base = 'http://localhost:4000/api/v1';
  const email = 'test_politics_' + Date.now() + '@example.com';
  const password = 'password123';

  // 1. Register
  console.log('Registering...');
  let res = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username: 'testuser' + Date.now() })
  });
  let data = await res.json();
  console.log('Register:', data);

  // 2. Login
  console.log('Logging in...');
  res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  data = await res.json();
  console.log('Login:', data.status);
  const token = data.accessToken;

  // 2.2 Get active state ID
  console.log('Fetching active state for character creation...');
  res = await fetch(`${base}/politics/state`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  data = await res.json();
  const activeStateId = data.activeState.id;
  console.log('Active state ID:', activeStateId);

  // 2.5 Create character
  console.log('Creating character...');
  res = await fetch(`${base}/characters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Test Candidate',
      motherland_country_id: 'drennia',
      home_state_id: 'drennia-ironvale',
      currency_id: 'dollar'
    })
  });
  const charText = await res.text();
  console.log('Character creation status:', res.status);
  console.log('Character creation response:', charText);

  // 3. Hit getPolls
  console.log('Fetching polls...');
  res = await fetch(`${base}/politics/polls?stateId=ironvale`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}
run();
