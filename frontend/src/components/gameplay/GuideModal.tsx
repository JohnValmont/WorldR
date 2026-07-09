'use client';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Book, LineChart } from 'lucide-react';

const T = {
  bg:         '#090A0F',
  overlay:    'rgba(9,10,15,0.92)',
  panel:      '#11131A',
  border:     '#2A2630',
  amber:      '#C9A24A',
  ivory:      '#F4EBD6',
  muted:      '#A79D8C',
  faint:      '#6B6358',
};

interface GuideModalProps {
  onDismiss: () => void;
}

type TabType = 'beginner' | 'equity';

export default function GuideModal({ onDismiss }: GuideModalProps) {
  const [fadeIn, setFadeIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('beginner');

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setFadeIn(true), 40);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return null;

  const renderBeginnerGuide = () => (
    <div style={{ color: T.muted, fontSize: '13px', lineHeight: 1.6 }}>
      <h1 style={{ color: T.ivory, fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>WORLDr: True Beginner's Step-by-Step Guide</h1>
      
      <p style={{ marginBottom: '16px' }}>
        Welcome to WORLDr! If you have just created an account, follow these exact steps to incorporate a business and build your first car.
      </p>
      <p style={{ marginBottom: '24px', fontStyle: 'italic', color: T.amber }}>
        (Note: The game operates on <strong>Months</strong>. Every time the global timer rolls over, a new Month begins, your staff are paid, and your factories produce cars.)
      </p>

      <h2 style={{ color: T.ivory, fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '6px' }}>Step 1: Incorporate Your First Business</h2>
      <p style={{ marginBottom: '12px' }}>To do anything in the game, you need a company.</p>
      <ol style={{ listStyle: 'decimal', paddingLeft: '24px', marginBottom: '24px' }}>
        <li>Look at the left sidebar menu and click on the <strong style={{ color: T.ivory }}>Business Desk</strong>.</li>
        <li>Inside the Business Desk, click the big button to <strong style={{ color: T.ivory }}>Start a Business</strong>.</li>
        <li><strong>Choose your Sector:</strong> Select <strong style={{ color: T.ivory }}>Manufacturing</strong> and choose the <strong style={{ color: T.ivory }}>Automobile Manufacturing</strong> subsector.</li>
        <li><strong>Choose your Headquarters:</strong> Select your HQ state (Drennport, Westport, Ironvale, or Greenmere).</li>
        <li><strong>Choose a Legal Structure:</strong> Select <strong style={{ color: T.ivory }}>Private Company</strong> (costs $5,000 to file) or <strong style={{ color: T.ivory }}>Sole Trader</strong> ($500). (Do not choose Corporation right now; it costs $50,000 and is for advanced equity trading later).</li>
        <li>Enter a company name, commit your starting capital, and register the company.</li>
      </ol>

      <h2 style={{ color: T.ivory, fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '6px' }}>Step 2: Open the Manufacturing Desk</h2>
      <p style={{ marginBottom: '12px' }}>Once your company is registered, you need to manage it.</p>
      <ol style={{ listStyle: 'decimal', paddingLeft: '24px', marginBottom: '24px' }}>
        <li>Still inside the Business Desk, click on the <strong style={{ color: T.ivory }}>My Companies</strong> tab at the top.</li>
        <li>You will see your new manufacturing company listed. Click the <strong style={{ color: T.ivory }}>Manage</strong> button.</li>
        <li>This opens your <strong style={{ color: T.ivory }}>Manufacturing Desk</strong>, which has its own sub-navigation menu (Overview, Factory, Design, Procurement, Production, Market, Staff, Finance).</li>
      </ol>

      <h2 style={{ color: T.ivory, fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '6px' }}>Step 3: Hire Your Staff</h2>
      <p style={{ marginBottom: '12px' }}>You need employees to design and build cars.</p>
      <ol style={{ listStyle: 'decimal', paddingLeft: '24px', marginBottom: '24px' }}>
        <li>Inside your Manufacturing Desk, click on the <strong style={{ color: T.ivory }}>Staff</strong> tab.</li>
        <li>You will see various roles like Automotive Engineer, Factory Worker, Production Supervisor, etc.</li>
        <li>Type a number into the quantity box and click <strong style={{ color: T.ivory }}>+ Hire</strong>.
          <ul style={{ listStyle: 'disc', paddingLeft: '24px', marginTop: '8px' }}>
            <li><em>Recommended for now:</em> Hire a few <strong>Automotive Engineers</strong> (they make designing cars cheaper) and a bunch of <strong>Factory Workers</strong> (you need them to actually build the cars later).</li>
            <li style={{ color: '#B85555' }}><em>Warning:</em> You have to pay their wages every Month, so don't spend all your cash hiring thousands of people yet!</li>
          </ul>
        </li>
      </ol>

      <h2 style={{ color: T.ivory, fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '6px' }}>Step 4: Design Your First Car (R&D)</h2>
      <p style={{ marginBottom: '12px' }}>You cannot build cars without blueprints.</p>
      <ol style={{ listStyle: 'decimal', paddingLeft: '24px', marginBottom: '24px' }}>
        <li>Inside your Manufacturing Desk, click on the <strong style={{ color: T.ivory }}>Design</strong> tab.</li>
        <li>Start a new vehicle project. Choose a Vehicle Class and a Power Unit.</li>
        <li>Adjust the sliders for Performance, Reliability, Comfort, and Cost.</li>
        <li><strong>Wait:</strong> Research and Development takes time. Look at the timer on your new project. You must wait for the global timer to pass a few <strong>Months</strong>.</li>
        <li>Once the timer finishes, the model's status will change to <strong style={{ color: T.ivory }}>Launched</strong>.</li>
      </ol>

      <h2 style={{ color: T.ivory, fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '6px' }}>Step 5: Lease a Factory</h2>
      <p style={{ marginBottom: '12px' }}>While you wait for your R&D to finish, prepare your manufacturing base.</p>
      <ol style={{ listStyle: 'decimal', paddingLeft: '24px', marginBottom: '24px' }}>
        <li>Inside your Manufacturing Desk, click on the <strong style={{ color: T.ivory }}>Factory</strong> tab.</li>
        <li>Choose a factory size that fits your budget and click <strong style={{ color: T.ivory }}>Lease</strong>.</li>
        <li><em>Double-check your Staff tab:</em> Make sure you have enough <strong>Factory Workers</strong> hired to run this new factory! If you don't have enough workers, your factory will barely produce anything.</li>
      </ol>

      <h2 style={{ color: T.ivory, fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '6px' }}>Step 6: Procure Raw Materials</h2>
      <p style={{ marginBottom: '12px' }}>Factories cannot build cars out of thin air. You <em>must</em> buy raw materials.</p>
      <ol style={{ listStyle: 'decimal', paddingLeft: '24px', marginBottom: '24px' }}>
        <li>Inside your Manufacturing Desk, click on the <strong style={{ color: T.ivory }}>Procurement</strong> tab.</li>
        <li>You will see the 6 vital components required for automobile assembly: Engine, Transmission, Tyres, Steel, Glass, and Electronics.</li>
        <li>Type in the quantity you want to buy for each component and click <strong style={{ color: T.ivory }}>Purchase Order</strong> to submit. The components will instantly be added to your inventory.</li>
      </ol>

      <h2 style={{ color: T.ivory, fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '6px' }}>Step 7: Start The Production Line</h2>
      <p style={{ marginBottom: '12px' }}>You now have a launched model, a leased factory, workers, and raw materials. Let's build!</p>
      <ol style={{ listStyle: 'decimal', paddingLeft: '24px', marginBottom: '24px' }}>
        <li>Inside your Manufacturing Desk, click on the <strong style={{ color: T.ivory }}>Production</strong> tab.</li>
        <li>Click to <strong style={{ color: T.ivory }}>Edit</strong> your production line.</li>
        <li><strong>Assign Model:</strong> In the dropdown menu, select your Launched vehicle.</li>
        <li><strong>Set Target:</strong> Enter how many cars you want to build this Month.</li>
        <li><strong>Check the Live Estimate:</strong> The panel will tell you exactly how many components you need. If it says you are short on components, go back to the Procurement tab and buy more!</li>
        <li>Click <strong style={{ color: T.ivory }}>Save Production Plan</strong>.</li>
      </ol>

      <h2 style={{ color: T.ivory, fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '6px' }}>Step 8: Sell Your Cars</h2>
      <p style={{ marginBottom: '12px' }}>When the global timer rolls over into a new Month, your factory will consume the raw materials and place shiny new cars into your inventory.</p>
      <ol style={{ listStyle: 'decimal', paddingLeft: '24px', marginBottom: '24px' }}>
        <li>Inside your Manufacturing Desk, click on the <strong style={{ color: T.ivory }}>Market</strong> tab.</li>
        <li><strong>Set the Price:</strong> Look at your total manufacturing cost, and set a Retail Price higher than that so you can make a profit.</li>
        <li><strong>Allocate Inventory:</strong> Choose how many cars you want to ship to different geographic regions (e.g., Drennport State vs Westport State).</li>
        <li><strong>Marketing:</strong> Allocate a cash budget to advertise the car. If your Brand Awareness is zero, nobody will buy the car!</li>
        <li>Wait for the next Month to pass, and watch the sales revenue roll in!</li>
      </ol>
    </div>
  );

  const renderEquityGuide = () => (
    <div style={{ color: T.muted, fontSize: '13px', lineHeight: 1.6 }}>
      <h1 style={{ color: T.ivory, fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Share Market & Private Capital</h1>
      
      <p style={{ marginBottom: '16px' }}>
        WorldR has two parallel capital markets. Which one applies to your company depends on its <strong style={{ color: T.amber }}>legal structure</strong>.
      </p>

      <h2 style={{ color: T.ivory, fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '6px' }}>Overview — Two Tracks</h2>
      <table style={{ width: '100%', marginBottom: '16px', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left', color: T.amber }}>
            <th style={{ padding: '8px' }}>Track</th>
            <th style={{ padding: '8px' }}>Who can use it</th>
            <th style={{ padding: '8px' }}>Where</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
            <td style={{ padding: '8px' }}><strong style={{ color: T.ivory }}>Westport Bourse</strong> (public exchange)</td>
            <td style={{ padding: '8px' }}>Public Corporations only</td>
            <td style={{ padding: '8px' }}>Market → Westport Bourse</td>
          </tr>
          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
            <td style={{ padding: '8px' }}><strong style={{ color: T.ivory }}>Private Capital Market</strong></td>
            <td style={{ padding: '8px' }}>Any company except Sole Trader</td>
            <td style={{ padding: '8px' }}>Market → Private Capital Market</td>
          </tr>
        </tbody>
      </table>
      <p style={{ marginBottom: '24px' }}>Both markets are real-time and player-driven. No NPC market-makers — prices and rates are set entirely by players.</p>

      <h2 style={{ color: T.ivory, fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '6px' }}>Legal Structures and Equity</h2>
      <p style={{ marginBottom: '12px' }}>Before you can sell equity, your company must be incorporated.</p>
      <table style={{ width: '100%', marginBottom: '16px', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left', color: T.amber }}>
            <th style={{ padding: '8px' }}>Structure</th>
            <th style={{ padding: '8px' }}>Can sell equity?</th>
            <th style={{ padding: '8px' }}>Shareholder cap</th>
            <th style={{ padding: '8px' }}>Min. company value</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
            <td style={{ padding: '8px' }}>Sole Trader</td>
            <td style={{ padding: '8px' }}>No</td>
            <td style={{ padding: '8px' }}>—</td>
            <td style={{ padding: '8px' }}>—</td>
          </tr>
          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
            <td style={{ padding: '8px' }}>Private Company</td>
            <td style={{ padding: '8px' }}>Yes</td>
            <td style={{ padding: '8px' }}>10 shareholders</td>
            <td style={{ padding: '8px' }}>§10,000</td>
          </tr>
          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
            <td style={{ padding: '8px' }}>Public Corporation</td>
            <td style={{ padding: '8px' }}>Yes</td>
            <td style={{ padding: '8px' }}>Unlimited</td>
            <td style={{ padding: '8px' }}>§250,000</td>
          </tr>
        </tbody>
      </table>
      <p style={{ marginBottom: '12px' }}>Convert your company's legal structure from the <strong style={{ color: T.ivory }}>Business → Equity Desk</strong> tab. Conversion is permanent and cannot be reversed.</p>
      <p style={{ marginBottom: '24px' }}>When you convert to Private Company or Public Corporation, the founder receives <strong style={{ color: T.ivory }}>1,000,000 shares</strong> representing 100% ownership.</p>

      <h2 style={{ color: T.ivory, fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '6px' }}>Track 1 — Private Capital Market (Private Placements)</h2>
      <h3 style={{ color: T.ivory, fontSize: '14px', marginTop: '16px', marginBottom: '8px' }}>What is a private placement?</h3>
      <p style={{ marginBottom: '8px' }}>A placement is a fixed-price offer to sell a block of your shares to another player. It can be:</p>
      <ul style={{ listStyle: 'disc', paddingLeft: '24px', marginBottom: '16px' }}>
        <li><strong style={{ color: T.ivory }}>Open</strong> — visible to all players (anyone can accept it)</li>
        <li><strong style={{ color: T.ivory }}>Targeted</strong> — reserved for a specific character (enter their Character UUID)</li>
      </ul>

      <h3 style={{ color: T.ivory, fontSize: '14px', marginTop: '16px', marginBottom: '8px' }}>How to post a placement</h3>
      <ol style={{ listStyle: 'decimal', paddingLeft: '24px', marginBottom: '12px' }}>
        <li>Go to <strong style={{ color: T.ivory }}>Market → Private Capital Market → Private Placements</strong></li>
        <li>Click <strong style={{ color: T.ivory }}>+ New Offering</strong></li>
        <li>Select the company, enter the share count and price per share</li>
        <li>Optionally enter a target character UUID to make it a private deal</li>
        <li>Click <strong style={{ color: T.ivory }}>Post Placement</strong></li>
      </ol>
      <p style={{ marginBottom: '24px' }}>When you post, the shares are <strong style={{ color: T.amber }}>escrowed immediately</strong> — they are removed from your cap-table until the placement is accepted or cancelled.</p>

      <h3 style={{ color: T.ivory, fontSize: '14px', marginTop: '16px', marginBottom: '8px' }}>How to accept a placement</h3>
      <p style={{ marginBottom: '24px' }}>Open placements from other players appear in the <strong style={{ color: T.ivory }}>Open Placements — Market</strong> section. Click <strong style={{ color: T.ivory }}>Accept</strong> to purchase. The full amount (shares × price) is deducted from your cash and transferred to the seller instantly.</p>
      
      <h3 style={{ color: T.ivory, fontSize: '14px', marginTop: '16px', marginBottom: '8px' }}>Shareholder cap</h3>
      <p style={{ marginBottom: '12px' }}>Private Companies enforce a <strong style={{ color: T.amber }}>10-shareholder cap</strong>. If the company already has 10 distinct shareholders, no new buyer can accept a placement. Existing shareholders can always buy more from each other.</p>
      <p style={{ marginBottom: '24px' }}>Public Corporations have no cap — use the Bourse instead of placements once listed.</p>

      <h3 style={{ color: T.ivory, fontSize: '14px', marginTop: '16px', marginBottom: '8px' }}>Cancelling a placement</h3>
      <p style={{ marginBottom: '24px' }}>You can cancel any of your open placements. The escrowed shares are returned to your cap-table immediately.</p>

      <h2 style={{ color: T.ivory, fontSize: '16px', fontWeight: 600, marginTop: '32px', marginBottom: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '6px' }}>Track 2 — Westport Bourse (Public Exchange)</h2>
      
      <h3 style={{ color: T.ivory, fontSize: '14px', marginTop: '16px', marginBottom: '8px' }}>Requirements</h3>
      <ul style={{ listStyle: 'disc', paddingLeft: '24px', marginBottom: '16px' }}>
        <li>Your company must be a <strong style={{ color: T.ivory }}>Public Corporation</strong> (§250,000 minimum company value, converted in Business → Equity Desk)</li>
        <li>You must hold shares (1,000,000 founder shares granted on conversion)</li>
      </ul>

      <h3 style={{ color: T.ivory, fontSize: '14px', marginTop: '16px', marginBottom: '8px' }}>Step 1 — Launch your IPO</h3>
      <p style={{ marginBottom: '12px' }}>After converting to a Public Corporation your company appears on the Westport Bourse listing, but shows <strong style={{ color: T.amber }}>"unpriced"</strong> because no shares have ever traded. To get shares trading:</p>
      <ol style={{ listStyle: 'decimal', paddingLeft: '24px', marginBottom: '12px' }}>
        <li>Go to <strong style={{ color: T.ivory }}>Market → Westport Bourse</strong></li>
        <li>Select your company from the listings on the left</li>
        <li>The <strong style={{ color: T.ivory }}>IPO Launch</strong> panel appears in the right column (only visible to the company owner when no trades exist)</li>
        <li>Enter your <strong style={{ color: T.ivory }}>IPO price per share</strong> and the <strong style={{ color: T.ivory }}>number of shares you want to offer</strong></li>
        <li>Click <strong style={{ color: T.ivory }}>Launch IPO</strong></li>
      </ol>
      <p style={{ marginBottom: '12px' }}>This posts a limit sell order at your chosen price. If buyers are already in the book, shares fill immediately. Otherwise, the order rests on the book waiting for buyers.</p>
      <p style={{ marginBottom: '24px' }}>You can post as many sell orders as you like — the IPO panel is only the first-time convenience helper.</p>

      <h3 style={{ color: T.ivory, fontSize: '14px', marginTop: '16px', marginBottom: '8px' }}>Step 2 — Ongoing trading</h3>
      <p style={{ marginBottom: '12px' }}>Once your IPO is live, any player can place buy or sell limit orders using the <strong style={{ color: T.ivory }}>Place Order</strong> ticket in the right column.</p>
      <p style={{ marginBottom: '12px' }}><strong style={{ color: T.ivory }}>Buy order</strong> — you specify the maximum price you will pay per share and the quantity. Cash equal to <code>price × quantity</code> is escrowed immediately. If the order fills below your limit price, the surplus escrow is refunded.</p>
      <p style={{ marginBottom: '24px' }}><strong style={{ color: T.ivory }}>Sell order</strong> — you specify the minimum price you will accept and the quantity. That number of shares is escrowed immediately. If the order is cancelled, shares are returned.</p>

      <h3 style={{ color: T.ivory, fontSize: '14px', marginTop: '16px', marginBottom: '8px' }}>Order matching</h3>
      <p style={{ marginBottom: '12px' }}>The Bourse uses <strong style={{ color: T.amber }}>continuous price-time priority</strong>:</p>
      <ul style={{ listStyle: 'disc', paddingLeft: '24px', marginBottom: '16px' }}>
        <li>Incoming buy orders cross against the lowest-priced open sell orders, provided the sell price is at or below the buy limit</li>
        <li>Incoming sell orders cross against the highest-priced open buy orders, provided the buy price is at or above the sell limit</li>
        <li>Trades execute at the <strong style={{ color: T.ivory }}>resting (maker) order's price</strong></li>
        <li>Partial fills are supported — the unfilled remainder stays on the book as an open order</li>
      </ul>
      <p style={{ marginBottom: '24px' }}>You cannot trade with yourself (self-trade prevention is enforced).</p>

      <h3 style={{ color: T.ivory, fontSize: '14px', marginTop: '16px', marginBottom: '8px' }}>Order book, Chart, and Market Cap</h3>
      <p style={{ marginBottom: '12px' }}>The <strong style={{ color: T.ivory }}>order book</strong> shows current bids (buy orders, highest first) and asks (sell orders, lowest first) aggregated by price level. The spread between the best bid and best ask is visible at the top of the page.</p>
      <p style={{ marginBottom: '12px' }}>The <strong style={{ color: T.ivory }}>Price History</strong> chart shows monthly OHLC-style data: average, low, and high prices for each game month in which trades occurred.</p>
      <p style={{ marginBottom: '24px' }}><strong style={{ color: T.ivory }}>Market cap</strong> is displayed as <code>last trade price × 1,000,000 shares</code>. This is an indicative figure — the market cap is whatever the last buyer and seller agreed the price was.</p>

      <h2 style={{ color: T.ivory, fontSize: '16px', fontWeight: 600, marginTop: '32px', marginBottom: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '6px' }}>Dividends</h2>
      <p style={{ marginBottom: '12px' }}>Dividends apply to both Private Companies and Public Corporations.</p>
      <ul style={{ listStyle: 'disc', paddingLeft: '24px', marginBottom: '16px' }}>
        <li>Set a <strong style={{ color: T.ivory }}>payout percentage</strong> (0–100%) in <strong style={{ color: T.ivory }}>Business → Equity Desk → Dividend Policy</strong></li>
        <li>At each arc close, the world tick distributes <code>company_profit × payout_percent</code> to shareholders in proportion to their holdings</li>
        <li>You receive your dividend directly into your <code>cash_in_hand</code></li>
      </ul>
      <p style={{ marginBottom: '24px' }}>Setting a high dividend payout makes your shares more attractive to income investors. Setting it low retains more cash in the company for reinvestment.</p>

      <h2 style={{ color: T.ivory, fontSize: '16px', fontWeight: 600, marginTop: '32px', marginBottom: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '6px' }}>Player-to-Player Loans</h2>
      <p style={{ marginBottom: '16px' }}>Loans are available on the <strong style={{ color: T.ivory }}>Market → Private Capital Market → P2P Loans</strong> tab.</p>
      
      <h3 style={{ color: T.ivory, fontSize: '14px', marginTop: '16px', marginBottom: '8px' }}>How to post a loan offer (lender)</h3>
      <ol style={{ listStyle: 'decimal', paddingLeft: '24px', marginBottom: '24px' }}>
        <li>Click <strong style={{ color: T.ivory }}>+ Offer Capital</strong></li>
        <li>Enter:
          <ul style={{ listStyle: 'circle', paddingLeft: '24px', marginTop: '4px' }}>
            <li><strong style={{ color: T.ivory }}>Max amount</strong> — the maximum you will lend (your cash must cover this at the time of posting)</li>
            <li><strong style={{ color: T.ivory }}>Monthly interest rate</strong> (0–25% per month)</li>
            <li><strong style={{ color: T.ivory }}>Term</strong> (1–60 game months)</li>
            <li><strong style={{ color: T.ivory }}>Purpose</strong> (optional, displayed to borrowers)</li>
          </ul>
        </li>
        <li style={{ marginTop: '4px' }}>Click <strong style={{ color: T.ivory }}>Post Loan Offer</strong></li>
      </ol>
      
      <h3 style={{ color: T.ivory, fontSize: '14px', marginTop: '16px', marginBottom: '8px' }}>How to borrow</h3>
      <ol style={{ listStyle: 'decimal', paddingLeft: '24px', marginBottom: '24px' }}>
        <li>Browse <strong style={{ color: T.ivory }}>Open Loan Offers — Market</strong></li>
        <li>Click <strong style={{ color: T.ivory }}>Borrow</strong> on the offer you want</li>
        <li>Enter the amount you wish to borrow (up to the max amount)</li>
        <li>Click <strong style={{ color: T.ivory }}>Confirm</strong> — principal transfers from the lender to you immediately</li>
      </ol>

      <h3 style={{ color: T.ivory, fontSize: '14px', marginTop: '16px', marginBottom: '8px' }}>Repayments & Default</h3>
      <p style={{ marginBottom: '12px' }}>Monthly repayments are collected <strong style={{ color: T.amber }}>automatically</strong> by the world tick each game month. The monthly payment is the amortized amount calculated at offer time.</p>
      <p style={{ marginBottom: '12px' }}>If your cash is insufficient when a payment is due, you receive a <strong style={{ color: T.ivory }}>missed payment</strong>. Two consecutive missed payments put the loan into <strong style={{ color: T.amber }}>defaulted</strong> status — you cannot take new loans until the default is resolved.</p>
      <p style={{ marginBottom: '12px' }}>You can repay the full remaining balance at any time from <strong style={{ color: T.ivory }}>My Borrowed Loans</strong>. Early payoff = <code>monthly_payment × months_remaining</code> (no discount, full remaining balance).</p>
      <p style={{ marginBottom: '24px' }}>You can cancel an open offer before it is accepted. Once accepted, the loan cannot be cancelled — only repaid.</p>
    </div>
  );

  const modalContent = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: T.overlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          width: '100%',
          maxWidth: 800,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: `0 0 60px rgba(201,162,74,0.08), 0 24px 80px rgba(0,0,0,0.7)`,
        }}
      >
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.25em', color: T.faint }}>
            WORLDr Guide Library
          </div>
          <button
            onClick={onDismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.faint, display: 'flex', alignItems: 'center' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${T.border}`,
          background: T.panel
        }}>
          <button
            onClick={() => setActiveTab('beginner')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'beginner' ? `2px solid ${T.amber}` : '2px solid transparent',
              color: activeTab === 'beginner' ? T.amber : T.faint,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: 'monospace',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Book size={14} />
            Beginner's Guide
          </button>
          <button
            onClick={() => setActiveTab('equity')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'equity' ? `2px solid ${T.amber}` : '2px solid transparent',
              color: activeTab === 'equity' ? T.amber : T.faint,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: 'monospace',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <LineChart size={14} />
            Equity & Markets
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1, background: T.bg }}>
          {activeTab === 'beginner' ? renderBeginnerGuide() : renderEquityGuide()}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
