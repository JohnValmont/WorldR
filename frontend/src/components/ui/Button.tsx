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

// Same family as the politics Btn (_floor/kit.tsx) and .btn-* in globals.css: sentence case, sans, 10px radius.
const variantStyles: Record<ButtonVariant, string> = {
  primary:  'text-[#17130A] border border-accent bg-gradient-to-b from-[#F2C964] to-accent shadow-[0_8px_22px_-12px_rgba(232,184,75,0.8),inset_0_1px_0_rgba(255,255,255,0.35)] hover:brightness-105 active:brightness-95',
  secondary:'border border-line-strong text-ink bg-transparent hover:bg-white/5 active:bg-white/10',
  ghost:    'text-ink-dim hover:text-ink hover:bg-white/5 active:bg-white/10',
  danger:   'border border-bad/60 text-bad bg-bad/10 hover:bg-bad/15 active:bg-bad/20',
  disabled: 'border border-dashed border-line-strong text-ink-faint cursor-not-allowed bg-white/[0.02]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-[15px] gap-2',
};

const iconSizes: Record<ButtonSize, number> = { sm: 14, md: 15, lg: 16 };

const base = 'inline-flex items-center justify-center rounded-[10px] font-sans font-semibold transition-all duration-150 select-none';

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
