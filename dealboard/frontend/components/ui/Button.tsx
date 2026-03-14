// ============================================================
// components/ui/Button.tsx — Google-Style Button Component
// ============================================================
//
// PURPOSE:
// Reusable button with Google Material Design variants:
// primary (filled blue), secondary (outlined), ghost (text-only),
// danger (red). Includes loading and disabled states.
//
// DEPENDENCIES: config.COLORS
// ============================================================

'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 border-transparent',
    secondary: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300',
    ghost: 'bg-transparent text-blue-500 hover:bg-blue-50 border-transparent',
    danger: 'bg-red-500 text-white hover:bg-red-600 border-transparent',
  }[variant];

  const sizeClass = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }[size];

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg border
        transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClass} ${sizeClass} ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

export default Button;
