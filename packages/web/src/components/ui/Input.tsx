import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, helperText, className, ...props }, ref) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
    <input
      ref={ref}
      className={cn('w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm', error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500 focus:border-green-500', 'focus:ring-2', className)}
      {...props}
    />
    {error && <p className="text-sm text-red-600">{error}</p>}
    {helperText && !error && <p className="text-sm text-gray-500">{helperText}</p>}
  </div>
));
Input.displayName = 'Input';

