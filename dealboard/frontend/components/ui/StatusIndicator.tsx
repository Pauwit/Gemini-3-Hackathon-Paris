// ============================================================
// components/ui/StatusIndicator.tsx — Connection Status Dots
// ============================================================
//
// PURPOSE:
// Visual indicator for WebSocket connection status.
// Shows colored dot + label: green=connected, yellow=connecting,
// red=error, gray=disconnected. Used in Sidebar and TopBar.
//
// DEPENDENCIES: WsStatus type, useWebSocketContext
// ============================================================

'use client';

import type { WsStatus } from '../../lib/types';

interface StatusIndicatorProps {
  status: WsStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<WsStatus, { color: string; label: string; pulse: boolean }> = {
  connected:    { color: 'bg-green-400',  label: 'Connected',    pulse: false },
  connecting:   { color: 'bg-yellow-400', label: 'Connecting...', pulse: true },
  disconnected: { color: 'bg-gray-300',   label: 'Disconnected', pulse: false },
  error:        { color: 'bg-red-400',    label: 'Connection error', pulse: true },
};

export function StatusIndicator({ status, showLabel = true, size = 'sm' }: StatusIndicatorProps) {
  const cfg = STATUS_CONFIG[status];
  const dotSize = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2';

  return (
    <div className="flex items-center gap-1.5">
      <span className={`${dotSize} rounded-full flex-shrink-0 ${cfg.color} ${cfg.pulse ? 'animate-pulse' : ''}`} />
      {showLabel && (
        <span className="text-xs text-gray-500">{cfg.label}</span>
      )}
    </div>
  );
}

export default StatusIndicator;
