import React from 'react';
import { X, Sparkles, ClipboardCheck } from 'lucide-react';
import { Button } from '../ui/index.jsx';
import { useNavigate } from 'react-router-dom';

export default function UpgradeModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    navigate('/subscription');
  };

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-neutral-200 shadow-2xl p-6 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center space-y-4">
          {/* Logo Icon */}
          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-650 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Sparkles className="h-6 w-6 text-white animate-pulse" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-extrabold text-neutral-900">Unlock EduOS Premium</h3>
            <p className="text-sm text-neutral-550 max-w-xs mx-auto leading-relaxed">
              Learn smarter with powerful features designed for your academic success.
            </p>
          </div>

          {/* Features List */}
          <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/50 space-y-3.5 text-left">
            <div className="flex gap-3 items-start">
              <div className="h-5 w-5 shrink-0 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 mt-0.5">
                <Sparkles className="h-3 w-3" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-neutral-800">AI Explainer</h4>
                <p className="text-[10px] text-neutral-500 font-semibold leading-relaxed">Ask questions, simplify concepts, and get instant explanations.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="h-5 w-5 shrink-0 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 mt-0.5">
                <ClipboardCheck className="h-3 w-3" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-neutral-800">AI Mock Tests</h4>
                <p className="text-[10px] text-neutral-500 font-semibold leading-relaxed">Practice with personalized tests, track performance, and master topics.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="h-5 w-5 shrink-0 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 mt-0.5">
                <Sparkles className="h-3 w-3" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-neutral-800">Future Premium Tools</h4>
                <p className="text-[10px] text-neutral-500 font-semibold leading-relaxed">Get immediate access to previous year papers and advanced analytics.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleUpgrade}
              size="lg"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md font-bold text-sm h-11"
            >
              Upgrade to Premium
            </Button>
            <button
              onClick={onClose}
              className="text-xs font-bold text-neutral-450 hover:text-neutral-700 py-2 w-full transition-colors cursor-pointer"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
