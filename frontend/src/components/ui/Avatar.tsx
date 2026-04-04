import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const colors = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-teal-500',
  'bg-indigo-500',
];

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover ring-2 ring-white', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-white select-none flex-shrink-0',
        sizes[size],
        getColor(name),
        className,
      )}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
