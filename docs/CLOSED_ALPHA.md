# WORLDr Closed Alpha: readiness, owner checklist, schedule

Written 2026-11-25. Plain English. What the code now does, what only the owner can do, and the
dates. The Discord posts are at the bottom, ready to paste.

## 1. Where things stand

**The game is ready for a small closed alpha once the owner steps in section 3 are done.** The code
blockers found on 2026-11-25 are fixed in this branch; the rest is accounts and settings only the
owner can change (hosting plan, keys, invite code).

| Was | Now (this branch) | How it was checked |
|---|---|---|
| Westmark and Eryndor players sold cars in Drennia's market | Every nation has its own 8 markets and 4 rival car makers, copied from Drennia's so all start equal. A company always opens in its owner's nation. | Fresh database: three markets of equal size; one business month sold the same cars in all three; a Westmark player's company opened in Westmark even when the request said "drennia"; a licence in Drennia was refused. `tests/nationMarkets.test.ts`. |
| No tutorial, only the Guide | A **First steps** checklist on the Desk (decision, party, campaign, vote, say hello, company). Each tick comes from a real record. Top of the screen on phones, side column on desktop. | Screenshots desktop and phone; `tests/firstSteps.test.ts`. |
| Chat had no moderation | **Report** on every message; 3 different reporters hide it automatically; admins **Hide**, **Mute 24h**, and a **Reports** tab in chat; a cap of 12 messages a minute. | End-to-end with 5 players; `tests/chat.test.ts`. |
| Anyone with the link could join, and nations could overflow | **Invite-only** while `SIGNUP_ACCESS_CODE` is set (guest play off, shown locked with the reason). Hard cap of 24 (8 per nation). | Wrong/missing code refused, right code accepted (case and spaces ignored); `tests/signup.test.ts`. |
| The server slept and months turned 31–250 minutes late | Optional `KEEP_AWAKE_URL` keeps a sleeping host awake. **The real fix is a host that never sleeps (owner step 1).** | Boot log shows the ping starting. |
| Browser crashes were invisible | PostHog now records browser errors too (once its key is set). | Type-check and build. |

Also checked: backend and frontend type-checks, production build, design tokens, 340 required
tests (25 files), the new-player journey on desktop and phone with no errors, and the accessibility
audit (30 of 30 screen views clean).

**Still true (tell testers, not blockers):** the stock exchange lists Drennia's companies only;
logistics is closed; there is no tutorial beyond the checklist and the Guide.

## 2. Confidence

- **Ready once section 3 is done: Medium-high.** Evidence: moderate. Everything above was run on a
  fresh local database, not on production. The production world has months of history the local
  one does not (the seed copies Drennia's live rivals as they are on the day it runs).
- **What would change this:** any late month after the hosting fix, or a 500 error in the first
  full playthrough on the live site.

## 3. Owner checklist (only you can do these)

Do 1–6 before the go/no-go on Thu 3 Dec.

1. **Stop the server sleeping.** Recommended: move the Render backend to a paid plan that never
   sleeps. Free alternative: set `KEEP_AWAKE_URL` on Render to the backend's own public address
   (for example `https://<your-backend>.onrender.com`). Check Render's free-hours limit for your
   account first: a service awake all month uses about 730 hours.
2. **Add an outside monitor** (for example UptimeRobot, free) on `<backend>/health/ticks` every
   5 minutes with email alerts. GitHub only runs the existing tick-health check every 5–10 hours.
3. **Turn on error tracking and analytics:** `SENTRY_DSN` on Render, `NEXT_PUBLIC_POSTHOG_KEY` on
   Vercel. Without them the alpha produces no data.
4. **Security:** confirm the database password was rotated (it is in old git history), and that
   `NODE_ENV=production`, `CORS_ORIGINS` and `ADMIN_EMAILS` are set on Render.
5. **Set `SIGNUP_ACCESS_CODE`** on Render (something not guessable, 8+ characters). Share it only
   by DM. Remove it to open sign-up again later.
6. **Deploy this branch**, then check the Render log for
   `Successfully applied migration: 0114_chat_moderation.sql` and
   `Successfully applied seed: 0006_nation_car_markets.sql`. Play one full session on the live site
   (desktop and phone): sign up with the code, pick Westmark, make a decision, join a party, vote,
   start a company, post in your nation's room.
7. **Fri 4 Dec: wipe test accounts.** From `backend`: `npx tsx scripts/delete-players.ts` (practice
   run), then the same with `--confirm`. This also clears any old Westmark/Eryndor companies that
   were opened in Drennia's market before this fix. Sign up again; `ADMIN_EMAILS` makes you admin,
   which shows the chat **Reports** tab.

## 4. Schedule

Months turn at 04:52, 12:52 and 20:52 UTC (8 real hours each). Two weeks is about 42 game months:
at least one election in each nation if the founding elections are still ahead.

| When | What |
|---|---|
| Wed 25 – Thu 26 Nov | Owner steps 1–5. Post the announcement. |
| Thu 26 – Sun 29 Nov | Deploy (step 6). Watch the clock: zero late months. Full playthrough on the live site. |
| Wed 2 Dec, 15:00 UTC | Sign-ups close. Accept 24 (the hard cap); keep a short waiting list. |
| **Thu 3 Dec: go / no-go** | Go only if: (1) no late month for 72 hours; (2) Sentry and PostHog receive data; (3) the live playthrough had no blocker; (4) each nation's founding election is still ahead with filing open in week 1. Otherwise start **Sat 9 Jan** (one week later runs into Christmas). |
| Fri 4 Dec | Wipe test accounts (step 7). DM the link and invite code. |
| **Sat 5 Dec, 13:00 UTC** | Doors open. Post the launch message. Watch closely for 3 hours. |
| Week 1 (5–11 Dec) | ~30 min a day: clock, Sentry, chat Reports tab, bug reports. Bug fixes only. Deploy only in the hour after a month turns. Mid-way survey Wed 9 Dec. Recap Fri 11 Dec. |
| Week 2 (12–19 Dec) | Balance changes through constants files only. Final survey Thu 17 Dec. **Ends Sat 19 Dec, 13:00 UTC.** |
| Sun 20 Dec | Results post and what's next. |
| 21 Dec – 3 Jan | Compare with the targets; decide: another closed round, or a public season from mid-January. |

**Targets** (low confidence: no earlier data): 60%+ of accepted players create a character; 25%+
come back the next day; 10+ still active in week 2; no lost months, no lost data.

## 5. Discord posts (each under Discord's 2,000-character limit)

Create `#bug-reports` and `#alpha-help` first, or change the names. The `<t:…>` codes show each
reader the time in their own time zone.

Announcement (now):

```
# 📣 WORLDr Closed Alpha — doors open <t:1796475600:F>

I'm opening WORLDr to a small group for a **2-week test**. Three nations, real elections, coalitions, laws and a car industry. A new game month every 8 hours (3 a day).

**What you can do**
• Pick a nation (Drennia, Westmark or Eryndor) and a background
• Join or found a party, stand in a district, win seats
• Vote on bills, make deals with other players, form coalitions
• Run a car company in your nation's own market and feel the laws you pass hit your sales

**Dates**
• Sign-ups close: <t:1796223600:F>
• Doors open: <t:1796475600:F>
• Alpha ends: <t:1797685200:F>

**How to join**
React ✅ below. Before launch you'll get the link and your **invite code** by DM. 24 places (8 per nation), first come first served.

**Know before you join**
• It's an alpha: expect bugs, balance changes and the odd fix mid-week.
• **Everything is wiped at the end.** Nothing carries over.
• A **First steps** checklist on your Desk walks you in; the **Guide** button explains the rest.
• Every chat message has a **Report** button. Discord rules apply in the game too.

**What I need from you**
• Log in once a day (5–10 minutes is enough)
• Report bugs in #bug-reports: what you did, what happened, a screenshot
• Fill in two short surveys (mid-way and at the end)

See you in Parliament. 🏛️
```

Launch day (Sat 5 Dec):

```
# 🏛️ WORLDr Closed Alpha is OPEN

The link and your invite code are in your DMs. First steps:
1. Create your account (enter the invite code) and pick your nation
2. Follow the **First steps** checklist on your Desk
3. Join a party (or found one) and say hello in your nation's room

A new month turns every 8 hours — the countdown is at the top of the screen. Bugs → #bug-reports · Questions → #alpha-help
Alpha ends <t:1797685200:R>.
```
