import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, options, className, ...props }, ref) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
    <select
      ref={ref}
      className={cn('w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm bg-white', error ? 'border-red-500' : 'border-gray-300 focus:ring-green-500 focus:border-green-500', 'focus:ring-2', className)}
      {...props}
    >
      <option value="">Select...</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
));
Select.displayName = 'Select';

