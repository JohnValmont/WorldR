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
        {children}
      </body>
    </html>
  );
}
