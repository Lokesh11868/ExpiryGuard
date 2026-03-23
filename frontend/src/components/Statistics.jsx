import React, { useState, useEffect, lazy, Suspense } from 'react';
import { getStatistics } from '../services/productService';
import { Package, AlertTriangle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
const Doughnut = lazy(() => import('react-chartjs-2').then(mod => ({ default: mod.Doughnut })));
const Bar = lazy(() => import('react-chartjs-2').then(mod => ({ default: mod.Bar })));

import { Activity, LayoutGrid, BarChart3, TrendingUp, Info } from 'lucide-react';

let chartRegistered = false;
const registerChartJS = () => {
  if (chartRegistered) return;
  import('chart.js').then(({ Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement }) => {
    Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);
    chartRegistered = true;
  });
};

const StatCard = ({ title, value, Icon, color, bgColor, suffix = "" }) => (
  <div className="glass-card p-6 flex items-center gap-4 transition-all duration-300 hover:-translate-y-1">
    <div className={`p-4 rounded-2xl ${bgColor} ${color} shadow-sm frontline-icon`}>
      <Icon className="h-6 w-6" />
    </div>
    <div className="flex-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
        {suffix && <span className="text-sm font-bold text-slate-400">{suffix}</span>}
      </div>
    </div>
  </div>
);

const ChartCard = ({ title, Icon, children, className = "" }) => (
  <div className={`glass-card p-6 sm:p-8 flex flex-col ${className}`}>
    <div className="flex items-center gap-3 mb-8">
      {Icon && <div className="p-2 bg-slate-100 rounded-lg text-slate-900"><Icon className="h-5 w-5" /></div>}
      <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
    </div>
    <div className="flex-1 min-h-[300px] flex items-center justify-center">
      {children}
    </div>
  </div>
);

const LoadingSpinner = ({ className = '' }) => (
  <div className={`flex justify-center items-center h-64 ${className}`}><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
);

const Statistics = () => {
  const [stats, setStats] = useState({
    total_items: 0,
    expiring_this_week: 0,
    expired_items: 0,
    status_breakdown: { safe: 0, near: 0, expired: 0 },
    category_breakdown: {},
    monthly_expiry: {},
    health_score: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
    registerChartJS();
  }, []);

  const fetchStatistics = async () => {
    try {
      const data = await getStatistics();
      setStats(data);
    } catch (error) {
      toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };


  const statusData = {
    labels: ['Safe', 'Near Expiry', 'Expired'],
    datasets: [{
      data: [stats.status_breakdown.safe, stats.status_breakdown.near, stats.status_breakdown.expired],
      backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
      hoverOffset: 15,
      borderWidth: 0,
      cutout: '75%'
    }]
  };

  const categoryData = {
    labels: Object.keys(stats.category_breakdown),
    datasets: [{
      label: 'Products',
      data: Object.values(stats.category_breakdown),
      backgroundColor: [
        '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
        '#F59E0B', '#10B981', '#06B6D4', '#3B82F6'
      ],
      borderWidth: 0
    }]
  };

  const monthlyTrendData = {
    labels: Object.keys(stats.monthly_expiry),
    datasets: [{
      label: 'Items Expiring',
      data: Object.values(stats.monthly_expiry),
      backgroundColor: '#A855F7',
      hoverBackgroundColor: '#7E22CE',
      borderRadius: 8,
      borderSkipped: false,
    }]
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { weight: 'bold', size: 11 } } },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        cornerRadius: 8,
        displayColors: false
      }
    }
  };

  const barOptions = {
    ...commonOptions,
    scales: {
      y: { beginAtZero: true, grid: { display: false }, ticks: { font: { weight: 'bold' } } },
      x: { grid: { display: false }, ticks: { font: { weight: 'bold' } } }
    },
    plugins: {
      ...commonOptions.plugins,
      legend: { display: false }
    }
  };

  if (loading) return <LoadingSpinner className="py-12" />;

  return (
    <div className="max-w-full px-0 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="mb-2">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Inventory Analytics</h1>
        <p className="text-slate-500 mt-2 text-lg">Smart breakdown of your products and expiry trends.</p>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Total items" value={stats.total_items} Icon={Package} color="text-slate-900" bgColor="bg-slate-100" />
        <StatCard title="Health Score" value={stats.health_score} suffix="%" Icon={Activity} color="text-slate-900" bgColor="bg-slate-100" />
        <StatCard title="Near Expiry" value={stats.expiring_this_week} Icon={Clock} color="text-slate-900" bgColor="bg-slate-100" />
        <StatCard title="Total Expired" value={stats.expired_items} Icon={AlertTriangle} color="text-slate-900" bgColor="bg-slate-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Breakdown */}
        <ChartCard title="Health Status" Icon={Activity} className="lg:col-span-1">
          <div className="w-full h-full p-4 relative flex items-center justify-center">
            <Suspense fallback={<LoadingSpinner className="h-full" />}>
              <Doughnut data={statusData} options={commonOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-20px]">
                <span className="text-3xl font-black text-slate-900">{stats.health_score}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Optimal</span>
              </div>
            </Suspense>
          </div>
        </ChartCard>

        {/* Category Distribution */}
        <ChartCard title="Category Mix" Icon={LayoutGrid} className="lg:col-span-1">
          <div className="w-full h-full p-4">
            <Suspense fallback={<LoadingSpinner className="h-full" />}>
              <Doughnut data={categoryData} options={commonOptions} />
            </Suspense>
          </div>
        </ChartCard>

        {/* Expiry Timeline */}
        <ChartCard title="Expiry Risk Timeline" Icon={TrendingUp} className="lg:col-span-1">
          <div className="w-full h-full p-4">
            <Suspense fallback={<LoadingSpinner className="h-full" />}>
              <Bar data={monthlyTrendData} options={barOptions} />
            </Suspense>
          </div>
        </ChartCard>
      </div>

      {/* Smart Insights */}
      <div className="glass-card overflow-hidden border-none shadow-xl border-t-4 border-indigo-500">
        <div className="p-6 sm:p-8 bg-gradient-to-br from-white to-slate-50/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-900 text-white rounded-lg shadow-lg shadow-slate-100">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Insights</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10">
            <div className="space-y-3 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-slate-900">
                <Info className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Inventory Load</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-sm">
                You are currently managing <span className="font-bold text-slate-900">{stats.total_items}</span> items.
                {stats.total_items > 20 ? " Consider clearing out unused items to optimize your kitchen space." : " Your inventory levels are currently very manageable."}
              </p>
            </div>

            <div className="space-y-3 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-slate-900">
                <Clock className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Priority Action</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-sm">
                <span className="font-bold text-slate-900">{stats.expiring_this_week}</span> items are expiring in the next 7 days.
                {stats.expiring_this_week > 0 ? " Prioritize using these in your upcoming meals to minimize waste." : " Great job! Nothing is urgent for the coming week."}
              </p>
            </div>

            <div className="space-y-3 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-slate-900">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Waste Management</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-sm">
                <span className="font-bold text-slate-900">{stats.expired_items}</span> items have already expired.
                {stats.expired_items > 0 ? " These should be removed and disposed of correctly to maintain hygiene." : " Your inventory is currently 100% fresh - no waste detected!"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;