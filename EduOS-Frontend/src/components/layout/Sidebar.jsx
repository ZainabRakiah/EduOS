import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@utils';
import { useAppSelector, useAppDispatch } from '@hooks';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  BookOpen,
  Clock,
  Settings,
  HelpCircle,
  GraduationCap,
  Sparkles,
  ClipboardCheck,
  LogOut,
  Lock,
  Shield,
  Briefcase,
} from 'lucide-react';
import { logout, selectUser } from '@redux/slices/auth.slice.js';
import useFeatureAccess from '@hooks/useFeatureAccess.js';
import UpgradeModal from '../subscription/UpgradeModal.jsx';

const navigationItems = [
  {
    section: 'Main',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/notes', label: 'Notes', icon: FileText },
      { path: '/resources', label: 'Resources', icon: FolderOpen },
      { path: '/ai/chapter-explainer', label: 'AI Explainer', icon: Sparkles, featureKey: 'ai_explainer' },
      { path: '/mock-tests', label: 'Mock Tests', icon: ClipboardCheck, featureKey: 'mock_tests' },
      { path: '/formula-book', label: 'Formula Book', icon: BookOpen },
      { path: '/govt-jobs', label: 'Govt Jobs', icon: Briefcase },
    ],
  },
  {
    section: 'Settings',
    items: [
      { path: '/settings', label: 'Settings', icon: Settings },
      { path: '/help', label: 'Help & Support', icon: HelpCircle },
    ],
  },
];

export default function Sidebar() {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const location = useLocation();
  const { hasAccess } = useFeatureAccess();
  const [upgradeModalOpen, setUpgradeModalOpen] = React.useState(false);

  const user = useAppSelector(selectUser);
  const isAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <aside
      className={cn(
        'sticky top-0 h-screen flex flex-col bg-white border-r border-neutral-200 transition-all duration-300 ease-in-out z-30',
        sidebarOpen ? 'w-64' : 'w-16',
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-neutral-200 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
            <GraduationCap className="h-5 w-5 text-white" strokeWidth={2.25} />
          </div>
          <div
            className={cn(
              'flex flex-col whitespace-nowrap transition-all duration-200',
              sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0',
            )}
          >
            <span className="text-base font-bold text-neutral-900 leading-tight">EduOS</span>
            <span className="text-xs text-neutral-500 leading-tight">Learning Platform</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {isAdmin && (
          <div className="space-y-1">
            {sidebarOpen && (
              <h4 className="px-3 mb-2 text-[10px] font-black uppercase tracking-wider text-brand-600">
                Administration
              </h4>
            )}
            <NavLink
              to="/admin/dashboard"
              className={cn(
                'group flex items-center gap-3 rounded-lg text-sm font-semibold transition-all duration-150',
                sidebarOpen ? 'px-3 py-2.5' : 'p-2.5 justify-center',
                'bg-neutral-900 text-white shadow-md hover:bg-neutral-850'
              )}
            >
              <Shield className="h-5 w-5 text-brand-400 shrink-0" strokeWidth={1.75} />
              <span
                className={cn(
                  'whitespace-nowrap transition-all duration-200',
                  sidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden',
                )}
              >
                Admin Panel
              </span>
            </NavLink>
          </div>
        )}
        {navigationItems.map((group) => (
          <div key={group.section} className="space-y-1">
            {sidebarOpen && (
              <h4 className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                {group.section}
              </h4>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isLocked = item.featureKey && !hasAccess(item.featureKey);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={(e) => {
                    if (isLocked) {
                      e.preventDefault();
                      setUpgradeModalOpen(true);
                    }
                  }}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150',
                    sidebarOpen ? 'px-3 py-2.5' : 'p-2.5 justify-center',
                    isActive
                      ? 'bg-brand-50 text-brand-700 shadow-sm'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-colors',
                      isActive ? 'text-brand-600' : 'text-neutral-400 group-hover:text-neutral-600',
                    )}
                    strokeWidth={1.75}
                  />
                  <span
                    className={cn(
                      'whitespace-nowrap transition-all duration-200',
                      sidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden',
                    )}
                  >
                    {item.label}
                  </span>
                  {isLocked && sidebarOpen && (
                    <span className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-55/15 text-amber-700 border border-amber-200/50 shrink-0">
                      <Lock className="h-2.5 w-2.5" />
                      Premium
                    </span>
                  )}
                  {isActive && !isLocked && sidebarOpen && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-neutral-200 p-3 shrink-0">
        <button
          onClick={() => dispatch(logout())}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg text-sm font-medium text-red-650 hover:bg-red-50 hover:text-red-750 transition-colors',
            sidebarOpen ? 'px-3 py-2.5' : 'p-2.5 justify-center',
          )}
          title={!sidebarOpen ? 'Logout' : undefined}
        >
          <LogOut className="h-5 w-5 stroke-red-500 shrink-0" strokeWidth={1.75} />
          <span
            className={cn(
              'whitespace-nowrap transition-all duration-200',
              sidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden',
            )}
          >
            Logout
          </span>
        </button>
      </div>
      <UpgradeModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} />
    </aside>
  );
}
