import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDashboardStats,
  selectAdminStats,
  selectAdminLoading,
  selectAdminError,
} from '@redux/slices/admin.slice.js';
import {
  Users,
  CreditCard,
  UserCheck,
  UserMinus,
  Sparkles,
  TrendingUp,
  BarChart3,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const stats = useSelector(selectAdminStats);
  const loading = useSelector(selectAdminLoading);
  const error = useSelector(selectAdminError);

  const [dateFilter, setDateFilter] = useState('30_days');

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  if (loading.stats && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-danger-50 border border-danger-200 p-6 text-center">
        <p className="text-sm font-bold text-danger-700">{error}</p>
        <button
          onClick={() => dispatch(fetchDashboardStats())}
          className="mt-3 px-4 py-2 bg-danger-600 text-white rounded-xl text-xs font-bold hover:bg-danger-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    users = { total: 0, free: 0, premium: 0, newToday: 0, newThisMonth: 0 },
    subscriptions = { active: 0, expired: 0, cancelled: 0 },
    usage = { aiRequests: 0, mockTests: 0, notes: 0, resources: 0 },
    growth = [],
  } = stats || {};

  const conversionRate = users.total > 0 ? ((users.premium / users.total) * 100).toFixed(1) : '0.0';

  const kpis = [
    {
      label: 'Total Users',
      value: users.total,
      subtext: `+${users.newThisMonth} this month`,
      icon: Users,
      color: 'bg-blue-500/10 text-blue-600',
    },
    {
      label: 'Premium Users',
      value: users.premium,
      subtext: `${conversionRate}% of total`,
      icon: Sparkles,
      color: 'bg-brand-500/10 text-brand-600',
    },
    {
      label: 'Free Users',
      value: users.free,
      subtext: `${users.total > 0 ? ((users.free / users.total) * 100).toFixed(1) : '0.0'}% of total`,
      icon: UserMinus,
      color: 'bg-neutral-500/10 text-neutral-600',
    },
    {
      label: 'Active Subscriptions',
      value: subscriptions.active,
      subtext: 'Currently authorized',
      icon: CreditCard,
      color: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      label: 'Expired Subscriptions',
      value: subscriptions.expired,
      subtext: 'Requiring renewal',
      icon: Calendar,
      color: 'bg-amber-500/10 text-amber-600',
    },
    {
      label: 'New Users Today',
      value: users.newToday,
      subtext: 'Joined today',
      icon: UserCheck,
      color: 'bg-indigo-500/10 text-indigo-600',
    },
  ];

  const pieData = [
    { name: 'Free Users', value: users.free, color: '#6b7280' },
    { name: 'Premium Users', value: users.premium, color: '#3b82f6' },
  ];

  return (
    <div className="space-y-8 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-200 pb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight leading-none">Super Admin Dashboard</h1>
          <p className="text-xs text-neutral-500 font-semibold mt-2">Centralized overview of platform metrics and utilization.</p>
        </div>
        {/* Date Filter selector */}
        <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl p-1 shadow-2xs">
          {['today', '7_days', '30_days', '6_months', '1_year'].map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                dateFilter === filter
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
              }`}
            >
              {filter.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white rounded-2xl border border-neutral-200 p-6 flex items-start gap-4 shadow-sm hover:shadow-md transition duration-200">
              <div className={`p-3.5 rounded-xl ${kpi.color} shrink-0`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-black text-neutral-400 uppercase tracking-wider block">{kpi.label}</span>
                <span className="text-2xl font-black text-neutral-950 block">{kpi.value.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-neutral-500 block">{kpi.subtext}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="text-sm font-extrabold text-neutral-900 flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-brand-650" /> User Growth (6 Months)
            </h3>
            <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Registration Volume</span>
          </div>

          <div className="h-72 w-full">
            {growth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                  <YAxis tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 'bold' }}
                    labelClassName="text-neutral-500"
                  />
                  <Bar dataKey="count" fill="url(#growthGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs font-bold text-neutral-450">
                No growth data available.
              </div>
            )}
          </div>
        </div>

        {/* Free vs Premium Breakdown */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3 shrink-0">
            <h3 className="text-sm font-extrabold text-neutral-900 flex items-center gap-2">
              <BarChart3 className="h-4.5 w-4.5 text-brand-650" /> Plan Distribution
            </h3>
            <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Conversions</span>
          </div>

          <div className="h-56 w-full flex items-center justify-center relative my-auto">
            {users.total > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-neutral-950">{conversionRate}%</span>
                  <span className="text-[9px] font-bold text-neutral-450 uppercase tracking-wider">Premium</span>
                </div>
              </>
            ) : (
              <div className="text-xs font-bold text-neutral-450">No plan distribution data available.</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-4 shrink-0">
            <div className="space-y-1 text-center">
              <span className="text-[10px] font-bold text-neutral-400 uppercase block">Free Users</span>
              <span className="text-lg font-black text-neutral-800 block">{users.free.toLocaleString()}</span>
            </div>
            <div className="space-y-1 text-center">
              <span className="text-[10px] font-bold text-neutral-400 uppercase block">Premium Users</span>
              <span className="text-lg font-black text-neutral-800 block">{users.premium.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Utilization Counters */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6 shadow-sm">
        <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-neutral-900">Platform Utilization Summary</h3>
          <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Aggregated Events</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/50 space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block">AI Requests</span>
            <span className="text-2xl font-black text-neutral-900 block">{(usage.aiRequests || 0).toLocaleString()}</span>
          </div>
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/50 space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block">Mock Tests</span>
            <span className="text-2xl font-black text-neutral-900 block">{(usage.mockTests || 0).toLocaleString()}</span>
          </div>
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/50 space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block">Notes Created</span>
            <span className="text-2xl font-black text-neutral-900 block">{(usage.notes || 0).toLocaleString()}</span>
          </div>
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/50 space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block">Uploads</span>
            <span className="text-2xl font-black text-neutral-900 block">{(usage.resources || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
