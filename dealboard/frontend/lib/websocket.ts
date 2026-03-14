// ============================================================
// lib/websocket.ts — WebSocket Client with Reconnection
// ============================================================
//
// PURPOSE:
// Manages the WebSocket connection to the DealBoard server.
// Provides typed send/receive API, automatic reconnection with
// exponential backoff, and per-message-type event handlers.
// Silently ignores unknown message types per PROTOCOL.md.
//
// DATA FLOW:
// WebSocketClient.connect() → ws://localhost:3001/ws
// WebSocketClient.send(type, payload) → server
// server → message → dispatch to registered handlers by type
//
// PROTOCOL REFERENCE: PROTOCOL.md sections 1, 2, 3, 8
//
// DEPENDENCIES:
//   ./config — WS_URL, RECONNECT_INTERVAL_MS, RECONNECT_MAX_INTERVAL_MS
// ============================================================

import { config } from './config';
import type { WsEnvelope } from './types';

type MessageHandler = (payload: unknown) => void;

export class WebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay: number;
  private shouldReconnect = false;
  private _status: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private onStatusChange: ((status: WebSocketClient['status']) => void) | null = null;

  constructor(url: string = config.WS_URL) {
    this.url = url;
    this.reconnectDelay = config.RECONNECT_INTERVAL_MS;
  }

  get status(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    return this._status;
  }

  private setStatus(s: WebSocketClient['status']) {
    this._status = s;
    this.onStatusChange?.(s);
  }

  /**
   * connect — opens the WebSocket connection
   */
  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.shouldReconnect = true;
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      console.error('[WebSocketClient] Failed to create WebSocket:', err);
      this.setStatus('error');
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[WebSocketClient] Connected to', this.url);
      this.setStatus('connected');
      this.reconnectDelay = config.RECONNECT_INTERVAL_MS; // reset backoff
    };

    this.ws.onclose = (event) => {
      console.log('[WebSocketClient] Disconnected', { code: event.code, reason: event.reason });
      this.setStatus('disconnected');
      this.ws = null;
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      console.error('[WebSocketClient] WebSocket error', event);
      this.setStatus('error');
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * disconnect — closes the connection and stops reconnection
   */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  /**
   * send — sends a typed message envelope to the server
   * @param type - Message type string (per PROTOCOL.md section 2)
   * @param payload - Message payload object
   */
  send(type: string, payload: object): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocketClient] Cannot send — not connected. Type:', type);
      return;
    }

    const envelope: WsEnvelope = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    this.ws.send(JSON.stringify(envelope));
  }

  /**
   * on — registers a handler for a specific message type
   * @param type - Message type to listen for
   * @param handler - Callback receiving the payload
   */
  on(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  /**
   * off — removes a previously registered handler
   * @param type - Message type
   * @param handler - The exact handler function to remove
   */
  off(type: string, handler: MessageHandler): void {
    const existing = this.handlers.get(type);
    if (existing) {
      this.handlers.set(type, existing.filter(h => h !== handler));
    }
  }

  /**
   * onStatus — registers a callback for status changes
   */
  onStatusChanged(callback: (status: WebSocketClient['status']) => void): void {
    this.onStatusChange = callback;
  }

  // ── Private ─────────────────────────────────────────────────

  private handleMessage(data: string): void {
    let envelope: WsEnvelope;
    try {
      envelope = JSON.parse(data);
    } catch {
      console.warn('[WebSocketClient] Failed to parse message:', data.substring(0, 100));
      return;
    }

    const { type, payload } = envelope;

    if (!type) {
      console.warn('[WebSocketClient] Message missing type field');
      return;
    }

    const handlers = this.handlers.get(type);
    if (!handlers || handlers.length === 0) {
      // Silently ignore unknown types per PROTOCOL.md
      return;
    }

    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[WebSocketClient] Handler error for type "${type}":`, err);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    console.log(`[WebSocketClient] Reconnecting in ${this.reconnectDelay}ms...`);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.shouldReconnect) {
        this.connect();
        // Exponential backoff with max cap
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2,
          config.RECONNECT_MAX_INTERVAL_MS
        );
      }
    }, this.reconnectDelay);
  }
}
