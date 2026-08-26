import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Input } from '@components/ui/index.jsx';
import { ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import {
  login,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  resetError,
  selectUser,
} from '@redux/slices/auth.slice.js';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
});

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = React.useState(false);

  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);

  useEffect(() => {
    if (isAuthenticated && user) {
      const destination = user.role === 'SUPER_ADMIN' ? '/admin/dashboard' : '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  const onSubmit = async (data) => {
    dispatch(resetError());
    dispatch(login(data));
  };

  return (
    <div className="w-full space-y-8 max-w-sm mx-auto">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 bg-clip-text bg-gradient-to-r from-neutral-900 to-neutral-700">
          Welcome back
        </h1>
        <p className="text-sm text-neutral-500 font-medium">
          Sign in to access your dashboard and study resources.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Email address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <Mail className="h-4.5 w-4.5" strokeWidth={1.75} />
            </span>
            <Input
              id="email"
              type="email"
              placeholder="you@school.edu"
              autoComplete="email"
              className="pl-10 bg-neutral-50/50 hover:bg-neutral-55 focus:bg-white focus:ring-brand-500/10 focus:border-brand-500 rounded-xl transition-all duration-200"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs font-semibold text-danger-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <Lock className="h-4.5 w-4.5" strokeWidth={1.75} />
            </span>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pl-10 pr-10 bg-neutral-50/50 hover:bg-neutral-55 focus:bg-white focus:ring-brand-500/10 focus:border-brand-500 rounded-xl transition-all duration-200"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 focus:outline-none cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs font-semibold text-danger-600 mt-1">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
              {...register('remember')}
            />
            <span className="text-xs font-medium text-neutral-600">Remember me</span>
          </label>
        </div>

        {authError && (
          <div className="rounded-xl bg-danger-50 border border-danger-200/50 px-4 py-3">
            <p className="text-xs font-semibold text-danger-700">{authError}</p>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md hover:shadow-brand-500/10 active:scale-98 transition-all font-bold text-sm h-11"
          disabled={isSubmitting || isLoading}
          rightIcon={<ArrowRight className="h-4.5 w-4.5" strokeWidth={2} />}
        >
          {isSubmitting || isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-neutral-200/60" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-4 text-neutral-450 font-bold uppercase tracking-wider">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" size="md" className="w-full rounded-xl border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100 transition-all font-bold text-xs h-10 flex items-center justify-center">
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </Button>
        <Button variant="outline" size="md" className="w-full rounded-xl border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100 transition-all font-bold text-xs h-10 flex items-center justify-center">
          <svg className="h-4 w-4 mr-2" viewBox="0 0 23 23" fill="currentColor">
            <rect x="0" y="0" width="11" height="11" fill="#F25022" />
            <rect x="12" y="0" width="11" height="11" fill="#7FBA00" />
            <rect x="0" y="12" width="11" height="11" fill="#00A1F1" />
            <rect x="12" y="12" width="11" height="11" fill="#FFB900" />
          </svg>
          Microsoft
        </Button>
      </div>

      <p className="text-center text-xs font-semibold text-neutral-500">
        Don&apos;t have an account?{' '}
        <Link
          to="/register"
          className="font-bold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
