// ============================================================
// app/meeting/components/TopBar.tsx — Live Meeting Top Bar
// ============================================================
//
// PURPOSE:
// Fixed top bar shown during an active meeting. Provides:
//   - Back navigation to dashboard (via breadcrumb)
//   - Meeting title from URL params / meetingState
//   - Elapsed timer in HH:MM:SS (live updating)
//   - Pipeline status indicator (pulsing dot + stage name)
//   - Alert count pills per card label type (color-coded)
//   - Vision/emotion badge (from visionData)
//   - "End Meeting" button → stopMeeting()
//   - "Generate Docs" button (shown when meeting is ended)
//
// DATA FLOW:
//   useWebSocketContext → meetingState, pipelineStatus, cards, visionData
//   useMeetingState     → elapsedSeconds, isActive, isEnded
//
// DESIGN:
//   White bar, 56px tall, subtle bottom border.
//   Left: back arrow + title + timer
//   Center: pipeline status
//   Right: alert pills + buttons
//
// PROTOCOL REFERENCE: PROTOCOL.md section 3
// DEPENDENCIES: useMeetingState, useWebSocketContext, Badge, Button
// ============================================================

'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Radio,
  Square,
  FileText,
  Mic,
  Eye,
} from 'lucide-react';
import { useWebSocketContext } from '../../../components/providers/WebSocketProvider';
import { useMeetingState }      from '../../../lib/hooks/useMeetingState';
import { PipelineStatusBadge }  from '../../../components/ui/StatusIndicator';
import { CardLabelBadge }       from '../../../components/ui/Badge';
import { Button }               from '../../../components/ui/Button';
import { config }               from '../../../lib/config';
import type { CardLabel }       from '../../../lib/types';

// ── Helpers ───────────────────────────────────────────────

/**
 * formatElapsed
 * Converts seconds to HH:MM:SS display string.
 *
 * @param totalSeconds - elapsed seconds
 * @returns formatted string like "01:23:45"
 */
function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

// ── Card label order and colors for pills ────────────────
const LABEL_ORDER: CardLabel[] = ['ALERT', 'BATTLECARD', 'CONTEXT', 'STRATEGY', 'INFO'];

// ── Emotion label map ─────────────────────────────────────
const EMOTION_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  positive:  { emoji: '😊', label: 'Positive',  color: '#34A853' },
  neutral:   { emoji: '😐', label: 'Neutral',   color: '#5F6368' },
  skeptical: { emoji: '🤔', label: 'Skeptical', color: '#FBBC04' },
  confused:  { emoji: '😕', label: 'Confused',  color: '#EA4335' },
  engaged:   { emoji: '👍', label: 'Engaged',   color: '#4285F4' },
};

// ── Component ─────────────────────────────────────────────

interface TopBarProps {
  /** Meeting title override (from URL param or storage) */
  meetingTitle?: string;
  /** Called when "Generate Docs" is clicked */
  onGenerateDocs?: () => void;
}

/**
 * TopBar
 * Live meeting top navigation bar with timer, status, and controls.
 *
 * @param meetingTitle  - display title override
 * @param onGenerateDocs - generate docs button callback
 */
export function TopBar({ meetingTitle, onGenerateDocs }: TopBarProps) {
  const { cards, pipelineStatus, visionData, meetingState } = useWebSocketContext();
  const { elapsedSeconds, isActive, isEnded, isStarting, stop, generateDocs } = useMeetingState();

  // ── Card counts per label ──────────────────────────────
  const labelCounts = useMemo(() => {
    const counts: Partial<Record<CardLabel, number>> = {};
    for (const card of cards) {
      counts[card.label] = (counts[card.label] ?? 0) + 1;
    }
    return counts;
  }, [cards]);

  const totalAlerts = labelCounts['ALERT'] ?? 0;

  // ── Display title ──────────────────────────────────────
  const displayTitle = meetingTitle ?? meetingState?.meetingId ?? 'Live Meeting';

  // ── Emotion badge ──────────────────────────────────────
  const emotion = visionData ? EMOTION_LABELS[visionData.emotion] ?? null : null;

  // ── Handlers ──────────────────────────────────────────

  function handleEndMeeting() {
    stop();
  }

  function handleGenerateDocs() {
    if (onGenerateDocs) {
      onGenerateDocs();
    } else {
      generateDocs();
    }
  }

  return (
    <header
      className="flex items-center gap-4 px-4 flex-shrink-0"
      style={{
        height:          56,
        backgroundColor: '#FFFFFF',
        borderBottom:    '1px solid #E8EAED',
        boxShadow:       '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── Left: Back + Title + Timer ──────────────────── */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          href="/dashboard"
          className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 flex-shrink-0"
          style={{ color: '#5F6368' }}
          title="Back to Dashboard"
        >
          <ArrowLeft size={16} />
        </Link>

        {/* Live indicator */}
        {(isActive || isStarting) && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: '#EA4335',
                animation:       'statusPulse 1.2s ease-in-out infinite',
              }}
            />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#EA4335' }}>
              Live
            </span>
          </div>
        )}

        {isEnded && (
          <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ color: '#5F6368', backgroundColor: '#F1F3F4' }}>
            Ended
          </span>
        )}

        {/* Meeting title */}
        <h1
          className="text-sm font-semibold truncate max-w-[220px]"
          style={{ color: '#202124' }}
          title={displayTitle}
        >
          {displayTitle}
        </h1>

        {/* Elapsed timer */}
        {isActive && (
          <span
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{ color: '#5F6368', backgroundColor: '#F8F9FA', border: '1px solid #E8EAED' }}
          >
            {formatElapsed(elapsedSeconds)}
          </span>
        )}
      </div>

      {/* ── Center: Pipeline Status ─────────────────────── */}
      <div className="flex-1 flex items-center justify-center">
        {pipelineStatus && isActive && (
          <PipelineStatusBadge
            stage={pipelineStatus.stage}
            message={pipelineStatus.message}
            workersActive={pipelineStatus.workersActive?.slice(0, 2)}
          />
        )}
      </div>

      {/* ── Right: Counts + Vision + Buttons ────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Card label count pills */}
        {LABEL_ORDER.map((label) => {
          const count = labelCounts[label];
          if (!count) return null;
          return (
            <div
              key={label}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
              style={{
                color:           config.CARD_COLORS[label].color,
                backgroundColor: config.CARD_COLORS[label].bg,
                borderColor:     config.CARD_COLORS[label].border,
              }}
            >
              {count} {label}
            </div>
          );
        })}

        {/* Vision/emotion badge */}
        {emotion && visionData && isActive && (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border"
            style={{ borderColor: '#E8EAED', backgroundColor: '#F8F9FA' }}
            title={`Emotion: ${emotion.label} (${Math.round(visionData.confidence * 100)}%)`}
          >
            <Eye size={11} style={{ color: emotion.color }} />
            <span style={{ color: emotion.color }} className="font-medium">
              {emotion.emoji} {emotion.label}
            </span>
          </div>
        )}

        {/* Audio capture indicator */}
        {isActive && (
          <div
            className="flex items-center gap-1 text-xs"
            style={{ color: '#34A853' }}
            title="Microphone active"
          >
            <Mic size={13} />
          </div>
        )}

        {/* Separator */}
        <div className="w-px h-5 mx-1" style={{ backgroundColor: '#E8EAED' }} />

        {/* Generate Docs button (shown when ended or has cards) */}
        {(isEnded || (isActive && cards.length > 0)) && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FileText size={13} />}
            onClick={handleGenerateDocs}
          >
            {isEnded ? 'Generate Docs' : 'Preview Docs'}
          </Button>
        )}

        {/* End Meeting button */}
        {(isActive || isStarting) && (
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Square size={13} />}
            onClick={handleEndMeeting}
          >
            End Meeting
          </Button>
        )}

        {/* Back to review (when ended) */}
        {isEnded && (
          <Link href="/review">
            <Button variant="gemini" size="sm" leftIcon={<Radio size={13} />}>
              Review
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}

export default TopBar;
