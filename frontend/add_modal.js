const fs = require('fs');
const file = 'public/landing/index.html';
let content = fs.readFileSync(file, 'utf8');

const modalHtml = `
<!-- GUEST MODAL -->
<div id="guestModalOverlay" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease;">
  <div class="guest-modal" style="background: #090a0f; border: 1px solid rgba(255,255,255,0.1); padding: 40px; text-align: center; max-width: 480px; transform: translateY(20px); transition: transform 0.3s ease;">
    <div class="console-crest" style="color: #c9a050; font-size: 24px; margin-bottom: 20px;">✦</div>
    <h3 style="font-family: 'Cinzel', serif; color: #fff; font-size: 24px; margin-bottom: 16px; font-weight: 500;">Guest Access Warning</h3>
    <p style="font-family: 'Inter', sans-serif; color: #888; line-height: 1.6; margin-bottom: 32px; font-size: 14px;">Guest accounts are temporary. If you clear your browser data or switch devices, <span style="color: #c9a050;">all progress, wealth, and companies will be permanently lost</span>.</p>
    <div style="display: flex; gap: 16px; justify-content: center;">
      <button class="btn" id="btnCancelGuest" style="background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #888;"><span>Cancel</span></button>
      <button class="btn btn-primary" id="btnConfirmGuest"><span>Continue as Guest</span></button>
    </div>
  </div>
</div>
`;

if (!content.includes('guestModalOverlay')) {
    content = content.replace('</main>', '</main>' + modalHtml);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Modal added to index.html');
} else {
    console.log('Modal already exists in index.html');
}
