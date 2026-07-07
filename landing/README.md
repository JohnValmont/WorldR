# WORLDr — Landing & Access Experience

Cinematic dark grand-strategy landing page and citizenship onboarding flow for **WORLDr**, set in the persistent world of **Aethan** (playable nation at launch: **Drennia**).

Static, dependency-light (Three.js, GSAP, Lenis via CDN). No build step.

## Files
| File | Purpose |
|------|---------|
| `index.html` / `styles.css` / `app.js` | Landing page — 3D globe of Aethan, scroll storytelling (Living World → Political Rise → Business Power → NPC Institutions → Public Records), animated WORLDr wordmark, login console. |
| `onboarding.html` / `onboarding.css` / `onboarding.js` | Access & citizenship flow: Create Account → OTP Verify → Login → Character Creation → Country Selection → Citizenship Confirmed → Enter. |
| `onboarding_data.js` | Nation + culture data derived from the Aethan map export. |
| `assets/maps.js` | Aethan political map + Drennia map as embedded base64 data URIs (no binary assets). |

## Run locally
```bash
cd landing
python3 -m http.server 8080
# open http://localhost:8080/index.html  (landing)
#      http://localhost:8080/onboarding.html  (flow)
```

## Notes / TODO
- Front-end only: forms validate and transition but are **not yet wired to the backend**. Connect auth / OTP endpoints in `onboarding.js` (`validate()` + `goTo()` handlers) and the login console buttons in `app.js`.
- Add future playable nations by flipping `"playable": true` in `onboarding_data.js`.
- The "Join Discord" button needs the real invite URL.
- Palette: near-black charcoal/navy + single amber-gold accent `#cd8c1e` (matches Drennia identity).
