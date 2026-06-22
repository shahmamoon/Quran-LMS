import { create } from 'zustand';
import type { Conversation, Message } from '../types';

interface ChatState {
  activeConversationId: string | null;
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  chatUnreadCount: number;

  setActiveConversation: (id: string | null) => void;
  setConversations: (cs: Conversation[]) => void;
  setMessages: (conversationId: string, msgs: Message[]) => void;
  appendMessage: (conversationId: string, msg: Message) => void;
  setChatUnreadCount: (n: number) => void;
  incrementChatUnread: () => void;
  clearChatUnread: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  conversations: [],
  messagesByConversation: {},
  chatUnreadCount: 0,

  setActiveConversation: (id) => set({ activeConversationId: id }),
  setChatUnreadCount: (n) => set({ chatUnreadCount: n }),
  incrementChatUnread: () => set((s) => ({ chatUnreadCount: s.chatUnreadCount + 1 })),
  clearChatUnread: () => set({ chatUnreadCount: 0 }),

  setConversations: (conversations) => set({ conversations }),

  setMessages: (conversationId, msgs) =>
    set((state) => ({
      messagesByConversation: { ...state.messagesByConversation, [conversationId]: msgs },
    })),

  appendMessage: (conversationId, msg) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [...(state.messagesByConversation[conversationId] ?? []), msg],
      },
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, messages: [msg] } : c
      ),
    })),
}));
