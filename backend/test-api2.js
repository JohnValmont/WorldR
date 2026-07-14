const http = require('http');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ id: 2607002, email: 'test@test.com', role: 'user', is_verified: true }, 'worldr_access_secret_dev_key_at_least_32_chars_long', { expiresIn: '1y' });

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/v1/companies/0c564fdf-ee01-4ad2-b123-50df61e73093/manufacturing/data',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('BODY:', data.substring(0, 1000)));
});

req.on('error', e => console.error(e));
req.end();
