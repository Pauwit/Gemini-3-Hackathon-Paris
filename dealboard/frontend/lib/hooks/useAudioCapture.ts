// ============================================================
// lib/hooks/useAudioCapture.ts — Browser Audio Capture Hook
// ============================================================
//
// PURPOSE:
// Captures microphone audio in the browser using Web Audio API
// and MediaRecorder. Produces base64-encoded PCM chunks at
// AUDIO_CHUNK_INTERVAL_MS intervals for sending via WebSocket.
//
// DATA FLOW:
// navigator.mediaDevices.getUserMedia → MediaRecorder
//   → audio chunks at 250ms intervals
//   → onChunk callback (base64 PCM, sampleRate, channels, index)
//   → WebSocketProvider.sendAudioChunk()
//
// PROTOCOL REFERENCE: PROTOCOL.md section 2 (audio-chunk payload)
// DEPENDENCIES: Web Audio API, config.AUDIO_CHUNK_INTERVAL_MS
// ============================================================

'use client';

import { useRef, useState, useCallback } from 'react';
import { config } from '../config';

interface UseAudioCaptureOptions {
  onChunk: (data: string, sampleRate: number, channels: number, chunkIndex: number) => void;
  onError?: (error: Error) => void;
}

interface UseAudioCaptureResult {
  isCapturing: boolean;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  permissionState: 'unknown' | 'granted' | 'denied';
}

/**
 * useAudioCapture
 * Manages browser microphone capture and produces audio chunks.
 *
 * @param options.onChunk - Called for each audio chunk (base64 PCM)
 * @param options.onError - Called on capture errors
 * @returns { isCapturing, startCapture, stopCapture, permissionState }
 *
 * @example
 * const { startCapture, stopCapture, isCapturing } = useAudioCapture({
 *   onChunk: (data, sr, ch, idx) => sendAudioChunk(data, sr, ch, idx)
 * });
 */
export function useAudioCapture({ onChunk, onError }: UseAudioCaptureOptions): UseAudioCaptureResult {
  const [isCapturing, setIsCapturing] = useState(false);
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkIndexRef = useRef(0);

  const startCapture = useCallback(async () => {
    if (isCapturing) return;

    try {
      // TODO: Request microphone permission
      // TODO: navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } })
      // TODO: Create MediaRecorder with audio/webm;codecs=pcm or audio/wav
      // TODO: On dataavailable: convert blob to base64, call onChunk
      // TODO: Start recording with timeslice: config.AUDIO_CHUNK_INTERVAL_MS
      // TODO: Set permissionState = 'granted'

      console.warn('[useAudioCapture] startCapture — TODO: implement Web Audio API capture');
      setPermissionState('granted');
      setIsCapturing(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Audio capture failed');
      if (error.message.includes('Permission') || error.message.includes('NotAllowed')) {
        setPermissionState('denied');
      }
      onError?.(error);
      console.error('[useAudioCapture] Error:', error.message);
    }
  }, [isCapturing, onChunk, onError]);

  const stopCapture = useCallback(() => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
    chunkIndexRef.current = 0;
    setIsCapturing(false);
  }, []);

  return { isCapturing, startCapture, stopCapture, permissionState };
}
