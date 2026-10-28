'use client';

import React from 'react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { 
  ArrowLeft, Printer, Download, Mail, Edit, 
  Receipt, User, CreditCard, FileText, Trash2, 
  ArrowUpRight, ArrowDownRight, Landmark, Wallet, CheckCircle2, HandCoins
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toBengaliDigits, numberToBengaliWords } from '@/lib/bengaliUtils';
import { printElement } from '@/lib/printUtils';
import { useAuth } from '@/lib/authContext';

export interface PaymentVoucherDetailsViewProps {
  voucher: any;
  onBack?: () => void;
  onEdit?: (voucher: any) => void;
  onDelete?: (voucher: any) => void;
  onPrint?: (voucher: any) => void;
  onDownloadPdf?: (voucher: any) => void;
  onSendEmail?: (voucher: any) => void;
}

export const PaymentVoucherDetailsView: React.FC<PaymentVoucherDetailsViewProps> = ({
  voucher,
  onBack,
  onEdit,
  onDelete,
  onPrint,
  onDownloadPdf,
  onSendEmail
}) => {
  const { canEditInvoice, canDeleteInvoice } = useAuth();
  if (!voucher) return null;

  // Format Date & Time
  const rawDate = voucher.createdAt;
  const d = rawDate?.toDate ? rawDate.toDate() : (rawDate ? new Date(rawDate) : new Date());
  
  let dateStr = '';
  let timeStr = '';
  try {
    dateStr = toBengaliDigits(format(d, 'dd/MM/yyyy'));
    timeStr = toBengaliDigits(format(d, 'hh:mm a', { locale: bn }))
      .replace('AM', 'পূর্বাহ্ন')
      .replace('PM', 'অপরাহ্ন');
  } catch {
    dateStr = format(new Date(), 'dd/MM/yyyy');
    timeStr = '';
  }

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
                   voucher.raw?.transaction_type === 'loan_in' ||
                   rawNoteStr.includes('[লোন গ্রহণ');

  const isIncome = (rawType === 'income' || rawType === 'payment_in' || isLoanIn) && !isAddMoney;
  const isExpense = (rawType === 'expense' || rawType === 'payment_out') && !isAddMoney && !isLoanIn;

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

  const categoryName = isLoanIn ? 'লোন গ্রহণ' : isAddMoney ? 'টাকা যোগ' : (voucher.category || (isIncome ? 'পেমেন্ট গ্রহণ' : isExpense ? 'পেমেন্ট প্রদান' : 'লেনদেন'));

  return (
    <div className="w-full bg-slate-100 min-h-screen p-4 sm:p-6 font-bengali space-y-4 text-slate-800">
      
      {/* --- TOP HEADER ACTION BAR --- */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Title with Back Button */}
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              onClick={onBack}
              variant="outline"
              size="sm"
              className="rounded-lg h-9 px-3 border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 mr-1 text-slate-600" />
              <span>ফিরে যান</span>
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                {isAddMoney ? (
                  <Wallet className="w-5 h-5 text-blue-600" />
                ) : isLoanIn ? (
                  <HandCoins className="w-5 h-5 text-purple-600" />
                ) : isIncome ? (
                  <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-rose-600" />
                )}
                {isLoanIn ? 'লোন গ্রহণ বিবরণী (সরবরাহকারী ঋণ)' : isAddMoney ? 'টাকা যোগ বিবরণী' : isIncome ? 'পেমেন্ট গ্রহণ / জমার বিবরণী' : isExpense ? 'পেমেন্ট প্রদান বিবরণী' : 'লেনদেন বিবরণী'}
              </h1>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {toBengaliDigits(voucherNo)}
              </span>
              <span className={cn("text-xs font-black px-2.5 py-0.5 rounded-full border", 
                isLoanIn ? "bg-purple-100 text-purple-800 border-purple-200" : isAddMoney ? "bg-blue-100 text-blue-800 border-blue-200" : isIncome ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-rose-100 text-rose-800 border-rose-200"
              )}>
                {isLoanIn ? 'লোন গ্রহণ' : isAddMoney ? 'টাকা যোগ' : isIncome ? 'প্রাপ্ত জমা' : 'প্রদত্ত অর্থ'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              তারিখ: {dateStr} {timeStr ? `• সময়: ${timeStr}` : ''}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          <Button
            onClick={() => onPrint ? onPrint(voucher) : printElement('printable-memo-wrapper')}
            className={cn("rounded-lg h-9 px-3.5 text-xs font-bold text-white flex items-center gap-1.5 shadow-xs cursor-pointer",
              isAddMoney ? "bg-blue-600 hover:bg-blue-700" : isIncome ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
            )}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>প্রিন্ট রশিদ</span>
          </Button>

          {onDownloadPdf && (
            <Button
              onClick={() => onDownloadPdf(voucher)}
              variant="outline"
              className="rounded-lg h-9 px-3.5 text-xs font-bold text-slate-700 border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>পিডিএফ ডাউনলোড</span>
            </Button>
          )}

          {onSendEmail && (
            <Button
              onClick={() => onSendEmail(voucher)}
              variant="outline"
              className="rounded-lg h-9 px-3.5 text-xs font-bold text-slate-700 border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-slate-600" />
              <span>ইমেইল পাঠান</span>
            </Button>
          )}

          {onEdit && canEditInvoice && (
            <Button
              onClick={() => onEdit(voucher)}
              variant="outline"
              className="rounded-lg h-9 px-3.5 text-xs font-bold text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-amber-600" />
              <span>সম্পাদনা করুন</span>
            </Button>
          )}

          {onDelete && canDeleteInvoice && (
            <Button
              onClick={() => onDelete(voucher)}
              variant="outline"
              className="rounded-lg h-9 px-3.5 text-xs font-bold text-rose-700 border-rose-300 bg-rose-50 hover:bg-rose-100 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>মুছে ফেলুন</span>
            </Button>
          )}

        </div>

      </div>

      {isAddMoney ? (
        /* --- ADD MONEY SPECIFIC CLEAN VIEW (NO CUSTOMER/SUPPLIER OR DUE DEBT INFO) --- */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: টাকা যোগের খাত ও বিবরণ */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 text-slate-900 font-black text-sm">
                <Wallet className="w-4 h-4 text-blue-600" />
                <h3>টাকা যোগের খাত ও তথ্য</h3>
              </div>

              <div className="space-y-2.5 text-xs font-medium text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">টাকা যোগের খাত</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 text-xs">
                    {addMoneyCategory}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">ভাউচার নম্বর</span>
                  <span className="font-mono font-bold text-slate-900">{toBengaliDigits(voucherNo)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">তারিখ</span>
                  <span className="font-mono font-bold text-slate-900">{dateStr}</span>
                </div>
                {timeStr && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">সময়</span>
                    <span className="font-bold text-slate-900">{timeStr}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">এন্ট্রি করেছেন</span>
                  <span className="font-bold text-slate-900">{voucher.operatorName || 'অ্যাডমিন / ক্যাশিয়ার'}</span>
                </div>
              </div>
            </div>

            {/* Card 2: পেমেন্ট মাধ্যম ও ব্যাংক তথ্য */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 text-slate-900 font-black text-sm">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <h3>পেমেন্ট মাধ্যম ও জমা তথ্য</h3>
              </div>

              <div className="space-y-2.5 text-xs font-medium text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">পেমেন্ট মাধ্যম</span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    {paymentMethodLabel}
                  </span>
                </div>
                {voucher.bankName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">ব্যাংকের নাম</span>
                    <span className="font-bold text-slate-900">{voucher.bankName}</span>
                  </div>
                )}
                {voucher.accountNo && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">অ্যাকাউন্ট নম্বর</span>
                    <span className="font-mono font-bold text-slate-900">{toBengaliDigits(voucher.accountNo)}</span>
                  </div>
                )}
                {voucher.transactionRef && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">ট্রানজ্যাকশন রেফারেন্স</span>
                    <span className="font-mono font-bold text-slate-900">{toBengaliDigits(voucher.transactionRef)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">স্ট্যাটাস</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    সফলভাবে যোগ হয়েছে ✓
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: টাকার পরিমাণ ও কথায় */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 text-slate-900 font-black text-sm">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <h3>জমার পরিমাণ</h3>
                </div>

                <div>
                  <span className="text-slate-500 text-xs font-bold block mb-1">মোট যোগকৃত অর্থ:</span>
                  <span className="font-mono font-black text-2xl text-blue-600">
                    ৳ {toBengaliDigits(amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                  </span>
                </div>

                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 block">কথায়:</span>
                  <p className="font-black text-xs text-slate-900">
                    {numberToBengaliWords(amount).replace(/ টাকা মাত্র$/, '')} টাকা মাত্র।
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Card 4: নোট ও বিবরণী */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3>নোট / বিবরণী</h3>
            </div>
            <div className="text-xs font-medium text-slate-700">
              <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 font-bold leading-relaxed">
                {userNote || (rawNoteStr.includes('[টাকা যোগ') ? rawNoteStr.replace(/\[টাকা যোগ - [^\]]+\]\s*/, '') : '') || 'কোনো বিবরণ দেওয়া হয়নি'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* --- REGULAR PARTY PAYMENT VIEW (WITH CUSTOMER/SUPPLIER & DUE BREAKDOWN) --- */
        <div className="space-y-4">
          {/* --- SECTION 1: 3 CARDS (VOUCHER INFO, PARTY INFO, PAYMENT INFO) --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Card 1: ভাউচার ও ট্রানজ্যাকশন তথ্য */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
                <Receipt className={cn("w-4 h-4", isIncome ? "text-emerald-600" : "text-rose-600")} />
                <h3>ভাউচার ও লেনদেনের তথ্য</h3>
              </div>

              <div className="space-y-2 text-xs font-medium text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">ভাউচার নম্বর</span>
                  <span className="font-mono font-bold text-slate-900">{toBengaliDigits(voucherNo)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">লেনদেনের তারিখ</span>
                  <span className="font-mono font-bold text-slate-900">{dateStr}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">লেনদেনের ধরন</span>
                  <span className={cn("font-bold px-2 py-0.5 rounded border", isIncome ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200")}>
                    {categoryName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">অপারেটর</span>
                  <span className="font-bold text-slate-900">{voucher.operatorName || 'ক্যাশিয়ার'}</span>
                </div>
              </div>
            </div>

            {/* Card 2: পার্টি ও কাস্টমার/সাপ্লায়ার তথ্য */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
                <User className={cn("w-4 h-4", isIncome ? "text-emerald-600" : "text-rose-600")} />
                <h3>{isIncome ? 'কাস্টমার / গ্রাহকের তথ্য' : 'সরবরাহকারীর তথ্য'}</h3>
              </div>

              <div className="space-y-2 text-xs font-medium text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">পার্টির নাম</span>
                  <span className="font-bold text-slate-900">
                    {(voucher.partyName && voucher.partyName !== 'কাস্টমার' && voucher.partyName !== 'সরবরাহকারী') 
                      ? voucher.partyName 
                      : (voucher.customerName || (voucher.invoiceNo && voucher.invoiceNo !== '—' ? `ইনভয়েস ${voucher.invoiceNo} কাস্টমার` : 'সাধারণ পার্টি'))}
                  </span>
                </div>
                {voucher.businessName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">কোম্পানি</span>
                    <span className="font-bold text-blue-700">{voucher.businessName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">মোবাইল নম্বর</span>
                  <span className="font-mono font-bold text-slate-900">
                    {voucher.partyPhone ? toBengaliDigits(voucher.partyPhone) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">ঠিকানা</span>
                  <span className="font-bold text-slate-800 truncate max-w-[180px]">
                    {voucher.partyAddress || '—'}
                  </span>
                </div>
                {(voucher.siteName || meta.siteName) && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">সাইট</span>
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      📍 {voucher.siteName || meta.siteName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: পেমেন্ট বিস্তারিত ও ব্যাংক অ্যাকাউন্ট তথ্য */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
                <CreditCard className={cn("w-4 h-4", isIncome ? "text-emerald-600" : "text-rose-600")} />
                <h3>পেমেন্ট ও ব্যাংক অ্যাকাউন্ট তথ্য</h3>
              </div>

              <div className="space-y-2 text-xs font-medium text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">পেমেন্ট মাধ্যম</span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {paymentMethodLabel}
                  </span>
                </div>
                {voucher.bankName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">ব্যাংকের নাম</span>
                    <span className="font-bold font-mono text-slate-900">{voucher.bankName}</span>
                  </div>
                )}
                {voucher.accountNo && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">অ্যাকাউন্ট নম্বর</span>
                    <span className="font-mono font-bold">{toBengaliDigits(voucher.accountNo)}</span>
                  </div>
                )}
                {voucher.chequeNo && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">চেক নম্বর</span>
                    <span className="font-mono font-bold">{toBengaliDigits(voucher.chequeNo)}</span>
                  </div>
                )}
                {voucher.transactionRef && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">লেনদেন রেফারেন্স আইডি</span>
                    <span className="font-mono font-bold">{toBengaliDigits(voucher.transactionRef)}</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* --- SECTION 2: 2 CARDS (FINANCIAL AMOUNT BREAKDOWN & NOTES) --- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Card 1: অর্থের পরিমাণ ও সমন্বয় বিবরণী */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
                <Receipt className={cn("w-4 h-4", isIncome ? "text-emerald-600" : "text-rose-600")} />
                <h3>অর্থের পরিমাণ ও সমন্বয় বিবরণী</h3>
              </div>

              <div className="space-y-2 text-xs font-medium text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">আজকের {isIncome ? 'প্রাপ্ত জমা' : 'প্রদত্ত অর্থ'}</span>
                  <span className={cn("font-mono font-black text-lg", isIncome ? "text-emerald-600" : "text-rose-600")}>
                    ৳ {toBengaliDigits(amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-amber-700">
                    <span>বিশেষ ছাড়</span>
                    <span className="font-mono font-bold">৳ {toBengaliDigits(discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                  </div>
                )}

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 block">কথায়:</span>
                  <p className="font-black text-sm text-slate-900">
                    {numberToBengaliWords(amount).replace(/ টাকা মাত্র$/, '')} টাকা মাত্র।
                  </p>
                </div>

                {voucher.invoiceNo && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                    <span className="text-slate-500">সংযুক্ত চালান / ইনভয়েস নম্বর</span>
                    <span className="font-mono font-bold text-blue-700">{toBengaliDigits(voucher.invoiceNo)}</span>
                  </div>
                )}

                {previousBalance > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>পূর্বের মোট বকেয়া</span>
                      <span className="font-mono font-bold">৳ {toBengaliDigits(previousBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-slate-100 font-black text-xs text-slate-900">
                      <span>অবশিষ্ট বকেয়া / দেনা</span>
                      <span className="font-mono text-sm">৳ {toBengaliDigits(Math.max(0, remainingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: নোট ও বিবরণ */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3>নোট ও বিবরণ</h3>
              </div>

              <div className="space-y-2 text-xs font-medium text-slate-700">
                <div>
                  <span className="text-slate-500 block mb-1">বিবরণ / লেনদেনের কারণ:</span>
                  <p className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-800 font-bold leading-relaxed">
                    {userNote || '—'}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
