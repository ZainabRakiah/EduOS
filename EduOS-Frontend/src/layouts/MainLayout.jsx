import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@components/layout/Sidebar.jsx';
import Topbar from '@components/layout/Topbar.jsx';
import { useMediaQuery, useAppSelector } from '@hooks';
import { cn } from '@utils';

export default function MainLayout() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {!isMobile && <Sidebar />}

      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300',
          !isMobile && (sidebarOpen ? 'ml-0' : 'ml-0'),
        )}
      >
        <Topbar />

        <main className="flex-1 min-w-0">
          <div className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" />
          <div className="absolute inset-y-0 left-0">
            <Sidebar />
          </div>
        </div>
      )}
    </div>
  );
}
