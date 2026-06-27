'use client';
import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { cn } from './utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'disabled';
type ButtonSize = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

interface ButtonAsButton extends BaseProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  href?: undefined;
}

interface ButtonAsLink extends BaseProps {
  href: string;
  disabled?: boolean;
  onClick?: () => void;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary:  'bg-terminal-amber text-black font-bold hover:bg-amber-400 active:bg-amber-600 shadow-amber-glow/30',
  secondary:'border border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10 active:bg-terminal-amber/20',
  ghost:    'text-zinc-400 hover:text-zinc-100 hover:bg-white/5 active:bg-white/10',
  danger:   'border border-terminal-red text-terminal-red hover:bg-terminal-red/10 active:bg-terminal-red/20',
  disabled: 'border border-[#23232b] text-zinc-600 cursor-not-allowed bg-white/[0.02]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[9px] tracking-[0.15em] gap-1.5',
  md: 'px-4 py-2   text-[10px] tracking-[0.15em] gap-2',
  lg: 'px-6 py-2.5 text-[11px] tracking-[0.12em] gap-2',
};

const iconSizes: Record<ButtonSize, number> = { sm: 11, md: 12, lg: 14 };

const base = 'inline-flex items-center justify-center font-mono uppercase transition-all duration-150 select-none focus:outline-none focus:ring-1 focus:ring-terminal-amber/40';

export default function Button(props: ButtonProps) {
  const {
    variant = 'secondary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    children,
    className,
    fullWidth,
  } = props;

  const isDisabled = variant === 'disabled' || (props as ButtonAsButton).disabled;
  const combinedClass = cn(
    base,
    variantStyles[isDisabled ? 'disabled' : variant],
    sizeStyles[size],
    fullWidth && 'w-full',
    className,
  );

  const content = (
    <>
      {Icon && <Icon size={iconSizes[size]} />}
      {children}
      {IconRight && <IconRight size={iconSizes[size]} />}
    </>
  );

  if ('href' in props && props.href && !isDisabled) {
    return (
      <Link href={props.href} className={combinedClass} onClick={props.onClick}>
        {content}
      </Link>
    );
  }

  const { href: _href, iconRight: _ir, icon: _ic, fullWidth: _fw, ...buttonProps } = props as any;
  return (
    <button
      {...buttonProps}
      disabled={isDisabled}
      className={combinedClass}
    >
      {content}
    </button>
  );
}
