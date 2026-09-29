import { Bell, Package, Clock, AlertTriangle, Brain } from 'lucide-react';
import type { Notification, Product } from '../lib/types';
import { markNotificationRead } from '../lib/db';
import { useState } from 'react';

interface Props {
  notifications: Notification[];
  products: Product[];
  onOpenProduct: (id: string) => void;
  onRefresh: () => void;
}

export default function Notifications({ notifications, products, onOpenProduct, onRefresh }: Props) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const shown = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;
  const productMap = new Map(products.map((p) => [p.id, p]));

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      onRefresh();
    }
    if (n.product_id) onOpenProduct(n.product_id);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">Context-aware reminders powered by your product memory.</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">
            {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
          </p>
          <p className="text-xs text-slate-400">Warranty expiry alerts and recurring issue reminders will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((n) => {
            const product = n.product_id ? productMap.get(n.product_id) : null;
            const isWarranty = n.kind === 'warranty_expiry' || /warrant/i.test(n.title);
            const Icon = isWarranty ? AlertTriangle : Brain;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                  n.read
                    ? 'border-slate-100 bg-white hover:border-slate-200'
                    : 'border-sky-200 bg-sky-50/40 hover:border-sky-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isWarranty ? 'bg-amber-50' : 'bg-sky-50'
                }`}>
                  <Icon className={`w-5 h-5 ${isWarranty ? 'text-amber-500' : 'text-sky-500'}`} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500">{n.body}</p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                    {product && (
                      <span className="flex items-center gap-1">
                        <Package className="w-2.5 h-2.5" />
                        {product.brand} {product.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
