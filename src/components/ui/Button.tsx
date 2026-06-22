'use client';

import { forwardRef } from 'react';
import { play } from '@/lib/client/sound';
import { vibrate } from '@/lib/client/haptics';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-marigold text-ink border-marigold-dark hover:bg-marigold-dark hover:text-paper-50',
  secondary:
    'bg-paper-100 text-ink border-ink/40 hover:bg-paper-200',
  ghost: 'bg-transparent text-paper-50 border-paper-50/40 hover:bg-paper-50/10',
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  // Play a tap sound + haptic on click. Default true.
  feedback?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', feedback = true, className = '', onClick, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      onClick={(e) => {
        if (feedback) {
          play('tap');
          vibrate('tap');
        }
        onClick?.(e);
      }}
      className={[
        'inline-flex min-h-[44px] items-center justify-center gap-2 px-5 py-2.5',
        'font-display text-lg font-700 tracking-wide',
        'border-[2.5px] rounded-[14px_12px_16px_13px/13px_16px_12px_15px]',
        'shadow-[0_4px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)]',
        'transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0',
        VARIANTS[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
});
