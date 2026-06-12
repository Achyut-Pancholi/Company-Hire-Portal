import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export type DropdownOption = string | { label: string; value: string };

interface SearchableDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLabel = (opt: DropdownOption) => typeof opt === 'string' ? opt : opt.label;
  const getValue = (opt: DropdownOption) => typeof opt === 'string' ? opt : opt.value;

  const filteredOptions = options.filter(option =>
    getLabel(option).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => getValue(opt) === value);
  const displayLabel = selectedOption ? getLabel(selectedOption) : (value || placeholder);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', minWidth: '200px' }}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '6px',
          background: disabled ? 'var(--bg-muted, #f8fafc)' : 'var(--bg-surface, #ffffff)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: value ? 'var(--text-primary, #0f172a)' : 'var(--text-muted, #64748b)',
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {displayLabel}
        </span>
        <ChevronDown size={16} color="var(--text-muted, #64748b)" />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            zIndex: 50,
            maxHeight: '250px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', alignItems: 'center' }}>
            <Search size={14} color="var(--text-muted, #64748b)" style={{ marginRight: '8px' }} />
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '0.9rem',
                background: 'transparent',
                color: 'var(--text-primary, #0f172a)'
              }}
            />
          </div>
          
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, idx) => {
                const optValue = getValue(option);
                const optLabel = getLabel(option);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      onChange(optValue);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      background: value === optValue ? 'var(--primary-light, #eff6ff)' : 'transparent',
                      color: value === optValue ? 'var(--primary-color, #2563eb)' : 'var(--text-primary, #0f172a)',
                    }}
                    onMouseEnter={(e) => {
                      if (value !== optValue) e.currentTarget.style.background = 'var(--bg-hover, #f1f5f9)';
                    }}
                    onMouseLeave={(e) => {
                      if (value !== optValue) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {optLabel}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '8px 12px', color: 'var(--text-muted, #64748b)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
