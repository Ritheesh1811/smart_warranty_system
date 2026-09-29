import { Brain, Save, RotateCcw, Lightbulb, Plus } from 'lucide-react';
import type { MemoryEvent } from '../lib/types';
import type { IssuePattern } from '../lib/agent';

interface Props {
  memories: MemoryEvent[];
  patterns: IssuePattern[];
}

const LAYER_CONFIG = {
  RETAIN: {
    icon: Save,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
    label: 'RETAIN',
    desc: 'Storing new information',
  },
  RECALL: {
    icon: RotateCcw,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
    label: 'RECALL',
    desc: 'Retrieving past memories',
  },
  REFLECT: {
    icon: Lightbulb,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    label: 'REFLECT',
    desc: 'Learning from patterns',
  },
};

export default function MemoryPanel({ memories, patterns }: Props) {
  const retain = memories.filter((m) => m.layer === 'RETAIN');
  const recall = memories.filter((m) => m.layer === 'RECALL');
  const reflect = memories.filter((m) => m.layer === 'REFLECT');

  return (
    <div className="p-4 space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {(['RETAIN', 'RECALL', 'REFLECT'] as const).map((layer) => {
          const cfg = LAYER_CONFIG[layer];
          const count = memories.filter((m) => m.layer === layer).length;
          const Icon = cfg.icon;
          return (
            <div key={layer} className={`rounded-lg ${cfg.bg} border ${cfg.border} p-2.5 text-center`}>
              <Icon className={`w-4 h-4 ${cfg.color} mx-auto mb-1`} strokeWidth={2.2} />
              <p className={`text-lg font-bold ${cfg.color}`}>{count}</p>
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Pattern alert */}
      {patterns.filter((p) => p.count >= 2).length > 0 && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-orange-500" strokeWidth={2.2} />
            <p className="text-[11px] font-bold text-orange-900 uppercase tracking-wide">Pattern Intelligence</p>
          </div>
          {patterns.filter((p) => p.count >= 2).map((p) => (
            <p key={p.issue} className="text-[11px] text-orange-700 leading-relaxed mb-1 last:mb-0">
              "{p.issue}" recurred {p.count}x — previous repair did not permanently resolve it.
            </p>
          ))}
        </div>
      )}

      {/* RETAIN */}
      <MemorySection layer="RETAIN" items={retain} />

      {/* RECALL */}
      <MemorySection layer="RECALL" items={recall} />

      {/* REFLECT */}
      <MemorySection layer="REFLECT" items={reflect} />

      {memories.length === 0 && (
        <div className="text-center py-8">
          <Brain className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-400">No memories yet. Start chatting with the AI to build this product's memory.</p>
        </div>
      )}
    </div>
  );
}

function MemorySection({ layer, items }: { layer: 'RETAIN' | 'RECALL' | 'REFLECT'; items: MemoryEvent[] }) {
  const cfg = LAYER_CONFIG[layer];
  const Icon = cfg.icon;

  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} strokeWidth={2.2} />
        <h4 className={`text-[11px] font-bold ${cfg.color} uppercase tracking-wide`}>{cfg.label}</h4>
        <span className="text-[10px] text-slate-400">— {cfg.desc}</span>
      </div>
      <div className="space-y-1.5">
        {items.slice(-6).reverse().map((m) => (
          <div key={m.id} className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-100 animate-slide-in">
            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mt-1.5 flex-shrink-0`} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700">{m.label}</p>
              {m.description && <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{m.description}</p>}
            </div>
          </div>
        ))}
        {items.length > 6 && (
          <p className="text-[10px] text-slate-400 text-center pt-1">+{items.length - 6} more</p>
        )}
      </div>
    </div>
  );
}
