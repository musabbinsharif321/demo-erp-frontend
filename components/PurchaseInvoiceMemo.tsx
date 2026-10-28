'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Printer, User, Truck, ClipboardList, CreditCard, 
  FileText, Edit3, CheckCircle2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toBengaliDigits, numberToBengaliWords, parseProductDetails } from '@/lib/bengaliUtils';
import { printElement } from '@/lib/printUtils';

export interface PurchaseItem {
  id?: string;
  name: string;
  brand?: string;
  variant?: string;
  quantity: number;
  price: number;
  unit?: string;
  discount?: number;
  bundle?: number;
}

export interface PurchaseInvoiceMemoProps {
  invoice: {
    id: string;
    purchaseId?: string;
    supplierName?: string;
    contactPerson?: string;
    supplierPhone?: string;
    supplierAddress?: string;
    businessName?: string;
    supplierId?: string;
    items?: PurchaseItem[];
    subtotal?: number;
    discount?: number;
    shippingCost?: number;
    transportCost?: number;
    laborCost?: number;
    totalAmount?: number;
    paidAmount?: number;
    dueAmount?: number;
    previousSupplierDue?: number;
    paymentStatus?: string;
    paymentMethod?: string;
    createdAt?: any;
    vehicleNo?: string;
    driverName?: string;
    driverPhone?: string;
    deliveryAddress?: string;
    unloadingSite?: string;
    deliveryFrom?: string;
    deliveryTo?: string;
    preparedBy?: string;
    operatorName?: string;
    authorizedBy?: string;
    receivedBy?: string;
    warehouse?: string;
    targetWarehouse?: string;
    note?: string;
    notes?: string;
  };
  shopInfo?: {
    name?: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    terms?: string;
    proprietor?: string;
    website?: string;
  };
  type?: 'purchase' | 'voucher';
  showPrintButton?: boolean;
}

export const PurchaseInvoiceMemo: React.FC<PurchaseInvoiceMemoProps> = ({
  invoice,
  shopInfo: propShopInfo,
  type = 'purchase',
  showPrintButton = true
}) => {
  const handleTriggerPrint = () => {
    printElement('printable-memo-wrapper');
  };

  const [shop] = useState(() => {
    const defaultShop = {
      name: 'মেসার্স দেলোয়ার এন্ড ব্রাদার্স',
      proprietor: 'প্রোঃ- মোঃ মিকাইল শেখ',
      tagline: 'রড, সিমেন্ট ও বিল্ডিং সামগ্রী পাইকারী ও খুচরা সরবরাহ কেন্দ্র',
      address: '৩১০, চৌধুরী নিউ সুপার মার্কেট, বঙ্গবন্ধু সড়ক, গোপালগঞ্জ',
      phone: '০১৭১২-০১৪২২৫, ০১৭০১-২৯৫৩৩০',
      email: 'delowarteraders@gmail.com',
      website: 'www.delowartraders.com',
      software: 'Hasanah Tech Solution',
      softwareCompany: 'Hasanah Tech Solution',
      softwarePhone: '01349345353',
      softwareWebsite: 'www.hasanahtech.vercel.app'
    };

    let customPromo: any = {};
    if (typeof window !== 'undefined') {
      try {
        const promoSaved = localStorage.getItem('softwarePromoInfo');
        if (promoSaved) customPromo = JSON.parse(promoSaved);
      } catch (e) {}
    }

    if (propShopInfo) {
      return { ...defaultShop, ...propShopInfo, ...customPromo };
    }

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('shopInfo');
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            name: parsed.name || defaultShop.name,
            proprietor: parsed.proprietor || defaultShop.proprietor,
            tagline: parsed.tagline || defaultShop.tagline,
            address: parsed.address || defaultShop.address,
            phone: parsed.phone || defaultShop.phone,
            email: parsed.email || defaultShop.email,
            website: parsed.website || defaultShop.website,
            software: parsed.software || defaultShop.software,
            softwareCompany: customPromo.softwareCompany || parsed.softwareCompany || defaultShop.softwareCompany,
            softwarePhone: customPromo.softwarePhone || parsed.softwarePhone || defaultShop.softwarePhone,
            softwareWebsite: customPromo.softwareWebsite || parsed.softwareWebsite || defaultShop.softwareWebsite
          };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return { ...defaultShop, ...customPromo };
  });

  // Format Date & Time
  const rawDate = invoice?.createdAt;
  const d = rawDate?.toDate ? rawDate.toDate() : (rawDate ? new Date(rawDate) : new Date());
  let dateStr = '';
  try {
    dateStr = toBengaliDigits(format(d, 'dd/MM/yyyy'));
  } catch {
    dateStr = toBengaliDigits(format(new Date(), 'dd/MM/yyyy'));
  }

  // Parse meta notes if stored as JSON
  let meta: any = {};
  let cleanUserNote = invoice?.note || (invoice as any)?.notes || '';
  if (cleanUserNote && typeof cleanUserNote === 'string' && cleanUserNote.trim().startsWith('{')) {
    try {
      const firstLine = cleanUserNote.split('\n')[0];
      meta = JSON.parse(firstLine);
      cleanUserNote = meta.userNote !== undefined ? meta.userNote : cleanUserNote.substring(firstLine.length).trim();
    } catch {
      // not json
    }
  }

  const effectiveVehicleNo = invoice.vehicleNo || meta.vehicleNo || '';
  const effectiveDriverName = invoice.driverName || meta.driverName || '';
  const effectiveDriverPhone = invoice.driverPhone || meta.driverPhone || '';
  const effectiveDeliveryAddress = invoice.deliveryAddress || invoice.unloadingSite || meta.deliveryAddress || meta.unloadingSite || invoice.supplierAddress || '';
  const effectivePreparedBy = invoice.preparedBy || invoice.operatorName || meta.preparedBy || meta.operatorName || 'ক্যাশিয়ার';
  const effectiveAuthorizedBy = invoice.authorizedBy || meta.authorizedBy || 'হিসাব রক্ষক';
  const effectiveReceivedBy = invoice.receivedBy || meta.receivedBy || 'ব্যবস্থাপক';
  const effectiveWarehouse = invoice.warehouse || invoice.targetWarehouse || meta.warehouse || meta.targetWarehouse || 'প্রধান গুদাম';
  
  const effectivePreviousSupplierDue = Number(
    invoice.previousSupplierDue !== undefined ? invoice.previousSupplierDue :
    (invoice as any).previousBalance !== undefined ? (invoice as any).previousBalance :
    (invoice as any).previous_due !== undefined ? (invoice as any).previous_due :
    (invoice as any).supplier_due !== undefined ? (invoice as any).supplier_due :
    (invoice as any).supplier?.due !== undefined ? (invoice as any).supplier?.due :
    meta.previousSupplierDue !== undefined ? meta.previousSupplierDue :
    meta.previousDue !== undefined ? meta.previousDue :
    0
  );

  const effectivePaymentMethodName = meta.paymentMethodName || invoice.paymentMethod || 'Cash';
  const pmLower = effectivePaymentMethodName.toLowerCase();
  const isBankToBank = pmLower.includes('banktobank') || pmLower.includes('ব্যাংক-টু-ব্যাংক');
  const isBank = pmLower.includes('bank') || pmLower.includes('ব্যাংক');
  const isCheque = pmLower.includes('cheque') || pmLower.includes('check') || pmLower.includes('চেক');
  const isSplit = pmLower.includes('split') || pmLower.includes('স্প্লিট');

  const shopBank = (invoice as any).receiverShopBank || (invoice as any).selectedShopBank || meta.selectedShopBank || meta.receiverShopBank || '';
  const supplierBank = (invoice as any).supplierBankName || meta.supplierBankName || (invoice as any).bankName || meta.bankName || '';
  const supplierAcc = (invoice as any).supplierAccountNo || meta.supplierAccountNo || (invoice as any).accountNo || meta.accountNo || '';
  const txnRef = (invoice as any).supplierTxnRef || meta.supplierTxnRef || (invoice as any).transactionRef || meta.transactionRef || meta.txnRef || '';
  const chqNo = (invoice as any).chequeNo || meta.chequeNo || '';
  const chqDate = (invoice as any).chequeDate || meta.chequeDate || '';
  const cashPaid = Number((invoice as any).cashPaidAmount || meta.cashPaidAmount || 0);
  const chequePaid = Number((invoice as any).chequePaidAmount || meta.chequePaidAmount || 0);

  const items = (invoice.items && invoice.items.length > 0) ? invoice.items : [];
  const effectiveShippingCost = Number(invoice.transportCost || invoice.shippingCost || meta.shippingCost || meta.transportCost || 0);
  const effectiveLaborCost = Number(invoice.laborCost || meta.laborCost || 0);
  const shippingPayer = (invoice as any).shippingPayer || meta.shippingPayer || 'shop';
  const laborPayer = (invoice as any).laborPayer || meta.laborPayer || 'shop';

  const totalExtra = effectiveShippingCost + effectiveLaborCost;
  const totalQtySum = items.reduce((a, i) => a + Number(i.quantity || 0), 0);
  const extraPerUnit = totalQtySum > 0 ? (totalExtra / totalQtySum) : 0;

  const storedItemsSum = items.reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.quantity || 0)), 0);
  const invoiceTotalInRecord = Number(invoice.totalAmount || 0);

  let isStoredAsLandedCost = false;
  if (totalExtra > 0 && storedItemsSum > 0 && invoiceTotalInRecord > 0) {
    if (Math.abs(storedItemsSum - invoiceTotalInRecord) <= 1.0 || (storedItemsSum + totalExtra - invoiceTotalInRecord) > 1.0) {
      isStoredAsLandedCost = true;
    }
  }

  const subtotal = isStoredAsLandedCost 
    ? Math.max(0, storedItemsSum - totalExtra)
    : (invoice.subtotal ? Number(invoice.subtotal) : storedItemsSum);

  const commission = Number((invoice as any).commission !== undefined ? (invoice as any).commission : (meta.commission !== undefined ? meta.commission : (meta.commissionAmount || 0)));
  const commissionRate = Number((invoice as any).commissionRate !== undefined ? (invoice as any).commissionRate : (meta.commissionRate || 0));
  const commissionAdjustment = (invoice as any).commissionAdjustment || meta.commissionAdjustment || 'pending';
  const commissionDeduction = commissionAdjustment === 'deduct' ? commission : 0;

  const totalAmount = Math.max(0, subtotal - commissionDeduction + effectiveShippingCost + effectiveLaborCost);
  const paidAmount = Number(invoice.paidAmount !== undefined ? invoice.paidAmount : 0);
  const dueAmount = Number(invoice.dueAmount !== undefined ? invoice.dueAmount : Math.max(0, totalAmount - paidAmount));
  const grandTotalPayable = totalAmount + effectivePreviousSupplierDue;
  const finalGrandDue = Math.max(0, grandTotalPayable - paidAmount);

  // Memo number format
  const memoNo = invoice.id 
    ? (invoice.id.startsWith('INV') || invoice.id.startsWith('PUR') ? invoice.id : `PUR-${invoice.id.slice(-6).toUpperCase()}`)
    : 'PUR-000101';

  const isPaid = dueAmount <= 0;
  const isPartial = paidAmount > 0 && dueAmount > 0;
  const paymentStatusText = isPaid ? 'পরিশোধিত' : isPartial ? 'আংশিক পরিশোধিত' : 'বকেয়া আছে';

  return (
    <div className="w-full font-bengali">
      {/* Top bar preview button */}
      {showPrintButton && (
        <div className="flex items-center justify-between bg-slate-900 text-white p-3.5 px-6 rounded-t-2xl print:hidden shadow-md">
          <div className="flex items-center gap-2 text-xs font-bold">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>ক্রয় ইনভয়েস মেমো প্রিভিউ (A4 Print Format)</span>
          </div>
          <button
            type="button"
            onClick={handleTriggerPrint}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-5 py-2 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer border border-blue-500"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>ইনভয়েস প্রিন্ট করুন</span>
          </button>
        </div>
      )}

      {/* --- EXACT REPLICA PURCHASE INVOICE SHEET --- */}
      <div 
        id="printable-memo-wrapper" 
        className={cn(
          "w-full max-w-[850px] mx-auto bg-white text-slate-900 p-6 space-y-3 font-bengali print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:rounded-none min-h-[275mm] flex flex-col justify-between",
          !showPrintButton && "rounded-2xl"
        )}
      >
        {/* --- 1. HEADER (LOGO, SHOP DETAILS & INVOICE META BOX) --- */}
        <div className="grid grid-cols-12 gap-2 items-center border-b pb-3 border-slate-300">
          
          {/* Shop Logo & Address */}
          <div className="col-span-5 flex items-start gap-3">
            {/* Building Icon Logo */}
            <div className="shrink-0 pt-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/logo.png" 
                alt="মেসার্স দেলোয়ার এন্ড ব্রাদার্স" 
                className="w-12 h-12 object-contain rounded-md border border-slate-200 bg-white p-0.5 shadow-2xs" 
              />
            </div>

            <div className="space-y-0.5 text-xs text-slate-700 font-medium">
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                {shop.name}
              </h1>
              <p className="text-[11px] font-bold text-blue-700">
                {shop.tagline}
              </p>
              <p className="pt-0.5 text-[11px] leading-tight">
                📍 {shop.address}
              </p>
              <p className="text-[11px]">
                📞 {toBengaliDigits(shop.phone)}
              </p>
              {shop.email && (
                <p className="text-[11px] text-slate-600 font-mono">
                  ✉️ {shop.email}
                </p>
              )}
            </div>
          </div>

          {/* Center Document Title */}
          <div className="col-span-3 text-center">
            <h2 className="text-3xl font-black text-slate-900 tracking-wide font-bengali">
              ক্রয় চালান
            </h2>
            <p className="text-xs font-black text-blue-700 tracking-wider font-bengali mt-0.5">
              (ক্রয় ইনভয়েস ও মেমো)
            </p>
          </div>

          {/* Right Header Box */}
          <div className="col-span-4 text-right">
            <div className="border border-slate-400 rounded-lg p-2.5 bg-white text-xs font-bold text-slate-800 space-y-1 inline-block text-left w-full max-w-[240px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-700">চালান নম্বর</span>
                <span>: <span className="font-mono font-black">{toBengaliDigits(memoNo)}</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">চালানের তারিখ</span>
                <span>: <span className="font-mono">{dateStr}</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">চালানের ধরন</span>
                <span>: <span className="font-bold text-blue-700">ক্রয় ইনভয়েস</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">পেমেন্ট স্ট্যাটাস</span>
                <span>: <span className={cn("font-bold", isPaid ? "text-emerald-700" : isPartial ? "text-amber-700" : "text-rose-700")}>{paymentStatusText}</span></span>
              </div>
              {invoice.purchaseId && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">ক্রয় রেফারেন্স নং</span>
                  <span>: <span className="font-mono font-bold text-slate-900">{toBengaliDigits(invoice.purchaseId)}</span></span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* --- 2. SUPPLIER DETAILS & DELIVERY DETAILS (SIDE BY SIDE CARDS) --- */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          
          {/* Supplier / Vendor Details Box */}
          <div className="border border-slate-300 rounded-lg p-2.5 bg-white space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 pb-1 border-b border-slate-200">
              <User className="w-3.5 h-3.5 text-blue-700" />
              <span>সরবরাহকারী ও কোম্পানি তথ্য</span>
            </div>
            
            <div className="space-y-1 font-medium text-slate-800">
              <div className="flex">
                <span className="w-28 shrink-0 font-bold text-slate-900">সরবরাহকারীর নাম</span>
                <span className="shrink-0 px-1">:</span>
                <span className="font-bold text-slate-900">{invoice.supplierName || 'সাধারণ সরবরাহকারী'}</span>
              </div>
              {invoice.businessName && (
                <div className="flex">
                  <span className="w-28 shrink-0 text-slate-700">কোম্পানির নাম</span>
                  <span className="shrink-0 px-1">:</span>
                  <span className="font-bold text-blue-700">{invoice.businessName}</span>
                </div>
              )}
              {invoice.contactPerson && (
                <div className="flex">
                  <span className="w-28 shrink-0 text-slate-700">প্রতিনিধি / কন্টাক্ট</span>
                  <span className="shrink-0 px-1">:</span>
                  <span>{invoice.contactPerson}</span>
                </div>
              )}
              <div className="flex">
                <span className="w-28 shrink-0 text-slate-700">মোবাইল নম্বর</span>
                <span className="shrink-0 px-1">:</span>
                <span className="font-mono">{invoice.supplierPhone ? toBengaliDigits(invoice.supplierPhone) : '—'}</span>
              </div>
              <div className="flex">
                <span className="w-28 shrink-0 text-slate-700">ঠিকানা</span>
                <span className="shrink-0 px-1">:</span>
                <span className="leading-tight">{invoice.supplierAddress || '—'}</span>
              </div>
              <div className="flex pt-1 border-t border-slate-100">
                <span className="w-28 shrink-0 font-bold text-slate-900">পূর্বের পাওনা</span>
                <span className="shrink-0 px-1">:</span>
                <span className="font-mono font-bold text-slate-900">৳ {toBengaliDigits(effectivePreviousSupplierDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>
            </div>
          </div>

          {/* Delivery / Transport Details Box */}
          <div className="border border-slate-300 rounded-lg p-2.5 bg-white space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 pb-1 border-b border-slate-200">
              <Truck className="w-3.5 h-3.5 text-blue-700" />
              <span>পরিবহন ও চালানের তথ্য</span>
            </div>
            
            <div className="space-y-1 font-medium text-slate-800">
              <div className="flex">
                <span className="w-32 shrink-0 font-bold text-slate-900">গাড়ি / ট্রাক নম্বর</span>
                <span className="shrink-0 px-1">:</span>
                <span className="font-bold text-slate-900">{effectiveVehicleNo ? toBengaliDigits(effectiveVehicleNo) : '—'}</span>
              </div>
              <div className="flex">
                <span className="w-32 shrink-0 text-slate-700">ড্রাইভারের নাম</span>
                <span className="shrink-0 px-1">:</span>
                <span>{effectiveDriverName || '—'}</span>
              </div>
              <div className="flex">
                <span className="w-32 shrink-0 text-slate-700">ড্রাইভার মোবাইল</span>
                <span className="shrink-0 px-1">:</span>
                <span className="font-mono">{effectiveDriverPhone ? toBengaliDigits(effectiveDriverPhone) : '—'}</span>
              </div>
              <div className="flex">
                <span className="w-32 shrink-0 text-slate-700">গন্তব্য গোডাউন</span>
                <span className="shrink-0 px-1">:</span>
                <span>{effectiveWarehouse}</span>
              </div>
              <div className="flex">
                <span className="w-32 shrink-0 text-slate-700">রিসিভ করার তারিখ</span>
                <span className="shrink-0 px-1">:</span>
                <span className="font-mono">{dateStr}</span>
              </div>
            </div>
          </div>

        </div>

        {/* --- 3. ITEM DETAILS TABLE --- */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 py-1">
            <ClipboardList className="w-3.5 h-3.5 text-blue-700" />
            <span>ক্রয়কৃত পণ্যের বিবরণী</span>
          </div>

          <table className="w-full text-xs border-collapse border border-slate-400">
            <thead>
              <tr className="bg-slate-100 font-bold border border-slate-400 text-slate-900 text-center">
                <th className="border border-slate-400 py-1.5 px-1 w-[5%]">ক্রমিক</th>
                <th className="border border-slate-400 py-1.5 px-2 text-left w-[32%] font-bengali">পণ্যের নাম ও বিবরণ</th>
                <th className="border border-slate-400 py-1.5 px-2 w-[14%]">ব্র্যান্ড</th>
                <th className="border border-slate-400 py-1.5 px-2 w-[15%]">গ্রেড/সাইজ</th>
                <th className="border border-slate-400 py-1.5 px-2 w-[12%] font-bengali">পরিমাণ</th>
                <th className="border border-slate-400 py-1.5 px-2 w-[8%] font-bengali">একক</th>
                <th className="border border-slate-400 py-1.5 px-2 text-right w-[10%] font-bengali">একক ক্রয় দর (৳)</th>
                <th className="border border-slate-400 py-1.5 px-2 text-right w-[12%] font-bengali">মোট ক্রয় মূল্য (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400 font-bold">
                    কোনো পণ্য রেকর্ড করা হয়নি
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const storedPrice = Number(item.price || 0);
                  const itemQty = Number(item.quantity || 0);

                  const baseUnitPrice = isStoredAsLandedCost 
                    ? Math.max(0, storedPrice - extraPerUnit) 
                    : storedPrice;

                  const landedUnitPrice = isStoredAsLandedCost 
                    ? storedPrice 
                    : baseUnitPrice + extraPerUnit;

                  const baseItemTotal = baseUnitPrice * itemQty;
                  const landedItemTotal = landedUnitPrice * itemQty;

                  return (
                    <tr key={idx} className="text-slate-900 font-medium">
                      <td className="border border-slate-300 py-1.5 px-1 text-center font-mono">{toBengaliDigits(idx + 1)}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-left font-bold">
                        {item.name}
                        {item.bundle && <span className="text-[10px] text-slate-500 block">({toBengaliDigits(item.bundle)} বান্ডিল)</span>}
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center">{item.brand || '—'}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center font-bold">
                        {(() => {
                          const v = item.variant || parseProductDetails(item).sizeName;
                          if (v === 'OPC') return <span className="text-blue-700 font-extrabold">OPC</span>;
                          if (v === 'PCC') return <span className="text-emerald-700 font-extrabold">PCC</span>;
                          return v || '—';
                        })()}
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center font-mono font-bold">{toBengaliDigits(itemQty.toLocaleString('en-IN'))}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center">{item.unit || 'পিস'}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-right font-mono">
                        <div className="font-bold">৳ {toBengaliDigits(baseUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</div>
                        {extraPerUnit > 0 && (
                          <div className="text-[9px] text-blue-700 font-extrabold" title="লেবার ও শিপিং ভাড়া সহ কার্যকর একক দর">
                            (খরচসহ ৳ {toBengaliDigits(landedUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }))})
                          </div>
                        )}
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2 text-right font-mono font-bold">
                        <div className="font-bold">৳ {toBengaliDigits(baseItemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</div>
                        {extraPerUnit > 0 && (
                          <div className="text-[9px] text-blue-700 font-extrabold" title="লেবার ও শিপিং ভাড়া সহ কার্যকর মোট বিল">
                            (খরচসহ ৳ {toBengaliDigits(landedItemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }))})
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* --- 4. WORDS, PAYMENT INFO, REMARKS & CALCULATIONS TABLE --- */}
        <div className="grid grid-cols-12 gap-3 items-start text-xs pt-1">
          
          {/* Left Column (Words + Payment Info + Remarks) */}
          <div className="col-span-7 space-y-2">
            
            {/* Amount in words */}
            <div className="font-bold text-xs text-slate-800 font-bengali">
              মোট (কথায়): <span className="font-black">{numberToBengaliWords(totalAmount)} টাকা মাত্র।</span>
            </div>

            {/* Payment Information Box */}
            <div className="border border-slate-300 rounded-lg p-2.5 bg-white space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 pb-1 border-b border-slate-200">
                <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                <span>পেমেন্ট বিবরণী</span>
              </div>
              <div className="space-y-0.5 font-medium text-slate-800 pt-0.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">পেমেন্ট মাধ্যম</span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {isBankToBank ? '🔄 ব্যাংক-টু-ব্যাংক ট্রান্সফার' :
                     isBank ? '🏦 ব্যাংক ট্রান্সফার' :
                     isCheque ? '📄 চেক' :
                     isSplit ? '💵+📄 স্প্লিট পেমেন্ট (ক্যাশ ও চেক)' :
                     '💵 নগদ'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-700">আজকের পরিশোধিত জমা</span>
                  <span className="font-mono font-bold text-emerald-600">৳ {toBengaliDigits(paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                </div>

                {isSplit && (
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-200 my-1 space-y-0.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">• নগদ জমা</span>
                      <span className="font-mono font-bold text-emerald-700">৳ {toBengaliDigits(cashPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">• চেক জমা</span>
                      <span className="font-mono font-bold text-blue-700">৳ {toBengaliDigits(chequePaid.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                    </div>
                  </div>
                )}

                {(isBank || isBankToBank) && (
                  <div className="p-1.5 bg-blue-50/70 border border-blue-200 rounded my-1 space-y-0.5 text-blue-950">
                    {shopBank && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">• প্রেরক শপ ব্যাংক</span>
                        <span className="font-bold font-mono">{shopBank}</span>
                      </div>
                    )}
                    {supplierBank && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">• গ্রহীতা ব্যাংক (সাপ্লায়ার)</span>
                        <span className="font-bold font-mono">{supplierBank}</span>
                      </div>
                    )}
                    {supplierAcc && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">• অ্যাকাউন্ট নং</span>
                        <span className="font-mono font-bold">{toBengaliDigits(supplierAcc)}</span>
                      </div>
                    )}
                    {txnRef && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">• লেনদেন রেফারেন্স আইডি</span>
                        <span className="font-mono font-bold">{toBengaliDigits(txnRef)}</span>
                      </div>
                    )}
                  </div>
                )}

                {(isCheque || isSplit) && (chqNo || chqDate) && (
                  <div className="p-1.5 bg-slate-50 border border-slate-200 rounded my-1 space-y-0.5">
                    {chqNo && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">• চেক নম্বর</span>
                        <span className="font-mono font-bold">{toBengaliDigits(chqNo)}</span>
                      </div>
                    )}
                    {chqDate && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">• চেকের তারিখ</span>
                        <span className="font-mono font-bold">{toBengaliDigits(chqDate)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-start pt-1">
                  <span className="w-28 shrink-0 text-slate-700">নোট / বিবরণ</span>
                  <span className="shrink-0 px-1">:</span>
                  <span className="font-bengali text-slate-800 leading-tight">
                    {cleanUserNote || (isPaid ? 'চালানটি সম্পূর্ণ পরিশোধিত।' : `বাকি ৳ ${toBengaliDigits(finalGrandDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }))} পরে পরিশোধযোগ্য।`)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes / Remarks Box */}
            <div className="border border-slate-300 rounded-lg p-2.5 bg-white space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 pb-1 border-b border-slate-200">
                <Edit3 className="w-3.5 h-3.5 text-blue-700" />
                <span>বিশেষ দ্রষ্টব্য / নোট</span>
              </div>
              <p className="font-bengali text-slate-800 text-[11px] pt-0.5">
                • পণ্যসমূহ সঠিক গুণগত মান ও সংখ্যা যাচাইপূর্বক গুদামে রিসিভ করা হয়েছে।
              </p>
            </div>

          </div>

          {/* Right Column (Calculations Grid Table) */}
          <div className="col-span-5">
            <div className="border border-slate-400 font-bold text-xs divide-y divide-slate-300 bg-white">
              
              <div className="flex justify-between items-center p-1.5 px-2">
                <span className="text-slate-800 font-medium">পণ্যের মোট ক্রয় মূল্য</span>
                <span className="font-mono">৳ {toBengaliDigits(subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>

              {effectiveShippingCost > 0 && (
                <div className="flex justify-between items-center p-1.5 px-2">
                  <span className="text-slate-800 font-medium flex items-center gap-1.5">
                    <span>+ পরিবহন ভাড়া / গাড়ি ভাড়া</span>
                    <span className="text-[10px] px-1 py-0.2 rounded border text-slate-600 bg-slate-100">
                      {shippingPayer === 'supplier' ? 'সাপ্লায়ার দিবে (লেজারে যুক্ত)' : 'দোকান দিবে'}
                    </span>
                  </span>
                  <span className="font-mono">+ ৳ {toBengaliDigits(effectiveShippingCost.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                </div>
              )}

              {effectiveLaborCost > 0 && (
                <div className="flex justify-between items-center p-1.5 px-2">
                  <span className="text-slate-800 font-medium flex items-center gap-1.5">
                    <span>+ আনলোডিং / লেবার খরচ</span>
                    <span className="text-[10px] px-1 py-0.2 rounded border text-slate-600 bg-slate-100">
                      {laborPayer === 'supplier' ? 'সাপ্লায়ার দিবে (লেজারে যুক্ত)' : 'দোকান দিবে'}
                    </span>
                  </span>
                  <span className="font-mono">+ ৳ {toBengaliDigits(effectiveLaborCost.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                </div>
              )}

              {commission > 0 && (
                <div className="flex justify-between items-center p-1.5 px-2 text-emerald-800 bg-emerald-50/60">
                  <span className="text-slate-800 font-medium">
                    {commissionAdjustment === 'pending' ? 'কোম্পানি কমিশন (পেন্ডিং)' : '- কোম্পানি কমিশন (কর্তন)'}
                  </span>
                  <span className="font-mono font-bold text-emerald-800">
                    {commissionAdjustment === 'pending' ? '' : '- '}৳ {toBengaliDigits(commission.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center p-2 px-2 text-xs bg-slate-100 font-black text-slate-900 border-t border-b border-slate-400">
                <span>চালান মোট ক্রয় বিল</span>
                <span className="font-mono text-sm">৳ {toBengaliDigits(totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>

              <div className="flex justify-between items-center p-1.5 px-2 text-rose-700">
                <span className="text-slate-800 font-medium">+ পূর্বের পাওনা / বকেয়া</span>
                <span className="font-mono font-bold">+ ৳ {toBengaliDigits(effectivePreviousSupplierDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>

              <div className="flex justify-between items-center p-2 px-2 text-xs bg-blue-50 font-black text-blue-950 border-t border-b border-blue-200">
                <span>সর্বমোট প্রদেয় বিল (বকেয়াসহ)</span>
                <span className="font-mono text-sm">৳ {toBengaliDigits(grandTotalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>

              <div className="flex justify-between items-center p-1.5 px-2 text-emerald-600 font-bold">
                <span>- আজকের পরিশোধিত জমা</span>
                <span className="font-mono">- ৳ {toBengaliDigits(paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>

              <div className="flex justify-between items-center p-2 px-2 text-sm text-rose-600 font-black bg-rose-50 border-t border-rose-200">
                <span>সর্বশেষ অবশিষ্ট দেনা</span>
                <span className="font-mono text-base">৳ {toBengaliDigits(finalGrandDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>

            </div>
          </div>

        </div>

        {/* --- 5. SIGNATURES (4 EQUAL COLUMNS) --- */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold pt-3 pb-1 border-t border-slate-300 mt-2 keep-together">
          
          <div>
            <p className="font-bold text-slate-900 font-bengali">প্রস্তুতকারীর স্বাক্ষর</p>
            <p className="text-[10px] text-slate-500 font-bengali font-semibold">(রেকর্ডকারী)</p>
            <div className="w-28 mx-auto border-b border-dashed border-slate-400 my-2" />
            <p className="font-bold text-slate-800 font-bengali">{effectivePreparedBy}</p>
            <p className="text-[10px] text-slate-600 font-mono font-medium mt-0.5">তারিখ: {dateStr}</p>
          </div>

          <div>
            <p className="font-bold text-slate-900 font-bengali">হিসাব রক্ষকের স্বাক্ষর</p>
            <p className="text-[10px] text-slate-500 font-bengali font-semibold">(যাচাইকৃত)</p>
            <div className="w-28 mx-auto border-b border-dashed border-slate-400 my-2" />
            <p className="font-bold text-slate-800 font-bengali">{effectiveAuthorizedBy}</p>
            <p className="text-[10px] text-slate-600 font-mono font-medium mt-0.5">তারিখ: {dateStr}</p>
          </div>

          <div>
            <p className="font-bold text-slate-900 font-bengali">ব্যবস্থাপকের স্বাক্ষর</p>
            <p className="text-[10px] text-slate-500 font-bengali font-semibold">(অনুমোদিত)</p>
            <div className="w-28 mx-auto border-b border-dashed border-slate-400 my-2" />
            <p className="font-bold text-slate-800 font-bengali">{effectiveReceivedBy}</p>
            <p className="text-[10px] text-slate-600 font-mono font-medium mt-0.5">তারিখ: {dateStr}</p>
          </div>

          <div>
            <p className="font-bold text-slate-900 font-bengali">সরবরাহকারীর স্বাক্ষর</p>
            <p className="text-[10px] text-slate-500 font-bengali font-semibold">(গ্রহীতার সই)</p>
            <div className="w-28 mx-auto border-b border-slate-400 my-2" />
            <p className="text-[10px] text-slate-600 font-mono font-medium mt-2">তারিখ: ____________</p>
          </div>

        </div>

        {/* --- 6. FOOTER (QR CODE, SOFTWARE BRANDING & BARCODE) --- */}
        <div data-has-dev-footer="true" className="border-t border-slate-200/90 pt-2.5 flex items-center justify-between text-[10px] text-slate-500 keep-together mt-auto select-none">
          
          {/* Left QR Code & Thank You */}
          <div className="flex items-center gap-2">
            {/* SVG QR Code */}
            <svg className="w-10 h-10 shrink-0 border border-slate-300 p-0.5 rounded" viewBox="0 0 32 32" fill="currentColor">
              <rect x="2" y="2" width="10" height="10" fill="#000" />
              <rect x="4" y="4" width="6" height="6" fill="#fff" />
              <rect x="5" y="5" width="4" height="4" fill="#000" />
              <rect x="20" y="2" width="10" height="10" fill="#000" />
              <rect x="22" y="4" width="6" height="6" fill="#fff" />
              <rect x="23" y="5" width="4" height="4" fill="#000" />
              <rect x="2" y="20" width="10" height="10" fill="#000" />
              <rect x="4" y="22" width="6" height="6" fill="#fff" />
              <rect x="5" y="23" width="4" height="4" fill="#000" />
              <rect x="14" y="2" width="4" height="4" fill="#000" />
              <rect x="14" y="8" width="4" height="4" fill="#000" />
              <rect x="14" y="14" width="4" height="4" fill="#000" />
              <rect x="2" y="14" width="4" height="4" fill="#000" />
              <rect x="20" y="14" width="4" height="4" fill="#000" />
              <rect x="26" y="14" width="4" height="4" fill="#000" />
              <rect x="14" y="20" width="4" height="4" fill="#000" />
              <rect x="20" y="20" width="10" height="4" fill="#000" />
            </svg>
            <div>
              <p className="font-bengali font-bold text-slate-900">ধন্যবাদ!</p>
              <p className="text-[10px] text-slate-500 font-medium">আমদানিকৃত ও স্থানীয় নির্মাণ সামগ্রী সরবরাহকারী</p>
            </div>
          </div>

          {/* Center Software Branding */}
          <div className="text-center text-[9px] text-slate-400 space-y-0.5">
            <p className="text-slate-500">সফটওয়্যার পরিচালনায়: <strong className="font-semibold text-slate-600">{shop.softwareCompany || 'Hasanah Tech Solution'}</strong></p>
            <p className="text-slate-400 font-mono text-[8.5px]">
              <span>হটলাইন: <strong className="font-semibold text-slate-600">{toBengaliDigits(shop.softwarePhone || '01349345353')}</strong></span>
              {shop.softwareWebsite && <span> • {shop.softwareWebsite}</span>}
            </p>
          </div>

          {/* Right Barcode Simulation */}
          <div className="text-right shrink-0">
            <div className="inline-block bg-slate-900 px-2 py-1 rounded text-white font-mono text-[9px] tracking-widest font-black">
              ||||| | |||| ||| ||||| |||||
            </div>
            <p className="text-[9px] font-mono text-slate-600 font-bold mt-0.5">
              {memoNo}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
