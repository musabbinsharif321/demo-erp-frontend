'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown, Check, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toBengaliDigits, formatProductName } from '@/lib/bengaliUtils';

export interface ProductOption {
  id: string;
  name: string;
  sellPrice: number;
  buyPrice?: number;
  stock?: number;
  unit?: string;
  category?: string;
  brand?: string;
  code?: string;
}

interface ProductSearchSelectProps {
  products: ProductOption[];
  selectedProduct: ProductOption | null;
  onSelectProduct: (product: ProductOption | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onlyInStock?: boolean;
}

export function ProductSearchSelect({
  products,
  selectedProduct,
  onSelectProduct,
  placeholder = 'পণ্যের নাম, ব্র্যান্ড বা কোড দিয়ে খুঁজুন...',
  className,
  disabled = false,
  onlyInStock = false,
}: ProductSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter products by stock and query
  const filteredProducts = React.useMemo(() => {
    let list = products;
    if (onlyInStock) {
      list = list.filter((p) => (p.stock || 0) > 0);
    }
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const code = (p.code || '').toLowerCase();
      return name.includes(q) || brand.includes(q) || cat.includes(q) || code.includes(q);
    });
  }, [products, onlyInStock, searchQuery]);

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
      setHighlightedIndex(0);
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

  const handleSelect = (prod: ProductOption) => {
    onSelectProduct(prod);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectProduct(null);
    setSearchQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        openDropdown();
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < filteredProducts.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredProducts.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts[highlightedIndex]) {
        handleSelect(filteredProducts[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
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

        {selectedProduct && !isOpen ? (
          <div className="flex items-center justify-between w-full py-2 px-3 text-xs font-bold text-slate-800">
            <div className="flex items-center gap-2 truncate">
              <span className="font-black text-slate-900">{formatProductName(selectedProduct.name, selectedProduct.category)}</span>
              {selectedProduct.brand && (
                <span className="text-slate-500 font-semibold">({selectedProduct.brand})</span>
              )}
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded">
                স্টক: {toBengaliDigits(selectedProduct.stock || 0)} {selectedProduct.unit || 'পিস'}
              </span>
              {selectedProduct.buyPrice !== undefined && selectedProduct.buyPrice > 0 && (
                <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded border border-amber-300">
                  ক্রয়: ৳{toBengaliDigits(selectedProduct.buyPrice)}
                </span>
              )}
              <span className="text-orange-600 font-black">
                বিক্রয়: ৳{toBengaliDigits(selectedProduct.sellPrice || 0)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-2 shrink-0 cursor-pointer"
              title="পণ্য পরিবর্তন করুন"
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
              setHighlightedIndex(0);
              if (!isOpen) {
                updatePosition();
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={openDropdown}
            placeholder={
              selectedProduct
                ? `${selectedProduct.name} (দর: ৳${toBengaliDigits(selectedProduct.sellPrice || 0)})`
                : placeholder
            }
            className="w-full py-2.5 pl-2.5 pr-8 bg-transparent text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none"
            disabled={disabled}
          />
        )}

        {/* Clear search or arrow icon */}
        {!selectedProduct && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                }}
                className="p-0.5 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
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
            {filteredProducts.length > 0 ? (
              <div className="py-1">
                {filteredProducts.map((prod, index) => {
                  const isSelected = selectedProduct?.id === prod.id;
                  const isHighlighted = highlightedIndex === index;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleSelect(prod)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        'px-3.5 py-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-amber-50/90 text-amber-900 font-bold border-l-2 border-[#b88e2d]'
                          : isHighlighted
                          ? 'bg-slate-100/80 text-slate-900'
                          : 'hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                          <span>{prod.name}</span>
                          {prod.brand && (
                            <span className="text-[11px] text-slate-500 font-normal">({prod.brand})</span>
                          )}
                          {prod.category && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                              {prod.category}
                            </span>
                          )}
                          {prod.code && (
                            <span className="text-[10px] text-slate-400 font-mono">#{prod.code}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          {prod.buyPrice !== undefined && prod.buyPrice > 0 && (
                            <span className="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                              ক্রয়: ৳{toBengaliDigits(prod.buyPrice)}
                            </span>
                          )}
                          <span className="text-slate-700 font-bold">
                            বিক্রয়: ৳{toBengaliDigits(prod.sellPrice || 0)}/{prod.unit || 'পিস'}
                          </span>
                          <span>•</span>
                          {(prod.stock || 0) > 0 ? (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                              মজুদ: {toBengaliDigits(prod.stock || 0)} {prod.unit || 'পিস'}
                            </span>
                          ) : (
                            <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[10px]">
                              স্টক শেষ (০ {prod.unit || 'পিস'})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected && <Check className="w-4 h-4 text-orange-600 shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center space-y-1">
                <p className="text-xs text-slate-400 font-bold">কোনো পণ্য পাওয়া যায়নি</p>
                <p className="text-[10px] text-slate-400">
                  ইনভেন্টরি পেজ থেকে পণ্য যোগ করুন অথবা অন্য নামে সার্চ করুন
                </p>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
