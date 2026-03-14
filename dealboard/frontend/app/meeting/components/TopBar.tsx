// ============================================================
// app/meeting/components/TopBar.tsx — Meeting Top Bar
// ============================================================
//
// PURPOSE:
// Fixed top bar during live meetings. Shows: meeting title,
// elapsed timer, pipeline status indicator, ALERT count pill,
// vision emotion badge, and Stop Meeting button.
//
// DATA FLOW:
// useWebSocketContext → meetingState (timer), pipelineStatus, cards (alert count)
//
// PROTOCOL REFERENCE: PROTOCOL.md section 3 (meeting-state, pipeline-status)
// DEPENDENCIES: useWebSocketContext, StatusIndicator, Badge
// ============================================================

'use client';

// TODO: Import useWebSocketContext
// TODO: Import StatusIndicator, Badge
// TODO: Import useMeetingState for timer

export default function TopBar() {
  // TODO: Calculate elapsed time from meetingState.startedAt
  // TODO: Count ALERT label cards
  // TODO: Show pipeline stage in StatusIndicator
  // TODO: Stop Meeting button → stopMeeting()

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-3">
        {/* TODO: StatusIndicator */}
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="font-medium text-sm text-gray-900">Live Meeting</span>
        {/* TODO: Timer */}
        <span className="text-xs text-gray-400 font-mono">00:00:00</span>
      </div>

      <div className="flex items-center gap-2">
        {/* TODO: Alert pill, vision badge, pipeline status */}
        <span className="text-xs text-gray-300">TopBar — TODO: implement</span>
      </div>

      {/* TODO: Stop Meeting button */}
      <button className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
        Stop Meeting
      </button>
    </div>
  );
}
