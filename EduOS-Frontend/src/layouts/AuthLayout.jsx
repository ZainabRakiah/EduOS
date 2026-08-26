import React from 'react';
import { GraduationCap } from 'lucide-react';
import loginBg from '../assets/login_bg.jpg';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col sm:flex-row bg-neutral-50 font-sans">
      {/* Left side: Premium 3D fluid art section */}
      <div 
        className="hidden sm:flex sm:w-1/2 lg:w-3/5 relative overflow-hidden bg-cover bg-center select-none"
        style={{ backgroundImage: `url(${loginBg})` }}
      >
        {/* Soft elegant glass overlays to preserve vibrant blue background details */}
        <div className="absolute inset-0 bg-brand-900/10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/80 via-brand-900/10 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white h-full w-full">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md">
              <GraduationCap className="h-7 w-7 text-white" strokeWidth={2.25} />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight bg-clip-text bg-gradient-to-r from-white to-blue-100">EduOS</span>
              <p className="text-xs font-bold tracking-widest text-blue-200/80 uppercase">Learning Platform</p>
            </div>
          </div>

          <div className="space-y-6 max-w-md my-auto">
            <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-white drop-shadow-sm">
              Your Personal Learning Companion
            </h2>
            <p className="text-base text-neutral-200 leading-relaxed font-medium">
              Organize notes, store resources, track progress, and build your knowledge base — all
              in one beautiful workspace.
            </p>

            <div className="grid grid-cols-3 gap-4 pt-6">
              {[
                { label: 'Classes', value: '6 - 12' },
                { label: 'Subjects', value: 'All' },
                { label: '100% Free', value: 'Forever' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 p-4 shadow-sm hover:bg-white/15 hover:border-white/20 transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <p className="text-2xl font-black tracking-tight text-white">{stat.value}</p>
                  <p className="text-[10px] font-bold text-blue-200/90 uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs font-semibold text-neutral-300 tracking-wide">
            Built for students. Designed for success. © {new Date().getFullYear()} EduOS.
          </p>
        </div>
      </div>

      {/* Right side: login form */}
      <div className="flex-1 flex flex-col min-h-screen bg-white">
        <div className="sm:hidden flex items-center gap-3 h-16 px-4 border-b border-neutral-200 bg-white">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
            <GraduationCap className="h-5 w-5 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <span className="text-base font-bold text-neutral-900">EduOS</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
