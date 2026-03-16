/**
 * SettingsPanel.tsx — Settings panel for managing integrations.
 */

'use client';

import { useState } from 'react';
import { UserStatus } from '@/lib/types';
import { api } from '@/lib/api';

interface SettingsPanelProps {
  status: UserStatus | null;
  onStatusChange: () => void;
}

function ConnectionItem({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span className="text-[14px] text-ink font-medium">{label}</span>
      <div
        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
        style={connected
          ? { background: 'rgba(52,168,83,0.12)', color: '#81C995', border: '1px solid rgba(52,168,83,0.25)' }
          : { background: 'rgba(234,67,53,0.10)', color: '#FF8A80', border: '1px solid rgba(234,67,53,0.22)' }
        }
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: connected ? '#52C77F' : '#FF8A80' }} />
        {connected ? 'Active' : 'Missing'}
      </div>
    </div>
  );
}

export default function SettingsPanel({ status, onStatusChange }: SettingsPanelProps) {
  const [geminiKey,    setGeminiKey]    = useState('');
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState('');
  const [saveSuccess,  setSaveSuccess]  = useState(false);

  const handleSaveKey = async () => {
    if (!geminiKey.trim()) return;
    setSaving(true); setSaveError(''); setSaveSuccess(false);
    try {
      const res = await api.saveGeminiKey(geminiKey.trim());
      if (res.success) { setSaveSuccess(true); setGeminiKey(''); onStatusChange(); }
      else setSaveError(res.error || 'Failed to save API key.');
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save API key.');
    } finally { setSaving(false); }
  };

  const isGeminiConnected = status?.gemini?.connected ?? false;
  const isGoogleConnected = status?.google?.connected ?? false;

  const glassPanelStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
  };

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto p-8 fade-up">
      {/* Header */}
      <div>
        <h2 className="text-[24px] font-bold text-ink tracking-tight">Settings</h2>
        <p className="text-[14px] text-muted mt-1.5">Manage your AI workspace connections and platform security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Google Workspace Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(154,160,166,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(154,160,166,0.8)', letterSpacing: '0.08em' }}>Workspace Access</h3>
          </div>

          <div style={glassPanelStyle} className="overflow-hidden">
            {/* Profile header */}
            <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center gap-3">
                {status?.google?.avatar ? (
                  <img src={status.google.avatar} alt="" className="w-12 h-12 rounded-full" style={{ boxShadow: '0 0 0 2px rgba(66,133,244,0.4)' }} referrerPolicy="no-referrer"/>
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ background: 'linear-gradient(135deg,#4285F4,#9334E6)' }}>
                    {status?.google?.name?.[0] || 'U'}
                  </div>
                )}
                <div>
                  <div className="text-[15px] font-bold text-ink">{status?.google?.name || 'User'}</div>
                  <div className="text-[12px] text-muted">{status?.google?.email || 'Not connected'}</div>
                </div>
              </div>
            </div>
            <div className="p-5 flex flex-col">
              <ConnectionItem label="Gmail"           connected={isGoogleConnected} />
              <ConnectionItem label="Google Drive"    connected={isGoogleConnected} />
              <ConnectionItem label="Google Calendar" connected={isGoogleConnected} />
            </div>
          </div>
        </div>

        {/* Gemini AI Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="grad-text" style={{ fontSize: 16, lineHeight: 1 }}>✦</span>
            <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(154,160,166,0.8)', letterSpacing: '0.08em' }}>AI Integration</h3>
          </div>

          <div style={glassPanelStyle} className="overflow-hidden flex flex-col h-full">
            <div className="p-5 flex-1 flex flex-col gap-5">
              {/* Gemini status row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.2)' }}
                  >
                    <span className="grad-text" style={{ fontSize: 16, lineHeight: 1 }}>✦</span>
                  </div>
                  <span className="text-[15px] font-bold text-ink">Gemini API</span>
                </div>
                <div
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                  style={isGeminiConnected
                    ? { background: 'rgba(66,133,244,0.12)', color: '#8AB4F8', border: '1px solid rgba(66,133,244,0.25)' }
                    : { background: 'rgba(255,255,255,0.05)', color: '#9AA0A6', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
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
                      className="text-[11px] font-bold underline transition-colors"
                      style={{ color: '#8AB4F8' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#4285F4'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#8AB4F8'; }}
                    >
                      Get Key from AI Studio
                    </a>
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-xl px-4 py-3 text-[14px] text-ink outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: '#E8EAED',
                    }}
                    placeholder="AIza..."
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                    onFocus={e => {
                      e.target.style.borderColor = 'rgba(66,133,244,0.5)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(66,133,244,0.12)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.10)';
                      e.target.style.boxShadow = 'none';
                    }}
                    disabled={saving}
                  />
                </div>

                {saveError && (
                  <div className="rounded-xl px-4 py-3 text-[12px] font-medium" style={{ background: 'rgba(234,67,53,0.10)', color: '#FF8A80', border: '1px solid rgba(234,67,53,0.2)' }}>
                    {saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div className="rounded-xl px-4 py-3 text-[12px] font-medium" style={{ background: 'rgba(52,168,83,0.10)', color: '#81C995', border: '1px solid rgba(52,168,83,0.2)' }}>
                    Key saved and validated!
                  </div>
                )}

                <button
                  onClick={handleSaveKey}
                  disabled={!geminiKey.trim() || saving}
                  className="w-full flex items-center justify-center py-3 rounded-xl text-[14px] font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ background: 'linear-gradient(135deg,#4285F4,#9334E6)', boxShadow: '0 2px 10px rgba(66,133,244,0.2)' }}
                >
                  {saving ? (
                    <><span className="spin mr-2">↻</span>Validating…</>
                  ) : 'Save & Validate'}
                </button>
              </div>
            </div>

            <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(66,133,244,0.04)' }}>
              <p className="text-[11px] leading-relaxed font-medium" style={{ color: 'rgba(138,180,248,0.6)' }}>
                Your API key is used locally to power the insights generator and the chat companion. It is never stored in plain text.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Security footer */}
      <div className="flex items-center justify-center pt-4">
        <div className="flex items-center gap-6 text-[12px] font-medium text-subtle">
          {['End-to-end processing', 'GDPR Compliant', 'Secured via OAuth 2.0'].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4285F4' }} />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
