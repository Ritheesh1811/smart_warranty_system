import { useState } from 'react';
import { X, ScanLine, FileUp, Sparkles, Check, ChevronRight } from 'lucide-react';
import { createProduct } from '../lib/db';

interface Props {
  onClose: () => void;
  onRegistered: () => void;
}

const CATEGORIES = ['Washing Machine', 'Refrigerator', 'Air Conditioner', 'Microwave', 'Television', 'Laptop', 'Water Purifier', 'Dishwasher', 'Other'];
const BRANDS = ['LG', 'Samsung', 'Whirlpool', 'Panasonic', 'Bosch', 'Siemens', 'Haier', 'Godrej', 'Other'];

// Simulated OCR templates for demo
const OCR_TEMPLATES = [
  { name: 'LG Front Load Washing Machine', brand: 'LG', category: 'Washing Machine', model: 'FHT1208ZNL', serial: 'SN9W2024LG001', seller: 'Croma Retail', months: 24, purchase: '2025-01-15' },
  { name: 'Samsung Split AC 1.5 Ton', brand: 'Samsung', category: 'Air Conditioner', model: 'AR18BY5APWK', serial: 'SAC2024SAM077', seller: 'Reliance Digital', months: 12, purchase: '2024-12-20' },
  { name: 'Whirlpool Double Door Refrigerator', brand: 'Whirlpool', category: 'Refrigerator', model: 'FP263D', serial: 'WPR2025WH001', seller: 'Vijay Sales', months: 12, purchase: '2025-06-10' },
  { name: 'Panasonic Convection Microwave', brand: 'Panasonic', category: 'Microwave', model: 'NN-CT645M', serial: 'PNM2024PAN042', seller: 'Amazon', months: 12, purchase: '2025-03-05' },
];

type Step = 'method' | 'scan' | 'review';

export default function RegisterModal({ onClose, onRegistered }: Props) {
  const [step, setStep] = useState<Step>('method');
  const [scanning, setScanning] = useState(false);
  const [form, setForm] = useState({
    name: '',
    brand: 'LG',
    category: 'Washing Machine',
    model_number: '',
    serial_number: '',
    purchase_date: '',
    warranty_duration_months: 12,
    seller: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const simulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      const template = OCR_TEMPLATES[Math.floor(Math.random() * OCR_TEMPLATES.length)];
      setForm((prev) => ({
        ...prev,
        name: template.name,
        brand: template.brand,
        category: template.category,
        model_number: template.model,
        serial_number: template.serial,
        purchase_date: template.purchase,
        warranty_duration_months: template.months,
        seller: template.seller,
      }));
      setScanning(false);
      setStep('review');
    }, 2200);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.brand.trim()) {
      setError('Product name and brand are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createProduct(form);
      onRegistered();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to register product.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-base font-semibold text-slate-900">Register New Product</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 'method' && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-sm text-slate-500 mb-4">Choose how you'd like to register your appliance. Our AI will extract product details automatically.</p>
              <button
                onClick={simulateScan}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                  <ScanLine className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Scan Barcode / QR Code</p>
                  <p className="text-xs text-slate-500 mt-0.5">Capture product info by scanning the barcode on the product or invoice</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-sky-400 transition-colors" />
              </button>

              <button
                onClick={simulateScan}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <FileUp className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Upload Invoice / Warranty Card</p>
                  <p className="text-xs text-slate-500 mt-0.5">Upload a photo of your invoice or warranty card — we'll use OCR to extract details</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-sky-400 transition-colors" />
              </button>

              <button
                onClick={() => setStep('review')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Enter Manually</p>
                  <p className="text-xs text-slate-500 mt-0.5">Fill in the product details yourself</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-sky-400 transition-colors" />
              </button>
            </div>
          )}

          {step === 'scan' && scanning && (
            <div className="py-12 text-center animate-fade-in">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 rounded-2xl border-2 border-slate-200" />
                <div className="absolute inset-x-0 h-0.5 bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)] animate-bounce" style={{ animationDuration: '1.5s' }} />
                <ScanLine className="w-12 h-12 text-sky-500 absolute inset-0 m-auto" />
              </div>
              <p className="text-sm font-medium text-slate-700">Scanning...</p>
              <p className="text-xs text-slate-400 mt-1">Extracting product details with OCR</p>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg mb-2">
                <Check className="w-4 h-4" strokeWidth={2.5} />
                <span>Product details extracted! Review and confirm below.</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Product Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                  placeholder="e.g. LG Front Load Washing Machine"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Brand *</label>
                  <select
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 bg-white"
                  >
                    {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 bg-white"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Model Number</label>
                  <input
                    type="text"
                    value={form.model_number}
                    onChange={(e) => setForm({ ...form, model_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Serial Number</label>
                  <input
                    type="text"
                    value={form.serial_number}
                    onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Purchase Date</label>
                  <input
                    type="date"
                    value={form.purchase_date}
                    onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Warranty (months)</label>
                  <input
                    type="number"
                    value={form.warranty_duration_months}
                    onChange={(e) => setForm({ ...form, warranty_duration_months: parseInt(e.target.value) || 12 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                    min={1}
                    max={120}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Seller / Store</label>
                <input
                  type="text"
                  value={form.seller}
                  onChange={(e) => setForm({ ...form, seller: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                  placeholder="e.g. Croma, Amazon, etc."
                />
              </div>

              {error && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep('method')}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Registering...</>
                  ) : (
                    <><Check className="w-4 h-4" strokeWidth={2.5} /> Register Product</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
