'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import { 
  Package, Printer, Search, RefreshCw, ArrowLeft, Calendar, 
  Layers, Filter, ArrowUpRight, TrendingUp, AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn, formatDualStock, toBnNum, formatBnCurrency } from '@/lib/utils';
import { toBengaliDigits } from '@/lib/bengaliUtils';
import { printElement } from '@/lib/printUtils';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import Link from 'next/link';
import { toast } from 'sonner';
import { DEVELOPER_LOGO_BASE64 } from '@/lib/developerLogo';

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
}

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

export default function StockSheetReportPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('সব');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.inventory.list();
      const safeData = Array.isArray(data) ? data : [];
      setProducts(safeData.map(p => ({
        id: String(p.id),
        name: p.name,
        category: p.category_name || 'অন্যান্য',
        brand: p.brand || '',
        buyPrice: Number(p.purchase_price || 0),
        sellPrice: Number(p.sell_price || 0),
        stock: Number(p.stock || 0),
        unit: p.unit || 'পিস',
        alertThreshold: Number(p.min_stock || 10),
      })));
    } catch (err) {
      console.error('Error loading inventory for stock sheet:', err);
      toast.error('স্টক তালিকা লোড করতে সমস্যা হয়েছে');
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

  const totalStockValue = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.buyPrice * p.stock), 0);
  }, [products]);

  const categories = useMemo(() => {
    const known = ['রড', 'সিমেন্ট', 'রিং', 'অন্যান্য'];
    const dynamic = Array.from(new Set(products.map(p => p.category || 'অন্যান্য')));
    return ['সব', ...known.filter(k => dynamic.includes(k)), ...dynamic.filter(d => !known.includes(d))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = activeCategory === 'সব' || p.category === activeCategory;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.brand.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, search]);

  const printCategories = useMemo(() => {
    const knownOrder = ['রড', 'সিমেন্ট', 'রিং', 'অন্যান্য'];
    const allCategories = Array.from(new Set(products.map(p => p.category || 'অন্যান্য')));
    const sortedCats = [
      ...knownOrder.filter(c => allCategories.includes(c)),
      ...allCategories.filter(c => !knownOrder.includes(c))
    ];
    return sortedCats.filter(c => products.some(p => p.category === c));
  }, [products]);

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="rounded-xl font-bengali text-slate-600 hover:text-slate-900 gap-1.5 border border-slate-200">
                <ArrowLeft className="w-4 h-4" />
                রিপোর্ট হাব
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-bengali flex items-center gap-2">
                <Package className="w-6 h-6 text-orange-600" />
                স্টক শিট রিপোর্ট
              </h2>
              <p className="text-slate-500 font-bengali text-xs">
                রড, সিমেন্ট ও অন্যান্য পণ্যের মজুদের প্রিন্ট-উপযোগী দৈনিক স্টেটমেন্ট
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => fetchProducts()}
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 text-slate-700 font-bengali text-xs gap-1.5"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              রিফ্রেশ
            </Button>
            <Button
              onClick={() => printElement('stock-sheet-printable-wrapper')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bengali font-bold text-xs gap-2 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all py-2.5 px-4"
            >
              <Printer className="w-4 h-4" />
              প্রিন্ট করুন (Print Sheet)
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-bengali">
          <Card className="border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">মোট পণ্য সংখ্যা</p>
              <p className="text-xl font-black text-slate-800 mt-1">{toBnNum(products.length)} টি আইটেম</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">মোট ক্যাটাগরি</p>
              <p className="text-xl font-black text-blue-600 mt-1">{toBnNum(printCategories.length)} টি বিভাগ</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">রিপোর্ট তারিখ</p>
              <p className="text-lg font-black text-emerald-600 mt-1">{formatBnDate(selectedDate, 'dd MMMM - yyyy')}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">সর্বমোট মজুদ মূল্য</p>
              <p className="text-xl font-black text-orange-600 mt-1">{formatBnCurrency(totalStockValue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Stock Preview Card */}
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60 font-bengali">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="পণ্য বা ব্র্যান্ড খুঁজুন..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="pl-9 bg-white border-slate-200 text-xs rounded-xl" 
              />
            </div>
            <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                    activeCategory === cat 
                      ? 'bg-orange-600 text-white shadow-xs' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bengali text-slate-500 text-[11px] font-bold py-3">পণ্যের নাম</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] font-bold">বিভাগ</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] font-bold text-right">ক্রয় দর (রেট)</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] font-bold text-center">বর্তমান স্টক</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] font-bold text-right">মোট মূল্য</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-16 text-slate-400 font-bengali">লোড হচ্ছে...</TableCell></TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-16 text-slate-400 font-bengali">কোনো পণ্য পাওয়া যায়নি</TableCell></TableRow>
                ) : filteredProducts.map((p) => {
                  const itemValue = p.buyPrice * p.stock;
                  return (
                    <TableRow key={p.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors font-bengali">
                      <TableCell className="p-3 font-bold text-slate-900 text-sm">
                        {p.name}
                        {p.brand && <span className="text-xs text-slate-400 block font-normal">{p.brand}</span>}
                      </TableCell>
                      <TableCell>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", 
                          p.category === 'রড' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                          p.category === 'সিমেন্ট' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
                          p.category === 'রিং' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 
                          'bg-slate-100 text-slate-600'
                        )}>
                          {p.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-700 text-sm">
                        {p.buyPrice > 0 ? formatBnCurrency(p.buyPrice) : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {(() => {
                          const stockInfo = formatDualStock(p.stock, p.unit, p.category);
                          return (
                            <div className="flex flex-col items-center">
                              <span className={cn("font-black text-sm", p.stock <= p.alertThreshold ? 'text-rose-600' : 'text-slate-800')}>
                                {stockInfo.main}
                              </span>
                              {stockInfo.sub && <span className="text-[10px] text-slate-500 font-semibold">{stockInfo.sub}</span>}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-900 text-sm">
                        {itemValue > 0 ? formatBnCurrency(itemValue) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Live Sheet View Container (styled identical to print) */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-800 font-bengali flex items-center gap-2">
              <Printer className="w-4 h-4 text-emerald-600" />
              প্রিন্ট প্রিভিউ শিট (A4 Print Preview)
            </h3>
            <Button
              onClick={() => printElement('stock-sheet-printable-wrapper')}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bengali text-xs font-bold rounded-lg shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              প্রিন্ট করুন
            </Button>
          </div>

          <div className="bg-slate-100 p-4 sm:p-8 rounded-2xl border border-slate-200 flex justify-center">
            {/* Printed Sheet Preview */}
            <div 
              className="bg-white text-black p-6 shadow-md rounded border border-black/20 w-full max-w-[750px] font-bengali text-[13px] leading-tight"
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
                        padding: '8px 4px', 
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
                      {formatBnDate(selectedDate, 'dd MMMM - yyyy')}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {printCategories.map((catName, catIdx) => {
                    const catProducts = products.filter(p => p.category === catName);
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
                        {catIdx < printCategories.length - 1 && (
                          <tr style={{ height: '18px', pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px' }}></td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px' }}></td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px' }}></td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px' }}></td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

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
          </div>
        </div>

      </div>

      {/* Hidden container for printElement targeting */}
      <div 
        id="stock-sheet-printable-wrapper" 
        className="hidden print:block font-bengali text-black text-[13px] leading-tight p-2"
        style={{ color: '#000000', backgroundColor: '#ffffff', width: '100%', maxWidth: '750px', margin: '0 auto', minHeight: '275mm', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
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
                {formatBnDate(selectedDate, 'dd MMMM - yyyy')}
              </th>
            </tr>
          </thead>

          <tbody>
            {printCategories.map((catName, catIdx) => {
              const catProducts = products.filter(p => p.category === catName);
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
                  {catIdx < printCategories.length - 1 && (
                    <tr style={{ height: '18px', pageBreakInside: 'avoid' }}>
                      <td style={{ border: '1.5px solid #000000', padding: '5px 8px' }}></td>
                      <td style={{ border: '1.5px solid #000000', padding: '5px 8px' }}></td>
                      <td style={{ border: '1.5px solid #000000', padding: '5px 8px' }}></td>
                      <td style={{ border: '1.5px solid #000000', padding: '5px 8px' }}></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

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
            <img src={DEVELOPER_LOGO_BASE64} alt="" style={{ height: '14px', width: '14px', objectFit: 'contain', opacity: 0.65, filter: 'grayscale(100%)', borderRadius: '2px' }} />
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
    </Shell>
  );
}
