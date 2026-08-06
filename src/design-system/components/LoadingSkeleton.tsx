import React from 'react';
import { cn } from '../tokens';

export interface LoadingSkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  className,
  count = 1,
}) => {
  const variantStyles = {
    text: 'h-3.5 w-full rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-2xl',
    card: 'h-32 w-full rounded-3xl',
  };

  const skeletonItems = Array.from({ length: count });

  return (
    <>
      {skeletonItems.map((_, idx) => (
        <div
          key={idx}
          style={{ width, height }}
          className={cn(
            'animate-pulse bg-slate-800/80 border border-white/5 shadow-inner',
            variantStyles[variant],
            className
          )}
          aria-hidden="true"
        />
      ))}
    </>
  );
};
