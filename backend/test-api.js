const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/v1/companies/0c564fdf-ee01-4ad2-b123-50df61e73093/manufacturing/data',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyNjA3MDAyIiwiaWF0IjoxNzg0MDQxNjg4LCJleHAiOjE4MTU1OTkyODh9.m4sXu1l-PH-J3JnQIafnOjmPkPGTuq9755x952lugr8'
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
