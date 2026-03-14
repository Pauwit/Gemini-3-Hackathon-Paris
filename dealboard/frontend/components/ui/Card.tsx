// ============================================================
// components/ui/Card.tsx — Base Card Component
// ============================================================
//
// PURPOSE:
// Reusable card container with Google Material-inspired styling.
// Supports elevation levels (flat, raised, elevated) and
// optional click handler. Used as the base for intelligence cards.
//
// DEPENDENCIES: config.COLORS
// ============================================================

'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevation?: 'flat' | 'raised' | 'elevated';
  onClick?: () => void;
}

export function Card({ children, className = '', elevation = 'raised', onClick }: CardProps) {
  const shadowClass = {
    flat: 'border border-gray-200',
    raised: 'shadow-sm border border-gray-100',
    elevated: 'shadow-md border border-gray-100',
  }[elevation];

  return (
    <div
      className={`bg-white rounded-xl ${shadowClass} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export default Card;
