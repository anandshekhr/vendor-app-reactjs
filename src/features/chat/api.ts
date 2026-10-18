import { api } from '@/services/api';
import { config } from '@/constants/config';
import { normalizePage } from '@/services/api/pagination';
import type { ChatMessage, ChatRoom } from '@/types/api';

/**
 * Chat uses the existing apps.chat endpoints. They are partially broken server-side (API_MAPPING G-13); the UI handles
 * failures explicitly. No WebSocket server exists, so updates use polling.
 */
export const chatApi = api.injectEndpoints({
  endpoints: (build) => ({
    listRooms: build.query<ChatRoom[], void>({
      query: () => '/api/v2/chat/rooms/',
      transformResponse: (data: unknown) => normalizePage<ChatRoom>(data).results,
      providesTags: [{ type: 'Chat', id: 'ROOMS' }],
    }),
    listMessages: build.query<ChatMessage[], string>({
      query: (roomId) => `/api/v2/chat/rooms/${roomId}/messages/`,
      transformResponse: (data: unknown) => normalizePage<ChatMessage>(data).results,
      providesTags: (_r, _e, roomId) => [{ type: 'Chat', id: roomId }],
    }),
    sendMessage: build.mutation<ChatMessage, { roomId: string; message: string }>({
      query: ({ roomId, message }) => ({ url: `/api/v2/chat/rooms/${roomId}/messages/send/`, method: 'POST', data: { message } }),
      invalidatesTags: (_r, _e, { roomId }) => [{ type: 'Chat', id: roomId }, { type: 'Chat', id: 'ROOMS' }],
    }),
  }),
});

export const CHAT_POLL_MS = Math.max(10000, Math.round(config.pollIntervalMs * 0.75));

export const { useListRoomsQuery, useListMessagesQuery, useSendMessageMutation } = chatApi;
