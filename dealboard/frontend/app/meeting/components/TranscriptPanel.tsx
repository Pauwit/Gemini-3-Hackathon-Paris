// ============================================================
// app/meeting/components/TranscriptPanel.tsx — Live Transcript
// ============================================================
//
// PURPOSE:
// Scrolling panel showing live transcript segments as they arrive.
// Final segments appear in full; partial/interim segments shown
// with a pulsing indicator. Auto-scrolls to latest segment.
// Speaker names are color-coded per participant.
//
// DATA FLOW:
// WebSocketProvider.transcriptSegments → sorted by timestamp → rendered list
//
// PROTOCOL REFERENCE: PROTOCOL.md section 3 (transcript message)
// DEPENDENCIES: useWebSocketContext
// ============================================================

'use client';

// TODO: Import useWebSocketContext
// TODO: Import useRef for auto-scroll

export default function TranscriptPanel() {
  // TODO: const { transcriptSegments } = useWebSocketContext();
  // TODO: const scrollRef = useRef(null);
  // TODO: useEffect auto-scroll on new segment
  // TODO: Color-map speakers to consistent colors
  // TODO: Show interim transcript with italic + opacity

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-sm font-medium text-gray-500 mb-3">Live Transcript</h2>
      <div className="flex-1 overflow-auto space-y-3">
        {/* TODO: Implement transcript segments */}
        <p className="text-gray-300 text-xs">Transcript segments will appear here</p>
      </div>
    </div>
  );
}
