import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps { icon?: LucideIcon; title: string; description?: string; actionLabel?: string; onAction?: () => void; }

export function EmptyState({ icon: Icon = Inbox, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 bg-gray-100 rounded-full mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500 max-w-md">{description}</p>}
      {actionLabel && onAction && <Button className="mt-4" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

