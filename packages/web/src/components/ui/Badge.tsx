import { cn } from '../../utils/cn';
import { getRiskLevelColor, getStatusColor } from '../../utils/format';

interface BadgeProps { children: React.ReactNode; variant?: 'default' | 'risk' | 'status' | 'success' | 'warning' | 'danger'; value?: string; className?: string; }

export function Badge({ children, variant = 'default', value, className }: BadgeProps) {
  let colorClass = 'bg-gray-100 text-gray-800';

  if (variant === 'success') colorClass = 'bg-green-100 text-green-800';
  if (variant === 'warning') colorClass = 'bg-yellow-100 text-yellow-800';
  if (variant === 'danger') colorClass = 'bg-red-100 text-red-800';
  if (variant === 'risk' && value) colorClass = getRiskLevelColor(value);
  if (variant === 'status' && value) colorClass = getStatusColor(value);

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', colorClass, className)}>
      {children}
    </span>
  );
}

