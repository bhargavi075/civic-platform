// frontend/src/components/Chatbot.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const BOT_NAME = 'CivicAI';
const DEPARTMENTS = [
  '🛣️ Roads & Transport',
  '⚡ Electricity',
  '💧 Water Supply',
  '🏛️ Municipal Services',
  '🌳 Parks & Recreation',
];

const QUICK_SUGGESTIONS = [
  { label: '📊 Stats',        query: 'show complaint stats' },
  { label: '📝 Report',       query: 'how to report an issue' },
  { label: '🏢 Departments',  query: 'what departments are available' },
  { label: '🔍 Track',        query: 'track my complaint' },
];

// ─── Response Engine ──────────────────────────────────────────────────────────

const buildResponse = (input, stats) => {
  const text = input.toLowerCase().trim();

  if (/(resolved|completed|fixed|done|closed)/.test(text)) {
    if (stats)
      return `✅ **Resolved Complaints**\n\n${stats.resolved ?? 'N/A'} complaint${stats.resolved !== 1 ? 's' : ''} have been successfully resolved. Great progress! 🎉`;
    return '⚠️ Stats unavailable right now. Please ensure you\'re logged in and try again shortly.';
  }

  if (/(pending|waiting|not yet|queue|backlog)/.test(text)) {
    if (stats)
      return `⏳ **Pending Complaints**\n\n${stats.pending ?? 'N/A'} complaint${stats.pending !== 1 ? 's' : ''} are awaiting review.\n\nOur teams are working to address them quickly.`;
    return '⚠️ Stats unavailable right now. Please ensure you\'re logged in and try again shortly.';
  }

  if (/(in.?progress|ongoing|active|working|process)/.test(text)) {
    if (stats)
      return `🔧 **In-Progress Complaints**\n\n${stats.inProgress ?? 'N/A'} complaint${stats.inProgress !== 1 ? 's' : ''} are currently being worked on.\n\nField teams are actively resolving these issues.`;
    return '⚠️ Stats unavailable right now. Please ensure you\'re logged in and try again shortly.';
  }

  if (/(stat|summar|overview|count|number|total|how many|dashboard data|complaint stat)/.test(text)) {
    if (stats)
      return `📊 **Complaint Overview**\n\n✅ Resolved: **${stats.resolved ?? 'N/A'}**\n⏳ Pending: **${stats.pending ?? 'N/A'}**\n🔧 In-Progress: **${stats.inProgress ?? 'N/A'}**\n\nTotal tracked: **${(stats.resolved ?? 0) + (stats.pending ?? 0) + (stats.inProgress ?? 0)}** complaints.`;
    return '⚠️ Unable to load stats. Please check your connection or login status.';
  }

  if (/(report|submit|file|raise|new complaint|create issue|add issue)/.test(text))
    return `📝 **How to Report an Issue**\n\n1. Log in to your citizen account\n2. Click **"Report Issue"** in your dashboard\n3. Select a department & category\n4. Describe your issue with photos\n5. Submit — you'll get a tracking ID instantly!\n\n➡️ Head to **/citizen/report** to get started.`;

  if (/(department|category|sector|division|type of issue|which department)/.test(text))
    return `🏢 **Available Departments**\n\n${DEPARTMENTS.join('\n')}\n\nYour complaint will be auto-assigned to the most relevant department.`;

  if (/(track|status|where is|follow up|update|my complaint|my issue|my case)/.test(text))
    return `🔍 **Track Your Complaint**\n\nTo track your complaint:\n1. Go to your **Citizen Dashboard** at /citizen\n2. Find your complaint by ID or date\n3. Click on it to see real-time status updates\n\nYou can also view it on the **Map View** at /citizen/map.`;

  if (/(login|sign in|password|account|forgot|register|sign up|auth)/.test(text))
    return `🔐 **Account Help**\n\n• **Citizens**: Login at /citizen/login\n• **Officers**: Login at /officer/login\n• **New user?** Register at /citizen/register\n\nForgot password? Contact your civic administrator.`;

  if (/(hi|hello|hey|howdy|good morning|good evening|namaste|greetings)/.test(text))
    return `👋 Hello! I'm **${BOT_NAME}**.\n\nI can help you with:\n• 📊 Complaint statistics\n• 📝 Reporting civic issues\n• 🔍 Tracking complaints\n• 🏢 Department information\n\nWhat would you like to know?`;

  if (/(help|what can you do|guide|support|assist|commands|options)/.test(text))
    return `💡 **I can help you with:**\n\n📊 **Stats** — "How many complaints are resolved?"\n📝 **Report** — "How do I report an issue?"\n🔍 **Track** — "Track my complaint"\n🏢 **Departments** — "What departments are available?"\n🔐 **Login** — "Help with login"\n\nJust type naturally — I'll understand!`;

  return `🤔 I didn't quite catch that.\n\nTry asking about:\n• Complaint stats (resolved, pending, in-progress)\n• How to report an issue\n• Tracking your complaint\n• Available departments\n\nOr type **"help"** to see all options.`;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderText = (text) =>
  text.split('\n').map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/).map((seg, j) =>
      seg.startsWith('**') && seg.endsWith('**')
        ? <strong key={j} className="font-semibold">{seg.slice(2, -2)}</strong>
        : seg
    );
    return (
      <span key={i}>
        {parts}
        {i < arr.length - 1 && <br />}
      </span>
    );
  });

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (ts) => {
  const d = new Date(ts);
  const today = new Date();
  const diff = today.setHours(0,0,0,0) - d.setHours(0,0,0,0);
  if (diff === 0) return 'Today';
  if (diff === 86400000) return 'Yesterday';
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const WELCOME_TEXT = (name) =>
  `Hello${name ? `, ${name}` : ''}! I'm **${BOT_NAME}** 🏙️\n\nYour intelligent guide for civic services. I can help with complaint stats, reporting issues, tracking cases, and navigating city departments.\n\nHow can I assist you today?`;

// ─── Sub-Components ───────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <div className="flex items-end gap-2 mb-3 animate-fade-in">
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs flex-shrink-0">
      🏙️
    </div>
    <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
      <div className="flex gap-1 items-center h-4">
        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
    <span className="text-xs text-slate-400 mb-1">{BOT_NAME} is thinking…</span>
  </div>
);

const Message = ({ msg }) => {
  const isBot = msg.sender === 'bot';
  return (
    <div className={`flex items-end gap-2 mb-3 ${isBot ? '' : 'flex-row-reverse'} animate-slide-up`}>
      {isBot && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs flex-shrink-0 shadow-md">
          🏙️
        </div>
      )}
      <div className={`max-w-[78%] flex flex-col ${isBot ? '' : 'items-end'}`}>
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isBot
              ? 'bg-white/80 backdrop-blur-sm border border-white/60 text-slate-700 rounded-2xl rounded-bl-sm'
              : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl rounded-br-sm'
          }`}
        >
          {renderText(msg.text)}
        </div>
        <span className={`text-[10px] mt-1 text-slate-400 ${isBot ? 'ml-1' : 'mr-1'}`}>
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const ChatSidebar = ({
  chats,
  activeChatId,
  onSelect,
  onNew,
  onDelete,
  loading,
}) => (
  <div className="w-60 flex-shrink-0 flex flex-col bg-white/60 backdrop-blur-md border-r border-white/50 overflow-hidden">
    {/* Sidebar header */}
    <div className="px-3 pt-3 pb-2 flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">History</span>
      <button
        onClick={onNew}
        title="New chat"
        className="w-6 h-6 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-600 flex items-center justify-center transition-colors duration-150"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    {/* Chat list */}
    <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.25) transparent' }}>
      {loading && (
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-xs text-slate-400">Loading…</span>
        </div>
      )}

      {!loading && chats.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-4 px-2">
          No chats yet.<br />Start a new conversation!
        </p>
      )}

      {chats.map((chat) => (
        <div
          key={chat._id}
          className={`group relative flex items-center gap-2 px-2 py-2 rounded-xl cursor-pointer transition-all duration-150 ${
            chat._id === activeChatId
              ? 'bg-indigo-100 text-indigo-700'
              : 'hover:bg-slate-100/80 text-slate-600'
          }`}
          onClick={() => onSelect(chat._id)}
        >
          {/* Chat icon */}
          <div className={`w-5 h-5 flex-shrink-0 rounded-md flex items-center justify-center text-[10px] ${
            chat._id === activeChatId ? 'bg-indigo-200' : 'bg-slate-200/60'
          }`}>
            💬
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate leading-tight">{chat.title || 'New Chat'}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{formatDate(chat.lastMessageAt || chat.updatedAt)}</p>
          </div>

          {/* Delete button — appears on hover */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(chat._id); }}
            title="Delete chat"
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-5 h-5 rounded-md hover:bg-red-100 hover:text-red-500 text-slate-400 flex items-center justify-center transition-all duration-150"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  </div>
);

// ─── Main Chatbot Component ───────────────────────────────────────────────────

const Chatbot = () => {
  const { user } = useAuth();
  const location = useLocation();

  // ── UI state
  const [isOpen, setIsOpen]           = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Chat state
  const [chats, setChats]               = useState([]);          // sidebar list (no messages)
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages]         = useState([]);           // active chat messages
  const [input, setInput]               = useState('');
  const [isTyping, setIsTyping]         = useState(false);

  // ── Loading/error state
  const [chatsLoading, setChatsLoading]     = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [stats, setStats]                   = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // ── Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => {
  const fetchStats = async () => {
    try {
      const res = await api.getOfficerStats();

      const data = res.data?.data ?? res.data ?? {};

      setStats({
        resolved: data.resolved ?? data.resolvedCount ?? 0,
        pending: data.pending ?? data.pendingCount ?? 0,
        inProgress: data.inProgress ?? data.in_progress ?? 0,
      });

    } catch (err) {
      console.error("Stats error:", err);
      setStats(null);
    }
  };

  fetchStats();
}, []);

  // ── Load chats whenever route changes or user changes
  useEffect(() => {
    if (!user) return;
    loadChats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, user?._id, user?.role]);

  const loadChats = useCallback(async () => {
    if (!user) return;
    setChatsLoading(true);
    try {
      const res = await api.getChats();
      const fetched = res.data?.chats ?? [];
      setChats(fetched);

      if (fetched.length > 0) {
        // Load the most recent chat
        await loadChatMessages(fetched[0]._id);
      } else {
        // No chats at all → create first one
        await createNewChat();
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
      // Fallback: show welcome without persistence
      setMessages([{ id: 'welcome', sender: 'bot', text: WELCOME_TEXT(user?.name), timestamp: new Date() }]);
    } finally {
      setChatsLoading(false);
    }
  }, [user]);

  const loadChatMessages = useCallback(async (chatId) => {
    setMessagesLoading(true);
    setActiveChatId(chatId);
    try {
      const res = await api.getChat(chatId);
      const chat = res.data?.chat;
      if (chat) {
        setMessages(
          chat.messages.length > 0
            ? chat.messages
            : [{ id: 'welcome', sender: 'bot', text: WELCOME_TEXT(user?.name), timestamp: new Date() }]
        );
      }
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  }, [user]);

  const createNewChat = useCallback(async () => {
  try {
    const res = await api.createChat();

    const newChat = res.data?.chat;

    if (newChat && newChat._id) {
      // ✅ Add new chat to sidebar
      setChats((prev) => [newChat, ...prev]);

      // ✅ Set active chat
      setActiveChatId(newChat._id);

      // ✅ Show welcome message
      setMessages([
        {
          id: 'welcome-' + Date.now(),
          sender: 'bot',
          text: WELCOME_TEXT(user?.name),
          timestamp: new Date(),
        },
      ]);

      // ✅ VERY IMPORTANT
      return newChat._id;
    }

  } catch (err) {
    console.error("Create chat failed:", err);
  }

  // ❗ fallback (still allow chatbot to work)
  return null;
}, [user]);

  // ── Refresh chat: clear UI only, do NOT touch DB
  const handleRefreshChat = useCallback(async () => {
    setMessages([{
      id: 'welcome-' + Date.now(),
      sender: 'bot',
      text: WELCOME_TEXT(user?.name),
      timestamp: new Date(),
    }]);
    setInput('');
    // Optionally create a fresh session in DB too (comment out if you want pure UI clear)
    await createNewChat();
  }, [user, createNewChat]);

  // ── Delete a chat from DB and UI
  const handleDeleteChat = useCallback(async (chatId) => {
    try {
      await api.deleteChat(chatId);
    } catch (err) {
      console.error('Delete failed:', err);
    }

    const remaining = chats.filter((c) => c._id !== chatId);
    setChats(remaining);

    if (activeChatId === chatId) {
      if (remaining.length > 0) {
        await loadChatMessages(remaining[0]._id);
      } else {
        await createNewChat();
      }
    }
  }, [chats, activeChatId, loadChatMessages, createNewChat]);

  // ── Send a message
  const sendMessage = useCallback(async (textOverride) => {
  const trimmed = (textOverride ?? input).trim();
  if (!trimmed) return;

  const userMsg = {
    id: 'u-' + Date.now(),
    sender: 'user',
    text: trimmed,
    timestamp: new Date(),
  };

  setMessages((prev) => [...prev, userMsg]);
  setInput('');
  setIsTyping(true);

  let currentChatId = activeChatId;

  // ✅ CRITICAL FIX
  if (!currentChatId) {
    currentChatId = await createNewChat();
  }

  await new Promise((r) => setTimeout(r, 400));

  const localResponse = buildResponse(trimmed, stats);

  if (!localResponse.includes("I didn't quite catch that")) {
    setMessages((prev) => [
      ...prev,
      {
        id: 'b-' + Date.now(),
        sender: 'bot',
        text: localResponse,
        timestamp: new Date(),
      }
    ]);
    setIsTyping(false);
    return;
  }

  try {
    const res = await api.sendMessage(currentChatId, { text: trimmed });

    const botReply =
      res.data?.botMessage?.text ||
      res.data?.botMessage?.content ||
      "⚠️ No AI response";

    setMessages((prev) => [
      ...prev,
      {
        id: 'b-' + Date.now(),
        sender: 'bot',
        text: botReply,
        timestamp: new Date(),
      }
    ]);

  } catch (err) {
    console.error("AI ERROR:", err);

    setMessages((prev) => [
      ...prev,
      {
        id: 'b-' + Date.now(),
        sender: 'bot',
        text: "⚠️ AI is currently unavailable",
        timestamp: new Date(),
      }
    ]);
  }

  setIsTyping(false);

  if (!isOpen) setUnreadCount((c) => c + 1);

}, [input, activeChatId, stats, isOpen, createNewChat]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Role label for header
  const roleLabel = useMemo(() => {
    if (!user) return 'Guest';
    const map = { citizen: '👤 Citizen', officer: '🧑‍💼 Officer', admin: '🔑 Admin' };
    return map[user.role] ?? user.role;
  }, [user]);

  // ── Minimized bubble ──────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Open CivicAI Assistant"
      >
        <span className="absolute inset-0 rounded-full bg-indigo-500 opacity-30 animate-ping group-hover:opacity-0 transition-opacity" />
        <div className="relative w-14 h-14 bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 rounded-full shadow-xl shadow-indigo-500/40 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-indigo-500/50">
          <span className="text-2xl">🏙️</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-bounce">
              {unreadCount}
            </span>
          )}
        </div>
        <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
          CivicAI Assistant ✨
        </span>
      </button>
    );
  }

  // ── Expanded chat window ──────────────────────────────────────────────────
  const chatWidth = showSidebar ? 'w-[620px]' : 'w-[360px]';

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 sm:hidden bg-black/20 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      <div
        className={`fixed bottom-6 right-6 z-50 ${chatWidth} max-h-[600px] flex flex-col rounded-3xl shadow-2xl shadow-indigo-900/30 overflow-hidden transition-all duration-300`}
        style={{
          background: 'linear-gradient(135deg, rgba(238,242,255,0.97) 0%, rgba(245,243,255,0.97) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(167,139,250,0.25)',
          animation: 'chatOpen 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* ── Header ── */}
        <div className="relative px-4 py-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 flex items-center gap-2 flex-shrink-0">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-8 w-16 h-16 bg-violet-400/20 rounded-full translate-y-1/2 blur-xl pointer-events-none" />

          {/* Sidebar toggle */}
          <button
            onClick={() => setShowSidebar((v) => !v)}
            title="Toggle history"
            className="relative w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white/80 hover:text-white transition-all duration-200 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Bot avatar */}
          <div className="relative w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-lg shadow-inner flex-shrink-0">
            🏙️
          </div>

          {/* Title */}
          <div className="relative flex-1 min-w-0">
            <h3 className="text-white font-bold text-sm tracking-wide leading-tight">CivicAI Assistant</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-indigo-200 text-[10px]">{roleLabel} · Smart City Guide</span>
            </div>
          </div>

          {/* Refresh chat button */}
          <button
            onClick={handleRefreshChat}
            title="Refresh chat (new session)"
            className="relative w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white/80 hover:text-white transition-all duration-200 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Minimize */}
          <button
            onClick={() => setIsOpen(false)}
            title="Minimize"
            className="relative w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white/80 hover:text-white transition-all duration-200 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* ── Body: Sidebar + Chat ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          {showSidebar && (
            <ChatSidebar
              chats={chats}
              activeChatId={activeChatId}
              onSelect={loadChatMessages}
              onNew={createNewChat}
              onDelete={handleDeleteChat}
              loading={chatsLoading}
            />
          )}

          {/* Chat panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.3) transparent' }}
            >
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full gap-2 text-slate-400">
                  <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                  <span className="text-sm">Loading messages…</span>
                </div>
              ) : (
                <>
                  {messages.map((msg) => <Message key={msg._id ?? msg.id} msg={msg} />)}
                  {isTyping && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Quick suggestions */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto hide-scrollbar flex-shrink-0">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => sendMessage(s.query)}
                  className="flex-shrink-0 px-3 py-1.5 text-[11px] font-medium bg-white border border-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all duration-200 shadow-sm whitespace-nowrap"
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Input bar */}
            <div className="px-4 pb-4 pt-1 flex-shrink-0">
              <div className="flex items-center gap-2 bg-white rounded-2xl border border-indigo-100 shadow-sm px-4 py-2.5 focus-within:border-indigo-300 focus-within:shadow-indigo-100 focus-within:shadow-md transition-all duration-200">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything civic…"
                  className="flex-1 text-sm text-slate-700 placeholder-slate-400 bg-transparent outline-none min-w-0"
                  disabled={isTyping || messagesLoading}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping || messagesLoading}
                  className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-300/40 hover:shadow-indigo-400/60 hover:scale-105 disabled:opacity-40 disabled:scale-100 disabled:shadow-none transition-all duration-200 flex-shrink-0"
                  aria-label="Send message"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <p className="text-center text-[10px] text-slate-400 mt-1.5">
                Powered by CivicVoice AI · Smart City Platform
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes chatOpen {
          from { opacity: 0; transform: scale(0.85) translateY(20px); transform-origin: bottom right; }
          to   { opacity: 1; transform: scale(1) translateY(0);       transform-origin: bottom right; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out forwards; }
        .animate-fade-in  { animation: fade-in 0.2s ease-out forwards; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
};

export default Chatbot;