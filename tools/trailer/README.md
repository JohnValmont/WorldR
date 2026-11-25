# WORLDr trailer tools (local only)

Everything used to make the Closed Alpha trailer (75 s and 30 s cuts), so it can be re-cut or
re-rendered later. Script and shot list: `SCRIPT.md`. Videos, footage and audio are NOT in git.

All of it runs against a **local** game only (backend :4000, frontend :3000, `NODE_ENV` not
production for the `000000` verification bypass). The scripts refuse any other address and read the
database address from `backend/.env`. Needs Playwright (install it in `tools/ui-audit`, see its README),
ffmpeg, psql, and Python 3 with numpy + scipy.

| Step | Command | What it does |
|---|---|---|
| 1. World | `./build-world.sh` | On a fresh local database: 11 scripted players in 3 nations, an election, a coalition (the "Marsh Administration"), bills, deals and ~20 months of history. `world/stage.mjs` holds the few direct data edits (documented in the file). |
| 2. Film | `node film.cjs` (or `node film.cjs vote map ...`) | Records each shot through the DevTools screencast into `clips/<shot>/` (30 fps frames) and `clips/<shot>.mp4`. Pages are enlarged with CSS zoom so close-ups stay sharp. |
| 3. Flags | `node flags.cjs` | Saves the three nation flags from the game into `comp/assets/`. |
| 4. Score | `python3 score.py main audio/score-main.wav` and `... short audio/score-short.wav` | Synthesised score (no samples, no licences): 120 BPM, D minor, clock-tick motif, braams on act changes. |
| 5. Render | `comp/prepare.sh`, then `(cd comp && python3 -m http.server 8099)`, then `node render.cjs main full` / `node render.cjs short full` | The edit is a web page (`comp/index.html` + `comp/trailer.js`, GSAP timeline) drawn frame by frame. `node render.cjs main stills 13,40,72` renders preview stills. |
| 6. Mux | `./mux.sh main WORLDr-Closed-Alpha-Trailer-75s.mp4` | Frames + score into `out/` (H.264 1080p30, AAC). |

Honesty rules for any re-cut: gameplay shots must be real screens from the build; anything not in
the game goes under the "COMING IN FUTURE SEASONS · PLANNED, NOT IN THE CLOSED ALPHA" banner.
The end card's date lives in `comp/index.html` (`#edate`).
