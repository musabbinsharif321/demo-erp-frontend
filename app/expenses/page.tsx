'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import {
  Plus, Search, Filter, ArrowUpRight, ArrowDownRight, Wallet,
  TrendingUp, Calendar, DollarSign, AlertCircle, CheckCircle2, Printer, UploadCloud, X,
  Building2, User, Phone, ShieldCheck, FileText, Check, ArrowLeft, Eye, Edit2,
  FileSpreadsheet, FileDown, Clock, PieChart, ChevronLeft, ChevronRight, Lightbulb,
  Zap, Droplets, Wifi, Smartphone, Home, Users, Truck, Wrench, Coffee, MoreVertical,
  Link as LinkIcon, RefreshCcw, Camera, BarChart3, ChevronDown, Settings, Layers
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, isToday, isSameMonth, isSameYear } from 'date-fns';
import { bn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toBengaliDigits } from '@/lib/bengaliUtils';
import { BengaliDatePicker } from '@/components/ui/BengaliDatePicker';
import { useAuth } from '@/lib/authContext';

export interface ExpenseItem {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  time?: string;
  vendor?: string;
  billNo?: string;
  accountNo?: string;
  status: 'পরিশোধিত' | 'বকেয়া';
  paymentMethod?: 'Cash' | 'Bank';
  bankId?: string;
  note?: string;
  attachmentUrl?: string;
  createdAt: any;
}

interface Bank {
  id: string;
  name: string;
  accNo: string;
  balance: number;
}

// Category Definition Helper
const defaultCategories = [
  { id: 'all', name: 'সব খরচ', icon: Wallet, color: 'bg-emerald-50 text-emerald-700' },
  { id: 'বিদ্যুৎ বিল', name: 'বিদ্যুৎ বিল', icon: Zap, color: 'bg-amber-500 text-white' },
  { id: 'পানি বিল', name: 'পানি বিল', icon: Droplets, color: 'bg-blue-500 text-white' },
  { id: 'ইন্টারনেট বিল', name: 'ইন্টারনেট বিল', icon: Wifi, color: 'bg-purple-500 text-white' },
  { id: 'মোবাইল বিল', name: 'মোবাইল বিল', icon: Smartphone, color: 'bg-pink-500 text-white' },
  { id: 'দোকান ভাড়া', name: 'দোকান ভাড়া', icon: Home, color: 'bg-rose-500 text-white' },
  { id: 'কর্মচারী বেতন', name: 'কর্মচারী বেতন', icon: Users, color: 'bg-indigo-500 text-white' },
  { id: 'পরিবহন খরচ', name: 'পরিবহন খরচ', icon: Truck, color: 'bg-teal-500 text-white' },
  { id: 'মেরামত খরচ', name: 'মেরামত খরচ', icon: Wrench, color: 'bg-orange-500 text-white' },
  { id: 'চা/নাস্তা আপ্যায়ন', name: 'চা/নাস্তা আপ্যায়ন', icon: Coffee, color: 'bg-yellow-600 text-white' },
  { id: 'সাধারণ খরচ', name: 'সাধারণ খরচ', icon: Layers, color: 'bg-slate-600 text-white' },
  { id: 'অন্যান্য খরচ', name: 'অন্যান্য খরচ', icon: Layers, color: 'bg-slate-700 text-white' },
];

export default function ExpensePage() {
  const { canModifyData } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [dbCategories, setDbCategories] = useState<{ id: number | string; name: string }[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isUploadReceiptOpen, setIsUploadReceiptOpen] = useState(false);
  const [selectedExpenseForView, setSelectedExpenseForView] = useState<ExpenseItem | null>(null);

  // Compute all merged categories (default + database + from expenses)
  const allCategories = useMemo(() => {
    const list = defaultCategories.filter(c => c.id !== 'all');
    const existingNames = new Set(list.map(c => c.name.trim().toLowerCase()));

    dbCategories.forEach(dbCat => {
      if (dbCat.name && !existingNames.has(dbCat.name.trim().toLowerCase())) {
        existingNames.add(dbCat.name.trim().toLowerCase());
        list.push({
          id: dbCat.name,
          name: dbCat.name,
          icon: Layers,
          color: 'bg-indigo-600 text-white'
        });
      }
    });

    expenses.forEach(exp => {
      const cat = (exp.category || exp.title || '').trim();
      if (cat && !existingNames.has(cat.toLowerCase())) {
        existingNames.add(cat.toLowerCase());
        list.push({
          id: cat,
          name: cat,
          icon: Layers,
          color: 'bg-slate-600 text-white'
        });
      }
    });

    return list;
  }, [dbCategories, expenses]);

  // Floating Action Menu state (Fixed viewport popup identical to transactions page)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; openUp: boolean }>({ top: 0, left: 0, openUp: false });
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const handleToggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (openMenuId === id) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 200; // flip upward if not enough space at bottom

    setOpenMenuId(id);
    setMenuPos({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left: rect.right - 176,
      openUp
    });
  };

  useEffect(() => {
    const handleDismiss = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-expense-menu]')) {
        setOpenMenuId(null);
      }
    };
    const handleScroll = () => setOpenMenuId(null);

    window.addEventListener('click', handleDismiss);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('click', handleDismiss);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const [newExpense, setNewExpense] = useState({
    category: 'বিদ্যুৎ বিল',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'পরিশোধিত' as 'পরিশোধিত' | 'বকেয়া',
    paymentMethod: 'Cash' as 'Cash' | 'Bank',
    bankId: '',
    notes: '',
  });

  const handleOpenCreateExpense = () => {
    setEditingExpenseId(null);
    setNewExpense({
      category: allCategories[0]?.name || 'বিদ্যুৎ বিল',
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'পরিশোধিত',
      paymentMethod: 'Cash',
      bankId: banks[0]?.id || '',
      notes: '',
    });
    setIsAddExpenseOpen(true);
  };

  const handleEditExpense = (exp: ExpenseItem) => {
    setEditingExpenseId(exp.id);
    setNewExpense({
      category: exp.category || exp.title || 'সাধারণ খরচ',
      amount: exp.amount || 0,
      date: exp.date || format(new Date(), 'yyyy-MM-dd'),
      status: exp.status || 'পরিশোধিত',
      paymentMethod: exp.paymentMethod || 'Cash',
      bankId: exp.bankId || banks[0]?.id || '',
      notes: exp.note || '',
    });
    setIsAddExpenseOpen(true);
  };

  const fetchExpensesAndBanks = useCallback(async () => {
    try {
      const [list, bankList, catList] = await Promise.all([
        api.expenses.list(),
        api.banks.list(),
        api.expenseCategories.list()
      ]);

      const safeList = Array.isArray(list) ? list : [];
      setExpenses(safeList.map(e => ({
        id: String(e.id),
        title: e.title || e.category_name || 'সাধারণ খরচ',
        category: e.category_name || e.title || 'সাধারণ খরচ',
        amount: Number(e.amount || 0),
        date: e.date || new Date().toISOString().split('T')[0],
        vendor: e.reference_no || '',
        status: 'পরিশোধিত',
        paymentMethod: e.payment_method === 'bank' ? 'Bank' : 'Cash',
        bankId: e.bank_account ? String(e.bank_account) : '',
        note: e.notes || '',
        createdAt: e.date
      })));

      const safeBanks = Array.isArray(bankList) ? bankList : [];
      setBanks(safeBanks.map(b => ({
        id: String(b.id),
        name: b.name,
        accNo: b.account_number || '',
        balance: Number(b.balance || 0)
      })));

      const safeCats = Array.isArray(catList) ? catList : [];
      setDbCategories(safeCats);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.expenses.list(),
      api.banks.list(),
      api.expenseCategories.list()
    ]).then(([list, bankList, catList]) => {
      if (!isMounted) return;
      const safeList = Array.isArray(list) ? list : [];
      setExpenses(safeList.map(e => ({
        id: String(e.id),
        title: e.title || e.category_name || 'সাধারণ খরচ',
        category: e.category_name || e.title || 'সাধারণ খরচ',
        amount: Number(e.amount || 0),
        date: e.date || new Date().toISOString().split('T')[0],
        vendor: e.reference_no || '',
        status: 'পরিশোধিত',
        paymentMethod: e.payment_method === 'bank' ? 'Bank' : 'Cash',
        bankId: e.bank_account ? String(e.bank_account) : '',
        note: e.notes || '',
        createdAt: e.date
      })));

      const safeBanks = Array.isArray(bankList) ? bankList : [];
      setBanks(safeBanks.map(b => ({
        id: String(b.id),
        name: b.name,
        accNo: b.account_number || '',
        balance: Number(b.balance || 0)
      })));

      const safeCats = Array.isArray(catList) ? catList : [];
      setDbCategories(safeCats);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching expenses:', err);
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddNewCategory = async () => {
    const name = newCategoryInput.trim();
    if (!name) return;
    try {
      const created = await api.expenseCategories.create({ name });
      setDbCategories(prev => [...prev, created]);
      setNewExpense(prev => ({ ...prev, category: created.name }));
      setNewCategoryInput('');
      setIsAddCategoryOpen(false);
      toast.success(`'${name}' ক্যাটাগরি সফলভাবে তৈরি করা হয়েছে`);
    } catch (err: any) {
      setNewExpense(prev => ({ ...prev, category: name }));
      setIsAddCategoryOpen(false);
      setNewCategoryInput('');
      toast.success(`'${name}' ক্যাটাগরি নির্বাচন করা হয়েছে`);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = (newExpense.category || '').trim();
    if (!finalCategory || newExpense.amount <= 0) {
      toast.error('খরচের ক্যাটাগরি ও সঠিক টাকার পরিমাণ প্রদান করুন');
      return;
    }

    try {
      const stats = await api.dashboard.getStats();
      const isBank = newExpense.paymentMethod === 'Bank';
      if (isBank) {
        let availBank = stats.totalBank || 0;
        let bankTitle = 'ব্যাংক';
        if (newExpense.bankId) {
          const selectedBankObj = banks.find(b => String(b.id) === String(newExpense.bankId));
          if (selectedBankObj) {
            availBank = selectedBankObj.balance;
            bankTitle = `'${selectedBankObj.name}'`;
          }
        }
        if (newExpense.amount > availBank) {
          toast.error(`পর্যাপ্ত ব্যাংক ব্যালেন্স নেই! (নির্বাচিত ${bankTitle} একাউন্ট ব্যালেন্স: ৳ ${availBank.toLocaleString('bn-BD')}, খরচ দিতে চাচ্ছেন: ৳ ${newExpense.amount.toLocaleString('bn-BD')})। পর্যাপ্ত ব্যালেন্স না থাকলে খরচ যোগ করা যাবে না।`);
          return;
        }
      } else {
        const availCash = stats.totalCash || 0;
        if (newExpense.amount > availCash) {
          toast.error(`পর্যাপ্ত নগদ ক্যাশ ব্যালেন্স নেই! (বর্তমান ক্যাশ ব্যালেন্স: ৳ ${availCash.toLocaleString('bn-BD')}, খরচ দিতে চাচ্ছেন: ৳ ${newExpense.amount.toLocaleString('bn-BD')})। ক্যাশে পর্যাপ্ত ব্যালেন্স না থাকলে খরচ যোগ করা যাবে না।`);
          return;
        }
      }
    } catch (err) {
      console.warn('Balance pre-check failed:', err);
    }

    try {
      const payload = {
        title: finalCategory,
        category_name: finalCategory,
        amount: newExpense.amount,
        date: newExpense.date,
        payment_method: newExpense.paymentMethod === 'Bank' ? 'bank' : 'cash',
        bank_account: newExpense.paymentMethod === 'Bank' && newExpense.bankId ? Number(newExpense.bankId) : null,
        notes: newExpense.notes?.trim() || '',
      };

      if (editingExpenseId) {
        await api.expenses.update(editingExpenseId, payload);
        toast.success('খরচ সফলভাবে আপডেট করা হয়েছে');
      } else {
        await api.expenses.create(payload);
        toast.success('নতুন খরচ সফলভাবে সংরক্ষণ করা হয়েছে');
      }

      setIsAddExpenseOpen(false);
      setEditingExpenseId(null);
      fetchExpensesAndBanks();
    } catch (err: any) {
      console.error(err);
      toast.error('খরচ সংরক্ষণ করতে সমস্যা হয়েছে: ' + (err.message || err));
    }
  };


  // Filtered Expenses
  const filteredExpenses = expenses.filter(exp => {
    const matchCategory = selectedCategory === 'all' ? true : (exp.category === selectedCategory || exp.title === selectedCategory);
    const query = (searchQuery || search || '').trim().toLowerCase();
    const matchSearch = !query ||
      exp.title?.toLowerCase().includes(query) ||
      exp.vendor?.toLowerCase().includes(query) ||
      exp.billNo?.toLowerCase().includes(query) ||
      exp.category?.toLowerCase().includes(query) ||
      exp.note?.toLowerCase().includes(query);
    return matchCategory && matchSearch;
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const totalExpenses = filteredExpenses.length;
  const totalPages = Math.max(1, Math.ceil(totalExpenses / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalExpenses);
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);

  // Safe Date Helper
  const safeDate = (val: any): Date | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  // Calculate Stat Cards Numbers
  const todayExpenses = expenses.filter(e => {
    const d = safeDate(e.date || e.createdAt);
    return d ? isToday(d) : false;
  });
  const todaySum = todayExpenses.reduce((a, b) => a + (b.amount || 0), 0);
  const todayCount = todayExpenses.length;

  const monthExpenses = expenses.filter(e => {
    const d = safeDate(e.date || e.createdAt);
    return d ? isSameMonth(d, new Date()) : false;
  });
  const monthSum = monthExpenses.reduce((a, b) => a + (b.amount || 0), 0);
  const monthCount = monthExpenses.length;

  const yearExpenses = expenses.filter(e => {
    const d = safeDate(e.date || e.createdAt);
    return d ? isSameYear(d, new Date()) : false;
  });
  const yearSum = yearExpenses.reduce((a, b) => a + (b.amount || 0), 0);
  const yearCount = yearExpenses.length;

  // Budget Calculations
  const monthlyBudget = 150000;
  const budgetPercentage = Math.min(100, Math.round((monthSum / monthlyBudget) * 100));
  const remainingBudget = Math.max(0, monthlyBudget - monthSum);

  // Category Counts
  const getCategoryCount = (catName: string) => {
    if (catName === 'all') return expenses.length;
    return expenses.filter(e => e.category === catName).length;
  };

  // Donut Chart Category Breakdown (Real Data from Database)
  const currentMonthExpenses = expenses.filter(e => {
    const d = safeDate(e.date || e.createdAt);
    return d ? isSameMonth(d, new Date()) : false;
  });

  const categoryTotals = allCategories.map((c: any) => {
    const total = currentMonthExpenses.filter(e => e.category === c.id || e.category === c.name || e.title === c.name).reduce((a, b) => a + (b.amount || 0), 0);
    const pct = monthSum > 0 ? Math.round((total / monthSum) * 100) : 0;
    return { ...c, total, pct };
  }).filter((c: any) => c.total > 0);

  // Real Due / Unpaid Expenses from Database
  const dueExpensesList = expenses.filter(e => e.status === 'বকেয়া');

  return (
    <Shell>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-bengali">
        
        {/* TOP HEADER BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              খরচ ব্যবস্থাপনা
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              আপনার ব্যবসার সকল খরচ দেখুন, নতুন খরচ যুক্ত করুন এবং হিসাব রাখুন
            </p>
          </div>

          {/* RIGHT TOP ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2.5">
            {canModifyData && (
              <Button 
                onClick={handleOpenCreateExpense}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" /> + নতুন খরচ যোগ করুন
              </Button>
            )}

            <Button 
              variant="outline" 
              onClick={() => setIsUploadReceiptOpen(true)}
              className="h-11 px-4 rounded-xl border-slate-200 text-slate-700 bg-white font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              <Camera className="w-4 h-4 mr-1.5 text-blue-600" /> বিলের ছবি আপলোড
            </Button>

            <Button 
              variant="outline" 
              onClick={() => toast.info('নিয়মিত খরচের তালিকা দেখানো হচ্ছে')}
              className="h-11 px-4 rounded-xl border-slate-200 text-slate-700 bg-white font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCcw className="w-4 h-4 mr-1.5 text-indigo-600" /> নিয়মিত খরচ
            </Button>

            <Button 
              variant="outline" 
              onClick={() => window.print()}
              className="h-11 px-4 rounded-xl border-slate-200 text-slate-700 bg-white font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 mr-1.5 text-slate-600" /> খরচের রিপোর্ট <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>

        {/* TOP 4 STAT CARDS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* CARD 1: আজকের মোট খরচ */}
          <Card className="bg-white border-2 border-slate-100/80 rounded-2xl p-5 shadow-xs hover:border-emerald-200 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">আজকের মোট খরচ</p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">৳ {toBengaliDigits(todaySum.toLocaleString('bn-BD'))}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-slate-500 font-semibold">মোট {toBengaliDigits(todayCount)}টি এন্ট্রি</span>
                </div>
              </div>
            </div>
          </Card>

          {/* CARD 2: এই মাসের খরচ */}
          <Card className="bg-white border-2 border-slate-100/80 rounded-2xl p-5 shadow-xs hover:border-blue-200 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">এই মাসের খরচ</p>
                <h3 className="text-2xl font-black text-blue-700 mt-0.5">৳ {toBengaliDigits(monthSum.toLocaleString('bn-BD'))}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-slate-500 font-semibold">মোট {toBengaliDigits(monthCount)}টি এন্ট্রি</span>
                </div>
              </div>
            </div>
          </Card>

          {/* CARD 3: এই বছরের খরচ */}
          <Card className="bg-white border-2 border-slate-100/80 rounded-2xl p-5 shadow-xs hover:border-purple-200 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">এই বছরের খরচ</p>
                <h3 className="text-2xl font-black text-purple-700 mt-0.5">৳ {toBengaliDigits(yearSum.toLocaleString('bn-BD'))}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-slate-500 font-semibold">মোট {toBengaliDigits(yearCount)}টি এন্ট্রি</span>
                </div>
              </div>
            </div>
          </Card>

          {/* CARD 4: বাজেট বনাম খরচ (এই মাস) */}
          <Card className="bg-white border-2 border-slate-100/80 rounded-2xl p-5 shadow-xs hover:border-amber-200 transition-all">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">বাজেট বনাম খরচ (এই মাস)</p>
                <span className="text-xl font-black text-amber-500">{toBengaliDigits(budgetPercentage)}%</span>
              </div>
              
              <p className="text-xs font-bold text-slate-800">
                ৳ {toBengaliDigits(monthSum.toLocaleString('bn-BD'))} / ৳ {toBengaliDigits(monthlyBudget.toLocaleString('bn-BD'))}
              </p>

              {/* PROGRESS BAR */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${budgetPercentage}%` }}
                ></div>
              </div>

              <p className="text-[11px] font-bold text-emerald-600 pt-1">
                অবশিষ্ট বাজেট: ৳ {toBengaliDigits(remainingBudget.toLocaleString('bn-BD'))}
              </p>
            </div>
          </Card>

        </div>

        {/* MAIN 3-COLUMN LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMN 1 (LEFT ~2.5 COLUMNS): খরচের ক্যাটাগরি */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" /> খরচের ক্যাটাগরি
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(true)}
                  className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-0.5 cursor-pointer"
                  title="নতুন ক্যাটাগরি যোগ করুন"
                >
                  <Plus className="w-3.5 h-3.5" /> যোগ
                </button>
              </div>

              <div className="space-y-1">
                {[defaultCategories[0], ...allCategories].map((cat: any) => {
                  const IconComp = cat.icon || Layers;
                  const isSelected = selectedCategory === cat.id || selectedCategory === cat.name;
                  const count = getCategoryCount(cat.name || cat.id);
                  return (
                    <button
                      key={cat.id || cat.name}
                      onClick={() => setSelectedCategory(cat.id === 'all' ? 'all' : cat.name)}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-xl font-bold text-xs transition-all",
                        isSelected 
                          ? "bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs", 
                          isSelected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                        )}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span>{cat.name}</span>
                      </div>

                      <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-bold",
                        isSelected ? "bg-emerald-200/60 text-emerald-900" : "bg-slate-100 text-slate-500"
                      )}>
                        {toBengaliDigits(count)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Button 
                variant="outline" 
                onClick={() => setIsAddCategoryOpen(true)}
                className="w-full h-10 rounded-xl border-slate-200 text-slate-700 font-bold text-xs mt-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> + নতুন ক্যাটাগরি তৈরি
              </Button>
            </Card>
          </div>

          {/* COLUMN 2 (CENTER ~6 COLUMNS): খরচের টাইমলাইন */}
          <div className="lg:col-span-6 space-y-4">
            <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs p-5 space-y-5">
              
              {/* TIMELINE HEADER & SEARCH CONTROLS */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <h3 className="font-black text-slate-900 text-base">খরচের টাইমলাইন</h3>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input 
                      placeholder="খরচ খুঁজুন..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="rounded-xl h-9 pl-9 text-xs bg-slate-50/60 border-slate-200"
                    />
                  </div>

                  <Button variant="outline" className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 font-bold text-xs">
                    <Filter className="w-3.5 h-3.5 mr-1" /> ফিল্টার
                  </Button>

                  <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                    <SelectTrigger className="h-9 w-32 rounded-xl bg-slate-50/60 border-slate-200 text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-bengali text-xs font-bold">
                      <SelectItem value="desc">সর্বশেষ আগে</SelectItem>
                      <SelectItem value="asc">পুরোনো আগে</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* TIMELINE EXPENSE LIST */}
              <div className="space-y-4">
                {loading ? (
                  <p className="text-center py-12 text-slate-400 font-bold text-sm">লোড হচ্ছে...</p>
                ) : filteredExpenses.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <Wallet className="w-10 h-10 mx-auto opacity-20" />
                    <p className="font-bold text-sm">কোনো খরচের ইতিহাস পাওয়া যায়নি</p>
                  </div>
                ) : (
                  paginatedExpenses.map((exp) => {
                    const catObj = allCategories.find((c: any) => c.id === exp.category || c.name === exp.category || c.name === exp.title) || defaultCategories[10];
                    const IconComp = catObj?.icon || Layers;
                    const expDate = safeDate(exp.date) || new Date();
                    return (
                      <div 
                        key={exp.id} 
                        onClick={() => setSelectedExpenseForView(exp)}
                        className="flex gap-4 items-start p-3.5 hover:bg-slate-100/90 rounded-2xl transition-all border border-slate-100/60 cursor-pointer group"
                      >
                        
                        {/* LEFT DATE STAMP */}
                        <div className="w-20 text-center flex-shrink-0 pt-0.5">
                          <p className="text-lg font-black text-slate-900 leading-none">
                            {toBengaliDigits(format(expDate, 'dd'))}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                            {toBengaliDigits(format(expDate, 'MMM, yyyy', { locale: bn }))}
                          </p>
                        </div>

                        {/* CATEGORY ICON CIRCLE */}
                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5", catObj?.color || 'bg-slate-600 text-white')}>
                          <IconComp className="w-5 h-5" />
                        </div>

                        {/* EXPENSE DETAILS */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-black text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{exp.title}</h4>
                              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                <p className="text-xs text-slate-500 font-semibold">{exp.category || 'সাধারণ খরচ'}</p>
                                {exp.note && (
                                  <span className="text-[11px] text-slate-600 bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-md font-medium max-w-[280px] sm:max-w-md truncate" title={exp.note}>
                                    📝 {exp.note}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* AMOUNT & STATUS BADGE */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-base font-black text-slate-900">
                                ৳ {toBengaliDigits((exp.amount || 0).toLocaleString('bn-BD'))}
                              </p>
                              <span className={cn("inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1",
                                exp.status === 'পরিশোধিত' ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                              )}>
                                {exp.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 3-DOT ACTION MENU BUTTON */}
                        <div className="flex items-center gap-1 flex-shrink-0 self-center" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            onClick={(e) => handleToggleMenu(e, exp.id)}
                            className={cn(
                              "p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer focus:outline-none",
                              openMenuId === exp.id && "bg-slate-200 text-slate-900"
                            )}
                            title="অ্যাকশন মেনু"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

              {/* TIMELINE PAGINATION CONTROLS */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-semibold">
                    মোট <strong className="text-slate-800">{toBengaliDigits(totalExpenses)}</strong> টির মধ্যে <strong className="text-slate-800">{toBengaliDigits(totalExpenses > 0 ? startIndex + 1 : 0)}</strong> - <strong className="text-slate-800">{toBengaliDigits(endIndex)}</strong> দেখানো হচ্ছে (পৃষ্ঠা {toBengaliDigits(validCurrentPage)}/{toBengaliDigits(totalPages)})
                  </span>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold border-l pl-3 border-slate-200">
                    <span>প্রতি পেজে:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="h-7 px-2 rounded-md border border-slate-200 bg-white font-bold text-slate-700 cursor-pointer text-xs"
                    >
                      <option value={5}>৫ টি</option>
                      <option value={10}>১০ টি</option>
                      <option value={20}>২০ টি</option>
                      <option value={50}>৫০ টি</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1 font-bold">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="h-8 px-2.5 rounded-md text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 mr-0.5" /> আগের পেজ
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                      .map((page, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && page - prev > 1;
                        return (
                          <div key={page} className="flex items-center gap-1">
                            {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                "w-8 h-8 rounded-md text-xs font-bold transition-all border cursor-pointer",
                                validCurrentPage === page
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              )}
                            >
                              {toBengaliDigits(page)}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="h-8 px-2.5 rounded-md text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    পরের পেজ <ChevronRight className="w-4 h-4 ml-0.5" />
                  </Button>
                </div>
              </div>

            </Card>
          </div>

          {/* COLUMN 3 (RIGHT ~3.5 COLUMNS): খরচ বিশ্লেষণ, আগামী বিল & দ্রুত কার্যক্রম */}
          <div className="lg:col-span-3 space-y-5">
            
            {/* CARD A: খরচ বিশ্লেষণ (এই মাস) */}
            <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs p-5 space-y-4">
              <h3 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-600" /> খরচ বিশ্লেষণ (এই মাস)
              </h3>

              {/* DYNAMIC CATEGORY BREAKDOWN LIST */}
              <div className="space-y-2.5 text-xs font-semibold">
                {categoryTotals.length === 0 ? (
                  <p className="text-center py-4 text-slate-400 font-bold text-xs">এই মাসে কোনো খরচ এন্ট্রি নেই</p>
                ) : (
                  categoryTotals.map((cat: any) => (
                    <div key={cat.id || cat.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2.5 h-2.5 rounded-full", cat.color.split(' ')[0])}></span>
                        <span className="text-slate-700">{cat.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {toBengaliDigits(cat.pct)}% <span className="text-slate-400 font-normal">(৳ {toBengaliDigits(cat.total.toLocaleString('bn-BD'))})</span>
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">মোট খরচ</span>
                <span className="text-lg font-black text-emerald-600">৳ {toBengaliDigits(monthSum.toLocaleString('bn-BD'))}</span>
              </div>
            </Card>

            {/* CARD B: আসন্ন বিল ও বকেয়া (Real from Database) */}
            <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs p-5 space-y-3">
              <h3 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> আসন্ন বিল ও বকেয়া
              </h3>

              <div className="space-y-3 text-xs">
                {dueExpensesList.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 space-y-1">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
                    <p className="font-bold text-xs text-slate-600">কোনো বকেয়া বিল নেই</p>
                    <p className="text-[10px] text-slate-400">সকল খরচের বিল পরিশোধিত আছে</p>
                  </div>
                ) : (
                  dueExpensesList.map((due) => (
                    <div key={due.id} className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{due.title}</p>
                        <p className="text-[10px] text-slate-500">তারিখ: {toBengaliDigits(due.date)}</p>
                      </div>
                      <span className="font-black text-rose-600">৳ {toBengaliDigits((due.amount || 0).toLocaleString('bn-BD'))}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* CARD C: দ্রুত কার্যক্রম (QUICK ACTIONS 4 TILES) */}
            <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs p-5 space-y-3">
              <h3 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" /> দ্রুত কার্যক্রম
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                
                <button 
                  onClick={handleOpenCreateExpense}
                  className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-center space-y-1.5 transition-all group cursor-pointer"
                >
                  <Plus className="w-5 h-5 mx-auto text-emerald-600 group-hover:scale-110 transition-transform" />
                  <p className="text-[11px] font-black text-emerald-900">নতুন খরচ যোগ করুন</p>
                </button>

                <button 
                  onClick={() => setIsUploadReceiptOpen(true)}
                  className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl text-center space-y-1.5 transition-all group cursor-pointer"
                >
                  <Camera className="w-5 h-5 mx-auto text-blue-600 group-hover:scale-110 transition-transform" />
                  <p className="text-[11px] font-black text-blue-900">বিলের ছবি আপলোড</p>
                </button>

                <button 
                  onClick={() => toast.info('নিয়মিত খরচের তালিকা দেখানো হচ্ছে')}
                  className="p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-2xl text-center space-y-1.5 transition-all group cursor-pointer"
                >
                  <RefreshCcw className="w-5 h-5 mx-auto text-purple-600 group-hover:scale-110 transition-transform" />
                  <p className="text-[11px] font-black text-purple-900">নিয়মিত খরচ সেট করুন</p>
                </button>

                <button 
                  onClick={() => window.print()}
                  className="p-3 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-2xl text-center space-y-1.5 transition-all group cursor-pointer"
                >
                  <BarChart3 className="w-5 h-5 mx-auto text-orange-600 group-hover:scale-110 transition-transform" />
                  <p className="text-[11px] font-black text-orange-900">খরচের রিপোর্ট দেখুন</p>
                </button>

              </div>
            </Card>

          </div>

        </div>

      </div>

      {/* ADD / EDIT EXPENSE MODAL */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white font-bengali">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              {editingExpenseId ? (
                <>
                  <Edit2 className="w-5 h-5 text-amber-600" /> খরচ সম্পাদনা করুন
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-emerald-600" /> নতুন খরচ যোগ করুন
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveExpense} className="space-y-4 pt-2">
            
            {/* Category selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">খরচের ক্যাটাগরি *</Label>
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(true)}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> নতুন ক্যাটাগরি তৈরি
                </button>
              </div>

              <Select value={newExpense.category} onValueChange={(v: any) => {
                if (v === '__add_new__') {
                  setIsAddCategoryOpen(true);
                } else if (v) {
                  setNewExpense({ ...newExpense, category: v });
                }
              }}>
                <SelectTrigger className="rounded-xl h-11 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold max-h-64">
                  {allCategories.map((c: any) => (
                    <SelectItem key={c.id || c.name} value={c.name}>{c.name}</SelectItem>
                  ))}
                  <SelectItem value="__add_new__" className="text-emerald-600 font-bold border-t border-slate-100">
                    + নতুন ক্যাটাগরি লিখুন...
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">টাকার পরিমাণ (৳) *</Label>
              <div className="relative">
                <Input 
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={newExpense.amount || ''}
                  onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00" 
                  className="rounded-xl h-11 font-black text-emerald-600 text-base pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">তারিখ *</Label>
              <BengaliDatePicker 
                value={newExpense.date}
                onChange={val => setNewExpense({ ...newExpense, date: val })}
                placeholder="তারিখ নির্বাচন"
                className="w-full"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">পেমেন্ট মাধ্যম *</Label>
              <Select value={newExpense.paymentMethod} onValueChange={(v: any) => setNewExpense({ ...newExpense, paymentMethod: v })}>
                <SelectTrigger className="rounded-xl h-11 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  <SelectItem value="Cash">💵 নগদ টাকা (Cash)</SelectItem>
                  <SelectItem value="Bank">🏦 ব্যাংক একাউন্ট (Bank)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bank Account (if Bank selected) */}
            {newExpense.paymentMethod === 'Bank' && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <Label className="text-xs font-bold text-slate-700">ব্যাংক অ্যাকাউন্ট নির্বাচন *</Label>
                <Select value={newExpense.bankId} onValueChange={(v: any) => setNewExpense({ ...newExpense, bankId: v })}>
                  <SelectTrigger className="rounded-xl h-11 bg-white border-slate-200 text-xs font-bold">
                    <SelectValue placeholder="ব্যাংক সিলেক্ট করুন" />
                  </SelectTrigger>
                  <SelectContent className="font-bengali text-xs font-bold">
                    {banks.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({toBengaliDigits(b.accNo)}) — ব্যালেন্স: ৳ {toBengaliDigits(b.balance.toLocaleString('bn-BD'))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes / Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">নোট / খরচের বিবরণ (ঐচ্ছিক)</Label>
              <textarea
                value={newExpense.notes}
                onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })}
                placeholder="খরচের অতিরিক্ত বিবরণ বা নোট লিখুন..."
                rows={2}
                className="w-full rounded-xl p-3 bg-white border border-slate-200 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
              />
            </div>

            <DialogFooter className="grid grid-cols-2 gap-3 pt-3">
              <Button type="button" variant="outline" onClick={() => { setIsAddExpenseOpen(false); setEditingExpenseId(null); }} className="h-11 rounded-xl font-bold text-slate-600 cursor-pointer">
                বাতিল
              </Button>
              <Button type="submit" className={cn("h-11 text-white rounded-xl font-bold cursor-pointer", editingExpenseId ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700")}>
                {editingExpenseId ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

      {/* ADD NEW CATEGORY MODAL */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="max-w-xs rounded-2xl p-5 bg-white font-bengali">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900">
              নতুন ক্যাটাগরি তৈরি করুন
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              value={newCategoryInput}
              onChange={e => setNewCategoryInput(e.target.value)}
              placeholder="ক্যাটাগরির নাম লিখুন..."
              className="rounded-xl h-10 text-xs font-bold"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNewCategory();
                }
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)} className="h-9 rounded-xl text-xs font-bold">
                বাতিল
              </Button>
              <Button onClick={handleAddNewCategory} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 rounded-xl text-xs font-bold">
                যুক্ত করুন
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* UPLOAD RECEIPT MODAL */}
      <Dialog open={isUploadReceiptOpen} onOpenChange={setIsUploadReceiptOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white font-bengali">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" /> বিলের ছবি আপলোড
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-center">
            <div className="border-2 border-dashed border-blue-200 hover:border-blue-400 transition-colors rounded-2xl p-8 bg-blue-50/30 cursor-pointer">
              <UploadCloud className="w-10 h-10 text-blue-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">বিলের ছবি বা পিডিএফ সিলেক্ট করুন</p>
              <p className="text-[10px] text-slate-400 mt-1">সর্বোচ্চ ফাইল সাইজ: ৫ মেগাবাইট</p>
            </div>
            <DialogFooter className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setIsUploadReceiptOpen(false)} className="rounded-xl h-10 font-bold text-xs cursor-pointer">
                বাতিল
              </Button>
              <Button onClick={() => { toast.success('ছবি আপলোড করা হয়েছে'); setIsUploadReceiptOpen(false); }} className="bg-blue-600 text-white rounded-xl h-10 font-bold text-xs cursor-pointer">
                আপলোড করুন
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>


      {/* VIEW EXPENSE DETAILS MODAL */}
      {selectedExpenseForView && (
        <Dialog open={!!selectedExpenseForView} onOpenChange={() => setSelectedExpenseForView(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white font-bengali space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center justify-between">
                <span>খরচের বিবরণী</span>
                <span className="text-xs font-mono text-slate-400">{toBengaliDigits(selectedExpenseForView.date)}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-3 text-xs border border-slate-100">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">খরচের নাম:</span>
                <span className="font-black text-slate-900">{selectedExpenseForView.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">ক্যাটাগরি:</span>
                <span className="font-bold text-blue-700">
                  {allCategories.find((c: any) => c.id === selectedExpenseForView.category || c.name === selectedExpenseForView.category)?.name || selectedExpenseForView.category || selectedExpenseForView.title}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">পরিমাণ:</span>
                <span className="font-black text-base text-rose-600">৳ {toBengaliDigits((selectedExpenseForView.amount || 0).toLocaleString('bn-BD'))}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">ভেনডর / প্রতিষ্ঠান:</span>
                <span className="font-semibold text-slate-800">{selectedExpenseForView.vendor || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">পেমেন্ট পদ্ধতি:</span>
                <span className="font-bold text-slate-700">{selectedExpenseForView.paymentMethod === 'Bank' ? 'ব্যাংক' : 'নগদ'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">স্ট্যাটাস:</span>
                <span className={cn("font-bold", selectedExpenseForView.status === 'পরিশোধিত' ? "text-emerald-600" : "text-rose-600")}>
                  {selectedExpenseForView.status}
                </span>
              </div>
              {selectedExpenseForView.note && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500 block mb-1">নোট / বিবরণ:</span>
                  <p className="font-semibold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200/70 whitespace-pre-wrap">{selectedExpenseForView.note}</p>
                </div>
              )}
            </div>

            <DialogFooter className="grid grid-cols-3 gap-2">
              <Button 
                type="button"
                variant="outline"
                onClick={() => {
                  const exp = selectedExpenseForView;
                  setSelectedExpenseForView(null);
                  handleEditExpense(exp);
                }} 
                className="rounded-xl font-bold text-xs text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1 text-amber-600" />
                <span>এডিট</span>
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={() => window.print()} 
                className="rounded-xl font-bold text-xs text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100"
              >
                <Printer className="w-3.5 h-3.5 mr-1 text-blue-600" />
                <span>প্রিন্ট</span>
              </Button>
              <Button 
                type="button"
                onClick={() => setSelectedExpenseForView(null)} 
                className="bg-slate-900 text-white rounded-xl font-bold text-xs"
              >
                বন্ধ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 3-DOT FLOATING ACTIONS PORTAL MENU */}
      {openMenuId && (() => {
        const targetExp = expenses.find(e => e.id === openMenuId);
        if (!targetExp) return null;
        return (
          <div 
            data-expense-menu
            style={{
              position: 'fixed',
              top: menuPos.openUp ? undefined : `${menuPos.top}px`,
              bottom: menuPos.openUp ? `${window.innerHeight - menuPos.top}px` : undefined,
              left: `${menuPos.left}px`,
              zIndex: 999999
            }}
            className="w-44 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 font-bengali animate-in fade-in-0 zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(null);
                setSelectedExpenseForView(targetExp);
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-blue-600 shrink-0" />
              <span>বিস্তারিত দেখুন</span>
            </button>

            {canModifyData && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(null);
                  handleEditExpense(targetExp);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Edit2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>সম্পাদনা করুন</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(null);
                setSelectedExpenseForView(targetExp);
                setTimeout(() => window.print(), 200);
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>প্রিন্ট ভাউচার</span>
            </button>

          </div>
        );
      })()}

    </Shell>
  );
}
