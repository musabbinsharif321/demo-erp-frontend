'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown, Check, Plus, Phone, UserCheck, HardHat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toBengaliDigits } from '@/lib/bengaliUtils';

export interface EngineerOption {
  id: string | number;
  name: string;
  phone?: string;
  address?: string;
  businessName?: string;
  customerType?: string;
  totalDue?: number;
  rodCommissionRate?: number;
  cementCommissionRate?: number;
}

interface EngineerSearchSelectProps {
  engineers: EngineerOption[];
  selectedEngineer: EngineerOption | null;
  onSelectEngineer: (engineer: EngineerOption | null) => void;
  placeholder?: string;
  className?: string;
  onAddNewClick?: () => void;
  disabled?: boolean;
}

export function EngineerSearchSelect({
  engineers,
  selectedEngineer,
  onSelectEngineer,
  placeholder = 'ইঞ্জিনিয়ারের নাম বা মোবাইল নম্বর দিয়ে খুঁজুন...',
  className,
  onAddNewClick,
  disabled = false,
}: EngineerSearchSelectProps) {
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

  // Filter engineers by query
  const filteredEngineers = engineers.filter((eng) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      eng.name.toLowerCase().includes(q) ||
      (eng.phone && eng.phone.includes(q)) ||
      (eng.businessName && eng.businessName.toLowerCase().includes(q)) ||
      (eng.address && eng.address.toLowerCase().includes(q))
    );
  });

  const handleSelect = (eng: EngineerOption) => {
    onSelectEngineer(eng);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectEngineer(null);
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
        <HardHat className="w-4 h-4 text-orange-500 ml-3 shrink-0 pointer-events-none" />

        {selectedEngineer && !isOpen ? (
          <div className="flex items-center justify-between w-full py-2.5 px-3 text-xs font-bold text-slate-800">
            <div className="flex items-center gap-2 truncate">
              <span className="font-black text-slate-900">{selectedEngineer.name}</span>
              {selectedEngineer.phone && (
                <span className="text-slate-500 font-semibold font-mono">({selectedEngineer.phone})</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-2 shrink-0"
              title="ইঞ্জিনিয়ার পরিবর্তন বা বাদ দিন"
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
            onFocus={() => {
              updatePosition();
              setIsOpen(true);
            }}
            placeholder={selectedEngineer ? selectedEngineer.name : placeholder}
            className="w-full bg-transparent px-3 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium focus:outline-hidden"
          />
        )}

        <div className="flex items-center pr-2 shrink-0 gap-1">
          {searchQuery && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-slate-400 transition-transform duration-200 pointer-events-none',
              isOpen && 'transform rotate-180 text-orange-500'
            )}
          />
        </div>
      </div>

      {/* Floating Dropdown Portal */}
      {isClient &&
        isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${Math.max(coords.width, 320)}px`,
              zIndex: 99999,
            }}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden font-bengali animate-in fade-in zoom-in-95 duration-150 max-h-[320px] flex flex-col"
          >
            {/* Header / Search Info */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500">
                ইঞ্জিনিয়ার তালিকা ({toBengaliDigits(filteredEngineers.length)} জন)
              </span>
              {onAddNewClick && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onAddNewClick();
                  }}
                  className="text-orange-600 hover:text-orange-700 font-bold text-xs flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> নতুন যোগ করুন
                </button>
              )}
            </div>

            {/* List of Engineers */}
            <div className="overflow-y-auto flex-1 p-1 divide-y divide-slate-50">
              {/* Option to clear / No engineer */}
              <button
                type="button"
                onClick={() => {
                  onSelectEngineer(null);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-xl transition-colors text-xs flex items-center justify-between hover:bg-slate-100',
                  !selectedEngineer ? 'bg-slate-100 text-slate-900 font-black' : 'text-slate-600'
                )}
              >
                <span>কোনো ইঞ্জিনিয়ার নির্দিষ্ট নেই (ঐচ্ছিক)</span>
                {!selectedEngineer && <Check className="w-4 h-4 text-emerald-600" />}
              </button>

              {filteredEngineers.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <p className="font-medium">কোনো ইঞ্জিনিয়ার পাওয়া যায়নি</p>
                  {onAddNewClick && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsOpen(false);
                        onAddNewClick();
                      }}
                      className="mt-2 text-xs font-bold text-orange-600 border-orange-200 hover:bg-orange-50 rounded-xl"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> &ldquo;{searchQuery}&rdquo; যোগ করুন
                    </Button>
                  )}
                </div>
              ) : (
                filteredEngineers.map((eng) => {
                  const isSelected = selectedEngineer?.id === eng.id;
                  return (
                    <button
                      key={eng.id}
                      type="button"
                      onClick={() => handleSelect(eng)}
                      className={cn(
                        'w-full text-left p-2.5 rounded-xl transition-all text-xs flex items-center justify-between gap-2',
                        isSelected ? 'bg-orange-50 text-orange-950 font-bold' : 'hover:bg-slate-50 text-slate-800'
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black',
                            isSelected ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-700'
                          )}
                        >
                          <HardHat className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="font-black text-slate-900 truncate flex items-center gap-1.5">
                            {eng.name}
                            {eng.customerType && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                                {eng.customerType}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                            {eng.phone && <span className="font-mono">{eng.phone}</span>}
                            {eng.businessName && <span>• {eng.businessName}</span>}
                            {((eng.rodCommissionRate || 0) > 0 || (eng.cementCommissionRate || 0) > 0) && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                                {eng.rodCommissionRate ? `রড: ৳${toBengaliDigits(eng.rodCommissionRate)}/কেজি ` : ''}
                                {eng.cementCommissionRate ? `সিমেন্ট: ৳${toBengaliDigits(eng.cementCommissionRate)}/বস্তা` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-orange-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
