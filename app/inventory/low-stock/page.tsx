'use client';

import { Shell } from '@/components/Shell';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, ProductData } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { cn, toBnNum } from '@/lib/utils';
import Link from 'next/link';

interface Product { id: string; name: string; category: string; stock: number; unit: string; alertThreshold: number; sellPrice: number; }

export default function LowStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.inventory.getLowStock().then(data => {
      setProducts(data.map(p => ({
        id: String(p.id),
        name: p.name,
        category: p.category_name || 'অন্যান্য',
        stock: Number(p.stock || 0),
        unit: p.unit || 'পিস',
        alertThreshold: Number(p.min_stock || 10),
        sellPrice: Number(p.sell_price || 0)
      })));
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-bengali flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-500" />কম স্টক সতর্কতা
          </h2>
          <p className="text-slate-500 font-bengali mt-1">যে পণ্যগুলো শেষ হয়ে যাচ্ছে</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 font-bengali text-lg">লোড হচ্ছে...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-slate-700 font-bengali text-xl font-bold">সব পণ্যের স্টক ঠিক আছে!</p>
            <p className="text-slate-400 font-bengali mt-2">কোনো সতর্কতা নেই</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map(p => (
              <div key={p.id} className="bg-white border-2 border-rose-200 rounded-xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xl font-black text-slate-900 font-bengali">{p.name}</p>
                  <span className={cn("text-xs font-bold uppercase px-2 py-0.5 rounded font-bengali", p.category === 'রড' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700')}>
                    {p.category}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-rose-600 font-bengali">{toBnNum(p.stock)}</p>
                  <p className="text-xs text-slate-500 font-bengali">একক: {p.unit}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
