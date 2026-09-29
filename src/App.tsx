import { useState, useEffect, useCallback } from 'react';
import { Shield, LayoutDashboard, Package, Bell, Brain, Plus, X } from 'lucide-react';
import type { Product, Notification } from './lib/types';
import { fetchProducts, fetchNotifications, refreshWarrantyStatuses } from './lib/db';
import Dashboard from './views/Dashboard';
import Products from './views/Products';
import ProductDetail from './views/ProductDetail';
import Notifications from './views/Notifications';
import RegisterModal from './views/RegisterModal';

type View = 'dashboard' | 'products' | 'product' | 'notifications';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    await refreshWarrantyStatuses();
    const [prods, notifs] = await Promise.all([fetchProducts(), fetchNotifications()]);
    setProducts(prods);
    setNotifications(notifs);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openProduct = (id: string) => {
    setSelectedProductId(id);
    setView('product');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products' as View, label: 'Products', icon: Package },
    { id: 'notifications' as View, label: 'Notifications', icon: Bell, badge: unreadCount },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">SmartWarranty</h1>
              <p className="text-[10px] text-slate-500 leading-tight">AI Repair Agent</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.id || (item.id === 'products' && view === 'product');
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.4 : 2} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge ? (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={() => setShowRegister(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Register Product
          </button>
        </div>

        <div className="px-6 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <Brain className="w-3.5 h-3.5" />
            <span>Powered by Hindsight Memory</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === 'dashboard' ? (
          <Dashboard products={products} notifications={notifications} onOpenProduct={openProduct} onNavigate={setView} />
        ) : view === 'products' ? (
          <Products products={products} onOpenProduct={openProduct} onRegister={() => setShowRegister(true)} />
        ) : view === 'product' && selectedProductId ? (
          <ProductDetail
            productId={selectedProductId}
            onBack={() => setView('products')}
            onRefresh={loadData}
          />
        ) : view === 'notifications' ? (
          <Notifications notifications={notifications} products={products} onOpenProduct={openProduct} onRefresh={loadData} />
        ) : null}
      </main>

      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onRegistered={() => {
            setShowRegister(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
