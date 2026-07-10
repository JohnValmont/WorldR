const fs = require('fs');

const file = 'd:/WorldR/frontend/public/landing/index.html';
let content = fs.readFileSync(file, 'utf8');

const targetStr = '<button class="btn" id="btnLogin"><span>Login</span></button>';
const replacementStr = `<button class="btn" id="btnLogin"><span>Login</span></button>\n        <button class="btn btn-guest" id="btnGuest" style="background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #888;"><span>Play As Guest</span></button>`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content, 'utf8');
console.log('Added btnGuest to index.html');
