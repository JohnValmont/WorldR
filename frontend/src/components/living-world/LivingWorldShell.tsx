'use client';
import { ReactNode } from 'react';
import IdentityBar from './IdentityBar';
import LivingWorldNav from './LivingWorldNav';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

interface LivingWorldShellProps {
  children: ReactNode;
}

export default function LivingWorldShell({ children }: LivingWorldShellProps) {
  return (
    <div 
      className="min-h-screen w-full relative overflow-x-hidden font-sans"
      style={{
        backgroundColor: theme.colors.background.pageBg,
        // Deep charcoal/green base with radial gradient from top left
        backgroundImage: `radial-gradient(circle at 0% 0%, rgba(214,179,95,0.08) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(63,143,104,0.04) 0%, transparent 50%)`,
        color: theme.colors.text.textPrimary
      }}
    >
      <div 
        className="mx-auto w-full"
        style={{
          maxWidth: '1560px',
          padding: '22px 28px',
          // Override padding for mobile using CSS classes if needed, we'll rely on Tailwind for responsive padding overrides
        }}
      >
        <div className="max-w-[1560px] mx-auto sm:px-0 px-[-14px]">
          <IdentityBar />
          <LivingWorldNav />
          
          {/* Main Page Content */}
          <main className="w-full relative z-10 animate-fade-in-up">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
