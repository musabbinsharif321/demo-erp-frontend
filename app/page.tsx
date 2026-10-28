'use client';

import { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { cn, fixMiliName, toBnNum, formatBnCurrency } from '@/lib/utils';

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  User, 
  AlertCircle, 
  Banknote, 
  PackageCheck, 
  TrendingDown, 
  ArrowRight, 
  History, 
  Zap, 
  Receipt, 
  Truck, 
  Package, 
  UserPlus, 
  Wallet, 
  Landmark, 
  BarChart3, 
  BookOpen, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  ChevronRight,
  RotateCcw,
  ArrowDownCircle,
  ArrowUpCircle,
  PlusCircle,
  ArrowRightLeft,
  Scale,
  Settings,
  AlertTriangle,
  FileText,
  Percent,
  Layers,
  Layers2,
  Copy,
  Check,
  Search,
  Tag
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { api, DashboardStats } from '@/lib/api';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { toast } from 'sonner';
import { toBengaliDigits, isCementProduct, isRodProduct } from '@/lib/bengaliUtils';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  unit?: string;
  total?: number;
}

interface Order {
  id: string;
  orderId?: string;
  customerName?: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod?: string;
  chequeNo?: string;
  items?: OrderItem[];
  notes?: string;
  createdAt: any;
}

interface Purchase {
  id: string;
  supplierName?: string;
  totalPrice?: number;
  totalAmount?: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentMethod?: string;
  items?: any[];
  notes?: string;
  createdAt: any;
}

interface Product {
  id: string;
  name: string;
  category?: string;
  brand?: string;
  stock: number;
  minStock?: number;
  unit?: string;
  sellPrice?: number;
  purchasePrice?: number;
}

interface Customer {
  id: string;
  name: string;
  totalDue?: number;
}

interface Bank {
  id: string;
  name: string;
  balance: number;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  accountType?: string;
  createdAt: any;
}

interface ShortcutAction {
  label: string;
  sub: string;
  tag: string;
  href: string;
  icon: any;
  gradient: string;
  iconShadow: string;
  accentBg: string;
  accentBorder: string;
  accentLine: string;
  accentText: string;
}

const allShortcuts: ShortcutAction[] = [
  { 
    label: 'কাস্টমার যোগ', 
    sub: 'নতুন খরিদ্দার এন্ট্রি', 
    tag: 'কাস্টমার',
    href: '/customers?action=add', 
    icon: UserPlus, 
    gradient: 'from-emerald-500 to-teal-600',
    iconShadow: 'shadow-emerald-500/25',
    accentBg: 'from-emerald-50/70 via-white to-white',
    accentBorder: 'border-emerald-200/80 hover:border-emerald-500/60 hover:shadow-emerald-500/10',
    accentLine: 'bg-emerald-500',
    accentText: 'group-hover:text-emerald-700',
  },
  { 
    label: 'নতুন বিক্রয়', 
    sub: 'অর্ডার ও বিক্রয় তৈরি', 
    tag: 'বিক্রয়',
    href: '/orders', 
    icon: ShoppingCart, 
    gradient: 'from-[#9b7524] via-[#b88e2d] to-[#d4af37]',
    iconShadow: 'shadow-amber-500/30',
    accentBg: 'from-amber-50/80 via-white to-white',
    accentBorder: 'border-[#e2d7c5] hover:border-[#b88e2d]/60 hover:shadow-amber-500/10',
    accentLine: 'bg-[#b88e2d]',
    accentText: 'group-hover:text-[#9b7524]',
  },
  { 
    label: 'বিক্রয় চালান', 
    sub: 'ইনভয়েস ও মেমো প্রিন্ট', 
    tag: 'চালান কপি',
    href: '/invoices', 
    icon: Receipt, 
    gradient: 'from-blue-500 to-indigo-600',
    iconShadow: 'shadow-blue-500/25',
    accentBg: 'from-blue-50/70 via-white to-white',
    accentBorder: 'border-blue-200/80 hover:border-blue-500/60 hover:shadow-blue-500/10',
    accentLine: 'bg-blue-600',
    accentText: 'group-hover:text-blue-700',
  },
  { 
    label: 'পেমেন্ট গ্রহণ', 
    sub: 'বকেয়া টাকা জমা / আদায়', 
    tag: 'কালেকশন',
    href: '/transactions?type=income&action=create', 
    icon: ArrowUpCircle, 
    gradient: 'from-teal-500 to-cyan-600',
    iconShadow: 'shadow-teal-500/25',
    accentBg: 'from-teal-50/70 via-white to-white',
    accentBorder: 'border-teal-200/80 hover:border-teal-500/60 hover:shadow-teal-500/10',
    accentLine: 'bg-teal-600',
    accentText: 'group-hover:text-teal-700',
  },
  { 
    label: 'দৈনন্দিন খরচ', 
    sub: 'দোকান খরচের হিসাব', 
    tag: 'খরচ ভাউচার',
    href: '/expenses', 
    icon: Wallet, 
    gradient: 'from-rose-500 to-pink-600',
    iconShadow: 'shadow-rose-500/25',
    accentBg: 'from-rose-50/70 via-white to-white',
    accentBorder: 'border-rose-200/80 hover:border-rose-500/60 hover:shadow-rose-500/10',
    accentLine: 'bg-rose-600',
    accentText: 'group-hover:text-rose-700',
  },
  { 
    label: 'বাকি কাস্টমার', 
    sub: 'বকেয়া খরিদ্দারের তালিকা', 
    tag: 'বাকি তালিকা',
    href: '/customers/dues', 
    icon: Users, 
    gradient: 'from-purple-500 to-violet-600',
    iconShadow: 'shadow-purple-500/25',
    accentBg: 'from-purple-50/70 via-white to-white',
    accentBorder: 'border-purple-200/80 hover:border-purple-500/60 hover:shadow-purple-500/10',
    accentLine: 'bg-purple-600',
    accentText: 'group-hover:text-purple-700',
  },
];

const getDate = (val: any): Date => {
  if (!val) return new Date();
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

export default function Dashboard() {
  const isMounted = useIsMounted();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedReport, setCopiedReport] = useState(false);
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [productPriceSearch, setProductPriceSearch] = useState('');

  const fetchDashboardData = useCallback(() => {
    Promise.all([
      api.dashboard.getStats(),
      api.inventory.list(),
      api.transactions.list()
    ]).then(([statsData, prodList, txList]) => {
      setStats(statsData);
      const safeProdList = Array.isArray(prodList) ? prodList : [];
      setProducts(safeProdList.map(p => ({
        id: String(p.id),
        name: p.name,
        category: p.category_name || (p as any).category || '',
        brand: p.brand || '',
        stock: Number(p.stock || 0),
        minStock: Number(p.min_stock || 10),
        unit: p.unit || 'পিস',
        sellPrice: Number(p.sell_price || 0),
        purchasePrice: Number(p.purchase_price || (p as any).buy_price || 0)
      })));

      const safeTxList = Array.isArray(txList) ? txList : [];
      const safeSaleList = safeTxList.filter(t => t.transaction_type === 'sale' || !t.transaction_type);
      const safePurchaseList = safeTxList.filter(t => t.transaction_type === 'purchase');

      setOrders(safeSaleList.filter(t => t.status !== 'pending' && t.status !== 'draft' && t.status !== 'cancelled' && t.status !== 'rejected').map(t => ({
        id: String(t.id),
        orderId: t.invoice_no,
        customerName: t.party_name || 'গ্রাহক',
        totalAmount: t.total_amount,
        paidAmount: t.paid_amount,
        dueAmount: t.due_amount,
        paymentMethod: t.payment_method,
        chequeNo: (t as any).cheque_no,
        items: (t.items || []).map((i: any) => ({
          name: i.product_name || i.name || '',
          quantity: Number(i.quantity || 0),
          price: Number(i.price || 0),
          unit: i.unit || 'পিস',
          total: Number(i.total || (Number(i.quantity || 0) * Number(i.price || 0)))
        })),
        notes: t.notes,
        createdAt: t.created_at
      })));

      setPurchases(safePurchaseList.filter(t => t.status !== 'pending' && t.status !== 'draft' && t.status !== 'cancelled' && t.status !== 'rejected').map(t => ({
        id: String(t.id),
        supplierName: t.party_name || 'সরবরাহকারী',
        totalAmount: t.total_amount,
        paidAmount: t.paid_amount,
        dueAmount: t.due_amount,
        paymentMethod: t.payment_method,
        items: (t.items || []).map((i: any) => ({
          name: i.product_name || i.name || '',
          quantity: Number(i.quantity || 0),
          price: Number(i.price || 0),
          unit: i.unit || 'পিস'
        })),
        notes: t.notes,
        createdAt: t.created_at
      })));

      setAllTransactions(safeTxList);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching dashboard data:', err);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchDashboardData();
    window.addEventListener('orderUpdated', fetchDashboardData);
    return () => {
      window.removeEventListener('orderUpdated', fetchDashboardData);
    };
  }, [fetchDashboardData]);

  const totalCashBalance = stats?.totalCash ?? 0;
  const totalBankBalance = stats?.totalBank ?? 0;
  const totalDuesAmount = stats?.totalDues ?? 0;
  const totalMonthlySalesVal = stats?.monthlySales ?? 0;
  const totalMonthlyPurchasesVal = stats?.monthlyPurchases ?? 0;
  const lowStockCount = stats?.lowStockCount ?? 0;
  const recentTransactions = stats?.recentTransactions || [];

  // ==================== DAILY REPORT CALCULATION ====================
  const dailyReportData = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const dateFormattedBn = format(new Date(), 'dd/MM/yyyy', { locale: bn }).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]) + ' ইং';

    const safeParseDate = (dVal: any) => {
      if (!dVal) return null;
      try {
        if (dVal instanceof Date) return isNaN(dVal.getTime()) ? null : dVal;
        let str = String(dVal).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          const [y, m, d] = str.split('-').map(Number);
          return new Date(y, m - 1, d, 12, 0, 0);
        }
        if (str.includes(' ') && !str.includes('T')) {
          str = str.replace(' ', 'T');
        }
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    };

    // Filter today's sales and purchases
    const dayOrders = orders.filter(o => {
      const d = safeParseDate(o.createdAt);
      return d && format(d, 'yyyy-MM-dd') === todayStr;
    });

    const dayPurchases = purchases.filter(p => {
      const d = safeParseDate(p.createdAt);
      return d && format(d, 'yyyy-MM-dd') === todayStr;
    });

    // Filter today's returns (kept separate, NOT deducted from today's fresh sales)
    const dayReturns = allTransactions.filter(t => {
      if (t.status === 'cancelled' || t.status === 'rejected' || t.status === 'draft') return false;
      const d = safeParseDate(t.created_at || t.createdAt);
      const tType = (t.transaction_type || t.type || '').toLowerCase();
      return d && format(d, 'yyyy-MM-dd') === todayStr && tType === 'sale_return';
    });

    // Cheques received today (Only inbound collections: sales, payment_in, income - no double counting)
    let dayChequeAmount = 0;
    allTransactions.forEach(t => {
      if (t.status === 'cancelled' || t.status === 'rejected' || t.status === 'draft') return;
      const d = safeParseDate(t.created_at || t.createdAt);
      if (!d || format(d, 'yyyy-MM-dd') !== todayStr) return;
      
      const tType = (t.transaction_type || t.type || '').toLowerCase();
      if (tType !== 'sale' && tType !== 'payment_in' && tType !== 'income') return;
      
      const pMethod = ((t.payment_method || t.paymentMethod || '') as string).toLowerCase();
      const hasCheque = pMethod.includes('cheque') || pMethod.includes('check') || pMethod.includes('চেক') || 
                        Boolean(t.cheque_number || t.cheque_no || t.chequeNo);
      
      if (hasCheque) {
        let chqAmt = Number((t as any).split_cheque_amount || (t as any).splitChequeAmount || 0);
        if (chqAmt <= 0) {
          chqAmt = Number(t.paid_amount || t.amount || 0);
        }
        dayChequeAmount += chqAmt;
      }
    });

    // Cement metrics
    let cementSoldBags = 0;
    let cementDirectBags = 0;
    dayOrders.forEach(o => {
      (o.items || []).forEach(i => {
        if (isCementProduct(i)) {
          const qty = Number(i.quantity) || 0;
          cementSoldBags += qty;
          const n = (i.name || '').toLowerCase();
          if (n.includes('সরাসরি') || (o.notes || '').toLowerCase().includes('সরাসরি') || (o.notes || '').toLowerCase().includes('direct')) {
            cementDirectBags += qty;
          }
        }
      });
    });

    let cementBoughtBags = 0;
    dayPurchases.forEach(p => {
      (p.items || []).forEach(i => {
        if (isCementProduct(i)) {
          cementBoughtBags += Number(i.quantity) || 0;
        }
      });
    });

    let dayCementReturnBags = 0;
    dayReturns.forEach(r => {
      (r.items || []).forEach((i: any) => {
        if (isCementProduct(i)) {
          dayCementReturnBags += Number(i.quantity) || 0;
        }
      });
    });

    const cementProducts = products.filter(p => isCementProduct(p));
    const totalCementStockBags = cementProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);

    const realCementList: { name: string; stock: number }[] = [];
    cementProducts.forEach(p => {
      const brand = (p.brand || '').trim();
      const name = (p.name || '').trim();
      const displayName = (brand && !name.toLowerCase().includes(brand.toLowerCase()))
        ? `${brand} ${name}`
        : name;
      const stock = Number(p.stock) || 0;
      const existing = realCementList.find(b => b.name.toLowerCase() === displayName.toLowerCase());
      if (existing) {
        existing.stock += stock;
      } else {
        realCementList.push({ name: displayName, stock });
      }
    });

    // Rod metrics
    let rodSoldKg = 0;
    let rodDirectKg = 0;
    dayOrders.forEach(o => {
      (o.items || []).forEach(i => {
        if (isRodProduct(i)) {
          const u = (i.unit || '').toLowerCase();
          const qtyKg = u.includes('টন') ? (Number(i.quantity) || 0) * 1000 : (Number(i.quantity) || 0);
          rodSoldKg += qtyKg;
          const n = (i.name || '').toLowerCase();
          if (n.includes('সরাসরি') || (o.notes || '').toLowerCase().includes('সরাসরি') || (o.notes || '').toLowerCase().includes('direct')) {
            rodDirectKg += qtyKg;
          }
        }
      });
    });

    let rodBoughtKg = 0;
    dayPurchases.forEach(p => {
      (p.items || []).forEach(i => {
        if (isRodProduct(i)) {
          const u = (i.unit || '').toLowerCase();
          rodBoughtKg += u.includes('টন') ? (Number(i.quantity) || 0) * 1000 : (Number(i.quantity) || 0);
        }
      });
    });

    let dayRodReturnKg = 0;
    dayReturns.forEach(r => {
      (r.items || []).forEach((i: any) => {
        if (isRodProduct(i)) {
          const u = (i.unit || '').toLowerCase();
          const qtyKg = u.includes('টন') ? (Number(i.quantity) || 0) * 1000 : (Number(i.quantity) || 0);
          dayRodReturnKg += qtyKg;
        }
      });
    });

    const rodProducts = products.filter(p => isRodProduct(p));
    const totalRodStockKg = rodProducts.reduce((sum, p) => {
      const u = (p.unit || '').toLowerCase();
      return sum + (u.includes('টন') ? (Number(p.stock) || 0) * 1000 : (Number(p.stock) || 0));
    }, 0);

    const formatQtyOrZero = (qty: number) => (qty > 0 ? toBengaliDigits(qty) : '০০');
    const formatRodVal = (val: number, space: boolean = false) => {
      if (!val || val === 0) return space ? '০০ কেজি' : '০০কেজি';
      const formatted = val % 1 === 0 ? val.toLocaleString('en-IN') : val.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      return `${toBengaliDigits(formatted)}${space ? ' কেজি' : 'কেজি'}`;
    };

    const cementBrandLines = realCementList.map(b => `${b.name}= ${formatQtyOrZero(b.stock)} ব্যাগ`);
    const cementBlockLines = [
      `সিমেন্ট বিক্রয় = ${formatQtyOrZero(cementSoldBags)} ব্যাগ`,
      ...(dayCementReturnBags > 0 ? [`সিমেন্ট ফেরত = ${formatQtyOrZero(dayCementReturnBags)} ব্যাগ`] : []),
      `সিমেন্ট প্রাপ্তি = ${formatQtyOrZero(cementBoughtBags)} ব্যাগ`,
      `সিমেন্ট সরাসরি= ${formatQtyOrZero(cementDirectBags)} ব্যাগ`,
      `সিমেন্ট স্টক= ${formatQtyOrZero(totalCementStockBags)} ব্যাগ`,
      ...cementBrandLines
    ];

    const fullDailyReportText = `===দেলোয়ার এন্ড ব্রাদার্স ===
         গোপালগঞ্জ শাখা
==== ডেইলি রিপোর্ট ====
তারিখ - ${dateFormattedBn}

১/ ক্যাশ = ${totalCashBalance !== 0 ? toBengaliDigits(Math.round(totalCashBalance).toLocaleString('en-IN')) : '০০'} ৳
২/ চেক = ${dayChequeAmount > 0 ? `${toBengaliDigits(dayChequeAmount.toLocaleString('en-IN'))} ৳/` : '০/'}
    =====সিমেন্ট =====
${cementBlockLines.join('\n')}

       ===== রড=====

রড বিক্রয় = ${formatRodVal(rodSoldKg)}
${dayRodReturnKg > 0 ? `রড ফেরত = ${formatRodVal(dayRodReturnKg, true)}\n` : ''}রড প্রাপ্তি = ${formatRodVal(rodBoughtKg, true)}
রড সরাসরি= ${formatRodVal(rodDirectKg, true)}
রড স্টক = ${formatRodVal(totalRodStockKg, true)}`;

    return {
      dateFormattedBn,
      totalCashBalance,
      dayChequeAmount,
      cementSoldBags,
      cementBoughtBags,
      cementDirectBags,
      totalCementStockBags,
      realCementList,
      rodSoldKg,
      rodBoughtKg,
      rodDirectKg,
      totalRodStockKg,
      fullDailyReportText,
      formatQtyOrZero,
      formatRodVal
    };
  }, [orders, purchases, allTransactions, products, totalCashBalance]);

  const handleCopyDailyReport = () => {
    if (dailyReportData?.fullDailyReportText) {
      navigator.clipboard.writeText(dailyReportData.fullDailyReportText);
      setCopiedReport(true);
      toast.success('মেসার্স দেলোয়ার এন্ড ব্রাদার্স ডেইলি রিপোর্ট কপি করা হয়েছে!');
      setTimeout(() => setCopiedReport(false), 2500);
    }
  };

  const netProfitVal = Math.max(0, totalMonthlySalesVal - totalMonthlyPurchasesVal);
  const profitMarginPercent = totalMonthlySalesVal > 0 ? Math.min(100, Math.round((netProfitVal / totalMonthlySalesVal) * 100)) : 0;

  const weeklyData = useMemo(() => {
    if (stats?.weeklyData && stats.weeklyData.length > 0) {
      return stats.weeklyData;
    }
    return [
      { name: 'সোম', বিক্রয়: 0, ক্রয়: 0 },
      { name: 'মঙ্গল', বিক্রয়: 0, ক্রয়: 0 },
      { name: 'বুধ', বিক্রয়: 0, ক্রয়: 0 },
      { name: 'বৃহস্পতি', বিক্রয়: 0, ক্রয়: 0 },
      { name: 'শুক্র', বিক্রয়: 0, ক্রয়: 0 },
      { name: 'শনি', বিক্রয়: 0, ক্রয়: 0 },
      { name: 'রবি', বিক্রয়: 0, ক্রয়: 0 },
    ];
  }, [stats]);

  // Current Month Rod and Cement Sales Analytics
  const monthlyRodAndCementSales = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    const safeParseDate = (dVal: any) => {
      if (!dVal) return null;
      try {
        if (dVal instanceof Date) return isNaN(dVal.getTime()) ? null : dVal;
        let str = String(dVal).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          const [y, m, d] = str.split('-').map(Number);
          return new Date(y, m - 1, d, 12, 0, 0);
        }
        if (str.includes(' ') && !str.includes('T')) {
          str = str.replace(' ', 'T');
        }
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    };

    let rodTotalAmount = 0;
    let rodTotalKg = 0;
    let cementTotalAmount = 0;
    let cementTotalBags = 0;

    orders.forEach(o => {
      const d = safeParseDate(o.createdAt);
      if (!d || d.getFullYear() !== curYear || d.getMonth() !== curMonth) return;

      const items = o.items || [];
      if (items.length > 0) {
        items.forEach(i => {
          const itemTotal = Number(i.total || (Number(i.quantity || 0) * Number(i.price || 0)));
          const qty = Number(i.quantity || 0);
          const u = (i.unit || '').toLowerCase();

          if (isCementProduct(i)) {
            cementTotalAmount += itemTotal;
            cementTotalBags += qty;
          } else if (isRodProduct(i)) {
            rodTotalAmount += itemTotal;
            rodTotalKg += u.includes('টন') ? qty * 1000 : qty;
          }
        });
      }
    });

    const rodTon = rodTotalKg / 1000;
    const rodTonFormatted = rodTon % 1 === 0 ? rodTon.toLocaleString('en-IN') : rodTon.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    const rodKgFormatted = rodTotalKg % 1 === 0 ? rodTotalKg.toLocaleString('en-IN') : rodTotalKg.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const cementBagsFormatted = cementTotalBags.toLocaleString('en-IN');

    const rodDisplayMain = rodTotalKg >= 1000 ? `${toBengaliDigits(rodTonFormatted)} টন` : `${toBengaliDigits(rodKgFormatted)} কেজি`;
    const rodDisplaySub = rodTotalKg >= 1000 ? `${toBengaliDigits(rodKgFormatted)} কেজি` : (rodTotalKg > 0 ? `${toBengaliDigits(rodTonFormatted)} টন` : '');

    return {
      rodTotalAmount,
      rodTotalKg,
      rodTon,
      rodDisplayMain,
      rodDisplaySub,
      rodTonStr: `${toBengaliDigits(rodTonFormatted)} টন`,
      rodKgStr: `${toBengaliDigits(rodKgFormatted)} কেজি`,
      cementTotalAmount,
      cementTotalBags,
      cementBagsStr: `${toBengaliDigits(cementBagsFormatted)} ব্যাগ`,
    };
  }, [orders]);

  // Last 7 Days Rod & Cement Sales Trend
  const weeklyCategoryTrend = useMemo(() => {
    const days: { dateStr: string; name: string; rodAmount: number; rodKg: number; cementAmount: number; cementBags: number }[] = [];
    const dayNames = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];
    const now = new Date();

    const safeParseDate = (dVal: any) => {
      if (!dVal) return null;
      try {
        if (dVal instanceof Date) return isNaN(dVal.getTime()) ? null : dVal;
        let str = String(dVal).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          const [y, m, d] = str.split('-').map(Number);
          return new Date(y, m - 1, d, 12, 0, 0);
        }
        if (str.includes(' ') && !str.includes('T')) {
          str = str.replace(' ', 'T');
        }
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    };

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = format(d, 'yyyy-MM-dd');
      days.push({
        dateStr: dStr,
        name: dayNames[d.getDay()],
        rodAmount: 0,
        rodKg: 0,
        cementAmount: 0,
        cementBags: 0
      });
    }

    orders.forEach(o => {
      const d = safeParseDate(o.createdAt);
      if (!d) return;
      const dStr = format(d, 'yyyy-MM-dd');
      const targetDay = days.find(day => day.dateStr === dStr);
      if (!targetDay) return;

      (o.items || []).forEach(i => {
        const itemTotal = Number(i.total || (Number(i.quantity || 0) * Number(i.price || 0)));
        const qty = Number(i.quantity || 0);
        const u = (i.unit || '').toLowerCase();

        if (isCementProduct(i)) {
          targetDay.cementAmount += itemTotal;
          targetDay.cementBags += qty;
        } else if (isRodProduct(i)) {
          targetDay.rodAmount += itemTotal;
          targetDay.rodKg += u.includes('টন') ? qty * 1000 : qty;
        }
      });
    });

    return days;
  }, [orders]);

  // Real Financial Pie Data
  const financialPieData = useMemo(() => {
    return [
      { name: 'মোট বিক্রয়', value: totalMonthlySalesVal, color: '#f97316' },
      { name: 'মোট ক্রয়', value: totalMonthlyPurchasesVal, color: '#6366f1' },
      { name: 'নিট লাভ', value: netProfitVal, color: '#10b981' },
    ];
  }, [totalMonthlySalesVal, totalMonthlyPurchasesVal, netProfitVal]);

  // All Products Purchase Price List (from Stock/Inventory Page)
  const productPriceList = useMemo(() => {
    if (products.length === 0) {
      return [];
    }

    return products.map((p) => {
      const name = fixMiliName(p.name);
      const unit = p.unit || (name.includes('রড') ? 'কেজি' : 'ব্যাগ');
      const purchasePrice = Number(p.purchasePrice || 0);
      const stock = Number(p.stock || 0);
      const totalStockVal = purchasePrice * stock;

      return {
        id: p.id,
        name,
        brand: p.brand || '',
        unit,
        purchasePrice,
        stock,
        totalStockVal,
        purchasePriceFormatted: purchasePrice > 0 ? `${toBengaliDigits(purchasePrice.toLocaleString('en-IN'))} ৳` : 'দর নেই',
        stockFormatted: `${toBengaliDigits(stock.toLocaleString('en-IN'))} ${unit}`
      };
    });
  }, [products]);

  const filteredProductPrices = useMemo(() => {
    if (!productPriceSearch.trim()) {
      return productPriceList;
    }
    const q = productPriceSearch.trim().toLowerCase();
    return productPriceList.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.brand.toLowerCase().includes(q) ||
      p.unit.toLowerCase().includes(q)
    );
  }, [productPriceList, productPriceSearch]);

  // Real Low Stock Warning List
  const lowStockAlertList = useMemo(() => {
    const filtered = products.filter(p => (p.stock || 0) <= (p.minStock || 10));
    if (filtered.length === 0) {
      return [];
    }
    return filtered.slice(0, 4).map(p => ({
      name: fixMiliName(p.name),
      stock: `${p.stock || 0} ${p.unit || 'একক'} বাকি`
    }));
  }, [products]);

  // Real Recent Sales List
  const recentSalesList = useMemo(() => {
    if (orders.length === 0) {
      return [];
    }

    return orders.slice(0, 5).map(o => {
      const firstItemName = o.items && o.items.length > 0 ? fixMiliName(o.items[0].name) : 'পণ্য';
      const extraItems = o.items && o.items.length > 1 ? ` (+${toBnNum(o.items.length - 1)}টি)` : '';
      const itemDesc = `${firstItemName}${extraItems}`;
      
      const d = getDate(o.createdAt);
      const diffMins = Math.max(1, Math.round((new Date().getTime() - d.getTime()) / (1000 * 60)));
      const timeStr = diffMins < 60 ? `${toBnNum(diffMins)} মি আগে` : diffMins < 1440 ? `${toBnNum(Math.round(diffMins / 60))} ঘ আগে` : d.toLocaleDateString('bn-BD');

      const due = o.dueAmount ?? ((o.totalAmount || 0) - (o.paidAmount || 0));
      const paid = o.paidAmount || 0;
      const status = due <= 0 ? 'পরিশোধিত' : paid > 0 ? 'আংশিক' : 'বাকি';

      return {
        customer: o.customerName || 'সম্মানিত কাস্টমার',
        amount: formatBnCurrency(o.totalAmount || 0),
        item: itemDesc,
        time: timeStr,
        status
      };
    });
  }, [orders]);

  return (
    <Shell>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full font-bengali">
        
        {/* ==================== STAT CARDS WITH UNIQUE MINI GRAPHS ==================== */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {/* CARD 1: CASH BALANCE (Smooth Curved Area Chart) */}
          <StatCard 
            title="নগদ ক্যাশ ব্যালেন্স" 
            value={formatBnCurrency(totalCashBalance)} 
            icon={Wallet} 
            trend={totalCashBalance < 0 ? 'ঘাটতি' : 'ক্যাশ'} 
            trendUp={totalCashBalance >= 0} 
            description={totalCashBalance < 0 ? 'ক্যাশ ব্যালেন্স ঘাটতি' : 'গাল্লা ক্যাশ ব্যালেন্স'}
            bg={totalCashBalance < 0 ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-emerald-500 to-teal-500'}
            iconBg={totalCashBalance < 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}
            badgeBg={totalCashBalance < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}
            graphType="area"
            strokeColor={totalCashBalance < 0 ? '#ef4444' : '#10b981'}
            gradId="cashGrad"
            graphData={weeklyData.map(d => ({ v: d.বিক্রয় }))}
          />

          {/* CARD 2: BANK BALANCE (Stepped Line Chart) */}
          <StatCard 
            title="ব্যাংক ব্যালেন্স" 
            value={formatBnCurrency(totalBankBalance)} 
            icon={Landmark} 
            trend={totalBankBalance < 0 ? 'ঘাটতি' : 'ব্যাংক জমা'} 
            trendUp={totalBankBalance >= 0} 
            description={totalBankBalance < 0 ? 'ব্যাংক ব্যালেন্স মাইনাস' : 'ব্যাংক অ্যাকাউন্টের জমা'}
            bg={totalBankBalance < 0 ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}
            iconBg={totalBankBalance < 0 ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}
            badgeBg={totalBankBalance < 0 ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}
            graphType="step"
            strokeColor={totalBankBalance < 0 ? '#ef4444' : '#3b82f6'}
            graphData={weeklyData.map(d => ({ v: d.ক্রয় }))}
          />

          {/* CARD 3: TOTAL DUES (Pillar Bar Histogram Chart) */}
          <StatCard 
            title="মোট বকেয়া পাওনা" 
            value={formatBnCurrency(totalDuesAmount)} 
            icon={Banknote} 
            trend="কাস্টমার পাওনা" 
            trendUp={false} 
            description="ক্রেতাদের বকেয়া পাওনা"
            bg="bg-gradient-to-br from-rose-500 to-pink-600"
            iconBg="bg-rose-100 text-rose-600"
            badgeBg="bg-rose-100 text-rose-700"
            graphType="bar"
            strokeColor="#f43f5e"
            graphData={weeklyData.map(d => ({ v: Math.max(0, d.বিক্রয় - d.ক্রয়) }))}
          />

          {/* CARD 4: MONTHLY ROD SALES */}
          <StatCard 
            title="চলতি মাসের রড বিক্রি" 
            value={monthlyRodAndCementSales.rodDisplayMain} 
            subValue={monthlyRodAndCementSales.rodDisplaySub || undefined}
            icon={TrendingUp} 
            trend="রড সেলস" 
            trendUp={true} 
            description="চলতি মাসের মোট রড"
            bg="bg-gradient-to-br from-[#8c6b1c] via-[#b88e2d] to-[#d4af37]"
            iconBg="bg-amber-100/90 text-amber-800"
            badgeBg="bg-amber-100 text-amber-800"
            graphType="double-line"
            strokeColor="#b88e2d"
            graphData={weeklyCategoryTrend.map(d => ({ v: d.rodKg, t: d.rodKg * 0.7 }))}
          />

          {/* CARD 5: MONTHLY CEMENT SALES */}
          <StatCard 
            title="চলতি মাসের সিমেন্ট বিক্রি" 
            value={monthlyRodAndCementSales.cementBagsStr} 
            icon={PackageCheck} 
            trend="সিমেন্ট সেলস" 
            trendUp={true} 
            description="চলতি মাসের মোট সিমেন্ট"
            bg="bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600"
            iconBg="bg-amber-100 text-amber-800"
            badgeBg="bg-amber-100 text-amber-800"
            graphType="segmented-bars"
            graphData={weeklyCategoryTrend.map(d => ({ v: d.cementBags }))}
          />
        </div>

        {/* ==================== QUICK SHORTCUTS ROW (FULL WIDTH BALANCED 6-COL TILES) ==================== */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-4.5 shadow-sm space-y-3 font-bengali w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#8c6b1c] via-[#b88e2d] to-[#d4af37] text-white flex items-center justify-center font-bold shadow-xs flex-shrink-0">
                <Zap className="w-4 h-4 fill-white/20" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-none">দ্রুত শর্টকাট ও কার্যক্রম</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70">
                    {toBnNum(allShortcuts.length)}টি অ্যাকশন
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1">দোকানের প্রধান ও নিয়মিত কার্যক্রমগুলো এক ক্লিকে সম্পন্ন করুন</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 font-medium">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/60">
                <Sparkles className="w-3 h-3 text-[#b88e2d]" /> এক ক্লিকে সরাসরি প্রবেশ
              </span>
            </div>
          </div>

          {/* Full-width Balanced Grid - 6 columns on lg, 3 on sm, 2 on xs - ZERO empty space */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 w-full">
            {allShortcuts.map((action) => (
              <Link 
                key={action.href} 
                href={action.href}
                className={cn(
                  "group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border bg-gradient-to-b transition-all duration-300 shadow-2xs hover:shadow-md hover:-translate-y-0.5 overflow-hidden",
                  action.accentBg,
                  action.accentBorder
                )}
              >
                {/* Top subtle accent highlight bar */}
                <div className={cn("absolute top-0 left-0 right-0 h-1 transition-all duration-300 opacity-60 group-hover:opacity-100", action.accentLine)} />

                {/* Top Row: Icon + Tag Badge */}
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <div className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white shadow-xs transition-transform duration-300 group-hover:scale-110 bg-gradient-to-br flex-shrink-0",
                    action.gradient,
                    action.iconShadow
                  )}>
                    <action.icon className="w-4 h-4" />
                  </div>

                  <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-600 border border-slate-200/70 shadow-2xs group-hover:border-slate-300 transition-colors">
                    {action.tag}
                  </span>
                </div>

                {/* Bottom Content: Title + Subtitle + Micro hover arrow */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className={cn(
                      "text-xs sm:text-[13px] font-black text-slate-900 tracking-tight transition-colors leading-snug truncate",
                      action.accentText
                    )}>
                      {action.label}
                    </h4>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                  </div>

                  <p className="text-[9.5px] sm:text-[10px] text-slate-400 group-hover:text-slate-600 font-medium leading-tight truncate">
                    {action.sub}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ==================== TOP ANALYSIS ROW: WEEKLY CHART + TALL DAILY REPORT ==================== */}
        <div className="grid grid-cols-12 gap-6 items-stretch">
          {/* Main Area Chart: Weekly Trends */}
          <div className="col-span-12 lg:col-span-7 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200/80 font-bengali flex flex-col justify-between">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-800 text-base">সাপ্তাহিক লেনদেন বিশ্লেষণ</h3>
                <p className="text-xs font-semibold text-slate-400">গত ৭ দিনের বিক্রি ও ক্রয়ের তুলনামূলক চার্ট</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-xs font-bold text-slate-600">বিক্রয়</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-xs font-bold text-slate-600">ক্রয়</span>
                </div>
                <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-orange-200">এই সপ্তাহ</span>
              </div>
            </div>
            <div className="p-6 flex-1 min-h-[320px] w-full min-w-0">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gPurchase" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} className="font-bold" dy={10} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `৳${toBnNum((v / 1000).toFixed(0))}কে`} dx={-8} />
                    <Tooltip contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', fontSize: '12px', fontWeight: 700, padding: '10px 16px' }} itemStyle={{ color: '#1e293b' }} />
                    <Area type="monotone" dataKey="বিক্রয়" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#gSales)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#f97316' }} />
                    <Area type="monotone" dataKey="ক্রয়" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#gPurchase)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#6366f1' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Daily Report: Tall Card Beside Weekly Chart */}
          <div className="col-span-12 lg:col-span-5 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200/80 flex flex-col justify-between font-bengali">
            {/* Header Banner (Light & Premium) */}
            <div className="bg-gradient-to-r from-slate-50 via-white to-amber-50/40 p-4 sm:p-4.5 flex items-center justify-between gap-2 border-b border-slate-200/80">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-amber-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-xs">
                    দেলোয়ার এন্ড ব্রাদার্স
                  </span>
                  <span className="bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-200 px-2 py-0.5 rounded-full">
                    গোপালগঞ্জ শাখা
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shadow-2xs">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span>ডেইলি রিপোর্ট</span>
                  </h3>
                  <span className="text-[10px] sm:text-[10.5px] text-amber-900 font-bold bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                    {dailyReportData.dateFormattedBn}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleCopyDailyReport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                  title="হোয়াটসঅ্যাপ / এসএমএস ফরম্যাটে রিপোর্ট কপি করুন"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReport ? 'কপি হয়েছে' : 'কপি'}</span>
                </button>

                <button
                  onClick={() => setShowTextPreview(!showTextPreview)}
                  className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-[10px] px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                  title="টেক্সট মেসেজ ফরম্যাট প্রিভিউ অন/অফ"
                >
                  {showTextPreview ? 'লুকান' : 'প্রিভিউ'}
                </button>

                <Link
                  href="/reports?tab=daily_sales"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1"
                  title="সম্পূর্ণ রিপোর্ট দেখুন"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Collapsible Raw Text Preview (Light & Clean) */}
            {showTextPreview && (
              <div className="bg-slate-50 text-slate-800 p-3 border-b border-slate-200 font-mono text-[10.5px] whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                <div className="flex justify-between items-center text-slate-500 border-b border-slate-200 pb-1.5 mb-1.5 font-bengali text-[10px]">
                  <span className="font-bold text-slate-700">হোয়াটসঅ্যাপ মেসেজ ফরম্যাট:</span>
                  <button
                    onClick={handleCopyDailyReport}
                    className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> কপি
                  </button>
                </div>
                {dailyReportData.fullDailyReportText}
              </div>
            )}

            {/* Tall Vertical Body: Cash & Cheque on Top, Cement & Rod Below */}
            <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3">
              {/* 0. Cash & Cheque Collection Summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-200/90 rounded-2xl p-2.5 flex items-center justify-between shadow-2xs">
                  <div>
                    <p className="text-[9.5px] font-bold text-emerald-800 leading-none">১/ ক্যাশ ব্যালেন্স</p>
                    <p className="text-xs sm:text-sm font-black text-emerald-700 mt-1">
                      {dailyReportData.totalCashBalance !== 0 ? `${toBengaliDigits(Math.round(dailyReportData.totalCashBalance).toLocaleString('en-IN'))} ৳` : '০০ ৳'}
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50/80 to-amber-50/50 border border-indigo-200/90 rounded-2xl p-2.5 flex items-center justify-between shadow-2xs">
                  <div>
                    <p className="text-[9.5px] font-bold text-indigo-800 leading-none">২/ চেক আদায়</p>
                    <p className="text-xs sm:text-sm font-black text-indigo-700 mt-1">
                      {dailyReportData.dayChequeAmount > 0 ? `${toBengaliDigits(dailyReportData.dayChequeAmount.toLocaleString('en-IN'))} ৳/` : '০/'}
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-indigo-100/90 text-indigo-700 flex items-center justify-center shrink-0">
                    <Receipt className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* 1. Cement Closing */}
              <div className="bg-gradient-to-br from-blue-50/60 via-white to-sky-50/40 border border-blue-200/80 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-blue-200/60 pb-1.5">
                  <span className="font-black text-blue-950 text-xs flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    সিমেন্ট ক্লোজিং
                  </span>
                  <span className="text-[9px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                    ব্যাগ হিসাব
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="bg-white border border-blue-100 rounded-xl p-1.5 shadow-2xs">
                    <p className="text-[8.5px] font-bold text-slate-500 leading-none">বিক্রয়</p>
                    <p className="text-xs sm:text-sm font-black text-blue-700 mt-1">
                      {dailyReportData.formatQtyOrZero(dailyReportData.cementSoldBags)}
                    </p>
                  </div>
                  <div className="bg-white border border-emerald-100 rounded-xl p-1.5 shadow-2xs">
                    <p className="text-[8.5px] font-bold text-slate-500 leading-none">প্রাপ্তি</p>
                    <p className="text-xs sm:text-sm font-black text-emerald-700 mt-1">
                      {dailyReportData.formatQtyOrZero(dailyReportData.cementBoughtBags)}
                    </p>
                  </div>
                  <div className="bg-white border border-amber-100 rounded-xl p-1.5 shadow-2xs">
                    <p className="text-[8.5px] font-bold text-slate-500 leading-none">সরাসরি</p>
                    <p className="text-xs sm:text-sm font-black text-amber-700 mt-1">
                      {dailyReportData.formatQtyOrZero(dailyReportData.cementDirectBags)}
                    </p>
                  </div>
                  <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-1.5 shadow-2xs">
                    <p className="text-[8.5px] font-bold text-indigo-900 leading-none">স্টক</p>
                    <p className="text-xs sm:text-sm font-black text-indigo-700 mt-1">
                      {dailyReportData.formatQtyOrZero(dailyReportData.totalCementStockBags)}
                    </p>
                  </div>
                </div>

                {dailyReportData.realCementList.length > 0 && (
                  <div className="bg-white/80 border border-blue-100 rounded-xl p-2 space-y-1 shadow-2xs">
                    <p className="text-[8.5px] font-bold text-slate-500">ব্র্যান্ড অনুযায়ী মজুদ:</p>
                    <div className="flex flex-wrap gap-1">
                      {dailyReportData.realCementList.map((b, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-[9px] font-bold bg-blue-50 text-blue-900 border border-blue-200/80 px-1.5 py-0.5 rounded-md">
                          <span>{b.name}:</span>
                          <span className="font-black text-blue-700">{dailyReportData.formatQtyOrZero(b.stock)} ব্যাগ</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Rod Closing */}
              <div className="bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40 border border-orange-200/80 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-orange-200/60 pb-1.5">
                  <span className="font-black text-orange-950 text-xs flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-orange-600" />
                    রড ও রিং ক্লোজিং
                  </span>
                  <span className="text-[9px] font-black bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md">
                    কেজি হিসাব
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="bg-white border border-orange-100 rounded-xl p-1.5 shadow-2xs">
                    <p className="text-[8.5px] font-bold text-slate-500 leading-none">বিক্রয়</p>
                    <p className="text-xs sm:text-sm font-black text-orange-700 mt-1">
                      {dailyReportData.formatRodVal(dailyReportData.rodSoldKg)}
                    </p>
                  </div>
                  <div className="bg-white border border-emerald-100 rounded-xl p-1.5 shadow-2xs">
                    <p className="text-[8.5px] font-bold text-slate-500 leading-none">প্রাপ্তি</p>
                    <p className="text-xs sm:text-sm font-black text-emerald-700 mt-1">
                      {dailyReportData.formatRodVal(dailyReportData.rodBoughtKg, true)}
                    </p>
                  </div>
                  <div className="bg-white border border-amber-100 rounded-xl p-1.5 shadow-2xs">
                    <p className="text-[8.5px] font-bold text-slate-500 leading-none">সরাসরি</p>
                    <p className="text-xs sm:text-sm font-black text-amber-700 mt-1">
                      {dailyReportData.formatRodVal(dailyReportData.rodDirectKg, true)}
                    </p>
                  </div>
                  <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-1.5 shadow-2xs">
                    <p className="text-[8.5px] font-bold text-amber-900 leading-none">স্টক</p>
                    <p className="text-xs sm:text-sm font-black text-amber-800 mt-1">
                      {dailyReportData.formatRodVal(dailyReportData.totalRodStockKg, true)}
                    </p>
                  </div>
                </div>

                <div className="bg-white/80 border border-orange-100 rounded-xl p-2 flex items-center justify-between text-xs shadow-2xs">
                  <span className="text-[9.5px] font-bold text-slate-600">মোট রড ও রিং মজুদ:</span>
                  <span className="font-black text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md text-[10px]">
                    {dailyReportData.formatRodVal(dailyReportData.totalRodStockKg, true)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== MIDDLE ROW: RECENT SALES + CURRENT STOCK ==================== */}
        <div className="grid grid-cols-12 gap-6 items-stretch">
          {/* Recent Sales Table */}
          <div className="col-span-12 lg:col-span-7 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200/80 font-bengali flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
                    <History className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-black text-slate-800 text-base">সাম্প্রতিক বিক্রয়</h3>
                </div>
                <Link href="/orders" className="flex items-center gap-1 text-xs text-orange-600 font-black uppercase tracking-widest hover:text-orange-700 transition-colors font-bengali">
                  সব দেখুন <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {recentSalesList.length > 0 ? (
                  recentSalesList.map((sale, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 transition-colors group font-bengali">
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-md transition-transform group-hover:scale-105",
                        i === 0 ? 'bg-orange-500 shadow-orange-200' :
                        i === 1 ? 'bg-indigo-600 shadow-indigo-200' :
                        i === 2 ? 'bg-rose-500 shadow-rose-200' :
                        i === 3 ? 'bg-emerald-500 shadow-emerald-200' :
                        'bg-blue-600 shadow-blue-200'
                      )}>
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{sale.customer}</p>
                        <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">{sale.item} · {sale.time}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-black text-slate-800">{sale.amount}</p>
                        <span className={cn(
                          "inline-flex text-[10px] font-black px-2.5 py-0.5 rounded-full mt-1",
                          sale.status === 'পরিশোধিত' ? 'bg-emerald-100 text-emerald-700' :
                          sale.status === 'আংশিক' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        )}>{sale.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400 font-medium">
                    কোন সাম্প্রতিক বিক্রয় ট্রানজ্যাকশন নেই।
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product Purchase Price List (from Stock/Inventory Page) */}
          <div className="col-span-12 lg:col-span-5 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200/80 flex flex-col font-bengali">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20 text-white flex-shrink-0">
                  <Tag className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-slate-800 text-sm">পণ্যের ক্রয়মূল্য তালিকা</h3>
                    <span className="text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full">
                      {toBengaliDigits(productPriceList.length)}টি পণ্য
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">স্টক পেজের বর্তমান ক্রয়মূল্য (দর) ও মোট মূল্য</p>
                </div>
              </div>
              <Link href="/inventory" className="text-[11px] font-bold text-blue-600 hover:underline flex-shrink-0">
                ইনভেন্টরি ➔
              </Link>
            </div>

            {/* Quick Search inside Product Prices */}
            {productPriceList.length > 3 && (
              <div className="px-5 pt-3 pb-1 border-b border-slate-50">
                <div className="relative">
                  <input
                    type="text"
                    value={productPriceSearch}
                    onChange={(e) => setProductPriceSearch(e.target.value)}
                    placeholder="পণ্য বা ক্রয়মূল্য খুঁজুন..."
                    className="w-full text-xs font-medium pl-8 pr-7 py-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-blue-500 text-slate-800 transition-all placeholder:text-slate-400"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {productPriceSearch && (
                    <button 
                      onClick={() => setProductPriceSearch('')} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs w-4 h-4 flex items-center justify-center"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 flex-1 space-y-2.5 overflow-y-auto max-h-[380px]">
              {filteredProductPrices.length > 0 ? (
                filteredProductPrices.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-3 rounded-2xl bg-slate-50/70 hover:bg-blue-50/40 border border-slate-200/70 hover:border-blue-200 transition-all duration-200 flex items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-slate-800 text-xs truncate max-w-[210px]">{item.name}</span>
                        {item.brand && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {item.brand}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-medium flex-wrap">
                        <span>মজুদ: <strong className="text-slate-700 font-bold">{item.stockFormatted}</strong></span>
                        {item.totalStockVal > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span>মোট মূল্য: <strong className="text-slate-700 font-bold">{formatBnCurrency(item.totalStockVal)}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <div className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-xl bg-blue-50 text-blue-900 border border-blue-200/80 shadow-2xs">
                        <span className="text-[10px] text-blue-600 font-bold">ক্রয়মূল্য:</span>
                        <span className="text-sm font-black text-blue-800">{item.purchasePriceFormatted}</span>
                        {item.purchasePrice > 0 && (
                          <span className="text-[9.5px] text-blue-600 font-bold">/{item.unit}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  {productPriceSearch ? 'কোন পণ্যের ক্রয়মূল্য খুঁজে পাওয়া যায়নি।' : 'কোন পণ্য যুক্ত করা হয়নি। ইনভেন্টরি পেজ থেকে পণ্য যুক্ত করুন।'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================== LOWER ROW: FINANCIAL SUMMARY + STOCK ALERTS ==================== */}
        <div className="grid grid-cols-12 gap-6">
          {/* Monthly Financial Donut Chart Widget (Gol Chart) */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200/80 p-6 flex flex-col justify-between font-bengali">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">মাসিক সারসংক্ষেপ</h3>
                  <p className="text-[10px] font-bold text-slate-400">আয়-ব্যয় ও নিট লাভের গোল চার্ট</p>
                </div>
              </div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> +{toBnNum(profitMarginPercent)}%
              </span>
            </div>

            <div className="flex flex-col items-center py-2 space-y-4">
              {/* Circular Donut Chart */}
              <div className="relative w-44 h-44 flex items-center justify-center min-w-0">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={financialPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={72}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {financialPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400">নিট লাভ</span>
                  <span className="text-sm font-black text-slate-800 mt-0.5">{formatBnCurrency(netProfitVal)}</span>
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-0.5 border border-emerald-100">
                    {toBnNum(profitMarginPercent)}% মার্জিন
                  </span>
                </div>
              </div>

              {/* Donut Chart Legend & Breakdown */}
              <div className="w-full space-y-2.5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-50/70 border border-orange-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span className="text-xs font-bold text-slate-700">মোট বিক্রয়</span>
                  </div>
                  <span className="text-xs font-black text-orange-700">{formatBnCurrency(totalMonthlySalesVal)}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span className="text-xs font-bold text-slate-700">মোট ক্রয়</span>
                  </div>
                  <span className="text-xs font-black text-indigo-700">{formatBnCurrency(totalMonthlyPurchasesVal)}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-700">নিট লাভ</span>
                  </div>
                  <span className="text-xs font-black text-emerald-700">{formatBnCurrency(netProfitVal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stock Alert Card */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200/80 overflow-hidden font-bengali">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center shadow-md shadow-rose-500/20">
                  <TrendingDown className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm text-slate-800 font-black">স্টক সতর্কতা</p>
              </div>
              <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">জরুরি</span>
            </div>
            <div className="p-4 space-y-2">
              {lowStockAlertList.length > 0 ? (
                lowStockAlertList.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-rose-50/60 hover:bg-rose-50 transition-colors rounded-xl border border-rose-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <p className="text-sm font-bold text-slate-800">{item.name}</p>
                    </div>
                    <span className="text-[11px] text-rose-600 font-black bg-white px-2.5 py-1 rounded-lg shadow-xs border border-rose-200">{item.stock}</span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-emerald-600 font-bold bg-emerald-50/60 rounded-xl border border-emerald-100">
                  ✓ কোনো কম স্টক পণ্য নেই! সব পর্যাপ্ত।
                </div>
              )}
              <Link href="/inventory" className="flex items-center justify-center gap-1 text-xs text-indigo-600 font-black hover:text-indigo-800 pt-1.5 transition-colors">
                সব পণ্য দেখুন <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </Shell>
  );
}

function StatCard({ 
  title, 
  value, 
  subValue,
  icon: Icon, 
  trend, 
  trendUp, 
  description, 
  bg, 
  iconBg, 
  badgeBg,
  graphType,
  graphData,
  strokeColor,
  gradId
}: any) {
  const isMounted = useIsMounted();

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-white shadow-xl shadow-slate-200/50 border border-slate-200/80 group hover:-translate-y-1 transition-all duration-300 font-bengali flex flex-col justify-between">
      {/* Accent gradient strip */}
      <div className={cn("absolute top-0 left-0 right-0 h-1.5", bg)} />
      
      <div className="relative p-5 pb-2">
        <div className="flex justify-between items-start mb-3">
          <p className="text-xs font-bold text-slate-500 leading-tight">{title}</p>
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0", iconBg)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{value}</h3>
          {subValue && (
            <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
              {subValue}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-2.5">
          <span className={cn(
            "flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-lg",
            badgeBg
          )}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </span>
          <span className="text-[10px] font-semibold text-slate-400 truncate">{description}</span>
        </div>
      </div>

      {/* Unique Mini Graph Area at the Bottom */}
      <div className="h-14 w-full mt-2 overflow-hidden relative min-w-0">
        {isMounted && graphType === 'area' && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={graphData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId || 'areaGrad'} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.5} fillOpacity={1} fill={`url(#${gradId || 'areaGrad'})`} />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {isMounted && graphType === 'step' && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={graphData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Line type="stepAfter" dataKey="v" stroke={strokeColor} strokeWidth={2.5} dot={{ r: 2.5, fill: strokeColor }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {isMounted && graphType === 'bar' && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={graphData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <Bar dataKey="v" fill={strokeColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {isMounted && graphType === 'double-line' && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={graphData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Line type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="t" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {graphType === 'segmented-bars' && (
          <div className="flex items-end justify-between px-5 h-full pb-2 gap-1.5">
            {graphData.map((d: any, idx: number) => {
              const maxVal = Math.max(...graphData.map((x: any) => Number(x.v) || 0), 10);
              const heightPercent = Math.min(100, Math.max(20, Math.round(((Number(d.v) || 0) / maxVal) * 100)));
              return (
                <div key={idx} className="flex-1 bg-amber-100/60 rounded-md h-full flex items-end overflow-hidden p-0.5">
                  <div 
                    className="w-full rounded-xs transition-all duration-500 bg-amber-500 hover:bg-amber-600" 
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
