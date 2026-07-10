const fs = require('fs');

const file = 'd:/WorldR/frontend/public/landing/app.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = "const btnLogin = document.getElementById('btnLogin');";
const replacementStr = "const btnLogin = document.getElementById('btnLogin');\nconst btnGuest = document.getElementById('btnGuest');";
content = content.replace(targetStr, replacementStr);

const targetStr2 = "if (btnLogin) btnLogin.addEventListener('click', () => { window.location.href = '/landing/onboarding.html?action=login'; });";
const replacementStr2 = `if (btnLogin) btnLogin.addEventListener('click', () => { window.location.href = '/landing/onboarding.html?action=login'; });

if (btnGuest) {
  btnGuest.addEventListener('click', async () => {
    const confirmGuest = confirm("Guest accounts cannot be recovered if you clear your browser data. Continue?");
    if (!confirmGuest) return;
    
    try {
      const btnSpan = btnGuest.querySelector('span');
      if (btnSpan) btnSpan.innerText = 'Creating...';
      
      const res = await fetch('https://world-r-36655.ts.r.appspot.com/api/v1/auth/guest-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) {
        throw new Error('Failed to create guest account');
      }
      
      const data = await res.json();
      localStorage.setItem('worldr_access_token', data.accessToken);
      
      window.location.href = '/start/character';
    } catch (err) {
      console.error(err);
      alert('Error creating guest account.');
      const btnSpan = btnGuest.querySelector('span');
      if (btnSpan) btnSpan.innerText = 'Play As Guest';
    }
  });
}`;

content = content.replace(targetStr2, replacementStr2);

fs.writeFileSync(file, content, 'utf8');
console.log('Wired btnGuest in app.js');
