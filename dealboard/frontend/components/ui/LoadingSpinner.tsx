// ============================================================
// components/ui/LoadingSpinner.tsx — Loading Animation
// ============================================================
//
// PURPOSE:
// Animated Gemini-branded loading spinner. Used during document
// generation, data fetching, and agent processing. Supports
// size variants and optional label text.
//
// DEPENDENCIES: config.COLORS (gemini gradient)
// ============================================================

'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', label, className = '' }: LoadingSpinnerProps) {
  const sizeClass = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  }[size];

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div
        className={`${sizeClass} rounded-full animate-spin`}
        style={{
          borderColor: '#E8EAED',
          borderTopColor: '#4285F4',
        }}
      />
      {label && (
        <span className="text-xs text-gray-500 animate-pulse">{label}</span>
      )}
    </div>
  );
}

export default LoadingSpinner;
