import React from 'react';
import { cn } from '@utils';

export const Button = React.forwardRef(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      asChild = false,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap select-none';

    const variants = {
      default: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
      secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 active:bg-neutral-300',
      outline:
        'border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100',
      ghost: 'text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 hover:text-neutral-900',
      destructive: 'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 shadow-sm',
      link: 'text-brand-600 underline-offset-4 hover:underline p-0 h-auto',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
      icon: 'h-10 w-10',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);
Button.displayName = 'Button';

export const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border border-neutral-200 bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover',
      className,
    )}
    {...props}
  />
));
Card.displayName = 'Card';

export const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6 pb-4', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-neutral-500', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

export const Badge = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-brand-50 text-brand-700 border-brand-200',
    success: 'bg-success-50 text-success-700 border-success-500/20',
    warning: 'bg-warning-50 text-warning-700 border-warning-500/20',
    danger: 'bg-danger-50 text-danger-700 border-danger-500/20',
    neutral: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  };

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
});
Badge.displayName = 'Badge';

export const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[120px] w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50 resize-y',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Avatar = React.forwardRef(
  ({ className, size = 'md', fallback = 'U', ...props }, ref) => {
    const sizes = {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
      xl: 'h-16 w-16 text-lg',
    };
    return (
      <div
        ref={ref}
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500 text-white font-semibold',
          sizes[size],
          className,
        )}
        {...props}
      >
        {fallback}
      </div>
    );
  },
);
Avatar.displayName = 'Avatar';

export const Separator = React.forwardRef(
  ({ className, orientation = 'horizontal', ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      className={cn(
        'shrink-0 bg-neutral-200',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  ),
);
Separator.displayName = 'Separator';

export const Skeleton = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('animate-pulse bg-neutral-200 rounded', className)} {...props} />
));
Skeleton.displayName = 'Skeleton';

export const SkeletonCard = React.forwardRef(({ className, ...props }, ref) => (
  <Card ref={ref} className={cn('overflow-hidden', className)} {...props}>
    <CardContent className="p-5 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-10" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-7 w-16" />
        <div className="flex items-baseline justify-between gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </CardContent>
  </Card>
));
SkeletonCard.displayName = 'SkeletonCard';

const toastManager = (() => {
  const listeners = new Set();
  const state = { toasts: [] };
  let idCounter = 0;

  const subscribe = (listener) => {
    listeners.add(listener);
    listener(state.toasts);
    return () => listeners.delete(listener);
  };

  const publish = () => {
    listeners.forEach((listener) => listener(state.toasts));
  };

  const addToast = (message, type) => {
    const id = ++idCounter;
    const toast = { id, message, type };
    state.toasts = [...state.toasts, toast];
    publish();
    setTimeout(() => {
      state.toasts = state.toasts.filter((t) => t.id !== id);
      publish();
    }, 4000);
    return id;
  };

  return {
    subscribe,
    success: (message) => addToast(message, 'success'),
    error: (message) => addToast(message, 'error'),
    info: (message) => addToast(message, 'info'),
  };
})();

export const toast = {
  success: (message) => toastManager.success(message),
  error: (message) => toastManager.error(message),
  info: (message) => toastManager.info(message),
};

export const ToastContainer = () => {
  const [toasts, setToasts] = React.useState([]);

  React.useEffect(() => {
    const unsubscribe = toastManager.subscribe((t) => setToasts([...t]));
    return unsubscribe;
  }, []);

  const typeStyles = {
    success: 'bg-success-50 border-success-500/30 text-success-800',
    error: 'bg-danger-50 border-danger-500/30 text-danger-800',
    info: 'bg-brand-50 border-brand-500/30 text-brand-800',
  };

  const typeIcons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  const iconBg = {
    success: 'bg-success-500/10 text-success-600',
    error: 'bg-danger-500/10 text-danger-600',
    info: 'bg-brand-500/10 text-brand-600',
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in fade-in slide-in-from-right-4 duration-300',
            typeStyles[t.type],
          )}
        >
          <div
            className={cn(
              'h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-sm font-bold',
              iconBg[t.type],
            )}
          >
            {typeIcons[t.type]}
          </div>
          <p className="text-sm font-medium flex-1 leading-relaxed">{t.message}</p>
        </div>
      ))}
    </div>
  );
};

export const EmptyState = React.forwardRef(
  ({ icon, title, description, action, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col items-center justify-center text-center py-12 px-6', className)}
      {...props}
    >
      {icon && (
        <div className="h-16 w-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-neutral-800 mb-1.5">{title}</h3>
      {description && <p className="text-sm text-neutral-500 max-w-sm mb-5">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  ),
);
EmptyState.displayName = 'EmptyState';

export * from './MarkdownRenderer.jsx';
