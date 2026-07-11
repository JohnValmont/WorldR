const fs = require('fs');
const file = 'public/landing/app.js';
let content = fs.readFileSync(file, 'utf8');

const replacementStr = `const btnLogin = document.getElementById('btnLogin');
const btnGuest = document.getElementById('btnGuest');
const guestModalOverlay = document.getElementById('guestModalOverlay');
const btnCancelGuest = document.getElementById('btnCancelGuest');
const btnConfirmGuest = document.getElementById('btnConfirmGuest');`;

content = content.replace("const btnLogin = document.getElementById('btnLogin');", replacementStr);

const logicStr = `if (btnLogin) btnLogin.addEventListener('click', () => { window.location.href = '/landing/onboarding.html?action=login'; });

if (btnGuest && guestModalOverlay) {
  // Show Modal
  btnGuest.addEventListener('click', () => {
    guestModalOverlay.style.display = 'flex';
    setTimeout(() => { guestModalOverlay.style.opacity = '1'; }, 10);
  });

  // Hide Modal
  btnCancelGuest.addEventListener('click', () => {
    guestModalOverlay.style.opacity = '0';
    setTimeout(() => { guestModalOverlay.style.display = 'none'; }, 300);
  });

  // Confirm and Login
  btnConfirmGuest.addEventListener('click', async () => {
    try {
      const btnSpan = btnConfirmGuest.querySelector('span');
      if (btnSpan) btnSpan.innerText = 'Creating Account...';
      
      const res = await fetch('/api/v1/auth/guest-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) {
        throw new Error('Failed to create guest account');
      }
      
      const data = await res.json();
      localStorage.setItem('worldr_access_token', data.accessToken);
      
      window.location.href = '/landing/onboarding.html?action=character';
    } catch (err) {
      console.error(err);
      alert('Error creating guest account.');
      const btnSpan = btnConfirmGuest.querySelector('span');
      if (btnSpan) btnSpan.innerText = 'Continue as Guest';
    }
  });
}`;

content = content.replace("if (btnLogin) btnLogin.addEventListener('click', () => { window.location.href = '/landing/onboarding.html?action=login'; });", logicStr);

fs.writeFileSync(file, content, 'utf8');
console.log('App logic added to app.js');
