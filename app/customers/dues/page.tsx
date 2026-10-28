'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import { 
  Receipt, Phone, MapPin, Search, Printer, FileDown, 
  FileSpreadsheet, ArrowUpRight, ArrowDownRight, Users, 
  Wallet, ChevronRight, Eye, RefreshCw, Filter, Building2,
  CheckCircle2, DollarSign, X, Lock, EyeOff
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toBengaliDigits, toEnglishDigits } from '@/lib/bengaliUtils';
import { printElement } from '@/lib/printUtils';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import Link from 'next/link';
import { toast } from 'sonner';

interface CustomerDueItem {
  id: string;
  name: string;
  phone: string;
  address: string;
  businessName: string;
  dueAmount: number;
  advanceAmount: number;
  totalSales: number;
  totalPaid: number;
  invoiceCount: number;
  customerType?: string;
  joinedDate?: string;
}

const formatBnCurrency = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '০';
  const num = Math.round(Number(amount));
  return toBengaliDigits(num.toLocaleString('en-IN'));
};

const formatBnDate = (dateVal: Date | string | undefined | null, pattern: string = 'dd MMMM - yyyy') => {
  if (!dateVal) return '—';
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return String(dateVal);
    const raw = format(d, pattern, { locale: bn });
    return toBengaliDigits(raw);
  } catch {
    return '—';
  }
};

export default function CustomerDuesPage() {
  const [customers, setCustomers] = useState<CustomerDueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'due' | 'advance'>('due');
  const [sortBy, setSortBy] = useState<'due_desc' | 'due_asc' | 'name_asc'>('due_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Waive / Write-off state
  const [waiveCustomer, setWaiveCustomer] = useState<CustomerDueItem | null>(null);
  const [waiveAmount, setWaiveAmount] = useState<number>(0);
  const [waiveReason, setWaiveReason] = useState<string>('খুচরা বকেয়া মওকুফ');
  const [waivePassword, setWaivePassword] = useState<string>('');
  const [showWaivePassword, setShowWaivePassword] = useState<boolean>(false);
  const [isWaiving, setIsWaiving] = useState(false);

  const getWaivePin = () => {
    if (typeof window !== 'undefined') {
      return toEnglishDigits(localStorage.getItem('waive_pin') || localStorage.getItem('commission_pin') || '1234').trim();
    }
    return '1234';
  };

  const handleOpenWaive = (c: CustomerDueItem) => {
    setWaiveCustomer(c);
    setWaiveAmount(Number(Number(c.dueAmount).toFixed(2)));
    setWaiveReason('খুচরা বকেয়া মওকুফ');
    setWaivePassword('');
    setShowWaivePassword(false);
  };

  const handleConfirmWaive = async () => {
    if (!waiveCustomer || waiveAmount <= 0) {
      toast.error('মওকুফের পরিমাণ সঠিক নয়');
      return;
    }
    const currentPin = getWaivePin();
    if (!waivePassword.trim() || toEnglishDigits(waivePassword).trim() !== currentPin) {
      toast.error('ভুল পাসওয়ার্ড! সঠিক মওকুফ সিকিউরিটি পাসওয়ার্ড প্রদান করুন');
      return;
    }
    try {
      setIsWaiving(true);
      // Clean precision: if user waives close to full dueAmount, waive exact remaining due
      const finalWaiveAmount = Math.abs(waiveCustomer.dueAmount - waiveAmount) < 0.5 ? waiveCustomer.dueAmount : waiveAmount;

      const metaJson = JSON.stringify({
        partyId: waiveCustomer.id,
        partyName: waiveCustomer.name,
        partyPhone: waiveCustomer.phone || '',
        partyAddress: waiveCustomer.address || '',
        partyType: 'customer',
        businessName: waiveCustomer.businessName || '',
        discountAmount: finalWaiveAmount,
        previousBalance: waiveCustomer.dueAmount,
        isWaiveOff: true,
        userNote: waiveReason || 'খুচরা বকেয়া মওকুফ'
      });

      const payload: any = {
        party: Number(waiveCustomer.id),
        party_name: waiveCustomer.name,
        party_phone: waiveCustomer.phone || '',
        party_address: waiveCustomer.address || '',
        transaction_type: 'payment_in' as const,
        total_amount: 0,
        paid_amount: 0,
        discount: finalWaiveAmount,
        due_amount: 0,
        payment_method: 'cash',
        status: 'completed',
        notes: metaJson + '\n' + (waiveReason || 'বকেয়া মওকুফ')
      };

      await api.transactions.create(payload);
      toast.success(`${waiveCustomer.name}-এর ৳${toBengaliDigits(Number(finalWaiveAmount).toFixed(2))} টাকা সফলভাবে মওকুফ করা হয়েছে`);
      setWaiveCustomer(null);
      await loadDuesData();
    } catch (err: any) {
      console.error(err);
      toast.error('মওকুফ করতে সমস্যা হয়েছে: ' + (err.message || 'Error'));
    } finally {
      setIsWaiving(false);
    }
  };

  const loadDuesData = async () => {
    try {
      setLoading(true);
      const partyList = await api.parties.list({ party_type: 'customer' });

      // Build customer due records directly from synced party balances (instant load)
      const mapped: CustomerDueItem[] = partyList.map(c => {
        let dueAmount = Number(c.total_due || 0);
        let advanceAmount = Number(c.advance_balance || 0);

        // Clean floating-point precision residues and fractional paisa (< 0.5 Taka)
        if (Math.abs(dueAmount) < 0.5) dueAmount = 0;
        if (Math.abs(advanceAmount) < 0.5) advanceAmount = 0;

        const totalSales = Number(c.total_sales || 0);
        const totalPaid = Math.max(0, totalSales - dueAmount);

        const addressParts = [
          c.address,
          (c as any).thana,
          (c as any).district
        ].filter(Boolean);
        const formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : (c.address || '—');

        return {
          id: String(c.id),
          name: c.name,
          phone: c.phone || '00000000000',
          address: formattedAddress,
          businessName: c.business_name || '',
          dueAmount,
          advanceAmount,
          totalSales,
          totalPaid,
          invoiceCount: 0,
          customerType: c.customer_type || 'খুচরা গ্রাহক',
          joinedDate: c.joined_date
        };
      });

      setCustomers(mapped);
    } catch (e) {
      console.error('Error loading dues:', e);
      toast.error('বকেয়া তালিকা লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      await loadDuesData();
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  // Separate due list and advance deposit list (strictly customers with >= 1 Taka due/advance)
  const dueCustomers = useMemo(() => {
    return customers.filter(c => Math.round(c.dueAmount) > 0);
  }, [customers]);

  const advanceCustomers = useMemo(() => {
    return customers.filter(c => Math.round(c.advanceAmount) > 0);
  }, [customers]);

  const totalDueSum = useMemo(() => {
    return dueCustomers.reduce((acc, c) => acc + Math.round(c.dueAmount), 0);
  }, [dueCustomers]);

  const totalAdvanceSum = useMemo(() => {
    return advanceCustomers.reduce((acc, c) => acc + Math.round(c.advanceAmount), 0);
  }, [advanceCustomers]);

  // Filtered & Sorted list for Screen Display
  const displayedCustomers = useMemo(() => {
    let list = customers;
    if (activeTab === 'due') {
      list = dueCustomers;
    } else if (activeTab === 'advance') {
      list = advanceCustomers;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.businessName.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (activeTab === 'advance') {
        if (sortBy === 'due_desc') return b.advanceAmount - a.advanceAmount;
        if (sortBy === 'due_asc') return a.advanceAmount - b.advanceAmount;
      } else {
        if (sortBy === 'due_desc') return b.dueAmount - a.dueAmount;
        if (sortBy === 'due_asc') return a.dueAmount - b.dueAmount;
      }
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'bn');
      return 0;
    });
  }, [customers, dueCustomers, advanceCustomers, activeTab, searchQuery, sortBy]);

  const totalItems = displayedCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedCustomers = displayedCustomers.slice(startIndex, endIndex);

  const handlePrint = () => {
    printElement('customer-dues-printable-sheet');
  };

  const handleExportCSV = () => {
    let csvContent = "\uFEFFক্রমিক,নাম,ব্যবসা/প্রতিষ্ঠান,ঠিকানা,মোবাইল,বকেয়ার পরিমাণ (৳),অগ্রিম জমা (৳)\n";
    
    customers.forEach((c, idx) => {
      const name = `"${c.name.replace(/"/g, '""')}"`;
      const biz = `"${c.businessName.replace(/"/g, '""')}"`;
      const addr = `"${c.address.replace(/"/g, '""')}"`;
      const phone = `"${c.phone}"`;
      csvContent += `${idx + 1},${name},${biz},${addr},${phone},${c.dueAmount},${c.advanceAmount}\n`;
    });

    csvContent += `\n,,সর্বমোট বকেয়া,,,,${totalDueSum}\n`;
    csvContent += `,,সর্বমোট অগ্রিম জমা,,,,${totalAdvanceSum}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `মেসার্স_দেলোয়ার_এন্ড_ব্রাদার্স_বাকী_তালিকা_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV ফাইল ডাউনলোড হয়েছে');
  };

  return (
    <Shell>
      {/* ========================================================================= */}
      {/* 🖥️ SCREEN VIEW: INTERACTIVE DASHBOARD & MANAGEMENT TABLE */}
      {/* ========================================================================= */}
      <div className="space-y-6 font-bengali print:hidden pb-12">
        
        {/* TOP BREADCRUMB & HEADER ACTION BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
              <Link href="/customers" className="hover:text-blue-600 transition-colors">কাস্টমার</Link>
              <span>&gt;</span>
              <span className="text-slate-700">বাকী ও জমার তালিকা</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 mt-1">
              <Receipt className="w-7 h-7 text-rose-600" /> গ্রাহকদের বাকী তালিকা
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              সকল কাস্টমারের বর্তমান বকেয়া ও অগ্রিম জমার হিসাব বিবরণী
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={handlePrint}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 px-5 rounded-xl shadow-md shadow-slate-900/20 active:scale-95 transition-all text-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-1.5" /> তালিকা প্রিন্ট করুন
            </Button>

            <Button
              onClick={handlePrint}
              variant="outline"
              className="h-11 px-4 rounded-xl border-slate-300 text-slate-700 bg-white font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              <FileDown className="w-4 h-4 mr-1.5 text-rose-600" /> পিডিএফ ডাউনলোড
            </Button>

            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="h-11 px-4 rounded-xl border-slate-300 text-slate-700 bg-white font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" /> এক্সেল / সিএসভি
            </Button>

            <Button
              onClick={loadDuesData}
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="রিফ্রেশ করুন"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-blue-600")} />
            </Button>
          </div>
        </div>

        {/* 4 TOP SUMMARY STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1: মোট বাকি গ্রাহক */}
          <Card className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-2xs hover:border-rose-200 transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">মোট বাকি গ্রাহক</p>
                <h3 className="text-2xl font-black text-rose-600 mt-0.5">
                  {toBengaliDigits(dueCustomers.length)} <span className="text-xs font-bold text-slate-400">জন</span>
                </h3>
              </div>
            </div>
          </Card>

          {/* CARD 2: সর্বমোট বাকি */}
          <Card className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-2xs hover:border-rose-300 transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100/70 text-rose-700 flex items-center justify-center font-bold flex-shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">সর্বমোট পাওনা (বাকি)</p>
                <h3 className="text-2xl font-black text-rose-700 mt-0.5">
                  ৳ {formatBnCurrency(totalDueSum)}
                </h3>
              </div>
            </div>
          </Card>

          {/* CARD 3: অগ্রিম জমা গ্রাহক */}
          <Card className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-2xs hover:border-emerald-200 transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">অগ্রিম জমা গ্রাহক</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-0.5">
                  {toBengaliDigits(advanceCustomers.length)} <span className="text-xs font-bold text-slate-400">জন</span>
                </h3>
              </div>
            </div>
          </Card>

          {/* CARD 4: সর্বমোট অগ্রিম জমা */}
          <Card className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-2xs hover:border-emerald-300 transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">মোট অগ্রিম জমা</p>
                <h3 className="text-2xl font-black text-emerald-700 mt-0.5">
                  ৳ {formatBnCurrency(totalAdvanceSum)}
                </h3>
              </div>
            </div>
          </Card>
        </div>

        {/* SEARCH & FILTER CONTROLS BAR */}
        <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="গ্রাহকের নাম, মোবাইল বা ঠিকানা দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-9 rounded-xl h-10 bg-slate-50/50 border-slate-200 text-xs font-bold w-full"
              />
            </div>

            {/* Segmented Tab Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto">
              <button
                type="button"
                onClick={() => { setActiveTab('due'); setCurrentPage(1); }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 md:flex-initial text-center",
                  activeTab === 'due' 
                    ? "bg-white text-rose-700 shadow-xs border border-rose-200" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                বাকি তালিকা ({toBengaliDigits(dueCustomers.length)})
              </button>
              
              <button
                type="button"
                onClick={() => { setActiveTab('advance'); setCurrentPage(1); }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 md:flex-initial text-center",
                  activeTab === 'advance' 
                    ? "bg-white text-emerald-700 shadow-xs border border-emerald-200" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                অগ্রিম জমা ({toBengaliDigits(advanceCustomers.length)})
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 md:flex-initial text-center",
                  activeTab === 'all' 
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                সব গ্রাহক ({toBengaliDigits(customers.length)})
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="w-full md:w-48 shrink-0">
              <Select value={sortBy} onValueChange={(val: any) => { setSortBy(val); setCurrentPage(1); }}>
                <SelectTrigger className="rounded-xl h-10 bg-slate-50/50 border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  <SelectItem value="due_desc">
                    {activeTab === 'advance' ? 'সর্বোচ্চ অগ্রিম আগে' : 'সর্বোচ্চ বাকি আগে'}
                  </SelectItem>
                  <SelectItem value="due_asc">
                    {activeTab === 'advance' ? 'সর্বনিম্ন অগ্রিম আগে' : 'সর্বনিম্ন বাকি আগে'}
                  </SelectItem>
                  <SelectItem value="name_asc">নাম অনুযায়ী (ক-ক্ষ)</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </Card>

        {/* DATA TABLE CONTAINER */}
        <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <TableRow>
                    <TableHead className="w-14 text-center font-black text-xs py-3.5">ক্র:</TableHead>
                    <TableHead className="font-black text-xs">গ্রাহকের নাম ও প্রতিষ্ঠান</TableHead>
                    <TableHead className="font-black text-xs">ঠিকানা</TableHead>
                    <TableHead className="font-black text-xs text-center">মোবাইল নম্বর</TableHead>
                    <TableHead className="font-black text-xs text-right">বকেয়া / জমার পরিমাণ</TableHead>
                    <TableHead className="w-24 text-center font-black text-xs">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-slate-400 font-bold text-sm">
                        লোড হচ্ছে...
                      </TableCell>
                    </TableRow>
                  ) : displayedCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Receipt className="w-10 h-10 mb-2 opacity-20" />
                          <p className="font-bold text-sm">কোনো রেকর্ড পাওয়া যায়নি</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCustomers.map((c, idx) => (
                      <TableRow 
                        key={c.id}
                        className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors text-xs"
                      >
                        <TableCell className="text-center font-mono font-bold text-slate-600 py-3.5">
                          {toBengaliDigits(startIndex + idx + 1)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-black text-slate-900 block text-[13px]">{c.name}</span>
                            {c.businessName && c.businessName !== c.name && (
                              <span className="text-[11px] text-slate-500 font-semibold block">{c.businessName}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-700 max-w-[200px] truncate" title={c.address}>
                          {c.address || '—'}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-slate-800">
                          {toBengaliDigits(c.phone)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">
                          {c.dueAmount > 0 ? (
                            <span className="text-rose-600">৳ {formatBnCurrency(c.dueAmount)}</span>
                          ) : c.advanceAmount > 0 ? (
                            <span className="text-emerald-600">৳ {formatBnCurrency(c.advanceAmount)} (জমা)</span>
                          ) : (
                            <span className="text-slate-400">০.০০</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-1.5">
                            {c.dueAmount > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenWaive(c)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px] transition-colors border border-rose-200/80 cursor-pointer shadow-2xs"
                                title="বকেয়া মওকুফ / ডিসকাউন্ট অ্যাডজাস্ট"
                              >
                                <DollarSign className="w-3 h-3 text-rose-600" />
                                <span>মওকুফ</span>
                              </button>
                            )}
                            <Link 
                              href={`/customers/${c.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] transition-colors"
                            >
                              <Eye className="w-3 h-3" /> লেজার
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* TABLE SUMMARY FOOTER */}
            {!loading && displayedCustomers.length > 0 && (
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-700">
                <div>
                  মোট দেখানো হচ্ছে: <strong className="text-slate-900">{toBengaliDigits(totalItems)}</strong> জন গ্রাহকের মধ্যে {toBengaliDigits(startIndex + 1)} থেকে {toBengaliDigits(endIndex)}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span>
                    মোট বকেয়া: <strong className="text-rose-600">৳ {formatBnCurrency(displayedCustomers.reduce((a, b) => a + b.dueAmount, 0))}</strong>
                  </span>
                  {activeTab !== 'due' && (
                    <span>
                      মোট অগ্রিম জমা: <strong className="text-emerald-600">৳ {formatBnCurrency(displayedCustomers.reduce((a, b) => a + b.advanceAmount, 0))}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Pagination Controls Footer */}
            {!loading && totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-slate-200/80 bg-white text-xs font-semibold text-slate-500">
                <div>
                  পৃষ্ঠা <strong className="text-slate-900 font-bold">{toBengaliDigits(validCurrentPage)}</strong> / {toBengaliDigits(totalPages)}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage(1)}
                    className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600 disabled:opacity-40"
                    title="প্রথম পেজ"
                  >
                    «
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600 disabled:opacity-40"
                    title="পূর্ববর্তী পেজ"
                  >
                    ‹
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                    .map((page, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && page - prev > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && <span className="text-slate-400 px-1 text-xs">...</span>}
                          <Button
                            variant={validCurrentPage === page ? "default" : "outline"}
                            onClick={() => setCurrentPage(page)}
                            className={cn(
                              "w-7 h-7 rounded-lg text-xs font-bold p-0",
                              validCurrentPage === page
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "border-slate-200 text-slate-600 hover:bg-slate-100"
                            )}
                          >
                            {toBengaliDigits(page)}
                          </Button>
                        </React.Fragment>
                      );
                    })}

                  <Button 
                    variant="outline" 
                    size="icon" 
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600 disabled:opacity-40"
                    title="পরবর্তী পেজ"
                  >
                    ›
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600 disabled:opacity-40"
                    title="শেষ পেজ"
                  >
                    »
                  </Button>

                  <Select 
                    value={String(pageSize)} 
                    onValueChange={(val) => {
                      setPageSize(Number(val));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-24 h-7 rounded-lg border-slate-200 text-xs font-bold ml-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-bengali text-xs">
                      <SelectItem value="10">১০ / পেজ</SelectItem>
                      <SelectItem value="25">২৫ / পেজ</SelectItem>
                      <SelectItem value="50">৫০ / পেজ</SelectItem>
                      <SelectItem value="100">১০০ / পেজ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ========================================================================= */}
      {/* 🖨️ A4 PRINTABLE DUE & ADVANCE SHEET (EXACT 1-TO-1 MATCH WITH USER PHOTO) */}
      {/* ========================================================================= */}
      <div 
        id="customer-dues-printable-sheet" 
        className="hidden print:block font-bengali text-black text-[12px] leading-tight p-0 m-0"
        style={{ color: '#000000', backgroundColor: '#ffffff', width: '100%', minHeight: '275mm', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
      >
        
        {/* ========================================================= */}
        {/* SECTION 1: বাকী তালিকা (DUE CUSTOMER LIST) */}
        {/* ========================================================= */}
        <div className="space-y-0">
          
          {/* HEADER BOX: মেসার্স দেলোয়ার এন্ড ব্রাদার্স গোপালগঞ্জ শাখা */}
          <div style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'center', backgroundColor: '#ffffff' }}>
            <h1 style={{ fontSize: '15px', fontWeight: 900, margin: 0, padding: 0 }}>
              মেসার্স দেলোয়ার এন্ড ব্রাদার্স গোপালগঞ্জ শাখা
            </h1>
            <p style={{ fontSize: '12px', fontWeight: 700, margin: '2px 0 0 0' }}>
              বাকী তালিকা {formatBnDate(new Date(), 'dd MMMM - yyyy')}
            </p>
          </div>

          {/* TABLE: BAKI LIST */}
          <table 
            style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              border: '1px solid #000000',
              marginTop: '-1px',
              fontSize: '11.5px'
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#ffffff' }}>
                <th style={{ width: '6%', border: '1px solid #000000', padding: '4px 3px', textAlign: 'center', fontWeight: 800 }}>
                  ক্র:
                </th>
                <th style={{ width: '34%', border: '1px solid #000000', padding: '4px 6px', textAlign: 'left', fontWeight: 800 }}>
                  নাম
                </th>
                <th style={{ width: '24%', border: '1px solid #000000', padding: '4px 6px', textAlign: 'center', fontWeight: 800 }}>
                  ঠিকানা
                </th>
                <th style={{ width: '18%', border: '1px solid #000000', padding: '4px 4px', textAlign: 'center', fontWeight: 800 }}>
                  মোবাইল
                </th>
                <th style={{ width: '18%', border: '1px solid #000000', padding: '4px 6px', textAlign: 'right', fontWeight: 800 }}>
                  টাকা
                </th>
              </tr>
            </thead>

            <tbody>
              {dueCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ border: '1px solid #000000', padding: '12px', textAlign: 'center', fontWeight: 700 }}>
                    বর্তমানে কোনো বকেয়া গ্রাহক নেই
                  </td>
                </tr>
              ) : (
                dueCustomers.map((c, i) => (
                  <tr key={c.id} style={{ pageBreakInside: 'avoid' }}>
                    <td style={{ border: '1px solid #000000', padding: '3px 3px', textAlign: 'center', fontWeight: 700 }}>
                      {toBengaliDigits(i + 1)}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '3px 6px', textAlign: 'left', fontWeight: 700 }}>
                      {c.name}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '3px 6px', textAlign: 'center', fontWeight: 600 }}>
                      {c.address || '—'}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center', fontWeight: 600, fontFamily: 'monospace' }}>
                      {toBengaliDigits(c.phone || '00000000000')}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '3px 6px', textAlign: 'right', fontWeight: 700 }}>
                      {formatBnCurrency(c.dueAmount)}
                    </td>
                  </tr>
                ))
              )}

              {/* TOTAL DUE FOOTER ROW */}
              <tr style={{ fontWeight: 900 }}>
                <td 
                  colSpan={4} 
                  style={{ 
                    border: '1px solid #000000', 
                    padding: '4px 6px', 
                    textAlign: 'center', 
                    fontWeight: 800,
                    fontSize: '12px'
                  }}
                >
                  মোট বাকি:
                </td>
                <td 
                  style={{ 
                    border: '1px solid #000000', 
                    padding: '4px 6px', 
                    textAlign: 'right', 
                    fontWeight: 900,
                    fontSize: '12px'
                  }}
                >
                  {formatBnCurrency(totalDueSum)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2: অগ্রীম জমা আছে (ADVANCE DEPOSIT LIST) */}
        {/* ========================================================= */}
        {advanceCustomers.length > 0 && (
          <div className="space-y-0" style={{ marginTop: '-1px' }}>
            
            {/* HEADER BOX: অগ্রীম জমা আছে */}
            <div style={{ border: '1px solid #000000', marginTop: '-1px', padding: '4px 8px', textAlign: 'center', backgroundColor: '#ffffff' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 900, margin: 0, padding: 0 }}>
                মেসার্স দেলোয়ার এন্ড ব্রাদার্স গোপালগঞ্জ শাখা
              </h2>
              <p style={{ fontSize: '12px', fontWeight: 700, margin: '2px 0 0 0' }}>
                অগ্রীম জমা আছে
              </p>
            </div>

            {/* TABLE: ADVANCE LIST */}
            <table 
              style={{ 
                width: '100%', 
                borderCollapse: 'collapse', 
                border: '1px solid #000000',
                marginTop: '-1px',
                fontSize: '11.5px'
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#ffffff' }}>
                  <th style={{ width: '6%', border: '1px solid #000000', padding: '4px 3px', textAlign: 'center', fontWeight: 800 }}>
                    ক্র:
                  </th>
                  <th style={{ width: '34%', border: '1px solid #000000', padding: '4px 6px', textAlign: 'left', fontWeight: 800 }}>
                    নাম
                  </th>
                  <th style={{ width: '24%', border: '1px solid #000000', padding: '4px 6px', textAlign: 'center', fontWeight: 800 }}>
                    ঠিকানা
                  </th>
                  <th style={{ width: '18%', border: '1px solid #000000', padding: '4px 4px', textAlign: 'center', fontWeight: 800 }}>
                    মোবাইল
                  </th>
                  <th style={{ width: '18%', border: '1px solid #000000', padding: '4px 6px', textAlign: 'right', fontWeight: 800 }}>
                    টাকা
                  </th>
                </tr>
              </thead>

              <tbody>
                {advanceCustomers.map((c, i) => (
                  <tr key={c.id} style={{ pageBreakInside: 'avoid' }}>
                    <td style={{ border: '1px solid #000000', padding: '3px 3px', textAlign: 'center', fontWeight: 700 }}>
                      {toBengaliDigits(i + 1)}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '3px 6px', textAlign: 'left', fontWeight: 700 }}>
                      {c.name}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '3px 6px', textAlign: 'center', fontWeight: 600 }}>
                      {c.address || '—'}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center', fontWeight: 600, fontFamily: 'monospace' }}>
                      {toBengaliDigits(c.phone || '00000000000')}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '3px 6px', textAlign: 'right', fontWeight: 700 }}>
                      {formatBnCurrency(c.advanceAmount)}
                    </td>
                  </tr>
                ))}

                {/* TOTAL ADVANCE FOOTER ROW */}
                <tr style={{ fontWeight: 900 }}>
                  <td 
                    colSpan={4} 
                    style={{ 
                      border: '1px solid #000000', 
                      padding: '4px 6px', 
                      textAlign: 'center', 
                      fontWeight: 800,
                      fontSize: '12px'
                    }}
                  >
                    মোট অগ্রীম জমা আছে
                  </td>
                  <td 
                    style={{ 
                      border: '1px solid #000000', 
                      padding: '4px 6px', 
                      textAlign: 'right', 
                      fontWeight: 900,
                      fontSize: '12px'
                    }}
                  >
                    {formatBnCurrency(totalAdvanceSum)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* DEVELOPER BRANDING FOOTER (PRINT - ALWAYS AT BOTTOM) */}
        <div 
          data-has-dev-footer="true" 
          style={{ 
            marginTop: 'auto', 
            paddingTop: '6px', 
            borderTop: '1px solid #e2e8f0', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            fontSize: '9px', 
            fontWeight: 400, 
            color: '#64748b',
            pageBreakInside: 'avoid',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/developer-logo.png" alt="" style={{ height: '14px', width: '14px', objectFit: 'contain', opacity: 0.65, filter: 'grayscale(100%)', borderRadius: '2px' }} />
            <span style={{ border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '7px', fontWeight: 700, padding: '0.5px 3px', borderRadius: '2px', textTransform: 'uppercase' }}>SYS</span>
            <span>সফটওয়্যার পরিচালনায়: <strong style={{ color: '#475569', fontWeight: 600 }}>Hasanah Tech Solution</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace', fontSize: '8.5px' }}>
            <span>www.hasanahtech.vercel.app</span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span>হটলাইন: <strong style={{ color: '#475569', fontWeight: 600 }}>০১৩৪৯৩৪৫৩৫৩</strong></span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 🪙 WAIVE / WRITE-OFF CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(waiveCustomer)} onOpenChange={(open) => { if (!open) setWaiveCustomer(null); }}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6 font-bengali">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </span>
              <span>বকেয়া মওকুফ / রাইট-অফ (Waive-off)</span>
            </DialogTitle>
          </DialogHeader>

          {waiveCustomer && (
            <div className="space-y-4 py-2">
              {/* Customer summary card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold">গ্রাহকের নাম:</span>
                  <span className="text-sm font-black text-slate-900">{waiveCustomer.name}</span>
                </div>
                {waiveCustomer.businessName && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-bold">প্রতিষ্ঠান:</span>
                    <span className="text-xs font-bold text-slate-700">{waiveCustomer.businessName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold">বর্তমান বকেয়া:</span>
                  <span className="text-sm font-black text-rose-600">৳ {formatBnCurrency(waiveCustomer.dueAmount)}</span>
                </div>
              </div>

              {/* Waive amount input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">মওকুফের পরিমাণ (টাকা):</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                  <Input
                    type="number"
                    step="any"
                    value={waiveAmount || ''}
                    onChange={(e) => setWaiveAmount(Number(e.target.value) || 0)}
                    className="pl-8 rounded-xl font-mono font-black text-sm h-10 border-slate-200"
                    placeholder="০"
                    max={waiveCustomer.dueAmount}
                  />
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setWaiveAmount(Number(Number(waiveCustomer.dueAmount).toFixed(2)))}
                    className="text-[11px] font-bold text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded cursor-pointer"
                  >
                    সম্পূর্ণ বকেয়া (৳{toBengaliDigits(Number(waiveCustomer.dueAmount).toFixed(2))})
                  </button>
                  {Math.round(waiveCustomer.dueAmount) > 20 && (
                    <button
                      type="button"
                      onClick={() => setWaiveAmount(20)}
                      className="text-[11px] font-bold text-slate-600 hover:underline bg-slate-100 px-2 py-0.5 rounded cursor-pointer"
                    >
                      ২০ টাকা
                    </button>
                  )}
                  {Math.round(waiveCustomer.dueAmount) > 10 && (
                    <button
                      type="button"
                      onClick={() => setWaiveAmount(10)}
                      className="text-[11px] font-bold text-slate-600 hover:underline bg-slate-100 px-2 py-0.5 rounded cursor-pointer"
                    >
                      ১০ টাকা
                    </button>
                  )}
                </div>
              </div>

              {/* Reason input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">মওকুফের কারণ / বিবরণ:</Label>
                <Input
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  className="rounded-xl text-xs font-bold h-10 border-slate-200"
                  placeholder="যেমন: খুচরা বকেয়া মওকুফ"
                />
              </div>

              {/* Security PIN input */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    মওকুফ সিকিউরিটি পাসওয়ার্ড:
                  </Label>
                  <span className="text-[10px] text-slate-400 font-semibold">(সেটিংস থেকে পরিবর্তনযোগ্য)</span>
                </div>
                <div className="relative">
                  <Input
                    type={showWaivePassword ? "text" : "password"}
                    value={waivePassword}
                    onChange={(e) => setWaivePassword(e.target.value)}
                    placeholder="পাসওয়ার্ড লিখুন (যেমন: 1234)"
                    data-no-bangla="true"
                    name="password"
                    autoComplete="off"
                    className="no-bangla rounded-xl text-xs font-bold h-10 border-slate-200 pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWaivePassword(!showWaivePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showWaivePassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                  >
                    {showWaivePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {waivePassword && toEnglishDigits(waivePassword).trim() !== getWaivePin() ? (
                  <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                    ⚠️ ভুল পাসওয়ার্ড! সঠিক মওকুফ সিকিউরিটি পাসওয়ার্ড প্রদান করুন
                  </p>
                ) : waivePassword ? (
                  <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                    ✓ পাসওয়ার্ড সঠিক হয়েছে, মওকুফ নিশ্চিত করতে পারেন
                  </p>
                ) : null}
              </div>

              {/* Result explanation */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11.5px] font-bold text-amber-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  এই ৳{toBengaliDigits(waiveAmount)} টাকা ডিসকাউন্ট হিসেবে অ্যাডজাস্ট হবে। এরপর অবশিষ্ট বকেয়া থাকবে: <strong>৳{toBengaliDigits(Math.max(0, Math.round(waiveCustomer.dueAmount - waiveAmount)))}</strong> এবং গ্রাহক বকেয়া তালিকা থেকে মুক্ত হবেন।
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWaiveCustomer(null)}
              disabled={isWaiving}
              className="rounded-xl text-xs font-bold h-9"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={handleConfirmWaive}
              disabled={isWaiving || waiveAmount <= 0 || !waivePassword.trim() || toEnglishDigits(waivePassword).trim() !== getWaivePin()}
              className="rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white h-9 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isWaiving ? 'মওকুফ হচ্ছে...' : 'মওকুফ নিশ্চিত করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

