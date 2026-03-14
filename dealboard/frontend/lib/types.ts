/**
 * types.ts — Shared TypeScript types for the DealBoard frontend.
 */

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export interface UserStatus {
  google: {
    connected: boolean;
    email?: string;
    name?: string;
    avatar?: string;
  };
  gemini: {
    connected: boolean;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  sources?: string[];
  timestamp: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// --- Insight types ---

export interface PersonInsight {
  name: string;
  title: string;
  company: string;
  lastContact: string; // YYYY-MM-DD
  summary: string;
  keyConcerns: string[];
  upcomingInteractions: string[];
}

export interface ProjectInsight {
  name: string;
  status: 'on track' | 'at risk' | 'blocked' | 'completed';
  summary: string;
  nextActions: string[];
  relatedPeople: string[];
}

export interface AdviceInsight {
  priority: 'high' | 'medium' | 'low';
  advice: string;
  reason: string;
  relatedTo: string;
}

export interface CalendarInsight {
  title: string;
  start: string;
  attendees: string[];
  aiContext: string;
}

export interface MeetingSummary {
  title: string;
  date: string;
  participants: string[];
  summary: string;
}

export interface Insights {
  people: PersonInsight[];
  projects: ProjectInsight[];
  advice: AdviceInsight[];
  calendar: CalendarInsight[];
  meetingSummaries: MeetingSummary[];
  lastScanTime: string | null;
}
