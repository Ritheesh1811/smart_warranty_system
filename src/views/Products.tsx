import { Package, Plus, ShieldCheck, AlertTriangle, ShieldX, Search } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '../lib/types';
import { computeWarrantyStatus, daysUntilExpiry } from '../lib/agent';

interface Props {
  products: Product[];
  onOpenProduct: (id: string) => void;
  onRegister: () => void;
}

export default function Products({ products, onOpenProduct, onRegister }: Props) {
  const [search, setSearch] = useState('');

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.model_number ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500 mt-1">{products.length} registered appliance{products.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={onRegister}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Register Product
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by name, brand, category, or model..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">
            {search ? 'No products match your search.' : 'No products registered yet.'}
          </p>
          <p className="text-xs text-slate-400 mb-4">
            {search ? 'Try a different search term.' : 'Register your first appliance to start building its memory.'}
          </p>
          {!search && (
            <button
              onClick={onRegister}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Register Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const status = computeWarrantyStatus(p.warranty_expiry);
            const days = daysUntilExpiry(p.warranty_expiry);
            const StatusIcon = status === 'active' ? ShieldCheck : status === 'expiring' ? AlertTriangle : ShieldX;
            const statusColor =
              status === 'active' ? 'text-emerald-600 bg-emerald-50'
              : status === 'expiring' ? 'text-amber-600 bg-amber-50'
              : 'text-rose-600 bg-rose-50';
            return (
              <button
                key={p.id}
                onClick={() => onOpenProduct(p.id)}
                className="group bg-white rounded-xl border border-slate-200 p-5 text-left hover:shadow-md hover:border-sky-200 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-sky-50 transition-colors">
                    <Package className="w-[22px] h-[22px] text-slate-500 group-hover:text-sky-500 transition-colors" />
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusColor}`}>
                    <StatusIcon className="w-3 h-3" strokeWidth={2.5} />
                    <span className="capitalize">{status}</span>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 mb-0.5">{p.brand} {p.name}</h3>
                <p className="text-xs text-slate-500 mb-3">{p.category}{p.model_number ? ` · ${p.model_number}` : ''}</p>

                <div className="space-y-1.5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Purchase</span>
                    <span className="text-slate-600 font-medium">{p.purchase_date ? new Date(p.purchase_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Warranty expires</span>
                    <span className={`font-medium ${status === 'expired' ? 'text-rose-600' : status === 'expiring' ? 'text-amber-600' : 'text-slate-600'}`}>
                      {p.warranty_expiry ? new Date(p.warranty_expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  {days !== null && days >= 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Days remaining</span>
                      <span className={`font-semibold ${days <= 7 ? 'text-rose-600' : days <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {days} days
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
