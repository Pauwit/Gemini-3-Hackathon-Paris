// ============================================================
// app/meeting/page.tsx — Live Meeting View
// ============================================================
//
// PURPOSE:
// Main live meeting experience. Orchestrates the four meeting
// sub-components: TopBar, LiveCardBoard, TranscriptPanel, TimelineView.
// Manages audio capture and WebSocket integration.
//
// DATA FLOW:
// useWebSocketContext → cards, transcripts, pipelineStatus
// useAudioCapture → audio chunks → sendAudioChunk()
// useMeetingState → meeting lifecycle
//
// PROTOCOL REFERENCE: PROTOCOL.md sections 2, 3
// DEPENDENCIES: WebSocketProvider, meeting sub-components, hooks
// ============================================================

'use client';

// TODO: Import sub-components when implemented
// import { TopBar } from './components/TopBar';
// import { LiveCardBoard } from './components/LiveCardBoard';
// import { TranscriptPanel } from './components/TranscriptPanel';
// import { TimelineView } from './components/TimelineView';
// import { useWebSocketContext } from '../../components/providers/WebSocketProvider';
// import { useMeetingState } from '../../lib/hooks/useMeetingState';
// import { useAudioCapture } from '../../lib/hooks/useAudioCapture';

export default function MeetingPage() {
  // TODO: Initialize meeting on mount (startMeeting or read from URL params)
  // TODO: Start audio capture
  // TODO: Render TopBar with timer and alert pills
  // TODO: Render LiveCardBoard with real-time cards
  // TODO: Render TranscriptPanel with live transcript
  // TODO: Render TimelineView with event timeline

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* TODO: TopBar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4">
        <span className="text-sm text-gray-400">TopBar — TODO</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* TODO: LiveCardBoard */}
        <div className="flex-1 p-4 overflow-auto border-r border-gray-200">
          <p className="text-gray-300 text-xs">LiveCardBoard — TODO</p>
        </div>

        {/* TODO: TranscriptPanel */}
        <div className="w-80 p-4 overflow-auto">
          <p className="text-gray-300 text-xs">TranscriptPanel — TODO</p>
        </div>
      </div>

      {/* TODO: TimelineView */}
      <div className="h-24 bg-white border-t border-gray-200 flex items-center px-4">
        <span className="text-sm text-gray-400">TimelineView — TODO</span>
      </div>
    </div>
  );
}
