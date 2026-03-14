/**
 * SettingsPanel.tsx — Settings panel for managing integrations.
 * Shows Google connection status and lets the user add their Gemini API key.
 */

'use client';

import { useState } from 'react';
import { UserStatus } from '@/lib/types';
import { api } from '@/lib/api';

interface SettingsPanelProps {
  status: UserStatus | null;
  onStatusChange: () => void;
}

function ConnectionItem({
  label,
  connected,
}: {
  label: string;
  connected: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-[14px] text-ink font-medium">{label}</span>
      </div>
      <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
        connected 
          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
          : 'bg-red-50 text-red-600 border border-red-100'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
        {connected ? 'Active' : 'Missing'}
      </div>
    </div>
  );
}

export default function SettingsPanel({ status, onStatusChange }: SettingsPanelProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveKey = async () => {
    if (!geminiKey.trim()) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const res = await api.saveGeminiKey(geminiKey.trim());
      if (res.success) {
        setSaveSuccess(true);
        setGeminiKey('');
        onStatusChange(); // refresh status in parent
      } else {
        setSaveError(res.error || 'Failed to save API key.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save API key.');
    } finally {
      setSaving(false);
    }
  };

  const isGeminiConnected = status?.gemini?.connected ?? false;
  const isGoogleConnected = status?.google?.connected ?? false;

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto p-8 fade-up">
      {/* Header */}
      <div>
        <h2 className="text-[24px] font-extrabold text-ink tracking-tight">
          Settings
        </h2>
        <p className="text-[14px] text-muted mt-1.5">Manage your AI workspace connections and platform security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Google Workspace Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🛠️</span>
            <h3 className="text-[13px] font-bold text-ink uppercase tracking-wider">Workspace Access</h3>
          </div>
          
          <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
            {/* Profile Header */}
            <div className="bg-slate-50 border-b border-border p-5">
              <div className="flex items-center gap-3">
                {status?.google?.avatar ? (
                  <img src={status.google.avatar} alt="" className="w-12 h-12 rounded-full ring-2 ring-white shadow-sm" referrerPolicy="no-referrer"/>
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
                    {status?.google?.name?.[0] || 'U'}
                  </div>
                )}
                <div>
                  <div className="text-[15px] font-bold text-ink">{status?.google?.name || 'User'}</div>
                  <div className="text-[12px] text-muted">{status?.google?.email || 'Not connected'}</div>
                </div>
              </div>
            </div>
            
            {/* Status Items */}
            <div className="p-5 flex flex-col">
              <ConnectionItem label="Gmail" connected={isGoogleConnected} />
              <ConnectionItem label="Google Drive" connected={isGoogleConnected} />
              <ConnectionItem label="Google Calendar" connected={isGoogleConnected} />
            </div>
          </div>
        </div>

        {/* Gemini AI Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">✨</span>
            <h3 className="text-[13px] font-bold text-ink uppercase tracking-wider">AI Integration</h3>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden flex flex-col h-full">
            {/* Gemini Status Card */}
            <div className="p-5 flex-1 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50">
                    <span className="text-lg">✦</span>
                  </div>
                  <span className="text-[15px] font-bold text-ink">Gemini API</span>
                </div>
                <div className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isGeminiConnected 
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                  {isGeminiConnected ? 'CONNECTED' : 'NOT SET'}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-ink flex items-center justify-between">
                    {isGeminiConnected ? 'Update API Key' : 'Enter API Key'}
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold underline"
                    >
                      Get Key from AI Studio
                    </a>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-subtle"
                      placeholder="AIza..."
                      value={geminiKey}
                      onChange={e => setGeminiKey(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                      disabled={saving}
                    />
                  </div>
                </div>

                {saveError && (
                  <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl px-4 py-3 text-[12px] font-medium">
                    {saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl px-4 py-3 text-[12px] font-medium">
                    Key saved and validated!
                  </div>
                )}

                <button
                  onClick={handleSaveKey}
                  disabled={!geminiKey.trim() || saving}
                  className="w-full flex items-center justify-center py-3 rounded-xl text-[14px] font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
                >
                  {saving ? (
                    <>
                      <span className="spin mr-2">↻</span>
                      Validating…
                    </>
                  ) : (
                    'Save & Validate'
                  )}
                </button>
              </div>
            </div>

            <div className="bg-indigo-50/30 px-5 py-4 border-t border-indigo-100/50">
              <p className="text-[11px] text-indigo-700/70 leading-relaxed font-medium">
                Your API key is used locally to power the insights generator and the chat companion. It is never stored in plain text.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Advanced Security / Info Footer */}
      <div className="flex items-center justify-center pt-4 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
        <div className="flex items-center gap-6 text-[12px] font-semibold text-muted">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            End-to-end processing
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            GDPR Compliant
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Secured via OAuth 2.0
          </div>
        </div>
      </div>
    </div>
  );
}
