// ============================================================
// components/ui/Button.tsx — Google-Style Button Component
// ============================================================
//
// PURPOSE:
// Reusable button following Google Material Design 3 principles.
// Variants:
//   primary   — filled blue (#4285F4), white text
//   secondary — white bg, blue border + text (outlined)
//   ghost     — transparent bg, blue text (text button)
//   danger    — filled red (#EA4335), white text
//   gemini    — gradient fill (blue → purple), white text
//
// USE CASES:
//   - "Start Meeting" (primary)
//   - "End Meeting" (danger)
//   - "Generate Docs" (gemini)
//   - Form cancel (secondary / ghost)
//   - Icon-only buttons (pass children as icon)
//
// SIZES: sm | md | lg
// STATES: default, hover, active, loading (spinner), disabled
//
// DEPENDENCIES: None
// ============================================================

'use client';

import React from 'react';

// ── Types ─────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gemini';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  /** Content — text, icon, or combination */
  children: React.ReactNode;
  /** Icon placed before children */
  leftIcon?: React.ReactNode;
  /** Icon placed after children */
  rightIcon?: React.ReactNode;
  /** Fill width of container */
  fullWidth?: boolean;
}

// ── Style maps ────────────────────────────────────────────

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs h-7 gap-1.5',
  md: 'px-4 py-2  text-sm h-9 gap-2',
  lg: 'px-6 py-2.5 text-sm h-11 gap-2',
};

// Inline styles used for colors to match config.ts exactly
const VARIANT_INLINE: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { backgroundColor: '#4285F4', color: '#fff', border: '1px solid #4285F4' },
  secondary: { backgroundColor: '#fff',    color: '#4285F4', border: '1px solid #AECBFA' },
  ghost:     { backgroundColor: 'transparent', color: '#4285F4', border: '1px solid transparent' },
  danger:    { backgroundColor: '#EA4335', color: '#fff', border: '1px solid #EA4335' },
  gemini:    { background: 'linear-gradient(135deg, #4285F4, #A142F4)', color: '#fff', border: 'none' },
};

const VARIANT_HOVER: Record<ButtonVariant, string> = {
  primary:   'hover:opacity-90',
  secondary: 'hover:bg-blue-50',
  ghost:     'hover:bg-blue-50',
  danger:    'hover:opacity-90',
  gemini:    'hover:opacity-90',
};

/**
 * Button
 * Google Material 3-inspired button with multiple variants and sizes.
 * Loading state disables interaction and shows a spinner.
 *
 * @param variant  - visual style (primary | secondary | ghost | danger | gemini)
 * @param size     - height/padding preset (sm | md | lg)
 * @param loading  - shows spinner and disables
 * @param leftIcon - icon node before label text
 * @param rightIcon - icon node after label text
 * @param fullWidth - fills container width
 */
export function Button({
  variant    = 'primary',
  size       = 'md',
  loading    = false,
  children,
  leftIcon,
  rightIcon,
  fullWidth  = false,
  disabled,
  className  = '',
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-all duration-150 select-none
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${VARIANT_HOVER[variant]}
        ${SIZE_CLASSES[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      style={{ ...VARIANT_INLINE[variant], ...style }}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <span
          className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden
        />
      ) : (
        leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  );
}

// ── Icon-only Button ──────────────────────────────────────

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon content */
  children: React.ReactNode;
  /** Aria label for accessibility */
  'aria-label': string;
  /** Size variant */
  size?: ButtonSize;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Extra classes */
  className?: string;
}

/**
 * IconButton
 * Square button for icon-only actions (close, copy, etc.)
 *
 * @param children   - icon element
 * @param aria-label - screen reader label
 * @param size       - size preset
 * @param variant    - style variant
 */
export function IconButton({
  children,
  size = 'md',
  variant = 'ghost',
  className = '',
  style,
  ...props
}: IconButtonProps) {
  const sizeMap: Record<ButtonSize, string> = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-lg flex-shrink-0
        transition-all duration-150
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-400
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANT_HOVER[variant]}
        ${sizeMap[size]}
        ${className}
      `}
      style={{ ...VARIANT_INLINE[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
