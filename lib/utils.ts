import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toBnNum(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '০';
  if (typeof val === 'number') {
    return val.toLocaleString('bn-BD');
  }
  return String(val).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);
}

export function formatBnCurrency(amount: number | string): string {
  const num = Number(amount) || 0;
  if (num < 0) {
    return `-৳ ${Math.abs(num).toLocaleString('bn-BD')}`;
  }
  return `৳ ${num.toLocaleString('bn-BD')}`;
}

export function formatDualStock(stock: number, unit: string, category?: string) {
  const isWeightBased = category === 'রড' || unit === 'কেজি' || unit === 'টন';

  if (!isWeightBased) {
    return { main: `${toBnNum(stock)} ${unit}`, sub: null };
  }

  let totalKg = 0;
  let totalTons = 0;

  if (unit === 'টন') {
    totalTons = Number(stock) || 0;
    totalKg = totalTons * 1000;
  } else {
    totalKg = Number(stock) || 0;
    totalTons = totalKg / 1000;
  }

  const tonsFormatted = Number.isInteger(totalTons) ? totalTons.toString() : totalTons.toFixed(3).replace(/\.?0+$/, '');

  return {
    main: `${toBnNum(tonsFormatted)} টন`,
    sub: `(${toBnNum(totalKg)} কেজি)`,
    totalKg,
    totalTons
  };
}

export function fixMiliName(name?: string): string {
  if (!name) return '';
  return name.replace(/মিমি/g, 'মিলি').replace(/mimi/gi, 'mili');
}
