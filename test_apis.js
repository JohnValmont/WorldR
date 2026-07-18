const axios = require('axios');
const jwt = require('jsonwebtoken');

async function check() {
  try {
    const db = require('./backend/src/config/database').db;
    const user = await db('users').first();
    if (!user) { console.log('No user'); return db.destroy(); }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'dev-secret-key');
    
    // Test getMe
    try {
      await axios.get('http://localhost:4000/api/v1/characters/me', { headers: { Authorization: `Bearer ${token}` }});
      console.log('getMe: OK');
    } catch(e) { console.log('getMe:', e.response?.status, e.response?.data); }

    // Test getState
    try {
      await axios.get('http://localhost:4000/api/v1/politics/state', { headers: { Authorization: `Bearer ${token}` }});
      console.log('getState: OK');
    } catch(e) { console.log('getState:', e.response?.status, e.response?.data); }

    // Test getParties
    try {
      await axios.get('http://localhost:4000/api/v1/politics/parties?stateId=national', { headers: { Authorization: `Bearer ${token}` }});
      console.log('getParties: OK');
    } catch(e) { console.log('getParties:', e.response?.status, e.response?.data); }
    
    db.destroy();
  } catch (err) {
    console.log("Outer ERROR:", err);
  }
}
check();
