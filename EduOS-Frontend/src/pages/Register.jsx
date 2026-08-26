import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Input } from '@components/ui/index.jsx';
import { ArrowRight, GraduationCap, Check, Sparkles, X, Eye, EyeOff } from 'lucide-react';
import {
  register as registerAction,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  resetError,
} from '@redux/slices/auth.slice.js';

const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must be 50 characters or less'),
    lastName: z
      .string()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must be 50 characters or less'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    terms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the Terms of Service and Privacy Policy',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);

  const [selectedPlan, setSelectedPlan] = useState('FREE');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  });

  const onSubmit = async (data) => {
    dispatch(resetError());
    dispatch(registerAction({ ...data, plan: selectedPlan, className: 'N/A' }));
  };

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col lg:flex-row bg-gradient-to-tr from-brand-50/30 via-neutral-50 to-neutral-100/50 relative lg:overflow-hidden font-sans">
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-12 left-1/4 h-[500px] w-[500px] rounded-full bg-brand-200/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-1/4 h-[500px] w-[500px] rounded-full bg-indigo-200/15 blur-3xl pointer-events-none" />

      {/* Left section: Detailed Plan Selector (Top on mobile, Left on desktop) */}
      <div className="w-full lg:w-3/5 p-6 sm:p-12 lg:p-16 flex flex-col justify-between lg:h-full lg:overflow-y-auto select-none shrink-0 z-10">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 shrink-0 select-none">
          <div className="h-10 w-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-md shadow-brand-500/10">
            <GraduationCap className="h-6 w-6 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <span className="text-xl font-black text-neutral-900 tracking-tight">EduOS</span>
            <p className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest leading-none mt-0.5">Learning Platform</p>
          </div>
        </div>

        {/* Pricing Selection Area */}
        <div className="space-y-8 my-auto py-8">
          <div className="text-center space-y-2 max-w-lg mx-auto select-none">
            <h2 className="text-3xl font-black text-neutral-900 tracking-tight leading-tight">Choose the perfect plan</h2>
            <p className="text-sm text-neutral-500 font-semibold leading-relaxed">
              Supercharge your studies and unlock your true academic potential with EduOS Premium.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free Plan Card */}
            <div
              onClick={() => setSelectedPlan('FREE')}
              className={`cursor-pointer bg-white rounded-3xl p-6 border text-left relative flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 select-none ${
                selectedPlan === 'FREE'
                  ? 'border-brand-500 ring-4 ring-brand-500/10 shadow-md'
                  : 'border-neutral-200 hover:border-neutral-300 shadow-sm'
              }`}
            >
              {selectedPlan === 'FREE' && (
                <div className="absolute top-0 right-0 bg-brand-500 text-white text-[8px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-2xs">
                  Selected
                </div>
              )}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-neutral-900">Free Plan</h3>
                  <p className="text-[10px] text-neutral-450 font-medium leading-relaxed">Basic student toolkits and study logs.</p>
                </div>

                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-black text-neutral-900">₹0</span>
                  <span className="text-[10px] font-bold text-neutral-400">/ forever</span>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-neutral-100">
                  <span className="text-[9px] font-black text-neutral-450 uppercase tracking-wider block">Features included:</span>
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
            </div>

            {/* Premium Plan Card */}
            <div
              onClick={() => setSelectedPlan('PREMIUM')}
              className={`cursor-pointer bg-white rounded-3xl p-6 border text-left relative flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 select-none ${
                selectedPlan === 'PREMIUM'
                  ? 'border-brand-500 ring-4 ring-brand-500/10 shadow-md'
                  : 'border-neutral-200 hover:border-neutral-300 shadow-sm'
              }`}
            >
              {selectedPlan === 'PREMIUM' && (
                <div className="absolute top-0 right-0 bg-brand-500 text-white text-[8px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-2xs">
                  Selected
                </div>
              )}
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-extrabold text-neutral-900">Premium Plan</h3>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200/50 shrink-0">
                      <Sparkles className="h-2 w-2" /> Pro
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-455 font-medium leading-relaxed">Unlocks all AI-assisted tools and analytics.</p>
                </div>

                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-black text-neutral-900">₹199</span>
                  <span className="text-[10px] font-bold text-neutral-400">/ month</span>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-neutral-100">
                  <span className="text-[9px] font-black text-neutral-450 uppercase tracking-wider block">Everything in FREE, plus:</span>
                  <div className="flex gap-2.5 items-start">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-xs font-semibold text-neutral-600">AI Explainer (All PDF queries)</span>
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
                    <span className="text-xs font-semibold text-neutral-600">Complete AI Image & diagram tools</span>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-xs font-semibold text-neutral-600">Priority future module releases</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-xs font-bold text-neutral-400 tracking-wide shrink-0">
          Built for students. Designed for success. © {new Date().getFullYear()} EduOS.
        </p>
      </div>

      {/* Right section: Registration Form (Bottom on mobile, Right on desktop) */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-4 sm:p-8 lg:p-12 z-10 shrink-0 lg:h-full lg:overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-3xl border border-neutral-200/60 shadow-xl p-6 sm:p-10 space-y-6">
          <div className="space-y-1.5 text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">Create your account</h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-semibold">Start organizing your learning journey with EduOS.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="text-xs font-bold text-neutral-700">
                  First name
                </label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Alex"
                  autoComplete="given-name"
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-[10px] font-semibold text-danger-600">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="lastName" className="text-xs font-bold text-neutral-700">
                  Last name
                </label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Morgan"
                  autoComplete="family-name"
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-[10px] font-semibold text-danger-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold text-neutral-700">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="alex.morgan@student.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-[10px] font-semibold text-danger-600">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-bold text-neutral-700">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-450 hover:text-neutral-600 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[10px] font-semibold text-danger-600">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-xs font-bold text-neutral-700">
                  Confirm password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="pr-10"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-455 hover:text-neutral-600 focus:outline-none cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-[10px] font-semibold text-danger-600">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                {...register('terms')}
              />
              <span className="text-xs text-neutral-600 leading-relaxed font-semibold">
                I agree to the{' '}
                <a href="#" className="font-bold text-brand-600 hover:text-brand-700 no-underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="font-bold text-brand-600 hover:text-brand-700 no-underline">
                  Privacy Policy
                </a>
                .
              </span>
            </label>
            {errors.terms && (
              <p className="text-[10px] font-semibold text-danger-600">{errors.terms.message}</p>
            )}

            {authError && (
              <div className="rounded-md bg-danger-50 border border-danger-200 px-4 py-3">
                <p className="text-xs font-semibold text-danger-700">{authError}</p>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full h-11 text-xs font-bold"
              disabled={isLoading}
              rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={2} />}
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-4 text-neutral-450 font-bold">Or sign up with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="md" className="w-full text-xs font-bold h-10">
              Google
            </Button>
            <Button variant="outline" size="md" className="w-full text-xs font-bold h-10">
              Microsoft
            </Button>
          </div>

          <p className="text-center text-xs text-neutral-550 font-semibold">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700 no-underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
