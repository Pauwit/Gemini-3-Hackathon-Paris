// ============================================================
// app/review/page.tsx — Post-Meeting Review Page
// ============================================================
//
// PURPOSE:
// Post-meeting view for reviewing generated documents, cards,
// and summary. Allows generating documents if not yet done.
// Accessed after meeting ends or from dashboard history.
//
// DATA FLOW:
// URL param meetingId → GET /api/meetings/:id/* → display data
// WebSocketProvider.documents → document tabs
//
// PROTOCOL REFERENCE: PROTOCOL.md section 4 (meetings REST endpoints)
// DEPENDENCIES: review sub-components, useWebSocketContext
// ============================================================

'use client';

// TODO: Import sub-components: MeetingSummary, FollowUpEmail, StrategyBrief, DecisionLog, DocumentExport
// TODO: Read meetingId from URL search params
// TODO: Fetch meeting documents from /api/meetings/:id/documents
// TODO: Generate documents if not yet available (generateDocuments call)

export default function ReviewPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Meeting Review</h1>
      <p className="text-gray-500 text-sm mb-8">Post-meeting documents and analysis</p>

      {/* TODO: Document type tabs + content panels */}
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-400 text-sm">Review page — TODO: implement</p>
        <p className="text-gray-300 text-xs mt-2">
          Summary · Follow-up Email · Strategy Brief · Decision Log
        </p>
      </div>
    </div>
  );
}
