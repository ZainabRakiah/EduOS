import React, { useState } from 'react';
import { Menu, Search, Bell, ChevronDown } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@hooks';
import { toggleSidebar } from '@redux/slices/ui.slice.js';
import { selectUser } from '@redux/slices/auth.slice.js';
import { Avatar, Button } from '@components/ui/index.jsx';
import { useMediaQuery } from '@hooks';

export default function Topbar() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const userName = user?.name || user?.firstName || user?.email?.split('@')[0] || 'Student';
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-md border-b border-neutral-200 shrink-0">
      <div className="flex items-center h-full px-4 sm:px-6 gap-4">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch(toggleSidebar())}
            className="text-neutral-600 hover:text-neutral-900"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </Button>
        )}

        <div className="flex-1 max-w-xl">
          <div className="relative hidden sm:block">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
              strokeWidth={2}
            />
            <input
              type="search"
              placeholder="Search notes, resources..."
              className="w-full h-10 pl-10 pr-20 rounded-lg bg-neutral-100 border border-transparent text-sm text-neutral-900 placeholder:text-neutral-400 transition-all duration-150 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-neutral-200 bg-white px-1.5 text-[10px] font-medium text-neutral-500 shadow-sm">
                <span className="text-[9px]">⌘</span>K
              </kbd>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative text-neutral-600 hover:text-neutral-900"
          >
            <Bell className="h-5 w-5" strokeWidth={1.75} />
            <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white" />
          </Button>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 sm:gap-3 h-10 px-1.5 sm:pl-1.5 sm:pr-3 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <Avatar size="sm" fallback={userName?.[0]?.toUpperCase() || 'S'} />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-neutral-900 leading-tight">Hi, {userName}</p>
                <p className="text-xs text-neutral-500 leading-tight">{user?.class || 'Class 10'}</p>
              </div>
              <ChevronDown className="hidden sm:block h-4 w-4 text-neutral-400" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
