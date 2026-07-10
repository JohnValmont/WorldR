const fs = require('fs');

const file = 'd:/WorldR/frontend/public/landing/app.js';
let content = fs.readFileSync(file, 'utf8');

// Replace the previous block with the correct relative URL
content = content.replace(/https:\/\/world-r-[a-zA-Z0-9-]+\.ts\.r\.appspot\.com\/api\/v1\/auth\/guest-login/g, '/api/v1/auth/guest-login');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed URL in app.js');
