import { config } from '@/constants/config';
import { refreshAccessToken } from '@/services/api/client';
import { tokenStorage } from '@/services/auth/tokenStorage';
import type { ChatMessage } from '@/types/api';

export type ChatSocketEvent =
  | { type: 'chat.message'; message: ChatMessage }
  | { type: 'chat.typing'; user_id: number; is_typing: boolean }
  | { type: 'chat.read'; message_ids: string[]; read_by: number }
  | { type: 'chat.presence'; user_id: number; online: boolean }
  | { type: 'chat.closed'; thread_id: string }
  | { type: 'error'; detail: string };

export type SocketStatus = 'connecting' | 'open' | 'closed' | 'unauthorized' | 'unavailable';

/** ws(s)://<api host>/ws/chat/<thread>/ — derived from VITE_WS_BASE_URL or the API origin. */
export function chatSocketUrl(threadId: string, token: string, base = config.wsBaseUrl): string {
  return `${base}/ws/chat/${encodeURIComponent(threadId)}/?token=${encodeURIComponent(token)}`;
}

const NON_RETRYABLE = new Set([4401, 4403, 4404]);

/**
 * One socket per open conversation. Reconnects with capped exponential backoff; stops on auth/permission close codes
 * (4401/4403/4404 from apps.chat.consumers).
 */
export class ChatSocket {
  private ws: WebSocket | null = null;
  private attempts = 0;
  private timer: number | null = null;
  private stopped = false;

  constructor(
    private threadId: string,
    private onEvent: (e: ChatSocketEvent) => void,
    private onStatus: (s: SocketStatus) => void,
    private WebSocketImpl: typeof WebSocket = WebSocket,
  ) {}

  async connect() {
    if (this.stopped || !config.wsBaseUrl) {
      this.onStatus('unavailable');
      return;
    }
    let token = tokenStorage.getAccess();
    if (!token) token = await refreshAccessToken();
    if (!token) {
      this.onStatus('unauthorized');
      return;
    }
    this.onStatus('connecting');
    const ws = new this.WebSocketImpl(chatSocketUrl(this.threadId, token));
    this.ws = ws;
    ws.onopen = () => {
      this.attempts = 0;
      this.onStatus('open');
    };
    ws.onmessage = (ev) => {
      try {
        this.onEvent(JSON.parse(String(ev.data)) as ChatSocketEvent);
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onclose = (ev) => {
      this.ws = null;
      if (this.stopped) return;
      if (NON_RETRYABLE.has(ev.code)) {
        this.onStatus(ev.code === 4401 ? 'unauthorized' : 'unavailable');
        return;
      }
      this.onStatus('closed');
      const delay = Math.min(30000, 1000 * 2 ** this.attempts++);
      this.timer = window.setTimeout(() => void this.connect(), delay);
    };
  }

  send(payload: { type: 'typing'; is_typing: boolean } | { type: 'read' }) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(payload));
  }

  close() {
    this.stopped = true;
    if (this.timer) window.clearTimeout(this.timer);
    this.ws?.close(1000);
    this.ws = null;
  }
}
