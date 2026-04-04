import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin',
          sizes[size],
        )}
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Spinner size="lg" label="Loading..." />
    </div>
  );
}
