import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function Card({ children, className, padding = 'md', hover, ...props }: CardProps) {
  const paddings = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-sm',
        hover && 'hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer',
        paddings[padding],
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ children, className, action }: { children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div>{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-base font-semibold text-slate-900', className)}>{children}</h3>;
}

export function CardSubtitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-sm text-slate-500 mt-0.5', className)}>{children}</p>;
}
