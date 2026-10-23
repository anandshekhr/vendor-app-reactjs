import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCheck, ClipboardList, Lock, MessageSquare, Paperclip, RotateCcw, Send, Wifi, WifiOff, X } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Input, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchInput } from '@/components/forms/SearchInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useToast } from '@/hooks/useToast';
import { errorMessage } from '@/services/api/errors';
import { ChatSocket, type SocketStatus } from '@/services/websocket/chatSocket';
import { formatRelative, formatTime, initials } from '@/utils/format';
import { cn } from '@/utils/cn';
import { uuid } from '@/utils/id';
import type { ChatMessage, ChatThread } from '@/types/api';
import {
  CHAT_POLL_MS,
  chatApi,
  markMessagesRead,
  upsertMessage,
  useCloseThreadMutation,
  useListMessagesQuery,
  useListThreadsQuery,
  useMarkThreadReadMutation,
  useSendMessageMutation,
} from './api';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

interface OutgoingMessage {
  localId: string;
  text: string;
  file?: File;
  status: 'sending' | 'failed';
  error?: string;
}

function MessageBubble({ m, mine }: { m: ChatMessage; mine: boolean }) {
  if (m.message_type === 'SYSTEM') {
    return <p className="text-center text-xs text-ink-subtle">{m.message}</p>;
  }
  const att = m.attachment;
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm', mine ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm border border-line bg-surface')}>
        {m.reply_to && <p className={cn('mb-1 border-l-2 pl-2 text-xs', mine ? 'border-brand-200 text-brand-100' : 'border-line text-ink-subtle')}>{m.reply_to.message || 'Attachment'}</p>}
        {att?.url &&
          (m.message_type === 'IMAGE' ? (
            <a href={att.url} target="_blank" rel="noreferrer">
              <img src={att.url} alt={att.original_filename} className="mb-1 max-h-60 rounded-lg" loading="lazy" />
            </a>
          ) : (
            <a href={att.url} target="_blank" rel="noreferrer" className="mb-1 flex items-center gap-1 underline">
              <Paperclip className="h-3.5 w-3.5" /> {att.original_filename || 'Attachment'}
            </a>
          ))}
        {m.message && <p className="whitespace-pre-wrap break-words">{m.message}</p>}
        <p className={cn('mt-0.5 flex items-center justify-end gap-1 text-[10px]', mine ? 'text-brand-100' : 'text-ink-subtle')}>
          {formatTime(m.created_at)}
          {mine && (m.is_read ? <CheckCheck className="h-3 w-3" aria-label="Read" /> : <span>· Sent</span>)}
        </p>
      </div>
    </div>
  );
}

function Conversation({ thread }: { thread: ChatThread }) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const userId = useAppSelector((s) => s.auth.userId);
  const online = useOnlineStatus();
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('connecting');
  const [peerTyping, setPeerTyping] = useState(false);
  const realtime = socketStatus === 'open';
  const { data, isLoading, error, refetch } = useListMessagesQuery(thread.id, {
    pollingInterval: realtime ? 0 : CHAT_POLL_MS,
    skipPollingIfUnfocused: true,
  });
  const [send] = useSendMessageMutation();
  const [markRead] = useMarkThreadReadMutation();
  const [closeThread, closeState] = useCloseThreadMutation();
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [outbox, setOutbox] = useState<OutgoingMessage[]>([]);
  const [confirmClose, setConfirmClose] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ChatSocket | null>(null);
  const typingTimer = useRef<number | null>(null);
  const closed = thread.status !== 'ACTIVE';

  useEffect(() => {
    const socket = new ChatSocket(
      thread.id,
      (event) => {
        if (event.type === 'chat.message') {
          dispatch(upsertMessage(thread.id, event.message));
          dispatch(chatApi.util.invalidateTags([{ type: 'Chat', id: 'THREADS' }]));
          if (event.message.sender.id !== userId) socket.send({ type: 'read' });
        } else if (event.type === 'chat.typing' && event.user_id !== userId) {
          setPeerTyping(event.is_typing);
        } else if (event.type === 'chat.read' && event.read_by !== userId) {
          dispatch(markMessagesRead(thread.id, event.message_ids));
        } else if (event.type === 'chat.closed') {
          dispatch(chatApi.util.invalidateTags([{ type: 'Chat', id: 'THREADS' }]));
        }
      },
      setSocketStatus,
    );
    socketRef.current = socket;
    void socket.connect();
    return () => socket.close();
  }, [thread.id, userId, dispatch]);

  // Mark as read when opened and whenever unread incoming messages arrive.
  const unreadIncoming = (data ?? []).some((m) => !m.is_read && m.sender.id !== userId);
  useEffect(() => {
    if (unreadIncoming && online) void markRead(thread.id);
  }, [unreadIncoming, online, thread.id, markRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [data, outbox, peerTyping]);

  const deliver = async (msg: OutgoingMessage) => {
    setOutbox((o) => o.map((m) => (m.localId === msg.localId ? { ...m, status: 'sending', error: undefined } : m)));
    try {
      await send({ threadId: thread.id, text: msg.text, attachment: msg.file }).unwrap();
      setOutbox((o) => o.filter((m) => m.localId !== msg.localId));
    } catch (err) {
      setOutbox((o) => o.map((m) => (m.localId === msg.localId ? { ...m, status: 'failed', error: errorMessage(err) } : m)));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text && !file) return;
    const msg: OutgoingMessage = { localId: uuid(), text, file: file ?? undefined, status: 'sending' };
    setOutbox((o) => [...o, msg]);
    setDraft('');
    setFile(null);
    socketRef.current?.send({ type: 'typing', is_typing: false });
    void deliver(msg);
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    socketRef.current?.send({ type: 'typing', is_typing: true });
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => socketRef.current?.send({ type: 'typing', is_typing: false }), 2500);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Link to="/chat" className="lg:hidden" aria-label="Back to inbox">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{initials(thread.customer.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{thread.customer.name || 'Customer'}</p>
          <p className="flex items-center gap-1 text-xs text-ink-subtle">
            {realtime ? <Wifi className="h-3 w-3 text-emerald-600" /> : <WifiOff className="h-3 w-3" />}
            {realtime ? 'Live' : `Updating every ${Math.round(CHAT_POLL_MS / 1000)}s`}
            {thread.order_id && <> · Order {thread.order_id}</>}
            {thread.service_booking_id && <> · Booking #{thread.service_booking_id}</>}
          </p>
        </div>
        {!closed && (
          <Button variant="ghost" size="sm" onClick={() => setConfirmClose(true)} leftIcon={<Lock className="h-3.5 w-3.5" />}>
            Close
          </Button>
        )}
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
            {(data ?? []).map((m) => (
              <MessageBubble key={m.id} m={m} mine={m.sender.id === userId} />
            ))}
            {outbox.map((m) => (
              <div key={m.localId} className="flex justify-end">
                <div className={cn('max-w-[75%] rounded-2xl rounded-br-sm px-3 py-2 text-sm', m.status === 'failed' ? 'border border-red-300 bg-red-50 text-red-900' : 'bg-brand-600/70 text-white')}>
                  {m.file && (
                    <p className="flex items-center gap-1 text-xs">
                      <Paperclip className="h-3 w-3" /> {m.file.name}
                    </p>
                  )}
                  {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                  {m.status === 'sending' ? (
                    <p className="mt-0.5 text-[10px]">Sending…</p>
                  ) : (
                    <button type="button" className="mt-1 inline-flex items-center gap-1 text-xs font-medium underline" onClick={() => deliver(m)} title={m.error}>
                      <RotateCcw className="h-3 w-3" /> Failed — retry
                    </button>
                  )}
                </div>
              </div>
            ))}
            {peerTyping && <p className="text-xs italic text-ink-subtle">{thread.customer.name || 'Customer'} is typing…</p>}
          </>
        )}
        <div ref={endRef} />
      </div>
      {closed ? (
        <p className="border-t border-line p-3 text-center text-sm text-ink-muted">This conversation is {thread.status.toLowerCase()}.</p>
      ) : (
        <form onSubmit={submit} className="space-y-2 border-t border-line p-3">
          {file && (
            <div className="flex items-center gap-2 text-xs">
              <Badge>
                <Paperclip className="h-3 w-3" /> {file.name}
              </Badge>
              <button type="button" onClick={() => setFile(null)} aria-label="Remove attachment">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-line hover:bg-ink/5" aria-label="Attach a file">
              <Paperclip className="h-4 w-4 text-ink-muted" />
              <input
                type="file"
                className="sr-only"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f && f.size > MAX_ATTACHMENT_BYTES) return toast.error('Attachments must be 10 MB or smaller');
                  setFile(f ?? null);
                }}
              />
            </label>
            <Input value={draft} onChange={(e) => onDraftChange(e.target.value)} placeholder={online ? 'Type a message' : 'You are offline'} aria-label="Message" maxLength={4000} disabled={!online} />
            <Button type="submit" disabled={(!draft.trim() && !file) || !online} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        loading={closeState.isLoading}
        title="Close this conversation?"
        description="The customer can no longer send messages in this thread."
        confirmLabel="Close conversation"
        onConfirm={async () => {
          try {
            await closeThread(thread.id).unwrap();
            setConfirmClose(false);
          } catch (err) {
            toast.error('Could not close conversation', err);
          }
        }}
      />
    </div>
  );
}

export function ChatPage() {
  const { conversationId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const threads = useListThreadsQuery(undefined, { pollingInterval: CHAT_POLL_MS * 2, skipPollingIfUnfocused: true });
  const orderFilter = Number(params.get('order')) || null;

  // Opened from an order: jump to the thread tagged with that platform order, if one exists.
  useEffect(() => {
    if (!orderFilter || conversationId || !threads.data) return;
    const match = threads.data.find((t) => t.order_id === orderFilter);
    if (match) navigate(`/chat/${match.id}`, { replace: true });
  }, [orderFilter, conversationId, threads.data, navigate]);

  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = [...(threads.data ?? [])].sort((a, b) => new Date(b.last_message_at ?? b.created_at).getTime() - new Date(a.last_message_at ?? a.created_at).getTime());
    return term ? all.filter((t) => t.customer.name.toLowerCase().includes(term) || t.customer.phone_number?.includes(term) || String(t.order_id ?? '').includes(term)) : all;
  }, [threads.data, search]);
  const active = threads.data?.find((t) => t.id === conversationId);
  const missingOrderThread = orderFilter && threads.data && !threads.data.some((t) => t.order_id === orderFilter);

  return (
    <>
      <PageHeader title="Messages" description="Conversations with your customers." />
      {missingOrderThread && (
        <p className="mb-3 rounded-md bg-ink/[0.03] p-3 text-sm text-ink-muted" role="status">
          No conversation is linked to this order yet. Customers start conversations from the TheNearByShop app; you can call them from the order page.
        </p>
      )}
      <Card className="grid h-[calc(100vh-13rem)] min-h-[420px] overflow-hidden lg:grid-cols-[320px_1fr]">
        <div className={cn('flex min-h-0 flex-col border-r border-line', conversationId && 'hidden lg:flex')}>
          <div className="border-b border-line p-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Name, phone or order" className="w-full" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : threads.error ? (
              <ErrorState error={threads.error} onRetry={threads.refetch} title="Chat service unavailable" />
            ) : list.length === 0 ? (
              <EmptyState icon={<MessageSquare className="h-5 w-5" />} title="No conversations" description="Customers can message you from the TheNearByShop app." />
            ) : (
              <ul>
                {list.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/chat/${t.id}`)}
                      className={cn('flex w-full items-center gap-3 border-b border-line px-3 py-3 text-left hover:bg-ink/[0.03]', t.id === conversationId && 'bg-brand-50/60 dark:bg-brand-900/10')}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/5 text-xs font-semibold">{initials(t.customer.name)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className={cn('truncate text-sm', t.unread_count ? 'font-semibold' : 'font-medium')}>{t.customer.name || 'Customer'}</span>
                          <span className="shrink-0 text-[11px] text-ink-subtle">{formatRelative(t.last_message_at ?? t.created_at)}</span>
                        </span>
                        <span className="flex items-center gap-1 text-xs text-ink-muted">
                          {t.order_id && (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-ink/5 px-1">
                              <ClipboardList className="h-3 w-3" /> {t.order_id}
                            </span>
                          )}
                          <span className="truncate">{t.last_message ? t.last_message.message || 'Attachment' : 'No messages yet'}</span>
                        </span>
                      </span>
                      {t.unread_count > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white" aria-label={`${t.unread_count} unread`}>{t.unread_count}</span>}
                      {t.status !== 'ACTIVE' && <Badge>{t.status.toLowerCase()}</Badge>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className={cn('min-h-0', !conversationId && 'hidden lg:block')}>
          {conversationId && active ? (
            <Conversation key={active.id} thread={active} />
          ) : conversationId && threads.isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : conversationId && threads.data ? (
            <EmptyState title="Conversation not found" description="It may have been removed, or you are not part of it." />
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
