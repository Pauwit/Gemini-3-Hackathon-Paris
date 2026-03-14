// ============================================================
// app/meeting/components/LiveCardBoard.tsx — Real-Time Card Grid
// ============================================================
//
// PURPOSE:
// Displays intelligence cards as they arrive from the server during
// a live meeting. Cards animate in with a slide-up effect. Each card
// shows label badge, title, summary, and confidence bar.
// Clicking a card opens CardExpanded modal.
//
// DATA FLOW:
// WebSocketProvider.cards → sorted by timestamp → rendered grid
//
// PROTOCOL REFERENCE: PROTOCOL.md section 3 (card message)
// DEPENDENCIES: useWebSocketContext, Card UI, Badge, CardExpanded, config.CARD_COLORS
// ============================================================

'use client';

// TODO: Import Card, Badge, CardExpanded components
// TODO: Import useWebSocketContext
// TODO: Import config.CARD_COLORS for label styling

export default function LiveCardBoard() {
  // TODO: const { cards } = useWebSocketContext();
  // TODO: const [expandedCard, setExpandedCard] = useState(null);
  // TODO: Sort cards: ALERT first, then by timestamp desc
  // TODO: Render grid with animated card entries
  // TODO: Show empty state when no cards yet

  return (
    <div className="h-full">
      <h2 className="text-sm font-medium text-gray-500 mb-4">Intelligence Cards</h2>
      {/* TODO: Implement card grid */}
      <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
        <p className="text-gray-300 text-xs">Cards will appear here during the meeting</p>
      </div>
    </div>
  );
}
