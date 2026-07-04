import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WORLDr — Secure Auth Gateway',
  description: 'WORLDr centralized authentication gateway, identity management, and secure authorization node.',
  keywords: ['authentication', 'security', 'identity', 'verification', 'authorization'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black text-zinc-100 font-sans antialiased">
        <div className="fixed top-0 left-0 w-full pointer-events-none z-[9999] flex justify-center mt-2">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white/50 text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-sm">
            Pre-Alpha V0.1
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
