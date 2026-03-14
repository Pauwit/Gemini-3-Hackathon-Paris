/**
 * dashboard/page.tsx — Main dashboard shell.
 * Handles auth check and renders the active panel (Dashboard, Chat, or Settings).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserStatus } from '@/lib/types';
import { api } from '@/lib/api';
import StatusBar from './components/StatusBar';
import Sidebar, { Page } from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import SettingsPanel from './components/SettingsPanel';
import DashboardPanel from './components/DashboardPanel';
import VisioPanel from './components/VisioPanel';

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.getStatus();
      if (res.success) {
        setStatus(res.data);
        if (!res.data.google.connected) {
          router.replace('/');
        }
      }
    } catch {
      router.replace('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      router.replace('/');
    }
  };

  const handleRefresh = useCallback(async () => {
    setScanning(true);
    try {
      await api.triggerScan();
      const res = await api.getInsights();
      if (res.success) setLastScanTime(res.data.lastScanTime);
    } finally {
      setScanning(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="flex gap-1.5">
          <span className="dot" style={{ background: '#6366F1' }}/>
          <span className="dot" style={{ background: '#8B5CF6' }}/>
          <span className="dot" style={{ background: '#EC4899' }}/>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-canvas">
      <StatusBar status={status} onLogout={handleLogout} />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          lastScanTime={lastScanTime}
          onRefresh={handleRefresh}
          scanning={scanning}
        />

        <main className="flex-1 min-h-0 overflow-hidden">
          {currentPage === 'dashboard' && (
            <DashboardPanel
              geminiConnected={status?.gemini?.connected ?? false}
              onNeedSettings={() => setCurrentPage('settings')}
            />
          )}
          {currentPage === 'chat' && (
            <ChatPanel
              geminiConnected={status?.gemini?.connected ?? false}
              onNeedSettings={() => setCurrentPage('settings')}
            />
          )}
          {currentPage === 'visio' && (
            <VisioPanel />
          )}
          {currentPage === 'settings' && (
            <div className="h-full overflow-y-auto bg-canvas">
              <SettingsPanel status={status} onStatusChange={fetchStatus} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
