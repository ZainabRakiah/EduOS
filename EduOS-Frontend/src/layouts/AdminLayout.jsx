import React from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch, useMediaQuery } from '@hooks';
import { cn } from '@utils';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  History,
  Settings,
  LogOut,
  GraduationCap,
  Shield,
  Menu,
  X,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { selectUser, logout } from '@redux/slices/auth.slice.js';

const adminNavigationItems = [
  {
    section: 'Admin Controls',
    items: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/admin/users', label: 'Users', icon: Users },
      { path: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
      { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { path: '/admin/audit-logs', label: 'Audit Logs', icon: History },
    ],
  },
  {
    section: 'System',
    items: [
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function AdminLayout() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  
  const user = useAppSelector(selectUser);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // If not super admin, show a clean 403 Forbidden screen
  if (!user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-white rounded-3xl border border-neutral-200/60 shadow-xl p-8 sm:p-12 space-y-6">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-danger-50 border border-danger-100 flex items-center justify-center text-danger-600 shadow-sm">
            <Lock className="h-8 w-8" strokeWidth={2.25} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">403 — Unauthorized</h1>
            <p className="text-sm font-semibold text-neutral-500 leading-relaxed">
              You do not have administrative privileges to view the EduOS Control Center.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/dashboard">
              <Button size="lg" className="w-full" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-neutral-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-neutral-900 flex items-center justify-center shadow-sm">
            <Shield className="h-5 w-5 text-brand-400" strokeWidth={2.25} />
          </div>
          <div>
            <span className="text-base font-extrabold text-neutral-900 leading-none block">EduOS Admin</span>
            <span className="text-[9px] font-black text-brand-600 uppercase tracking-wider mt-0.5 block">Control Center</span>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-neutral-450 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-5 px-3.5 space-y-6">
        {adminNavigationItems.map((group) => (
          <div key={group.section} className="space-y-1">
            <h4 className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
              {group.section}
            </h4>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && setSidebarOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-150 px-3.5 py-2.5',
                    isActive
                      ? 'bg-neutral-900 text-white shadow-md'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-colors',
                      isActive ? 'text-brand-400' : 'text-neutral-400 group-hover:text-neutral-600',
                    )}
                    strokeWidth={1.75}
                  />
                  <span>{item.label}</span>
                  {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="border-t border-neutral-200 p-4 shrink-0">
        <button
          onClick={() => dispatch(logout())}
          className="w-full flex items-center gap-3 rounded-xl text-sm font-semibold text-red-650 hover:bg-red-50 hover:text-red-750 transition-colors px-3.5 py-2.5"
        >
          <LogOut className="h-5 w-5 stroke-red-500 shrink-0" strokeWidth={1.75} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-neutral-50 relative font-sans">
      {/* Sidebar for Desktop */}
      {!isMobile && (
        <aside className="sticky top-0 h-screen w-64 border-r border-neutral-200 shrink-0 bg-white shadow-2xs z-30">
          <SidebarContent />
        </aside>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shrink-0 shadow-3xs">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg text-neutral-600 hover:bg-neutral-100 focus:outline-none"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-lg font-black text-neutral-900 tracking-tight">Super Admin panel</h2>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl">
              <div className="h-6 w-6 rounded-md bg-neutral-950 flex items-center justify-center">
                <Shield className="h-3.5 w-3.5 text-brand-400" />
              </div>
              <span className="text-xs font-bold text-neutral-800">
                {user.firstName} {user.lastName}
              </span>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-6 sm:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Drawer */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-64 h-full bg-white animate-in slide-in-from-left duration-200 shadow-2xl">
            <SidebarContent />
          </div>
        </div>
      )}
    </div>
  );
}

// Simple button fallbacks if component import is local
function Button({ children, className, leftIcon, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-neutral-900 hover:bg-neutral-850 text-white transition-all shadow-md active:scale-[0.99] cursor-pointer',
        className
      )}
      {...props}
    >
      {leftIcon}
      {children}
    </button>
  );
}
