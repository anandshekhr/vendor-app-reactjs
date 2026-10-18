import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, RotateCcw, Send } from 'lucide-react';
import { Button, Card, Input, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchInput } from '@/components/forms/SearchInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useAppSelector } from '@/hooks/store';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { errorMessage } from '@/services/api/errors';
import { formatRelative, formatTime, initials } from '@/utils/format';
import { cn } from '@/utils/cn';
import { uuid } from '@/utils/id';
import { CHAT_POLL_MS, useListMessagesQuery, useListRoomsQuery, useSendMessageMutation } from './api';

interface OutgoingMessage {
  localId: string;
  text: string;
  status: 'sending' | 'failed';
  error?: string;
}

function Conversation({ roomId, title }: { roomId: string; title: string }) {
  const userId = useAppSelector((s) => s.auth.userId);
  const online = useOnlineStatus();
  const { data, isLoading, error, refetch } = useListMessagesQuery(roomId, { pollingInterval: CHAT_POLL_MS, skipPollingIfUnfocused: true });
  const [send] = useSendMessageMutation();
  const [draft, setDraft] = useState('');
  const [outbox, setOutbox] = useState<OutgoingMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [data, outbox]);

  const deliver = async (msg: OutgoingMessage) => {
    setOutbox((o) => o.map((m) => (m.localId === msg.localId ? { ...m, status: 'sending', error: undefined } : m)));
    try {
      await send({ roomId, message: msg.text }).unwrap();
      setOutbox((o) => o.filter((m) => m.localId !== msg.localId));
    } catch (err) {
      setOutbox((o) => o.map((m) => (m.localId === msg.localId ? { ...m, status: 'failed', error: errorMessage(err) } : m)));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const msg: OutgoingMessage = { localId: uuid(), text, status: 'sending' };
    setOutbox((o) => [...o, msg]);
    setDraft('');
    void deliver(msg);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Link to="/chat" className="lg:hidden" aria-label="Back to inbox">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{initials(title)}</span>
        <p className="font-medium">{title}</p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto bg-ink/[0.02] p-4" aria-live="polite">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} title="Messages could not be loaded" />
        ) : (data ?? []).length === 0 && outbox.length === 0 ? (
          <EmptyState title="No messages yet" description="Say hello to your customer." />
        ) : (
          <>
            {(data ?? []).map((m) => {
              const mine = m.sender === userId;
              return (
                <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm', mine ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm border border-line bg-surface')}>
                    <p className="whitespace-pre-wrap break-words">{m.message}</p>
                    <p className={cn('mt-0.5 text-[10px]', mine ? 'text-brand-100' : 'text-ink-subtle')}>
                      {formatTime(m.created_at)}
                      {mine && (m.is_read ? ' · Read' : ' · Sent')}
                    </p>
                  </div>
                </div>
              );
            })}
            {outbox.map((m) => (
              <div key={m.localId} className="flex justify-end">
                <div className={cn('max-w-[75%] rounded-2xl rounded-br-sm px-3 py-2 text-sm', m.status === 'failed' ? 'border border-red-300 bg-red-50 text-red-900' : 'bg-brand-600/70 text-white')}>
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  {m.status === 'sending' ? (
                    <p className="mt-0.5 text-[10px]">Sending…</p>
                  ) : (
                    <button type="button" className="mt-1 inline-flex items-center gap-1 text-xs font-medium underline" onClick={() => deliver(m)}>
                      <RotateCcw className="h-3 w-3" /> Failed — retry
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={online ? 'Type a message' : 'You are offline'} aria-label="Message" maxLength={2000} disabled={!online} />
        <Button type="submit" disabled={!draft.trim() || !online} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

export function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const rooms = useListRoomsQuery(undefined, { pollingInterval: CHAT_POLL_MS * 2, skipPollingIfUnfocused: true });
  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = [...(rooms.data ?? [])].sort((a, b) => new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime());
    return term ? all.filter((r) => (r.customer_name ?? '').toLowerCase().includes(term)) : all;
  }, [rooms.data, search]);
  const active = list.find((r) => r.id === conversationId);

  return (
    <>
      <PageHeader title="Messages" description="Conversations with your customers." />
      <BackendGap className="mb-4" gap="G-13" title="Chat backend is incomplete">
        Messages refresh every {Math.round(CHAT_POLL_MS / 1000)}s (no real-time server). Some message endpoints currently fail on the server; errors are shown instead of hiding them. Attachments and order-linked threads are not supported yet.
      </BackendGap>
      <Card className="grid h-[calc(100vh-17rem)] min-h-[420px] overflow-hidden lg:grid-cols-[320px_1fr]">
        <div className={cn('flex min-h-0 flex-col border-r border-line', conversationId && 'hidden lg:flex')}>
          <div className="border-b border-line p-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search conversations" className="w-full" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {rooms.isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : rooms.error ? (
              <ErrorState error={rooms.error} onRetry={rooms.refetch} title="Chat service unavailable" />
            ) : list.length === 0 ? (
              <EmptyState icon={<MessageSquare className="h-5 w-5" />} title="No conversations" description="Customers can message you from the TheNearByShop app." />
            ) : (
              <ul>
                {list.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/chat/${r.id}`)}
                      className={cn('flex w-full items-center gap-3 border-b border-line px-3 py-3 text-left hover:bg-ink/[0.03]', r.id === conversationId && 'bg-brand-50/60 dark:bg-brand-900/10')}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/5 text-xs font-semibold">{initials(r.customer_name)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{r.customer_name || 'Customer'}</span>
                          <span className="shrink-0 text-[11px] text-ink-subtle">{r.last_message_at ? formatRelative(r.last_message_at) : ''}</span>
                        </span>
                        {r.last_message && <span className="block truncate text-xs text-ink-muted">{r.last_message}</span>}
                      </span>
                      {r.unread_count ? <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">{r.unread_count}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className={cn('min-h-0', !conversationId && 'hidden lg:block')}>
          {conversationId ? (
            <Conversation roomId={conversationId} title={active?.customer_name || 'Customer'} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState icon={<MessageSquare className="h-5 w-5" />} title="Select a conversation" />
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
