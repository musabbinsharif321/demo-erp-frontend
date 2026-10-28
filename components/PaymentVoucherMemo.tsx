'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Printer, User, CreditCard, FileText, 
  CheckCircle2, ArrowDownRight, ArrowUpRight, Wallet, Landmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toBengaliDigits, numberToBengaliWords } from '@/lib/bengaliUtils';
import { printElement } from '@/lib/printUtils';

export interface PaymentVoucherMemoProps {
  voucher: {
    id: string;
    voucherNo?: string;
    paymentId?: string;
    type?: 'income' | 'expense' | 'contra' | 'payment_in' | 'payment_out';
    category?: string;
    amount: number;
    discountAmount?: number;
    partyName?: string;
    customerName?: string;
    partyPhone?: string;
    partyAddress?: string;
    businessName?: string;
    invoiceNo?: string;
    referenceNo?: string;
    description?: string;
    paymentMethod?: string;
    bankName?: string;
    accountNo?: string;
    chequeNo?: string;
    chequeDate?: string;
    transactionRef?: string;
    previousBalance?: number;
    siteName?: string;
    operatorName?: string;
    status?: string;
    createdAt?: any;
  };
  shopInfo?: {
    name?: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    proprietor?: string;
  };
  showPrintButton?: boolean;
}

export const PaymentVoucherMemo: React.FC<PaymentVoucherMemoProps> = ({
  voucher,
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
      website: 'www.delowartraders.com',
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
            tagline: parsed.tagline || defaultShop.tagline,
            address: parsed.address || defaultShop.address,
            phone: parsed.phone || defaultShop.phone,
            email: parsed.email || defaultShop.email,
            website: parsed.website || defaultShop.website,
            software: parsed.software || defaultShop.software,
            softwareCompany: customPromo.softwareCompany || parsed.softwareCompany || defaultShop.softwareCompany,
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

  // Metadata extraction for Add Money or normal transactions
  let meta: any = {};
  let userNote = voucher.description || (voucher as any).notes || '';
  const rawNoteStr = String((voucher as any).notes || voucher.description || '');
  if (userNote && typeof userNote === 'string' && userNote.trim().startsWith('{')) {
    try {
      const idx = userNote.indexOf('\n');
      if (idx !== -1) {
        meta = JSON.parse(userNote.substring(0, idx));
        userNote = meta.userNote !== undefined ? meta.userNote : userNote.substring(idx + 1).trim();
      } else {
        meta = JSON.parse(userNote);
        userNote = meta.userNote !== undefined ? meta.userNote : '';
      }
    } catch {}
  }

  const rawType = (voucher.type || '').toLowerCase();
  const isAddMoney = meta.isAddMoney === true || 
                     voucher.category === 'টাকা যোগ' || 
                     rawType === 'contra' ||
                     rawNoteStr.includes('[টাকা যোগ');

  const addMoneyCategory = meta.addMoneyCategory || 
                           (rawNoteStr.match(/\[টাকা যোগ - ([^\]]+)\]/)?.[1]) || 
                           (voucher.partyName && voucher.partyName !== 'কাস্টমার' && voucher.partyName !== 'সরবরাহকারী' && voucher.partyName !== 'দোকান ক্যাশ / মূলধন' ? voucher.partyName : '') || 
                           'ক্যাশে জমা';

  const isLoanIn = meta.isLoanIn === true || 
                   voucher.category === 'লোন গ্রহণ' || 
                   (voucher as any).raw?.transaction_type === 'loan_in' ||
                   rawNoteStr.includes('[লোন গ্রহণ');

  const isIncome = (rawType === 'income' || rawType === 'payment_in' || isLoanIn) && !isAddMoney;
  const isExpense = (rawType === 'expense' || rawType === 'payment_out') && !isAddMoney && !isLoanIn;
  
  const voucherTitle = isLoanIn ? 'লোন গ্রহণ রশিদ / ভাউচার' : isAddMoney ? 'টাকা যোগের রশিদ' : isIncome ? 'টাকা জমার রশিদ' : isExpense ? 'পেমেন্ট প্রদান ভাউচার' : 'লেনদেন ভাউচার';
  const voucherSubtitle = isLoanIn ? '(সরবরাহকারী ঋণ গ্রহণ রশিদ)' : isAddMoney ? '(টাকা যোগ রশিদ)' : isIncome ? '(টাকা জমার রশিদ)' : isExpense ? '(পেমেন্ট প্রদান ভাউচার)' : '(লেনদেন ভাউচার)';
  
  const amount = Number(voucher.amount || 0);
  const discountAmount = Number(voucher.discountAmount || 0);
  const previousBalance = Number(voucher.previousBalance || 0);
  const remainingBalance = isLoanIn 
    ? (previousBalance + amount) 
    : isIncome 
      ? (previousBalance - amount - discountAmount) 
      : (previousBalance - amount);

  const voucherNo = voucher.voucherNo || voucher.paymentId || (voucher.id ? (voucher.id.startsWith('TRX') || voucher.id.startsWith('RCV') || voucher.id.startsWith('PAY') || voucher.id.startsWith('LOAN') ? voucher.id : `${isLoanIn ? 'LOAN' : isAddMoney ? 'ADD' : isIncome ? 'RCV' : 'PAY'}-${voucher.id.slice(-6).toUpperCase()}`) : 'RCV-000101');

  const pm = (voucher.paymentMethod || meta.paymentMethodName || 'Cash').toLowerCase();
  const isBank = pm.includes('bank') || pm.includes('ব্যাংক');
  const isCheque = pm.includes('check') || pm.includes('cheque') || pm.includes('চেক');
  const paymentMethodLabel = isBank ? '🏦 ব্যাংক ডিপোজিট' : isCheque ? '📄 চেক' : '💵 নগদ';

  const partyLabel = isLoanIn ? 'ঋণ প্রদানকারী (সরবরাহকারী)' : isIncome ? 'জমা প্রদানকারীর নাম (গ্রাহক)' : isExpense ? 'প্রাপকের নাম (সরবরাহকারী)' : 'পার্টির নাম';
  const operatorName = voucher.operatorName || 'ক্যাশিয়ার';

  // Clean JSON metadata from description or notes
  const cleanNoteText = (str?: string) => {
    if (!str) return '';
    const trimmed = str.trim();
    if (trimmed.startsWith('{')) {
      try {
        const idx = trimmed.indexOf('\n');
        if (idx !== -1) {
          const jsonStr = trimmed.substring(0, idx);
          const parsed = JSON.parse(jsonStr);
          return parsed.userNote !== undefined ? parsed.userNote : trimmed.substring(idx + 1).trim();
        } else {
          const parsed = JSON.parse(trimmed);
          return parsed.userNote || '';
        }
      } catch {
        return '';
      }
    }
    return trimmed;
  };

  const userCustomNote = cleanNoteText(voucher.description || (voucher as any).notes);
  const tableDescription = isAddMoney ? `টাকা যোগ — ${addMoneyCategory}` : (userCustomNote || (isIncome ? 'বিক্রয় বাবদ প্রাপ্তি' : 'সরবরাহকারী বিল পরিশোধ'));
  const footerNote = userCustomNote || (isAddMoney ? (rawNoteStr.includes('[টাকা যোগ') ? rawNoteStr.replace(/\[টাকা যোগ - [^\]]+\]\s*/, '') : '') : '');

  // Format Date & Time
  const rawDate = voucher?.createdAt;
  const d = rawDate?.toDate ? rawDate.toDate() : (rawDate ? new Date(rawDate) : new Date());
  let dateStr = '';
  try {
    dateStr = toBengaliDigits(format(d, 'dd/MM/yyyy'));
  } catch {
    dateStr = toBengaliDigits(format(new Date(), 'dd/MM/yyyy'));
  }

  return (
    <div className="w-full font-bengali">
      {/* Top action preview bar */}
      {showPrintButton && (
        <div className="flex items-center justify-between bg-slate-900 text-white p-3.5 px-6 rounded-t-2xl print:hidden shadow-md">
          <div className="flex items-center gap-2 text-xs font-bold">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>{voucherTitle} প্রিভিউ (A4 প্রিন্ট কপি)</span>
          </div>
          <button
            type="button"
            onClick={handleTriggerPrint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-2 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer border border-emerald-500"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>রশিদ প্রিন্ট করুন</span>
          </button>
        </div>
      )}

      {/* --- EXACT REPLICA PAYMENT VOUCHER / MONEY RECEIPT SHEET --- */}
      <div 
        id="printable-memo-wrapper" 
        className="w-full max-w-[210mm] mx-auto bg-white p-6 md:p-8 space-y-4 text-slate-800 border border-slate-300 shadow-xl print:shadow-none print:border-none print:m-0 print:p-4 text-xs min-h-[275mm] flex flex-col justify-between"
      >
        {/* --- 1. HEADER (LOGO, SHOP DETAILS & VOUCHER META BOX) --- */}
        <div className="grid grid-cols-12 gap-2 items-center border-b pb-3 border-slate-300">
          
          {/* Shop Logo & Address */}
          <div className="col-span-5 flex items-start gap-3">
            <div className="shrink-0 pt-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/logo.png" 
                alt="মেসার্স দেলোয়ার এন্ড ব্রাদার্স" 
                className="w-12 h-12 object-contain rounded-md border border-slate-200 bg-white p-0.5 shadow-2xs" 
              />
            </div>

            <div className="space-y-0.5 text-xs text-slate-700 font-medium">
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                {shop.name}
              </h1>
              <p className={cn("text-[11px] font-bold", isAddMoney ? "text-blue-700" : isIncome ? "text-emerald-700" : "text-rose-700")}>
                {shop.tagline}
              </p>
              <p className="pt-0.5 text-[11px] leading-tight">
                📍 {shop.address}
              </p>
              <p className="text-[11px]">
                📞 {toBengaliDigits(shop.phone)}
              </p>
            </div>
          </div>

          {/* Center Document Title */}
          <div className="col-span-3 text-center">
            <h2 className="text-2xl font-black text-slate-900 tracking-wide font-bengali">
              {voucherTitle}
            </h2>
            <p className={cn("text-[11px] font-black tracking-wider font-bengali mt-0.5", isAddMoney ? "text-blue-700" : isIncome ? "text-emerald-700" : "text-rose-700")}>
              {voucherSubtitle}
            </p>
          </div>

          {/* Right Header Box */}
          <div className="col-span-4 text-right">
            <div className="border border-slate-400 rounded-lg p-2.5 bg-white text-xs font-bold text-slate-800 space-y-1 inline-block text-left w-full max-w-[240px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-700">ভাউচার নম্বর</span>
                <span>: <span className="font-mono font-black">{toBengaliDigits(voucherNo)}</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">তারিখ</span>
                <span>: <span className="font-mono">{dateStr}</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">লেনদেনের ধরন</span>
                <span>: <span className={cn("font-bold", isAddMoney ? "text-blue-700" : isIncome ? "text-emerald-700" : "text-rose-700")}>{isAddMoney ? 'টাকা যোগ' : (voucher.category || (isIncome ? 'পেমেন্ট গ্রহণ' : 'পেমেন্ট প্রদান'))}</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">স্ট্যাটাস</span>
                <span>: <span className="font-bold text-emerald-700">সম্পন্ন</span></span>
              </div>
            </div>
          </div>

        </div>

        {/* --- 2. DETAILS & PAYMENT METHOD INFO (SIDE BY SIDE) --- */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          
          {isAddMoney ? (
            /* Add Money Source Box */
            <div className="border border-slate-300 rounded-lg p-2.5 bg-white space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold pb-1 border-b border-slate-200 text-blue-700">
                <Wallet className="w-3.5 h-3.5" />
                <span>টাকা যোগের খাত ও বিবরণ</span>
              </div>
              
              <div className="space-y-1 font-medium text-slate-800">
                <div className="flex">
                  <span className="w-28 shrink-0 font-bold text-slate-900">জমার খাত</span>
                  <span className="shrink-0 px-1">:</span>
                  <span className="font-bold text-blue-800">{addMoneyCategory}</span>
                </div>
                <div className="flex">
                  <span className="w-28 shrink-0 text-slate-700">উৎস</span>
                  <span className="shrink-0 px-1">:</span>
                  <span className="font-bold text-slate-900">অভ্যন্তরীণ ক্যাশ / মূলধন / ব্যাংক ডিপোজিট</span>
                </div>
                <div className="flex">
                  <span className="w-28 shrink-0 text-slate-700">ভাউচার আইডি</span>
                  <span className="shrink-0 px-1">:</span>
                  <span className="font-mono font-bold text-slate-900">{toBengaliDigits(voucherNo)}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Regular Party Details Box */
            <div className="border border-slate-300 rounded-lg p-2.5 bg-white space-y-1.5">
              <div className={cn("flex items-center gap-1.5 text-xs font-bold pb-1 border-b border-slate-200", isIncome ? "text-emerald-700" : "text-rose-700")}>
                <User className="w-3.5 h-3.5" />
                <span>{partyLabel}</span>
              </div>
              
              <div className="space-y-1 font-medium text-slate-800">
                <div className="flex">
                  <span className="w-28 shrink-0 font-bold text-slate-900">নাম</span>
                  <span className="shrink-0 px-1">:</span>
                  <span className="font-bold text-slate-900">
                    {(voucher.partyName && voucher.partyName !== 'কাস্টমার' && voucher.partyName !== 'সরবরাহকারী') 
                      ? voucher.partyName 
                      : (voucher.customerName || (voucher.invoiceNo && voucher.invoiceNo !== '—' ? `ইনভয়েস ${voucher.invoiceNo} কাস্টমার` : 'সাধারণ পার্টি'))}
                  </span>
                </div>
                {voucher.businessName && (
                  <div className="flex">
                    <span className="w-28 shrink-0 text-slate-700">কোম্পানি</span>
                    <span className="shrink-0 px-1">:</span>
                    <span className="font-bold text-blue-700">{voucher.businessName}</span>
                  </div>
                )}
                <div className="flex">
                  <span className="w-28 shrink-0 text-slate-700">মোবাইল নম্বর</span>
                  <span className="shrink-0 px-1">:</span>
                  <span className="font-mono">{voucher.partyPhone ? toBengaliDigits(voucher.partyPhone) : '—'}</span>
                </div>
                <div className="flex">
                  <span className="w-28 shrink-0 text-slate-700">ঠিকানা</span>
                  <span className="shrink-0 px-1">:</span>
                  <span className="leading-tight">{voucher.partyAddress || '—'}</span>
                </div>
                {(voucher.siteName || meta.siteName) && (
                  <div className="flex">
                    <span className="w-28 shrink-0 text-slate-700">সাইট</span>
                    <span className="shrink-0 px-1">:</span>
                    <span className="font-bold text-blue-900">📍 {voucher.siteName || meta.siteName}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Method Details Box */}
          <div className="border border-slate-300 rounded-lg p-2.5 bg-white space-y-1.5">
            <div className={cn("flex items-center gap-1.5 text-xs font-bold pb-1 border-b border-slate-200", isAddMoney ? "text-blue-700" : isIncome ? "text-emerald-700" : "text-rose-700")}>
              <CreditCard className="w-3.5 h-3.5" />
              <span>পেমেন্ট ও ব্যাংক তথ্য</span>
            </div>
            
            <div className="space-y-1 font-medium text-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-700">পেমেন্ট মাধ্যম</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {paymentMethodLabel}
                </span>
              </div>
              {voucher.bankName && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">ব্যাংকের নাম</span>
                  <span className="font-bold font-mono text-slate-900">{voucher.bankName}</span>
                </div>
              )}
              {voucher.accountNo && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">অ্যাকাউন্ট নম্বর</span>
                  <span className="font-mono font-bold">{toBengaliDigits(voucher.accountNo)}</span>
                </div>
              )}
              {voucher.chequeNo && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">চেক নম্বর</span>
                  <span className="font-mono font-bold">{toBengaliDigits(voucher.chequeNo)}</span>
                </div>
              )}
              {voucher.transactionRef && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">লেনদেন রেফারেন্স আইডি</span>
                  <span className="font-mono font-bold">{toBengaliDigits(voucher.transactionRef)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-700">রেকর্ডকারী</span>
                <span className="font-bold text-slate-900">{operatorName}</span>
              </div>
            </div>
          </div>

        </div>

        {/* --- 3. PAYMENT BREAKDOWN TABLE --- */}
        <div>
          <table className="w-full text-xs border-collapse border border-slate-400">
            <thead>
              <tr className={cn("font-bold border border-slate-400 text-slate-900 text-center", isAddMoney ? "bg-blue-50" : isIncome ? "bg-emerald-50" : "bg-rose-50")}>
                <th className="border border-slate-400 py-2 px-2 w-[10%]">ক্রমিক</th>
                <th className="border border-slate-400 py-2 px-3 text-left w-[55%]">বিবরণ / লেনদেনের খাত</th>
                <th className="border border-slate-400 py-2 px-3 w-[15%]">পেমেন্ট মাধ্যম</th>
                <th className="border border-slate-400 py-2 px-3 text-right w-[20%]">পরিমাণ (৳)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-slate-900 font-medium">
                <td className="border border-slate-300 py-3 px-2 text-center font-mono font-bold">০১</td>
                <td className="border border-slate-300 py-3 px-3">
                  <p className="font-bold text-slate-900">{tableDescription || '—'}</p>
                </td>
                <td className="border border-slate-300 py-3 px-3 text-center font-bold">{paymentMethodLabel}</td>
                <td className="border border-slate-300 py-3 px-3 text-right font-mono font-black text-sm">
                  ৳ {toBengaliDigits(amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* --- 4. WORDS, BALANCE BREAKDOWN & CALCULATIONS --- */}
        <div className="grid grid-cols-12 gap-3 items-start text-xs pt-1">
          
          <div className="col-span-7 space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-300 space-y-1">
              <p className="font-bold text-xs text-slate-700">মোট পরিমাণের কথা:</p>
              <p className="font-black text-sm text-slate-900">
                {numberToBengaliWords(amount).replace(/ টাকা মাত্র$/, '')} টাকা মাত্র।
              </p>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-0.5">নোট / মন্তব্য:</span>
              <p className="text-slate-600 italic">
                {footerNote || '—'}
              </p>
            </div>
          </div>

          <div className="col-span-5">
            <div className="border border-slate-400 font-bold text-xs divide-y divide-slate-300 bg-white">
              <div className={cn("flex justify-between items-center p-2 px-2.5 text-xs font-black", isAddMoney ? "bg-blue-50 text-blue-950" : isIncome ? "bg-emerald-50 text-emerald-950" : "bg-rose-50 text-rose-950")}>
                <span>{isAddMoney ? 'মোট যোগকৃত অর্থ' : isIncome ? 'আজকের প্রাপ্ত জমা' : 'আজকের প্রদত্ত পরিশোধ'}</span>
                <span className="font-mono text-base">৳ {toBengaliDigits(amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>
              {!isAddMoney && discountAmount > 0 && (
                <div className="flex justify-between items-center p-1.5 px-2.5 text-amber-700">
                  <span>বিশেষ ছাড়</span>
                  <span className="font-mono">৳ {toBengaliDigits(discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                </div>
              )}
              {!isAddMoney && previousBalance > 0 && (
                <>
                  <div className="flex justify-between items-center p-1.5 px-2.5 text-slate-700">
                    <span>পূর্বের মোট বকেয়া</span>
                    <span className="font-mono">৳ {toBengaliDigits(previousBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 px-2.5 text-xs bg-slate-100 font-black text-slate-900">
                    <span>অবশিষ্ট বকেয়া / দেনা</span>
                    <span className="font-mono text-sm">৳ {toBengaliDigits(Math.max(0, remainingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                  </div>
                </>
              )}

            </div>
          </div>

        </div>

        {/* --- 5. SIGNATURES (3 EQUAL COLUMNS) --- */}
        <div className="grid grid-cols-3 gap-4 text-center text-xs font-bold pt-6 pb-1 border-t border-slate-300 mt-4 keep-together">
          
          <div>
            <div className="w-32 mx-auto border-b border-slate-400 mb-1.5" />
            <p className="font-bold text-slate-900 font-bengali">{isAddMoney ? 'জমা প্রদানকারীর স্বাক্ষর' : 'গ্রহীতা / ক্লায়েন্ট স্বাক্ষর'}</p>
            <p className="text-[10px] text-slate-500 font-semibold">{isAddMoney ? '(জমা প্রদানকারী সই)' : '(গ্রাহক / সাপ্লায়ার সই)'}</p>
          </div>

          <div>
            <div className="w-32 mx-auto border-b border-dashed border-slate-400 mb-1.5" />
            <p className="font-bold text-slate-800 font-bengali">{operatorName}</p>
            <p className="text-[10px] text-slate-500 font-semibold">(ক্যাশিয়ার / প্রস্তুতকারী)</p>
          </div>

          <div>
            <div className="w-32 mx-auto border-b border-slate-400 mb-1.5" />
            <p className="font-bold text-slate-900 font-bengali">ব্যবস্থাপকের স্বাক্ষর</p>
            <p className="text-[10px] text-slate-500 font-semibold">(অনুমোদিত স্বাক্ষর)</p>
          </div>

        </div>

        {/* --- 6. FOOTER (SOFTWARE BRANDING & QR/BARCODE) --- */}
        <div data-has-dev-footer="true" className="border-t border-slate-200/90 pt-2.5 flex items-center justify-between text-[10px] text-slate-500 keep-together mt-auto select-none">
          
          {/* Left QR Code */}
          <div className="flex items-center gap-2">
            <svg className="w-9 h-9 shrink-0 border border-slate-200 p-0.5 rounded opacity-75" viewBox="0 0 32 32" fill="currentColor">
              <rect x="2" y="2" width="10" height="10" fill="#000" />
              <rect x="4" y="4" width="6" height="6" fill="#fff" />
              <rect x="5" y="5" width="4" height="4" fill="#000" />
              <rect x="20" y="2" width="10" height="10" fill="#000" />
              <rect x="22" y="4" width="6" height="6" fill="#fff" />
              <rect x="23" y="5" width="4" height="4" fill="#000" />
              <rect x="2" y="20" width="10" height="10" fill="#000" />
              <rect x="4" y="22" width="6" height="6" fill="#fff" />
              <rect x="5" y="23" width="4" height="4" fill="#000" />
            </svg>
            <div>
              <p className="font-bengali font-bold text-slate-600 text-[9.5px]">অফিসিয়াল পেমেন্ট ভাউচার কপি</p>
              <p className="text-[9px] text-slate-400 font-medium">কম্পিউটারাইজড রিসিট সংগৃহীত</p>
            </div>
          </div>

          {/* Center Software Branding */}
          <div className="text-center text-[9px] text-slate-400 space-y-0.5">
            <p className="text-slate-500">সফটওয়্যার পরিচালনায়: <strong className="font-semibold text-slate-600">{shop.softwareCompany || 'Hasanah Tech Solution'}</strong></p>
            <p className="text-slate-400 font-mono text-[8.5px]">
              <span>হটলাইন: <strong className="font-semibold text-slate-600">{toBengaliDigits(shop.softwarePhone || '01349345353')}</strong></span>
              {shop.softwareWebsite && <span> • {shop.softwareWebsite}</span>}
            </p>
          </div>

          {/* Right Barcode */}
          <div className="text-right shrink-0">
            <div className="inline-block bg-slate-900 px-2 py-1 rounded text-white font-mono text-[9px] tracking-widest font-black">
              ||||| | |||| ||| |||||
            </div>
            <p className="text-[9px] font-mono text-slate-600 font-bold mt-0.5">
              {toBengaliDigits(voucherNo)}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
