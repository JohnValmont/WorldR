const https = require('https');
https.get('https://world-r-frontend.vercel.app/drennia/business', (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const jsFiles = body.match(/_next\/static\/chunks\/[^\"]+\.js/g);
    console.log('JS Files found:', jsFiles);
    if(jsFiles && jsFiles.length > 0) {
      let found = false;
      jsFiles.forEach(file => {
        https.get('https://world-r-frontend.vercel.app/' + file, (jsRes) => {
          let jsBody = '';
          jsRes.on('data', d => jsBody += d);
          jsRes.on('end', () => {
            const match = jsBody.match(/https:\/\/[^\"]+\.onrender\.com/g);
            if (match && !found) {
              console.log('Found backend URL:', match[0]);
              found = true;
            }
          });
        });
      });
    }
  });
});
