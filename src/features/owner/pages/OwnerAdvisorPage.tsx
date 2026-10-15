import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Plus,
  Trash2,
  RotateCcw,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  Users,
  Dumbbell,
  MessageSquare,
  ChevronRight,
  ShieldAlert,
  Loader2,
  CalendarCheck,
  CheckCircle2,
} from 'lucide-react';
import { advisorApi, AdvisorMessage, AdvisorConversation } from '../../../api/advisorApi';
import { OwnerHeader } from '../components/OwnerHeader';
import { OwnerNav } from '../components/OwnerNav';
import { useOwnerOverview } from '../hooks/useOwnerOverview';

const SUGGESTED_QUESTIONS = [
  {
    icon: <CalendarCheck className="w-4 h-4 text-emerald-400" />,
    category: 'Attendance',
    text: 'How has attendance changed over the last 30 days?',
  },
  {
    icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    category: 'Attention',
    text: 'What operational issues currently need attention?',
  },
  {
    icon: <Users className="w-4 h-4 text-blue-400" />,
    category: 'Staffing',
    text: 'How many active members do not have a trainer assigned?',
  },
  {
    icon: <TrendingUp className="w-4 h-4 text-purple-400" />,
    category: 'Retention',
    text: 'What does our current retention rate mean?',
  },
  {
    icon: <Dumbbell className="w-4 h-4 text-cyan-400" />,
    category: 'Trainers',
    text: 'How many trainers have active client assignments?',
  },
  {
    icon: <CreditCard className="w-4 h-4 text-orange-400" />,
    category: 'Billing',
    text: 'What does our organization billing status indicate?',
  },
  {
    icon: <Sparkles className="w-4 h-4 text-amber-400" />,
    category: 'Strategy',
    text: 'Which available operational metrics should I investigate next?',
  },
];

const TOOL_FRIENDLY_NAMES: Record<string, string> = {
  get_organization_overview: 'Analyzed organization facilities & metrics',
  get_member_summary: 'Evaluated membership distribution & growth',
  get_attendance_summary: 'Computed attendance volume & peak hours',
  get_trainer_assignments: 'Audited trainer workloads & unassigned members',
  get_retention_summary: 'Calculated attendance-based retention rate',
  get_attention_items: 'Screened active operational alerts & items',
  get_organization_billing_status: 'Retrieved B2B software billing status',
};

export const OwnerAdvisorPage: React.FC = () => {
  const { data: overview } = useOwnerOverview();
  const [conversations, setConversations] = useState<AdvisorConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const primaryLocation =
    overview?.locations?.find((l) => l.is_primary)?.name || overview?.locations?.[0]?.name;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load conversation list on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsInitializing(true);
      const list = await advisorApi.listConversations();
      setConversations(list);
      if (list.length > 0) {
        // Select most recent conversation
        setActiveConvId(list[0].id);
        await loadHistory(list[0].id);
      }
    } catch (err: any) {
      // Non-blocking: user can still start a new conversation
    } finally {
      setIsInitializing(false);
    }
  };

  const loadHistory = async (convId: string) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const history = await advisorApi.getConversationHistory(convId);
      setMessages(history);
    } catch (err: any) {
      setErrorMessage('Failed to load consultation history.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = async (convId: string) => {
    setActiveConvId(convId);
    setIsHistoryOpen(false);
    await loadHistory(convId);
  };

  const handleNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setErrorMessage(null);
    setIsHistoryOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await advisorApi.deleteConversation(convId);
      const updated = conversations.filter((c) => c.id !== convId);
      setConversations(updated);
      if (activeConvId === convId) {
        if (updated.length > 0) {
          setActiveConvId(updated[0].id);
          await loadHistory(updated[0].id);
        } else {
          handleNewConversation();
        }
      }
    } catch {
      // Ignore delete errors
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputMessage).trim();
    if (!prompt || isLoading) return;

    setInputMessage('');
    setErrorMessage(null);

    // Append optimistic user message
    const userMsg: AdvisorMessage = {
      role: 'user',
      content: prompt,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await advisorApi.sendMessage({
        message: prompt,
        conversationId: activeConvId || undefined,
      });

      const assistantMsg: AdvisorMessage = {
        role: 'assistant',
        content: response.message,
        toolsCalled: response.toolsCalled,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If this was a new conversation, record it in state
      if (!activeConvId && response.conversationId) {
        setActiveConvId(response.conversationId);
        const newConv: AdvisorConversation = {
          id: response.conversationId,
          title: prompt.length > 35 ? `${prompt.substring(0, 32)}...` : prompt,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setConversations((prev) => [newConv, ...prev]);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Consultation request failed.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* 1. Master Header with Organization Identity */}
      <OwnerHeader
        organizationName={overview?.organization?.name || 'Facility'}
        primaryLocationName={primaryLocation}
        totalLocations={overview?.locations?.length}
        status={overview?.organization?.status}
        currentOrgId={overview?.organization?.id}
      />

      {/* 2. Canonical Owner Navigation */}
      <OwnerNav />

      {/* 3. Main Consultation Body */}
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 min-h-[calc(100vh-140px)]">
        {/* Advisor Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06] mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500/20 via-orange-500/10 to-transparent border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-sm shadow-orange-500/10 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  TRINETRA Business Advisor
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
                  B2B Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Read-only operations, growth analytics, and financial diagnostics for gym leadership.
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNewConversation}
              className="min-h-[44px] flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-xl transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
              title="Start fresh consultation"
            >
              <Plus className="w-4 h-4 text-orange-400" />
              <span>New Consultation</span>
            </button>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="min-h-[44px] flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl transition-all sm:hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              title="Toggle Sessions History"
            >
              <MessageSquare className="w-4 h-4" />
              <span>History</span>
            </button>
          </div>
        </div>

        {/* Main Container: Chat + Session Sidebar */}
        <div className="flex-1 flex gap-4 min-h-0 relative">
        {/* Chat Stream Viewport */}
        <div className="flex-1 flex flex-col bg-[#07090E]/80 backdrop-blur-md rounded-2xl border border-white/[0.06] overflow-hidden">
          {/* Scrollable Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center max-w-2xl mx-auto py-8">
                <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-orange-500/20 via-orange-500/5 to-transparent border border-orange-500/30 flex items-center justify-center text-orange-400 mb-4 shadow-lg shadow-orange-500/10">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">
                  How can TRINETRA assist your facility today?
                </h2>
                <p className="text-xs text-slate-400 max-w-md mb-8">
                  Ask questions about attendance trends, membership growth, unassigned trainers,
                  operational risks, and B2B subscription metrics.
                </p>

                {/* Suggested Starters Grid */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                  {SUGGESTED_QUESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(item.text)}
                      className="group flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-orange-500/30 transition-all text-left focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                    >
                      <div className="p-1.5 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.08] transition-colors mt-0.5">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-semibold text-slate-500 group-hover:text-orange-400 uppercase tracking-wider block">
                          {item.category}
                        </span>
                        <span className="text-xs text-slate-300 group-hover:text-white transition-colors block mt-0.5 leading-snug">
                          {item.text}
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-orange-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message List */}
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500/20 to-orange-500/5 border border-orange-500/30 flex items-center justify-center text-orange-400 flex-shrink-0 mt-1 shadow-sm shadow-orange-500/10">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                    <div
                      className={`px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-tr-none shadow-sm shadow-orange-500/20'
                          : 'bg-white/[0.04] text-slate-200 border border-white/[0.06] rounded-tl-none font-normal'
                      }`}
                    >
                      {/* Message Content formatted cleanly */}
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    </div>

                    {/* Human-readable Tool Activity Badges */}
                    {!isUser && msg.toolsCalled && msg.toolsCalled.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {msg.toolsCalled.map((toolName, toolIdx) => (
                          <span
                            key={toolIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{TOOL_FRIENDLY_NAMES[toolName] || toolName}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-white flex-shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500/20 to-orange-500/5 border border-orange-500/30 flex items-center justify-center text-orange-400 flex-shrink-0 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] rounded-tl-none flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                  <span className="text-xs text-slate-400 font-medium animate-pulse">
                    TRINETRA is analyzing gym records...
                  </span>
                </div>
              </div>
            )}

            {/* Error Banner with Retry */}
            {errorMessage && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-semibold text-[11px] transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Input Box */}
          <div className="p-3 sm:p-4 border-t border-white/[0.06] bg-[#07090E]/95">
            <div className="flex items-end gap-2 bg-white/[0.03] border border-white/[0.08] focus-within:border-orange-500/40 focus-within:ring-1 focus-within:ring-orange-500/30 rounded-2xl p-2 transition-all">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask TRINETRA about members, attendance, retention, trainers, or billing..."
                rows={1}
                disabled={isLoading}
                className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none resize-none px-2 py-1 max-h-32 min-h-[38px] leading-relaxed"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className={`min-w-[44px] min-h-[44px] p-2.5 rounded-xl flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  inputMessage.trim() && !isLoading
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:brightness-110 shadow-sm shadow-orange-500/20 cursor-pointer'
                    : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
                }`}
                title="Send consultation inquiry (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-2 pt-2">
              <span>Read-only analytics advisor • STRIVA V2 Engine</span>
              <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
            </div>
          </div>
        </div>

        {/* Sessions / Conversation History Sidebar (Desktop & Mobile Drawer) */}
        <div
          className={`${
            isHistoryOpen ? 'flex' : 'hidden'
          } sm:flex flex-col w-72 bg-[#07090E]/80 backdrop-blur-md rounded-2xl border border-white/[0.06] overflow-hidden flex-shrink-0`}
        >
          <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Consultations
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.04]">
              {conversations.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isInitializing ? (
              <div className="flex items-center justify-center py-8 text-slate-500 text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading history...
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 px-4 text-slate-500 text-xs">
                No past consultations yet. Start asking questions to establish your business logs.
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.id === activeConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30 font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-orange-400' : 'text-slate-500'}`} />
                      <span className="truncate">{conv.title || 'Consultation Session'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-slate-500 transition-all rounded"
                      title="Delete consultation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      </main>
    </div>
  );
};
