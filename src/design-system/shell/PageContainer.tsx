import React from 'react';
import { SectionHeader } from '../components/SectionHeader';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';
import { cn } from '../tokens';

export interface PageContainerProps {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = React.memo(({
  title,
  subtitle,
  badge,
  action,
  breadcrumbs,
  children,
  maxWidth = 'full',
  className,
}) => {
  const maxWidthStyles = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-7xl',
    xl: 'max-w-[1400px]',
    full: 'max-w-full',
  };

  return (
    <div className={cn('w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6', maxWidthStyles[maxWidth], className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} />
      )}

      {title && (
        <SectionHeader
          title={title}
          subtitle={subtitle}
          badge={badge}
          action={action}
        />
      )}

      <main className="flex-1 w-full">{children}</main>
    </div>
  );
});

PageContainer.displayName = 'PageContainer';
