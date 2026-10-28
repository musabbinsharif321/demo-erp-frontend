'use client';

import React from 'react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { 
  ArrowLeft, Printer, Download, Mail, Edit, 
  RotateCcw, User, CreditCard, 
  FileText, Trash2, ArrowRightLeft, Receipt, CheckCircle2,
  Package, DollarSign, AlertCircle, ShieldAlert, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toBengaliDigits } from '@/lib/bengaliUtils';
import { printElement } from '@/lib/printUtils';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/authContext';

export interface SalesReturnDetailsViewProps {
  returnEntry: any;
  onBack?: () => void;
  onEdit?: (entry: any) => void;
  onDelete?: (entry: any) => void;
  onPrint?: (entry: any) => void;
  onDownloadPdf?: (entry: any) => void;
  onSendEmail?: (entry: any) => void;
  onApprove?: (entry: any) => void;
}

export const SalesReturnDetailsView: React.FC<SalesReturnDetailsViewProps> = ({
  returnEntry,
  onBack,
  onEdit,
  onDelete,
  onPrint,
  onDownloadPdf,
  onSendEmail,
  onApprove
}) => {
  const { canEditInvoice, canDeleteInvoice } = useAuth();
  if (!returnEntry) return null;

  // Format Date & Time
  const rawDate = returnEntry.createdAt;
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

  let returnedItems = returnEntry.returnedItems || [];
  let newTakenItems = returnEntry.newTakenItems || [];
  let totalNewTakenValue = Number(returnEntry.totalNewTakenValue || 0);

  // Fallback to metadata in notes/reason if newTakenItems is empty
  const rawNote = returnEntry.notes || returnEntry.reason || '';
  let cleanReason = returnEntry.reason || 'পণ্য ফেরত / বকেয়া এডজাস্টমেন্ট';
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
      if (meta.reason) {
        cleanReason = meta.reason;
      }
    } catch {}
  }

  const totalReturnedValue = Number(returnEntry.totalReturnValue || returnedItems.reduce((s: number, i: any) => s + (i.price * i.quantity), 0));
  if (totalNewTakenValue === 0 && newTakenItems.length > 0) {
    totalNewTakenValue = newTakenItems.reduce((s: number, i: any) => s + (Number(i.price || 0) * Number(i.quantity || 0)), 0);
  }
  const netRefundValue = returnEntry.netRefundValue !== undefined ? Number(returnEntry.netRefundValue) : (totalReturnedValue - totalNewTakenValue);

  const dueAdjusted = Number(returnEntry.dueAdjusted || 0);
  const cashRefundPaid = Number(returnEntry.cashRefundPaid || 0);
  const operatorName = returnEntry.operatorName || 'ক্যাশিয়ার';
  const reason = cleanReason;

  const returnNo = returnEntry.id 
    ? (returnEntry.id.startsWith('RET') ? returnEntry.id : `RET-${returnEntry.id.slice(-6).toUpperCase()}`)
    : 'RET-000101';

  return (
    <div className="w-full bg-slate-100 min-h-screen p-4 sm:p-6 font-bengali space-y-5 text-slate-800">
      
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
              <span>তালিকায় ফিরুন</span>
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" /> বিক্রয় ফেরত চালান বিবরণী (Return Details)
              </h1>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                {returnNo}
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
            onClick={() => onPrint ? onPrint(returnEntry) : printElement('printable-memo-wrapper')}
            className="rounded-lg h-9 px-3.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>প্রিন্ট রিটার্ন মেমো</span>
          </Button>

          {onDownloadPdf && (
            <Button
              onClick={() => onDownloadPdf(returnEntry)}
              variant="outline"
              className="rounded-lg h-9 px-3.5 text-xs font-bold text-slate-700 border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>ডাউনলোড (PDF)</span>
            </Button>
          )}

          {onEdit && canEditInvoice && (
            <Button
              onClick={() => onEdit(returnEntry)}
              variant="outline"
              className="rounded-lg h-9 px-3.5 text-xs font-bold text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-amber-600" />
              <span>এডিট</span>
            </Button>
          )}

          {onDelete && canDeleteInvoice && (
            <Button
              onClick={() => onDelete(returnEntry)}
              variant="outline"
              className="rounded-lg h-9 px-3.5 text-xs font-bold text-rose-700 border-rose-300 bg-rose-50 hover:bg-rose-100 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>ডিলিট</span>
            </Button>
          )}

        </div>

      </div>

      {/* APPROVAL STATUS BANNER */}
      {(returnEntry.status === 'pending' || returnEntry.status === 'draft' || returnEntry.status === 'অপেক্ষমান') && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in-0">
          <div className="flex items-center gap-2.5 text-amber-950 font-bold">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-black text-amber-900">এই বিক্রয় রিটার্ন চালানটি এখনো অনুমোদিত হয়নি (অপেক্ষমান / Pending)</p>
              <p className="text-amber-700 font-medium text-[11px]">অনুমোদন করার আগ পর্যন্ত এটি গ্রাহকের খতিয়ান (Ledger), নগদ ক্যাশ/ব্যাংক এবং পণ্যের স্টকে কোনো পরিবর্তন করবে না।</p>
            </div>
          </div>
          {onApprove && (
            <Button 
              onClick={() => onApprove(returnEntry)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 rounded-lg shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> অনুমোদন করুন (Approve)
            </Button>
          )}
        </div>
      )}

      {/* --- TOP KPI SUMMARY STATS CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200/80 bg-white shadow-2xs rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">মোট ফেরত মূল্য</p>
              <p className="text-lg font-black text-rose-600">৳ {toBengaliDigits(totalReturnedValue.toLocaleString('en-IN'))}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-2xs rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">বকেয়া কর্তন / সমন্বয়</p>
              <p className="text-lg font-black text-blue-700">৳ {toBengaliDigits(dueAdjusted.toLocaleString('en-IN'))}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-2xs rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">নগদ ক্যাশ ফেরত</p>
              <p className="text-lg font-black text-emerald-600">৳ {toBengaliDigits(cashRefundPaid.toLocaleString('en-IN'))}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-2xs rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">ফেরত আইটেম সংখ্যা</p>
              <p className="text-lg font-black text-slate-900">{toBengaliDigits(returnedItems.length)} টি</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- SECTION 1: 3 METADATA CARDS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Card 1: রিটার্ন চালানের তথ্য */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
            <Receipt className="w-4 h-4 text-rose-600" />
            <h3>রিটার্ন চালানের তথ্য</h3>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">মেমো নম্বর</span>
              <span className="font-mono font-bold text-slate-900">{returnNo}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">রিটার্নের তারিখ</span>
              <span className="font-bold text-slate-900">{dateStr}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">চালানের ধরন</span>
              <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                🔄 বিক্রয় ফেরত (Sales Return)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">অপারেটর</span>
              <span className="font-bold text-slate-900">{operatorName}</span>
            </div>
          </div>
        </div>

        {/* Card 2: গ্রাহক তথ্য */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
            <User className="w-4 h-4 text-blue-600" />
            <h3>গ্রাহক ও ক্লায়েন্ট তথ্য</h3>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">গ্রাহকের নাম</span>
              <span className="font-bold text-slate-900">{returnEntry.customerName || 'সাধারণ গ্রাহক'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">মোবাইল নম্বর</span>
              <span className="font-mono font-bold text-slate-900">
                {returnEntry.customerPhone ? toBengaliDigits(returnEntry.customerPhone) : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">ঠিকানা</span>
              <span className="font-bold text-slate-800 truncate max-w-[180px]">
                {returnEntry.customerAddress || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: রিটার্নের কারণ ও বিবরণ */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
            <FileText className="w-4 h-4 text-purple-600" />
            <h3>রিটার্নের কারণ ও বিবরণ</h3>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            <div>
              <span className="text-slate-500 block mb-1">কারণ / বিবরণ:</span>
              <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 font-bold leading-relaxed">
                {reason}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* --- SECTION 2: RETURNED ITEMS TABLE --- */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
        
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <h3>ফেরত প্রদানকৃত পণ্য (Returned Items)</h3>
          </div>
          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            মোট ফেরত আইটেম: {toBengaliDigits(returnedItems.length)} টি
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-rose-50/60 border-b border-rose-200 text-rose-950 font-black">
                <th className="py-2.5 px-3 text-center w-12">#</th>
                <th className="py-2.5 px-3">ফেরত পণ্যের নাম</th>
                <th className="py-2.5 px-3 text-center">কন্ডিশন</th>
                <th className="py-2.5 px-3 text-center">পরিমাণ</th>
                <th className="py-2.5 px-3 text-center">একক</th>
                <th className="py-2.5 px-3 text-right">একক মূল্য (৳)</th>
                <th className="py-2.5 px-3 text-right">মোট ফেরত মূল্য (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {returnedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 font-bold">
                    কোনো ফেরত পণ্য রেকর্ড করা হয়নি
                  </td>
                </tr>
              ) : (
                returnedItems.map((item: any, idx: number) => {
                  const itemPrice = Number(item.price || 0);
                  const itemQty = Number(item.quantity || 0);
                  const itemTotal = itemPrice * itemQty;
                  const isDamaged = (item.name && item.name.includes('[ড্যামেজ]')) || item.condition === 'damaged';

                  return (
                    <tr key={idx} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                        {toBengaliDigits(idx + 1)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold inline-block",
                          isDamaged
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        )}>
                          {isDamaged ? '🔴 নষ্ট/ড্যামেজ' : '🟢 ভালো'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700">
                        {toBengaliDigits(itemQty.toLocaleString('en-IN'))}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{item.unit || 'পিস'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ৳ {toBengaliDigits(itemPrice.toLocaleString('en-IN'))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-rose-700">
                        ৳ {toBengaliDigits(itemTotal.toLocaleString('en-IN'))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* --- SECTION 3: NEW EXCHANGED ITEMS TABLE (IF ANY) --- */}
      {newTakenItems.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
              <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
              <h3>নতুন পরিবর্তন/নেওয়া পণ্য (Exchanged New Items)</h3>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              মোট নতুন পণ্য: {toBengaliDigits(newTakenItems.length)} টি
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/60 border-b border-emerald-200 text-emerald-950 font-black">
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-3">নতুন পণ্যের নাম</th>
                  <th className="py-2.5 px-3 text-center">পরিমাণ</th>
                  <th className="py-2.5 px-3 text-center">একক</th>
                  <th className="py-2.5 px-3 text-right">একক মূল্য (৳)</th>
                  <th className="py-2.5 px-3 text-right">মোট মূল্য (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {newTakenItems.map((item: any, idx: number) => {
                  const itemPrice = Number(item.price || 0);
                  const itemQty = Number(item.quantity || 0);
                  const itemTotal = itemPrice * itemQty;
                  return (
                    <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                        {toBengaliDigits(idx + 1)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                        {toBengaliDigits(itemQty.toLocaleString('en-IN'))}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{item.unit || 'পিস'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ৳ {toBengaliDigits(itemPrice.toLocaleString('en-IN'))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                        ৳ {toBengaliDigits(itemTotal.toLocaleString('en-IN'))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* --- SECTION 4: FINANCIAL BREAKDOWN CARD --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Card 1: রিটার্ন হিসাব ও সমন্বয় বিবরণী */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
            <Receipt className="w-4 h-4 text-rose-600" />
            <h3>রিটার্ন হিসাব ও সমন্বয় বিবরণী</h3>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            <div className="flex justify-between items-center text-rose-700 font-bold">
              <span>ফেরত প্রদানকৃত পণ্যের মূল্য</span>
              <span className="font-mono text-base">৳ {toBengaliDigits(totalReturnedValue.toLocaleString('en-IN'))}</span>
            </div>

            {totalNewTakenValue > 0 && (
              <div className="flex justify-between items-center text-emerald-700 font-bold">
                <span>নতুন নেওয়া পণ্যের মূল্য (Exchange)</span>
                <span className="font-mono">- ৳ {toBengaliDigits(totalNewTakenValue.toLocaleString('en-IN'))}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-black text-slate-900">
              <span>নিট রিফান্ড ব্যালেন্স (Net Refund)</span>
              <span className="font-mono text-base text-rose-700">৳ {toBengaliDigits(netRefundValue.toLocaleString('en-IN'))}</span>
            </div>

            {dueAdjusted > 0 && (
              <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-blue-800 font-bold">
                <span>কাস্টমারের বকেয়া থেকে কর্তন (Due Adjusted)</span>
                <span className="font-mono font-bold">- ৳ {toBengaliDigits(dueAdjusted.toLocaleString('en-IN'))}</span>
              </div>
            )}

            {cashRefundPaid > 0 && (
              <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-rose-700 font-bold">
                <span>নগদ ক্যাশ রিফান্ড প্রদান (Cash Refund Paid)</span>
                <span className="font-mono font-bold">৳ {toBengaliDigits(cashRefundPaid.toLocaleString('en-IN'))}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: নিষ্পত্তি স্ট্যাটাস */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <h3>নিষ্পত্তি স্ট্যাটাস ও সামারি</h3>
          </div>

          <div className="space-y-3 text-xs font-medium text-slate-700">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">নিষ্পত্তির ধরণ:</span>
                <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
                  {cashRefundPaid > 0 ? '💵 নগদ ক্যাশ রিফান্ড' : dueAdjusted > 0 ? '📑 বকেয়া সমন্বয়' : '🔄 সমপরিমাণ এক্সচেঞ্জ'}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-600 font-bold">স্টক স্ট্যাটাস:</span>
                <span className="font-bold text-emerald-700">
                  ✓ গুদামে স্টক পুনঃসংযোজিত হয়েছে
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 text-blue-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>এই চালানের সকল হিসাব ও লেজার সমন্বয় স্বয়ংক্রিয়ভাবে সম্পন্ন হয়েছে।</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
