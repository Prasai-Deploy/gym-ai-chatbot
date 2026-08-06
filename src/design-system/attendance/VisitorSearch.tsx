import React from 'react';
import { SearchBar } from '../components/SearchBar';

export interface VisitorSearchProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const VisitorSearch: React.FC<VisitorSearchProps> = React.memo(({
  value,
  onChange,
  placeholder = 'Search currently active visitors or check-in history...',
  className,
}) => {
  return (
    <SearchBar
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  );
});

VisitorSearch.displayName = 'VisitorSearch';
