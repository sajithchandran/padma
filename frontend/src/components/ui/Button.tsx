import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'xs' | 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm focus-visible:ring-blue-500',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 focus-visible:ring-slate-400',
  ghost:     'text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm focus-visible:ring-red-500',
  outline:   'border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-400',
};

const sizes: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5',
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-base gap-2',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconRight, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  ),
);
Button.displayName = 'Button';
