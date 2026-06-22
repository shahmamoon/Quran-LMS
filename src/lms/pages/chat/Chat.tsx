import { useState, useEffect, useRef, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Plus, Users, Search, X, Circle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { useChatStore } from '../../store/chat.store';
import { getSocket } from '../../lib/socket';
import { Avatar, Spinner, EmptyState, Button, Modal } from '../../components/ui';
import { cn, fullName, formatRelative } from '../../lib/utils';
import type { ConversationWithUnread, Message, AvailableChatUser, Group } from '../../types';

function isOnline(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000;
}

export default function Chat() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { activeConversationId, setActiveConversation, setConversations, setMessages, appendMessage, messagesByConversation, conversations, clearChatUnread } = useChatStore();
  const [input, setInput] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [showNewChat, setShowNewChat] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [modalSearch, setModalSearch] = useState('');

  const isStaff = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  // ── Conversations ─────────────────────────────────────────────
  const { data: convData, isLoading } = useQuery({
    queryKey: ['conversations', search],
    queryFn: () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      return api.get<{ data: ConversationWithUnread[] }>(`/chat/conversations${params}`).then((r) => r.data.data);
    },
    refetchInterval: 30_000,
  });

  // ── Available users for new DM ────────────────────────────────
  const { data: availableUsers = [] } = useQuery<AvailableChatUser[]>({
    queryKey: ['chat-available-users'],
    queryFn: () => api.get<{ data: AvailableChatUser[] }>('/chat/available-users').then((r) => r.data.data),
    enabled: showNewChat,
    staleTime: 60_000,
  });

  // Groups (staff only, for group chats)
  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get<{ data: Group[] }>('/groups').then((r) => r.data.data),
    enabled: isStaff && showNewChat,
  });

  // ── New conversation ──────────────────────────────────────────
  const [chatTarget, setChatTarget] = useState<'user' | 'group'>('user');

  const newConvMutation = useMutation({
    mutationFn: (body: { participantIds: string[]; name?: string; isGroup?: boolean; groupId?: string }) =>
      api.post<{ data: ConversationWithUnread }>('/chat/conversations', body).then((r) => r.data.data),
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConversation(conv.id);
      setShowNewChat(false);
      setSelectedTargetId('');
      setModalSearch('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'You are not permitted to chat with this user.');
    },
  });

  function startChat() {
    if (!selectedTargetId) return;
    if (chatTarget === 'user') {
      newConvMutation.mutate({ participantIds: [selectedTargetId], isGroup: false });
    } else {
      const group = groups.find((g) => g.id === selectedTargetId);
      const memberIds = group?.members?.map((m) => m.user.id) ?? [];
      newConvMutation.mutate({ participantIds: memberIds, name: group?.name ?? 'Group Chat', isGroup: true, groupId: selectedTargetId });
    }
  }

  // ── Clear global unread badge when visiting this page ────────
  useEffect(() => {
    clearChatUnread();
  }, [clearChatUnread]);

  // ── Socket ────────────────────────────────────────────────────
  useEffect(() => {
    if (convData) setConversations(convData);
  }, [convData, setConversations]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('message:new', (msg: Message) => {
      appendMessage(msg.conversationId, msg);
      // Invalidate conversations list so unread count refreshes
      qc.invalidateQueries({ queryKey: ['conversations'] });
    });
    // chat:unread fires on personal room when not viewing the conversation
    socket.on('chat:unread', () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
    });
    return () => {
      socket.off('message:new');
      socket.off('chat:unread');
    };
  }, [appendMessage, qc]);

  useEffect(() => {
    if (!activeConversationId) return;
    const socket = getSocket();
    socket.emit('join:conversation', activeConversationId);
    return () => { socket.emit('leave:conversation', activeConversationId); };
  }, [activeConversationId]);

  // Load messages on conversation select
  useEffect(() => {
    if (!activeConversationId || messagesByConversation[activeConversationId]) return;
    setLoadingMsgs(true);
    api.get<{ data: { messages: Message[] } }>(`/chat/conversations/${activeConversationId}/messages`)
      .then((r) => setMessages(activeConversationId, r.data.data.messages))
      .finally(() => setLoadingMsgs(false));
  }, [activeConversationId, messagesByConversation, setMessages]);

  // Mark as read when conversation opens
  useEffect(() => {
    if (!activeConversationId) return;
    api.patch(`/chat/conversations/${activeConversationId}/read`).catch(() => null);
    qc.invalidateQueries({ queryKey: ['conversations'] });
  }, [activeConversationId, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversationId, messagesByConversation]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activeConversationId) return;
    const content = input.trim();
    setInput('');
    getSocket().emit('message:send', { conversationId: activeConversationId, content });
    inputRef.current?.focus();
  }

  const activeMessages = activeConversationId ? (messagesByConversation[activeConversationId] ?? []) : [];
  const activeConv = (conversations as ConversationWithUnread[]).find((c) => c.id === activeConversationId);

  const filteredAvailable = availableUsers.filter((u) =>
    modalSearch === '' || `${u.firstName} ${u.lastName}`.toLowerCase().includes(modalSearch.toLowerCase())
  );

  const totalUnread = (conversations as ConversationWithUnread[]).reduce((s, c) => s + (c.unreadCount ?? 0), 0);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl border border-slate-200 overflow-hidden">

      {/* ── Left panel: conversations ───────────────────────── */}
      <div className="w-72 border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-800">Messages</h2>
            {totalUnread > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          <button
            onClick={() => { setShowNewChat(true); setSelectedTargetId(''); setModalSearch(''); setChatTarget('user'); }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors"
            title="New conversation"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-7 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-300 bg-slate-50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-400 text-sm">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
              {search ? 'No conversations match your search.' : 'No conversations yet.'}
              <p className="mt-1 text-xs">Click <strong>+</strong> to start one.</p>
            </div>
          ) : (
            <ul>
              {(conversations as ConversationWithUnread[]).map((c) => {
                const other = c.participants.find((p) => p.userId !== user?.id);
                const name = c.isGroup ? (c.name ?? 'Group Chat') : (other ? fullName(other.user) : 'Chat');
                const lastMsg = c.messages[0];
                const online = !c.isGroup && isOnline((other?.user as { lastSeenAt?: string | null } | undefined)?.lastSeenAt);
                const hasUnread = (c.unreadCount ?? 0) > 0;

                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setActiveConversation(c.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left',
                        activeConversationId === c.id && 'bg-brand-50 border-r-2 border-brand-500'
                      )}
                    >
                      {/* Avatar with online dot */}
                      <div className="relative shrink-0">
                        <Avatar src={!c.isGroup ? (other?.user.avatarUrl ?? null) : null} name={name} size="md" />
                        {online && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            {c.isGroup && <Users size={11} className="text-slate-400 shrink-0" />}
                            <p className={cn('text-sm truncate', hasUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>{name}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {lastMsg && <span className="text-[10px] text-slate-400">{formatRelative(lastMsg.createdAt)}</span>}
                            {hasUnread && (
                              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-brand-500 text-white text-[9px] font-bold">
                                {c.unreadCount > 99 ? '99+' : c.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                        {lastMsg && (
                          <p className={cn('text-xs truncate mt-0.5', hasUnread ? 'text-slate-700 font-medium' : 'text-slate-400')}>
                            {lastMsg.sender && lastMsg.sender.id === user?.id ? 'You: ' : ''}{lastMsg.content}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Right panel: messages ──────────────────────────── */}
      {!activeConversationId ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<MessageSquare size={48} />}
            title="Select a conversation"
            description="Choose a conversation from the left to start chatting."
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Conversation header */}
          <div className="px-4 py-3 border-b border-slate-200 shrink-0">
            {activeConv && (() => {
              const other = activeConv.participants.find((p) => p.userId !== user?.id);
              const name = activeConv.isGroup ? (activeConv.name ?? 'Group Chat') : (other ? fullName(other.user) : 'Chat');
              const online = !activeConv.isGroup && isOnline((other?.user as { lastSeenAt?: string | null } | undefined)?.lastSeenAt);
              return (
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Avatar src={!activeConv.isGroup ? (other?.user.avatarUrl ?? null) : null} name={name} size="sm" />
                    {online && <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border-2 border-white" />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm leading-tight">{name}</p>
                    <p className="text-xs text-slate-400 leading-tight">{online ? 'Online now' : other?.user ? `Last seen ${formatRelative((other.user as { lastSeenAt?: string | null }).lastSeenAt ?? '')}` : activeConv.isGroup ? `${activeConv.participants.length} members` : ''}</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingMsgs ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : activeMessages.length === 0 ? (
              <EmptyState icon={<MessageSquare size={32} />} title="No messages yet" description="Send the first message!" />
            ) : (
              activeMessages.map((msg) => {
                const isMine = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={cn('flex gap-2', isMine ? 'flex-row-reverse' : 'flex-row')}>
                    {!isMine && (
                      <div className="shrink-0 mt-1">
                        <Avatar src={msg.sender.avatarUrl} name={fullName(msg.sender)} size="sm" />
                      </div>
                    )}
                    <div className={cn('max-w-[70%] flex flex-col gap-1', isMine ? 'items-end' : 'items-start')}>
                      {!isMine && <span className="text-xs text-slate-500 px-1 font-medium">{fullName(msg.sender)}</span>}
                      <div className={cn(
                        'px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words',
                        isMine ? 'bg-brand-500 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                      )}>
                        {msg.content}
                      </div>
                      <span className="text-xs text-slate-400 px-1">{formatRelative(msg.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="px-4 py-3 border-t border-slate-200 flex gap-3 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <Button type="submit" icon={<Send size={16} />} disabled={!input.trim()}>Send</Button>
          </form>
        </div>
      )}

      {/* ── New Conversation Modal ────────────────────────────── */}
      <Modal open={showNewChat} onClose={() => setShowNewChat(false)} title="New Conversation">
        <div className="space-y-4">
          {/* Toggle: User or Group (staff only) */}
          {isStaff && (
            <div className="flex gap-2">
              {(['user', 'group'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setChatTarget(t); setSelectedTargetId(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    chatTarget === t ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'
                  }`}
                >
                  {t === 'user' ? 'Direct Message' : <><Users size={14} /> Group Chat</>}
                </button>
              ))}
            </div>
          )}

          {/* User picker */}
          {chatTarget === 'user' && (
            <div>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Search people…"
                  className="w-full pl-7 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-300"
                />
              </div>
              {availableUsers.length === 0 ? (
                <p className="text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-300 rounded-lg px-3 py-4 text-center">
                  No contacts available to chat with.
                </p>
              ) : filteredAvailable.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No results for "{modalSearch}".</p>
              ) : (
                <div className="space-y-1 max-h-52 overflow-y-auto border border-slate-200 rounded-lg p-1">
                  {filteredAvailable.map((u) => {
                    const online = isOnline(u.lastSeenAt);
                    const roleLabel = u.role === 'ADMIN' ? 'Admin' : u.role === 'TEACHER' ? 'Teacher' : 'Student';
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedTargetId(u.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                          selectedTargetId === u.id ? 'bg-brand-50 border border-brand-200' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <Avatar src={u.avatarUrl} name={fullName(u)} size="sm" />
                          {online && <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border border-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800">{fullName(u)}</p>
                          <p className="text-xs text-slate-400">{roleLabel}{online ? ' · Online' : ''}</p>
                        </div>
                        {selectedTargetId === u.id && <Circle size={14} className="text-brand-500 shrink-0" fill="currentColor" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Group picker — staff only */}
          {chatTarget === 'group' && isStaff && (
            <div>
              {groups.length === 0 ? (
                <p className="text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-300 rounded-lg px-3 py-4 text-center">
                  No groups available.
                </p>
              ) : (
                <div className="space-y-1 max-h-52 overflow-y-auto border border-slate-200 rounded-lg p-1">
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedTargetId(g.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                        selectedTargetId === g.id ? 'bg-brand-50 border border-brand-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                        <Users size={14} className="text-brand-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{g.name}</p>
                        {g._count && <p className="text-xs text-slate-400">{g._count.members} member{g._count.members !== 1 ? 's' : ''}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setShowNewChat(false)} className="flex-1">Cancel</Button>
            <Button disabled={!selectedTargetId} loading={newConvMutation.isPending} onClick={startChat} className="flex-1">
              Start Chat
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
