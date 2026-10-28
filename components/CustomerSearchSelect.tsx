'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown, Check, Plus, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toBengaliDigits } from '@/lib/bengaliUtils';

export interface CustomerOption {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  businessName?: string;
  totalDue?: number;
}

interface CustomerSearchSelectProps {
  customers: CustomerOption[];
  selectedCustomer: CustomerOption | null;
  onSelectCustomer: (customer: CustomerOption | null) => void;
  placeholder?: string;
  className?: string;
  onAddNewClick?: () => void;
  disabled?: boolean;
}

export function CustomerSearchSelect({
  customers,
  selectedCustomer,
  onSelectCustomer,
  placeholder = 'কাস্টমারের নাম বা মোবাইল নম্বর দিয়ে খুঁজুন...',
  className,
  onAddNewClick,
  disabled = false,
}: CustomerSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update floating viewport position
  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  const openDropdown = () => {
    if (!disabled) {
      updatePosition();
      setIsOpen(true);
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (isOpen) {
      const handleScrollResize = () => updatePosition();
      window.addEventListener('resize', handleScrollResize);
      window.addEventListener('scroll', handleScrollResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollResize);
        window.removeEventListener('scroll', handleScrollResize, true);
      };
    }
  }, [isOpen, updatePosition]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter customers by query
  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.businessName && c.businessName.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

  const handleSelect = (cust: CustomerOption) => {
    onSelectCustomer(cust);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectCustomer(null);
    setSearchQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const isClient = typeof document !== 'undefined';

  return (
    <div ref={containerRef} className={cn('relative w-full font-bengali', className)}>
      {/* Search Input Box */}
      <div
        className={cn(
          'relative flex items-center w-full rounded-xl border bg-slate-50 transition-all cursor-text min-h-[44px]',
          isOpen ? 'border-orange-500 ring-2 ring-orange-500/20 bg-white' : 'border-slate-200 hover:border-slate-300',
          disabled && 'opacity-60 pointer-events-none'
        )}
        onClick={openDropdown}
      >
        <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0 pointer-events-none" />

        {selectedCustomer && !isOpen ? (
          <div className="flex items-center justify-between w-full py-2.5 px-3 text-xs font-bold text-slate-800">
            <div className="flex items-center gap-2 truncate">
              <span className="font-black text-slate-900">{selectedCustomer.name}</span>
              {selectedCustomer.phone && (
                <span className="text-slate-500 font-semibold font-mono">({selectedCustomer.phone})</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-2 shrink-0"
              title="কাস্টমার বাদ দিন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) {
                updatePosition();
                setIsOpen(true);
              }
            }}
            onFocus={openDropdown}
            placeholder={
              selectedCustomer
                ? `${selectedCustomer.name} ${selectedCustomer.phone ? `(${selectedCustomer.phone})` : ''}`
                : placeholder
            }
            className="w-full py-2.5 pl-2.5 pr-8 bg-transparent text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none"
            disabled={disabled}
          />
        )}

        {/* Clear search or arrow icon */}
        {!selectedCustomer && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                }}
                className="p-0.5 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-slate-400 transition-transform duration-200 pointer-events-none',
                  isOpen && 'rotate-180 text-orange-500'
                )}
              />
            )}
          </div>
        )}
      </div>

      {/* Floating Dropdown using React Portal */}
      {isOpen &&
        isClient &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white border border-slate-200/90 rounded-2xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 font-bengali animate-in fade-in-50 zoom-in-95 duration-100"
          >
            {filteredCustomers.length > 0 ? (
              <div className="py-1">
                {filteredCustomers.map((cust) => {
                  const isSelected = selectedCustomer?.id === cust.id;
                  return (
                    <div
                      key={cust.id}
                      onClick={() => handleSelect(cust)}
                      className={cn(
                        'px-3.5 py-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-amber-50/90 text-amber-900 font-bold border-l-2 border-[#b88e2d]'
                          : 'hover:bg-[#faf8f5] text-slate-700'
                      )}
                    >
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                        <span>{cust.name}</span>
                        {cust.phone && (
                          <span className="text-slate-500 font-medium font-mono">
                            ({toBengaliDigits(cust.phone)})
                          </span>
                        )}
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-orange-600 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-slate-400 font-bold">কোনো কাস্টমার পাওয়া যায়নি</p>
                {onAddNewClick && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNewClick();
                    }}
                    className="rounded-xl h-8 text-xs font-bold text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> নতুন কাস্টমার এন্ট্রি করুন
                  </Button>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
