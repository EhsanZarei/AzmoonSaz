import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, id, onCheckedChange, ...props }, ref) => {
    const switchId = id || React.useId();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
    };

    return (
      <label
        htmlFor={switchId}
        className="inline-flex items-center gap-3 cursor-pointer"
      >
        <div className="relative">
          <input
            id={switchId}
            type="checkbox"
            className="sr-only peer"
            ref={ref}
            onChange={handleChange}
            {...props}
          />
          <div
            className={cn(
              'w-11 h-6 rounded-full transition-colors',
              'peer-checked:bg-primary peer-unchecked:bg-gray-300',
              'peer-focus-visible:outline-none peer-focus-visible:ring-2',
              'peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2',
              'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
              className
            )}
          />
          <div
            className={cn(
              'absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white shadow-lg',
              'transition-transform',
              'peer-checked:translate-x-[-1.25rem] peer-unchecked:translate-x-0'
            )}
          />
        </div>
        {label && (
          <span className="text-sm font-medium text-foreground">
            {label}
          </span>
        )}
      </label>
    );
  }
);
Switch.displayName = 'Switch';

export { Switch };
