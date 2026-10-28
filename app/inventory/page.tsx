'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/Shell';
import { api, ProductCostLogData, ProductCostLogEntry } from '@/lib/api';
import { Search, Package, AlertCircle, AlertTriangle, CheckCircle2, Edit3, History, ArrowUpRight, ArrowDownRight, RefreshCw, Calculator, Clock, Layers, Filter, Printer } from 'lucide-react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatDualStock, toBnNum, formatBnCurrency } from '@/lib/utils';
import { toBengaliDigits, formatProductName } from '@/lib/bengaliUtils';
import { printElement } from '@/lib/printUtils';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/lib/authContext';

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  unit: string;
  alertThreshold: number;
  needsPriceReview?: boolean;
}

const categories = ['রড', 'রিং', 'সিমেন্ট', 'অন্যান্য'];

export const getCustomProductSortRank = (p: Product) => {
  const cat = (p.category || '').trim();
  const name = (p.name || '').trim().toLowerCase();
  const brand = (p.brand || '').trim().toLowerCase();

  // 1. Primary Category Rank: রড (1), রিং (2), সিমেন্ট (3), অন্যান্য (4)
  let catRank = 4;
  if (cat === 'রড' || name.includes('রড') || brand.includes('bsrm') || brand.includes('scrm') || brand.includes('hkg') || brand.includes('ksml') || brand.includes('dsrm')) {
    catRank = 1;
  } else if (cat === 'রিং' || name.includes('রিং') || name.includes('ring') || brand.includes('ring') || brand.includes('মেইড')) {
    catRank = 2;
  } else if (cat === 'সিমেন্ট' || name.includes('সিমেন্ট') || name.includes('cement') || brand.includes('holcim') || brand.includes('king') || brand.includes('aman')) {
    catRank = 3;
  }

  // 2. Sub-category / Brand Rank
  let subRank = 999;
  let sizeNum = 999;

  if (catRank === 1) {
    // রড Brands Order:
    // 1. BSRM
    // 2. SCRM
    // 3. SCRM TMX
    // 4. KSML
    // 5. HKG
    // 6. DSRM
    if (brand.includes('bsrm') || name.includes('bsrm')) {
      subRank = 10;
    } else if (brand.includes('scrm tmx') || name.includes('scrm tmx') || name.includes('tmx')) {
      subRank = 30;
    } else if (brand.includes('scrm') || name.includes('scrm')) {
      subRank = 20;
    } else if (brand.includes('ksml') || name.includes('ksml')) {
      subRank = 40;
    } else if (brand.includes('hkg') || name.includes('hkg')) {
      subRank = 50;
    } else if (brand.includes('dsrm') || name.includes('dsrm')) {
      subRank = 60;
    } else {
      subRank = 70;
    }

    // Size in mm for rods (8, 10, 12, 16, 20, 25, etc.)
    const mmMatch = name.match(/([০-৯0-9.]+)\s*(?:মিলি|মি\.লি|মিমি|mm)/i);
    if (mmMatch) {
      const bnToEn = mmMatch[1].replace(/[০-৯]/g, d => '0123456789'['০১২৩৪৫৬৭৮৯'.indexOf(d)]);
      sizeNum = parseFloat(bnToEn) || 999;
    }
  } else if (catRank === 2) {
    // RING Order:
    // 1. 3-3
    // 2. 3-4
    // 3. 3-7
    // 4. 7-7
    // 5. 7-9
    // 6. Pistol ring
    if (name.includes('3-3') || name.includes('3*3') || name.includes('3x3') || name.includes('৩-৩') || name.includes('৩*৩')) {
      subRank = 10;
    } else if (name.includes('3-4') || name.includes('3*4') || name.includes('3x4') || name.includes('৩-৪') || name.includes('৩*৪')) {
      subRank = 20;
    } else if (name.includes('3-7') || name.includes('3*7') || name.includes('3x7') || name.includes('৩-৭') || name.includes('৩*৭')) {
      subRank = 30;
    } else if (name.includes('7-7') || name.includes('7*7') || name.includes('7x7') || name.includes('৭-৭') || name.includes('৭*৭')) {
      subRank = 40;
    } else if (name.includes('7-9') || name.includes('7*9') || name.includes('7x9') || name.includes('৭-৯') || name.includes('৭*৯')) {
      subRank = 50;
    } else if (name.includes('pistol') || name.includes('পিস্তল')) {
      subRank = 60;
    } else {
      subRank = 70;
    }
  } else if (catRank === 3) {
    // সিমেন্ট Order:
    // 1. Holcim Strong structure
    // 2. Holcim Supercrete
    // 3. Holcim Supercrete Plus
    // 4. Holcim Coastal Guard
    // 5. Holcim Waterprotect
    // 6. King Brand
    // 7. Aman
    if (name.includes('strong structure') || name.includes('স্ট্রং স্ট্রাকচার')) {
      subRank = 10;
    } else if (name.includes('supercrete plus') || name.includes('সুপারক্রিট প্লাস')) {
      subRank = 30;
    } else if (name.includes('supercrete') || name.includes('সুপারক্রিট')) {
      subRank = 20;
    } else if (name.includes('coastal guard') || name.includes('কোস্টাল গার্ড') || name.includes('coastal')) {
      subRank = 40;
    } else if (name.includes('waterprotect') || name.includes('ওয়াটারপ্রটেক্ট') || name.includes('water protect')) {
      subRank = 50;
    } else if (brand.includes('king') || name.includes('king brand') || name.includes('কিং ব্র্যান্ড') || name.includes('কিং')) {
      subRank = 60;
    } else if (brand.includes('aman') || name.includes('aman') || name.includes('আমান')) {
      subRank = 70;
    } else {
      subRank = 80;
    }
  }

  return { catRank, subRank, sizeNum, name };
};

export const sortProductsCustom = (list: Product[]): Product[] => {
  return [...list].sort((a, b) => {
    const rankA = getCustomProductSortRank(a);
    const rankB = getCustomProductSortRank(b);

    if (rankA.catRank !== rankB.catRank) return rankA.catRank - rankB.catRank;
    if (rankA.subRank !== rankB.subRank) return rankA.subRank - rankB.subRank;
    if (rankA.sizeNum !== rankB.sizeNum) return rankA.sizeNum - rankB.sizeNum;
    return rankA.name.localeCompare(rankB.name, 'bn');
  });
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

const formatSheetQty = (stock: number, category: string): string => {
  if (stock === 0) return '০';
  const isDecimal = !Number.isInteger(stock) || category === 'রড';
  const val = isDecimal ? stock.toFixed(1) : String(Math.round(stock));
  const parts = val.split('.');
  const intPart = Number(parts[0]).toLocaleString('en-IN');
  const bnInt = toBengaliDigits(intPart);
  if (parts.length > 1 && isDecimal) {
    return `${bnInt}.${toBengaliDigits(parts[1])}`;
  }
  return bnInt;
};

const formatSheetRate = (rate: number, category: string): string => {
  if (!rate || rate === 0) return '';
  const isDecimal = !Number.isInteger(rate) || (category === 'রড' && rate % 1 !== 0);
  const val = isDecimal ? rate.toFixed(1) : String(Math.round(rate));
  const parts = val.split('.');
  const intPart = Number(parts[0]).toLocaleString('en-IN');
  const bnInt = toBengaliDigits(intPart);
  if (parts.length > 1 && isDecimal) {
    return `${bnInt}.${toBengaliDigits(parts[1])}`;
  }
  return bnInt;
};

const formatSheetValue = (value: number, category: string): string => {
  if (!value || value === 0) return '-';
  const isDecimal = !Number.isInteger(value) || (category === 'রড' && value % 1 !== 0);
  const val = isDecimal ? value.toFixed(1) : String(Math.round(value));
  const parts = val.split('.');
  const intPart = Number(parts[0]).toLocaleString('en-IN');
  const bnInt = toBengaliDigits(intPart);
  if (parts.length > 1 && isDecimal) {
    return `${bnInt}.${toBengaliDigits(parts[1])}`;
  }
  return bnInt;
};

const formatGrandTotal = (value: number): string => {
  if (!value || value === 0) return '০.০০';
  const val = value.toFixed(2);
  const parts = val.split('.');
  const intPart = Number(parts[0]).toLocaleString('en-IN');
  return `${toBengaliDigits(intPart)}.${toBengaliDigits(parts[1])}`;
};

export default function InventoryPage() {
  const { canModifyData } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('সব');
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Simple Delete State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Price Review / Fix State
  const [fixingPriceProduct, setFixingPriceProduct] = useState<Product | null>(null);
  const [editBuyPrice, setEditBuyPrice] = useState<number | string>('');
  const [editSellPrice, setEditSellPrice] = useState<number | string>('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  // Cost Log & History State
  const [isCostLogOpen, setIsCostLogOpen] = useState(false);
  const [costLogLoading, setCostLogLoading] = useState(false);
  const [costLogs, setCostLogs] = useState<ProductCostLogData[]>([]);
  const [selectedLogProductId, setSelectedLogProductId] = useState<string>('all');
  const [filterLogType, setFilterLogType] = useState<string>('all');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.inventory.list();
      const safeData = Array.isArray(data) ? data : [];
      const mapped = safeData.map(p => ({
        id: String(p.id),
        name: formatProductName(p.name, p.category_name),
        category: p.category_name || 'অন্যান্য',
        brand: p.brand || '',
        buyPrice: Number(p.purchase_price || 0),
        sellPrice: Number(p.sell_price || 0),
        stock: Number(p.stock || 0),
        unit: p.unit || 'পিস',
        alertThreshold: Number(p.min_stock || 10),
        needsPriceReview: Boolean(p.needs_price_review)
      }));
      setProducts(sortProductsCustom(mapped));
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      await fetchProducts();
    })();
    return () => { ignore = true; };
  }, []);

  const openPriceFixModal = (p: Product) => {
    setFixingPriceProduct(p);
    setEditBuyPrice(p.buyPrice || 0);
    setEditSellPrice(p.sellPrice || 0);
  };

  const handleSaveFixedPrice = async () => {
    if (!fixingPriceProduct) return;
    try {
      setIsSavingPrice(true);
      const newBuy = Number(editBuyPrice) || 0;
      const newSell = Number(editSellPrice) || 0;
      await api.inventory.update(fixingPriceProduct.id, {
        purchase_price: newBuy,
        sell_price: newSell,
        needs_price_review: false
      });
      toast.success('ক্রয় মূল্য সফলভাবে আপডেট ও ফিক্স করা হয়েছে');
      setProducts(prev => prev.map(p => 
        p.id === fixingPriceProduct.id ? {
          ...p,
          buyPrice: newBuy,
          sellPrice: newSell,
          needsPriceReview: false
        } : p
      ));
      if (viewingProduct?.id === fixingPriceProduct.id) {
        setViewingProduct(prev => prev ? {
          ...prev,
          buyPrice: newBuy,
          sellPrice: newSell,
          needsPriceReview: false
        } : null);
      }
      setFixingPriceProduct(null);
    } catch (err: any) {
      console.error('Error updating price:', err);
      toast.error('মূল্য আপডেট করা সম্ভব হয়নি');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleDismissPriceAlert = async () => {
    if (!fixingPriceProduct) return;
    try {
      setIsSavingPrice(true);
      await api.inventory.update(fixingPriceProduct.id, {
        needs_price_review: false
      });
      toast.success('ক্রয় মূল্য নিশ্চিত করা হয়েছে ও অ্যালার্ট সরানো হয়েছে');
      setProducts(prev => prev.map(p => 
        p.id === fixingPriceProduct.id ? { ...p, needsPriceReview: false } : p
      ));
      if (viewingProduct?.id === fixingPriceProduct.id) {
        setViewingProduct(prev => prev ? { ...prev, needsPriceReview: false } : null);
      }
      setFixingPriceProduct(null);
    } catch (err: any) {
      console.error('Error dismissing alert:', err);
      toast.error('অ্যালার্ট সরানো যায়নি');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    try {
      setIsDeleting(true);
      await api.inventory.delete(deletingProduct.id);
      toast.success('পণ্যটি মুছে ফেলা হয়েছে');
      setProducts(prev => prev.filter(p => p.id !== deletingProduct.id));
      if (viewingProduct?.id === deletingProduct.id) {
        setViewingProduct(null);
      }
      setDeletingProduct(null);
    } catch (err: any) {
      console.error('Error deleting product:', err);
      toast.error('মুছে ফেলা সম্ভব হয়নি');
    } finally {
      setIsDeleting(false);
    }
  };

  const openCostLogModal = async (productId?: string) => {
    setIsCostLogOpen(true);
    setCostLogLoading(true);
    if (productId) {
      setSelectedLogProductId(String(productId));
    } else {
      setSelectedLogProductId('all');
    }
    try {
      const res = await api.inventory.getCostLogs();
      const safeData = Array.isArray(res) ? res : [res];
      setCostLogs(safeData);
    } catch (e) {
      console.error('Error fetching cost logs:', e);
      toast.error('হিস্ট্রি লগ লোড করা সম্ভব হয়নি');
    } finally {
      setCostLogLoading(false);
    }
  };

  const handleRefreshCostLogs = async () => {
    setCostLogLoading(true);
    try {
      const res = await api.inventory.getCostLogs();
      const safeData = Array.isArray(res) ? res : [res];
      setCostLogs(safeData);
      toast.success('হিস্ট্রি লগ রিফ্রেশ করা হয়েছে');
    } catch (e) {
      console.error('Error refreshing cost logs:', e);
      toast.error('রিফ্রেশ করা সম্ভব হয়নি');
    } finally {
      setCostLogLoading(false);
    }
  };

  const filtered = sortProductsCustom(products.filter(p => 
    (filterCat === 'সব' || p.category === filterCat) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())))
  ));

  const alertItems = products.filter(p => p.stock <= p.alertThreshold);
  const priceReviewItems = products.filter(p => p.needsPriceReview);
  const totalStockValue = products.reduce((acc, p) => acc + (p.buyPrice * p.stock), 0);

  // Filter cost logs based on selected product and type
  const activeProductLogs = selectedLogProductId === 'all' 
    ? costLogs.flatMap(p => p.logs.map(l => ({ ...l, product_name: p.product_name, product_id: p.product_id, unit: p.unit })))
    : (costLogs.find(p => String(p.product_id) === selectedLogProductId)?.logs.map(l => ({ 
        ...l, 
        product_name: costLogs.find(p => String(p.product_id) === selectedLogProductId)?.product_name || '',
        product_id: Number(selectedLogProductId),
        unit: costLogs.find(p => String(p.product_id) === selectedLogProductId)?.unit || 'পিস'
      })) || []);

  const displayedCostLogs = activeProductLogs.filter(l => {
    if (filterLogType === 'all') return true;
    if (filterLogType === 'purchase') return l.transaction_type === 'purchase';
    if (filterLogType === 'sale') return l.transaction_type === 'sale';
    if (filterLogType === 'return') return l.transaction_type === 'sale_return' || l.transaction_type === 'purchase_return';
    if (filterLogType === 'recalculated') return Boolean(l.is_edited);
    return true;
  });

  const selectedProductInfo = selectedLogProductId !== 'all' 
    ? costLogs.find(p => String(p.product_id) === selectedLogProductId)
    : null;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-bengali">পণ্য তালিকা ও স্টক</h2>
            <p className="text-slate-500 font-bengali text-sm">রড, সিমেন্ট, রিং ও অন্যান্য পণ্যের বর্তমান মজুদ ও বিবরণ</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => printElement('stock-sheet-printable-wrapper')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bengali font-bold text-xs gap-2 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all py-2.5 px-4"
            >
              <Printer className="w-4 h-4" />
              স্টক শিট প্রিন্ট
            </Button>
            <Button
              onClick={() => openCostLogModal()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bengali font-bold text-xs gap-2 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all py-2.5 px-4"
            >
              <History className="w-4 h-4" />
              ক্রয়মূল্য ও স্টক ইতিহাস লগ
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'মোট পণ্য', value: `${toBnNum(products.length)} ধরনের`, color: 'text-slate-800', bg: 'bg-white' },
            { 
              label: 'মূল্য রিভিউ অ্যালার্ট', 
              value: priceReviewItems.length > 0 ? `${toBnNum(priceReviewItems.length)}টি পণ্য` : 'সব ঠিক আছে ✓', 
              color: priceReviewItems.length > 0 ? 'text-amber-600' : 'text-slate-600',
              bg: priceReviewItems.length > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white'
            },
            { label: 'স্টক সতর্কতা', value: `${toBnNum(alertItems.length)}টি পণ্য`, color: 'text-rose-600', bg: 'bg-white' },
            { label: 'স্টক মূল্য', value: formatBnCurrency(totalStockValue), color: 'text-orange-600', bg: 'bg-white' },
          ].map((s, i) => (
            <Card key={i} className={cn("border-slate-200 shadow-sm rounded-lg", s.bg)}>
              <CardContent className="p-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold font-bengali">{s.label}</p>
                <p className={cn("text-xl font-black font-bengali mt-1", s.color)}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Table */}
          <Card className="lg:col-span-3 border-slate-200 shadow-sm rounded-lg bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3 bg-slate-50/50">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="পণ্য বা ব্র্যান্ড খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white border-slate-200 font-bengali rounded-lg" />
              </div>
              <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
                {['সব', ...categories].map(cat => (
                  <button key={cat} onClick={() => setFilterCat(cat)} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold font-bengali transition-colors cursor-pointer whitespace-nowrap", filterCat === cat ? 'bg-orange-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50')}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <CardContent className="p-0 overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bengali text-slate-500 text-[10px] tracking-widest font-bold py-3">পণ্য</TableHead>
                    <TableHead className="font-bengali text-slate-500 text-[10px] tracking-widest font-bold">বিভাগ</TableHead>
                    <TableHead className="font-bengali text-slate-500 text-[10px] tracking-widest font-bold text-right">ক্রয় মূল্য</TableHead>
                    <TableHead className="font-bengali text-slate-500 text-[10px] tracking-widest font-bold text-right">বিক্রয় মূল্য</TableHead>
                    <TableHead className="font-bengali text-slate-500 text-[10px] tracking-widest font-bold text-center">বর্তমান স্টক</TableHead>
                    <TableHead className="font-bengali text-slate-500 text-[10px] tracking-widest font-bold text-right">মোট মূল্য</TableHead>
                    <TableHead className="font-bengali text-slate-500 text-[10px] tracking-widest font-bold text-center w-24">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-16 text-slate-400 font-bengali">লোড হচ্ছে...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-16 text-slate-400 font-bengali">কোনো পণ্য পাওয়া যায়নি</TableCell></TableRow>
                  ) : filtered.map((product) => (
                    <TableRow key={product.id} onClick={() => setViewingProduct(product)} className={cn("border-b border-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors", product.needsPriceReview && "bg-amber-50/30")}>
                      <TableCell className="p-3 font-bengali">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-800 text-sm">{product.name}</div>
                          {product.needsPriceReview && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 gap-1 animate-pulse" title="ক্রয় চালান এডিট হওয়ায় ক্রয় মূল্য পর্যালোচনা প্রয়োজন">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              মূল্য রিভিউ
                            </span>
                          )}
                        </div>
                        {product.brand && <div className="text-[10px] text-slate-400 font-bold">{product.brand}</div>}
                      </TableCell>
                      <TableCell>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold font-bengali uppercase", 
                          product.category === 'রড' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                          product.category === 'রিং' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 
                          product.category === 'সিমেন্ট' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
                          'bg-slate-100 text-slate-600'
                        )}>
                          {product.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bengali text-sm">
                        {product.needsPriceReview ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-bold text-amber-700">{formatBnCurrency(product.buyPrice)}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openPriceFixModal(product);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all active:scale-95"
                              title="ক্রয় মূল্য ফিক্স করুন"
                            >
                              <AlertTriangle className="w-3 h-3" /> ফিক্স করুন
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500">{formatBnCurrency(product.buyPrice)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bengali font-bold text-slate-800 text-sm">{formatBnCurrency(product.sellPrice)}</TableCell>
                      <TableCell className="text-center font-bengali">
                        {(() => {
                          const stockInfo = formatDualStock(product.stock, product.unit, product.category);
                          return (
                            <div className="flex flex-col items-center">
                              <span className={cn("font-black text-sm", product.stock <= product.alertThreshold ? 'text-rose-600' : 'text-slate-800')}>
                                {stockInfo.main}
                                {product.stock <= product.alertThreshold && <span className="ml-1 text-rose-500">⚠</span>}
                              </span>
                              {stockInfo.sub && (
                                <span className="text-[11px] font-bold text-slate-500">
                                  {stockInfo.sub}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-bengali font-bold text-slate-900 text-sm">
                        {formatBnCurrency(product.buyPrice * product.stock)}
                      </TableCell>
                      <TableCell className="text-center font-bengali p-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCostLogModal(product.id)}
                            className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="ক্রয়মূল্য ও স্টক পরিবর্তনের ইতিহাস দেখুন"
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          {product.needsPriceReview && canModifyData && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPriceFixModal(product)}
                              className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              title="ক্রয় মূল্য ফিক্স করুন"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Alert Sidebar */}
          <div className="space-y-4 font-bengali">
            {/* Price Review Alert Section */}
            {priceReviewItems.length > 0 && (
              <Card className="border-amber-200 shadow-sm rounded-lg bg-amber-50/40">
                <div className="p-4 border-b border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h3 className="font-bold text-amber-900 text-sm">ক্রয় মূল্য রিভিউ ({toBnNum(priceReviewItems.length)})</h3>
                  </div>
                </div>
                <CardContent className="p-3 space-y-2">
                  <p className="text-[11px] text-amber-800 leading-snug">চালান এডিটের কারণে নিচের পণ্যের ক্রয় মূল্য পর্যালোচনার প্রয়োজন:</p>
                  {priceReviewItems.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => openPriceFixModal(p)} 
                      className="p-2.5 bg-white border border-amber-200 rounded-lg flex justify-between items-center cursor-pointer hover:bg-amber-50 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{p.name}</p>
                        <p className="text-[10px] text-amber-700 font-bold">বর্তমান কেনা: {formatBnCurrency(p.buyPrice)}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md shadow-xs">
                        ফিক্স করুন
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Low Stock Alert Section */}
            <Card className="border-slate-200 shadow-sm rounded-lg bg-white">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">স্টক সতর্কতা</h3>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <CardContent className="p-3 space-y-2">
                {alertItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">সব পণ্য পর্যাপ্ত আছে ✓</p>
                ) : alertItems.map(p => {
                  const sInfo = formatDualStock(p.stock, p.unit, p.category);
                  return (
                    <div key={p.id} onClick={() => setViewingProduct(p)} className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg flex justify-between items-center cursor-pointer hover:bg-rose-100/70 transition-colors">
                      <div>
                        <p className="text-xs font-bold text-rose-900">{p.name}</p>
                        {p.brand && <p className="text-[10px] text-rose-600 font-bold">{p.brand}</p>}
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-rose-700">{sInfo.main}</span>
                        {sInfo.sub && <p className="text-[10px] text-rose-500 font-bold">{sInfo.sub}</p>}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* View Product Details Modal */}
      <Dialog open={!!viewingProduct} onOpenChange={(open) => { if (!open) setViewingProduct(null); }}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl p-6 font-bengali">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-600" />
              পণ্যের বিস্তারিত তথ্য
            </DialogTitle>
          </DialogHeader>

          {viewingProduct && (
            <div className="space-y-4 py-2">
              {/* Header summary box */}
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-bold uppercase">
                    {viewingProduct.category}
                  </span>
                  <div className="flex gap-1.5 items-center">
                    {viewingProduct.needsPriceReview && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> মূল্য রিভিউ প্রয়োজন
                      </span>
                    )}
                    {viewingProduct.stock <= viewingProduct.alertThreshold && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> স্বল্প স্টক
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-black text-slate-800 mt-2">{viewingProduct.name}</h3>
                {viewingProduct.brand && (
                  <p className="text-xs text-slate-500 font-semibold">ব্র্যান্ড: {viewingProduct.brand}</p>
                )}
              </div>

              {/* Price Review Notice in View Modal */}
              {viewingProduct.needsPriceReview && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
                  <div className="text-xs text-amber-800">
                    <p className="font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> ক্রয় চালান এডিট সতর্কতা</p>
                    <p className="text-[11px] mt-0.5 text-amber-700">চালান এডিটের কারণে এর ক্রয় মূল্য পর্যালোচনার তালিকায় আছে।</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const p = viewingProduct;
                      setViewingProduct(null);
                      openPriceFixModal(p);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shrink-0 shadow-xs"
                  >
                    মূল্য ফিক্স করুন
                  </Button>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">ক্রয় মূল্য</span>
                  <span className="text-sm font-black text-slate-700">{formatBnCurrency(viewingProduct.buyPrice)}</span>
                  <span className="text-[10px] text-slate-400 block font-semibold">প্রতি {viewingProduct.unit}</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">বিক্রয় মূল্য</span>
                  <span className="text-sm font-black text-emerald-600">{formatBnCurrency(viewingProduct.sellPrice)}</span>
                  <span className="text-[10px] text-slate-400 block font-semibold">প্রতি {viewingProduct.unit}</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">বর্তমান স্টক</span>
                  {(() => {
                    const stockInfo = formatDualStock(viewingProduct.stock, viewingProduct.unit, viewingProduct.category);
                    return (
                      <div>
                        <span className={cn("text-sm font-black block", viewingProduct.stock <= viewingProduct.alertThreshold ? "text-rose-600" : "text-slate-800")}>
                          {stockInfo.main}
                          {viewingProduct.stock <= viewingProduct.alertThreshold && <span className="ml-1 text-rose-500">⚠</span>}
                        </span>
                        {stockInfo.sub && <span className="text-[10px] text-slate-500 font-semibold block">{stockInfo.sub}</span>}
                      </div>
                    );
                  })()}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">আনুমানিক লাভ ({viewingProduct.unit})</span>
                  <span className="text-sm font-black text-orange-600">
                    {formatBnCurrency(viewingProduct.sellPrice - viewingProduct.buyPrice)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">মোট মজুদ মূল্য</span>
                  <span className="text-sm font-black text-slate-800">
                    {formatBnCurrency(viewingProduct.buyPrice * viewingProduct.stock)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">সতর্কতা সীমা</span>
                  <span className="text-sm font-black text-slate-700">
                    {toBnNum(viewingProduct.alertThreshold)} {viewingProduct.unit}
                  </span>
                </div>
              </div>

              <DialogFooter className="flex flex-row justify-end items-center gap-2 pt-2">
                <Button variant="default" onClick={() => setViewingProduct(null)} className="font-bengali rounded-lg text-xs">
                  বন্ধ করুন
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Price Fix & Review Modal */}
      <Dialog open={!!fixingPriceProduct} onOpenChange={(open) => { if (!open) setFixingPriceProduct(null); }}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl p-6 font-bengali">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              ক্রয় মূল্য পর্যালোচনা ও ফিক্স
            </DialogTitle>
          </DialogHeader>

          {fixingPriceProduct && (
            <div className="space-y-4 py-2">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
                  ইনভয়েস এডিট সংক্রান্ত তথ্য:
                </p>
                <p className="text-amber-800 leading-relaxed">
                  ক্রয় চালান এডিট করার কারণে <strong className="font-bold">&quot;{fixingPriceProduct.name}&quot;</strong> পণ্যের স্টকে পরিবর্তন এসেছে, কিন্তু এর ক্রয় মূল্য অপরিবর্তিত রাখা হয়েছে। আপনি চাইলে নিচে ক্রয় মূল্য ফিক্স করে আপডেট করতে পারেন অথবা বর্তমান মূল্য নিশ্চিত করতে পারেন।
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    ক্রয় মূল্য (প্রতি {fixingPriceProduct.unit}) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={editBuyPrice}
                    onChange={(e) => setEditBuyPrice(e.target.value)}
                    className="font-bengali text-sm font-bold bg-white border-slate-300 focus:border-amber-500"
                    placeholder="ক্রয় মূল্য দিন"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    বিক্রয় মূল্য (প্রতি {fixingPriceProduct.unit})
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={editSellPrice}
                    onChange={(e) => setEditSellPrice(e.target.value)}
                    className="font-bengali text-sm font-bold bg-white border-slate-300 focus:border-amber-500"
                    placeholder="বিক্রয় মূল্য দিন"
                  />
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDismissPriceAlert}
                  disabled={isSavingPrice}
                  className="w-full sm:w-auto font-bengali text-slate-600 border-slate-200 hover:bg-slate-50 text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  বর্তমান মূল্য ঠিক আছে
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveFixedPrice}
                  disabled={isSavingPrice}
                  className="w-full sm:w-auto font-bengali bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm"
                >
                  {isSavingPrice ? 'সংরক্ষণ হচ্ছে...' : 'মূল্য ফিক্স ও আপডেট করুন'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingProduct} onOpenChange={(open) => { if (!open) setDeletingProduct(null); }}>
        <DialogContent className="w-[95vw] max-w-sm rounded-2xl p-6 font-bengali">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              পণ্য মুছে ফেলতে চান?
            </DialogTitle>
          </DialogHeader>

          {deletingProduct && (
            <p className="text-sm text-slate-600 py-2">
              আপনি কি নিশ্চিত যে <strong className="text-slate-900 font-bold">&quot;{deletingProduct.name}&quot;</strong> পণ্যটি তালিকা থেকে মুছে ফেলতে চান?
            </p>
          )}

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeletingProduct(null)}
              disabled={isDeleting}
              className="font-bengali rounded-lg text-xs"
            >
              বাতিল
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
              disabled={isDeleting}
              className="font-bengali rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'মুছে ফেলুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock & Purchase Cost History Log Dialog */}
      <Dialog open={isCostLogOpen} onOpenChange={setIsCostLogOpen}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] flex flex-col p-0 rounded-2xl overflow-hidden font-bengali bg-slate-50">
          <DialogHeader className="p-5 bg-white border-b border-slate-200 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    ক্রয়মূল্য ও স্টক ইতিহাস লগ (Audit Trail)
                  </DialogTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    প্রতিটি চালানের কারণে পণ্যের কেনা দাম ও স্টকের পরিবর্তন ও স্বয়ংক্রিয় রিক্যালকুলেশন সূত্র
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshCostLogs}
                  disabled={costLogLoading}
                  className="rounded-xl border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 gap-1.5"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", costLogLoading && "animate-spin text-indigo-600")} />
                  রিফ্রেশ
                </Button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
              {/* Product Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 whitespace-nowrap">পণ্য নির্বাচন:</label>
                <select
                  value={selectedLogProductId}
                  onChange={(e) => setSelectedLogProductId(e.target.value)}
                  className="text-xs font-bold font-bengali bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                >
                  <option value="all">সব পণ্য ({costLogs.length}টি)</option>
                  {costLogs.map((p) => (
                    <option key={p.product_id} value={String(p.product_id)}>
                      {p.product_name} (স্টক: {p.current_stock} {p.unit} | দর: ৳{p.current_purchase_price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {[
                  { id: 'all', label: 'সব লেনদেন' },
                  { id: 'purchase', label: 'ক্রয় (Purchase)' },
                  { id: 'sale', label: 'বিক্রয় (Sale)' },
                  { id: 'return', label: 'রিটার্ন (Returns)' },
                  { id: 'recalculated', label: '🔄 এডিট ও রিক্যালকুলেটেড' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFilterLogType(t.id)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                      filterLogType === t.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </DialogHeader>

          {/* Product Summary Header Card if specific product selected */}
          {selectedProductInfo && (
            <div className="px-5 py-3 bg-indigo-50/60 border-b border-indigo-100 space-y-2 shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-bold block">নির্বাচিত পণ্য</span>
                  <span className="text-sm font-black text-slate-800 truncate block">{selectedProductInfo.product_name}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-bold block">বর্তমান স্টক</span>
                  <span className="text-sm font-black text-indigo-700">{selectedProductInfo.current_stock} {selectedProductInfo.unit}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-bold block">বর্তমান গড় ক্রয়মূল্য</span>
                  <span className="text-sm font-black text-emerald-600">{formatBnCurrency(selectedProductInfo.current_purchase_price)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-bold block">মোট হিসাব পরিবর্তন</span>
                  <span className="text-sm font-black text-slate-700">{toBnNum(selectedProductInfo.logs.length)} বার</span>
                </div>
              </div>

              {selectedProductInfo.has_recalculations && (
                <div className="bg-amber-100/80 border border-amber-300 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-amber-900 font-bold">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>এই পণ্যের অতীতে চালান এডিট হওয়ার কারণে টাইমলাইন রিক্যালকুলেট হয়েছে।</span>
                  </div>
                  {selectedProductInfo.latest_recalculation_date && (
                    <span className="text-[11px] bg-white/80 px-2 py-0.5 rounded border border-amber-300">
                      সর্বশেষ রিক্যালকুলেশন: {selectedProductInfo.latest_recalculation_date}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Body List */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-3">
            {costLogLoading ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                ইতিহাস লগ লোড হচ্ছে...
              </div>
            ) : displayedCostLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-600">কোনো হিস্ট্রি লগ পাওয়া যায়নি</p>
                <p className="text-xs text-slate-400 mt-1">ক্রয় বা বিক্রয় চালান তৈরি বা এডিট হলে এখানে স্বয়ংক্রিয়ভাবে বিস্তারিত আসবে</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedCostLogs.map((log, idx) => {
                  const isPurchase = log.transaction_type === 'purchase';
                  const isSale = log.transaction_type === 'sale';
                  const isReturn = log.transaction_type === 'sale_return' || log.transaction_type === 'purchase_return';
                  const costIncreased = log.cost_change > 0;
                  const costDecreased = log.cost_change < 0;

                  return (
                    <div
                      key={`${log.transaction_id}-${idx}`}
                      className={cn(
                        "bg-white rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-all",
                        log.is_edited ? "border-amber-300 border-l-4 border-l-amber-500 bg-amber-50/20" : "border-slate-200/80"
                      )}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-black",
                              isPurchase && "bg-blue-50 text-blue-700 border border-blue-200",
                              isSale && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                              isReturn && "bg-purple-50 text-purple-700 border border-purple-200"
                            )}
                          >
                            {log.transaction_type_label}
                          </span>
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            {log.invoice_no || `TX#${log.transaction_id}`}
                          </span>
                          {selectedLogProductId === 'all' && (
                            <span className="text-xs font-bold bg-indigo-50/70 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                              {log.product_name}
                            </span>
                          )}
                          {log.party_name && (
                            <span className="text-xs text-slate-600 font-medium">
                              ({log.party_name})
                            </span>
                          )}

                          {log.is_edited && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs" title={`এডিট হয়েছে: ${log.edited_at}`}>
                              <RefreshCw className="w-3 h-3 text-amber-700" />
                              এডিট ও রিক্যালকুলেটেড
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>চালানের তারিখ: {log.date}</span>
                          {log.is_edited && log.edited_at && (
                            <span className="text-amber-700 font-bold bg-amber-100/70 px-1.5 py-0.2 rounded">
                              এডিট: {log.edited_at}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                        <div>
                          <span className="text-slate-400 font-medium block">পরিমাণ (In/Out)</span>
                          <span
                            className={cn(
                              "font-black text-sm",
                              (isPurchase || log.transaction_type === 'sale_return') ? "text-emerald-600" : "text-rose-600"
                            )}
                          >
                            {(isPurchase || log.transaction_type === 'sale_return') ? '+' : '-'}{log.quantity} {log.unit}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 font-medium block">চালান দর (ভাড়াসহ)</span>
                          <span className="font-bold text-slate-800 text-sm">
                            {formatBnCurrency(log.landed_cost)}
                            {log.extra_per_unit > 0 && (
                              <span className="text-[10px] text-slate-400 font-normal ml-1">
                                (মূল: {log.rate} + খরচ: {log.extra_per_unit})
                              </span>
                            )}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 font-medium block">স্টক পরিবর্তন</span>
                          <div className="flex items-center gap-1 font-bold text-slate-700 text-xs">
                            <span>{log.stock_before}</span>
                            <span className="text-slate-400">➔</span>
                            <span className="font-black text-slate-900">{log.stock_after} {log.unit}</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 font-medium block">গড় ক্রয়মূল্য সমন্বয়</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-500">৳{log.cost_before}</span>
                            <span className="text-slate-400">➔</span>
                            <span
                              className={cn(
                                "font-black text-sm",
                                costIncreased && "text-rose-600",
                                costDecreased && "text-emerald-600",
                                !costIncreased && !costDecreased && "text-slate-800"
                              )}
                            >
                              ৳{log.cost_after}
                            </span>
                            {costIncreased && (
                              <span className="inline-flex items-center text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                <ArrowUpRight className="w-3 h-3" /> +৳{Math.abs(log.cost_change)}
                              </span>
                            )}
                            {costDecreased && (
                              <span className="inline-flex items-center text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <ArrowDownRight className="w-3 h-3" /> -৳{Math.abs(log.cost_change)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Recalculation Note if edited */}
                      {log.is_edited && (
                        <div className="mt-3 text-xs text-amber-950 bg-amber-100/90 border border-amber-300 rounded-xl p-3 space-y-1.5 font-bengali">
                          <div className="flex items-center gap-2 font-black text-amber-900">
                            <RefreshCw className="w-4 h-4 text-amber-700 shrink-0" />
                            <span>চালান এডিট ও রিক্যালকুলেশন বিবরণ ({log.edited_at}):</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                            <div className="bg-white/80 p-2 rounded-lg border border-amber-200">
                              <span className="text-slate-500 font-bold block">কেন রিক্যালকুলেট হলো?</span>
                              <span className="font-bold text-slate-800">{log.recalculation_reason || 'চালানের পণ্য বা পরিমাণ পরিবর্তনের কারণে'}</span>
                            </div>
                            <div className="bg-white/80 p-2 rounded-lg border border-amber-200">
                              <span className="text-slate-500 font-bold block">পরবর্তী কয়টি ক্রয়মূল্য রিক্যালকুলেট হয়েছে?</span>
                              <span className="font-black text-indigo-700">
                                পরবর্তী {toBnNum(log.subsequent_purchases_recalculated || 0)}টি ক্রয় চালান (মোট {toBnNum(log.subsequent_transactions_recalculated || 0)}টি লেনদেন)
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Recalculated due to prior edit */}
                      {log.was_recomputed_due_to_prior_edit && (
                        <div className="mt-2 text-[11px] text-indigo-800 bg-indigo-50/80 border border-indigo-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 font-bold font-bengali">
                          <RefreshCw className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span>পূর্ববর্তী চালান এডিটের প্রভাবে এই চালানের গড় ক্রয়মূল্য স্বয়ংক্রিয়ভাবে নতুন করে রিক্যালকুলেট হয়েছে।</span>
                        </div>
                      )}

                      {/* Formula & Note Breakdown */}
                      {log.formula && (
                        <div className="mt-3 pt-2 border-t border-slate-50 flex items-center gap-2 bg-slate-50/80 p-2.5 rounded-lg text-xs font-mono text-slate-700">
                          <Calculator className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-[11px] font-bold text-slate-500">হিসাব সূত্র:</span>
                          <span className="text-[11px] font-bold text-indigo-900 select-all">{log.formula}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="p-4 bg-white border-t border-slate-200 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsCostLogOpen(false)}
              className="rounded-xl border-slate-200 text-xs font-bold text-slate-700"
            >
              বন্ধ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 🖨️ A4 PRINTABLE STOCK SHEET (EXACT 1-TO-1 MATCH WITH USER REFERENCE IMAGE) */}
      {/* ========================================================================= */}
      <div 
        id="stock-sheet-printable-wrapper" 
        className="hidden print:block font-bengali text-black text-[13px] leading-tight p-2"
        style={{ color: '#000000', backgroundColor: '#ffffff', width: '100%', maxWidth: '750px', margin: '0 auto' }}
      >
        <table 
          style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            border: '2px solid #000000',
            fontFamily: "'Hind Siliguri', 'SolaimanLipi', 'Kalpurush', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }}
        >
          <thead>
            {/* Header Row 1: মেসার্স দেলোয়ার এন্ড ব্রাদার্স */}
            <tr>
              <th 
                colSpan={4} 
                style={{ 
                  border: '1.5px solid #000000', 
                  padding: '7px 4px', 
                  textAlign: 'center', 
                  fontSize: '18px', 
                  fontWeight: 900,
                  color: '#000000'
                }}
              >
                মেসার্স দেলোয়ার এন্ড ব্রাদার্স
              </th>
            </tr>
            {/* Header Row 2: স্টক */}
            <tr>
              <th 
                colSpan={4} 
                style={{ 
                  border: '1.5px solid #000000', 
                  padding: '5px 4px', 
                  textAlign: 'center', 
                  fontSize: '16px', 
                  fontWeight: 800,
                  color: '#000000'
                }}
              >
                স্টক
              </th>
            </tr>
            {/* Header Row 3: তারিখ */}
            <tr>
              <th 
                colSpan={4} 
                style={{ 
                  border: '1.5px solid #000000', 
                  padding: '5px 4px', 
                  textAlign: 'center', 
                  fontSize: '15px', 
                  fontWeight: 700,
                  color: '#000000'
                }}
              >
                {formatBnDate(new Date(), 'dd MMMM - yyyy')}
              </th>
            </tr>
          </thead>

          <tbody>
            {(() => {
              const knownOrder = ['রড', 'রিং', 'সিমেন্ট', 'অন্যান্য'];
              const allCategories = Array.from(new Set(products.map(p => p.category || 'অন্যান্য')));
              const sortedCats = [
                ...knownOrder.filter(c => allCategories.includes(c)),
                ...allCategories.filter(c => !knownOrder.includes(c))
              ];

              const activeCats = sortedCats.filter(c => products.some(p => p.category === c));

              return activeCats.map((catName, catIdx) => {
                const catProducts = sortProductsCustom(products.filter(p => p.category === catName));
                if (catProducts.length === 0) return null;

                const catTotalQty = catProducts.reduce((sum, p) => sum + Number(p.stock || 0), 0);
                const catTotalVal = catProducts.reduce((sum, p) => sum + (Number(p.buyPrice || 0) * Number(p.stock || 0)), 0);
                const categoryTitle = catName === 'রড' ? 'রড স্টক' : catName === 'সিমেন্ট' ? 'সিমেন্ট স্টক' : catName === 'রিং' ? 'রিং স্টক' : `${catName} স্টক`;

                return (
                  <React.Fragment key={catName}>
                    {/* Category Header Row (Red Text) */}
                    <tr style={{ pageBreakInside: 'avoid' }}>
                      <td 
                        colSpan={4} 
                        style={{ 
                          border: '1.5px solid #000000', 
                          padding: '6px 4px', 
                          textAlign: 'center', 
                          fontSize: '15px', 
                          fontWeight: 900,
                          color: '#ff0000'
                        }}
                      >
                        {categoryTitle}
                      </td>
                    </tr>

                    {/* Product Rows */}
                    {catProducts.map((prod) => {
                      const rowVal = prod.stock * prod.buyPrice;
                      return (
                        <tr key={prod.id} style={{ pageBreakInside: 'avoid' }}>
                          <td 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '5px 8px', 
                              textAlign: 'left', 
                              fontWeight: 700,
                              fontSize: '13px',
                              width: '35%'
                            }}
                          >
                            {prod.name}
                          </td>
                          <td 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '5px 8px', 
                              textAlign: 'right', 
                              fontWeight: 700,
                              fontSize: '13px',
                              width: '22%'
                            }}
                          >
                            {formatSheetQty(prod.stock, catName)}
                          </td>
                          <td 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '5px 8px', 
                              textAlign: 'right', 
                              fontWeight: 700,
                              fontSize: '13px',
                              width: '18%'
                            }}
                          >
                            {formatSheetRate(prod.buyPrice, catName)}
                          </td>
                          <td 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '5px 8px', 
                              textAlign: 'right', 
                              fontWeight: 700,
                              fontSize: '13px',
                              width: '25%'
                            }}
                          >
                            {formatSheetValue(rowVal, catName)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Subtotal Row */}
                    <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                      <td 
                        style={{ 
                          border: '1.5px solid #000000', 
                          padding: '5px 8px', 
                          textAlign: 'left', 
                          fontWeight: 900,
                          fontSize: '14px'
                        }}
                      >
                        মোট
                      </td>
                      <td 
                        style={{ 
                          border: '1.5px solid #000000', 
                          padding: '5px 8px', 
                          textAlign: 'right', 
                          fontWeight: 900,
                          fontSize: '14px'
                        }}
                      >
                        {formatSheetQty(catTotalQty, catName)}
                      </td>
                      <td 
                        style={{ 
                          border: '1.5px solid #000000', 
                          padding: '5px 8px' 
                        }}
                      ></td>
                      <td 
                        style={{ 
                          border: '1.5px solid #000000', 
                          padding: '5px 8px', 
                          textAlign: 'right', 
                          fontWeight: 900,
                          fontSize: '14px'
                        }}
                      >
                        {formatSheetValue(catTotalVal, catName)}
                      </td>
                    </tr>

                    {/* Spacing empty row between categories */}
                    {catIdx < activeCats.length - 1 && (
                      <tr style={{ height: '18px', pageBreakInside: 'avoid' }}>
                        <td style={{ border: '1.5px solid #000000', padding: '5px 8px' }}></td>
                        <td style={{ border: '1.5px solid #000000', padding: '5px 8px' }}></td>
                        <td style={{ border: '1.5px solid #000000', padding: '5px 8px' }}></td>
                        <td style={{ border: '1.5px solid #000000', padding: '5px 8px' }}></td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              });
            })()}

            {/* Bottom Grand Total Row: সর্বমোট স্টক */}
            <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
              <td 
                colSpan={3} 
                style={{ 
                  border: '1.5px solid #000000', 
                  padding: '7px 8px', 
                  textAlign: 'center', 
                  fontSize: '15px', 
                  fontWeight: 900 
                }}
              >
                সর্বমোট স্টক
              </td>
              <td 
                style={{ 
                  border: '1.5px solid #000000', 
                  padding: '7px 8px', 
                  textAlign: 'right', 
                  fontSize: '15px', 
                  fontWeight: 900 
                }}
              >
                {formatGrandTotal(totalStockValue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
