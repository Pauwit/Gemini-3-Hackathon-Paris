/**
 * ChatMessage.tsx — Renders a single chat message bubble.
 * User messages are right-aligned with light blue background.
 * AI messages are left-aligned with light grey background and a Gemini icon.
 */

'use client';

import { ChatMessage as ChatMessageType } from '@/lib/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

function GeminiIcon() {
  return (
    <div
      className="w-7 h-7 rounded-full gemini-gradient flex items-center justify-center flex-shrink-0"
      aria-hidden="true"
    >
      <svg width="14" height="14" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M18 3C18 3 10 14 10 20C10 24.4 13.6 28 18 28C22.4 28 26 24.4 26 20C26 14 18 3 18 3Z"
          fill="white" fillOpacity="0.9"
        />
        <circle cx="18" cy="20" r="4" fill="white" fillOpacity="0.7" />
      </svg>
    </div>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  gmail: 'Gmail',
  drive: 'Drive',
  calendar: 'Calendar',
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[70%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-text-primary"
          style={{ backgroundColor: '#E8F0FE' }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start">
      <GeminiIcon />
      <div className="flex flex-col gap-1 max-w-[75%]">
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-text-primary whitespace-pre-wrap"
          style={{ backgroundColor: '#F8F9FA' }}
        >
          {message.content}
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="flex gap-2 px-1">
            {message.sources.map((source) => (
              <span
                key={source}
                className="text-xs text-text-muted bg-surface-medium px-2 py-0.5 rounded-full"
              >
                {SOURCE_LABELS[source] || source}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
