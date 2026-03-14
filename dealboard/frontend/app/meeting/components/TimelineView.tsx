// ============================================================
// app/meeting/components/TimelineView.tsx — Meeting Timeline
// ============================================================
//
// PURPOSE:
// Horizontal timeline at the bottom of the meeting view showing
// the sequence of events: transcript segments, card generations,
// pipeline stages, and vision readings. Provides scrubbing context.
//
// DATA FLOW:
// useWebSocketContext → cards + transcriptSegments → timeline events
//
// PROTOCOL REFERENCE: N/A (display only)
// DEPENDENCIES: useWebSocketContext
// ============================================================

'use client';

// TODO: Import useWebSocketContext
// TODO: Merge cards and segments into unified timeline event array
// TODO: Render horizontal scrollable timeline with event dots

export default function TimelineView() {
  return (
    <div className="h-24 bg-white border-t border-gray-200 px-4 flex items-center">
      <div className="w-full">
        <p className="text-xs text-gray-400 mb-2">Meeting Timeline</p>
        {/* TODO: Implement timeline */}
        <div className="h-1 bg-gray-100 rounded-full w-full relative">
          <div className="absolute inset-y-0 left-0 bg-blue-400 rounded-full w-1/3" />
        </div>
        <p className="text-xs text-gray-300 mt-1">Timeline events — TODO: implement</p>
      </div>
    </div>
  );
}
