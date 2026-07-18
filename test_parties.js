const axios = require('axios');

async function check() {
  try {
    // Generate token first to make the request
    const db = require('./backend/src/config/database').db;
    const user = await db('users').first();
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'dev-secret-key');
    
    const res = await axios.get('http://localhost:3000/api/v1/politics/parties?stateId=national', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("SUCCESS:", res.status);
  } catch (err) {
    console.log("ERROR:", err.response ? err.response.status : err.message);
  }
}
check();
