// ============================================================
// lib/hooks/useSpeechRecognition.ts — Browser Speech Transcript Hook
// ============================================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechSource = 'speech' | 'manual' | 'system';

interface SpeechRecognitionResultPayload {
  text: string;
  speaker: string;
  source: SpeechSource;
}

interface UseSpeechRecognitionOptions {
  speaker: string;
  onFinalText: (payload: SpeechRecognitionResultPayload) => void;
  onError?: (error: Error) => void;
}

interface UseSpeechRecognitionResult {
  isSupported: boolean;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
}

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }

  interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: {
      [index: number]: {
        isFinal: boolean;
        [altIndex: number]: {
          transcript: string;
        };
      };
      length: number;
    };
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
  }
}

export function useSpeechRecognition({
  speaker,
  onFinalText,
  onError,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldAutoRestartRef = useRef(false);

  const SpeechRecognitionCtor =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : undefined;

  const isSupported = Boolean(SpeechRecognitionCtor);

  useEffect(() => {
    if (!SpeechRecognitionCtor) {
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result?.isFinal) {
          continue;
        }

        const transcript = String(result[0]?.transcript || '').trim();
        if (!transcript) {
          continue;
        }

        onFinalText({
          text: transcript,
          speaker,
          source: 'speech',
        });
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      shouldAutoRestartRef.current = false;
      onError?.(new Error(event.message || event.error || 'Speech recognition failed'));
    };

    recognition.onend = () => {
      setIsListening(false);
      if (shouldAutoRestartRef.current) {
        try {
          recognition.start();
          setIsListening(true);
        } catch {
          shouldAutoRestartRef.current = false;
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldAutoRestartRef.current = false;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, [SpeechRecognitionCtor, onError, onFinalText, speaker]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) {
      return;
    }

    shouldAutoRestartRef.current = true;

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      shouldAutoRestartRef.current = false;
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    shouldAutoRestartRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return {
    isSupported,
    isListening,
    startListening,
    stopListening,
  };
}

export default useSpeechRecognition;
