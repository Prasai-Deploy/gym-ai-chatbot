import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { springs } from '../../theme/animations';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'ai';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle = "inline-flex items-center justify-center font-bold tracking-tight rounded-2xl transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const variants = {
    primary: "bg-[#F97316] text-white hover:bg-[#EA580C] shadow-lg shadow-orange-500/20",
    ai: "bg-[#6366F1] text-white hover:bg-[#4F46E5] shadow-lg shadow-indigo-500/20",
    secondary: "bg-[#1A2030] text-slate-200 border border-white/10 hover:bg-slate-800 hover:text-white",
    ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-white/5",
    destructive: "bg-[#EF4444] text-white hover:bg-red-600 shadow-lg shadow-red-500/20"
  };

  const sizes = {
    sm: "px-3.5 py-2 text-xs gap-1.5",
    md: "px-5 py-3 text-xs sm:text-sm gap-2",
    lg: "px-7 py-4 text-sm sm:text-base gap-2.5 font-extrabold"
  };

  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { scale: 1.02 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={springs.responsive}
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-1" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </motion.button>
  );
};
