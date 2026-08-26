import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { Button } from '@components/ui/index.jsx';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <div className="flex items-center h-16 px-6 border-b border-neutral-200 bg-white">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
            <GraduationCap className="h-5 w-5 text-white" strokeWidth={2.25} />
          </div>
          <span className="text-lg font-bold text-neutral-900">EduOS</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8">
          <div>
            <p className="text-8xl font-bold tracking-tighter bg-gradient-to-br from-brand-500 to-brand-700 bg-clip-text text-transparent">
              404
            </p>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Page not found</h1>
            <p className="text-neutral-600 leading-relaxed">
              Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been
              moved or no longer exists.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/" className="no-underline w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto"
                leftIcon={<ArrowLeft className="h-4 w-4" strokeWidth={2} />}
              >
                Go home
              </Button>
            </Link>
            <Link to="/dashboard" className="no-underline w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Go to dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
