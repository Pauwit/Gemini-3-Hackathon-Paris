// ============================================================
// app/meeting/components/CardExpanded.tsx — Expanded Card Modal
// ============================================================
//
// PURPOSE:
// Modal overlay showing the full detail view of a selected card.
// Displays label badge, title, summary, full details Q&A table,
// source citations, confidence score, and triggered-by transcript link.
//
// DATA FLOW:
// Parent passes card prop → rendered in Modal overlay
//
// PROTOCOL REFERENCE: PROTOCOL.md section 3 (card schema — details array)
// DEPENDENCIES: Modal UI component, Badge, config.CARD_COLORS
// ============================================================

'use client';

import type { Card } from '../../../lib/types';

interface CardExpandedProps {
  card: Card;
  onClose: () => void;
}

// TODO: Import Modal component
// TODO: Import Badge component
// TODO: Import config.CARD_COLORS for label styling

export default function CardExpanded({ card, onClose }: CardExpandedProps) {
  // TODO: Render full card detail in Modal
  // TODO: Label badge with correct color
  // TODO: Details Q&A table with source citations
  // TODO: Confidence bar visualization
  // TODO: Link back to triggering transcript segment

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-gray-100">
            {card.label}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">{card.title}</h3>
        <p className="text-sm text-gray-600 mb-4">{card.summary}</p>
        {/* TODO: Details table, confidence bar */}
        <p className="text-xs text-gray-300">Full detail view — TODO: implement</p>
      </div>
    </div>
  );
}
