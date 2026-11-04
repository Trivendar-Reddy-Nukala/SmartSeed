import React from 'react';
import { cn } from '../../utils/cn';
import { LucideIcon } from 'lucide-react';

interface StatsProps { label: string; value: string | number; icon?: LucideIcon; trend?: { value: number; positive: boolean }; className?: string; }

export function Stats({ label, value, icon: Icon, trend, className }: StatsProps) {
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200 p-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={cn('mt-1 text-sm', trend.positive ? 'text-green-600' : 'text-red-600')}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-xl bg-green-50">
            <Icon className="w-6 h-6 text-green-600" />
          </div>
        )}
      </div>
    </div>
  );
}

