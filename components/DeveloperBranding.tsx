'use client';

import React, { useState, useEffect } from 'react';
import { DEVELOPER_LOGO_BASE64 } from '@/lib/developerLogo';
import { getSoftwarePromoInfo, SoftwarePromoInfo } from '@/lib/printUtils';
import { toBengaliDigits } from '@/lib/bengaliUtils';
import { ShieldCheck, Phone, Globe, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeveloperBrandingProps {
  variant?: 'card' | 'print' | 'banner' | 'inline';
  className?: string;
  showContactButtons?: boolean;
}

export const DeveloperBranding: React.FC<DeveloperBrandingProps> = ({
  variant = 'card',
  className = '',
  showContactButtons = true,
}) => {
  const [promo] = useState<Required<SoftwarePromoInfo>>(() => getSoftwarePromoInfo());

  const phoneBn = toBengaliDigits(promo.softwarePhone || '01349345353');
  const rawPhone = promo.softwarePhone || '01349345353';
  const cleanPhoneNum = rawPhone.replace(/[^0-9]/g, '');
  const waPhone = cleanPhoneNum.startsWith('0') ? `88${cleanPhoneNum}` : cleanPhoneNum;

  // 1. PRINT-ONLY FOOTER (Attached to printable reports/sheets)
  // 1. PRINT-ONLY FOOTER (Attached to printable reports/sheets)
  if (variant === 'print') {
    return (
      <div 
        data-has-dev-footer="true" 
        className={cn(
          "w-full mt-auto pt-2 pb-0.5 border-t border-slate-200/90 flex items-center justify-between text-[9px] font-sans text-slate-400 select-none print:flex",
          className
        )}
        style={{ pageBreakInside: 'avoid' }}
      >
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={DEVELOPER_LOGO_BASE64} 
            alt="" 
            className="w-3.5 h-3.5 object-contain opacity-60 grayscale rounded-xs shrink-0" 
            style={{ width: '14px', height: '14px' }}
          />
          <span className="text-[7.5px] font-mono font-semibold uppercase tracking-wider px-1 py-0.2 rounded border border-slate-200 bg-slate-50 text-slate-500">
            SYS
          </span>
          <span className="text-slate-500 font-normal">
            সফটওয়্যার পরিচালনায়: <strong className="font-semibold text-slate-600">{promo.softwareCompany}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 font-mono text-[8.5px]">
          {promo.softwareWebsite && (
            <>
              <span className="text-slate-400 font-normal">{promo.softwareWebsite}</span>
              <span className="text-slate-300">•</span>
            </>
          )}
          <span className="text-slate-500 font-normal">
            হটলাইন: <strong className="font-semibold text-slate-600">{phoneBn}</strong>
          </span>
        </div>
      </div>
    );
  }

  // 2. INLINE / BANNER COMPACT VARIANT
  if (variant === 'banner' || variant === 'inline') {
    return (
      <div 
        className={cn(
          "w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-bengali print:hidden",
          className
        )}
      >
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={DEVELOPER_LOGO_BASE64} 
            alt="Developer Logo" 
            className="w-7 h-7 object-contain rounded-lg shadow-2xs bg-white p-0.5 border border-slate-200" 
          />
          <div>
            <p className="font-black text-slate-900 leading-tight flex items-center gap-1.5">
              <span>{promo.softwareCompany}</span>
              <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-md">
                সফটওয়্যার প্রোভাইডার
              </span>
            </p>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              হটলাইন: <strong className="text-slate-800 font-bold">{phoneBn}</strong>
              {promo.softwareWebsite && ` • ${promo.softwareWebsite}`}
            </p>
          </div>
        </div>

        {showContactButtons && (
          <div className="flex items-center gap-2">
            <a 
              href={`tel:${cleanPhoneNum}`} 
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all"
            >
              <Phone className="w-3 h-3" /> কল করুন
            </a>
            <a 
              href={`https://wa.me/${waPhone}`} 
              target="_blank" 
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-black text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all"
            >
              <MessageSquare className="w-3 h-3" /> হোয়াটসঅ্যাপ
            </a>
          </div>
        )}
      </div>
    );
  }

  // 3. FULL FEATURED BRANDING CARD FOR WEB PAGES (Baki Talika, Stock Sheet, Reports)
  return (
    <div 
      className={cn(
        "w-full bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800 font-bengali overflow-hidden relative print:hidden animate-in fade-in duration-300",
        className
      )}
    >
      {/* Subtle Background Glow Accent */}
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* LEFT: LOGO & BRANDING INFO */}
        <div className="flex items-center gap-3.5 sm:gap-4 text-center sm:text-left">
          <div className="relative shrink-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/95 p-1 shadow-md border border-white/20 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={DEVELOPER_LOGO_BASE64} 
                alt={promo.softwareCompany} 
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border border-slate-900"></span>
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                <span>{promo.softwareCompany}</span>
              </h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                ভেরিফাইড সফটওয়্যার টিম
              </span>
            </div>

            <p className="text-xs text-slate-300 font-medium">
              দোকান ম্যানেজমেন্ট, হিসাব খাতা ও স্টক ইনভেন্টরি সফটওয়্যারের সার্বিক নিয়ন্ত্রণ ও কারিগরি সহায়তায়।
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-slate-300 font-mono">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <Phone className="w-3.5 h-3.5" />
                <span>{phoneBn}</span>
                <span className="text-slate-400 font-sans text-[11px]">({rawPhone})</span>
              </span>

              {promo.softwareWebsite && (
                <span className="flex items-center gap-1 text-sky-300 font-medium hover:underline">
                  <Globe className="w-3.5 h-3.5" />
                  <a href={`https://${promo.softwareWebsite.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer">
                    {promo.softwareWebsite}
                  </a>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: CONTACT & SUPPORT BUTTONS */}
        {showContactButtons && (
          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-center">
            <a
              href={`tel:${cleanPhoneNum}`}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>কল করুন</span>
            </a>

            <a
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 shadow-xs transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>হোয়াটসঅ্যাপ</span>
            </a>
          </div>
        )}

      </div>
    </div>
  );
};
