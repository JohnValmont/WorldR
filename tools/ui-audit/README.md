# UI audit tools (local only)

Two scripts that back the closed-alpha UI scorecard with evidence. They drive a real
browser against a **local** game (frontend on :3000, backend on :4000) and refuse to run
against anything else.

| Script | What it checks |
|---|---|
| `a11y.js` | axe-core (WCAG 2.1 A/AA + best practice) on 15 screens at desktop and phone width. Prints every violation; exits 1 if any. |
| `journey.js` | A brand-new player: landing → sign-up (6 steps) → first game screen → first decision. Counts clicks, fields and time; exits 1 on a dead end or a 5xx. |

## Run

```bash
cd tools/ui-audit
npm init -y >/dev/null && npm i --no-save playwright@1 axe-core@4.10.2
node journey.js            # desktop
node journey.js mobile     # phone
node a11y.js
```

Notes
- `journey.js` creates its own throwaway account and uses the server's **non-production**
  verification bypass code, so it only works against a local backend (`NODE_ENV` not production).
- `a11y.js` signs in with the account `journey.js` created last (stored in `.last-account.json`,
  git-ignored), so run the journey first.
- Automated checks find a share of accessibility problems, not all of them. A screen-reader
  pass and real players are still needed.
