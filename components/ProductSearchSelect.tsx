'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown, Check, Package, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatProductName } from '@/lib/bengaliUtils';

export interface ProductOption {
  id: string;
  name: string;
  sellPrice: number;
  stock?: number;
  unit?: string;
  category?: string;
  code?: string;
}

interface ProductSearchSelectProps {
  products: ProductOption[];
  selectedProductId: string;
  onSelectProduct: (product: ProductOption | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const CATEGORY_TABS = [
  { id: 'সব', label: 'সব পণ্য' },
  { id: 'রড', label: '🏗️ রড (Rod)' },
  { id: 'সিমেন্ট', label: '🧱 সিমেন্ট (Cement)' },
  { id: 'রিং', label: '⭕ রিং (Ring)' },
  { id: 'অন্যান্য', label: '📦 অন্যান্য' },
];

export function ProductSearchSelect({
  products,
  selectedProductId,
  onSelectProduct,
  placeholder = 'পণ্যের নাম বা ক্যাটাগরি টাইপ করে খুঁজুন...',
  className,
  disabled = false,
}: ProductSearchSelectProps) {
  const [activeTab, setActiveTab] = useState<string>('সব');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;

  // Calculate floating portal coordinates
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

  // Category matching function
  const isCategoryMatch = (p: ProductOption, tab: string) => {
    if (tab === 'সব') return true;
    const name = (p.name || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();

    if (tab === 'রড') {
      return cat === 'রড' || cat.includes('rod') || name.includes('রড') || name.includes('মিলি') || name.includes('mm');
    }
    if (tab === 'সিমেন্ট') {
      return cat === 'সিমেন্ট' || cat.includes('cement') || name.includes('সিমেন্ট');
    }
    if (tab === 'রিং') {
      return cat === 'রিং' || cat.includes('ring') || name.includes('রিং');
    }
    if (tab === 'অন্যান্য') {
      const isRod = cat === 'রড' || cat.includes('rod') || name.includes('রড') || name.includes('মিলি') || name.includes('mm');
      const isCement = cat === 'সিমেন্ট' || cat.includes('cement') || name.includes('সিমেন্ট');
      const isRing = cat === 'রিং' || cat.includes('ring') || name.includes('রিং');
      return !isRod && !isCement && !isRing;
    }
    return true;
  };

  // Filter products by tab and search query
  const filteredProducts = products.filter((p) => {
    if (!isCategoryMatch(p, activeTab)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.code && p.code.toLowerCase().includes(q))
    );
  });

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

  const isClient = typeof document !== 'undefined';

  return (
    <div ref={containerRef} className={cn('space-y-2 w-full font-bengali', className)}>
      {/* Category Tabs Header */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                if (!isOpen) {
                  openDropdown();
                } else {
                  updatePosition();
                }
              }}
              className={cn(
                'px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all border',
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs scale-[1.02]'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Input Box */}
      <div
        className={cn(
          'relative flex items-center w-full rounded-xl border bg-slate-50 transition-all cursor-text min-h-[42px]',
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
              <span className="text-orange-600 font-black">৳{selectedProduct.sellPrice.toLocaleString()}</span>
              {selectedProduct.unit && (
                <span className="text-slate-400 text-[11px]">/{selectedProduct.unit}</span>
              )}
              {selectedProduct.stock !== undefined && (
                <span className="text-slate-500 font-semibold text-[11px]">
                  (স্টক: {selectedProduct.stock} {selectedProduct.unit || ''})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-2 shrink-0"
              title="পণ্য বাদ দিন"
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
              selectedProduct
                ? `${formatProductName(selectedProduct.name, selectedProduct.category)} — ৳${selectedProduct.sellPrice}`
                : `${activeTab === 'সব' ? 'সকল' : activeTab} পণ্য সার্চ করতে লিখুন...`
            }
            className="w-full py-2 pl-2.5 pr-8 bg-transparent text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none"
            disabled={disabled}
          />
        )}

        {/* Arrow or Clear Button */}
        {!selectedProduct && (
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
            <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>ক্যাটাগরি: <strong className="text-orange-600">{activeTab}</strong> ({filteredProducts.length} টি পণ্য পাওয়া গেছে)</span>
              {searchQuery && <span>সার্চ: &quot;{searchQuery}&quot;</span>}
            </div>

            {filteredProducts.length > 0 ? (
              <div className="py-1">
                {filteredProducts.map((prod) => {
                  const isSelected = selectedProductId === prod.id;
                  const isOutOfStock = prod.stock !== undefined && prod.stock <= 0;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => !isOutOfStock && handleSelect(prod)}
                      className={cn(
                        'px-3.5 py-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors',
                        isOutOfStock ? 'opacity-50 cursor-not-allowed bg-slate-50/50' : isSelected ? 'bg-amber-50/90 text-amber-900 font-bold border-l-2 border-[#b88e2d]' : 'hover:bg-[#faf8f5] text-slate-700'
                      )}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 font-black text-slate-900 text-xs">
                          <span>{formatProductName(prod.name, prod.category)}</span>
                          {prod.category && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {prod.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="font-black text-orange-600">৳{prod.sellPrice.toLocaleString()} {prod.unit ? `/${prod.unit}` : ''}</span>
                          {prod.stock !== undefined && (
                            <span className={cn("font-bold", isOutOfStock ? "text-rose-600" : "text-emerald-600")}>
                              {isOutOfStock ? 'স্টক শেষ' : `স্টক: ${prod.stock} ${prod.unit || ''}`}
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
              <div className="p-5 text-center space-y-1">
                <Package className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-slate-400 font-bold">
                  {activeTab === 'সব' ? 'কোনো পণ্য পাওয়া যায়নি' : `"${activeTab}" ক্যাটাগরিতে কোনো পণ্য পাওয়া যায়নি`}
                </p>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
