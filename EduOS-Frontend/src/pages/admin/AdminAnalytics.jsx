import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAnalytics,
  selectAdminAnalytics,
  selectAdminLoading,
  selectAdminError,
} from '@redux/slices/admin.slice.js';
import {
  BarChart3,
  Calendar,
  Sparkles,
  TrendingUp,
  BookOpen,
  FolderOpen,
  ClipboardCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function AdminAnalytics() {
  const dispatch = useDispatch();
  const analytics = useSelector(selectAdminAnalytics);
  const loading = useSelector(selectAdminLoading);
  const error = useSelector(selectAdminError);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    dispatch(fetchAnalytics({ from, to }));
  }, [dispatch, from, to]);

  if (loading.analytics && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
      </div>
    );
  }

  const {
    usersRegistered = 0,
    premiumSubscriptions = 0,
    aiRequests = 0,
    mockTestsCreated = 0,
    notesCreated = 0,
    resourcesUploaded = 0,
    featureUsage = { aiExplainer: 0, aiChat: 0, aiImages: 0, notes: 0, resources: 0 },
  } = analytics || {};

  const metrics = [
    { label: 'New Students', value: usersRegistered, icon: TrendingUp, color: 'text-blue-600 border-blue-100' },
    { label: 'New Pro Subs', value: premiumSubscriptions, icon: Sparkles, color: 'text-brand-600 border-brand-100' },
    { label: 'AI Actions', value: aiRequests, icon: Sparkles, color: 'text-purple-600 border-purple-100' },
    { label: 'Tests Built', value: mockTestsCreated, icon: ClipboardCheck, color: 'text-emerald-600 border-emerald-100' },
  ];

  // Map feature usage object into Recharts compatible list format
  const chartData = [
    { name: 'AI Explainer', count: featureUsage.aiExplainer },
    { name: 'AI Chat', count: featureUsage.aiChat },
    { name: 'AI Images', count: featureUsage.aiImages },
    { name: 'Notes', count: featureUsage.notes },
    { name: 'Uploads', count: featureUsage.resources },
  ];

  return (
    <div className="space-y-6 select-none text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-200 pb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight leading-none">Platform Analytics</h1>
          <p className="text-xs text-neutral-500 font-semibold mt-2">Deep dive into feature utilization logs and user growth trends.</p>
        </div>

        {/* Date pickers */}
        <div className="flex flex-wrap gap-2 items-center bg-white border border-neutral-200 rounded-xl p-2 shadow-2xs">
          <Calendar className="h-4 w-4 text-neutral-450 mr-1 shrink-0" />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-2.5 py-1 border border-neutral-200 rounded-lg text-xs font-bold focus:outline-none"
            placeholder="From"
          />
          <span className="text-neutral-350 text-xs font-bold">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-2.5 py-1 border border-neutral-200 rounded-lg text-xs font-bold focus:outline-none"
            placeholder="To"
          />
          {(from || to) && (
            <button
              onClick={() => {
                setFrom('');
                setTo('');
              }}
              className="px-2 py-1 text-[10px] font-black text-neutral-500 hover:text-neutral-700 bg-neutral-100 rounded-md cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-danger-50 border border-danger-200 p-4 text-center">
          <p className="text-sm font-bold text-danger-700">{error}</p>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className={`bg-white border rounded-2xl p-5 space-y-1 shadow-sm ${m.color}`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">{m.label}</span>
                <Icon className="h-4 w-4 opacity-70" />
              </div>
              <span className="text-2xl font-black text-neutral-900 block">{m.value.toLocaleString()}</span>
            </div>
          );
        })}
      </div>

      {/* Feature Usage Details */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6 shadow-sm">
        <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-neutral-900 flex items-center gap-2">
            <BarChart3 className="h-4.5 w-4.5 text-brand-650" /> Feature Usage Breakdown
          </h3>
          <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Event volumes</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Chart */}
          <div className="md:col-span-2 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                <YAxis tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Aggregated values list */}
          <div className="space-y-4 flex flex-col justify-center">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400">Total Event counts</h4>
            <div className="space-y-3">
              {[
                { label: 'AI Explainer', count: featureUsage.aiExplainer, icon: Sparkles, color: 'text-indigo-600' },
                { label: 'AI Chat', count: featureUsage.aiChat, icon: Sparkles, color: 'text-purple-600' },
                { label: 'AI Image Generator', count: featureUsage.aiImages, icon: Sparkles, color: 'text-pink-600' },
                { label: 'Notes Created', count: featureUsage.notes, icon: BookOpen, color: 'text-amber-600' },
                { label: 'Files Uploaded', count: featureUsage.resources, icon: FolderOpen, color: 'text-blue-600' },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-center justify-between p-3 rounded-xl border border-neutral-150/70 bg-neutral-50/50">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${item.color}`} />
                      <span className="text-xs font-bold text-neutral-700">{item.label}</span>
                    </div>
                    <span className="text-sm font-black text-neutral-900">{(item.count || 0).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
