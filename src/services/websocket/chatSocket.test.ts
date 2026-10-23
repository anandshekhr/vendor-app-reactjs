import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/services/auth/tokenStorage';
import { ChatSocket, chatSocketUrl, type SocketStatus } from './chatSocket';

vi.mock('@/constants/config', async (orig) => {
  const mod = await orig<typeof import('@/constants/config')>();
  return { config: { ...mod.config, wsBaseUrl: 'wss://api.example.com' } };
});

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {}
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
}

afterEach(() => {
  FakeWebSocket.instances = [];
  vi.useRealTimers();
});

describe('chat socket', () => {
  it('builds the Channels URL with the JWT', () => {
    expect(chatSocketUrl('abc', 't o', 'wss://api.example.com')).toBe('wss://api.example.com/ws/chat/abc/?token=t%20o');
  });

  it('connects, relays events, and reconnects after a drop but not after a permission close', async () => {
    vi.useFakeTimers();
    tokenStorage.setAccess('jwt');
    const events: unknown[] = [];
    const statuses: SocketStatus[] = [];
    const socket = new ChatSocket('t1', (e) => events.push(e), (s) => statuses.push(s), FakeWebSocket as unknown as typeof WebSocket);
    await socket.connect();
    const ws = FakeWebSocket.instances[0];
    expect(ws.url).toBe('wss://api.example.com/ws/chat/t1/?token=jwt');
    ws.open();
    ws.onmessage?.({ data: JSON.stringify({ type: 'chat.typing', user_id: 2, is_typing: true }) });
    socket.send({ type: 'read' });
    expect(events).toEqual([{ type: 'chat.typing', user_id: 2, is_typing: true }]);
    expect(ws.sent).toEqual([JSON.stringify({ type: 'read' })]);

    ws.onclose?.({ code: 1006 });
    await vi.advanceTimersByTimeAsync(1100);
    expect(FakeWebSocket.instances).toHaveLength(2);

    FakeWebSocket.instances[1].onclose?.({ code: 4403 });
    await vi.advanceTimersByTimeAsync(60000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(statuses).toContain('unavailable');
    socket.close();
  });
});
