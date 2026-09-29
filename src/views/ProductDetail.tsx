import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Package, ShieldCheck, AlertTriangle, ShieldX, Send, Brain,
  Wrench, Stethoscope, Hammer, Calendar, FileText, TrendingDown, Sparkles,
  Clock, CheckCircle2, XCircle, BookOpen, Zap, Trash2, ChevronDown, ChevronUp, ChevronRight,
} from 'lucide-react';
import type { Product, ProductInteraction, MemoryEvent, WarrantyClaim, ChatMessage } from '../lib/types';
import { fetchProduct, fetchInteractions, fetchMemoryEvents, fetchClaims, deleteProduct } from '../lib/db';
import { chat, computeWarrantyStatus, daysUntilExpiry, detectPatterns } from '../lib/agent';
import type { IssuePattern } from '../lib/agent';
import MemoryPanel from '../components/MemoryPanel';

interface Props {
  productId: string;
  onBack: () => void;
  onRefresh: () => void;
}

type Tab = 'assistant' | 'timeline' | 'claims';

const INTERACTION_ICONS: Record<string, typeof Wrench> = {
  problem: AlertTriangle,
  troubleshooting: Stethoscope,
  repair: Hammer,
  service_visit: Wrench,
  warranty_claim: FileText,
  conversation: BookOpen,
};

const INTERACTION_COLORS: Record<string, string> = {
  problem: 'bg-rose-100 text-rose-600',
  troubleshooting: 'bg-sky-100 text-sky-600',
  repair: 'bg-amber-100 text-amber-600',
  service_visit: 'bg-violet-100 text-violet-600',
  warranty_claim: 'bg-emerald-100 text-emerald-600',
  conversation: 'bg-slate-100 text-slate-500',
};

const QUICK_PROMPTS = [
  'Is my warranty still active?',
  'The machine is not draining',
  'I cleaned the filter and it works now',
  'Prepare a warranty claim',
  'The same problem happened again',
];

export default function ProductDetail({ productId, onBack, onRefresh }: Props) {
  const [product, setProduct] = useState<Product | null>(null);
  const [interactions, setInteractions] = useState<ProductInteraction[]>([]);
  const [memories, setMemories] = useState<MemoryEvent[]>([]);
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [patterns, setPatterns] = useState<IssuePattern[]>([]);
  const [tab, setTab] = useState<Tab>('assistant');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [showMemPanel, setShowMemPanel] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadAll = useCallback(async () => {
    const [p, ixs, mems, cls] = await Promise.all([
      fetchProduct(productId),
      fetchInteractions(productId),
      fetchMemoryEvents(productId),
      fetchClaims(productId),
    ]);
    setProduct(p);
    setInteractions(ixs);
    setMemories(mems);
    setClaims(cls);
    if (p) {
      const pats = await detectPatterns(p.id);
      setPatterns(pats);
    }
  }, [productId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (product && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'agent',
        content: `Hi! I'm your AI warranty & repair assistant for your ${product.brand} ${product.name}. I have access to your product's warranty information, manufacturer documentation, and complete repair history.\n\nAsk me about warranty status, report a problem, or request a warranty claim — I'll remember everything.`,
        timestamp: Date.now(),
      }]);
    }
  }, [product, messages.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const handleSend = async (text: string) => {
    if (!product || !text.trim() || thinking) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    try {
      const response = await chat(product, text);
      const agentMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'agent',
        content: response.reply,
        timestamp: Date.now(),
        sources: response.sources,
        memoryUsed: response.memoryUsed,
      };
      setMessages((prev) => [...prev, agentMsg]);
      // Refresh data
      await loadAll();
      onRefresh();
    } catch (e) {
      setMessages((prev) => [...prev, {
        id: `e-${Date.now()}`,
        role: 'agent',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: Date.now(),
      }]);
    } finally {
      setThinking(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (confirm(`Delete ${product.brand} ${product.name}? This will remove all its history and memory.`)) {
      await deleteProduct(product.id);
      onRefresh();
      onBack();
    }
  };

  if (!product) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const status = computeWarrantyStatus(product.warranty_expiry);
  const days = daysUntilExpiry(product.warranty_expiry);
  const StatusIcon = status === 'active' ? ShieldCheck : status === 'expiring' ? AlertTriangle : ShieldX;
  const statusColor = status === 'active' ? 'text-emerald-600 bg-emerald-50' : status === 'expiring' ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';

  return (
    <div className="animate-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-6 pb-4 bg-white border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <button onClick={onBack} className="mt-1 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{product.brand} {product.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span>{product.category}</span>
                {product.model_number && <span>· Model: {product.model_number}</span>}
                {product.serial_number && <span>· S/N: {product.serial_number}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusColor}`}>
              <StatusIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span className="capitalize">{status}</span>
              {days !== null && days >= 0 && <span className="ml-1 opacity-75">({days}d left)</span>}
            </div>
            <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4">
          {([
            { id: 'assistant' as Tab, label: 'AI Assistant', icon: Sparkles },
            { id: 'timeline' as Tab, label: 'Memory Timeline', icon: Clock },
            { id: 'claims' as Tab, label: 'Warranty Claims', icon: FileText },
          ]).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {t.id === 'claims' && claims.length > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}`}>
                    {claims.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {tab === 'assistant' && (
            <ChatView
              messages={messages}
              thinking={thinking}
              input={input}
              setInput={setInput}
              onSend={handleSend}
              quickPrompts={QUICK_PROMPTS}
              chatEndRef={chatEndRef}
              patterns={patterns}
            />
          )}
          {tab === 'timeline' && (
            <TimelineView interactions={interactions} product={product} />
          )}
          {tab === 'claims' && (
            <ClaimsView claims={claims} />
          )}
        </div>

        {/* Memory Panel */}
        {showMemPanel && tab === 'assistant' && (
          <div className="w-80 border-l border-slate-200 bg-slate-50/50 overflow-y-auto scrollbar-thin flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-sky-500" />
                <h3 className="text-sm font-semibold text-slate-900">Memory</h3>
              </div>
              <button onClick={() => setShowMemPanel(false)} className="text-slate-400 hover:text-slate-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <MemoryPanel memories={memories} patterns={patterns} />
          </div>
        )}
        {!showMemPanel && tab === 'assistant' && (
          <button
            onClick={() => setShowMemPanel(true)}
            className="w-10 border-l border-slate-200 bg-slate-50/50 flex items-center justify-center hover:bg-white transition-colors flex-shrink-0"
          >
            <div className="flex flex-col items-center gap-1">
              <Brain className="w-4 h-4 text-sky-500" />
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return <ChevronDown className={`${className} rotate-90`} />;
}

// --- Chat View ---

interface ChatViewProps {
  messages: ChatMessage[];
  thinking: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: (text: string) => void;
  quickPrompts: string[];
  chatEndRef: React.RefObject<HTMLDivElement>;
  patterns: IssuePattern[];
}

function ChatView({ messages, thinking, input, setInput, onSend, quickPrompts, chatEndRef, patterns }: ChatViewProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Pattern alerts */}
      {patterns.filter((p) => p.count >= 2).length > 0 && (
        <div className="px-6 pt-4">
          {patterns.filter((p) => p.count >= 2).map((p) => (
            <div key={p.issue} className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 border border-orange-200 animate-fade-in">
              <TrendingDown className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-900">Pattern Detected: "{p.issue}" recurring</p>
                <p className="text-xs text-orange-700 mt-0.5">
                  This issue has occurred {p.count} times. {p.repairs.length > 0
                    ? `Previous repair (${p.repairs[p.repairs.length - 1]}) did not permanently resolve it.`
                    : 'Previous troubleshooting did not permanently resolve it.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`max-w-[80%] ${msg.role === 'user' ? '' : 'w-full'}`}>
              {msg.role === 'agent' && (
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-slate-500">SmartWarranty AI</span>
                  {msg.memoryUsed && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-full">
                      <Brain className="w-2.5 h-2.5" /> Memory used
                    </span>
                  )}
                </div>
              )}
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-slate-900 text-white rounded-br-md'
                  : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md'
              }`}>
                {msg.content.split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {msg.sources.map((src, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      <BookOpen className="w-2.5 h-2.5" />
                      {src}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-500">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="px-6 pb-2 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSend(prompt)}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-100 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend(input);
              }
            }}
            placeholder="Ask about warranty, report a problem, or request a claim..."
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all max-h-32"
          />
          <button
            onClick={() => onSend(input)}
            disabled={!input.trim() || thinking}
            className="p-2.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Timeline View ---

function TimelineView({ interactions, product }: { interactions: ProductInteraction[]; product: Product }) {
  const events: { date: string; icon: typeof Wrench; color: string; title: string; detail: string | null; kind: string }[] = [
    {
      date: product.purchase_date ?? product.created_at,
      icon: Package,
      color: 'bg-sky-100 text-sky-600',
      title: 'Product Purchased',
      detail: `${product.brand} ${product.name} purchased${product.seller ? ` from ${product.seller}` : ''}`,
      kind: 'purchase',
    },
    {
      date: product.created_at,
      icon: ShieldCheck,
      color: 'bg-emerald-100 text-emerald-600',
      title: 'Product Registered',
      detail: `Registered with ${product.warranty_duration_months}-month warranty. Expires ${product.warranty_expiry ? new Date(product.warranty_expiry).toLocaleDateString() : 'N/A'}`,
      kind: 'registration',
    },
    ...interactions.map((ix) => ({
      date: ix.created_at,
      icon: INTERACTION_ICONS[ix.kind] ?? BookOpen,
      color: INTERACTION_COLORS[ix.kind] ?? 'bg-slate-100 text-slate-500',
      title: ix.summary,
      detail: ix.detail,
      kind: ix.kind,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Product Memory Timeline</h2>
      <p className="text-sm text-slate-500 mb-6">Complete history of your {product.brand} {product.name} — every interaction is remembered.</p>

      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />
        <div className="space-y-5">
          {events.map((event, i) => {
            const Icon = event.icon;
            return (
              <div key={i} className="relative flex items-start gap-4 animate-slide-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ring-4 ring-white ${event.color}`}>
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <div className="flex-1 bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 capitalize">{event.title}</h3>
                    <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {event.detail && <p className="text-xs text-slate-500">{event.detail}</p>}
                  {event.kind === 'problem' && (
                    <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">
                      {interactions.find((ix) => ix.summary === event.title)?.resolved
                        ? <><CheckCircle2 className="w-2.5 h-2.5" /> Resolved</>
                        : <><XCircle className="w-2.5 h-2.5" /> Unresolved</>}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {interactions.length === 0 && (
        <div className="text-center py-12 mt-4">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No interactions yet. Start a conversation with the AI Assistant to build this product's memory.</p>
        </div>
      )}
    </div>
  );
}

// --- Claims View ---

function ClaimsView({ claims }: { claims: WarrantyClaim[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (claims.length === 0) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center py-20">
        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700 mb-1">No warranty claims yet</p>
        <p className="text-xs text-slate-400">Ask the AI Assistant to "prepare a warranty claim" to generate one with your full repair history.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Warranty Claims</h2>
      <p className="text-sm text-slate-500 mb-6">Claims generated by the AI assistant with full product memory and repair history.</p>

      <div className="space-y-3">
        {claims.map((claim) => (
          <div key={claim.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === claim.id ? null : claim.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <FileText className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{claim.issue}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {claim.issue_recurrence} occurrence(s) · {new Date(claim.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{claim.status}</span>
                {expanded === claim.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>
            {expanded === claim.id && claim.claim_summary && (
              <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {claim.claim_summary.split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
