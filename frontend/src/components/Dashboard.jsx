import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProducts, deleteProduct, sendExpiryAlerts, batchDelete, batchStatusUpdate } from '../services/productService';
import { format, differenceInDays, parse } from 'date-fns';
import { Package, Trash2, Bell, Mail, AlertCircle, Search, Filter, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'Dairy', 'Bakery', 'Meat', 'Medicine', 'Drinks', 'Vegetables', 'Fruits', 'Snacks', 'Other'];

const parseDate = d => d.includes('/') ? parse(d, 'dd/MM/yyyy', new Date()) : new Date(d);
const isValidDateObj = d => d instanceof Date && !isNaN(d);
const getStatusColor = s => s === 'expired' ? 'bg-red-100 text-red-800 border-red-200' : s === 'near' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : s === 'consumed' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-green-100 text-green-800 border-green-200';
const getStatusIcon = s => s === 'expired' ? <AlertCircle className="h-4 w-4" /> : s === 'near' ? <Bell className="h-4 w-4" /> : s === 'consumed' ? <CheckCircle className="h-4 w-4" /> : <Package className="h-4 w-4" />;

const Dashboard = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingAlerts, setSendingAlerts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getProducts();
        setProducts(data.map(p => ({ ...p, status: p.status === 'consumed' ? 'consumed' : getProductStatus(p.expiry_date), daysUntilExpiry: differenceInDays(parseDate(p.expiry_date), new Date()) })));
      } catch { toast.error('Failed to fetch products'); }
      setLoading(false);
    })();
  }, []);

  const getProductStatus = d => { const days = differenceInDays(parseDate(d), new Date()); return days < 0 ? 'expired' : days <= 3 ? 'near' : 'safe'; };

  const handleDelete = async id => { if (window.confirm('Are you sure you want to delete this product?')) try { await deleteProduct(id); setProducts(products.filter(p => p._id !== id)); toast.success('Product deleted successfully'); } catch { toast.error('Failed to delete product'); } };

  const handleSendAlerts = async () => { setSendingAlerts(true); try { await sendExpiryAlerts(); toast.success(`Expiry alerts sent to ${user?.email}!`); } catch { toast.error('Failed to send alerts'); } setSendingAlerts(false); };

  const handleBatchDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) {
      try {
        await batchDelete(selectedIds);
        setProducts(products.filter(p => !selectedIds.includes(p._id)));
        setSelectedIds([]);
        toast.success(`${selectedIds.length} products deleted`);
      } catch { toast.error('Failed to delete products'); }
    }
  };

  const handleBatchStatus = async (status) => {
    try {
      await batchStatusUpdate(selectedIds, status);
      setProducts(products.map(p => selectedIds.includes(p._id) ? { ...p, status } : p));
      setSelectedIds([]);
      toast.success(`${selectedIds.length} products marked as ${status}`);
    } catch { toast.error('Failed to update status'); }
  };

  const toggleSelect = id => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.product_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const expiringProducts = products.filter(p => p.status === 'near' || p.status === 'expired');

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Product Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage and track your inventory's lifecycle.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSendAlerts}
            disabled={sendingAlerts}
            className="w-full sm:w-auto bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center space-x-2 transition-all shadow-lg shadow-slate-200 active:scale-95"
            title="Manually trigger a check and send alerts if any products are expiring"
          >
            <Mail className="h-4 w-4" />
            <span className="text-sm">{sendingAlerts ? 'Sending...' : 'Send Alerts'}</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-6 items-center glass-card p-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            className="input-premium pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border-2 ${selectedCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-400 hover:text-slate-900'}`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Batch Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-10 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center space-x-4">
            <span className="font-bold text-sm uppercase tracking-widest">{selectedIds.length} SELECTED</span>
            <button onClick={() => setSelectedIds([])} className="p-1 hover:bg-white/20 rounded-lg transition-colors"><XCircle className="h-5 w-5" /></button>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => handleBatchStatus('consumed')} className="bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all active:scale-95 flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Mark Consumed</span>
            </button>
            <button onClick={handleBatchDelete} className="bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all active:scale-95 flex items-center space-x-2 shadow-lg shadow-slate-900/10">
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {expiringProducts.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-start gap-4 shadow-xl">
          <div className="w-12 h-12 bg-white text-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-slate-900/20">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold text-white text-lg">Attention Required</h2>
            <p className="text-slate-300">You have {expiringProducts.length} product(s) that are expiring soon or have already expired. Take action to reduce waste.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => (
          <div
            key={product._id}
            className={`glass-card p-6 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative cursor-pointer ${selectedIds.includes(product._id) ? 'ring-2 ring-slate-900 border-slate-900' : ''}`}
            onClick={() => toggleSelect(product._id)}
          >
            <div className="absolute top-4 right-4" onClick={e => e.stopPropagation()}>
              <input
                type="checkbox"
                className="h-5 w-5 rounded-lg border-slate-200 text-slate-900 focus:ring-slate-900 cursor-pointer transition-colors"
                checked={selectedIds.includes(product._id)}
                onChange={() => toggleSelect(product._id)}
              />
            </div>

            <div className="flex justify-between items-start mb-6 pr-8">
              <h3 className="font-extrabold text-xl text-slate-900 leading-tight break-words pr-2">{product.product_name}</h3>
            </div>

            <div className="flex-1 space-y-5" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Expiry Date</p>
                  {(() => { const parsed = parseDate(product.expiry_date); return isValidDateObj(parsed) ? <p className="font-bold text-slate-700">{format(parsed, 'MMM dd, yyyy')}</p> : <p className="font-bold text-rose-500">Invalid Date</p>; })()}
                </div>
                {product.category && (
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-slate-200">{product.category}</span>
                )}
              </div>

              {product.barcode && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 transition-colors hover:bg-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Barcode</p>
                  <p className="font-mono text-xs text-slate-600 break-all">{product.barcode}</p>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Status Analysis</p>
                <p className={`font-bold text-sm ${product.daysUntilExpiry < 0 ? 'text-rose-600 underline' : product.daysUntilExpiry <= 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {product.status === 'consumed' ? 'Consumed' : product.daysUntilExpiry < 0 ? `EXPIRED (${Math.abs(product.daysUntilExpiry)}D AGO)` : `EXPIRES IN ${product.daysUntilExpiry}D`}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-sm ${getStatusColor(product.status)}`}>
                  {getStatusIcon(product.status)}
                  <span>{product.status}</span>
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(product._id); }}
                  className="bg-rose-50 text-rose-500 p-2 rounded-xl border border-rose-100 hover:bg-rose-500 hover:text-white transition-all duration-200"
                  title="Delete Product"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No products found</h3>
          <p className="mt-2 text-gray-500">Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;