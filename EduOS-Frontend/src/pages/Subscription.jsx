import React from 'react';
import { Check, Sparkles, X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useFeatureAccess from '@hooks/useFeatureAccess.js';
import { Button, Card, CardContent } from '@components/ui/index.jsx';

export default function Subscription() {
  const navigate = useNavigate();
  const { plan, isPremium } = useFeatureAccess();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      {/* Back button & Header */}
      <div className="flex flex-col gap-4">
        <button
          onClick={handleGoBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors w-fit cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Choose the perfect plan</h1>
          <p className="text-sm text-neutral-500 max-w-md mx-auto font-semibold">
            Supercharge your studies and unlock your true academic potential with EduOS Premium.
          </p>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid md:grid-cols-2 gap-8 items-stretch max-w-3xl mx-auto pt-4">
        {/* Free Plan */}
        <Card className={`relative flex flex-col justify-between border ${!isPremium ? 'border-brand-500 ring-2 ring-brand-500/10 shadow-lg' : 'border-neutral-200'} rounded-3xl overflow-hidden`}>
          {!isPremium && (
            <div className="absolute top-0 right-0 bg-brand-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs">
              Current Plan
            </div>
          )}
          <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-neutral-900">Free Plan</h3>
                <p className="text-xs text-neutral-450 font-medium">Basic student toolkits and study logs.</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-neutral-900">₹0</span>
                <span className="text-xs font-bold text-neutral-400">/ forever</span>
              </div>

              {/* Inclusions */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Features included:</h4>
                <div className="flex gap-2.5 items-start">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-xs font-semibold text-neutral-600">Dashboard Insights</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-xs font-semibold text-neutral-600">Notes & Sticky Notes</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-xs font-semibold text-neutral-600">Resources Uploader</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-xs font-semibold text-neutral-600">Learning History & Formulas</span>
                </div>
                <div className="flex gap-2.5 items-start text-neutral-400">
                  <X className="h-4 w-4 text-neutral-350 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-xs font-semibold">AI Explainer</span>
                </div>
                <div className="flex gap-2.5 items-start text-neutral-400">
                  <X className="h-4 w-4 text-neutral-350 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-xs font-semibold">AI Mock Tests</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button
                disabled
                className="w-full bg-neutral-100 text-neutral-400 hover:bg-neutral-100 rounded-xl font-bold text-xs h-10 border border-neutral-200"
              >
                {!isPremium ? 'Active' : 'Downgrade locked'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className={`relative flex flex-col justify-between border ${isPremium ? 'border-brand-500 ring-2 ring-brand-500/10 shadow-lg' : 'border-neutral-200 hover:border-neutral-300'} rounded-3xl overflow-hidden shadow-sm`}>
          {isPremium && (
            <div className="absolute top-0 right-0 bg-brand-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs">
              Current Plan
            </div>
          )}
          <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-extrabold text-neutral-900">Premium Plan</h3>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200/50">
                    <Sparkles className="h-2 w-2" /> Pro
                  </span>
                </div>
                <p className="text-xs text-neutral-450 font-medium">Unlocks all AI-assisted tools and analytics.</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-neutral-900">₹199</span>
                <span className="text-xs font-bold text-neutral-450">/ month</span>
              </div>

              {/* Inclusions */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Everything in FREE, plus:</h4>
                <div className="flex gap-2.5 items-start">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-xs font-semibold text-neutral-600">AI Explainer (All study material queries)</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-xs font-semibold text-neutral-600">Unlimited Mock Test Creations</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-xs font-semibold text-neutral-600">Detailed Mock Answers explanations</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-xs font-semibold text-neutral-600">Complete AI Image & diagram integrations</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-xs font-semibold text-neutral-600">Priority future module releases</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              {isPremium ? (
                <Button
                  disabled
                  className="w-full bg-brand-500/10 text-brand-700 hover:bg-brand-500/10 rounded-xl font-bold text-xs h-10 border border-brand-200"
                >
                  Active Plan
                </Button>
              ) : (
                <div className="space-y-1">
                  <Button
                    disabled
                    className="w-full bg-brand-650/80 text-white rounded-xl font-bold text-xs h-10 shadow-sm cursor-not-allowed"
                  >
                    Subscribe Now
                  </Button>
                  <p className="text-[10px] text-center text-neutral-400 font-bold">
                    Premium subscription will be available soon.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
