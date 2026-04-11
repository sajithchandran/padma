import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-bold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-95 whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white shadow-sm hover:bg-primary/90 hover:shadow-primary/20',
        primary: 'bg-primary text-white shadow-sm hover:bg-primary/90 hover:shadow-primary/20',
        premium: 'bg-gradient-to-br from-primary to-indigo-600 text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5',
        destructive: 'bg-red-500 text-white shadow-sm hover:bg-red-600 hover:shadow-red-500/20',
        outline: 'border border-border bg-background hover:bg-muted hover:text-foreground hover:border-border',
        secondary: 'bg-muted text-foreground hover:bg-muted/80',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        glass: 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm rounded-xl',
        sm: 'h-9 px-3 rounded-lg text-xs',
        lg: 'h-11 px-8 rounded-2xl text-base',
        xs: 'h-8 px-2.5 rounded-lg text-[11px]',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  block?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, block, icon, iconRight, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), block && 'w-full')}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!loading && icon && <span className="mr-2">{icon}</span>}
            {children}
            {!loading && iconRight && <span className="ml-2">{iconRight}</span>}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
