'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { toBengaliDigits, toEnglishDigits } from '@/lib/bengaliUtils';

interface CartItemQtyInputProps {
  value: number;
  unit?: string;
  onChange: (val: number) => void;
  className?: string;
  min?: number;
}

export function CartItemQtyInput({
  value,
  unit,
  onChange,
  className,
  min = 0.01,
}: CartItemQtyInputProps) {
  const [prevValue, setPrevValue] = useState<number>(value);
  const [localVal, setLocalVal] = useState<string>(() => (value ? toBengaliDigits(value) : '১'));

  if (value !== prevValue) {
    setPrevValue(value);
    const currentNum = parseFloat(toEnglishDigits(localVal).replace(/[^0-9.]/g, '')) || 0;
    if (value !== currentNum) {
      setLocalVal(toBengaliDigits(value));
    }
  }

  const handleStep = (step: number) => {
    const current = parseFloat(toEnglishDigits(localVal).replace(/[^0-9.]/g, '')) || value || 1;
    const nextVal = Math.max(min, Math.round((current + step) * 100) / 100);
    onChange(nextVal);
    setLocalVal(toBengaliDigits(nextVal));
  };

  return (
    <div className={`inline-flex items-center justify-center gap-1 ${className || ''}`}>
      <button
        type="button"
        onClick={() => handleStep(-1)}
        className="w-6 h-6 rounded-sm bg-slate-100 font-bold hover:bg-slate-200 cursor-pointer flex items-center justify-center text-slate-700 select-none transition-colors"
        title="১ কমান"
      >
        -
      </button>
      <Input
        type="text"
        inputMode="decimal"
        value={localVal}
        onChange={(e) => {
          const raw = toEnglishDigits(e.target.value).replace(/[।\,]/g, '.').replace(/[^0-9.]/g, '');
          const parts = raw.split('.');
          const cleanEn = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : raw;

          if (cleanEn === '') {
            setLocalVal('');
          } else {
            setLocalVal(toBengaliDigits(cleanEn));
            const parsed = parseFloat(cleanEn);
            if (!isNaN(parsed) && parsed > 0) {
              onChange(parsed);
            }
          }
        }}
        onBlur={() => {
          const raw = toEnglishDigits(localVal).replace(/[^0-9.]/g, '');
          const parsed = parseFloat(raw);
          if (isNaN(parsed) || parsed <= 0) {
            setLocalVal(toBengaliDigits(value || 1));
            onChange(value || 1);
          } else {
            const clean = Math.round(parsed * 100) / 100;
            setLocalVal(toBengaliDigits(clean));
            onChange(clean);
          }
        }}
        className="w-16 h-7 text-center font-bold text-xs font-bengali p-1 border-slate-300 bg-white"
      />
      {unit && <span className="font-bold text-slate-600 text-[11px] select-none">{unit}</span>}
      <button
        type="button"
        onClick={() => handleStep(1)}
        className="w-6 h-6 rounded-sm bg-slate-100 font-bold hover:bg-slate-200 cursor-pointer flex items-center justify-center text-slate-700 select-none transition-colors"
        title="১ বাড়ান"
      >
        +
      </button>
    </div>
  );
}
