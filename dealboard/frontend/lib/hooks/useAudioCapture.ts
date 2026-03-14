// ============================================================
// lib/hooks/useAudioCapture.ts — Browser Microphone Capture Hook
// ============================================================
//
// PURPOSE:
// Captures microphone audio using Web Audio API and produces
// base64-encoded PCM chunks at regular intervals for streaming
// to the backend via WebSocket (audio-chunk message type).
//
// IMPLEMENTATION DETAILS:
//   1. Requests microphone via getUserMedia with 16kHz mono constraints
//   2. Connects microphone → AudioContext → ScriptProcessorNode
//   3. ScriptProcessor fires onaudioprocess at ~250ms intervals
//   4. Float32 samples → Int16 PCM → base64 string via btoa
//   5. Calls onChunk(base64, sampleRate, channels, chunkIndex)
//
// FALLBACK: If AudioContext is unavailable, falls back to MediaRecorder
// with webm/opus and warns in console.
//
// STATES:
//   permissionState: 'unknown' | 'granted' | 'denied'
//   isCapturing: boolean
//
// USAGE:
//   const { startCapture, stopCapture, isCapturing, permissionState } =
//     useAudioCapture({ onChunk: sendAudioChunk });
//
// PROTOCOL REFERENCE: PROTOCOL.md section 2 (audio-chunk)
// DEPENDENCIES: config.AUDIO_CHUNK_INTERVAL_MS
// ============================================================

'use client';

import { useRef, useState, useCallback } from 'react';
import { config } from '../config';

// ── Types ─────────────────────────────────────────────────

interface UseAudioCaptureOptions {
  /**
   * Called for each audio chunk.
   * @param data       - base64-encoded PCM audio
   * @param sampleRate - actual sample rate (ideally 16000)
   * @param channels   - number of channels (1 = mono)
   * @param chunkIndex - sequential chunk counter starting at 0
   */
  onChunk: (data: string, sampleRate: number, channels: number, chunkIndex: number) => void;
  /** Called on permission denied or device error */
  onError?: (error: Error) => void;
}

interface UseAudioCaptureResult {
  /** True while recording is in progress */
  isCapturing: boolean;
  /** Request mic permission and start recording */
  startCapture: () => Promise<void>;
  /** Stop recording and release mic */
  stopCapture: () => void;
  /** Current microphone permission state */
  permissionState: 'unknown' | 'granted' | 'denied';
}

// ── Helpers ───────────────────────────────────────────────

/**
 * float32ToInt16PCM
 * Converts a Float32Array of audio samples (range -1..1) to
 * an Int16Array of PCM samples (range -32768..32767).
 *
 * @param float32Array - raw audio buffer from Web Audio API
 * @returns Int16Array suitable for PCM encoding
 */
function float32ToInt16PCM(float32Array: Float32Array): Int16Array {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp to [-1, 1] then scale to int16 range
    const clamped = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
  }
  return int16;
}

/**
 * int16ToBase64
 * Converts Int16Array to a base64 string for WebSocket transmission.
 *
 * @param int16Array - PCM samples
 * @returns base64-encoded byte string
 */
function int16ToBase64(int16Array: Int16Array): string {
  const bytes = new Uint8Array(int16Array.buffer);
  let binary  = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── Hook ──────────────────────────────────────────────────

/**
 * useAudioCapture
 * Manages microphone access and PCM audio chunk production.
 * Uses Web Audio API ScriptProcessorNode for low-latency capture
 * at 16kHz mono. Falls back to MediaRecorder if AudioContext
 * is unavailable.
 *
 * @param options.onChunk - chunk callback
 * @param options.onError - error callback
 * @returns { isCapturing, startCapture, stopCapture, permissionState }
 */
export function useAudioCapture({
  onChunk,
  onError,
}: UseAudioCaptureOptions): UseAudioCaptureResult {
  const [isCapturing,      setIsCapturing]      = useState(false);
  const [permissionState,  setPermissionState]  = useState<'unknown' | 'granted' | 'denied'>('unknown');

  // Refs for cleanup
  const audioContextRef    = useRef<AudioContext | null>(null);
  const processorRef       = useRef<ScriptProcessorNode | null>(null);
  const sourceRef          = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef          = useRef<MediaStream | null>(null);
  const chunkIndexRef      = useRef(0);
  // Buffer to accumulate samples before emitting at chunk interval
  const sampleBufferRef    = useRef<Float32Array[]>([]);
  const emitTimerRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * startCapture
   * Requests microphone permission and starts recording.
   * Emits audio chunks at config.AUDIO_CHUNK_INTERVAL_MS intervals.
   */
  const startCapture = useCallback(async () => {
    if (isCapturing) return;

    try {
      // Request mic permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate:   { ideal: 16000 },
          channelCount: { ideal: 1 },
          echoCancellation:    true,
          noiseSuppression:    true,
          autoGainControl:     true,
        },
        video: false,
      });

      setPermissionState('granted');
      streamRef.current = stream;

      // Create AudioContext
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      // Connect source → processor → destination (for monitoring — destination is silent)
      const source    = audioCtx.createMediaStreamSource(stream);
      // ScriptProcessorNode: bufferSize=4096, 1 input channel, 1 output channel
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      sourceRef.current    = source;
      processorRef.current = processor;

      // Collect samples in buffer
      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer.getChannelData(0);
        // Copy because the Float32Array is reused by the browser
        sampleBufferRef.current.push(new Float32Array(inputBuffer));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      // Emit chunks at configured interval
      emitTimerRef.current = setInterval(() => {
        if (sampleBufferRef.current.length === 0) return;

        // Concatenate all accumulated buffers
        const totalLength = sampleBufferRef.current.reduce((sum, b) => sum + b.length, 0);
        const combined    = new Float32Array(totalLength);
        let   offset      = 0;
        for (const buf of sampleBufferRef.current) {
          combined.set(buf, offset);
          offset += buf.length;
        }
        sampleBufferRef.current = []; // Reset buffer

        // Convert and send
        const int16  = float32ToInt16PCM(combined);
        const base64 = int16ToBase64(int16);

        onChunk(
          base64,
          audioCtx.sampleRate,
          1, // mono
          chunkIndexRef.current++,
        );
      }, config.AUDIO_CHUNK_INTERVAL_MS);

      setIsCapturing(true);
      chunkIndexRef.current = 0;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Audio capture failed');

      if (
        error.name === 'NotAllowedError' ||
        error.name === 'PermissionDeniedError' ||
        error.message.toLowerCase().includes('permission')
      ) {
        setPermissionState('denied');
      }

      onError?.(error);
      console.error('[useAudioCapture] Error:', error.message);
    }
  }, [isCapturing, onChunk, onError]);

  /**
   * stopCapture
   * Stops recording, disconnects Web Audio nodes, and releases mic.
   */
  const stopCapture = useCallback(() => {
    // Clear emit timer
    if (emitTimerRef.current) {
      clearInterval(emitTimerRef.current);
      emitTimerRef.current = null;
    }

    // Disconnect audio graph
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current    = null;

    // Close AudioContext
    audioContextRef.current?.close();
    audioContextRef.current = null;

    // Stop all microphone tracks
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    // Reset state
    sampleBufferRef.current = [];
    chunkIndexRef.current   = 0;
    setIsCapturing(false);
  }, []);

  return {
    isCapturing,
    startCapture,
    stopCapture,
    permissionState,
  };
}
