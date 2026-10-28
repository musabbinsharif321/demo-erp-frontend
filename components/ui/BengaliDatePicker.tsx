'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { toBengaliDigits } from '@/lib/bengaliUtils';
import { BENGALI_MONTHS, BENGALI_WEEKDAYS, formatBengaliDate } from './BengaliDateRangePicker';

interface BengaliDatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
}

export const BengaliDatePicker: React.FC<BengaliDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'তারিখ নির্বাচন করুন',
  className = '',
  align = 'left',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewDate, setViewDate] = useState<Date>(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  const toggleOpen = () => {
    if (!disabled) {
      if (!isOpen && value) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) setViewDate(d);
      }
      setIsOpen(!isOpen);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const handleSelectDay = (dayStr: string) => {
    onChange(dayStr);
    setIsOpen(false);
  };

  const handleToday = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    onChange(dayStr);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block font-bengali text-xs ${isOpen ? 'z-50' : 'z-10'} ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <div
        onClick={toggleOpen}
        className={`flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer transition-all shadow-2xs select-none ${
          disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''
        } ${value ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'}`}
      >
        <CalendarIcon className={`w-3.5 h-3.5 shrink-0 ${value ? 'text-blue-600' : 'text-slate-400'}`} />
        <span className="truncate">{value ? formatBengaliDate(value) : placeholder}</span>
        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="text-slate-400 hover:text-rose-600 p-0.5 rounded-full ml-auto cursor-pointer"
            title="তারিখ মুছুন"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Calendar Popover */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 z-[100] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-[290px] animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-black text-sm text-slate-800">
              {BENGALI_MONTHS[month]} {toBengaliDigits(year)}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 text-center font-bold text-[11px] text-slate-400 mb-1.5">
            {BENGALI_WEEKDAYS.map(w => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDayIndex }).map((_, idx) => {
              const d = daysInPrevMonth - firstDayIndex + idx + 1;
              return (
                <div key={`prev-${idx}`} className="py-1.5 text-slate-300 font-medium select-none">
                  {toBengaliDigits(d)}
                </div>
              );
            })}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const pad = (n: number) => String(n).padStart(2, '0');
              const dayStr = `${year}-${pad(month + 1)}-${pad(day)}`;
              const isSelected = value === dayStr;

              return (
                <div
                  key={dayStr}
                  onClick={() => handleSelectDay(dayStr)}
                  className={`py-1.5 font-bold rounded-lg cursor-pointer transition-all select-none ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {toBengaliDigits(day)}
                </div>
              );
            })}
          </div>

          {/* Footer Today Button */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleToday}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              আজকের তারিখ
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
