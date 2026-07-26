import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { springs } from '../../theme/animations';

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'hero' | 'metric' | 'insight' | 'coach' | 'workout' | 'default';
  children: React.ReactNode;
  accentColor?: string;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  accentColor,
  className = '',
  ...props
}) => {
  const baseStyle = "p-6 rounded-[24px] relative overflow-hidden transition-all duration-300 font-sans";

  const variants = {
    default: "bg-[#131722] border border-white/10 hover:border-white/20",
    hero: "bg-gradient-to-br from-[#131722] via-[#1A2030] to-[#131722] border border-orange-500/30 v3-glow-orange",
    coach: "bg-gradient-to-br from-[#131722] via-[#1A2030] to-[#131722] border border-indigo-500/30 v3-glow-indigo",
    metric: "bg-[#131722] border border-white/10 hover:border-white/20",
    insight: "bg-[#1A2030] border border-white/10",
    workout: "bg-[#131722] border border-white/10 hover:border-orange-500/40"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.responsive}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {accentColor && (
        <div 
          className="absolute top-0 left-0 right-0 h-1 rounded-t-[24px]"
          style={{ backgroundColor: accentColor }}
        />
      )}
      {children}
    </motion.div>
  );
};
