import type { Metadata, Viewport } from 'next';
import './globals.css';
import AnalyticsProvider from '../components/AnalyticsProvider';

export const metadata: Metadata = {
  title: 'WORLDr — Multiplayer Politics & Business Simulation',
  description: 'Build a company, found a political party and write the laws your rivals live under. A free browser-based political-economy simulation.',
  keywords: ['political simulation', 'economy simulation', 'browser game', 'multiplayer strategy', 'tycoon', 'elections'],
};

export const viewport: Viewport = {
  themeColor: '#0B0D12',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Design tokens: the one source of colour, type, space and motion (docs/DESIGN_SYSTEM.md). */}
        <link rel="stylesheet" href="/design/tokens.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Four families only: Cinzel (display), Outfit (UI), JetBrains Mono (numbers). */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-ink font-sans antialiased">
        <a href="#main" className="skip-link">Skip to content</a>
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  );
}
