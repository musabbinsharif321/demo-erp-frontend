'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Printer, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toBengaliDigits, numberToBengaliWords } from '@/lib/bengaliUtils';
import { printElement } from '@/lib/printUtils';

export interface ReturnItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  unit: string;
  condition?: string;
  invoiceNo?: string;
}

export interface ReturnInvoiceMemoProps {
  returnEntry: {
    id: string;
    customerName: string;
    customerPhone?: string;
    customerAddress?: string;
    totalReturnValue: number;
    totalNewTakenValue?: number;
    netRefundValue?: number;
    dueAdjusted?: number;
    cashRefundPaid?: number;
    returnedItems: ReturnItem[];
    newTakenItems?: ReturnItem[];
    reason?: string;
    createdAt: any;
    operatorName?: string;
  };
  shopInfo?: {
    name?: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    terms?: string;
    proprietor?: string;
  };
  showPrintButton?: boolean;
}

export const ReturnInvoiceMemo: React.FC<ReturnInvoiceMemoProps> = ({
  returnEntry,
  shopInfo: propShopInfo,
  showPrintButton = true
}) => {
  const handleTriggerPrint = () => {
    printElement('printable-memo-wrapper');
  };

  const [shop] = useState(() => {
    const defaultShop = {
      name: 'মেসার্স দেলোয়ার এন্ড ব্রাদার্স',
      proprietor: 'প্রোঃ- মোঃ মিকাইল শেখ',
      tagline: 'রড, সিমেন্ট ও বিল্ডিং সামগ্রী পাইকারী ও খুচরা সরবরাহ কেন্দ্র',
      address: '৩১০, চৌধুরী নিউ সুপার মার্কেট, বঙ্গবন্ধু সড়ক, গোপালগঞ্জ',
      phone: '০১৭১২-০১৪২২৫, ০১৭০১-২৯৫৩৩০',
      email: 'delowarteraders@gmail.com',
      software: 'Hasanah Tech Solution',
      softwareCompany: 'Hasanah Tech Solution',
      softwarePhone: '01349345353',
      softwareWebsite: 'www.hasanahtech.vercel.app'
    };

    let customPromo: any = {};
    if (typeof window !== 'undefined') {
      try {
        const promoSaved = localStorage.getItem('softwarePromoInfo');
        if (promoSaved) customPromo = JSON.parse(promoSaved);
      } catch (e) {}
    }

    if (propShopInfo) {
      return { ...defaultShop, ...propShopInfo, ...customPromo };
    }

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('shopInfo');
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            name: parsed.name || defaultShop.name,
            proprietor: parsed.proprietor || defaultShop.proprietor,
            tagline: parsed.type ? `${parsed.type} - পাইকারী ও খুচরা সরবরাহ কেন্দ্র` : defaultShop.tagline,
            address: parsed.address || defaultShop.address,
            phone: parsed.phone ? `মোবাইলঃ ${parsed.phone}` : defaultShop.phone,
            email: parsed.email || defaultShop.email,
            software: parsed.software || customPromo.softwareCompany || defaultShop.software,
            softwareCompany: customPromo.softwareCompany || parsed.softwareCompany || defaultShop.software,
            softwarePhone: customPromo.softwarePhone || parsed.softwarePhone || defaultShop.softwarePhone,
            softwareWebsite: customPromo.softwareWebsite || parsed.softwareWebsite || defaultShop.softwareWebsite
          };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return { ...defaultShop, ...customPromo };
  });

  // Format Date & Time
  const rawDate = returnEntry?.createdAt;
  const d = rawDate?.toDate ? rawDate.toDate() : (rawDate ? new Date(rawDate) : new Date());
  let dateStr = '০৮/০৮/২০২৬';
  let timeStr = '১২:০০ PM';
  try {
    dateStr = toBengaliDigits(format(d, 'dd/MM/yyyy'));
    timeStr = toBengaliDigits(format(d, 'hh:mm a'));
  } catch {
    dateStr = toBengaliDigits(format(new Date(), 'dd/MM/yyyy'));
    timeStr = toBengaliDigits(format(new Date(), 'hh:mm a'));
  }

  const memoNo = returnEntry.id 
    ? (returnEntry.id.startsWith('RET') ? returnEntry.id : `RET-${returnEntry.id.slice(-6).toUpperCase()}`)
    : 'RET-2026-0001';

  const returnedItems = returnEntry.returnedItems || [];
  let newTakenItems = returnEntry.newTakenItems || [];
  let totalNewTakenValue = Number(returnEntry.totalNewTakenValue || 0);

  const rawNote = (returnEntry as any).notes || returnEntry.reason || '';
  if (rawNote && typeof rawNote === 'string' && rawNote.trim().startsWith('{')) {
    try {
      const idx = rawNote.indexOf('\n');
      const jsonStr = idx !== -1 ? rawNote.substring(0, idx) : rawNote;
      const meta = JSON.parse(jsonStr);
      if ((!newTakenItems || newTakenItems.length === 0) && meta.newTakenItems && Array.isArray(meta.newTakenItems)) {
        newTakenItems = meta.newTakenItems;
      }
      if (!totalNewTakenValue && meta.totalNewTakenValue !== undefined) {
        totalNewTakenValue = Number(meta.totalNewTakenValue);
      }
    } catch {}
  }

  const totalReturnedValue = returnEntry.totalReturnValue || returnedItems.reduce((s, i) => s + (i.price * i.quantity), 0);
  if (totalNewTakenValue === 0 && newTakenItems.length > 0) {
    totalNewTakenValue = newTakenItems.reduce((s, i) => s + (Number(i.price || 0) * Number(i.quantity || 0)), 0);
  }
  const netRefundValue = returnEntry.netRefundValue !== undefined ? returnEntry.netRefundValue : (totalReturnedValue - totalNewTakenValue);

  const dueAdjusted = returnEntry.dueAdjusted || 0;
  const cashRefundPaid = returnEntry.cashRefundPaid || 0;
  const paymentMethod = (returnEntry as any).paymentMethod || (returnEntry as any).payment_method || 'cash';
  const payMethodLabel = paymentMethod === 'bank' ? 'ব্যাংক' : paymentMethod === 'mobile_banking' ? 'মোবাইল ব্যাংকিং' : 'নগদ ক্যাশ';

  return (
    <div className="w-full font-bengali">
      {/* Top Action Bar for Web Preview */}
      {showPrintButton && (
        <div className="flex items-center justify-between bg-[#1f1910] text-white p-3.5 px-6 rounded-t-2xl print:hidden shadow-md">
          <div className="flex items-center gap-2 text-xs font-bold">
            <FileText className="w-4 h-4 text-[#d4af37]" />
            <span>বিক্রয় ফেরত মেমো প্রিভিউ (A4 Print Copy)</span>
          </div>
          <button
            type="button"
            onClick={handleTriggerPrint}
            className="bg-gradient-to-r from-[#b88e2d] to-[#d4af37] hover:from-[#a37c22] hover:to-[#be9b2d] text-white text-xs font-black px-5 py-2 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer border border-[#c59b27]"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>মেমো প্রিন্ট করুন</span>
          </button>
        </div>
      )}

      {/* --- MINIMALIST CLEAN INVOICE SHEET --- */}
      <div 
        id="printable-memo-wrapper" 
        className={cn(
          "w-full max-w-[820px] mx-auto bg-white text-black p-8 space-y-6 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:rounded-none min-h-[275mm] flex flex-col justify-between",
          !showPrintButton && "rounded-2xl"
        )}
      >
        {/* --- 1. HEADER --- */}
        <div className="flex justify-between items-start pb-4 border-b border-black">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/logo.png" 
              alt="মেসার্স দেলোয়ার এন্ড ব্রাদার্স" 
              className="w-12 h-12 object-contain rounded-md border border-slate-200 bg-white p-0.5 shadow-2xs shrink-0" 
            />
            <div className="space-y-0.5">
              <h1 className="text-2xl font-black text-black tracking-tight leading-tight">
                {shop.name}
              </h1>
              <p className="text-xs font-bold text-slate-700">
                {shop.tagline}
              </p>
              <p className="text-xs font-bold text-slate-800 pt-0.5">
                📍 {shop.address} • 📞 {shop.phone}
              </p>
            </div>
          </div>

          <div className="text-right text-xs font-bold space-y-1 shrink-0">
            <h2 className="text-xl font-black text-rose-700 uppercase tracking-wider">বিক্রয় ফেরত ক্যাশ মেমো</h2>
            <p className="pt-1">মেমো নং: <span className="font-mono font-black text-sm text-black">{memoNo}</span></p>
            <p>তারিখ: <span>{dateStr}</span></p>
            <p>সময়: <span className="font-mono">{timeStr}</span></p>
          </div>
        </div>

        {/* --- 2. CUSTOMER INFO --- */}
        <div className="grid grid-cols-12 gap-4 text-xs font-bold text-black border-b border-slate-300 pb-4">
          <div className="col-span-8 space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span className="w-24 shrink-0 font-black text-slate-600">কাস্টমারের নাম:</span>
              <span className="font-black text-sm">{returnEntry.customerName || 'সাধারণ গ্রাহক'}</span>
            </div>
            {returnEntry.customerPhone && (
              <div className="flex items-baseline gap-2">
                <span className="w-24 shrink-0 font-black text-slate-600">মোবাইল:</span>
                <span className="font-mono">{toBengaliDigits(returnEntry.customerPhone)}</span>
              </div>
            )}
            {returnEntry.customerAddress && (
              <div className="flex items-baseline gap-2">
                <span className="w-24 shrink-0 font-black text-slate-600">ঠিকানা:</span>
                <span>{returnEntry.customerAddress}</span>
              </div>
            )}
          </div>
          <div className="col-span-4 text-right space-y-1">
            <span className="text-xs font-black bg-rose-50 text-rose-700 px-3 py-1 rounded border border-rose-200 inline-block">
              [বিক্রয় রিটার্ন এডজাস্টমেন্ট]
            </span>
            {returnEntry.reason && (
              <p className="text-[11px] font-bold text-slate-600 pt-1">
                ফেরতের কারণ: {returnEntry.reason}
              </p>
            )}
          </div>
        </div>

        {/* --- 3. RETURNED ITEMS TABLE --- */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-rose-700">১. ফেরতকৃত পণ্য (Returned Items)</h3>
          <table className="w-full text-xs sm:text-sm text-black border-collapse">
            <thead>
              <tr className="border-y-2 border-black font-black text-left bg-slate-50">
                <th className="py-2 px-1 text-center w-[8%]">#</th>
                <th className="py-2 px-2 text-left w-[48%]">পণ্যের বিবরণ</th>
                <th className="py-2 px-2 text-center w-[14%]">পরিমাণ</th>
                <th className="py-2 px-2 text-right w-[15%]">একক দর (৳)</th>
                <th className="py-2 px-2 text-right w-[15%]">মোট ফেরত (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {returnedItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2 px-1 text-center font-bold text-slate-600">
                    {toBengaliDigits(idx + 1)}
                  </td>
                  <td className="py-2 px-2 text-left font-black text-slate-900">
                    {item.name}
                  </td>
                  <td className="py-2 px-2 text-center font-black">
                    {toBengaliDigits(item.quantity)} {item.unit || 'পিস'}
                  </td>
                  <td className="py-2 px-2 text-right font-bold">
                    ৳ {toBengaliDigits(item.price.toLocaleString('en-IN'))}
                  </td>
                  <td className="py-2 px-2 text-right font-black text-rose-600">
                    ৳ {toBengaliDigits((item.quantity * item.price).toLocaleString('en-IN'))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end pt-1 font-black text-xs text-rose-700">
            <span>মোট ফেরতকৃত পণ্য মূল্য: ৳ {toBengaliDigits(totalReturnedValue.toLocaleString('en-IN'))}</span>
          </div>
        </div>

        {/* --- 4. NEW TAKEN ITEMS TABLE (IF EXCHANGE) --- */}
        {newTakenItems.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-700">২. এক্সচেঞ্জে নতুন নেওয়া পণ্য (Exchange Taken Items)</h3>
            <table className="w-full text-xs sm:text-sm text-black border-collapse">
              <thead>
                <tr className="border-y-2 border-black font-black text-left bg-slate-50">
                  <th className="py-2 px-1 text-center w-[8%]">#</th>
                  <th className="py-2 px-2 text-left w-[48%]">পণ্যের বিবরণ</th>
                  <th className="py-2 px-2 text-center w-[14%]">পরিমাণ</th>
                  <th className="py-2 px-2 text-right w-[15%]">একক দর (৳)</th>
                  <th className="py-2 px-2 text-right w-[15%]">মোট টাকা (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {newTakenItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-1 text-center font-bold text-slate-600">
                      {toBengaliDigits(idx + 1)}
                    </td>
                    <td className="py-2 px-2 text-left font-black text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-2 px-2 text-center font-black">
                      {toBengaliDigits(item.quantity)} {item.unit || 'পিস'}
                    </td>
                    <td className="py-2 px-2 text-right font-bold">
                      ৳ {toBengaliDigits(item.price.toLocaleString('en-IN'))}
                    </td>
                    <td className="py-2 px-2 text-right font-black text-emerald-600">
                      ৳ {toBengaliDigits((item.quantity * item.price).toLocaleString('en-IN'))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end pt-1 font-black text-xs text-emerald-700">
              <span>মোট নতুন মালামাল মূল্য: ৳ {toBengaliDigits(totalNewTakenValue.toLocaleString('en-IN'))}</span>
            </div>
          </div>
        )}

        {/* --- 5. FINANCIAL BREAKDOWN & WORDS --- */}
        <div className="grid grid-cols-12 gap-4 items-start pt-2 text-black font-bold text-xs border-t-2 border-black">
          <div className="col-span-7 space-y-2">
            <div>
              <p className="font-black text-[11px] text-slate-600">ফেরত মূল্য (কথায়):</p>
              <p className="font-black text-sm pt-0.5">
                {numberToBengaliWords(totalReturnedValue)} টাকা মাত্র।
              </p>
            </div>
          </div>

          {/* Right Summary Box */}
          <div className="col-span-5 space-y-1.5 text-xs font-bold border-t border-b border-black py-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-700">মোট ফেরত মূল্য:</span>
              <span className="font-black text-rose-600">৳ {toBengaliDigits(totalReturnedValue.toLocaleString('en-IN'))}</span>
            </div>

            {totalNewTakenValue > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-700">নতুন নেওয়া মূল্য:</span>
                <span className="font-black text-emerald-600">৳ {toBengaliDigits(totalNewTakenValue.toLocaleString('en-IN'))}</span>
              </div>
            )}

            <div className="flex justify-between items-center font-black text-sm pt-1 border-t border-slate-300">
              <span>নিট রিফান্ড ব্যালেন্স:</span>
              <span className="font-black">৳ {toBengaliDigits(Math.abs(netRefundValue).toLocaleString('en-IN'))}</span>
            </div>

            {dueAdjusted > 0 && (
              <div className="flex justify-between items-center text-blue-700 font-bold">
                <span>বকেয়া কর্তন/সমন্বয়:</span>
                <span className="font-black">- ৳ {toBengaliDigits(dueAdjusted.toLocaleString('en-IN'))}</span>
              </div>
            )}

            {cashRefundPaid > 0 && (
              <div className="flex justify-between items-center text-rose-700 font-black">
                <span>ক্যাশ ফেরত প্রদান ({payMethodLabel}):</span>
                <span className="font-black">৳ {toBengaliDigits(cashRefundPaid.toLocaleString('en-IN'))}</span>
              </div>
            )}
          </div>
        </div>

        {/* --- 6. SIGNATURES & NOTICE --- */}
        <div className="pt-10 space-y-4 text-black">
          <div className="grid grid-cols-3 gap-4 text-center text-xs font-bold">
            <div>
              <div className="w-36 mx-auto border-t border-black pt-1 font-black">
                কাস্টমার/গ্রহীতার স্বাক্ষর
              </div>
            </div>
            <div>
              <div className="w-36 mx-auto border-t border-black pt-1 font-black">
                প্রস্তুতকারী (অপারেটর)
              </div>
            </div>
            <div>
              <div className="w-40 mx-auto border-t border-black pt-1 font-black">
                পক্ষে- {shop.name}
              </div>
            </div>
          </div>

          {/* System Generated Invoice Notice */}
          <div className="pt-3 border-t border-slate-300 text-center text-[10px] font-bold text-slate-600">
            বিঃ দ্রঃ— এটি একটি কম্পিউটারাইজড অটো-জেনারেটেড অফিশিয়াল বিক্রয় ফেরত মেমো চালান।
          </div>

          {/* Software Company Branding & Promotion Footer */}
          <div data-has-dev-footer="true" className="pt-2 border-t border-slate-200/90 flex items-center justify-between text-[9.5px] text-slate-400 mt-auto select-none">
            <div className="flex items-center gap-1.5">
              <span className="text-[7.5px] font-mono font-semibold uppercase tracking-wider px-1 py-0.2 rounded border border-slate-200 bg-slate-50 text-slate-500">SYS</span>
              <span className="text-slate-500">Software Developed By: <strong className="font-semibold text-slate-600">{shop.softwareCompany || shop.software || 'Hasanah Tech Solution'}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 font-mono text-[8.5px]">
              {shop.softwareWebsite && (
                <>
                  <span className="text-slate-400 font-normal">{shop.softwareWebsite}</span>
                  <span className="text-slate-300">•</span>
                </>
              )}
              {shop.softwarePhone && (
                <span className="text-slate-500 font-normal">হেল্পলাইন: <strong className="font-semibold text-slate-600">{toBengaliDigits(shop.softwarePhone)}</strong></span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
