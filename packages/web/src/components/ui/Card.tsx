import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps { title?: string; description?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string; }

export function Card({ title, description, actions, children, className }: CardProps) {
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

