'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import {
  Truck,
  HardHat,
  Search,
  CheckCircle2,
  Clock,
  DollarSign,
  Printer,
  Eye,
  RefreshCw,
  FileText,
  Check,
  X
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toBengaliDigits } from '@/lib/bengaliUtils';
import { BengaliDatePicker } from '@/components/ui/BengaliDatePicker';
import { SalesInvoiceDetailsView } from '@/components/SalesInvoiceDetailsView';

export interface LoadingChargeEntry {
  id: string; // transaction id
  invoiceNo: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress?: string;
  cementBags: number;
  loadingRate: number;
  loadingAmount: number;
  isPaid: boolean;
  paidAt?: string;
  paidMethod?: string;
  paidBankName?: string;
  paidAmount?: number;
  sardarName?: string;
  note?: string;
  rawTx: any;
}

export default function LoadingChargesPage() {
  const [entries, setEntries] = useState<LoadingChargeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedEntryForPay, setSelectedEntryForPay] = useState<LoadingChargeEntry | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'Cash' | 'Bank'>('Cash');
  const [payBankId, setPayBankId] = useState<string>('');
  const [sardarName, setSardarName] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [payNote, setPayNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bank List State
  const [banks, setBanks] = useState<{ id: string | number; name: string; accNo?: string; balance?: number }[]>([]);

  // Invoice Details View Modal State
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [txList, bankList] = await Promise.all([
        api.transactions.list({ transaction_type: 'sale' }),
        api.banks.list().catch(() => [])
      ]);

      setBanks(bankList.map((b: any) => ({
        id: b.id,
        name: b.name || b.bank_name,
        accNo: b.account_number || b.account_no,
        balance: Number(b.balance || 0)
      })));

      const extracted: LoadingChargeEntry[] = [];

      txList.forEach((t: any) => {
        let meta: any = {};
        if (t.notes && typeof t.notes === 'string' && t.notes.trim().startsWith('{')) {
          try {
            meta = JSON.parse(t.notes.split('\n')[0]);
          } catch {}
        }

        // Strictly exclude pending/draft/unapproved invoices
        const rawStatus = String(t.status || meta.status || '').toLowerCase().trim();
        const isPending = rawStatus === 'pending' || rawStatus === 'draft' || rawStatus === 'cancelled' || rawStatus === 'rejected' || rawStatus === 'অপেক্ষমান' || rawStatus === 'বাতিল';
        if (isPending) return;

        // Check if there is cement loading charge
        const cementRate = Number(meta.cementLaborRate || (t as any).cementLaborRate || 0);
        const cementCost = Number(meta.cementLaborCost || meta.cementLoadingCharge || (t as any).cementLaborCost || 0);
        const cementBags = Number(meta.cementTotalBags || (t as any).cementTotalBags || 0);

        // Fallback: calculate if rate exists or bags exist with rate
        const totalLoading = cementCost > 0 ? cementCost : (cementRate > 0 && cementBags > 0 ? cementRate * cementBags : 0);

        if (totalLoading > 0 || (cementBags > 0 && cementRate > 0)) {
          const invNo = t.invoice_no || `INV-${String(t.id).padStart(6, '0')}`;
          const isPaid = Boolean(meta.cementLoadingPaid || (t as any).cementLoadingPaid);

          extracted.push({
            id: String(t.id),
            invoiceNo: invNo,
            date: t.created_at || new Date().toISOString(),
            customerName: t.party_name || meta.customerName || 'খুচরা গ্রাহক',
            customerPhone: meta.customerPhone || '',
            deliveryAddress: meta.deliveryAddress || '',
            cementBags: cementBags > 0 ? cementBags : (totalLoading / (cementRate || 1)),
            loadingRate: cementRate > 0 ? cementRate : (totalLoading / (cementBags || 1)),
            loadingAmount: totalLoading,
            isPaid,
            paidAt: meta.cementLoadingPaidAt,
            paidMethod: meta.cementLoadingPaidMethod,
            paidBankName: meta.cementLoadingPaidBank,
            paidAmount: Number(meta.cementLoadingPaidAmount || totalLoading),
            sardarName: meta.cementLoadingSardar || '',
            note: meta.cementLoadingNote || '',
            rawTx: t
          });
        }
      });

      // Sort newest first
      extracted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEntries(extracted);
    } catch (err) {
      console.error('Error loading loading charges:', err);
      toast.error('লোডিং চার্জ তথ্য লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        await loadData();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadData]);

  // KPIs
  const totalCount = entries.length;
  const totalAmount = useMemo(() => entries.reduce((sum, e) => sum + e.loadingAmount, 0), [entries]);
  const pendingEntries = useMemo(() => entries.filter(e => !e.isPaid), [entries]);
  const pendingCount = pendingEntries.length;
  const pendingAmount = useMemo(() => pendingEntries.reduce((sum, e) => sum + e.loadingAmount, 0), [pendingEntries]);
  const paidEntries = useMemo(() => entries.filter(e => e.isPaid), [entries]);
  const paidCount = paidEntries.length;
  const paidAmount = useMemo(() => paidEntries.reduce((sum, e) => sum + (e.paidAmount || e.loadingAmount), 0), [paidEntries]);
  const totalBagsLoaded = useMemo(() => entries.reduce((sum, e) => sum + e.cementBags, 0), [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (statusFilter === 'pending' && entry.isPaid) return false;
      if (statusFilter === 'paid' && !entry.isPaid) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchInv = entry.invoiceNo.toLowerCase().includes(q);
        const matchCust = entry.customerName.toLowerCase().includes(q);
        const matchSardar = (entry.sardarName || '').toLowerCase().includes(q);
        if (!matchInv && !matchCust && !matchSardar) return false;
      }

      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        if (new Date(entry.date) < s) return false;
      }

      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        if (new Date(entry.date) > e) return false;
      }

      return true;
    });
  }, [entries, statusFilter, search, startDate, endDate]);

  const openPayModal = (entry: LoadingChargeEntry) => {
    setSelectedEntryForPay(entry);
    setPayAmount(entry.loadingAmount);
    setPayMethod('Cash');
    setPayBankId(banks[0] ? String(banks[0].id) : '');
    setSardarName(entry.sardarName || '');
    setPayDate(format(new Date(), 'yyyy-MM-dd'));
    setPayNote('');
    setIsPayModalOpen(true);
  };

  const handleSettlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntryForPay) return;
    if (payAmount <= 0) {
      toast.error('পরিশোধের পরিমাণ ০ টাকার বেশি হতে হবে');
      return;
    }

    try {
      setIsSubmitting(true);

      const selBank = banks.find(b => String(b.id) === String(payBankId));

      // 1. Record payment_out transaction so Cash balance and Transactions list are debited
      await api.transactions.create({
        party_name: `লোডিং লেবার বিল (${sardarName || selectedEntryForPay.customerName || 'বিক্রয়'})`,
        transaction_type: 'payment_out',
        total_amount: Number(payAmount),
        paid_amount: Number(payAmount),
        due_amount: 0,
        payment_method: payMethod,
        bank_account: payMethod === 'Bank' && selBank ? Number(selBank.id) : undefined,
        notes: JSON.stringify({
          category: 'লোডিং ও খালাস খরচ',
          expenseCategory: 'লোডিং ও খালাস খরচ',
          invoiceId: selectedEntryForPay.invoiceNo,
          invoiceNo: selectedEntryForPay.invoiceNo,
          type: 'loading',
          cementBags: selectedEntryForPay.cementBags,
          loadingRate: selectedEntryForPay.loadingRate,
          sardarName: sardarName || '',
          isLaborExpense: true
        }) + `\n[লেবার খরচ পরিশোধ - বিক্রয় সিমেন্ট লোডিং] চালান: #${selectedEntryForPay.invoiceNo}`
      }).catch(err => console.warn('Transaction record fallback:', err));

      // 2. Record expense transaction (with duplicate check)
      const targetTitle = `বিক্রয় চালান লোডিং চার্জ (চালান #${selectedEntryForPay.invoiceNo})`;
      const existingExpenses = await api.expenses.list({ search: selectedEntryForPay.invoiceNo }).catch(() => []);
      const isAlreadyRecorded = Array.isArray(existingExpenses) && existingExpenses.some((e: any) => 
        e.title?.includes(selectedEntryForPay.invoiceNo) &&
        Number(e.amount) === Number(payAmount) &&
        e.date === payDate
      );
      if (!isAlreadyRecorded) {
        await api.expenses.create({
          title: targetTitle,
          category_name: 'লোডিং ও খালাস খরচ',
          amount: Number(payAmount),
          date: payDate,
          payment_method: payMethod,
          bank_account: payMethod === 'Bank' && selBank ? Number(selBank.id) : undefined,
          notes: `চালান নং: ${selectedEntryForPay.invoiceNo} | গ্রাহক: ${selectedEntryForPay.customerName} | সিমেন্ট: ${selectedEntryForPay.cementBags} বস্তা | সর্দার: ${sardarName || 'লেবার কর্মী'}${payNote ? ` | নোট: ${payNote}` : ''}`
        }).catch(err => {
          console.warn('Expense record created with fallback:', err);
        });
      }

      // 2. Update Invoice Transaction Notes Metadata
      const rawNotes = selectedEntryForPay.rawTx.notes || '';
      let meta: any = {};
      let userNote = '';
      if (rawNotes && typeof rawNotes === 'string' && rawNotes.trim().startsWith('{')) {
        try {
          const firstLine = rawNotes.split('\n')[0];
          meta = JSON.parse(firstLine);
          userNote = rawNotes.includes('\n') ? rawNotes.substring(rawNotes.indexOf('\n') + 1) : '';
        } catch {}
      }

      meta.cementLoadingPaid = true;
      meta.cementLoadingPaidAmount = Number(payAmount);
      meta.cementLoadingPaidAt = new Date(payDate).toISOString();
      meta.cementLoadingPaidMethod = payMethod === 'Bank' && selBank ? `ব্যাংক (${selBank.name})` : 'নগদ';
      meta.cementLoadingPaidBank = selBank ? selBank.name : '';
      meta.cementLoadingSardar = sardarName || '';
      meta.cementLoadingNote = payNote || '';

      const updatedNotesPayload = JSON.stringify(meta) + (userNote ? `\n${userNote}` : '');

      await api.transactions.update(selectedEntryForPay.id, {
        notes: updatedNotesPayload
      });

      toast.success(`চালান #${selectedEntryForPay.invoiceNo}-এর লোডিং বিল সফলভাবে পরিশোধ করা হয়েছে!`);
      setIsPayModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error settling loading charge:', err);
      toast.error('পরিশোধ সম্পন্ন করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintSlip = (entry: LoadingChargeEntry) => {
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>লোডিং বিল ভাউচার - ${entry.invoiceNo}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .header h2 { margin: 0; font-size: 20px; }
            .header p { margin: 2px 0; font-size: 12px; color: #64748b; }
            .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 15px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
            .label { font-weight: bold; color: #475569; }
            .val { font-weight: bold; }
            .total { font-size: 16px; font-weight: 900; border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
            .sign { border-top: 1px solid #000; padding-top: 4px; width: 140px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>মেসার্স দেলোয়ার এন্ড ব্রাদার্স</h2>
            <p>লোডিং ও লেবার বিল পরিশোধ ভাউচার</p>
          </div>
          <div class="box">
            <div class="row"><span class="label">চালান নম্বর:</span><span class="val">${entry.invoiceNo}</span></div>
            <div class="row"><span class="label">তারিখ:</span><span class="val">${format(new Date(entry.date), 'dd/MM/yyyy')}</span></div>
            <div class="row"><span class="label">গ্রাহকের নাম:</span><span class="val">${entry.customerName}</span></div>
            <div class="row"><span class="label">সিমেন্ট পরিমাণ:</span><span class="val">${toBengaliDigits(entry.cementBags)} বস্তা</span></div>
            <div class="row"><span class="label">লোডিং রেট:</span><span class="val">৳ ${toBengaliDigits(entry.loadingRate.toFixed(2))} / বস্তা</span></div>
            <div class="row total"><span class="label">মোট লোডিং বিল:</span><span class="val">৳ ${toBengaliDigits(entry.loadingAmount.toLocaleString('en-IN'))}</span></div>
            <div class="row"><span class="label">প্রাপক / সর্দার:</span><span class="val">${entry.sardarName || 'লেবার টিম'}</span></div>
            <div class="row"><span class="label">স্ট্যাটাস:</span><span class="val">${entry.isPaid ? 'পরিশোধিত (' + (entry.paidMethod || 'নগদ') + ')' : 'বকেয়া'}</span></div>
          </div>
          <div class="footer">
            <div class="sign">প্রস্তুতকারীর স্বাক্ষর</div>
            <div class="sign">লেবার সর্দারের স্বাক্ষর</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <Shell>
      <div className="space-y-6 font-bengali p-4 sm:p-6 max-w-7xl mx-auto">
        
        {/* 1. TOP HEADER & BREADCRUMB */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white flex items-center justify-center shadow-md">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  লোডিং ও লেবার বিল ব্যবস্থাপনা
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    দোকান প্রদেয় খরচ
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  বিক্রয় চালানের সিমেন্ট লোডিং ও খালাস চার্জের স্বচ্ছ হিসাব ও দ্রুত পরিশোধ পোর্টাল
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 text-slate-700 font-bold text-xs h-9 bg-white hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500", loading && "animate-spin")} />
              <span>রিফ্রেশ</span>
            </Button>
          </div>
        </div>

        {/* 2. KPI SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Loading Bills */}
          <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block">মোট বিক্রয় লোডিং বিল</span>
                <span className="text-xl font-black text-slate-900 block font-mono">
                  ৳ {toBengaliDigits(totalAmount.toLocaleString('en-IN'))}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold block">
                  মোট চালান: {toBengaliDigits(totalCount)} টি
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Pending Payable Bills */}
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-md overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-amber-100 block">বকেয়া / প্রদেয় লোডিং বিল</span>
                <span className="text-2xl font-black block font-mono">
                  ৳ {toBengaliDigits(pendingAmount.toLocaleString('en-IN'))}
                </span>
                <span className="text-[10px] text-amber-200 font-semibold block">
                  পরিশোধের অপেক্ষায়: {toBengaliDigits(pendingCount)} টি চালান
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Settled / Paid Bills */}
          <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block">পরিশোধিত লোডিং বিল</span>
                <span className="text-xl font-black text-emerald-600 block font-mono">
                  ৳ {toBengaliDigits(paidAmount.toLocaleString('en-IN'))}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold block">
                  পরিশোধ সম্পন্ন: {toBengaliDigits(paidCount)} টি
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Total Cement Bags */}
          <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block">মোট লোডকৃত সিমেন্ট</span>
                <span className="text-xl font-black text-purple-700 block font-mono">
                  {toBengaliDigits(totalBagsLoaded.toLocaleString('en-IN'))} বস্তা
                </span>
                <span className="text-[10px] text-slate-400 font-semibold block">
                  গড় লোডিং রেট: ৳{toBengaliDigits((totalAmount / (totalBagsLoaded || 1)).toFixed(2))}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <HardHat className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* 3. FILTER & SEARCH CONTROL BAR */}
        <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              
              {/* Status Tabs */}
              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    statusFilter === 'all' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  সব লোডিং বিল ({toBengaliDigits(totalCount)})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    statusFilter === 'pending' ? "bg-amber-500 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  ⏳ বকেয়া / প্রদেয় ({toBengaliDigits(pendingCount)})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('paid')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    statusFilter === 'paid' ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  ✅ পরিশোধিত ({toBengaliDigits(paidCount)})
                </button>
              </div>

              {/* Search & Date Controls */}
              <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end">
                <div className="relative min-w-[200px] max-w-xs w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="চালান নং / গ্রাহক / সর্দার খুঁজুন..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>

                <BengaliDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="শুরুর তারিখ"
                  className="w-36"
                />

                <BengaliDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="শেষের তারিখ"
                  className="w-36"
                />

                {(search || startDate || endDate || statusFilter !== 'all') && (
                  <Button
                    onClick={() => {
                      setSearch('');
                      setStartDate('');
                      setEndDate('');
                      setStatusFilter('all');
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl"
                  >
                    রিসেট
                  </Button>
                )}
              </div>

            </div>
          </CardContent>
        </Card>

        {/* 4. MAIN LOADING CHARGES TABLE */}
        <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                <TableRow className="text-xs text-slate-700 font-black">
                  <TableHead className="py-3 px-4 text-left font-black text-slate-900">তারিখ</TableHead>
                  <TableHead className="py-3 px-4 text-left font-black text-slate-900">চালান নম্বর</TableHead>
                  <TableHead className="py-3 px-4 text-left font-black text-slate-900">খাত / উৎস</TableHead>
                  <TableHead className="py-3 px-4 text-left font-black text-slate-900">গ্রাহক / সাইট</TableHead>
                  <TableHead className="py-3 px-4 text-left font-black text-slate-900">লোডকৃত সিমেন্ট</TableHead>
                  <TableHead className="py-3 px-4 text-right font-black text-slate-900">লোডিং চার্জ (৳)</TableHead>
                  <TableHead className="py-3 px-4 text-center font-black text-slate-900">স্ট্যাটাস</TableHead>
                  <TableHead className="py-3 px-4 text-center font-black text-slate-900">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs font-bold text-slate-800 divide-y divide-slate-100">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                        <span>লোডিং চার্জের তথ্য লোড হচ্ছে...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEntries.length > 0 ? (
                  filteredEntries.map(entry => {
                    return (
                      <TableRow key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Date */}
                        <TableCell className="py-3.5 px-4 text-left text-slate-700 font-medium whitespace-nowrap">
                          {format(new Date(entry.date), 'dd MMMM yyyy', { locale: bn })}
                        </TableCell>

                        {/* Invoice No */}
                        <TableCell className="py-3.5 px-4 text-left">
                          <button
                            type="button"
                            onClick={() => setViewInvoice(entry.rawTx)}
                            className="font-mono font-black text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            <span>{entry.invoiceNo}</span>
                          </button>
                        </TableCell>

                        {/* Category Badge */}
                        <TableCell className="py-3.5 px-4 text-left">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            🚚 বিক্রয় চালান লোডিং চার্জ
                          </span>
                        </TableCell>

                        {/* Customer */}
                        <TableCell className="py-3.5 px-4 text-left">
                          <span className="font-bold text-slate-900 block">{entry.customerName}</span>
                          {entry.deliveryAddress && (
                            <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[150px]">
                              {entry.deliveryAddress}
                            </span>
                          )}
                        </TableCell>

                        {/* Quantity & Rate */}
                        <TableCell className="py-3.5 px-4 text-left font-mono">
                          <div className="space-y-0.5">
                            <span className="text-slate-900 font-bold block">
                              {toBengaliDigits(entry.cementBags)} বস্তা
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              @ ৳{toBengaliDigits(entry.loadingRate.toFixed(2))} / বস্তা
                            </span>
                          </div>
                        </TableCell>

                        {/* Total Loading Cost */}
                        <TableCell className="py-3.5 px-4 text-right font-black text-amber-900 font-mono text-sm">
                          ৳ {toBengaliDigits(entry.loadingAmount.toLocaleString('en-IN'))}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3.5 px-4 text-center whitespace-nowrap">
                          {entry.isPaid ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                পরিশোধিত
                              </span>
                              {entry.paidMethod && (
                                <span className="text-[9px] text-slate-400 block font-normal">
                                  {entry.paidMethod} {entry.paidAt ? `(${format(new Date(entry.paidAt), 'dd/MM')})` : ''}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse">
                              <Clock className="w-3 h-3 text-amber-700" />
                              বকেয়া / প্রদেয়
                            </span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {!entry.isPaid ? (
                              <Button
                                onClick={() => openPayModal(entry)}
                                size="sm"
                                className="h-7 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>পরিশোধ করুন</span>
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handlePrintSlip(entry)}
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 border-slate-200 text-slate-700 font-bold text-[11px] rounded-lg hover:bg-slate-50 flex items-center gap-1"
                              >
                                <Printer className="w-3 h-3 text-slate-500" />
                                <span>রশিদ</span>
                              </Button>
                            )}

                            <Button
                              onClick={() => setViewInvoice(entry.rawTx)}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 rounded-lg"
                              title="চালান দেখুন"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>

                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold">
                      কোনো লোডিং চার্জের রেকর্ড পাওয়া যায়নি
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* 5. SETTLE PAYMENT MODAL */}
        <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
          <DialogContent className="sm:max-w-md bg-white font-bengali">
            <DialogHeader className="border-b pb-3">
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-600" />
                <span>লোডিং ও লেবার চার্জ পরিশোধ</span>
              </DialogTitle>
            </DialogHeader>

            {selectedEntryForPay && (
              <form onSubmit={handleSettlePayment} className="space-y-4 pt-2">
                
                {/* Invoice Context Card */}
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">চালান নম্বর:</span>
                    <span className="font-mono font-black text-slate-900">{selectedEntryForPay.invoiceNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">গ্রাহকের নাম:</span>
                    <span className="font-bold text-slate-900">{selectedEntryForPay.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">সিমেন্ট পরিমাণ:</span>
                    <span className="font-bold text-slate-800">
                      {toBengaliDigits(selectedEntryForPay.cementBags)} বস্তা (@ ৳{toBengaliDigits(selectedEntryForPay.loadingRate)}/বস্তা)
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-amber-200/80 pt-1 text-amber-950 font-black">
                    <span>মোট প্রদেয় লোডিং চার্জ:</span>
                    <span className="text-sm font-mono font-black text-amber-800">
                      ৳ {toBengaliDigits(selectedEntryForPay.loadingAmount.toLocaleString('en-IN'))}
                    </span>
                  </div>
                </div>

                {/* Paid Amount */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">পরিশোধের পরিমাণ (৳) <span className="text-rose-500">*</span></Label>
                  <Input
                    type="number"
                    required
                    value={payAmount || ''}
                    onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                    className="rounded-xl h-10 bg-slate-50 border-slate-200 text-sm font-black font-mono text-emerald-700"
                  />
                </div>

                {/* Sardar / Worker Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">লেবার সর্দার / কর্মীর নাম (প্রাপক)</Label>
                  <Input
                    placeholder="মোঃ কাশেম সর্দার / লেবার টিম"
                    value={sardarName}
                    onChange={e => setSardarName(e.target.value)}
                    className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                  />
                </div>

                {/* Payment Method & Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">পেমেন্ট মাধ্যম</Label>
                    <Select value={payMethod} onValueChange={(val: any) => setPayMethod(val)}>
                      <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="font-bengali text-xs font-bold">
                        <SelectItem value="Cash">💵 নগদ (Cash)</SelectItem>
                        <SelectItem value="Bank">🏦 ব্যাংক ট্রান্সফার</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">পরিশোধের তারিখ</Label>
                    <BengaliDatePicker
                      value={payDate}
                      onChange={setPayDate}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Bank Select if Bank method */}
                {payMethod === 'Bank' && (
                  <div className="space-y-1.5 bg-blue-50/70 p-2.5 rounded-xl border border-blue-200">
                    <Label className="text-xs font-bold text-blue-950">দোকানের ব্যাংক অ্যাকাউন্ট নির্বাচন করুন</Label>
                    <Select value={payBankId} onValueChange={(val: string | null) => setPayBankId(val || '')}>
                      <SelectTrigger className="h-9 rounded-lg bg-white border-blue-200 text-xs font-bold">
                        <SelectValue placeholder="ব্যাংক বাছুন..." />
                      </SelectTrigger>
                      <SelectContent className="font-bengali text-xs">
                        {banks.map(b => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.name} {b.accNo ? `(${b.accNo})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Note */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">মন্তব্য / নোট (ঐচ্ছিক)</Label>
                  <Input
                    placeholder="বিশেষ কোনো নির্দেশনা..."
                    value={payNote}
                    onChange={e => setPayNote(e.target.value)}
                    className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-medium"
                  />
                </div>

                <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPayModalOpen(false)}
                    className="rounded-xl h-9 text-xs font-bold"
                  >
                    বাতিল
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl h-9 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-5 shadow-md flex items-center gap-1.5"
                  >
                    {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>পরিশোধ নিশ্চিত করুন</span>
                  </Button>
                </DialogFooter>

              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* 6. INVOICE DETAILS MODAL VIEW */}
        {viewInvoice && (
          <Dialog open={Boolean(viewInvoice)} onOpenChange={() => setViewInvoice(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-slate-50 font-bengali">
              <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>বিক্রয় চালান বিস্তারিত (Invoice Details)</span>
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setViewInvoice(null)} className="h-8 w-8 p-0 rounded-full">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4">
                <SalesInvoiceDetailsView invoice={viewInvoice} />
              </div>
            </DialogContent>
          </Dialog>
        )}

      </div>
    </Shell>
  );
}
