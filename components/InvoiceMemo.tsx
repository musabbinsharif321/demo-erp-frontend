'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Printer, FileText, User, Truck, ClipboardList, CreditCard, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toBengaliDigits, numberToBengaliWords, parseProductDetails, cleanLegacyBengaliText } from '@/lib/bengaliUtils';
import { printElement } from '@/lib/printUtils';

export interface OrderItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  unit?: string;
  discount?: number;
  brand?: string;
  variant?: string;
  bundle?: number | string;
  pieces?: number | string;
  weightKg?: number;
}

export interface InvoiceMemoProps {
  invoice: {
    id: string;
    customerName: string;
    customerPhone?: string;
    customerAddress?: string;
    siteName?: string;
    siteAddress?: string;
    siteContact?: string;
    contactPerson?: string;
    tin?: string;
    bin?: string;
    creditLimit?: number;
    totalAmount: number;
    paidAmount?: number;
    dueAmount?: number;
    previousBalance?: number;
    previousDue?: number;
    transportCost?: number;
    shippingCost?: number;
    laborCost?: number;
    discount?: number;
    subtotal?: number;
    vehicleNo?: string;
    driverInfo?: string;
    driverName?: string;
    driverPhone?: string;
    deliveryAddress?: string;
    deliveryFrom?: string;
    deliveryTo?: string;
    items: OrderItem[];
    createdAt: any;
    note?: string;
    notes?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    paymentMethodName?: string;
    bankName?: string;
    accountNo?: string;
    transactionRef?: string;
    selectedShopBank?: string;
    receiverShopBank?: string;
    senderBankName?: string;
    senderAccountNo?: string;
    senderTxnRef?: string;
    chequeNo?: string;
    chequeDate?: string;
    cashPaidAmount?: number;
    chequePaidAmount?: number;
    operatorName?: string;
    preparedBy?: string;
    authorizedBy?: string;
    receivedBy?: string;
    engineerId?: string;
    engineerName?: string;
    engineerPhone?: string;
  };
  shopInfo?: {
    name?: string;
    proprietor?: string;
    address?: string;
    description?: string;
    tagline?: string;
    dealership?: string;
    phone?: string;
    terms?: string;
    logoUrl?: string;
    email?: string;
    website?: string;
    software?: string;
    softwareCompany?: string;
    softwarePhone?: string;
    softwareWebsite?: string;
  };
  showPrintButton?: boolean;
  onClose?: () => void;
}

export const InvoiceMemo: React.FC<InvoiceMemoProps> = ({ 
  invoice, 
  shopInfo: propShopInfo,
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
      website: '',
      terms: 'বিঃ দ্রঃ— ১. বিক্রিত মালামাল সাইটে হস্তান্তরের পর ফেরত বা বদল করা হয় না। ২. সাইটে মালামাল গণন পূর্বক বুঝে নেওয়ার অনুরোধ করা যাচ্ছে।',
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
            tagline: parsed.tagline || parsed.description || defaultShop.tagline,
            address: parsed.address || defaultShop.address,
            phone: parsed.phone || defaultShop.phone,
            email: parsed.email || defaultShop.email,
            website: parsed.website || defaultShop.website,
            terms: parsed.terms || defaultShop.terms,
            software: parsed.software || defaultShop.software,
            softwareCompany: customPromo.softwareCompany || parsed.softwareCompany || defaultShop.softwareCompany,
            softwarePhone: customPromo.softwarePhone || parsed.softwarePhone || defaultShop.softwarePhone,
            softwareWebsite: customPromo.softwareWebsite || parsed.softwareWebsite || defaultShop.softwareWebsite
          };
        }
      } catch (e) {
        console.error('Error reading shopInfo', e);
      }
    }
    return { ...defaultShop, ...customPromo };
  });

  // Format Date & Time
  const rawDate = invoice?.createdAt;
  const d = rawDate?.toDate ? rawDate.toDate() : (rawDate ? new Date(rawDate) : new Date());
  let dateStr = '';
  try {
    dateStr = format(d, 'dd-MM-yyyy');
  } catch {
    dateStr = format(new Date(), 'dd-MM-yyyy');
  }

  // Parse meta notes if stored as JSON
  let meta: any = {};
  let cleanUserNote = invoice.note || (invoice as any).notes || '';
  if (cleanUserNote && typeof cleanUserNote === 'string' && cleanUserNote.trim().startsWith('{')) {
    try {
      const firstLine = cleanUserNote.split('\n')[0];
      meta = JSON.parse(firstLine);
      cleanUserNote = cleanUserNote.substring(firstLine.length).trim();
    } catch {
      // not json
    }
  }

  const effectiveVehicleNo = invoice.vehicleNo || meta.vehicleNo || '';
  const effectiveDriverName = invoice.driverName || invoice.driverInfo || meta.driverName || '';
  const effectiveDriverPhone = invoice.driverPhone || meta.driverPhone || '';
  const effectiveSiteName = invoice.siteName || (invoice as any).site_name || meta.siteName || meta.site_name || '';
  const effectiveSiteContact = invoice.siteContact || (invoice as any).site_contact || (invoice as any).contactPerson || meta.siteContact || meta.contactPerson || '';
  const effectiveDeliveryAddress = invoice.siteAddress || invoice.deliveryAddress || meta.deliveryAddress || meta.siteAddress || '';
  const effectiveDeliveryFrom = invoice.deliveryFrom || meta.deliveryFrom || shop.name || '';
  const effectiveDeliveryTo = invoice.deliveryTo || meta.deliveryTo || invoice.customerName || '';
  const effectivePreparedBy = invoice.preparedBy || invoice.operatorName || meta.preparedBy || meta.operatorName || '';
  const effectiveAuthorizedBy = invoice.authorizedBy || meta.authorizedBy || '';
  const effectiveReceivedBy = invoice.receivedBy || meta.receivedBy || invoice.customerName || '';
  const effectivePreviousBalance = Number(invoice.previousBalance !== undefined ? invoice.previousBalance : (invoice.previousDue !== undefined ? invoice.previousDue : (meta.previousBalance || meta.previousDue || 0)));
  const effectivePaymentMethodName = invoice.paymentMethodName || meta.paymentMethodName || invoice.paymentMethod || 'Cash';
  const effectiveDiscount = Number(invoice.discount !== undefined ? invoice.discount : (meta.discount || 0));
  const rawShippingCost = Number(invoice.transportCost || invoice.shippingCost || meta.shippingCost || meta.transportCost || 0);
  const shippingCostToCustomer = (invoice as any).shippingCostToCustomerLedger !== undefined 
    ? Boolean((invoice as any).shippingCostToCustomerLedger) 
    : (meta.shippingCostToCustomerLedger !== undefined ? Boolean(meta.shippingCostToCustomerLedger) : (meta.shippingToCustomerLedger !== undefined ? Boolean(meta.shippingToCustomerLedger) : true));
  const effectiveShippingCost = shippingCostToCustomer ? rawShippingCost : 0;
  const effectiveLaborCost = Number(invoice.laborCost || meta.laborCost || 0);

  const items = invoice.items || [];
  const subtotal = invoice.subtotal || items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const totalAmount = invoice.totalAmount || (subtotal - effectiveDiscount + effectiveShippingCost + effectiveLaborCost);

  // Category-Specific Freight & Labor Charges Per Unit (Per KG for Rod/Ring, Per Bag for Cement)
  const rodLaborRate = Number((invoice as any).rodLaborRate !== undefined ? (invoice as any).rodLaborRate : (meta.rodLaborRate || 0));
  const rodShippingRate = Number((invoice as any).rodShippingRate !== undefined ? (invoice as any).rodShippingRate : (meta.rodShippingRate || 0));
  const cementLaborRate = Number((invoice as any).cementLaborRate !== undefined ? (invoice as any).cementLaborRate : (meta.cementLaborRate || 0));
  const cementShippingRate = Number((invoice as any).cementShippingRate !== undefined ? (invoice as any).cementShippingRate : (meta.cementShippingRate || 0));
  const cementUnloadingRate = Number((invoice as any).cementUnloadingRate !== undefined ? (invoice as any).cementUnloadingRate : (meta.cementUnloadingRate || 0));

  const rodRingWeight = items.reduce((sum: number, item: any) => {
    const parsed = parseProductDetails(item);
    const isRod = parsed.categoryName === 'রড' || (item.unit || '').includes('কেজি') || (item.unit || '').includes('টন') || (item.name || '').includes('রড') || (item.name || '').includes('মিলি');
    const isRing = parsed.categoryName === 'রিং' || (item.name || '').includes('রিং');
    if (isRod || isRing) {
      const isTon = (item.unit || '').toLowerCase().includes('ton') || (item.unit || '').includes('টন');
      return sum + (Number(item.quantity) || 0) * (isTon ? 1000 : 1);
    }
    return sum;
  }, 0);

  const cementBags = items.reduce((sum: number, item: any) => {
    const parsed = parseProductDetails(item);
    const isCement = parsed.categoryName === 'সিমেন্ট' || (item.unit || '').includes('বস্তা') || (item.unit || '').includes('ব্যাগ') || (item.name || '').includes('সিমেন্ট');
    if (isCement) {
      return sum + (Number(item.quantity) || 0);
    }
    return sum;
  }, 0);

  const rodLoadingToCustomer = (invoice as any).rodLoadingToCustomerLedger !== undefined 
    ? Boolean((invoice as any).rodLoadingToCustomerLedger) 
    : (meta.rodLoadingToCustomerLedger !== undefined ? Boolean(meta.rodLoadingToCustomerLedger) : true);

  const rodUnloadingRate = Number((invoice as any).rodUnloadingRate !== undefined ? (invoice as any).rodUnloadingRate : (meta.rodUnloadingRate || 0));
  const rodUnloadingCost = Number((invoice as any).rodUnloadingCost !== undefined ? (invoice as any).rodUnloadingCost : (meta.rodUnloadingCost || (rodUnloadingRate > 0 && rodRingWeight > 0 ? rodUnloadingRate * rodRingWeight : 0)));
  const rodUnloadingToCustomer = (invoice as any).rodUnloadingToCustomerLedger !== undefined 
    ? Boolean((invoice as any).rodUnloadingToCustomerLedger) 
    : (meta.rodUnloadingToCustomerLedger !== undefined ? Boolean(meta.rodUnloadingToCustomerLedger) : true);

  const cementLoadingToCustomer = (invoice as any).cementLoadingToCustomerLedger !== undefined 
    ? Boolean((invoice as any).cementLoadingToCustomerLedger) 
    : (meta.cementLoadingToCustomerLedger !== undefined ? Boolean(meta.cementLoadingToCustomerLedger) : false);

  const cementUnloadingCost = Number((invoice as any).cementUnloadingCost !== undefined ? (invoice as any).cementUnloadingCost : (meta.cementUnloadingCost || (cementUnloadingRate > 0 && cementBags > 0 ? cementUnloadingRate * cementBags : 0)));
  const cementUnloadingToCustomer = (invoice as any).cementUnloadingToCustomerLedger !== undefined 
    ? Boolean((invoice as any).cementUnloadingToCustomerLedger) 
    : (meta.cementUnloadingToCustomerLedger !== undefined ? Boolean(meta.cementUnloadingToCustomerLedger) : true);
  const rodLaborCost = Number((invoice as any).rodLaborCost !== undefined ? (invoice as any).rodLaborCost : (meta.rodLaborCost || (rodLaborRate > 0 && rodRingWeight > 0 ? rodLaborRate * rodRingWeight : 0)));

  const hasExplicitRates = (rodLaborRate > 0 || rodUnloadingRate > 0 || rodShippingRate > 0 || cementLaborRate > 0 || cementShippingRate > 0 || cementUnloadingRate > 0);
  
  const rodUnitExtra = hasExplicitRates
    ? ((rodLoadingToCustomer ? rodLaborRate : 0) + (rodUnloadingToCustomer ? rodUnloadingRate : 0) + rodShippingRate)
    : (rodRingWeight > 0 && cementBags === 0 ? (effectiveShippingCost + effectiveLaborCost) / rodRingWeight : 0);

  // Cement unloading & loading based on ledger toggles
  const cementUnitExtra = hasExplicitRates
    ? (cementShippingRate + (cementLoadingToCustomer ? cementLaborRate : 0) + (cementUnloadingToCustomer ? cementUnloadingRate : 0))
    : (cementBags > 0 && rodRingWeight === 0 ? (effectiveShippingCost + (cementUnloadingToCustomer ? cementUnloadingCost : 0)) / cementBags : 0);

  const paidAmount = invoice.paidAmount !== undefined ? invoice.paidAmount : 0;
  const dueAmount = invoice.dueAmount !== undefined ? invoice.dueAmount : Math.max(0, totalAmount - paidAmount);

  const grandTotalPayable = totalAmount + effectivePreviousBalance;
  const finalGrandDue = Math.max(0, grandTotalPayable - paidAmount);

  // Memo number format
  const invoiceNo = invoice.id 
    ? (invoice.id.startsWith('INV') ? invoice.id : `INV-${invoice.id.slice(-6).toUpperCase()}`)
    : 'INV-000101';

  const isPaid = finalGrandDue <= 0;
  const isPartial = paidAmount > 0 && finalGrandDue > 0;
  const paymentStatusText = isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID';

  return (
    <div className="w-full font-bengali">
      {/* Top action bar for web preview */}
      {showPrintButton && (
        <div className="flex items-center justify-between bg-[#1f1910] text-white p-3 px-6 rounded-t-2xl print:hidden shadow-md">
          <div className="flex items-center gap-2 text-xs font-bold">
            <FileText className="w-4 h-4 text-[#d4af37]" />
            <span>প্রিন্ট কপি প্রিভিউ (Standard Sales Invoice Format)</span>
          </div>
          <button
            type="button"
            onClick={handleTriggerPrint}
            className="bg-gradient-to-r from-[#b88e2d] to-[#d4af37] hover:from-[#a37c22] hover:to-[#be9b2d] text-white text-xs font-black px-5 py-2 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer border border-[#c59b27]"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>ইনভয়েস প্রিন্ট করুন</span>
          </button>
        </div>
      )}

      {/* --- SALES INVOICE SHEET --- */}
      <div 
        id="printable-memo-wrapper" 
        className={cn(
          "w-full max-w-[850px] mx-auto bg-white text-slate-900 p-6 space-y-3 font-sans print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:rounded-none min-h-[275mm] flex flex-col justify-between",
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
              {shop.tagline && (
                <p className="text-[11px] font-bold text-[#8c6b1c]">
                  {shop.tagline}
                </p>
              )}
              {shop.address && (
                <p className="pt-0.5 text-[11px] leading-tight">
                  📍 {shop.address}
                </p>
              )}
              {shop.phone && (
                <p className="text-[11px]">
                  📞 {shop.phone}
                </p>
              )}
              {shop.email && (
                <p className="text-[11px] text-slate-600 font-mono">
                  ✉️ {shop.email}
                </p>
              )}
              {shop.website && (
                <p className="text-[11px] text-slate-600 font-mono">
                  🌐 {shop.website}
                </p>
              )}
            </div>
          </div>

          {/* Center Document Title */}
          <div className="col-span-3 text-center">
            <h2 className="text-3xl font-black text-slate-900 tracking-wide font-bengali">
              বিক্রয় চালান
            </h2>
            <p className="text-xs font-bold text-orange-600 tracking-wider font-bengali mt-0.5">
              (বিক্রয় ইনভয়েস ও ক্যাশ মেমো)
            </p>
          </div>

          {/* Right Header Box */}
          <div className="col-span-4 text-right">
            <div className="border border-slate-400 rounded-lg p-2.5 bg-white text-xs font-bold text-slate-800 space-y-1 inline-block text-left w-full max-w-[240px] font-bengali">
              <div className="flex justify-between items-center">
                <span className="text-slate-700">বিক্রয় চালান নং</span>
                <span>: <span className="font-mono font-black text-slate-900">{toBengaliDigits(invoiceNo)}</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">চালানের তারিখ</span>
                <span>: <span className="font-mono">{dateStr}</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">চালানের ধরন</span>
                <span>: <span className="font-bold text-slate-900">বিক্রয়</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">পেমেন্ট স্ট্যাটাস</span>
                <span>: <span className={`font-bold ${isPaid ? 'text-emerald-700' : isPartial ? 'text-amber-700' : 'text-rose-700'}`}>{isPaid ? 'পরিশোধিত' : isPartial ? 'আংশিক পরিশোধিত' : 'অপরিশোধিত'}</span></span>
              </div>
              {invoice.id && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">রেফারেন্স / অর্ডার নং</span>
                  <span>: <span className="font-mono font-bold text-slate-900">{toBengaliDigits(invoice.id)}</span></span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* --- 2. CUSTOMER DETAILS & DELIVERY DETAILS (SIDE BY SIDE CARDS) --- */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          
          {/* Customer / Client Details Box */}
          <div className="border border-slate-300 rounded-lg p-2.5 bg-white space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 pb-1 border-b border-slate-200">
              <User className="w-3.5 h-3.5 text-orange-600" />
              <span>গ্রাহক ও ক্লায়েন্ট তথ্য</span>
            </div>
            
            <div className="space-y-1 font-medium text-slate-800">
              <div className="flex">
                <span className="w-28 shrink-0 font-bold text-slate-900">গ্রাহকের নাম</span>
                <span className="shrink-0 px-1">:</span>
                <span className="font-bold text-slate-900">{invoice.customerName || 'খুচরা গ্রাহক'}</span>
              </div>
              {effectiveSiteName && (
                <div className="flex">
                  <span className="w-28 shrink-0 font-bold text-orange-600">প্রজেক্ট / সাইট</span>
                  <span className="shrink-0 px-1">:</span>
                  <span className="font-bold text-slate-900">{effectiveSiteName}</span>
                </div>
              )}
              <div className="flex">
                <span className="w-28 shrink-0 text-slate-700">যোগাযোগ ব্যক্তি</span>
                <span className="shrink-0 px-1">:</span>
                <span>{invoice.siteContact || invoice.contactPerson || meta.contactPerson || '—'}</span>
              </div>
              <div className="flex">
                <span className="w-28 shrink-0 text-slate-700">মোবাইল নম্বর</span>
                <span className="shrink-0 px-1">:</span>
                <span className="font-mono">{invoice.customerPhone ? toBengaliDigits(invoice.customerPhone) : '—'}</span>
              </div>
              <div className="flex">
                <span className="w-28 shrink-0 text-slate-700">ঠিকানা</span>
                <span className="shrink-0 px-1">:</span>
                <span className="leading-tight">{invoice.customerAddress || '—'}</span>
              </div>
              {(invoice.engineerName || meta.engineerName) && (
                <div className="flex">
                  <span className="w-28 shrink-0 font-bold text-slate-700">ইঞ্জিনিয়ার</span>
                  <span className="shrink-0 px-1">:</span>
                  <span className="font-bold text-slate-900">
                    {invoice.engineerName || meta.engineerName}
                    {(invoice.engineerPhone || meta.engineerPhone) ? ` (${toBengaliDigits(invoice.engineerPhone || meta.engineerPhone)})` : ''}
                  </span>
                </div>
              )}
              {(invoice.tin || meta.tin) && (
                <div className="flex">
                  <span className="w-28 shrink-0 text-slate-700">TIN নম্বর</span>
                  <span className="shrink-0 px-1">:</span>
                  <span className="font-mono">{invoice.tin || meta.tin}</span>
                </div>
              )}
              {(invoice.bin || meta.bin) && (
                <div className="flex">
                  <span className="w-28 shrink-0 text-slate-700">BIN নম্বর</span>
                  <span className="shrink-0 px-1">:</span>
                  <span className="font-mono">{invoice.bin || meta.bin}</span>
                </div>
              )}
              {invoice.creditLimit !== undefined && (
                <div className="flex">
                  <span className="w-28 shrink-0 text-slate-700">বাকি বা ঋণের সীমা</span>
                  <span className="shrink-0 px-1">:</span>
                  <span className="font-mono font-semibold">৳ {toBengaliDigits(Number(invoice.creditLimit).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                </div>
              )}
              <div className="flex">
                <span className="w-28 shrink-0 text-slate-700">পূর্বের বকেয়া</span>
                <span className="shrink-0 px-1">:</span>
                <span className="font-mono font-bold text-slate-900">৳ {toBengaliDigits(effectivePreviousBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>
            </div>
          </div>

          {/* Delivery / Transport Details Box */}
          <div className="border border-slate-300 rounded-lg p-2.5 bg-white space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 pb-1 border-b border-slate-200">
              <Truck className="w-3.5 h-3.5 text-orange-600" />
              <span>ডেলিভারি ও পরিবহন তথ্য</span>
            </div>
            
            <div className="space-y-1 font-medium text-slate-800">
              <div className="flex">
                <span className="w-32 shrink-0 font-bold text-slate-900">গাড়ি / ট্রাক নম্বর</span>
                <span className="shrink-0 px-1">:</span>
                <span className="font-bold text-slate-900">{effectiveVehicleNo ? toBengaliDigits(effectiveVehicleNo) : '—'}</span>
              </div>
              <div className="flex">
                <span className="w-32 shrink-0 text-slate-700">ড্রাইভার নাম</span>
                <span className="shrink-0 px-1">:</span>
                <span>{effectiveDriverName || '—'}</span>
              </div>
              <div className="flex">
                <span className="w-32 shrink-0 text-slate-700">ড্রাইভার মোবাইল</span>
                <span className="shrink-0 px-1">:</span>
                <span className="font-mono">{effectiveDriverPhone ? toBengaliDigits(effectiveDriverPhone) : '—'}</span>
              </div>
              {effectiveDeliveryFrom && (
                <div className="flex">
                  <span className="w-32 shrink-0 text-slate-700">প্রেরণকারী স্থান</span>
                  <span className="shrink-0 px-1">:</span>
                  <span>{effectiveDeliveryFrom}</span>
                </div>
              )}
              {effectiveDeliveryTo && (
                <div className="flex">
                  <span className="w-32 shrink-0 text-slate-700">গন্তব্য স্থান</span>
                  <span className="shrink-0 px-1">:</span>
                  <span>{effectiveDeliveryTo}</span>
                </div>
              )}
              {effectiveSiteName && (
                <div className="flex">
                  <span className="w-32 shrink-0 font-bold text-orange-600">ডেলিভারি প্রজেক্ট/সাইট</span>
                  <span className="shrink-0 px-1">:</span>
                  <span className="font-bold text-slate-900">{effectiveSiteName}</span>
                </div>
              )}
              <div className="flex">
                <span className="w-32 shrink-0 text-slate-700">ডেলিভারি ঠিকানা</span>
                <span className="shrink-0 px-1">:</span>
                <span>{effectiveDeliveryAddress || '—'}</span>
              </div>
              <div className="flex">
                <span className="w-32 shrink-0 text-slate-700">ডেলিভারি তারিখ</span>
                <span className="shrink-0 px-1">:</span>
                <span className="font-mono">{dateStr}</span>
              </div>
              <div className="flex">
                <span className="w-32 shrink-0 text-slate-700">সাইট কন্টাক্ট / গ্রহীতা</span>
                <span className="shrink-0 px-1">:</span>
                <span>{effectiveSiteContact || effectiveReceivedBy || '—'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* --- 3. ITEM DETAILS TABLE --- */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 py-1">
            <ClipboardList className="w-3.5 h-3.5 text-orange-600" />
            <span>পণ্যের বিবরণ</span>
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
                <th className="border border-slate-400 py-1.5 px-2 text-right w-[10%] font-bengali">একক মূল্য (৳)</th>
                <th className="border border-slate-400 py-1.5 px-2 text-right w-[12%] font-bengali">মোট মূল্য (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-400 font-bold">কোনো পণ্য পাওয়া যায়নি</td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const itemPrice = Number(item.price || 0);
                  const itemQty = Number(item.quantity || 0);
                  const itemTotal = Number((itemPrice - Number(item.discount || 0)) * itemQty);

                  const parsed = parseProductDetails(item);
                  const isRod = parsed.categoryName === 'রড' || (item.unit || '').includes('কেজি') || (item.unit || '').includes('টন') || (item.name || '').includes('রড') || (item.name || '').includes('মিলি');
                  const isRing = parsed.categoryName === 'রিং' || (item.name || '').includes('রিং');
                  const isCement = parsed.categoryName === 'সিমেন্ট' || (item.unit || '').includes('বস্তা') || (item.unit || '').includes('ব্যাগ') || (item.name || '').includes('সিমেন্ট');

                  let itemExtraPerUnit = 0;
                  if (isRod || isRing) {
                    itemExtraPerUnit = rodUnitExtra;
                  } else if (isCement) {
                    itemExtraPerUnit = cementUnitExtra;
                  }

                  const bundleInfo = item.bundle ? `(${toBengaliDigits(item.bundle)} বান্ডিল)` : item.pieces ? `(${toBengaliDigits(item.pieces)} পিস)` : '';

                  return (
                    <tr key={idx} className="text-slate-900 font-medium">
                      <td className="border border-slate-300 py-1.5 px-1 text-center font-mono">{toBengaliDigits(idx + 1)}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-left font-bold">
                        <span>{cleanLegacyBengaliText(item.name)}</span> <span className="text-slate-500 text-[11px] font-normal">{bundleInfo}</span>
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center">{item.brand || '—'}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center">{item.variant || '—'}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center font-mono font-bold">{toBengaliDigits(itemQty.toLocaleString('en-IN'))}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center">{isRing ? 'কেজি' : (item.unit || 'পিস')}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-right font-mono font-bold">
                        ৳ {toBengaliDigits(itemPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2 text-right font-mono font-black text-slate-900">
                        ৳ {toBengaliDigits(itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
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
              মোট (কথায়): <span className="font-black">{numberToBengaliWords(grandTotalPayable)} টাকা মাত্র।</span>
            </div>

            {/* Payment Information Box */}
            <div className="border border-slate-300 rounded-lg p-2.5 bg-white space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 pb-1 border-b border-slate-200">
                <CreditCard className="w-3.5 h-3.5 text-orange-600" />
                <span>পেমেন্ট বিবরণী</span>
              </div>
              <div className="space-y-1 font-medium text-slate-800 pt-0.5">
                {(() => {
                  const pmRaw = effectivePaymentMethodName || invoice.paymentMethod || 'Cash';
                  const pmLower = pmRaw.toLowerCase();
                  const isBankToBank = pmLower.includes('banktobank') || pmLower.includes('ব্যাংক-টু-ব্যাংক');
                  const isBank = pmLower.includes('bank') || pmLower.includes('ব্যাংক');
                  const isCheque = pmLower.includes('cheque') || pmLower.includes('check') || pmLower.includes('চেক');
                  const isSplit = pmLower.includes('split') || pmLower.includes('স্প্লিট');

                  const shopBank = invoice.receiverShopBank || invoice.selectedShopBank || meta.selectedShopBank || meta.receiverShopBank || '';
                  const custBank = invoice.senderBankName || meta.senderBankName || invoice.bankName || meta.bankName || '';
                  const custAcc = invoice.senderAccountNo || meta.senderAccountNo || invoice.accountNo || meta.accountNo || '';
                  const txnRef = invoice.senderTxnRef || meta.senderTxnRef || invoice.transactionRef || meta.transactionRef || '';
                  const chqNo = invoice.chequeNo || meta.chequeNo || '';
                  const chqDate = invoice.chequeDate || meta.chequeDate || '';
                  const chqBank = invoice.bankName || meta.bankName || '';

                  return (
                    <>
                      <div className="flex">
                        <span className="w-28 shrink-0 text-slate-700">পেমেন্ট মাধ্যম</span>
                        <span className="shrink-0 px-1">:</span>
                        <span className="font-bold text-slate-900">
                          {isBankToBank ? '🔄 ব্যাংক-টু-ব্যাংক ট্রান্সফার' :
                           isBank ? '🏦 ব্যাংক ট্রান্সফার' :
                           isCheque ? '📄 চেক' :
                           isSplit ? '💵+📄 স্প্লিট পেমেন্ট (ক্যাশ ও চেক)' :
                           pmLower.includes('mobile') ? '📱 মোবাইল ব্যাংকিং' :
                           '💵 নগদ'}
                        </span>
                      </div>

                      <div className="flex">
                        <span className="w-28 shrink-0 text-slate-700">পরিশোধিত জমা</span>
                        <span className="shrink-0 px-1">:</span>
                        <span className="font-mono font-bold text-slate-900">৳ {toBengaliDigits(paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                      </div>

                      <div className="flex">
                        <span className="w-28 shrink-0 text-slate-700">পেমেন্ট তারিখ</span>
                        <span className="shrink-0 px-1">:</span>
                        <span className="font-mono">{dateStr}</span>
                      </div>

                      {/* BANK-TO-BANK TRANSFER DETAILS */}
                      {isBankToBank && (
                        <div className="mt-1 p-2 bg-indigo-50/70 border border-indigo-200 rounded-md text-[11px] font-medium space-y-1 text-slate-800">
                          {shopBank && (
                            <div className="flex">
                              <span className="w-32 shrink-0 font-bold text-indigo-950">• গ্রহীতা (দোকান ব্যাংক)</span>
                              <span className="shrink-0 px-1">:</span>
                              <span className="font-bold text-slate-900 font-mono">{shopBank}</span>
                            </div>
                          )}
                          {(custBank || custAcc) && (
                            <div className="flex">
                              <span className="w-32 shrink-0 font-bold text-slate-900">• প্রেরক (কাস্টমার ব্যাংক)</span>
                              <span className="shrink-0 px-1">:</span>
                              <span className="font-bold text-slate-900 font-mono">{custBank} {custAcc ? `(হিসাব নং: ${toBengaliDigits(custAcc)})` : ''}</span>
                            </div>
                          )}
                          {txnRef && (
                            <div className="flex">
                              <span className="w-32 shrink-0 font-bold text-slate-900">• লেনদেন রেফারেন্স নং</span>
                              <span className="shrink-0 px-1">:</span>
                              <span className="font-mono font-bold text-slate-900">{toBengaliDigits(txnRef)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SINGLE BANK TRANSFER DETAILS */}
                      {isBank && !isBankToBank && (
                        <div className="mt-1 p-2 bg-blue-50/70 border border-blue-200 rounded-md text-[11px] font-medium space-y-1 text-slate-800">
                          {(shopBank || custBank) && (
                            <div className="flex">
                              <span className="w-32 shrink-0 font-bold text-blue-950">• ব্যাংক অ্যাকাউন্ট</span>
                              <span className="shrink-0 px-1">:</span>
                              <span className="font-bold text-slate-900 font-mono">{shopBank || custBank}</span>
                            </div>
                          )}
                          {custAcc && (
                            <div className="flex">
                              <span className="w-32 shrink-0 font-bold text-slate-900">• অ্যাকাউন্ট নম্বর</span>
                              <span className="shrink-0 px-1">:</span>
                              <span className="font-mono font-bold text-slate-900">{toBengaliDigits(custAcc)}</span>
                            </div>
                          )}
                          {txnRef && (
                            <div className="flex">
                              <span className="w-32 shrink-0 font-bold text-slate-900">• রেফারেন্স আইডি</span>
                              <span className="shrink-0 px-1">:</span>
                              <span className="font-mono font-bold text-slate-900">{toBengaliDigits(txnRef)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CHEQUE DETAILS */}
                      {isCheque && (
                        <div className="mt-1 p-2 bg-slate-50 border border-slate-300 rounded-md text-[11px] font-medium space-y-1 text-slate-800">
                          {chqNo && (
                            <div className="flex">
                              <span className="w-32 shrink-0 font-bold text-slate-900">• চেক নম্বর</span>
                              <span className="shrink-0 px-1">:</span>
                              <span className="font-mono font-black text-slate-900">{toBengaliDigits(chqNo)}</span>
                            </div>
                          )}
                          {chqBank && (
                            <div className="flex">
                              <span className="w-32 shrink-0 font-bold text-slate-900">• ইস্যু প্রদানকারী ব্যাংক</span>
                              <span className="shrink-0 px-1">:</span>
                              <span className="font-bold text-slate-900">{chqBank}</span>
                            </div>
                          )}
                          {chqDate && (
                            <div className="flex">
                              <span className="w-32 shrink-0 font-bold text-slate-900">• চেকের তারিখ</span>
                              <span className="shrink-0 px-1">:</span>
                              <span className="font-mono font-bold text-slate-900">{toBengaliDigits(chqDate)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SPLIT PAYMENT DETAILS */}
                      {isSplit && (
                        <div className="mt-1 p-2 bg-slate-50 border border-slate-300 rounded-md text-[11px] font-medium space-y-1 text-slate-800">
                          <div className="flex">
                            <span className="w-32 shrink-0 font-bold text-slate-900">• ক্যাশ জমা</span>
                            <span className="shrink-0 px-1">:</span>
                            <span className="font-mono font-bold text-emerald-700">৳ {toBengaliDigits(Number(invoice.cashPaidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                          </div>
                          <div className="flex">
                            <span className="w-32 shrink-0 font-bold text-slate-900">• চেক পেমেন্ট</span>
                            <span className="shrink-0 px-1">:</span>
                            <span className="font-mono font-bold text-indigo-700">৳ {toBengaliDigits(Number(invoice.chequePaidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                          </div>
                          {chqNo && (
                            <div className="flex">
                              <span className="w-32 shrink-0 font-bold text-slate-900">• চেক নম্বর</span>
                              <span className="shrink-0 px-1">:</span>
                              <span className="font-mono font-bold text-slate-900">{toBengaliDigits(chqNo)}</span>
                            </div>
                          )}
                          {chqBank && (
                            <div className="flex">
                              <span className="w-32 shrink-0 font-bold text-slate-900">• ব্যাংক</span>
                              <span className="shrink-0 px-1">:</span>
                              <span className="font-bold text-slate-900">{chqBank}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {cleanUserNote && (
                        <div className="flex items-start pt-1 border-t border-slate-200 mt-1">
                          <span className="w-28 shrink-0 font-bold text-slate-900">কাস্টমার নোট</span>
                          <span className="shrink-0 px-1">:</span>
                          <span className="font-bengali text-slate-800 leading-tight">
                            {cleanUserNote}
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

          </div>

          {/* Right Column (Calculations Grid Table) */}
          <div className="col-span-5">
            <div className="border border-slate-400 font-bold text-xs divide-y divide-slate-300 bg-white font-bengali">
              
              <div className="flex justify-between items-center p-1.5 px-2">
                <span className="text-slate-800 font-medium">পণ্যের মোট মূল্য (সবটোটাল)</span>
                <span className="font-mono">৳ {toBengaliDigits(subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>

              {(rodLaborCost > 0 || (effectiveLaborCost > 0 && cementUnloadingCost === 0 && rodUnloadingCost === 0)) && (
                rodLoadingToCustomer ? (
                  <div className="flex justify-between items-center p-1.5 px-2">
                    <div className="flex flex-col text-left">
                      <span className="text-slate-800 font-medium">লেবার খরচ (রড লোডিং)</span>
                      {rodLaborRate > 0 && (
                        <span className="text-[9px] text-slate-500 font-normal">
                          রড: ৳{toBengaliDigits(rodLaborRate)}/কেজি
                        </span>
                      )}
                    </div>
                    <span className="font-mono">+ ৳ {toBengaliDigits((rodLaborCost > 0 ? rodLaborCost : effectiveLaborCost).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center p-1.5 px-2 bg-sky-50/40 text-[11px]">
                    <div className="flex flex-col text-left">
                      <span className="text-sky-900 font-medium">রড লোডিং লেবার (দোকান প্রদেয়)</span>
                      {rodLaborRate > 0 && (
                        <span className="text-[9px] text-slate-500 font-normal">
                          {toBengaliDigits(rodRingWeight)} কেজি @ ৳{toBengaliDigits(rodLaborRate)}/কেজি (গ্রাহকের জন্য প্রযোজ্য নয়)
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-sky-700 font-bold">দোকান বহন করবে</span>
                  </div>
                )
              )}

              {rodUnloadingCost > 0 && (
                rodUnloadingToCustomer ? (
                  <div className="flex justify-between items-center p-1.5 px-2">
                    <div className="flex flex-col text-left">
                      <span className="text-slate-800 font-medium">রড আনলোডিং লেবার</span>
                      {rodUnloadingRate > 0 && (
                        <span className="text-[9px] text-slate-500 font-normal">
                          {toBengaliDigits(rodRingWeight)} কেজি @ ৳{toBengaliDigits(rodUnloadingRate)}/কেজি
                        </span>
                      )}
                    </div>
                    <span className="font-mono">+ ৳ {toBengaliDigits(rodUnloadingCost.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center p-1.5 px-2 bg-teal-50/40 text-[11px]">
                    <div className="flex flex-col text-left">
                      <span className="text-teal-900 font-medium">রড আনলোডিং লেবার (দোকান প্রদেয়)</span>
                      {rodUnloadingRate > 0 && (
                        <span className="text-[9px] text-slate-500 font-normal">
                          {toBengaliDigits(rodRingWeight)} কেজি @ ৳{toBengaliDigits(rodUnloadingRate)}/কেজি (গ্রাহকের জন্য প্রযোজ্য নয়)
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-teal-700 font-bold">দোকান বহন করবে</span>
                  </div>
                )
              )}

              {cementUnloadingCost > 0 && (
                cementUnloadingToCustomer ? (
                  <div className="flex justify-between items-center p-1.5 px-2">
                    <div className="flex flex-col text-left">
                      <span className="text-slate-800 font-medium">সিমেন্ট আনলোডিং লেবার</span>
                      {cementUnloadingRate > 0 && (
                        <span className="text-[9px] text-slate-500 font-normal">
                          {toBengaliDigits(cementBags)} বস্তা @ ৳{toBengaliDigits(cementUnloadingRate)}/বস্তা
                        </span>
                      )}
                    </div>
                    <span className="font-mono">+ ৳ {toBengaliDigits(cementUnloadingCost.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center p-1.5 px-2 bg-emerald-50/40 text-[11px]">
                    <div className="flex flex-col text-left">
                      <span className="text-emerald-900 font-medium">সিমেন্ট আনলোডিং লেবার (দোকান প্রদেয়)</span>
                      {cementUnloadingRate > 0 && (
                        <span className="text-[9px] text-slate-500 font-normal">
                          {toBengaliDigits(cementBags)} বস্তা @ ৳{toBengaliDigits(cementUnloadingRate)}/বস্তা (গ্রাহকের জন্য প্রযোজ্য নয়)
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-emerald-700 font-bold">দোকান বহন করবে</span>
                  </div>
                )
              )}

              {cementLaborRate > 0 && cementBags > 0 && (
                cementLoadingToCustomer ? (
                  <div className="flex justify-between items-center p-1.5 px-2">
                    <div className="flex flex-col text-left">
                      <span className="text-slate-800 font-medium">সিমেন্ট লোডিং লেবার</span>
                      <span className="text-[9px] text-slate-500 font-normal">
                        {toBengaliDigits(cementBags)} বস্তা @ ৳{toBengaliDigits(cementLaborRate)}/বস্তা
                      </span>
                    </div>
                    <span className="font-mono">+ ৳ {toBengaliDigits((cementLaborRate * cementBags).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center p-1.5 px-2 bg-amber-50/40 text-[11px]">
                    <div className="flex flex-col text-left">
                      <span className="text-amber-900 font-medium">সিমেন্ট লোডিং চার্জ (দোকান প্রদেয়)</span>
                      <span className="text-[9px] text-slate-500 font-normal">
                        {toBengaliDigits(cementBags)} বস্তা @ ৳{toBengaliDigits(cementLaborRate)}/বস্তা (গ্রাহকের জন্য প্রযোজ্য নয়)
                      </span>
                    </div>
                    <span className="font-mono text-amber-700 font-bold">দোকান বহন করবে</span>
                  </div>
                )
              )}

              {rawShippingCost > 0 && (
                shippingCostToCustomer ? (
                  <div className="flex justify-between items-center p-1.5 px-2">
                    <div className="flex flex-col text-left">
                      <span className="text-slate-800 font-medium">পরিবহন ভাড়া / গাড়ি ভাড়া</span>
                      {(rodShippingRate > 0 || cementShippingRate > 0) && (
                        <span className="text-[9px] text-slate-500 font-normal">
                          {rodShippingRate > 0 ? `রড: ৳${toBengaliDigits(rodShippingRate)}/কেজি ` : ''}
                          {cementShippingRate > 0 ? `সিমেন্ট: ৳${toBengaliDigits(cementShippingRate)}/বস্তা` : ''}
                        </span>
                      )}
                    </div>
                    <span className="font-mono">+ ৳ {toBengaliDigits(rawShippingCost.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center p-1.5 px-2 bg-blue-50/40 text-[11px]">
                    <div className="flex flex-col text-left">
                      <span className="text-blue-900 font-medium">পরিবহন ভাড়া / গাড়ি ভাড়া (দোকান প্রদেয়)</span>
                      <span className="text-[9px] text-slate-500 font-normal">
                        মোট ৳{toBengaliDigits(rawShippingCost.toLocaleString('en-IN', { minimumFractionDigits: 2 }))} (গ্রাহকের বিলে যুক্ত নয়)
                      </span>
                    </div>
                    <span className="font-mono text-blue-700 font-bold">দোকান বহন করবে</span>
                  </div>
                )
              )}

              {effectiveDiscount > 0 && (
                <div className="flex justify-between items-center p-1.5 px-2">
                  <span className="text-slate-800 font-medium">বিশেষ ছাড় (ডিসকাউন্ট)</span>
                  <span className="font-mono text-slate-900">- ৳ {toBengaliDigits(effectiveDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                </div>
              )}

              <div className="flex justify-between items-center p-1.5 px-2 bg-slate-50 font-bold text-slate-900">
                <span>সর্বমোট ইনভয়েস বিল</span>
                <span className="font-mono">৳ {toBengaliDigits(totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>

              <div className="flex justify-between items-center p-1.5 px-2 text-rose-700">
                <span className="font-medium">পূর্বের জের / বকেয়া</span>
                <span className="font-mono font-bold">+ ৳ {toBengaliDigits(effectivePreviousBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>

              <div className="flex justify-between items-center p-2 px-2 text-xs bg-orange-50 font-black text-orange-950 border-t border-orange-200">
                <span>সর্বমোট প্রদেয় বিল (বকেয়াসহ)</span>
                <span className="font-mono text-sm">৳ {toBengaliDigits(grandTotalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>

              <div className="flex justify-between items-center p-2 px-2 text-xs text-emerald-700 font-black">
                <span>আজকের পরিশোধিত জমা</span>
                <span className="font-mono">৳ {toBengaliDigits(paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>

              <div className="flex justify-between items-center p-2 px-2 text-sm text-rose-600 font-black">
                <span>সর্বশেষ অবশিষ্ট বকেয়া</span>
                <span className="font-mono">৳ {toBengaliDigits(finalGrandDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
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
            <p className="font-bold text-slate-800 font-bengali">{effectivePreparedBy || '—'}</p>
            <p className="text-[10px] text-slate-600 font-mono font-medium mt-0.5">তারিখ: {dateStr}</p>
          </div>

          <div>
            <p className="font-bold text-slate-900 font-bengali">হিসাব রক্ষকের স্বাক্ষর</p>
            <p className="text-[10px] text-slate-500 font-bengali font-semibold">(যাচাইকৃত)</p>
            <div className="w-28 mx-auto border-b border-dashed border-slate-400 my-2" />
            <p className="font-bold text-slate-800 font-bengali">{effectiveAuthorizedBy || '—'}</p>
            <p className="text-[10px] text-slate-600 font-mono font-medium mt-0.5">তারিখ: {dateStr}</p>
          </div>

          <div>
            <p className="font-bold text-slate-900 font-bengali">ব্যবস্থাপকের স্বাক্ষর</p>
            <p className="text-[10px] text-slate-500 font-bengali font-semibold">(অনুমোদিত)</p>
            <div className="w-28 mx-auto border-b border-dashed border-slate-400 my-2" />
            <p className="font-bold text-slate-800 font-bengali">{shop.proprietor || '—'}</p>
            <p className="text-[10px] text-slate-600 font-mono font-medium mt-0.5">তারিখ: {dateStr}</p>
          </div>

          <div>
            <p className="font-bold text-slate-900 font-bengali">গ্রাহকের স্বাক্ষর</p>
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
            <svg className="w-9 h-9 shrink-0 border border-slate-200 p-0.5 rounded opacity-75" viewBox="0 0 32 32" fill="currentColor">
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
              <rect x="14" y="26" width="6" height="4" fill="#000" />
              <rect x="22" y="26" width="8" height="4" fill="#000" />
            </svg>
            <div className="font-bengali text-[9.5px] text-slate-500 leading-tight">
              <p>ধন্যবাদ আমাদের সাথে থাকার জন্য।</p>
              <p className="text-slate-400">আবার ব্যবসা করার সুযোগ দিন।</p>
            </div>
          </div>

          {/* Center Software Contact */}
          <div className="text-center text-[9px] text-slate-400 space-y-0.5">
            <p className="text-slate-500">সফটওয়্যার পরিচালনায়: <strong className="font-semibold text-slate-600">{shop.softwareCompany || shop.software || 'Hasanah Tech Solution'}</strong></p>
            <p className="text-slate-400 font-mono text-[8.5px]">
              {shop.softwarePhone && <span>হটলাইন: <strong className="font-semibold text-slate-600">{toBengaliDigits(shop.softwarePhone)}</strong></span>}
              {shop.softwareWebsite && <span> • {shop.softwareWebsite}</span>}
            </p>
          </div>

          {/* Right Barcode */}
          <div className="text-right shrink-0 space-y-0.5">
            <svg className="h-7 w-36 ml-auto" viewBox="0 0 140 30" fill="currentColor">
              <rect x="0" y="0" width="3" height="30" />
              <rect x="5" y="0" width="2" height="30" />
              <rect x="10" y="0" width="4" height="30" />
              <rect x="16" y="0" width="1" height="30" />
              <rect x="19" y="0" width="3" height="30" />
              <rect x="24" y="0" width="2" height="30" />
              <rect x="28" y="0" width="5" height="30" />
              <rect x="35" y="0" width="2" height="30" />
              <rect x="39" y="0" width="1" height="30" />
              <rect x="42" y="0" width="4" height="30" />
              <rect x="48" y="0" width="2" height="30" />
              <rect x="52" y="0" width="3" height="30" />
              <rect x="57" y="0" width="1" height="30" />
              <rect x="60" y="0" width="4" height="30" />
              <rect x="66" y="0" width="2" height="30" />
              <rect x="70" y="0" width="3" height="30" />
              <rect x="75" y="0" width="5" height="30" />
              <rect x="82" y="0" width="1" height="30" />
              <rect x="85" y="0" width="3" height="30" />
              <rect x="90" y="0" width="2" height="30" />
              <rect x="94" y="0" width="4" height="30" />
              <rect x="100" y="0" width="1" height="30" />
              <rect x="103" y="0" width="3" height="30" />
              <rect x="108" y="0" width="2" height="30" />
              <rect x="112" y="0" width="5" height="30" />
              <rect x="119" y="0" width="2" height="30" />
              <rect x="123" y="0" width="1" height="30" />
              <rect x="126" y="0" width="4" height="30" />
              <rect x="132" y="0" width="2" height="30" />
              <rect x="136" y="0" width="3" height="30" />
            </svg>
            <p className="font-mono text-[10px] font-bold tracking-widest text-slate-800 text-center">{invoiceNo}</p>
          </div>

        </div>

      </div>
    </div>
  );
};
