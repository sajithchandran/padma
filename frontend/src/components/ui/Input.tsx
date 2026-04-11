import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/40">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-xl border text-sm text-foreground bg-card placeholder:text-muted-foreground/40',
              'focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary',
              'disabled:bg-muted disabled:text-muted-foreground/50 disabled:cursor-not-allowed',
              'transition-all duration-200',
              error ? 'border-red-500/50 bg-red-500/5 focus:ring-red-500/10' : 'border-border',
              icon ? 'pl-11' : 'pl-4',
              iconRight ? 'pr-11' : 'pr-4',
              'py-2.5 h-11',
              className,
            )}
            {...props}
          />
          {iconRight && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted-foreground/40">
              {iconRight}
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 ml-1 text-[10px] font-bold text-red-500 uppercase tracking-wide">{error}</p>}
        {hint && !error && <p className="mt-1.5 ml-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide">{hint}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
