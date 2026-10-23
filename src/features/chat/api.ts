import { api } from '@/services/api';
import { config } from '@/constants/config';
import { normalizePage } from '@/services/api/pagination';
import type { ChatMessage, ChatThread } from '@/types/api';

/**
 * apps.chat on api-services (/api/v2/chat/conversations/...). Threads are scoped to their participants server-side.
 * Real-time updates arrive over /ws/chat/<thread>/ (see services/websocket/chatSocket.ts); polling is only the fallback
 * while the socket is down.
 */
export const chatApi = api.injectEndpoints({
  endpoints: (build) => ({
    listThreads: build.query<ChatThread[], void>({
      query: () => ({ url: '/api/v2/chat/conversations/', params: { page_size: 100 } }),
      transformResponse: (data: unknown) => normalizePage<ChatThread>(data).results,
      providesTags: [{ type: 'Chat', id: 'THREADS' }],
    }),
    listMessages: build.query<ChatMessage[], string>({
      query: (threadId) => ({ url: `/api/v2/chat/conversations/${threadId}/messages/`, params: { page_size: 100 } }),
      // Server returns newest first; the conversation view renders oldest first.
      transformResponse: (data: unknown) => [...normalizePage<ChatMessage>(data).results].reverse(),
      providesTags: (_r, _e, threadId) => [{ type: 'Chat', id: threadId }],
    }),
    sendMessage: build.mutation<ChatMessage, { threadId: string; text: string; attachment?: File }>({
      query: ({ threadId, text, attachment }) => {
        if (attachment) {
          const fd = new FormData();
          fd.append('text', text);
          fd.append('message_type', attachment.type.startsWith('image/') ? 'IMAGE' : 'FILE');
          fd.append('attachment', attachment);
          return { url: `/api/v2/chat/conversations/${threadId}/messages/`, method: 'POST', data: fd };
        }
        return { url: `/api/v2/chat/conversations/${threadId}/messages/`, method: 'POST', data: { text, message_type: 'TEXT' } };
      },
      async onQueryStarted({ threadId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(upsertMessage(threadId, data));
        } catch {
          /* failure is shown by the caller */
        }
      },
      invalidatesTags: [{ type: 'Chat', id: 'THREADS' }],
    }),
    markThreadRead: build.mutation<{ message_ids: string[] }, string>({
      query: (threadId) => ({ url: `/api/v2/chat/conversations/${threadId}/read/`, method: 'POST' }),
      invalidatesTags: [{ type: 'Chat', id: 'THREADS' }],
    }),
    closeThread: build.mutation<ChatThread, string>({
      query: (threadId) => ({ url: `/api/v2/chat/conversations/${threadId}/close/`, method: 'POST' }),
      invalidatesTags: [{ type: 'Chat', id: 'THREADS' }],
    }),
  }),
});

/** Inserts a message into the cached conversation if it is not there yet (REST response and socket echo both arrive). */
export function upsertMessage(threadId: string, message: ChatMessage) {
  return chatApi.util.updateQueryData('listMessages', threadId, (draft) => {
    if (!draft.some((m) => m.id === message.id)) draft.push(message);
  });
}

export function markMessagesRead(threadId: string, ids: string[]) {
  return chatApi.util.updateQueryData('listMessages', threadId, (draft) => {
    const set = new Set(ids);
    draft.forEach((m) => {
      if (set.has(m.id)) m.is_read = true;
    });
  });
}

/** Fallback polling interval while the WebSocket is not connected. */
export const CHAT_POLL_MS = Math.max(10000, Math.round(config.pollIntervalMs * 0.75));

export const { useListThreadsQuery, useListMessagesQuery, useSendMessageMutation, useMarkThreadReadMutation, useCloseThreadMutation } = chatApi;
