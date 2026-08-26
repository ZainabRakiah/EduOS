import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  FolderOpen,
  BookOpen,
  Clock,
  Plus,
  ArrowRight,
  Calendar,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { useAppDispatch, useAppSelector, useFeatureAccess } from '@hooks';
import {
  fetchDashboard,
  selectDashboardStats,
  selectDashboardChart,
  selectDashboardLoading,
  selectDashboardError,
} from '@redux/slices/dashboard.slice.js';
import { selectUser } from '@redux/slices/auth.slice.js';
import { fetchExplanations, selectExplanations } from '@redux/slices/chapter-explainer.slice.js';
import { fetchUserAttempts, selectMockAttemptsList } from '@redux/slices/mock-test.slice.js';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  SkeletonCard,
  Skeleton,
  EmptyState,
  toast,
} from '@components/ui/index.jsx';
import { formatRelativeTime, capitalize } from '@utils';

const statCardConfigs = [
  {
    label: 'Total Notes',
    key: 'totalNotes',
    icon: FileText,
  },
  {
    label: 'Total Resources',
    key: 'totalResources',
    icon: FolderOpen,
  },
  {
    label: 'Tests Attempted',
    key: 'testsAttempted',
    icon: Sparkles,
  },
  {
    label: 'Total Study Hours',
    key: 'totalStudyHours',
    icon: Clock,
  },
];
function getDayName(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  } catch {
    return '';
  }
}

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isPremium } = useFeatureAccess();
  const user = useAppSelector(selectUser);
  const stats = useAppSelector(selectDashboardStats);
  const chart = useAppSelector(selectDashboardChart);
  const explanations = useAppSelector(selectExplanations);
  const loading = useAppSelector(selectDashboardLoading);
  const error = useAppSelector(selectDashboardError);

  const attempts = useAppSelector(selectMockAttemptsList);

  useEffect(() => {
    dispatch(fetchDashboard(7));
    dispatch(fetchExplanations());
    dispatch(fetchUserAttempts());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const userName = user?.name || user?.firstName || user?.email?.split('@')[0] || 'there';

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const defaultWeekData = weekDays.map((day) => ({ day, hours: 0 }));
  const chartData =
    chart && chart.length > 0
      ? chart.map((c) => ({ day: getDayName(c.date), hours: c.hours || 0 }))
      : defaultWeekData;
  const maxHours = Math.max(...chartData.map((d) => d.hours), 1);

  const testStats = React.useMemo(() => {
    if (!attempts || attempts.length === 0) {
      return { total: 0, avg: '0%', best: '0%', weak: [], strong: [] };
    }
    const total = attempts.length;
    const percentages = attempts.map((a) => a.percentage);
    const avg = (percentages.reduce((s, p) => s + p, 0) / total).toFixed(1) + '%';
    const best = Math.max(...percentages).toFixed(1) + '%';

    const subjectScores = {};
    attempts.forEach((a) => {
      const sub = a.mockTest?.subject || 'General';
      if (!subjectScores[sub]) {
        subjectScores[sub] = { sum: 0, count: 0 };
      }
      subjectScores[sub].sum += a.percentage;
      subjectScores[sub].count += 1;
    });

    const weak = [];
    const strong = [];
    Object.entries(subjectScores).forEach(([sub, scoreObj]) => {
      const avgPct = scoreObj.sum / scoreObj.count;
      if (avgPct < 70) {
        weak.push(sub);
      } else {
        strong.push(sub);
      }
    });

    return { total, avg, best, weak, strong };
  }, [attempts]);

  return (
    <div className="space-y-6 text-left">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-brand-600 to-indigo-650 rounded-3xl text-white shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Welcome back, {userName} 👋</h1>
          <p className="text-xs md:text-sm text-brand-100 font-medium">
            Here is your personalized study summary for this week. Keep up the great momentum!
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => navigate('/ai/chapter-explainer')}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-xl shadow-none"
          >
            Explain Chapter
          </Button>
          <Button
            onClick={() => navigate('/mock-tests')}
            className="bg-white text-brand-700 hover:bg-neutral-50 font-bold text-xs rounded-xl shadow-md border-none"
          >
            Take Test
          </Button>
        </div>
      </div>

      {/* Subscription Quick Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 select-none ${isPremium ? 'bg-brand-50 text-brand-700' : 'bg-neutral-200 text-neutral-600'}`}>
            {isPremium ? 'PRO' : 'FREE'}
          </div>
          <div>
            <h4 className="text-xs font-black text-neutral-850">
              {isPremium ? 'Premium Plan Active' : 'Free Account'}
            </h4>
            <p className="text-[10px] text-neutral-450 font-semibold leading-relaxed">
              {isPremium ? 'All advanced AI features & unlimited mock tests unlocked.' : "You're using the free version of EduOS. Upgrade to unlock all features."}
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/subscription')}
          size="sm"
          className={`font-bold text-[10px] rounded-lg h-8 px-4 border shrink-0 ${isPremium ? 'bg-white text-neutral-600 hover:bg-neutral-100 border-neutral-300' : 'bg-brand-600 hover:bg-brand-700 text-white border-transparent'}`}
        >
          {isPremium ? 'Manage Plan' : 'Explore Premium'}
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : statCardConfigs.map((config, i) => {
              const Icon = config.icon;
              const raw = config.key === 'testsAttempted' ? testStats.total : (stats?.[config.key] || 0);
              const value =
                config.key === 'totalStudyHours' ? `${Number(raw).toFixed(1)}h` : String(raw);
              const changeLabel = Number(raw) > 0 ? 'Active' : 'Get started';
              
              let cardAccent = 'bg-brand-50 text-brand-600 border-brand-100';
              if (i === 1) cardAccent = 'bg-amber-50 text-amber-600 border-amber-100';
              if (i === 2) cardAccent = 'bg-emerald-50 text-emerald-600 border-emerald-100';
              if (i === 3) cardAccent = 'bg-purple-50 text-purple-600 border-purple-100';

              return (
                <Card key={i} className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-350 bg-white border-neutral-200/70 rounded-2xl overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center border shrink-0 ${cardAccent}`}>
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider leading-none mb-1.5">{config.label}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-extrabold text-neutral-850">{value}</span>
                        <span className="text-[10px] font-bold text-neutral-400">{changeLabel}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Analytics & Performance Overview (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Study Hours Activity Graph */}
        <Card className="lg:col-span-2 bg-white border border-neutral-200/70 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-extrabold text-neutral-850">Study Hours Progress</CardTitle>
                <CardDescription className="text-[11px]">Time invested per day this week</CardDescription>
              </div>
              <Badge className="bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border border-neutral-200 font-bold text-[9px] py-0.5 px-2 rounded-md">
                Weekly Graph
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-3 h-40 pt-4">
              {chartData.map((d, i) => {
                const height = (d.hours / maxHours) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full flex flex-col justify-end h-32">
                      <div
                        className="w-full rounded-t-md transition-all duration-300 bg-gradient-to-t from-brand-500/80 to-brand-650/90 group-hover:from-brand-600 group-hover:to-brand-700"
                        style={{ height: `${Math.max(height, 3)}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-extrabold text-neutral-450 uppercase tracking-tight leading-none mb-0.5">{d.day}</p>
                      <p className="text-[10px] text-neutral-600 font-bold">{Number(d.hours).toFixed(1)}h</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* AI Mock Test performance overview */}
        <Card className="bg-white border border-neutral-200/70 rounded-2xl shadow-sm flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-extrabold text-neutral-850">Exam Performance</CardTitle>
                <CardDescription className="text-[11px]">Overview from your practice tests</CardDescription>
              </div>
              <button
                onClick={() => navigate('/mock-tests')}
                className="text-[10px] text-brand-650 hover:underline uppercase tracking-wider font-extrabold"
              >
                View Tests
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-100">
                <span className="text-[8px] font-extrabold text-neutral-400 uppercase tracking-wider block mb-1">Attempted</span>
                <span className="text-xs font-extrabold text-neutral-800">{testStats.total} Tests</span>
              </div>
              <div className="p-3.5 rounded-xl bg-brand-50/50 border border-brand-100">
                <span className="text-[8px] font-extrabold text-brand-600 uppercase tracking-wider block mb-1">Average</span>
                <span className="text-xs font-extrabold text-brand-850">{testStats.avg}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <span className="text-[8px] font-extrabold text-emerald-600 uppercase tracking-wider block mb-1">Best</span>
                <span className="text-xs font-extrabold text-emerald-800">{testStats.best}</span>
              </div>
            </div>

            <div className="bg-neutral-50/50 border border-neutral-200/40 p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-neutral-400">Weak Areas:</span>
                <span className="font-extrabold text-rose-700">
                  {testStats.weak.length > 0 ? testStats.weak.join(', ') : 'None 🎉'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-neutral-400">Strong Areas:</span>
                <span className="font-extrabold text-emerald-700 truncate max-w-[130px]">
                  {testStats.strong.length > 0 ? testStats.strong.join(', ') : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Recent Explanations (Full Width) */}
      <div className="grid grid-cols-1 gap-6">
        {/* AI Explanations overview list */}
        <Card className="bg-white border border-neutral-200/70 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-extrabold text-neutral-850">Recent Chapter Explanations</CardTitle>
                <CardDescription className="text-[11px]">AI summaries from your textbook chapter uploads</CardDescription>
              </div>
              <Link
                to="/ai/chapter-explainer"
                className="text-[10px] text-brand-650 hover:underline uppercase tracking-wider font-extrabold"
              >
                Open Explainer →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {explanations && explanations.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {explanations.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate('/ai/chapter-explainer')}
                    className="p-4 hover:bg-neutral-50/50 transition-colors cursor-pointer group flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-neutral-800 group-hover:text-brand-650 truncate">
                        {item.title || 'Quick Explanation'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-neutral-400 font-semibold">
                        <span>Format: {item.originalType}</span>
                        <span>•</span>
                        <span>
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    <ArrowRight
                      className="h-3.5 w-3.5 text-neutral-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0"
                      strokeWidth={2.5}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-neutral-400 italic">
                No chapter explanations created yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
