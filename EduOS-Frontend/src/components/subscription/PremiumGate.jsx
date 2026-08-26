import React, { useState } from 'react';
import { Lock, Sparkles, Check } from 'lucide-react';
import useFeatureAccess from '@hooks/useFeatureAccess.js';
import UpgradeModal from './UpgradeModal.jsx';
import { Button } from '../ui/index.jsx';

export default function PremiumGate({ children, feature }) {
  const { hasAccess, loading } = useFeatureAccess();
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Verifying Entitlements...</span>
      </div>
    );
  }

  if (hasAccess(feature)) {
    return children;
  }

  // Config details for locks
  const config = {
    ai_explainer: {
      title: 'AI Explainer',
      description: 'Understand difficult concepts instantly with state-of-the-art AI explanations.',
      bullets: [
        'Interactive chapter-by-chapter explanations',
        'Ask custom questions about uploaded PDFs and study materials',
        'Simplify complex paragraphs into plain standard language',
        'Save summaries directly to note boards',
      ],
    },
    mock_tests: {
      title: 'Mock Tests',
      description: 'Practice with tailored AI mock tests designed for your curriculum.',
      bullets: [
        'Create unlimited custom tests for any subject or class',
        'Attempt practice questions with active timers',
        'Detailed explanations for correct and wrong answers',
        'Track your score percentages and mastery history',
      ],
    },
  }[feature] || {
    title: 'Premium Feature',
    description: 'Unlock access to advanced premium learning features on EduOS.',
    bullets: ['Advanced AI learning aids', 'Curated study plans and practice materials'],
  };

  return (
    <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-neutral-200 rounded-3xl shadow-xl text-center space-y-6 relative overflow-hidden animate-fade-in">
      {/* Top glowing radial flare */}
      <div className="absolute top-0 inset-x-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.06),_transparent_65%)] pointer-events-none" />

      <div className="mx-auto h-12 w-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-xs">
        <Lock className="h-5 w-5" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{config.title}</h2>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-55/10 text-amber-700 border border-amber-200/50">
          <Sparkles className="h-3 w-3 animate-pulse" /> Premium Feature
        </span>
        <p className="text-sm text-neutral-500 font-medium max-w-sm mx-auto leading-relaxed pt-2">
          {config.description}
        </p>
      </div>

      {/* Benefits list */}
      <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200/40 text-left max-w-md mx-auto space-y-3">
        <h4 className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">What you get when you upgrade:</h4>
        {config.bullets.map((b, idx) => (
          <div key={idx} className="flex gap-2.5 items-start">
            <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={3} />
            <span className="text-xs font-semibold text-neutral-600 leading-relaxed">{b}</span>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <Button
          onClick={() => setModalOpen(true)}
          size="lg"
          className="w-full max-w-xs bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-md hover:shadow-brand-500/10 active:scale-98 transition-all h-11"
        >
          Upgrade to Premium
        </Button>
      </div>

      <UpgradeModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
