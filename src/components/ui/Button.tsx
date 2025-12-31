import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-semibold rounded-xl
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-900
    disabled:opacity-50 disabled:cursor-not-allowed
    touch-target
  `;
  
  const variantStyles = {
    primary: `
      gradient-primary text-white
      hover:opacity-90 hover:shadow-lg hover:shadow-primary-500/25
      focus:ring-primary-500
    `,
    secondary: `
      bg-surface-700 text-surface-100
      hover:bg-surface-600 hover:shadow-md
      focus:ring-surface-500
      border border-surface-600
    `,
    ghost: `
      bg-transparent text-surface-300
      hover:bg-surface-800 hover:text-surface-100
      focus:ring-surface-500
    `,
    danger: `
      bg-error-500 text-white
      hover:bg-error-600 hover:shadow-lg hover:shadow-error-500/25
      focus:ring-error-500
    `,
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-8 py-4 text-lg',
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 spinner" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}
