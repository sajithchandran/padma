import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    padding?: 'none' | 'sm' | 'md' | 'lg' | 'glass';
    hover?: boolean;
  }
>(({ className, padding = 'md', hover, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200',
      padding === 'glass' ? 'glass-card' : padding === 'md' ? 'p-6' : padding === 'sm' ? 'p-4' : padding === 'lg' ? 'p-8' : '',
      hover && 'hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { action?: React.ReactNode }
>(({ className, action, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-row items-center justify-between space-y-1.5 pb-4', className)}
    {...props}
  >
    <div className="flex flex-col space-y-1">{children}</div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight font-display text-foreground/90', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardSubtitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardSubtitle.displayName = 'CardSubtitle';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardSubtitle, CardContent };
