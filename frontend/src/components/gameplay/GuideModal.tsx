'use client';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Book, LineChart, ChevronRight } from 'lucide-react';

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
    <div style={{ color: T.muted, fontSize: '14px', lineHeight: 1.7, maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <Book size={24} color={T.amber} />
        <h1 style={{ color: T.ivory, fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>True Beginner's Guide</h1>
      </div>
      <p style={{ fontSize: '15px', color: T.faint, marginBottom: '32px' }}>Step-by-step instructions to incorporate your business and manufacture your first automobile.</p>
      
      <div style={{ background: 'rgba(201,162,74,0.05)', border: `1px solid rgba(201,162,74,0.2)`, borderRadius: '8px', padding: '16px', marginBottom: '32px' }}>
        <strong style={{ color: T.amber }}>Game Time (Months):</strong> Every time the global timer rolls over, a new Month begins. Your staff are paid, factories produce cars, and market demand is calculated.
      </div>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: T.ivory, fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: T.bg, background: T.amber, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>1</span>
          Incorporate Your First Business
        </h2>
        <p style={{ marginBottom: '16px' }}>To do anything in the game, you need a company.</p>
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px' }}>
          <ol style={{ listStyle: 'decimal', paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li>Look at the left sidebar menu and click on the <strong style={{ color: T.ivory }}>Business Desk</strong>.</li>
            <li>Inside the Business Desk, click the big button to <strong style={{ color: T.ivory }}>Start a Business</strong>.</li>
            <li><strong>Sector:</strong> Select <strong style={{ color: T.ivory }}>Manufacturing</strong> and choose the <strong style={{ color: T.ivory }}>Automobile Manufacturing</strong> subsector.</li>
            <li><strong>Headquarters:</strong> Select your HQ state (Drennport, Westport, Ironvale, or Greenmere).</li>
            <li><strong>Legal Structure:</strong> Select <strong style={{ color: T.ivory }}>Private Company</strong> (costs $5,000 to file) or <strong style={{ color: T.ivory }}>Sole Trader</strong> ($500). <br/><span style={{ color: '#B85555', fontSize: '13px' }}>Note: Do not choose Corporation right now; it costs $50,000 and is intended for advanced equity trading later.</span></li>
            <li>Enter a company name, commit your starting capital, and register the company.</li>
          </ol>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: T.ivory, fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: T.bg, background: T.amber, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>2</span>
          Open the Manufacturing Desk
        </h2>
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px' }}>
          <ol style={{ listStyle: 'decimal', paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li>Still inside the Business Desk, click on the <strong style={{ color: T.ivory }}>My Companies</strong> tab at the top.</li>
            <li>You will see your new manufacturing company listed. Click the <strong style={{ color: T.ivory }}>Manage</strong> button.</li>
            <li>This opens your <strong style={{ color: T.ivory }}>Manufacturing Desk</strong>, which has its own sub-navigation menu (Overview, Factory, Design, Procurement, Production, Market, Staff, Finance).</li>
          </ol>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: T.ivory, fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: T.bg, background: T.amber, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>3</span>
          Hire Your Staff
        </h2>
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px' }}>
          <ol style={{ listStyle: 'decimal', paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li>Inside your Manufacturing Desk, click on the <strong style={{ color: T.ivory }}>Staff</strong> tab.</li>
            <li>Type a number into the quantity box and click <strong style={{ color: T.ivory }}>+ Hire</strong>.
              <ul style={{ listStyle: 'disc', paddingLeft: '24px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li><em>Recommended for now:</em> Hire a few <strong>Automotive Engineers</strong> (they make designing cars cheaper) and a bunch of <strong>Factory Workers</strong> (you need them to actually build the cars later).</li>
                <li style={{ color: '#B85555' }}><em>Warning:</em> You have to pay their wages every Month, so don't spend all your cash hiring thousands of people yet!</li>
              </ul>
            </li>
          </ol>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: T.ivory, fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: T.bg, background: T.amber, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>4</span>
          Design Your First Car (R&D)
        </h2>
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px' }}>
          <ol style={{ listStyle: 'decimal', paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li>Inside your Manufacturing Desk, click on the <strong style={{ color: T.ivory }}>Design</strong> tab.</li>
            <li>Start a new vehicle project. Choose a Vehicle Class and a Power Unit.</li>
            <li>Adjust the sliders for Performance, Reliability, Comfort, and Cost.</li>
            <li><strong>Wait:</strong> Research and Development takes time. Look at the timer on your new project. You must wait for the global timer to pass a few <strong>Months</strong>.</li>
            <li>Once the timer finishes, the model's status will change to <strong style={{ color: T.amber }}>Launched</strong>.</li>
          </ol>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: T.ivory, fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: T.bg, background: T.amber, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>5</span>
          Lease a Factory
        </h2>
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px' }}>
          <ol style={{ listStyle: 'decimal', paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li>Inside your Manufacturing Desk, click on the <strong style={{ color: T.ivory }}>Factory</strong> tab.</li>
            <li>Choose a factory size that fits your budget and click <strong style={{ color: T.ivory }}>Lease</strong>.</li>
            <li><em>Double-check your Staff tab:</em> Make sure you have enough <strong>Factory Workers</strong> hired to run this new factory! If you don't have enough workers, your factory will barely produce anything.</li>
          </ol>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: T.ivory, fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: T.bg, background: T.amber, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>6</span>
          Procure Raw Materials
        </h2>
        <p style={{ marginBottom: '16px' }}>Factories cannot build cars out of thin air. You <em>must</em> buy raw materials.</p>
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px' }}>
          <ol style={{ listStyle: 'decimal', paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li>Inside your Manufacturing Desk, click on the <strong style={{ color: T.ivory }}>Procurement</strong> tab.</li>
            <li>You will see the 6 vital components required for automobile assembly: Engine, Transmission, Tyres, Steel, Glass, and Electronics.</li>
            <li>Type in the quantity you want to buy for each component and click <strong style={{ color: T.ivory }}>Purchase Order</strong> to submit. The components will instantly be added to your inventory.</li>
          </ol>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: T.ivory, fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: T.bg, background: T.amber, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>7</span>
          Start The Production Line
        </h2>
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px' }}>
          <ol style={{ listStyle: 'decimal', paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li>Inside your Manufacturing Desk, click on the <strong style={{ color: T.ivory }}>Production</strong> tab.</li>
            <li>Click to <strong style={{ color: T.ivory }}>Edit</strong> your production line.</li>
            <li><strong>Assign Model:</strong> In the dropdown menu, select your Launched vehicle.</li>
            <li><strong>Set Target:</strong> Enter how many cars you want to build this Month.</li>
            <li><strong>Check the Live Estimate:</strong> The panel will tell you exactly how many components you need. If it says you are short on components, go back to the Procurement tab and buy more!</li>
            <li>Click <strong style={{ color: T.amber }}>Save Production Plan</strong>.</li>
          </ol>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: T.ivory, fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: T.bg, background: T.amber, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>8</span>
          Sell Your Cars
        </h2>
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px' }}>
          <ol style={{ listStyle: 'decimal', paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li>Inside your Manufacturing Desk, click on the <strong style={{ color: T.ivory }}>Market</strong> tab.</li>
            <li><strong>Set the Price:</strong> Look at your total manufacturing cost, and set a Retail Price higher than that so you can make a profit.</li>
            <li><strong>Allocate Inventory:</strong> Choose how many cars you want to ship to different geographic regions (e.g., Drennport State vs Westport State).</li>
            <li><strong>Marketing:</strong> Allocate a cash budget to advertise the car. If your Brand Awareness is zero, nobody will buy the car!</li>
            <li>Wait for the next Month to pass, and watch the sales revenue roll in!</li>
          </ol>
        </div>
      </section>
    </div>
  );

  const renderEquityGuide = () => (
    <div style={{ color: T.muted, fontSize: '14px', lineHeight: 1.7, maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <LineChart size={24} color={T.amber} />
        <h1 style={{ color: T.ivory, fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Share Market & Private Capital</h1>
      </div>
      <p style={{ fontSize: '15px', color: T.faint, marginBottom: '32px' }}>A comprehensive guide to issuing equity, navigating public markets, and player-to-player loans.</p>
      
      <p style={{ marginBottom: '24px' }}>
        WorldR has two parallel capital markets. Which one applies to your company depends on its <strong style={{ color: T.amber }}>legal structure</strong>.
      </p>

      <h2 style={{ color: T.ivory, fontSize: '18px', fontWeight: 700, marginTop: '32px', marginBottom: '16px' }}>Overview — Two Tracks</h2>
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '16px', color: T.amber, fontWeight: 600 }}>Track</th>
              <th style={{ padding: '16px', color: T.amber, fontWeight: 600 }}>Who can use it</th>
              <th style={{ padding: '16px', color: T.amber, fontWeight: 600 }}>Where</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <td style={{ padding: '16px' }}><strong style={{ color: T.ivory }}>Westport Bourse</strong></td>
              <td style={{ padding: '16px' }}>Public Corporations only</td>
              <td style={{ padding: '16px' }}>Market → Westport Bourse</td>
            </tr>
            <tr>
              <td style={{ padding: '16px' }}><strong style={{ color: T.ivory }}>Private Capital Market</strong></td>
              <td style={{ padding: '16px' }}>Any company except Sole Trader</td>
              <td style={{ padding: '16px' }}>Market → Private Capital Market</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ marginBottom: '32px' }}>Both markets are real-time and player-driven. No NPC market-makers — prices and rates are set entirely by players.</p>

      <h2 style={{ color: T.ivory, fontSize: '18px', fontWeight: 700, marginTop: '32px', marginBottom: '16px' }}>Legal Structures and Equity</h2>
      <p style={{ marginBottom: '16px' }}>Before you can sell equity, your company must be incorporated.</p>
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '16px', color: T.amber, fontWeight: 600 }}>Structure</th>
              <th style={{ padding: '16px', color: T.amber, fontWeight: 600 }}>Sell Equity?</th>
              <th style={{ padding: '16px', color: T.amber, fontWeight: 600 }}>Cap</th>
              <th style={{ padding: '16px', color: T.amber, fontWeight: 600 }}>Min. Value</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <td style={{ padding: '16px' }}>Sole Trader</td>
              <td style={{ padding: '16px' }}>No</td>
              <td style={{ padding: '16px' }}>—</td>
              <td style={{ padding: '16px' }}>—</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <td style={{ padding: '16px' }}>Private Company</td>
              <td style={{ padding: '16px' }}>Yes</td>
              <td style={{ padding: '16px' }}>10 holders</td>
              <td style={{ padding: '16px' }}>$10,000</td>
            </tr>
            <tr>
              <td style={{ padding: '16px' }}>Public Corporation</td>
              <td style={{ padding: '16px' }}>Yes</td>
              <td style={{ padding: '16px' }}>Unlimited</td>
              <td style={{ padding: '16px' }}>$250,000</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ marginBottom: '12px' }}>Convert your company's legal structure from the <strong style={{ color: T.ivory }}>Business → Equity Desk</strong> tab. Conversion is permanent and cannot be reversed.</p>
      <p style={{ marginBottom: '32px' }}>When you convert to Private Company or Public Corporation, the founder receives <strong style={{ color: T.ivory }}>1,000,000 shares</strong> representing 100% ownership.</p>

      {/* Track 1 */}
      <h2 style={{ color: T.ivory, fontSize: '18px', fontWeight: 700, marginTop: '32px', marginBottom: '16px' }}>Track 1 — Private Capital Market</h2>
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ color: T.ivory, fontSize: '15px', marginTop: '0', marginBottom: '12px' }}>What is a private placement?</h3>
        <p style={{ marginBottom: '16px' }}>A placement is a fixed-price offer to sell a block of your shares to another player. It can be:</p>
        <ul style={{ listStyle: 'disc', paddingLeft: '24px', marginBottom: '24px' }}>
          <li><strong style={{ color: T.ivory }}>Open</strong> — visible to all players</li>
          <li><strong style={{ color: T.ivory }}>Targeted</strong> — reserved for a specific character (enter their UUID)</li>
        </ul>

        <h3 style={{ color: T.ivory, fontSize: '15px', marginBottom: '12px' }}>Shareholder cap</h3>
        <p style={{ marginBottom: '0' }}>Private Companies enforce a <strong style={{ color: T.amber }}>10-shareholder cap</strong>. If the company already has 10 distinct shareholders, no new buyer can accept a placement.</p>
      </div>

      {/* Track 2 */}
      <h2 style={{ color: T.ivory, fontSize: '18px', fontWeight: 700, marginTop: '32px', marginBottom: '16px' }}>Track 2 — Westport Bourse (Public Exchange)</h2>
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ color: T.ivory, fontSize: '15px', marginTop: '0', marginBottom: '12px' }}>Step 1 — Launch your IPO</h3>
        <ol style={{ listStyle: 'decimal', paddingLeft: '20px', marginBottom: '24px' }}>
          <li>Go to <strong style={{ color: T.ivory }}>Market → Westport Bourse</strong></li>
          <li>Select your company from the listings on the left</li>
          <li>Enter your <strong style={{ color: T.ivory }}>IPO price per share</strong> and the <strong style={{ color: T.ivory }}>number of shares you want to offer</strong></li>
          <li>Click <strong style={{ color: T.amber }}>Launch IPO</strong></li>
        </ol>

        <h3 style={{ color: T.ivory, fontSize: '15px', marginBottom: '12px' }}>Step 2 — Ongoing Trading</h3>
        <p style={{ marginBottom: '12px' }}><strong style={{ color: T.ivory }}>Buy order:</strong> specify max price per share. Cash is escrowed immediately.</p>
        <p style={{ marginBottom: '0' }}><strong style={{ color: T.ivory }}>Sell order:</strong> specify min price per share. Shares are escrowed immediately.</p>
      </div>

      {/* Loans */}
      <h2 style={{ color: T.ivory, fontSize: '18px', fontWeight: 700, marginTop: '32px', marginBottom: '16px' }}>Player-to-Player Loans</h2>
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '24px' }}>
        <p style={{ marginBottom: '16px' }}>Loans are available on the <strong style={{ color: T.ivory }}>Market → Private Capital Market → P2P Loans</strong> tab.</p>
        <p style={{ marginBottom: '12px' }}>Monthly repayments are collected <strong style={{ color: T.amber }}>automatically</strong> by the world tick each game month.</p>
        <p style={{ marginBottom: '0' }}>If your cash is insufficient when a payment is due, you receive a <strong style={{ color: T.ivory }}>missed payment</strong>. Two consecutive missed payments put the loan into <strong style={{ color: T.amber }}>defaulted</strong> status — you cannot take new loans until the default is resolved.</p>
      </div>
    </div>
  );

  const sidebarStyle: React.CSSProperties = {
    width: '280px',
    background: '#0c0d13',
    borderRight: `1px solid ${T.border}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    gap: '8px'
  };

  const navButtonStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderRadius: '8px',
    background: isActive ? 'rgba(201,162,74,0.1)' : 'transparent',
    border: `1px solid ${isActive ? 'rgba(201,162,74,0.3)' : 'transparent'}`,
    color: isActive ? T.amber : T.muted,
    fontFamily: 'monospace',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left'
  });

  const modalContent = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: T.overlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
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
          borderRadius: 12,
          width: '85vw',
          maxWidth: '1200px',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: `0 0 80px rgba(201,162,74,0.1), 0 32px 100px rgba(0,0,0,0.8)`,
          overflow: 'hidden'
        }}
      >
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: `1px solid ${T.border}`,
          background: '#0c0d13',
          zIndex: 10
        }}>
          <div style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.25em', color: T.faint }}>
            WORLDr <span style={{ color: T.amber }}>//</span> Guide Library
          </div>
          <button
            onClick={onDismiss}
            style={{ 
              background: 'transparent', border: `1px solid ${T.border}`, borderRadius: '4px', cursor: 'pointer', 
              color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = T.faint;
              e.currentTarget.style.color = T.ivory;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = T.border;
              e.currentTarget.style.color = T.muted;
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Wrapper */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          
          {/* Sidebar */}
          <div style={sidebarStyle}>
            <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.faint, marginBottom: '8px', paddingLeft: '16px' }}>
              Topics
            </div>
            
            <button 
              onClick={() => setActiveTab('beginner')} 
              style={navButtonStyle(activeTab === 'beginner')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Book size={16} />
                <span>Beginner's Guide</span>
              </div>
              {activeTab === 'beginner' && <ChevronRight size={14} />}
            </button>
            
            <button 
              onClick={() => setActiveTab('equity')} 
              style={navButtonStyle(activeTab === 'equity')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <LineChart size={16} />
                <span>Equity & Markets</span>
              </div>
              {activeTab === 'equity' && <ChevronRight size={14} />}
            </button>
          </div>

          {/* Main Content Area */}
          <div style={{ padding: '48px 64px', overflowY: 'auto', flex: 1, background: T.bg }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              {activeTab === 'beginner' ? renderBeginnerGuide() : renderEquityGuide()}
            </div>
          </div>

        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
