// ============================================================
// components/ui/StatusIndicator.tsx — WebSocket Connection Status
// ============================================================
//
// PURPOSE:
// Visual indicator for the WebSocket connection state.
// Displays a color-coded dot with optional label text:
//   connected    → green dot (solid)
//   connecting   → yellow dot (pulsing)
//   disconnected → grey dot (solid)
//   error        → red dot (pulsing)
//
// USE CASES:
//   - Sidebar footer: "Connected to server"
//   - TopBar: real-time connection badge
//   - Settings page: status row
//
// SIZES:
//   sm — 6px dot, xs text
//   md — 10px dot, sm text
//
// DEPENDENCIES: WsStatus type from lib/types.ts
// ============================================================

'use client';

import React from 'react';
import type { WsStatus } from '../../lib/types';

// ── Config ────────────────────────────────────────────────

interface StatusConfig {
  color: string;
  label: string;
  pulse: boolean;
  description: string;
}

const STATUS_CONFIG: Record<WsStatus, StatusConfig> = {
  connected: {
    color:       '#34A853',
    label:       'Connected',
    pulse:       false,
    description: 'WebSocket connected to backend',
  },
  connecting: {
    color:       '#FBBC04',
    label:       'Connecting…',
    pulse:       true,
    description: 'Attempting to connect to backend',
  },
  disconnected: {
    color:       '#9AA0A6',
    label:       'Disconnected',
    pulse:       false,
    description: 'Not connected to backend',
  },
  error: {
    color:       '#EA4335',
    label:       'Connection error',
    pulse:       true,
    description: 'WebSocket error — retrying',
  },
};

// ── Component ─────────────────────────────────────────────

interface StatusIndicatorProps {
  /** WebSocket connection state */
  status: WsStatus;
  /** Show text label after the dot */
  showLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Extra CSS classes */
  className?: string;
}

/**
 * StatusIndicator
 * Shows a color-coded connection status dot with optional label.
 * Pulsing animation applied to connecting and error states.
 *
 * @param status    - WsStatus value
 * @param showLabel - render text label after dot
 * @param size      - sm (6px) or md (10px)
 */
export function StatusIndicator({
  status,
  showLabel = true,
  size = 'sm',
  className = '',
}: StatusIndicatorProps) {
  const cfg = STATUS_CONFIG[status];

  const dotSize = size === 'md'
    ? { width: 10, height: 10 }
    : { width: 6, height: 6 };

  const textSize = size === 'md' ? 'text-sm' : 'text-xs';

  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      title={cfg.description}
      aria-label={cfg.description}
    >
      {/* Dot */}
      <span
        className="rounded-full flex-shrink-0"
        style={{
          ...dotSize,
          backgroundColor: cfg.color,
          animation: cfg.pulse ? 'statusPulse 2s ease-in-out infinite' : 'none',
        }}
        aria-hidden
      />

      {/* Label */}
      {showLabel && (
        <span className={`${textSize} font-medium`} style={{ color: '#5F6368' }}>
          {cfg.label}
        </span>
      )}
    </div>
  );
}

// ── Pipeline Status Indicator ─────────────────────────────

import type { PipelineStage } from '../../lib/types';

interface PipelineStatusBadgeProps {
  /** Current pipeline stage */
  stage: PipelineStage;
  /** Human readable message from server */
  message?: string;
  /** Show workers count */
  workersActive?: string[];
  className?: string;
}

const PIPELINE_COLORS: Record<PipelineStage, string> = {
  listening: '#34A853',
  fetching:  '#4285F4',
  analysing: '#A142F4',
  done:      '#34A853',
  error:     '#EA4335',
};

const PIPELINE_LABELS: Record<PipelineStage, string> = {
  listening: 'Listening',
  fetching:  'Fetching context',
  analysing: 'Analysing',
  done:      'Done',
  error:     'Error',
};

/**
 * PipelineStatusBadge
 * Shows the current pipeline processing stage with a pulsing dot.
 * Used in TopBar during active meeting.
 *
 * @param stage         - PipelineStage value
 * @param message       - server status message
 * @param workersActive - list of active worker names
 */
export function PipelineStatusBadge({
  stage,
  message,
  workersActive = [],
  className = '',
}: PipelineStatusBadgeProps) {
  const color = PIPELINE_COLORS[stage];
  const label = PIPELINE_LABELS[stage];
  const isActive = stage !== 'done' && stage !== 'error';

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${className}`}
      style={{
        backgroundColor: `${color}14`,
        borderColor:     `${color}40`,
      }}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          backgroundColor: color,
          animation: isActive ? 'statusPulse 1.2s ease-in-out infinite' : 'none',
        }}
        aria-hidden
      />
      <span className="text-xs font-semibold" style={{ color }}>
        {message || label}
      </span>
      {workersActive.length > 0 && (
        <span className="text-xs" style={{ color: '#9AA0A6' }}>
          [{workersActive.join(', ')}]
        </span>
      )}
    </div>
  );
}

export default StatusIndicator;
