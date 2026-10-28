'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { toBengaliDigits } from '@/lib/bengaliUtils';

export const BENGALI_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export const BENGALI_WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];

interface BengaliDateRangePickerProps {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  onChange: (start: string, end: string) => void;
  placeholder?: string;
  className?: string;
  align?: 'left' | 'right';
  compact?: boolean;
}

// Helper to format YYYY-MM-DD to DD/MM/YYYY with Bengali digits
export const formatBengaliDate = (isoStr?: string): string => {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length !== 3) return isoStr;
  const [y, m, d] = parts;
  return toBengaliDigits(`${d}/${m}/${y}`);
};

export const BengaliDateRangePicker: React.FC<BengaliDateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  placeholder = 'তারিখ নির্বাচন করুন',
  className = '',
  align = 'left',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewDate, setViewDate] = useState<Date>(() => {
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);
  const [hoverDate, setHoverDate] = useState<string>('');

  // Handle open toggle with state sync
  const toggleOpen = () => {
    if (!isOpen) {
      setTempStart(startDate);
      setTempEnd(endDate);
      if (startDate) {
        const d = new Date(startDate);
        if (!isNaN(d.getTime())) setViewDate(d);
      }
    }
    setIsOpen(!isOpen);
  };

  // Click outside to close
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
  const month = viewDate.getMonth(); // 0-indexed

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  // Generate days in month
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const handleDateClick = (dayStr: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      // First click: set start, clear end
      setTempStart(dayStr);
      setTempEnd('');
    } else if (tempStart && !tempEnd) {
      // Second click: set end
      if (dayStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(dayStr);
      } else {
        setTempEnd(dayStr);
      }
    }
  };

  const handleApply = () => {
    if (tempStart && !tempEnd) {
      onChange(tempStart, tempStart);
    } else {
      onChange(tempStart, tempEnd);
    }
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTempStart('');
    setTempEnd('');
    onChange('', '');
    setIsOpen(false);
  };

  // Quick Preset Handlers
  const applyPreset = (type: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'all') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (type === 'today') {
      const iso = toISO(now);
      setTempStart(iso);
      setTempEnd(iso);
      onChange(iso, iso);
      setIsOpen(false);
    } else if (type === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const iso = toISO(yest);
      setTempStart(iso);
      setTempEnd(iso);
      onChange(iso, iso);
      setIsOpen(false);
    } else if (type === 'last7') {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      const startIso = toISO(past);
      const endIso = toISO(now);
      setTempStart(startIso);
      setTempEnd(endIso);
      onChange(startIso, endIso);
      setIsOpen(false);
    } else if (type === 'thisMonth') {
      const startM = new Date(now.getFullYear(), now.getMonth(), 1);
      const endM = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startIso = toISO(startM);
      const endIso = toISO(endM);
      setTempStart(startIso);
      setTempEnd(endIso);
      onChange(startIso, endIso);
      setIsOpen(false);
    } else if (type === 'lastMonth') {
      const startM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endM = new Date(now.getFullYear(), now.getMonth(), 0);
      const startIso = toISO(startM);
      const endIso = toISO(endM);
      setTempStart(startIso);
      setTempEnd(endIso);
      onChange(startIso, endIso);
      setIsOpen(false);
    } else if (type === 'thisYear') {
      const startY = new Date(now.getFullYear(), 0, 1);
      const endY = new Date(now.getFullYear(), 11, 31);
      const startIso = toISO(startY);
      const endIso = toISO(endY);
      setTempStart(startIso);
      setTempEnd(endIso);
      onChange(startIso, endIso);
      setIsOpen(false);
    } else if (type === 'all') {
      handleClear();
    }
  };

  // Display Text on Trigger
  const getDisplayText = () => {
    if (!startDate && !endDate) return placeholder;
    if (startDate && endDate) {
      if (startDate === endDate) {
        return formatBengaliDate(startDate);
      }
      return `${formatBengaliDate(startDate)} - ${formatBengaliDate(endDate)}`;
    }
    if (startDate) return `${formatBengaliDate(startDate)} থেকে`;
    if (endDate) return `পর্যন্ত ${formatBengaliDate(endDate)}`;
    return placeholder;
  };

  const isSelectedRange = (dayStr: string) => {
    if (!tempStart) return false;
    if (tempStart && tempEnd) {
      return dayStr >= tempStart && dayStr <= tempEnd;
    }
    if (tempStart && !tempEnd && hoverDate) {
      const start = tempStart < hoverDate ? tempStart : hoverDate;
      const end = tempStart < hoverDate ? hoverDate : tempStart;
      return dayStr >= start && dayStr <= end;
    }
    return dayStr === tempStart;
  };

  const isEdgeStart = (dayStr: string) => {
    if (tempStart && tempEnd) return dayStr === tempStart;
    if (tempStart && !tempEnd && hoverDate) {
      return dayStr === (tempStart < hoverDate ? tempStart : hoverDate);
    }
    return dayStr === tempStart;
  };

  const isEdgeEnd = (dayStr: string) => {
    if (tempStart && tempEnd) return dayStr === tempEnd;
    if (tempStart && !tempEnd && hoverDate) {
      return dayStr === (tempStart < hoverDate ? hoverDate : tempStart);
    }
    return dayStr === tempStart;
  };

  return (
    <div className={`relative inline-block font-bengali text-xs ${isOpen ? 'z-50' : 'z-10'} ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <div
        onClick={toggleOpen}
        className={`flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer transition-all shadow-2xs select-none ${
          (startDate || endDate) ? 'text-blue-700 font-black border-blue-200 bg-blue-50/40' : 'text-slate-700 font-bold'
        } ${compact ? 'h-9 text-xs' : 'h-10 text-xs'}`}
      >
        <CalendarIcon className={`w-3.5 h-3.5 shrink-0 ${startDate || endDate ? 'text-blue-600' : 'text-slate-400'}`} />
        <span className="truncate max-w-[200px]">{getDisplayText()}</span>
        {(startDate || endDate) ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-0.5 rounded-full transition-colors ml-auto cursor-pointer"
            title="তারিখ ফিল্টার মুছুন"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 z-[100] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-[340px] sm:w-[500px] flex flex-col sm:flex-row gap-4 animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Quick Presets Column */}
          <div className="sm:w-36 flex sm:flex-col gap-1 border-b sm:border-b-0 sm:border-r border-slate-100 pb-3 sm:pb-0 sm:pr-3 shrink-0 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-400 px-2 hidden sm:block mb-1">দ্রুত নির্বাচন</span>
            {[
              { id: 'today', label: 'আজ' },
              { id: 'yesterday', label: 'গতকাল' },
              { id: 'last7', label: 'বিগত ৭ দিন' },
              { id: 'thisMonth', label: 'এই মাস' },
              { id: 'lastMonth', label: 'গত মাস' },
              { id: 'thisYear', label: 'এই বছর' },
              { id: 'all', label: 'সব সময় (রিসেট)' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id as any)}
                className="text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar Month & Grid */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              {/* Header: Month & Year Navigator */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer transition-colors"
                  title="পূর্ববর্তী মাস"
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
                  title="পরবর্তী মাস"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekdays Row */}
              <div className="grid grid-cols-7 text-center font-bold text-[11px] text-slate-400 mb-1.5">
                {BENGALI_WEEKDAYS.map(w => (
                  <div key={w} className="py-1">{w}</div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
                {/* Previous month leading days */}
                {Array.from({ length: firstDayIndex }).map((_, idx) => {
                  const d = daysInPrevMonth - firstDayIndex + idx + 1;
                  return (
                    <div key={`prev-${idx}`} className="py-1.5 text-slate-300 font-medium select-none">
                      {toBengaliDigits(d)}
                    </div>
                  );
                })}

                {/* Current month days */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const dayStr = `${year}-${pad(month + 1)}-${pad(day)}`;

                  const isSelected = isSelectedRange(dayStr);
                  const isStart = isEdgeStart(dayStr);
                  const isEnd = isEdgeEnd(dayStr);

                  return (
                    <div
                      key={dayStr}
                      onClick={() => handleDateClick(dayStr)}
                      onMouseEnter={() => {
                        if (tempStart && !tempEnd) setHoverDate(dayStr);
                      }}
                      className={`py-1.5 font-bold cursor-pointer transition-all select-none relative ${
                        isSelected ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-100 text-slate-700'
                      } ${isStart ? 'rounded-l-lg bg-blue-600 text-white hover:bg-blue-700' : ''} ${
                        isEnd ? 'rounded-r-lg bg-blue-600 text-white hover:bg-blue-700' : ''
                      } ${isStart && isEnd ? 'rounded-lg' : ''}`}
                    >
                      {toBengaliDigits(day)}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Status & Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500 font-bold truncate">
                {tempStart ? (
                  <span>
                    {formatBengaliDate(tempStart)} {tempEnd ? `থেকে ${formatBengaliDate(tempEnd)}` : '(শেষ তারিখ দিন)'}
                  </span>
                ) : (
                  <span>কোনো তারিখ বাছাই হয়নি</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-xs cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>প্রয়োগ</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
