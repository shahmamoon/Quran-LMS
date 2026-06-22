import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Trash2, Copy, Check, Sparkles, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useAuthStore } from '../../store/auth.store';
import { Spinner } from '../../components/ui';
import { api } from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

// ── Example prompts ───────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  'Explain neural networks using a simple analogy a beginner would understand',
  'Create a 3-lesson plan for teaching Python loops to high school students',
  'What is the difference between supervised and unsupervised learning? Give examples',
  'How do I explain the concept of tokens and context windows to students?',
  'Write a quiz with 5 questions on prompt engineering basics',
  'What are the best real-world examples to teach machine learning bias?',
];

// ── Copy button ───────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
      title="Copy response"
    >
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  );
}

// ── Message bubble ────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-sm bg-brand-500 text-white text-sm leading-relaxed shadow-sm">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 group">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-brand-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        <Bot size={15} className="text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          {msg.streaming && !msg.content ? (
            /* Typing indicator */
            <div className="flex items-center gap-1 py-1">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
            </div>
          ) : (
            <div className="prose prose-sm prose-slate max-w-none
              prose-headings:font-semibold prose-headings:text-slate-800
              prose-p:text-slate-700 prose-p:leading-relaxed
              prose-li:text-slate-700
              prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:text-violet-700
              prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl prose-pre:text-sm
              prose-strong:text-slate-800
              prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline
            ">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >{msg.content}</ReactMarkdown>
              {msg.streaming && (
                <span className="inline-block w-0.5 h-4 bg-slate-400 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          )}
        </div>

        {!msg.streaming && msg.content && (
          <div className="flex justify-end mt-1 pr-1">
            <CopyButton text={msg.content} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export default function AIAssistant() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Check if AI is configured ─────────────────────────────
  useEffect(() => {
    api.get<{ available: boolean }>('/assistant/status')
      .then(r => setAvailable(r.data.available))
      .catch(() => setAvailable(false));
  }, []);

  // ── Auto-scroll to bottom ──────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    if (streaming) scrollToBottom();
  }, [messages, streaming, scrollToBottom]);

  // ── Scroll-up button visibility ────────────────────────────
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  }

  // ── Auto-resize textarea ───────────────────────────────────
  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  // ── Send message ───────────────────────────────────────────
  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', streaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const abort = new AbortController();
    abortRef.current = abort;

    const buildRequest = () => {
      const token = useAuthStore.getState().accessToken;
      return fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ message: trimmed, history }),
        signal: abort.signal,
      });
    };

    try {
      let res = await buildRequest();

      // Token expired — refresh once via axios (updates the store), then retry
      if (res.status === 401) {
        await api.post('/auth/refresh');
        res = await buildRequest();
      }

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const parsed = JSON.parse(raw) as { delta?: string; done?: boolean; error?: string };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.done) break;
            if (parsed.delta) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: m.content + parsed.delta }
                    : m
                )
              );
            }
          } catch {
            // malformed chunk — skip
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      const errText = (err as { message?: string })?.message ?? 'Something went wrong';
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `⚠️ ${errText}`, streaming: false }
            : m
        )
      );
    } finally {
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m)
      );
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const isTeacher = user?.role === 'TEACHER';
  const isAdmin   = user?.role === 'ADMIN';
  if (!isTeacher && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p>Access restricted to teachers and admins.</p>
      </div>
    );
  }

  // ── Not configured ─────────────────────────────────────────
  if (available === false) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center space-y-4">
        <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto">
          <Bot size={32} className="text-violet-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">AI Assistant not configured</h2>
        <p className="text-slate-500 text-sm">
          Add <code className="bg-slate-100 px-1.5 py-0.5 rounded text-violet-700">DEEPSEEK_API_KEY</code> to
          your environment (Doppler → <strong>prd</strong> config) to enable the AI assistant.
        </p>
      </div>
    );
  }

  // ── Loading status ─────────────────────────────────────────
  if (available === null) {
    return <div className="flex justify-center py-20"><Spinner className="w-10 h-10" /></div>;
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-3rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-brand-500 rounded-xl flex items-center justify-center shadow-sm">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">AI Teaching Assistant</h1>
            <p className="text-slate-400 text-xs">Powered by DeepSeek · Ask anything to help you teach better</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { abortRef.current?.abort(); setMessages([]); setStreaming(false); }}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
            Clear chat
          </button>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-4 pr-2 scroll-smooth"
      >
        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-8 pb-8">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-brand-100 rounded-2xl flex items-center justify-center mx-auto">
                <Bot size={36} className="text-violet-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">How can I help you teach today?</h2>
              <p className="text-slate-400 text-sm">Ask me to explain concepts, create lesson plans, or answer any subject question.</p>
            </div>

            {/* Example prompts */}
            <div className="grid sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-left text-sm px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors text-slate-600 shadow-sm"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-28 right-8 bg-white border border-slate-200 rounded-full p-2 shadow-md text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ChevronDown size={18} />
        </button>
      )}

      {/* Input area */}
      <div className="shrink-0 mt-3">
        <div className="flex items-end gap-2 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); resizeTextarea(); }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything — explain a concept, create a lesson plan, write a quiz…"
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none leading-relaxed disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-brand-500 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
            title="Send (Enter)"
          >
            {streaming ? <Spinner className="w-4 h-4 border-white" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-2">
          Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[10px]">Enter</kbd> to send ·
          <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[10px] ml-1">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
