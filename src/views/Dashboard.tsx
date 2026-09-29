import { useEffect, useState } from 'react';
import { Package, ShieldCheck, AlertTriangle, ShieldX, Wrench, RefreshCw, TrendingDown, ChevronRight } from 'lucide-react';
import type { Product, Notification } from '../lib/types';
import { getDashboardStats, daysUntilExpiry, computeWarrantyStatus } from '../lib/agent';
import type { DashboardStats } from '../lib/agent';

interface Props {
  products: Product[];
  notifications: Notification[];
  onOpenProduct: (id: string) => void;
  onNavigate: (view: 'dashboard' | 'products' | 'notifications') => void;
}

export default function Dashboard({ products, notifications, onOpenProduct, onNavigate }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    getDashboardStats().then(setStats);
  }, [products]);

  const expiringSoon = products
    .filter((p) => {
      const days = daysUntilExpiry(p.warranty_expiry);
      return days !== null && days >= 0 && days <= 30;
    })
    .sort((a, b) => (daysUntilExpiry(a.warranty_expiry) ?? 999) - (daysUntilExpiry(b.warranty_expiry) ?? 999));

  const recentNotifs = notifications.slice(0, 4);

  const statCards = [
    { label: 'Total Products', value: stats?.totalProducts ?? 0, icon: Package, color: 'sky', bg: 'bg-sky-50', text: 'text-sky-600' },
    { label: 'Active Warranties', value: stats?.activeWarranties ?? 0, icon: ShieldCheck, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Expiring Soon', value: stats?.expiringWarranties ?? 0, icon: AlertTriangle, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-600' },
    { label: 'Expired', value: stats?.expiredWarranties ?? 0, icon: ShieldX, color: 'rose', bg: 'bg-rose-50', text: 'text-rose-600' },
    { label: 'Total Issues', value: stats?.totalIssues ?? 0, icon: Wrench, color: 'slate', bg: 'bg-slate-100', text: 'text-slate-600' },
    { label: 'Recurring', value: stats?.recurringIssues ?? 0, icon: TrendingDown, color: 'orange', bg: 'bg-orange-50', text: 'text-orange-600' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Your household appliances at a glance, with AI-powered memory and warranty intelligence.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-[18px] h-[18px] ${card.text}`} strokeWidth={2.2} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring warranties */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Warranties Expiring Soon
            </h2>
            <button onClick={() => onNavigate('products')} className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {expiringSoon.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No warranties expiring in the next 30 days.</p>
          ) : (
            <div className="space-y-2">
              {expiringSoon.slice(0, 4).map((p) => {
                const days = daysUntilExpiry(p.warranty_expiry);
                return (
                  <button
                    key={p.id}
                    onClick={() => onOpenProduct(p.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.brand} {p.name}</p>
                      <p className="text-xs text-slate-500">{p.category}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${days! <= 7 ? 'text-rose-600' : 'text-amber-600'}`}>
                        {days} days
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent notifications */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-sky-500" />
              Recent Notifications
            </h2>
            <button onClick={() => onNavigate('notifications')} className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {recentNotifs.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {recentNotifs.map((n) => (
                <div key={n.id} className={`p-3 rounded-lg border ${n.read ? 'border-slate-100 bg-white' : 'border-sky-100 bg-sky-50/50'}`}>
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Products overview */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Your Products</h2>
        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-1">No products registered yet.</p>
            <p className="text-xs text-slate-400">Register your first appliance to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.slice(0, 6).map((p) => {
              const status = computeWarrantyStatus(p.warranty_expiry);
              const statusColor = status === 'active' ? 'bg-emerald-500' : status === 'expiring' ? 'bg-amber-500' : 'bg-rose-500';
              return (
                <button
                  key={p.id}
                  onClick={() => onOpenProduct(p.id)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-sky-200 hover:bg-sky-50/30 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-slate-500 group-hover:text-sky-500 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.brand} {p.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                      <span className="text-xs text-slate-500 capitalize">{status} warranty</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
