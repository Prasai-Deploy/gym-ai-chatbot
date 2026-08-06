import React from 'react';
import { SearchBar } from '../components/SearchBar';

export interface MemberSearchProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const MemberSearch: React.FC<MemberSearchProps> = React.memo(({
  value,
  onChange,
  placeholder = 'Search member by name, email, or membership tier...',
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

MemberSearch.displayName = 'MemberSearch';
