# Guide: Share Market & Private Capital

WorldR has two parallel capital markets. Which one applies to your company depends on its **legal structure**.

---

## Overview — Two Tracks

| Track | Who can use it | Where |
|---|---|---|
| **Westport Bourse** (public exchange) | Public Corporations only | Market → Westport Bourse |
| **Private Capital Market** | Any company structure except Sole Trader | Market → Private Capital Market |

Both markets are real-time and player-driven. No NPC market-makers — prices and rates are set entirely by players.

---

## Legal Structures and Equity

Before you can sell equity, your company must be incorporated.

| Structure | Can sell equity? | Shareholder cap | Minimum company value to convert |
|---|---|---|---|
| Sole Trader | No | — | — |
| Private Company | Yes | 10 shareholders | §10,000 |
| Public Corporation | Yes | Unlimited | §250,000 |

Convert your company's legal structure from the **Business → Equity Desk** tab. Conversion is permanent and cannot be reversed.

When you convert to Private Company or Public Corporation, the founder receives **1,000,000 shares** representing 100% ownership.

---

## Track 1 — Private Capital Market (Private Placements)

### What is a private placement?

A placement is a fixed-price offer to sell a block of your shares to another player. It can be:
- **Open** — visible to all players (anyone can accept it)
- **Targeted** — reserved for a specific character (enter their Character UUID)

### How to post a placement

1. Go to **Market → Private Capital Market → Private Placements**
2. Click **+ New Offering**
3. Select the company, enter the share count and price per share
4. Optionally enter a target character UUID to make it a private deal
5. Click **Post Placement**

When you post, the shares are **escrowed immediately** — they are removed from your cap-table until the placement is accepted or cancelled.

### How to accept a placement

Open placements from other players appear in the **Open Placements — Market** section. Click **Accept** to purchase. The full amount (shares × price) is deducted from your cash and transferred to the seller instantly.

### Shareholder cap

Private Companies enforce a **10-shareholder cap**. If the company already has 10 distinct shareholders, no new buyer can accept a placement. Existing shareholders can always buy more from each other.

Public Corporations have no cap — use the Bourse instead of placements once listed.

### Cancelling a placement

You can cancel any of your open placements. The escrowed shares are returned to your cap-table immediately.

---

## Track 2 — Westport Bourse (Public Exchange)

### Requirements

- Your company must be a **Public Corporation** (§250,000 minimum company value, converted in Business → Equity Desk)
- You must hold shares (1,000,000 founder shares granted on conversion)

### Step 1 — Launch your IPO

After converting to a Public Corporation your company appears on the Westport Bourse listing, but shows **"unpriced"** because no shares have ever traded.

To get shares trading:
1. Go to **Market → Westport Bourse**
2. Select your company from the listings on the left
3. The **IPO Launch** panel appears in the right column (only visible to the company owner when no trades exist)
4. Enter your **IPO price per share** and the **number of shares you want to offer**
5. Click **Launch IPO**

This posts a limit sell order at your chosen price. If buyers are already in the book, shares fill immediately. Otherwise, the order rests on the book waiting for buyers.

You can post as many sell orders as you like — the IPO panel is only the first-time convenience helper.

### Step 2 — Ongoing trading

Once your IPO is live, any player can place buy or sell limit orders using the **Place Order** ticket in the right column.

**Buy order** — you specify the maximum price you will pay per share and the quantity. Cash equal to `price × quantity` is escrowed immediately. If the order fills below your limit price, the surplus escrow is refunded.

**Sell order** — you specify the minimum price you will accept and the quantity. That number of shares is escrowed immediately. If the order is cancelled, shares are returned.

### Order matching

The Bourse uses **continuous price-time priority**:
- Incoming buy orders cross against the lowest-priced open sell orders, provided the sell price is at or below the buy limit
- Incoming sell orders cross against the highest-priced open buy orders, provided the buy price is at or above the sell limit
- Trades execute at the **resting (maker) order's price**
- Partial fills are supported — the unfilled remainder stays on the book as an open order

You cannot trade with yourself (self-trade prevention is enforced).

### Order book

The order book shows current **bids** (buy orders, highest first) and **asks** (sell orders, lowest first) aggregated by price level. The spread between the best bid and best ask is visible at the top of the page.

### Cancelling orders

Open orders appear in **My Open Orders**. Click **Cancel** to withdraw an order. Escrowed cash (buy) or shares (sell) are returned immediately.

### Price chart

The **Price History** chart shows monthly OHLC-style data: average, low, and high prices for each game month in which trades occurred.

### Market cap

Displayed as `last trade price × 1,000,000 shares`. This is an indicative figure — the market cap is whatever the last buyer and seller agreed the price was.

---

## Dividends

Dividends apply to both Private Companies and Public Corporations.

- Set a **payout percentage** (0–100%) in **Business → Equity Desk → Dividend Policy**
- At each arc close, the world tick distributes `company_profit × payout_percent` to shareholders in proportion to their holdings
- You receive your dividend directly into your `cash_in_hand`

Setting a high dividend payout makes your shares more attractive to income investors. Setting it low retains more cash in the company for reinvestment.

---

## Player-to-Player Loans

Loans are available on the **Market → Private Capital Market → P2P Loans** tab.

### How to post a loan offer (lender)

1. Click **+ Offer Capital**
2. Enter:
   - **Max amount** — the maximum you will lend (your cash must cover this at the time of posting)
   - **Monthly interest rate** (0–25% per month)
   - **Term** (1–60 game months)
   - **Purpose** (optional, displayed to borrowers)
3. Click **Post Loan Offer**

The offer is visible to all players (open) unless you targeted a specific character.

### How to borrow

1. Browse **Open Loan Offers — Market**
2. Click **Borrow** on the offer you want
3. Enter the amount you wish to borrow (up to the max amount)
4. Click **Confirm** — principal transfers from the lender to you immediately

### Repayments

Monthly repayments are collected **automatically** by the world tick each game month. The monthly payment is the amortized amount calculated at offer time.

If your cash is insufficient when a payment is due, you receive a **missed payment**. Two consecutive missed payments put the loan into **defaulted** status — you cannot take new loans until the default is resolved.

### Early repayment

You can repay the full remaining balance at any time from **My Borrowed Loans**. Early payoff = `monthly_payment × months_remaining` (no discount, full remaining balance).

### Cancelling a loan offer

You can cancel an open offer before it is accepted. Once accepted, the loan cannot be cancelled — only repaid.

---

## Portfolio and Holdings

Your share holdings across all companies are visible on the **Westport Bourse** page under **My Holdings**, and on the Private Capital Market page under your posted placements.

For each holding you can see:
- Number of shares held
- Average cost basis (weighted average of all your purchases)
- Last traded price (public companies) and implied P&L vs. your basis
- Percentage ownership

---

## Tips and Strategies

**As a founder (Public Corporation)**
- Don't offer all 1,000,000 shares in your IPO. Retain a controlling stake (>50%) to keep voting power and dividend rights.
- Set your IPO price based on your company's book value. `company_value / 1,000,000` gives you book value per share as a floor reference.
- A thin float (few shares offered) can make early price movements larger. A thick float gives buyers more liquidity.

**As an investor (Bourse)**
- Use the bid-ask spread to gauge liquidity. A wide spread means few active market makers.
- Limit orders at the current ask price will likely fill immediately. Orders below the ask rest on the book and may not fill.
- Check the price history chart before deciding your limit price.

**As a private equity investor**
- Private placements have no price discovery mechanism — the price is fixed by the seller. Negotiate off-platform before accepting.
- Check the company's structure and shareholder count before accepting. If the company is near the 10-shareholder cap and you are not already a holder, you may be blocked.

**As a lender**
- You do not need to escrow capital to post a loan offer, but the lender's cash must be available at the time of acceptance.
- High monthly rates attract fewer borrowers but provide better returns if accepted.
- Track your lent loans in the **Capital I Have Lent** panel to monitor repayment status.

**As a borrower**
- Borrow only what you can service. Missing two payments freezes your access to new loans.
- Early repayment has no discount — factor this in when comparing loan offers by total cost.

---

## Navigation Summary

| Destination | Path |
|---|---|
| Market overview + sector data | Drennia → Market |
| Public share exchange (IPO + trading) | Market → Westport Bourse |
| Private placements | Market → Private Capital Market → Private Placements |
| P2P loans | Market → Private Capital Market → P2P Loans |
| Company equity desk (convert structure, set dividends, view cap-table) | Drennia → Business → Equity Desk tab |
