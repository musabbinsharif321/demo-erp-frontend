'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { api, ShopSettingsData } from '@/lib/api';
import {
  BarChart3, Users, Landmark, FileText, ShoppingCart, 
  TrendingUp, RefreshCcw, Calendar, Search, 
  Wallet, Truck, PieChart, Printer, Scale,
  Plus, Percent, ArrowRight, ArrowLeft, Clock,
  CheckCircle2, ShoppingBag, Layers, DollarSign,
  Filter, ArrowUpDown, ChevronDown, Check,
  Building, AlertCircle, Eye, EyeOff, Package,
  TrendingDown, FileSpreadsheet, ArrowUpRight,
  ArrowDownRight, ShieldCheck, Download
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  format, isToday, isYesterday, isSameWeek, isSameMonth, isSameYear,
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, subDays, subMonths
} from 'date-fns';
import { bn } from 'date-fns/locale';
import { printElement } from '@/lib/printUtils';
import { toBengaliDigits } from '@/lib/bengaliUtils';

// Universal Bengali number & currency helpers
const formatBnNum = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '০';
  const num = Math.round(amount);
  return toBengaliDigits(num.toLocaleString('en-IN'));
};

const formatBnDec = (amount: number | undefined | null, decimals: number = 2): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '০';
  const val = Number(amount);
  const formatted = val % 1 === 0 ? val.toLocaleString('en-IN') : val.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: decimals });
  return toBengaliDigits(formatted);
};

const formatBnDate = (dateVal: Date | string | undefined | null, pattern: string = 'dd MMMM yyyy'): string => {
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

const formatBnTime = (dateVal: Date | string | undefined | null): string => {
  if (!dateVal) return '';
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return '';
    const raw = format(d, 'hh:mm a', { locale: bn })
      .replace('AM', 'পূর্বাহ্ন')
      .replace('PM', 'অপরাহ্ন');
    return toBengaliDigits(raw);
  } catch {
    return '';
  }
};

interface ReportOrderItem {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  total: number;
  buyPrice?: number;
}

interface ReportOrder {
  id: string;
  invoiceNo?: string;
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  profit?: number;
  costAmount?: number;
  paymentMethod?: string;
  items: ReportOrderItem[];
  createdAt: any;
  notes?: string;
}

interface ReportPurchase {
  id: string;
  invoiceNo?: string;
  supplierName?: string;
  supplierPhone?: string;
  supplierId?: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod?: string;
  items: ReportOrderItem[];
  createdAt: any;
}

interface ReportExpense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod?: string;
}

interface ReportProduct {
  id: string;
  name: string;
  sku?: string;
  category: string;
  brand?: string;
  stock: number;
  unit: string;
  buyPrice: number;
  sellPrice: number;
}

interface ReportParty {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  businessName?: string;
  totalDue: number;
  advanceBalance: number;
}

interface ReportBank {
  id: string;
  name: string;
  accNo: string;
  branch?: string;
  balance: number;
}

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom';

function MasterReportsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawTab = searchParams ? searchParams.get('tab') : null;

  // Resolve aliases to canonical tabs
  const resolveTab = (t: string | null): string => {
    if (!t || t === 'hub') return 'hub';
    if (t === 'sales' || t === 'daily_sales') return 'sales';
    if (t === 'purchases' || t === 'trade_register') return 'purchases';
    if (t === 'profit_loss' || t === 'income_statement' || t === 'balance_sheet') return 'profit_loss';
    if (t === 'stock' || t === 'stock_sheet' || t === 'inventory') return 'stock';
    if (t === 'dues' || t === 'due_customers') return 'dues';
    if (t === 'daily_closing' || t === 'daily_topsheet' || t === 'bank_list') return 'daily_closing';
    return 'hub';
  };

  const [activeTab, setActiveTab] = useState<string>(resolveTab(rawTab));

  useEffect(() => {
    setActiveTab(resolveTab(rawTab));
  }, [rawTab]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', newTab);
    router.replace(`/reports?${params.toString()}`);
  };

  // Live Data States
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [purchases, setPurchases] = useState<ReportPurchase[]>([]);
  const [expenses, setExpenses] = useState<ReportExpense[]>([]);
  const [products, setProducts] = useState<ReportProduct[]>([]);
  const [customers, setCustomers] = useState<ReportParty[]>([]);
  const [suppliers, setSuppliers] = useState<ReportParty[]>([]);
  const [banks, setBanks] = useState<ReportBank[]>([]);
  const [totalCash, setTotalCash] = useState<number>(0);
  const [settings, setSettings] = useState<ShopSettingsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Date Filtering States
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [startDate, setStartDate] = useState<string>(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(() => format(endOfDay(new Date()), 'yyyy-MM-dd'));
  const [closingDate, setClosingDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));

  // Sub-tab / Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [purchaseSubTab, setPurchaseSubTab] = useState<'purchases' | 'expenses' | 'expense_summary'>('purchases');
  const [duesSubTab, setDuesSubTab] = useState<'customers' | 'suppliers'>('customers');

  // Bank Modal states
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccNo, setBankAccNo] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankBalance, setBankBalance] = useState<number>(0);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);

  // Fetch all core system data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [txList, partyList, prodList, expList, bankList, cashRes, setRes] = await Promise.all([
        api.transactions.list({ include_historical: true }).catch(() => []),
        api.parties.list().catch(() => []),
        api.inventory.list().catch(() => []),
        api.expenses.list().catch(() => []),
        api.banks.list().catch(() => []),
        api.dashboard.getStats().catch(() => ({ totalCash: 0 })),
        api.settings.get().catch(() => null)
      ]);

      const safeTx = Array.isArray(txList) ? txList : [];
      const safeParties = Array.isArray(partyList) ? partyList : [];
      const safeProds = Array.isArray(prodList) ? prodList : [];
      const safeExp = Array.isArray(expList) ? expList : [];
      const safeBanks = Array.isArray(bankList) ? bankList : [];

      if (setRes) setSettings(setRes);
      setTotalCash(Number(cashRes?.totalCash || 0));

      // 1. Map Products with lookup
      const prodCostMap = new Map<string, number>();
      const mappedProds: ReportProduct[] = safeProds.map((p: any) => {
        const buyPrice = Number(p.purchase_price || 0);
        const sellPrice = Number(p.sell_price || 0);
        prodCostMap.set(String(p.id), buyPrice);
        prodCostMap.set((p.name || '').trim().toLowerCase(), buyPrice);
        return {
          id: String(p.id),
          name: p.name,
          sku: p.sku || '',
          category: p.category_name || 'সাধারণ',
          brand: p.brand || '',
          stock: Number(p.stock || 0),
          unit: p.unit || 'পিস',
          buyPrice,
          sellPrice
        };
      });
      setProducts(mappedProds);

      // 2. Map Sales Orders
      const salesOrders: ReportOrder[] = safeTx
        .filter((t: any) => t.transaction_type === 'sale' && t.status !== 'cancelled' && t.status !== 'rejected')
        .map((t: any) => {
          const items: ReportOrderItem[] = (t.items || []).map((i: any) => {
            let buyPrice = Number(i.buy_price || 0);
            if (!buyPrice) {
              const pId = String(i.product || i.product_id || '');
              buyPrice = prodCostMap.get(pId) || prodCostMap.get((i.product_name || '').trim().toLowerCase()) || 0;
            }
            return {
              productId: String(i.product || i.product_id || ''),
              name: i.product_name,
              price: Number(i.price || 0),
              quantity: Number(i.quantity || 0),
              unit: i.unit || 'পিস',
              total: Number(i.total || (Number(i.price || 0) * Number(i.quantity || 0))),
              buyPrice
            };
          });

          // Calculate cost & profit if missing
          const totalCost = items.reduce((sum, item) => sum + ((item.buyPrice || 0) * item.quantity), 0);
          const totalAmt = Number(t.total_amount || 0);
          const computedProfit = t.profit !== undefined && Number(t.profit) !== 0 
            ? Number(t.profit) 
            : Math.round((totalAmt - totalCost) * 100) / 100;

          return {
            id: String(t.id || t.invoice_no),
            invoiceNo: t.invoice_no || String(t.id || ''),
            customerName: t.party_name || 'সাধারণ ক্রেতা',
            customerPhone: t.party_phone || '',
            customerId: String(t.party || ''),
            totalAmount: totalAmt,
            paidAmount: Number(t.paid_amount || 0),
            dueAmount: Number(t.due_amount || 0),
            costAmount: totalCost,
            profit: computedProfit,
            paymentMethod: t.payment_method || 'cash',
            items,
            createdAt: t.created_at,
            notes: t.notes || ''
          };
        });
      setOrders(salesOrders);

      // 3. Map Purchases
      const purchaseTx: ReportPurchase[] = safeTx
        .filter((t: any) => t.transaction_type === 'purchase' && t.status !== 'cancelled' && t.status !== 'rejected')
        .map((t: any) => ({
          id: String(t.id || t.invoice_no),
          invoiceNo: t.invoice_no || String(t.id || ''),
          supplierName: t.party_name || 'সরবরাহকারী',
          supplierPhone: t.party_phone || '',
          supplierId: String(t.party || ''),
          totalAmount: Number(t.total_amount || 0),
          paidAmount: Number(t.paid_amount || 0),
          dueAmount: Number(t.due_amount || 0),
          paymentMethod: t.payment_method || 'cash',
          items: (t.items || []).map((i: any) => ({
            name: i.product_name,
            price: Number(i.price || 0),
            quantity: Number(i.quantity || 0),
            unit: i.unit || 'পিস',
            total: Number(i.total || (Number(i.price || 0) * Number(i.quantity || 0)))
          })),
          createdAt: t.created_at
        }));
      setPurchases(purchaseTx);

      // 4. Map Expenses
      const mappedExp: ReportExpense[] = safeExp.map((e: any) => ({
        id: String(e.id),
        title: e.title,
        category: e.category_name || 'পরিচালন ব্যয়',
        amount: Number(e.amount || 0),
        date: e.date || format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: e.payment_method || 'cash'
      }));
      setExpenses(mappedExp);

      // 5. Map Customers & Suppliers
      const custs: ReportParty[] = safeParties
        .filter((p: any) => p.party_type === 'customer' || p.party_type === 'both')
        .map((p: any) => ({
          id: String(p.id),
          name: p.name,
          phone: p.phone || '',
          address: p.address || '',
          businessName: p.business_name || '',
          totalDue: Number(p.total_due || 0),
          advanceBalance: Number(p.advance_balance || 0)
        }));
      setCustomers(custs);

      const supps: ReportParty[] = safeParties
        .filter((p: any) => p.party_type === 'supplier' || p.party_type === 'both')
        .map((p: any) => ({
          id: String(p.id),
          name: p.name,
          phone: p.phone || '',
          address: p.address || '',
          businessName: p.business_name || '',
          totalDue: Number(p.total_due || 0),
          advanceBalance: Number(p.advance_balance || 0)
        }));
      setSuppliers(supps);

      // 6. Map Banks
      const mappedBanks: ReportBank[] = safeBanks.map((b: any) => ({
        id: String(b.id),
        name: b.name,
        accNo: b.account_number || '',
        branch: b.branch || '',
        balance: Number(b.balance || 0)
      }));
      setBanks(mappedBanks);

    } catch (err) {
      console.error('Failed to load reports data:', err);
      toast.error('রিপোর্ট ডাটা লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Date Range Quick Preset Handler
  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      const todayStr = format(now, 'yyyy-MM-dd');
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yestStr = format(subDays(now, 1), 'yyyy-MM-dd');
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === 'this_week') {
      setStartDate(format(startOfWeek(now, { weekStartsOn: 6 }), 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else if (preset === 'this_month') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else if (preset === 'last_month') {
      const prevMonth = subMonths(now, 1);
      setStartDate(format(startOfMonth(prevMonth), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(prevMonth), 'yyyy-MM-dd'));
    } else if (preset === 'this_year') {
      setStartDate(format(startOfYear(now), 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate(format(now, 'yyyy-MM-dd'));
    }
  };

  // Helper to test if a record falls within the active start & end date
  const isInDateRange = useCallback((recordDate: any) => {
    if (!recordDate) return false;
    let dStr = '';
    if (typeof recordDate === 'string') {
      dStr = recordDate.slice(0, 10);
    } else if (recordDate instanceof Date) {
      dStr = format(recordDate, 'yyyy-MM-dd');
    }
    if (!dStr) return false;
    return dStr >= startDate && dStr <= endDate;
  }, [startDate, endDate]);

  // Filtered Datasets based on Date Range
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (!isInDateRange(o.createdAt)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCust = (o.customerName || '').toLowerCase().includes(q);
        const matchesInv = (o.invoiceNo || '').toLowerCase().includes(q);
        const matchesPhone = (o.customerPhone || '').includes(q);
        if (!matchesCust && !matchesInv && !matchesPhone) return false;
      }
      return true;
    });
  }, [orders, isInDateRange, searchQuery]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (!isInDateRange(p.createdAt)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSupp = (p.supplierName || '').toLowerCase().includes(q);
        const matchesInv = (p.invoiceNo || '').toLowerCase().includes(q);
        if (!matchesSupp && !matchesInv) return false;
      }
      return true;
    });
  }, [purchases, isInDateRange, searchQuery]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (!isInDateRange(e.date)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesCat = e.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCat) return false;
      }
      return true;
    });
  }, [expenses, isInDateRange, searchQuery]);

  // SALES REPORT METRICS
  const salesMetrics = useMemo(() => {
    let totalSales = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let totalProfit = 0;
    let totalCost = 0;

    filteredOrders.forEach(o => {
      totalSales += o.totalAmount;
      totalPaid += o.paidAmount;
      totalDue += o.dueAmount;
      totalProfit += (o.profit || 0);
      totalCost += (o.costAmount || 0);
    });

    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
    return {
      count: filteredOrders.length,
      totalSales: Math.round(totalSales),
      totalPaid: Math.round(totalPaid),
      totalDue: Math.round(totalDue),
      totalProfit: Math.round(totalProfit),
      totalCost: Math.round(totalCost),
      profitMargin: Math.round(profitMargin * 10) / 10
    };
  }, [filteredOrders]);

  // PURCHASES & EXPENSES METRICS
  const purchaseExpenseMetrics = useMemo(() => {
    let totalPurchases = 0;
    let purchasesPaid = 0;
    let purchasesDue = 0;
    filteredPurchases.forEach(p => {
      totalPurchases += p.totalAmount;
      purchasesPaid += p.paidAmount;
      purchasesDue += p.dueAmount;
    });

    let totalExp = 0;
    filteredExpenses.forEach(e => {
      totalExp += e.amount;
    });

    return {
      purchaseCount: filteredPurchases.length,
      totalPurchases: Math.round(totalPurchases),
      purchasesPaid: Math.round(purchasesPaid),
      purchasesDue: Math.round(purchasesDue),
      expenseCount: filteredExpenses.length,
      totalExpenses: Math.round(totalExp),
      totalOutflow: Math.round(purchasesPaid + totalExp)
    };
  }, [filteredPurchases, filteredExpenses]);

  // EXPENSE SUMMARY BY CATEGORY
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredExpenses.forEach(e => {
      const cat = e.category || 'সাধারণ';
      const existing = map.get(cat) || { count: 0, total: 0 };
      map.set(cat, { count: existing.count + 1, total: existing.total + e.amount });
    });
    return Array.from(map.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      total: Math.round(data.total)
    })).sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  // PROFIT & LOSS / INCOME STATEMENT METRICS
  const pnlMetrics = useMemo(() => {
    const grossRevenue = salesMetrics.totalSales;
    const cogs = salesMetrics.totalCost;
    const grossProfit = Math.round(grossRevenue - cogs);
    const grossMargin = grossRevenue > 0 ? Math.round((grossProfit / grossRevenue) * 1000) / 10 : 0;
    const operatingExpenses = purchaseExpenseMetrics.totalExpenses;
    const netProfit = Math.round(grossProfit - operatingExpenses);
    const netMargin = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 1000) / 10 : 0;

    return {
      grossRevenue,
      cogs,
      grossProfit,
      grossMargin,
      operatingExpenses,
      netProfit,
      netMargin
    };
  }, [salesMetrics, purchaseExpenseMetrics]);

  // INVENTORY & STOCK METRICS
  const inventoryMetrics = useMemo(() => {
    let totalStockCost = 0;
    let totalStockRetail = 0;
    let totalItemsQty = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach(p => {
      const stock = Math.max(0, p.stock || 0);
      totalItemsQty += stock;
      totalStockCost += stock * (p.buyPrice || 0);
      totalStockRetail += stock * (p.sellPrice || 0);
      if (stock === 0) outOfStockCount++;
      else if (stock <= 5) lowStockCount++;
    });

    const potentialProfit = Math.round(totalStockRetail - totalStockCost);
    return {
      totalProducts: products.length,
      totalItemsQty: Math.round(totalItemsQty),
      totalStockCost: Math.round(totalStockCost),
      totalStockRetail: Math.round(totalStockRetail),
      potentialProfit,
      lowStockCount,
      outOfStockCount
    };
  }, [products]);

  // Filtered Products for Stock Table
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (stockCategoryFilter !== 'all' && p.category !== stockCategoryFilter) return false;
      if (stockStatusFilter === 'in_stock' && p.stock <= 0) return false;
      if (stockStatusFilter === 'low_stock' && (p.stock <= 0 || p.stock > 5)) return false;
      if (stockStatusFilter === 'out_of_stock' && p.stock > 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = (p.sku || '').toLowerCase().includes(q);
        const matchesBrand = (p.brand || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesBrand) return false;
      }
      return true;
    });
  }, [products, stockCategoryFilter, stockStatusFilter, searchQuery]);

  // Unique Product Categories for Dropdown
  const productCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // DUES & BALANCES METRICS
  const duesMetrics = useMemo(() => {
    let totalCustomerDue = 0;
    let totalCustomerAdvance = 0;
    let dueCustomerCount = 0;
    customers.forEach(c => {
      if (c.totalDue > 0) {
        totalCustomerDue += c.totalDue;
        dueCustomerCount++;
      }
      if (c.advanceBalance > 0) totalCustomerAdvance += c.advanceBalance;
    });

    let totalSupplierDue = 0;
    let dueSupplierCount = 0;
    suppliers.forEach(s => {
      if (s.totalDue > 0) {
        totalSupplierDue += s.totalDue;
        dueSupplierCount++;
      }
    });

    const netReceivable = Math.round(totalCustomerDue - totalSupplierDue);
    return {
      totalCustomerDue: Math.round(totalCustomerDue),
      totalCustomerAdvance: Math.round(totalCustomerAdvance),
      dueCustomerCount,
      totalSupplierDue: Math.round(totalSupplierDue),
      dueSupplierCount,
      netReceivable
    };
  }, [customers, suppliers]);

  // Filtered Customers & Suppliers for Due tables
  const filteredDueCustomers = useMemo(() => {
    return customers
      .filter(c => c.totalDue > 0 || c.advanceBalance > 0)
      .filter(c => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return c.name.toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.address || '').toLowerCase().includes(q);
      })
      .sort((a, b) => b.totalDue - a.totalDue);
  }, [customers, searchQuery]);

  const filteredDueSuppliers = useMemo(() => {
    return suppliers
      .filter(s => s.totalDue > 0)
      .filter(s => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return s.name.toLowerCase().includes(q) || (s.phone || '').includes(q);
      })
      .sort((a, b) => b.totalDue - a.totalDue);
  }, [suppliers, searchQuery]);

  // DAILY CASH & BANK CLOSING METRICS
  const dailyClosingMetrics = useMemo(() => {
    const isClosingDay = (d: any) => {
      if (!d) return false;
      const str = typeof d === 'string' ? d.slice(0, 10) : format(d, 'yyyy-MM-dd');
      return str === closingDate;
    };

    let dayCashSales = 0;
    let dayTotalSales = 0;
    const dayOrders = orders.filter(o => isClosingDay(o.createdAt));
    dayOrders.forEach(o => {
      dayTotalSales += o.totalAmount;
      if (o.paymentMethod === 'cash') dayCashSales += o.paidAmount;
    });

    let dayCashPurchases = 0;
    const dayPurchases = purchases.filter(p => isClosingDay(p.createdAt));
    dayPurchases.forEach(p => {
      if (p.paymentMethod === 'cash') dayCashPurchases += p.paidAmount;
    });

    let dayCashExpenses = 0;
    const dayExp = expenses.filter(e => isClosingDay(e.date));
    dayExp.forEach(e => {
      if (e.paymentMethod === 'cash') dayCashExpenses += e.amount;
    });

    const dayCashIn = dayCashSales;
    const dayCashOut = dayCashPurchases + dayCashExpenses;
    const netDayCashFlow = dayCashIn - dayCashOut;

    let totalBankBalance = 0;
    banks.forEach(b => { totalBankBalance += b.balance; });

    return {
      dayOrdersCount: dayOrders.length,
      dayTotalSales: Math.round(dayTotalSales),
      dayCashSales: Math.round(dayCashSales),
      dayCashPurchases: Math.round(dayCashPurchases),
      dayCashExpenses: Math.round(dayCashExpenses),
      dayCashIn: Math.round(dayCashIn),
      dayCashOut: Math.round(dayCashOut),
      netDayCashFlow: Math.round(netDayCashFlow),
      totalBankBalance: Math.round(totalBankBalance)
    };
  }, [orders, purchases, expenses, banks, closingDate]);

  // Bank Add/Edit handler
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) {
      toast.error('ব্যাংক এর নাম লিখুন');
      return;
    }
    try {
      setIsSubmittingBank(true);
      await api.banks.create({
        name: bankName.trim(),
        account_number: bankAccNo.trim(),
        branch: bankBranch.trim(),
        balance: Number(bankBalance || 0)
      });
      toast.success('নতুন ব্যাংক একাউন্ট যোগ করা হয়েছে');
      setBankModalOpen(false);
      setBankName('');
      setBankAccNo('');
      setBankBranch('');
      setBankBalance(0);
      loadAllData();
    } catch {
      toast.error('ব্যাংক সংরক্ষণ করা সম্ভব হয়নি');
    } finally {
      setIsSubmittingBank(false);
    }
  };

  // Business info fallback
  const shopTitle = settings?.business_name || 'আমার প্রতিষ্ঠান';
  const shopPhone = settings?.phone || '';
  const shopAddress = settings?.address || '';

  // Trigger Print for Report Container
  const handlePrint = (_reportName: string) => {
    printElement('printable-report-area');
  };

  return (
    <Shell>
      <div className="space-y-6 animate-in fade-in duration-300 font-bengali pb-16">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  ব্যবসার রিপোর্ট সমূহ (ERP System Reports)
                </h1>
                <p className="text-xs text-slate-500 font-semibold">
                  {shopTitle} — বিক্রয়, লাভ-ক্ষতি, স্টক, খরচ ও দেনা-পাওনার স্বয়ংক্রিয় হিসাব বিবরণী
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab !== 'hub' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTabChange('hub')}
                className="h-9 px-3.5 rounded-xl border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 mr-1 text-orange-500" /> সকল রিপোর্ট হাব
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={loadAllData}
              disabled={loading}
              className="h-9 px-3 rounded-xl border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 cursor-pointer"
              title="রিফ্রেশ করুন"
            >
              <RefreshCcw className={cn("w-3.5 h-3.5 mr-1 text-slate-500", loading && "animate-spin")} />
              রিফ্রেশ
            </Button>

            {activeTab !== 'hub' && (
              <Button
                size="sm"
                onClick={() => handlePrint(activeTab)}
                className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                প্রিন্ট রিপোর্ট
              </Button>
            )}
          </div>
        </div>

        {/* TOP TABS NAVIGATION */}
        <div className="bg-slate-100/90 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-slate-200/80">
          {[
            { id: 'hub', label: 'সকল রিপোর্ট হাব', icon: Layers },
            { id: 'sales', label: 'বিক্রয় ও লাভ', icon: ShoppingBag },
            { id: 'purchases', label: 'ক্রয় ও পরিচালন ব্যয়', icon: ShoppingCart },
            { id: 'profit_loss', label: 'লাভ-ক্ষতি বিবরণী (P&L)', icon: TrendingUp },
            { id: 'stock', label: 'স্টক ও ইনভেন্টরি', icon: Package },
            { id: 'dues', label: 'বাকি ও পাওনা-দেনা', icon: Users },
            { id: 'daily_closing', label: 'দৈনিক ক্যাশ ও ব্যাংক ক্লোজিং', icon: Landmark }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none",
                  isActive
                    ? "bg-white text-orange-600 shadow-sm shadow-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-orange-500" : "text-slate-400")} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* COMMON DATE FILTER BAR (Shown on sub-reports requiring date filtering) */}
        {activeTab !== 'hub' && activeTab !== 'stock' && activeTab !== 'dues' && activeTab !== 'daily_closing' && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-black text-slate-500 mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> সময়কাল:
              </span>
              {[
                { id: 'today', label: 'আজ' },
                { id: 'yesterday', label: 'গতকাল' },
                { id: 'this_week', label: 'চলতি সপ্তাহ' },
                { id: 'this_month', label: 'চলতি মাস' },
                { id: 'last_month', label: 'বিগত মাস' },
                { id: 'this_year', label: 'চলতি বছর' },
                { id: 'all', label: 'সকল সময়' },
                { id: 'custom', label: 'কাস্টম' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => applyDatePreset(p.id as DatePreset)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    datePreset === p.id
                      ? "bg-orange-500 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Range Inputs */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400">শুরু:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                />
              </div>
              <span className="text-slate-400 font-bold text-xs">—</span>
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400">শেষ:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 1. REPORT HUB (OVERVIEW DASHBOARD) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'hub' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* CARD 1: SALES & PROFIT */}
              <Card className="border-slate-200/90 rounded-2xl bg-white p-5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-black bg-emerald-100/70 text-emerald-800 px-2 py-0.5 rounded-full">
                      +{formatBnDec(salesMetrics.profitMargin, 1)}% মার্জিন
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                      ১. বিক্রয় ও লাভ রিপোর্ট (Sales & Profit)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      প্রতিদিনের ও মাসিক বিক্রয়, নগদ আদায়, বকেয়া এবং প্রতি চালানে অর্জিত নিট লাভ।
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">মোট বিক্রয় (মাসিক)</span>
                      <span className="font-black text-slate-800 font-mono">৳{formatBnNum(salesMetrics.totalSales)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">অর্জিত নিট লাভ</span>
                      <span className="font-black text-emerald-600 font-mono">+৳{formatBnNum(salesMetrics.totalProfit)}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">{toBengaliDigits(salesMetrics.count)} টি চালান</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTabChange('sales')}
                    className="h-8 rounded-lg text-xs font-bold border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 cursor-pointer"
                  >
                    রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>

              {/* CARD 2: PURCHASES & EXPENSES */}
              <Card className="border-slate-200/90 rounded-2xl bg-white p-5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-black bg-sky-100/70 text-sky-800 px-2 py-0.5 rounded-full">
                      ক্রয় ও খরচ
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                      ২. ক্রয় ও পরিচালন ব্যয় (Purchase & Expenses)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      পণ্য ক্রয় হিসাব, সাপ্লায়ারকে পরিশোধ, বকেয়া এবং দোকান পরিচালন ব্যয়ের বিস্তারিত।
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">পণ্য ক্রয় ব্যয়</span>
                      <span className="font-black text-slate-800 font-mono">৳{formatBnNum(purchaseExpenseMetrics.totalPurchases)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">পরিচালন খরচ</span>
                      <span className="font-black text-rose-600 font-mono">৳{formatBnNum(purchaseExpenseMetrics.totalExpenses)}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">{toBengaliDigits(purchaseExpenseMetrics.purchaseCount)} টি ক্রয় চালান</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTabChange('purchases')}
                    className="h-8 rounded-lg text-xs font-bold border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 cursor-pointer"
                  >
                    রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>

              {/* CARD 3: PROFIT & LOSS */}
              <Card className="border-slate-200/90 rounded-2xl bg-white p-5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      "text-[11px] font-black px-2 py-0.5 rounded-full",
                      pnlMetrics.netProfit >= 0 ? "bg-purple-100/70 text-purple-800" : "bg-rose-100/70 text-rose-800"
                    )}>
                      নিট লাভ: {pnlMetrics.netMargin}%
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                      ৩. লাভ-ক্ষতি বিবরণী (Profit & Loss / P&L)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      মোট বিক্রয় আয়, বিক্রিত পণ্যের ক্রয়মূল্য (COGS), পরিচালন ব্যয় ও নিট মুনাফা।
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">মোট ব্যবসায়িক লাভ</span>
                      <span className="font-black text-slate-800 font-mono">৳{formatBnNum(pnlMetrics.grossProfit)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">নিট লাভ / লোকসান</span>
                      <span className={cn(
                        "font-black font-mono",
                        pnlMetrics.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {pnlMetrics.netProfit >= 0 ? '+' : ''}৳{formatBnNum(pnlMetrics.netProfit)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">ব্যবসায়িক আয় বিবরণী</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTabChange('profit_loss')}
                    className="h-8 rounded-lg text-xs font-bold border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 cursor-pointer"
                  >
                    রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>

              {/* CARD 4: INVENTORY & STOCK */}
              <Card className="border-slate-200/90 rounded-2xl bg-white p-5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Package className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-black bg-amber-100/70 text-amber-800 px-2 py-0.5 rounded-full">
                      {toBengaliDigits(inventoryMetrics.totalProducts)} টি পণ্য
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                      ৪. স্টক ও ইনভেন্টরি মূল্যায়ন (Stock Valuation)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      গুদামে থাকা সকল পণ্যের স্টক সংখ্যা, ক্রয়মূল্য এবং বর্তমান মোট পণ্যের আর্থিক মূল্য।
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">মোট স্টক ক্রয়মূল্য</span>
                      <span className="font-black text-slate-800 font-mono">৳{formatBnNum(inventoryMetrics.totalStockCost)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">সম্ভাব্য বিক্রয় মূল্য</span>
                      <span className="font-black text-amber-600 font-mono">৳{formatBnNum(inventoryMetrics.totalStockRetail)}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-500">{toBengaliDigits(inventoryMetrics.lowStockCount)} টি পণ্যে কম স্টক</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTabChange('stock')}
                    className="h-8 rounded-lg text-xs font-bold border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 cursor-pointer"
                  >
                    রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>

              {/* CARD 5: DUES & PARTIES */}
              <Card className="border-slate-200/90 rounded-2xl bg-white p-5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-black bg-rose-100/70 text-rose-800 px-2 py-0.5 rounded-full">
                      দেনা ও পাওনা
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                      ৫. বাকি ও দেনা-পাওনা রিপোর্ট (Due Summary)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      কাস্টমারদের কাছে মোট পাওনা বকেয়া এবং সরবরাহকারীদের প্রদেয় দেনার পূর্ণাঙ্গ হিসাব।
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">কাস্টমার বাকি (পাওনা)</span>
                      <span className="font-black text-rose-600 font-mono">৳{formatBnNum(duesMetrics.totalCustomerDue)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">সাপ্লায়ার দেনা</span>
                      <span className="font-black text-slate-800 font-mono">৳{formatBnNum(duesMetrics.totalSupplierDue)}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">{toBengaliDigits(duesMetrics.dueCustomerCount)} জন কাস্টমারে বাকি</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTabChange('dues')}
                    className="h-8 rounded-lg text-xs font-bold border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 cursor-pointer"
                  >
                    রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>

              {/* CARD 6: DAILY CASH & BANK CLOSING */}
              <Card className="border-slate-200/90 rounded-2xl bg-white p-5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-black bg-teal-100/70 text-teal-800 px-2 py-0.5 rounded-full">
                      ক্যাশ ও ব্যাংক
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                      ৬. দৈনিক ক্যাশ ও ব্যাংক ক্লোজিং (Cash & Bank)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      সারাদিনের মোট নগদ আদায়, নগদ ব্যয়, সমাপনী ক্যাশবক্স ও সকল ব্যাংক ব্যালেন্স।
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">ক্যাশ ইন হ্যান্ড</span>
                      <span className="font-black text-teal-600 font-mono">৳{formatBnNum(totalCash)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">মোট ব্যাংক ব্যালেন্স</span>
                      <span className="font-black text-slate-800 font-mono">৳{formatBnNum(dailyClosingMetrics.totalBankBalance)}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">{toBengaliDigits(banks.length)} টি ব্যাংক একাউন্ট</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTabChange('daily_closing')}
                    className="h-8 rounded-lg text-xs font-bold border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 cursor-pointer"
                  >
                    রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PRINTABLE CONTAINER WRAPPER FOR SUB-REPORTS */}
        {/* ------------------------------------------------------------- */}
        {activeTab !== 'hub' && (
          <div id="printable-report-area" className="space-y-6">

            {/* PRINT WATERMARK / HEADER (Visible when printed) */}
            <div className="hidden print:block pb-4 mb-4 border-b border-slate-300 text-center">
              <h1 className="text-2xl font-black text-slate-900">{shopTitle}</h1>
              {shopAddress && <p className="text-xs text-slate-600">{shopAddress}</p>}
              {shopPhone && <p className="text-xs text-slate-600">ফোন: {toBengaliDigits(shopPhone)}</p>}
              <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
                <span>রিপোর্ট: {
                  activeTab === 'sales' ? 'বিক্রয় ও লাভ রিপোর্ট' :
                  activeTab === 'purchases' ? 'ক্রয় ও পরিচালন ব্যয় রিপোর্ট' :
                  activeTab === 'profit_loss' ? 'আয় বিবরণী ও লাভ-ক্ষতি' :
                  activeTab === 'stock' ? 'স্টক ও ইনভেন্টরি মূল্যায়ন' :
                  activeTab === 'dues' ? 'বাকি ও দেনা-পাওনা বিবরণী' :
                  'দৈনিক ক্যাশ ও ব্যাংক ক্লোজিং'
                }</span>
                <span>তারিখ: {formatBnDate(startDate)} হতে {formatBnDate(endDate)}</span>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 2. SALES & PROFIT REPORT */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'sales' && (
              <div className="space-y-5">
                {/* 5 KPI Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 block">মোট বিক্রয় (Sales)</span>
                    <span className="text-xl font-black text-slate-900 font-mono block mt-1">৳ {formatBnNum(salesMetrics.totalSales)}</span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">{toBengaliDigits(salesMetrics.count)} টি চালান</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-emerald-600 block">মোট নগদ আদায় (Paid)</span>
                    <span className="text-xl font-black text-emerald-600 font-mono block mt-1">৳ {formatBnNum(salesMetrics.totalPaid)}</span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">নগদ ও ব্যাংক প্রাপ্তি</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-rose-600 block">মোট নতুন বাকি (Due)</span>
                    <span className="text-xl font-black text-rose-600 font-mono block mt-1">৳ {formatBnNum(salesMetrics.totalDue)}</span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">বকেয়া চালানসমূহ</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
                    <span className="text-[11px] font-black text-emerald-800 block">মোট অর্জিত লাভ (Profit)</span>
                    <span className="text-xl font-black text-emerald-700 font-mono block mt-1">+৳ {formatBnNum(salesMetrics.totalProfit)}</span>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-1">লাইভ মার্জিন: {formatBnDec(salesMetrics.profitMargin, 1)}%</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 block">পণ্যের মোট ক্রয়মূল্য</span>
                    <span className="text-xl font-black text-slate-700 font-mono block mt-1">৳ {formatBnNum(salesMetrics.totalCost)}</span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">Cost of Goods Sold</span>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="কাস্টমার নাম, ফোন বা ইনভয়েস নং..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-lg bg-slate-50 border-slate-200 font-bold"
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    ফিল্টারে মোট {toBengaliDigits(filteredOrders.length)} টি চালান প্রদর্শিত হচ্ছে
                  </span>
                </div>

                {/* Sales Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80 text-[11px]">
                      <TableRow>
                        <TableHead className="w-10 text-center font-black">#</TableHead>
                        <TableHead className="font-black">তারিখ ও সময়</TableHead>
                        <TableHead className="font-black">ইনভয়েস নং</TableHead>
                        <TableHead className="font-black">কাস্টমার নাম</TableHead>
                        <TableHead className="text-center font-black">আইটেম</TableHead>
                        <TableHead className="text-right font-black">মোট বিল (৳)</TableHead>
                        <TableHead className="text-right font-black">আদায় (৳)</TableHead>
                        <TableHead className="text-right font-black">বকেয়া (৳)</TableHead>
                        <TableHead className="text-right font-black text-emerald-700">লাভ (Profit)</TableHead>
                        <TableHead className="text-center font-black">পদ্ধতি</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-12 text-slate-400 font-bold text-xs">
                            নির্বাচিত সময়কালে কোনো বিক্রয় চালান পাওয়া যায়নি
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.map((o, idx) => (
                          <TableRow key={o.id} className="text-xs hover:bg-slate-50/60 border-b border-slate-100">
                            <TableCell className="text-center font-bold text-slate-400">{toBengaliDigits(idx + 1)}</TableCell>
                            <TableCell className="font-medium text-slate-600">
                              {formatBnDate(o.createdAt, 'dd/MM/yyyy')} <span className="text-[10px] text-slate-400">{formatBnTime(o.createdAt)}</span>
                            </TableCell>
                            <TableCell className="font-mono font-bold text-indigo-600">
                              #{toBengaliDigits(o.invoiceNo || o.id.slice(0, 8))}
                            </TableCell>
                            <TableCell className="font-bold text-slate-900">
                              {o.customerName}
                              {o.customerPhone && <span className="text-[10px] text-slate-400 block">{toBengaliDigits(o.customerPhone)}</span>}
                            </TableCell>
                            <TableCell className="text-center font-bold text-slate-600">{toBengaliDigits(o.items?.length || 0)} টি</TableCell>
                            <TableCell className="text-right font-black text-slate-900 font-mono">৳{formatBnNum(o.totalAmount)}</TableCell>
                            <TableCell className="text-right font-bold text-emerald-600 font-mono">৳{formatBnNum(o.paidAmount)}</TableCell>
                            <TableCell className="text-right font-bold text-rose-600 font-mono">
                              {o.dueAmount > 0 ? `৳${formatBnNum(o.dueAmount)}` : '—'}
                            </TableCell>
                            <TableCell className="text-right font-black font-mono">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[11px]",
                                (o.profit || 0) >= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                              )}>
                                {(o.profit || 0) >= 0 ? '+' : ''}৳{formatBnNum(o.profit)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {o.paymentMethod === 'bank' ? 'ব্যাংক' : o.paymentMethod === 'Split' ? 'মিক্সড' : 'নগদ'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                    {filteredOrders.length > 0 && (
                      <tfoot className="bg-slate-50 font-black text-xs border-t-2 border-slate-200">
                        <tr>
                          <td colSpan={5} className="py-3 px-4 text-slate-700">সর্বমোট ({toBengaliDigits(filteredOrders.length)} টি চালান)</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-900">৳{formatBnNum(salesMetrics.totalSales)}</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600">৳{formatBnNum(salesMetrics.totalPaid)}</td>
                          <td className="py-3 px-4 text-right font-mono text-rose-600">৳{formatBnNum(salesMetrics.totalDue)}</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-700">+৳{formatBnNum(salesMetrics.totalProfit)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </Table>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 3. PURCHASES & EXPENSES REPORT */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'purchases' && (
              <div className="space-y-5">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 block">মোট পণ্য ক্রয় (Purchases)</span>
                    <span className="text-xl font-black text-slate-900 font-mono block mt-1">৳ {formatBnNum(purchaseExpenseMetrics.totalPurchases)}</span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">{toBengaliDigits(purchaseExpenseMetrics.purchaseCount)} টি ক্রয় চালান</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-emerald-600 block">সাপ্লায়ারকে পরিশোধ (Paid)</span>
                    <span className="text-xl font-black text-emerald-600 font-mono block mt-1">৳ {formatBnNum(purchaseExpenseMetrics.purchasesPaid)}</span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">পরিশোধিত অর্থ</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-rose-600 block">সাপ্লায়ার বকেয়া (Due)</span>
                    <span className="text-xl font-black text-rose-600 font-mono block mt-1">৳ {formatBnNum(purchaseExpenseMetrics.purchasesDue)}</span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">প্রদেয় দেনা</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-xs">
                    <span className="text-[11px] font-black text-amber-900 block">মোট পরিচালন ব্যয় (Expenses)</span>
                    <span className="text-xl font-black text-amber-700 font-mono block mt-1">৳ {formatBnNum(purchaseExpenseMetrics.totalExpenses)}</span>
                    <span className="text-[10px] text-amber-600 font-bold block mt-1">{toBengaliDigits(purchaseExpenseMetrics.expenseCount)} টি এন্ট্রি</span>
                  </div>
                </div>

                {/* Sub-tab selection */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <button
                    onClick={() => setPurchaseSubTab('purchases')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      purchaseSubTab === 'purchases' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    ১. পণ্য ক্রয় চালানসমূহ ({toBengaliDigits(filteredPurchases.length)})
                  </button>
                  <button
                    onClick={() => setPurchaseSubTab('expenses')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      purchaseSubTab === 'expenses' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    ২. পরিচালন ব্যয়ের বিস্তারিত ({toBengaliDigits(filteredExpenses.length)})
                  </button>
                  <button
                    onClick={() => setPurchaseSubTab('expense_summary')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      purchaseSubTab === 'expense_summary' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    ৩. ক্যাটাগরিভিত্তিক খরচ সারসংক্ষেপ
                  </button>
                </div>

                {/* Tab Content 1: Purchases Table */}
                {purchaseSubTab === 'purchases' && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/80 text-[11px]">
                        <TableRow>
                          <TableHead className="w-10 text-center font-black">#</TableHead>
                          <TableHead className="font-black">তারিখ</TableHead>
                          <TableHead className="font-black">চালান নং</TableHead>
                          <TableHead className="font-black">সরবরাহকারী (Supplier)</TableHead>
                          <TableHead className="text-center font-black">আইটেম</TableHead>
                          <TableHead className="text-right font-black">মোট বিল (৳)</TableHead>
                          <TableHead className="text-right font-black">পরিশোধ (৳)</TableHead>
                          <TableHead className="text-right font-black">বকেয়া (৳)</TableHead>
                          <TableHead className="text-center font-black">পদ্ধতি</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPurchases.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-10 text-slate-400 font-bold text-xs">
                              নির্বাচিত সময়কালে কোনো ক্রয় চালান পাওয়া যায়নি
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredPurchases.map((p, idx) => (
                            <TableRow key={p.id} className="text-xs hover:bg-slate-50/60 border-b border-slate-100">
                              <TableCell className="text-center font-bold text-slate-400">{toBengaliDigits(idx + 1)}</TableCell>
                              <TableCell className="font-medium text-slate-600">{formatBnDate(p.createdAt, 'dd/MM/yyyy')}</TableCell>
                              <TableCell className="font-mono font-bold text-indigo-600">#{toBengaliDigits(p.invoiceNo || p.id.slice(0, 8))}</TableCell>
                              <TableCell className="font-bold text-slate-900">{p.supplierName}</TableCell>
                              <TableCell className="text-center font-bold text-slate-600">{toBengaliDigits(p.items?.length || 0)} টি</TableCell>
                              <TableCell className="text-right font-black text-slate-900 font-mono">৳{formatBnNum(p.totalAmount)}</TableCell>
                              <TableCell className="text-right font-bold text-emerald-600 font-mono">৳{formatBnNum(p.paidAmount)}</TableCell>
                              <TableCell className="text-right font-bold text-rose-600 font-mono">
                                {p.dueAmount > 0 ? `৳${formatBnNum(p.dueAmount)}` : '—'}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                  {p.paymentMethod === 'bank' ? 'ব্যাংক' : 'নগদ'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                      {filteredPurchases.length > 0 && (
                        <tfoot className="bg-slate-50 font-black text-xs border-t-2 border-slate-200">
                          <tr>
                            <td colSpan={5} className="py-3 px-4 text-slate-700">সর্বমোট ক্রয় ({toBengaliDigits(filteredPurchases.length)} টি চালান)</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-900">৳{formatBnNum(purchaseExpenseMetrics.totalPurchases)}</td>
                            <td className="py-3 px-4 text-right font-mono text-emerald-600">৳{formatBnNum(purchaseExpenseMetrics.purchasesPaid)}</td>
                            <td className="py-3 px-4 text-right font-mono text-rose-600">৳{formatBnNum(purchaseExpenseMetrics.purchasesDue)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      )}
                    </Table>
                  </div>
                )}

                {/* Tab Content 2: Operating Expenses Table */}
                {purchaseSubTab === 'expenses' && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/80 text-[11px]">
                        <TableRow>
                          <TableHead className="w-10 text-center font-black">#</TableHead>
                          <TableHead className="font-black">তারিখ</TableHead>
                          <TableHead className="font-black">খরচের বিবরণ / খাত</TableHead>
                          <TableHead className="font-black">ক্যাটাগরি</TableHead>
                          <TableHead className="text-right font-black">পরিমাণ (৳)</TableHead>
                          <TableHead className="text-center font-black">পদ্ধতি</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExpenses.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-slate-400 font-bold text-xs">
                              নির্বাচিত সময়কালে কোনো পরিচালন খরচ পাওয়া যায়নি
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredExpenses.map((e, idx) => (
                            <TableRow key={e.id} className="text-xs hover:bg-slate-50/60 border-b border-slate-100">
                              <TableCell className="text-center font-bold text-slate-400">{toBengaliDigits(idx + 1)}</TableCell>
                              <TableCell className="font-medium text-slate-600">{formatBnDate(e.date, 'dd/MM/yyyy')}</TableCell>
                              <TableCell className="font-bold text-slate-900">{e.title}</TableCell>
                              <TableCell>
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold">
                                  {e.category}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-black text-rose-600 font-mono">৳{formatBnNum(e.amount)}</TableCell>
                              <TableCell className="text-center">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                  {e.paymentMethod === 'bank' ? 'ব্যাংক' : 'ক্যাশ'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                      {filteredExpenses.length > 0 && (
                        <tfoot className="bg-slate-50 font-black text-xs border-t-2 border-slate-200">
                          <tr>
                            <td colSpan={4} className="py-3 px-4 text-slate-700">সর্বমোট পরিচালন খরচ ({toBengaliDigits(filteredExpenses.length)} টি)</td>
                            <td className="py-3 px-4 text-right font-mono text-rose-600">৳{formatBnNum(purchaseExpenseMetrics.totalExpenses)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      )}
                    </Table>
                  </div>
                )}

                {/* Tab Content 3: Expense by Category Summary */}
                {purchaseSubTab === 'expense_summary' && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                    <h3 className="text-sm font-black text-slate-900 mb-4">ক্যাটাগরি অনুযায়ী মোট খরচ বিশ্লেষণ</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {expenseByCategory.map((c, i) => {
                        const pct = purchaseExpenseMetrics.totalExpenses > 0 ? (c.total / purchaseExpenseMetrics.totalExpenses) * 100 : 0;
                        return (
                          <div key={i} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-black text-slate-800 text-xs">{c.category}</span>
                              <span className="text-[11px] font-bold text-slate-400">{toBengaliDigits(c.count)} টি খরচ</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                              <span className="text-lg font-black text-rose-600 font-mono">৳ {formatBnNum(c.total)}</span>
                              <span className="text-xs font-bold text-slate-500">{toBengaliDigits(Math.round(pct))}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 4. PROFIT & LOSS / INCOME STATEMENT */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'profit_loss' && (
              <div className="space-y-6">
                
                {/* Official Income Statement Document */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 max-w-4xl mx-auto space-y-6">
                  
                  {/* Title & Period */}
                  <div className="text-center pb-4 border-b border-slate-200 space-y-1">
                    <h2 className="text-xl font-black text-slate-900">ব্যবসায়িক আয় বিবরণী (Income Statement)</h2>
                    <p className="text-xs text-slate-500 font-bold">
                      হিসাবকাল: {formatBnDate(startDate)} হতে {formatBnDate(endDate)}
                    </p>
                  </div>

                  {/* Section 1: Revenue */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 font-black text-xs text-slate-800">
                      <span>১. পরিচালন আয় (Operating Revenue)</span>
                      <span>পরিমাণ (৳)</span>
                    </div>
                    <div className="pl-4 pr-3 flex justify-between items-center text-xs text-slate-700">
                      <span>মোট পণ্য বিক্রয় আয় (Gross Sales Revenue)</span>
                      <span className="font-mono font-bold">৳ {formatBnNum(pnlMetrics.grossRevenue)}</span>
                    </div>
                    <div className="pl-4 pr-3 flex justify-between items-center text-xs font-black text-slate-900 pt-1 border-t border-slate-100">
                      <span>নিট পরিচালন আয় (Net Revenue)</span>
                      <span className="font-mono text-sm">৳ {formatBnNum(pnlMetrics.grossRevenue)}</span>
                    </div>
                  </div>

                  {/* Section 2: Cost of Goods Sold */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 font-black text-xs text-slate-800">
                      <span>২. বিক্রিত পণ্যের ব্যয় (Cost of Goods Sold - COGS)</span>
                      <span>পরিমাণ (৳)</span>
                    </div>
                    <div className="pl-4 pr-3 flex justify-between items-center text-xs text-slate-700">
                      <span>বিক্রিত পণ্যের মোট ক্রয়মূল্য (Product Purchase Cost)</span>
                      <span className="font-mono font-bold text-rose-700">- ৳ {formatBnNum(pnlMetrics.cogs)}</span>
                    </div>
                  </div>

                  {/* Section 3: Gross Profit */}
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                    <div>
                      <span className="font-black text-emerald-950 text-sm block">৩. মোট ব্যবসায়িক লাভ (Gross Profit)</span>
                      <span className="text-[11px] text-emerald-700 font-semibold">আয় হতে পণ্যের ক্রয়মূল্য বাদে (মার্জিন: {pnlMetrics.grossMargin}%)</span>
                    </div>
                    <span className="text-xl font-black text-emerald-700 font-mono">
                      ৳ {formatBnNum(pnlMetrics.grossProfit)}
                    </span>
                  </div>

                  {/* Section 4: Operating Expenses */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 font-black text-xs text-slate-800">
                      <span>৪. পরিচালন ব্যয়সমূহ (Operating Expenses)</span>
                      <span>পরিমাণ (৳)</span>
                    </div>
                    {expenseByCategory.length === 0 ? (
                      <div className="pl-4 text-xs text-slate-400 font-medium">কোনো পরিচালন খরচ পাওয়া যায়নি</div>
                    ) : (
                      expenseByCategory.map((c, i) => (
                        <div key={i} className="pl-4 pr-3 flex justify-between items-center text-xs text-slate-700">
                          <span>{c.category}</span>
                          <span className="font-mono font-medium text-slate-800">৳ {formatBnNum(c.total)}</span>
                        </div>
                      ))
                    )}
                    <div className="pl-4 pr-3 flex justify-between items-center text-xs font-black text-rose-700 pt-1 border-t border-slate-100">
                      <span>মোট পরিচালন ব্যয় (Total Operating Expenses)</span>
                      <span className="font-mono text-sm">- ৳ {formatBnNum(pnlMetrics.operatingExpenses)}</span>
                    </div>
                  </div>

                  {/* Section 5: Net Profit / Loss */}
                  <div className={cn(
                    "p-4 rounded-xl border flex justify-between items-center",
                    pnlMetrics.netProfit >= 0 ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-600" : "bg-rose-600 text-white border-rose-700"
                  )}>
                    <div>
                      <span className="font-black text-base block">৫. নিট ব্যবসায়িক লাভ / লোকসান (Net Profit/Loss)</span>
                      <span className="text-xs opacity-90 font-medium">গ্রস প্রফিট হতে সকল পরিচালন খরচ বাদ দেওয়ার পর (নিট মার্জিন: {pnlMetrics.netMargin}%)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black font-mono block">
                        {pnlMetrics.netProfit >= 0 ? '+' : ''}৳ {formatBnNum(pnlMetrics.netProfit)}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">
                        {pnlMetrics.netProfit >= 0 ? 'নিট মুনাফা' : 'লোকসান'}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 5. INVENTORY & STOCK VALUATION REPORT */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'stock' && (
              <div className="space-y-5">
                {/* 4 KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 block">মোট সক্রিয় পণ্য লাইন</span>
                    <span className="text-xl font-black text-slate-900 font-mono block mt-1">{toBengaliDigits(inventoryMetrics.totalProducts)} টি</span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">ক্যাটালগ পণ্যসমূহ</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-emerald-600 block">মোট স্টক ক্রয়মূল্য (Cost)</span>
                    <span className="text-xl font-black text-slate-900 font-mono block mt-1">৳ {formatBnNum(inventoryMetrics.totalStockCost)}</span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">ক্রয়মূল্য অনুযায়ী স্টক ভ্যালু</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-sky-600 block">সম্ভাব্য বিক্রয় মূল্য (Retail)</span>
                    <span className="text-xl font-black text-sky-700 font-mono block mt-1">৳ {formatBnNum(inventoryMetrics.totalStockRetail)}</span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">বিক্রয়মূল্য অনুযায়ী ভ্যালু</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-xs">
                    <span className="text-[11px] font-black text-amber-900 block">প্রত্যাশিত সম্ভাব্য লাভ</span>
                    <span className="text-xl font-black text-amber-700 font-mono block mt-1">৳ {formatBnNum(inventoryMetrics.potentialProfit)}</span>
                    <span className="text-[10px] text-amber-600 font-bold block mt-1">স্টক বিক্রয়ে সম্ভাব্য মুনাফা</span>
                  </div>
                </div>

                {/* Filter and Search Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <div className="relative w-64">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="পণ্যের নাম, ব্র্যান্ড বা কোড..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-lg bg-slate-50 border-slate-200 font-bold"
                      />
                    </div>

                    <Select value={stockCategoryFilter} onValueChange={(val: any) => setStockCategoryFilter(val || 'all')}>
                      <SelectTrigger className="h-9 w-40 text-xs font-bold rounded-lg bg-slate-50 border-slate-200">
                        <SelectValue placeholder="সকল ক্যাটাগরি" />
                      </SelectTrigger>
                      <SelectContent className="font-bengali text-xs">
                        <SelectItem value="all">সকল ক্যাটাগরি</SelectItem>
                        {productCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={stockStatusFilter} onValueChange={(v: any) => setStockStatusFilter(v)}>
                      <SelectTrigger className="h-9 w-36 text-xs font-bold rounded-lg bg-slate-50 border-slate-200">
                        <SelectValue placeholder="স্টক স্ট্যাটাস" />
                      </SelectTrigger>
                      <SelectContent className="font-bengali text-xs">
                        <SelectItem value="all">সব পণ্য</SelectItem>
                        <SelectItem value="in_stock">স্টকে আছে</SelectItem>
                        <SelectItem value="low_stock">কম স্টক (≤ ৫)</SelectItem>
                        <SelectItem value="out_of_stock">স্টক শেষ (০)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <span className="text-xs font-bold text-slate-500">
                    মোট {toBengaliDigits(filteredProducts.length)} টি পণ্য প্রদর্শিত হচ্ছে
                  </span>
                </div>

                {/* Stock Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80 text-[11px]">
                      <TableRow>
                        <TableHead className="w-10 text-center font-black">#</TableHead>
                        <TableHead className="font-black">পণ্যের নাম</TableHead>
                        <TableHead className="font-black">ক্যাটাগরি</TableHead>
                        <TableHead className="font-black">ব্র্যান্ড</TableHead>
                        <TableHead className="text-center font-black">বর্তমান স্টক</TableHead>
                        <TableHead className="text-right font-black">ক্রয়মূল্য (৳)</TableHead>
                        <TableHead className="text-right font-black">বিক্রয়মূল্য (৳)</TableHead>
                        <TableHead className="text-right font-black">স্টক ক্রয়মূল্য (৳)</TableHead>
                        <TableHead className="text-right font-black text-emerald-700">সম্ভাব্য লাভ (৳)</TableHead>
                        <TableHead className="text-center font-black">স্ট্যাটাস</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-10 text-slate-400 font-bold text-xs">
                            কোনো পণ্য পাওয়া যায়নি
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((p, idx) => {
                          const costTotal = (p.stock || 0) * (p.buyPrice || 0);
                          const retailTotal = (p.stock || 0) * (p.sellPrice || 0);
                          const potProfit = retailTotal - costTotal;

                          return (
                            <TableRow key={p.id} className="text-xs hover:bg-slate-50/60 border-b border-slate-100">
                              <TableCell className="text-center font-bold text-slate-400">{toBengaliDigits(idx + 1)}</TableCell>
                              <TableCell className="font-bold text-slate-900">
                                {p.name}
                                {p.sku && <span className="text-[10px] text-slate-400 font-mono block">SKU: {p.sku}</span>}
                              </TableCell>
                              <TableCell className="font-medium text-slate-600">{p.category}</TableCell>
                              <TableCell className="font-medium text-slate-600">{p.brand || '—'}</TableCell>
                              <TableCell className="text-center font-black font-mono">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-xs",
                                  p.stock <= 0 ? "bg-rose-100 text-rose-700" :
                                  p.stock <= 5 ? "bg-amber-100 text-amber-700" :
                                  "bg-emerald-50 text-emerald-700"
                                )}>
                                  {formatBnDec(p.stock, 1)} {p.unit}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-medium text-slate-700 font-mono">৳{formatBnNum(p.buyPrice)}</TableCell>
                              <TableCell className="text-right font-bold text-slate-900 font-mono">৳{formatBnNum(p.sellPrice)}</TableCell>
                              <TableCell className="text-right font-black text-slate-900 font-mono">৳{formatBnNum(costTotal)}</TableCell>
                              <TableCell className="text-right font-bold text-emerald-600 font-mono">
                                +৳{formatBnNum(potProfit)}
                              </TableCell>
                              <TableCell className="text-center">
                                {p.stock <= 0 ? (
                                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">স্টক আউট</span>
                                ) : p.stock <= 5 ? (
                                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">কম স্টক</span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">পর্যাপ্ত</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 6. DUES & AGING SUMMARY REPORT */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'dues' && (
              <div className="space-y-5">
                {/* 3 KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-rose-200 bg-rose-50/30 shadow-xs">
                    <span className="text-xs font-black text-rose-800 block">কাস্টমারদের কাছে মোট পাওনা (Receivables)</span>
                    <span className="text-2xl font-black text-rose-700 font-mono block mt-1">৳ {formatBnNum(duesMetrics.totalCustomerDue)}</span>
                    <span className="text-[11px] text-slate-500 font-bold block mt-1">{toBengaliDigits(duesMetrics.dueCustomerCount)} জন গ্রাহকের কাছে বাকি</span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-xs font-black text-slate-700 block">সরবরাহকারীদের মোট দেনা (Payables)</span>
                    <span className="text-2xl font-black text-slate-900 font-mono block mt-1">৳ {formatBnNum(duesMetrics.totalSupplierDue)}</span>
                    <span className="text-[11px] text-slate-500 font-bold block mt-1">{toBengaliDigits(duesMetrics.dueSupplierCount)} জন সাপ্লায়ারকে প্রদেয়</span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-teal-200 bg-teal-50/30 shadow-xs">
                    <span className="text-xs font-black text-teal-800 block">নিট দেনা-পাওনা ভারসাম্য</span>
                    <span className="text-2xl font-black text-teal-700 font-mono block mt-1">
                      {duesMetrics.netReceivable >= 0 ? '+' : ''}৳ {formatBnNum(duesMetrics.netReceivable)}
                    </span>
                    <span className="text-[11px] text-teal-600 font-bold block mt-1">পাওনা হতে দেনা বাদ দিয়ে</span>
                  </div>
                </div>

                {/* Sub-tab Switcher & Search */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDuesSubTab('customers')}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        duesSubTab === 'customers' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      বাকি কাস্টমারদের তালিকা ({toBengaliDigits(filteredDueCustomers.length)})
                    </button>
                    <button
                      onClick={() => setDuesSubTab('suppliers')}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        duesSubTab === 'suppliers' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      পাওনাদার সাপ্লায়ারদের তালিকা ({toBengaliDigits(filteredDueSuppliers.length)})
                    </button>
                  </div>

                  <div className="relative w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="নাম, ফোন বা ঠিকানা..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 h-8 text-xs rounded-lg bg-white border-slate-200 font-bold"
                    />
                  </div>
                </div>

                {/* Table: Customers with Dues */}
                {duesSubTab === 'customers' && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/80 text-[11px]">
                        <TableRow>
                          <TableHead className="w-10 text-center font-black">#</TableHead>
                          <TableHead className="font-black">কাস্টমারের নাম</TableHead>
                          <TableHead className="font-black">মোবাইল ফোন</TableHead>
                          <TableHead className="font-black">ঠিকানা / এরিয়া</TableHead>
                          <TableHead className="text-right font-black text-rose-600">বর্তমান বকেয়া (৳)</TableHead>
                          <TableHead className="text-right font-black text-emerald-600">অগ্রিম জমা (৳)</TableHead>
                          <TableHead className="text-center font-black">লেজার</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDueCustomers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-10 text-slate-400 font-bold text-xs">
                              কোনো কাস্টমারের বাকি নেই
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredDueCustomers.map((c, idx) => (
                            <TableRow key={c.id} className="text-xs hover:bg-slate-50/60 border-b border-slate-100">
                              <TableCell className="text-center font-bold text-slate-400">{toBengaliDigits(idx + 1)}</TableCell>
                              <TableCell className="font-bold text-slate-900">{c.name}</TableCell>
                              <TableCell className="font-mono text-slate-600">{toBengaliDigits(c.phone || '—')}</TableCell>
                              <TableCell className="text-slate-600">{c.address || '—'}</TableCell>
                              <TableCell className="text-right font-black text-rose-600 font-mono">
                                {c.totalDue > 0 ? `৳${formatBnNum(c.totalDue)}` : '—'}
                              </TableCell>
                              <TableCell className="text-right font-bold text-emerald-600 font-mono">
                                {c.advanceBalance > 0 ? `৳${formatBnNum(c.advanceBalance)}` : '—'}
                              </TableCell>
                              <TableCell className="text-center">
                                <Link href={`/customers`}>
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-indigo-600 hover:text-indigo-800 font-bold">
                                    লেজার দেখুন →
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Table: Suppliers with Dues */}
                {duesSubTab === 'suppliers' && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/80 text-[11px]">
                        <TableRow>
                          <TableHead className="w-10 text-center font-black">#</TableHead>
                          <TableHead className="font-black">সরবরাহকারীর নাম</TableHead>
                          <TableHead className="font-black">প্রতিষ্ঠান / ব্যবসা</TableHead>
                          <TableHead className="font-black">মোবাইল ফোন</TableHead>
                          <TableHead className="text-right font-black text-rose-600">বর্তমান প্রদেয় দেনা (৳)</TableHead>
                          <TableHead className="text-center font-black">লেজার</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDueSuppliers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-slate-400 font-bold text-xs">
                              কোনো সাপ্লায়ারের কাছে দেনা নেই
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredDueSuppliers.map((s, idx) => (
                            <TableRow key={s.id} className="text-xs hover:bg-slate-50/60 border-b border-slate-100">
                              <TableCell className="text-center font-bold text-slate-400">{toBengaliDigits(idx + 1)}</TableCell>
                              <TableCell className="font-bold text-slate-900">{s.name}</TableCell>
                              <TableCell className="text-slate-600">{s.businessName || '—'}</TableCell>
                              <TableCell className="font-mono text-slate-600">{toBengaliDigits(s.phone || '—')}</TableCell>
                              <TableCell className="text-right font-black text-rose-600 font-mono">
                                ৳{formatBnNum(s.totalDue)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Link href={`/suppliers`}>
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-indigo-600 hover:text-indigo-800 font-bold">
                                    লেজার দেখুন →
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 7. DAILY CASH & BANK CLOSING REPORT */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'daily_closing' && (
              <div className="space-y-6">
                
                {/* Date Picker Bar for Daily Closing */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-700">ক্লোজিং তারিখ নির্বাচন করুন:</span>
                    <input
                      type="date"
                      value={closingDate}
                      onChange={e => setClosingDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-900 cursor-pointer outline-none"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setClosingDate(format(new Date(), 'yyyy-MM-dd'))}
                      className="h-8 text-xs font-bold rounded-lg"
                    >
                      আজকের দিন
                    </Button>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    তারিখ: {formatBnDate(closingDate, 'dd MMMM yyyy (EEEE)')}
                  </span>
                </div>

                {/* 5 Cash & Bank KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 block">দিনের মোট বিক্রয়</span>
                    <span className="text-xl font-black text-slate-900 font-mono block mt-1">৳ {formatBnNum(dailyClosingMetrics.dayTotalSales)}</span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">{toBengaliDigits(dailyClosingMetrics.dayOrdersCount)} টি চালান</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
                    <span className="text-[11px] font-bold text-emerald-800 block">দিনের মোট ক্যাশ ইন (In)</span>
                    <span className="text-xl font-black text-emerald-700 font-mono block mt-1">৳ {formatBnNum(dailyClosingMetrics.dayCashIn)}</span>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-1">নগদ বিক্রয় আদায়</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/30 shadow-xs">
                    <span className="text-[11px] font-bold text-rose-800 block">দিনের মোট ক্যাশ আউট (Out)</span>
                    <span className="text-xl font-black text-rose-700 font-mono block mt-1">৳ {formatBnNum(dailyClosingMetrics.dayCashOut)}</span>
                    <span className="text-[10px] text-rose-600 font-bold block mt-1">নগদ ক্রয় ও খরচ</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-teal-200 bg-teal-50/30 shadow-xs">
                    <span className="text-[11px] font-bold text-teal-800 block">বর্তমান ক্যাশ ইন হ্যান্ড</span>
                    <span className="text-xl font-black text-teal-700 font-mono block mt-1">৳ {formatBnNum(totalCash)}</span>
                    <span className="text-[10px] text-teal-600 font-bold block mt-1">লাইভ ক্যাশবক্স ব্যালেন্স</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-xs">
                    <span className="text-[11px] font-bold text-blue-800 block">সকল ব্যাংকে মোট ব্যালেন্স</span>
                    <span className="text-xl font-black text-blue-700 font-mono block mt-1">৳ {formatBnNum(dailyClosingMetrics.totalBankBalance)}</span>
                    <span className="text-[10px] text-blue-600 font-bold block mt-1">{toBengaliDigits(banks.length)} টি ব্যাংক একাউন্ট</span>
                  </div>
                </div>

                {/* Bank Accounts Section with Add Bank Button */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">ব্যাংক একাউন্টসমূহ ও ব্যালেন্স বিবরণ</h3>
                      <p className="text-xs text-slate-500 font-medium">প্রতিষ্ঠানের সাথে যুক্ত ব্যাংক একাউন্ট ও জমা</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setBankModalOpen(true)}
                      className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> নতুন ব্যাংক যোগ করুন
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {banks.length === 0 ? (
                      <div className="col-span-full py-8 text-center text-xs text-slate-400 font-bold">
                        কোনো ব্যাংক একাউন্ট যুক্ত করা নেই
                      </div>
                    ) : (
                      banks.map(b => (
                        <div key={b.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="font-black text-slate-900 text-xs block">{b.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono block">হিসাব নং: {b.accNo || '—'}</span>
                            {b.branch && <span className="text-[10px] text-slate-400 block">{b.branch} শাখা</span>}
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black text-blue-700 font-mono block">৳ {formatBnNum(b.balance)}</span>
                            <span className="text-[10px] text-slate-400 font-bold block">বর্তমান স্থিতি</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* NEW BANK MODAL */}
      <Dialog open={bankModalOpen} onOpenChange={setBankModalOpen}>
        <DialogContent className="sm:max-w-[420px] font-bengali">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900">নতুন ব্যাংক একাউন্ট যুক্ত করুন</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBank} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">ব্যাংকের নাম <span className="text-rose-500">*</span></Label>
              <Input
                type="text"
                placeholder="যেমন: ডাচ-বাংলা ব্যাংক, সোনালী ব্যাংক..."
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                required
                className="h-9 text-xs rounded-lg font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">হিসাব নম্বর (Account No)</Label>
              <Input
                type="text"
                placeholder="যেমন: ১২৩.১০১.XXXXX"
                value={bankAccNo}
                onChange={e => setBankAccNo(e.target.value)}
                className="h-9 text-xs rounded-lg font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">শাখা (Branch)</Label>
              <Input
                type="text"
                placeholder="যেমন: মতিঝিল শাখা..."
                value={bankBranch}
                onChange={e => setBankBranch(e.target.value)}
                className="h-9 text-xs rounded-lg font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">প্রারম্ভিক ব্যালেন্স (৳)</Label>
              <Input
                type="number"
                placeholder="০"
                value={bankBalance || ''}
                onChange={e => setBankBalance(Number(e.target.value) || 0)}
                className="h-9 text-xs rounded-lg font-bold"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setBankModalOpen(false)} className="rounded-lg text-xs font-bold">
                বাতিল
              </Button>
              <Button type="submit" size="sm" disabled={isSubmittingBank} className="rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmittingBank ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <Shell>
        <div className="flex items-center justify-center min-h-[60vh] font-bengali text-slate-400 font-bold text-sm">
          রিপোর্ট লোড হচ্ছে...
        </div>
      </Shell>
    }>
      <MasterReportsContent />
    </Suspense>
  );
}
