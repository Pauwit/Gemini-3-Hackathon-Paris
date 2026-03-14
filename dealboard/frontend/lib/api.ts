/**
 * api.ts — Frontend API client.
 * All fetch calls to the backend go through here.
 * Credentials (cookies) are always included for session auth.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok && res.status !== 401 && res.status !== 400) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Status
  getStatus: () => request<any>('/api/status'),

  // Settings
  saveGeminiKey: (geminiApiKey: string) =>
    request<any>('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ geminiApiKey }),
    }),

  getSettings: () => request<any>('/api/settings'),

  // Chat
  sendMessage: (message: string) =>
    request<any>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // Insights
  getInsights: () => request<any>('/api/insights'),

  // Scanner
  triggerScan: () =>
    request<any>('/api/scanner/trigger', { method: 'POST' }),

  // Visio
  createMeet: () =>
    request<any>('/api/visio/create-meet', { method: 'POST' }),

  // Auth
  logout: () =>
    request<any>('/auth/logout', { method: 'POST' }),
};
