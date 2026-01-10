"use client";

import { forwardRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { applyCpfMask, applyPhoneMask, applyCurrencyMask } from '@/lib/masks';

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  mask: 'cpf' | 'phone' | 'currency';
  onChange?: (value: string, rawValue: string) => void;
}

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, label, error, helperText, icon, id, mask, onChange, value, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('');
    const inputId = id || `masked-input-${Math.random().toString(36).substr(2, 9)}`;

    // Apply mask based on type
    const applyMask = (inputValue: string): string => {
      switch (mask) {
        case 'cpf':
          return applyCpfMask(inputValue);
        case 'phone':
          return applyPhoneMask(inputValue);
        case 'currency':
          return applyCurrencyMask(inputValue);
        default:
          return inputValue;
      }
    };

    // Get raw value (without mask)
    const getRawValue = (maskedValue: string): string => {
      switch (mask) {
        case 'cpf':
        case 'phone':
          return maskedValue.replace(/\D/g, '');
        case 'currency':
          return maskedValue.replace(/[R$\s]/g, '').replace(',', '.');
        default:
          return maskedValue;
      }
    };

    // Update display value when external value changes
    useEffect(() => {
      if (value !== undefined) {
        let processedValue = String(value);
        
        // Special handling for currency mask when value comes as a number
        if (mask === 'currency' && typeof value === 'number') {
          // Convert number to centavos (multiply by 100) for proper formatting
          processedValue = Math.round(value * 100).toString();
        } else if (mask === 'currency' && !isNaN(Number(value)) && !value.toString().includes('R$')) {
          // If it's a numeric string that doesn't contain currency symbols, treat as reais
          processedValue = Math.round(Number(value) * 100).toString();
        }
        
        const maskedValue = applyMask(processedValue);
        setDisplayValue(maskedValue);
      }
    }, [value, mask]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const maskedValue = applyMask(inputValue);
      const rawValue = getRawValue(maskedValue);
      
      setDisplayValue(maskedValue);
      
      if (onChange) {
        onChange(maskedValue, rawValue);
      }
    };

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-semibold text-gray-700"
          >
            {label}
            {props.required && <span className="text-danger-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="text-gray-400">
                {icon}
              </div>
            </div>
          )}
          
          <input
            {...props}
            ref={ref}
            id={inputId}
            value={displayValue}
            onChange={handleChange}
            className={cn(
              'w-full rounded-xl border-2 shadow-soft transition-all duration-200',
              'focus:outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              'placeholder:text-gray-400',
              error 
                ? 'border-danger-300 focus:ring-danger-500/20 focus:border-danger-500' 
                : 'border-gray-200 hover:border-gray-300',
              icon ? 'pl-10 pr-4 py-3' : 'px-4 py-3',
              className
            )}
          />
        </div>
        
        {error && (
          <p className="text-sm text-danger-600 flex items-center gap-1">
            <span className="text-danger-500">⚠</span>
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className="text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

MaskedInput.displayName = 'MaskedInput';

export default MaskedInput;