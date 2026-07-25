import http from 'http';

http.get('http://localhost:10000/api/v1/business/manufacturing/da85639c-8f28-4abe-ab19-a51ae86128c0/dashboard', {
  headers: {
    'Authorization': 'Bearer test-token' // The auth middleware allows anonymous or uses mocked auth?
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify({ latestReport: json.latestReport }, null, 2));
    } catch(e) {
      console.log("Not JSON:", data);
    }
  });
}).on('error', console.error);
