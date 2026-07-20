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
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600;700&family=Lexend:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&family=Source+Sans+3:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black text-zinc-100 font-sans antialiased">
        <div className="fixed top-0 left-0 w-full pointer-events-none z-[9999] flex justify-center mt-2">
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 text-white/50 text-[10px] uppercase tracking-[0.2em] pl-4 pr-1.5 py-1.5 rounded-full shadow-sm">
            <span>Pre-Alpha V0.1</span>
            <a 
              href="https://discord.gg/m76prxKgTe" 
              target="_blank" 
              rel="noopener noreferrer" 
              title="Join Discord" 
              className="pointer-events-auto flex items-center justify-center p-1.5 rounded-full bg-[#5865F2]/20 text-[#5865F2] hover:bg-[#5865F2] hover:text-white transition-all shadow-lg"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
              </svg>
            </a>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
