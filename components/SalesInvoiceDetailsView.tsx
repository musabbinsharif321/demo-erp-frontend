'use client';

import React from 'react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { 
  ArrowLeft, Printer, Download, Mail, Edit, 
  Receipt, User, Truck, ClipboardList, CreditCard, 
  FileText, Settings, Building2, MapPin, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toBengaliDigits, parseProductDetails, cleanLegacyBengaliText } from '@/lib/bengaliUtils';
import { printElement } from '@/lib/printUtils';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/authContext';

export interface SalesInvoiceDetailsViewProps {
  invoice: any;
  onBack?: () => void;
  onEdit?: (invoice: any) => void;
  onPrint?: (invoice: any) => void;
  onDownloadPdf?: (invoice: any) => void;
  onSendEmail?: (invoice: any) => void;
  onApprove?: (invoice: any) => void;
}

export const SalesInvoiceDetailsView: React.FC<SalesInvoiceDetailsViewProps> = ({
  invoice,
  onBack,
  onEdit,
  onPrint,
  onDownloadPdf,
  onSendEmail,
  onApprove
}) => {
  const { canEditInvoice } = useAuth();
  if (!invoice) return null;

  // Format Date & Time
  const rawDate = invoice.createdAt;
  const d = rawDate?.toDate ? rawDate.toDate() : (rawDate ? new Date(rawDate) : new Date());
  
  let dateStr = '';
  let timeStr = '';
  try {
    dateStr = toBengaliDigits(format(d, 'dd/MM/yyyy'));
    timeStr = toBengaliDigits(format(d, 'hh:mm a', { locale: bn }))
      .replace('AM', 'পূর্বাহ্ন')
      .replace('PM', 'অপরাহ্ন');
  } catch {
    dateStr = format(new Date(), 'dd/MM/yyyy');
    timeStr = '';
  }

  // Parse meta note JSON if present
  let meta: any = {};
  let cleanUserNote = invoice.note || invoice.notes || '';
  if (cleanUserNote && typeof cleanUserNote === 'string' && cleanUserNote.trim().startsWith('{')) {
    try {
      const firstLine = cleanUserNote.split('\n')[0];
      meta = JSON.parse(firstLine);
      cleanUserNote = meta.userNote !== undefined ? meta.userNote : cleanUserNote.substring(firstLine.length).trim();
    } catch {
      // not json
    }
  }

  // Items & Quantities
  const items = invoice.items || [];
  const subtotal = Number(invoice.subtotal || items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0));
  
  // Discounts
  const discountPercent = Number(meta.discountPercent || 0);
  const discountFlat = Number(invoice.discount !== undefined ? invoice.discount : (meta.discountFlat || meta.discount || 0));
  const discount = discountFlat > 0 ? discountFlat : (discountPercent > 0 ? (subtotal * discountPercent / 100) : 0);

  // Freight & Labor Charges
  const shippingCost = Number(invoice.shippingCost || invoice.transportCost || meta.transportCost || meta.shippingCost || 0);
  const laborCost = Number(invoice.laborCost || meta.laborCost || 0);
  const totalAmount = Number(invoice.totalAmount || (subtotal - discount + shippingCost + laborCost));
  
  // Category-Specific Freight & Labor Charges Per Unit (Per KG for Rod/Ring, Per Bag for Cement)
  const rodLaborRate = Number(invoice.rodLaborRate !== undefined ? invoice.rodLaborRate : (meta.rodLaborRate || 0));
  const rodShippingRate = Number(invoice.rodShippingRate !== undefined ? invoice.rodShippingRate : (meta.rodShippingRate || 0));
  const cementLaborRate = Number(invoice.cementLaborRate !== undefined ? invoice.cementLaborRate : (meta.cementLaborRate || 0));
  const cementShippingRate = Number(invoice.cementShippingRate !== undefined ? invoice.cementShippingRate : (meta.cementShippingRate || 0));
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

  const cementUnloadingRate = Number(invoice.cementUnloadingRate !== undefined ? invoice.cementUnloadingRate : (meta.cementUnloadingRate || 0));
  const cementUnloadingCost = Number(invoice.cementUnloadingCost !== undefined ? invoice.cementUnloadingCost : (meta.cementUnloadingCost || (cementUnloadingRate > 0 && cementBags > 0 ? cementUnloadingRate * cementBags : 0)));
  const cementUnloadingToCustomer = (invoice as any).cementUnloadingToCustomerLedger !== undefined 
    ? Boolean((invoice as any).cementUnloadingToCustomerLedger) 
    : (meta.cementUnloadingToCustomerLedger !== undefined ? Boolean(meta.cementUnloadingToCustomerLedger) : true);
  const shippingCostToCustomer = (invoice as any).shippingCostToCustomerLedger !== undefined 
    ? Boolean((invoice as any).shippingCostToCustomerLedger) 
    : (meta.shippingCostToCustomerLedger !== undefined ? Boolean(meta.shippingCostToCustomerLedger) : (meta.shippingToCustomerLedger !== undefined ? Boolean(meta.shippingToCustomerLedger) : true));
  const rodLaborCost = Number(invoice.rodLaborCost !== undefined ? invoice.rodLaborCost : (meta.rodLaborCost || (rodLaborRate > 0 && rodRingWeight > 0 ? rodLaborRate * rodRingWeight : 0)));

  const hasExplicitRates = (rodLaborRate > 0 || rodUnloadingRate > 0 || rodShippingRate > 0 || cementLaborRate > 0 || cementShippingRate > 0 || cementUnloadingRate > 0);
  
  const rodUnitExtra = hasExplicitRates
    ? ((rodLoadingToCustomer ? rodLaborRate : 0) + (rodUnloadingToCustomer ? rodUnloadingRate : 0) + rodShippingRate)
    : (rodRingWeight > 0 && cementBags === 0 ? (shippingCost + laborCost) / rodRingWeight : 0);

  const cementUnitExtra = hasExplicitRates
    ? (cementShippingRate + (cementLoadingToCustomer ? cementLaborRate : 0) + (cementUnloadingToCustomer ? cementUnloadingRate : 0))
    : (cementBags > 0 && rodRingWeight === 0 ? (shippingCost + (cementUnloadingToCustomer ? cementUnloadingCost : 0)) / cementBags : 0);

  const paidAmount = Number(invoice.paidAmount || 0);
  const dueAmount = Number(invoice.dueAmount !== undefined ? invoice.dueAmount : Math.max(0, totalAmount - paidAmount));
  const previousBalance = Number(
    invoice.previousBalance !== undefined ? invoice.previousBalance :
    invoice.previous_balance !== undefined ? invoice.previous_balance :
    invoice.previousDue !== undefined ? invoice.previousDue :
    invoice.previous_due !== undefined ? invoice.previous_due :
    invoice.party_due !== undefined ? invoice.party_due :
    invoice.party?.due !== undefined ? invoice.party?.due :
    invoice.party?.balance !== undefined ? invoice.party?.balance :
    meta.previousBalance !== undefined ? meta.previousBalance :
    meta.previousDue !== undefined ? meta.previousDue :
    0
  );
  const grandTotalPayable = totalAmount + previousBalance;
  const finalGrandDue = Math.max(0, grandTotalPayable - paidAmount);

  // Logistics & Transport Fields
  const vehicleNo = invoice.vehicleNo || meta.vehicleNo || '';
  const driverName = invoice.driverName || invoice.driverInfo || meta.driverName || '';
  const driverPhone = invoice.driverPhone || meta.driverPhone || '';
  const deliveryAddress = invoice.siteAddress || invoice.deliveryAddress || meta.deliveryAddress || meta.siteAddress || invoice.customerAddress || '';
  const siteContact = invoice.siteContact || meta.contactPerson || meta.siteContact || '';
  const siteName = invoice.siteName || invoice.site_name || meta.siteName || meta.site_name || '';
  const warehouse = invoice.warehouse || meta.warehouse || 'প্রধান গুদাম (Main Depot)';

  // System Roles
  const preparedBy = invoice.preparedBy || invoice.operatorName || meta.preparedBy || meta.operatorName || 'ক্যাশিয়ার';
  const authorizedBy = invoice.authorizedBy || meta.authorizedBy || '';
  const receivedBy = invoice.receivedBy || meta.receivedBy || '';
  
  // Payment Breakdown Fields
  const paymentMethodName = invoice.paymentMethodName || meta.paymentMethodName || invoice.paymentMethod || 'Cash';
  const pmLower = paymentMethodName.toLowerCase();
  const isBankToBank = pmLower.includes('banktobank') || pmLower.includes('ব্যাংক-টু-ব্যাংক');
  const isBank = pmLower.includes('bank') || pmLower.includes('ব্যাংক');
  const isCheque = pmLower.includes('cheque') || pmLower.includes('check') || pmLower.includes('চেক');
  const isSplit = pmLower.includes('split') || pmLower.includes('স্প্লিট');

  const shopBank = invoice.receiverShopBank || invoice.selectedShopBank || meta.selectedShopBank || meta.receiverShopBank || '';
  const shopAccName = invoice.receiverShopAccountName || meta.receiverShopAccountName || meta.selectedShopAccountName || meta.shopAccountName || '';
  const shopAcc = invoice.receiverShopAccountNo || meta.receiverShopAccountNo || meta.selectedShopAccountNo || meta.shopAccountNo || '';
  const shopBranch = invoice.receiverShopBranch || meta.receiverShopBranch || meta.selectedShopBranch || meta.shopBranch || '';

  const custBank = invoice.senderBankName || meta.senderBankName || invoice.bankName || meta.bankName || '';
  const custAccName = invoice.senderAccountName || meta.senderAccountName || invoice.accountName || meta.accountName || '';
  const custAcc = invoice.senderAccountNo || meta.senderAccountNo || invoice.accountNo || meta.accountNo || '';
  const custBranch = invoice.senderBranch || meta.senderBranch || invoice.branch || meta.branch || '';

  const txnRef = invoice.senderTxnRef || meta.senderTxnRef || invoice.transactionRef || meta.transactionRef || meta.txnRef || '';
  const chqNo = invoice.chequeNo || meta.chequeNo || '';
  const chqDate = invoice.chequeDate || meta.chequeDate || '';
  const chqBank = invoice.bankName || meta.bankName || '';
  const cashPaid = Number(invoice.cashPaidAmount || meta.cashPaidAmount || 0);
  const chequePaid = Number(invoice.chequePaidAmount || meta.chequePaidAmount || 0);

  const isPaid = dueAmount <= 0;
  const isPartial = paidAmount > 0 && dueAmount > 0;

  // Aggregate quantity by unit
  const aggregatedUnits = items.reduce((acc: Record<string, number>, item: any) => {
    const u = item.unit || 'পিস';
    acc[u] = (acc[u] || 0) + item.quantity;
    return acc;
  }, {});

  const totalQuantitySummary = Object.entries(aggregatedUnits)
    .map(([unit, qty]) => `${toBengaliDigits((qty as number).toLocaleString('en-IN'))} ${unit}`)
    .join(', ');

  const invoiceNo = invoice.orderId || (invoice.id ? (invoice.id.startsWith('INV') || invoice.id.startsWith('SAL') ? invoice.id : `SAL-${invoice.id.slice(-6).toUpperCase()}`) : 'SAL-000101');

  return (
    <div className="w-full bg-slate-100 min-h-screen p-4 sm:p-6 font-bengali space-y-4 text-slate-800">
      
      {/* --- TOP HEADER ACTION BAR --- */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Title with Back Button */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title="চালান তালিকায় ফেরত যান"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              বিক্রয় চালান বিস্তারিত
            </h1>
            <p className="text-xs font-mono text-slate-500 font-bold">চালান নং: #{invoiceNo}</p>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex flex-wrap items-center gap-2">
          
          <Button
            onClick={() => onPrint ? onPrint(invoice) : printElement('printable-memo-wrapper')}
            variant="outline"
            className="rounded-lg h-9 px-3.5 text-xs font-bold text-slate-700 border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>চালান প্রিন্ট</span>
          </Button>

          {onDownloadPdf && (
            <Button
              onClick={() => onDownloadPdf(invoice)}
              className="rounded-lg h-9 px-4 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>পিডিএফ ডাউনলোড</span>
            </Button>
          )}

          {onSendEmail && (
            <Button
              onClick={() => onSendEmail(invoice)}
              variant="outline"
              className="rounded-lg h-9 px-3.5 text-xs font-bold text-slate-700 border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-slate-600" />
              <span>ইমেইল পাঠান</span>
            </Button>
          )}

          {onEdit && canEditInvoice && (
            <Button
              onClick={() => onEdit(invoice)}
              variant="outline"
              className="rounded-lg h-9 px-3.5 text-xs font-bold text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-amber-600" />
              <span>সম্পাদনা করুন</span>
            </Button>
          )}

        </div>

      </div>

      {/* APPROVAL STATUS BANNER */}
      {(invoice.status === 'pending' || invoice.status === 'draft' || invoice.status === 'অপেক্ষমান') && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in-0">
          <div className="flex items-center gap-2.5 text-amber-950 font-bold">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-black text-amber-900">এই বিক্রয় চালানটি এখনো অনুমোদিত হয়নি (অপেক্ষমান / Pending)</p>
              <p className="text-amber-700 font-medium text-[11px]">অনুমোদন করার আগ পর্যন্ত এটি গ্রাহকের খতিয়ান (Ledger), নগদ ক্যাশ/ব্যাংক এবং পণ্যের স্টকে কোনো পরিবর্তন করবে না।</p>
            </div>
          </div>
          {onApprove && (
            <Button 
              onClick={() => onApprove(invoice)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 rounded-lg shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> অনুমোদন করুন (Approve)
            </Button>
          )}
        </div>
      )}

      {/* --- SECTION 1: 3 CARDS (INVOICE INFO, CUSTOMER INFO, LOGISTICS INFO) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Card 1: চালানের তথ্য */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <h3>চালানের তথ্য</h3>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">চালান নম্বর</span>
              <span className="font-mono font-bold text-slate-900">{toBengaliDigits(invoiceNo)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">চালানের তারিখ</span>
              <span className="font-bold text-slate-800">{dateStr}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">চালানের ধরন</span>
              <span className="font-bold text-slate-800">বিক্রয় চালান</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">পেমেন্ট স্ট্যাটাস</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isPaid ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                isPartial ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                'bg-rose-100 text-rose-700 border border-rose-300'
              }`}>
                {isPaid ? 'পরিশোধিত' : isPartial ? 'আংশিক পরিশোধিত' : 'অপরিশোধিত'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">সরবরাহকারী গুদাম</span>
              <span className="font-bold text-slate-800">{warehouse}</span>
            </div>

            {preparedBy && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">তৈরি করেছেন</span>
                <span className="font-bold text-slate-800">{preparedBy}</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-slate-500">তৈরির সময়</span>
              <span className="font-mono text-slate-800">{dateStr} {timeStr}</span>
            </div>
          </div>
        </div>

        {/* Card 2: গ্রাহকের তথ্য */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
            <User className="w-4 h-4 text-emerald-600" />
            <h3>গ্রাহকের তথ্য</h3>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">গ্রাহকের নাম</span>
              <span className="font-black text-slate-900 text-sm">{invoice.customerName || 'খুচরা গ্রাহক'}</span>
            </div>

            {siteName && (
              <div className="flex justify-between items-center bg-sky-50 px-2.5 py-1.5 rounded-lg border border-sky-200">
                <span className="text-sky-800 font-bold flex items-center gap-1">📍 ডেলিভারি সাইট / প্রজেক্ট</span>
                <span className="font-black text-sky-950 text-right">{siteName}</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-slate-500">যোগাযোগ ব্যক্তি</span>
              <span className="font-bold text-slate-800">{siteContact || invoice.customerName || '—'}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">মোবাইল নম্বর</span>
              <span className="font-mono font-bold text-slate-800">{invoice.customerPhone ? toBengaliDigits(invoice.customerPhone) : '—'}</span>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-slate-500 shrink-0">ঠিকানা</span>
              <span className="font-bold text-slate-800 text-right leading-tight">{invoice.customerAddress || '—'}</span>
            </div>

            {invoice.creditLimit !== undefined && (
              <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                <span className="text-slate-500">বাকি বা ঋণের সীমা</span>
                <span className="font-mono font-bold text-slate-900">৳ {toBengaliDigits(Number(invoice.creditLimit).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>
            )}

            {previousBalance > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">পূর্বের বকেয়া</span>
                <span className="font-mono font-bold text-slate-900">৳ {toBengaliDigits(previousBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>
            )}

            {(invoice.engineerName || meta.engineerName) && (
              <div className="bg-orange-50/90 p-2.5 rounded-lg border border-orange-200 mt-2 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-orange-800 font-black flex items-center gap-1 text-[11px]">
                    👷‍♂️ দায়িত্বপ্রাপ্ত ইঞ্জিনিয়ার
                  </span>
                  <span className="font-black text-orange-950 text-right text-xs">
                    {invoice.engineerName || meta.engineerName}
                  </span>
                </div>
                {(invoice.engineerPhone || meta.engineerPhone) && (
                  <div className="text-[11px] text-slate-600 font-mono flex justify-between">
                    <span>মোবাইল:</span>
                    <span className="font-bold">{toBengaliDigits(invoice.engineerPhone || meta.engineerPhone)}</span>
                  </div>
                )}
                {((meta.engineerTotalCommission || (invoice as any).engineerTotalCommission) > 0 || meta.engineerRodRate || meta.engineerCementRate) && (
                  <div className="pt-1.5 border-t border-orange-200 text-[10px] space-y-0.5">
                    {meta.engineerRodRate > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>রড কমিশন ({toBengaliDigits(meta.engineerRodKg || rodRingWeight)} কেজি × ৳{toBengaliDigits(meta.engineerRodRate)}):</span>
                        <span className="font-black text-orange-900">৳ {toBengaliDigits(Number(meta.engineerRodCommission || (meta.engineerRodKg * meta.engineerRodRate)).toLocaleString('en-IN'))}</span>
                      </div>
                    )}
                    {meta.engineerCementRate > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>সিমেন্ট কমিশন ({toBengaliDigits(meta.engineerCementBags || cementBags)} বস্তা × ৳{toBengaliDigits(meta.engineerCementRate)}):</span>
                        <span className="font-black text-orange-900">৳ {toBengaliDigits(Number(meta.engineerCementCommission || (meta.engineerCementBags * meta.engineerCementRate)).toLocaleString('en-IN'))}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-orange-950 pt-0.5 border-t border-orange-200 text-xs">
                      <span>মোট অর্জিত কমিশন:</span>
                      <span>৳ {toBengaliDigits(Number(meta.engineerTotalCommission || (invoice as any).engineerTotalCommission || 0).toLocaleString('en-IN'))}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card 3: ডেলিভারি / পরিবহন তথ্য */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
            <Truck className="w-4 h-4 text-emerald-600" />
            <h3>ডেলিভারি ও পরিবহন তথ্য</h3>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            {siteName && (
              <div className="flex justify-between items-center bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                <span className="text-emerald-800 font-bold flex items-center gap-1">📍 প্রজেক্ট / সাইটের নাম</span>
                <span className="font-black text-emerald-950 text-right">{siteName}</span>
              </div>
            )}

            <div className="flex justify-between items-start">
              <span className="text-slate-500 shrink-0">ডেলিভারি ঠিকানা</span>
              <span className="font-bold text-slate-800 text-right leading-tight">{deliveryAddress || '—'}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">সাইট কন্টাক্ট</span>
              <span className="font-bold text-slate-800">{siteContact || '—'}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">গাড়ি / ট্রাক নম্বর</span>
              <span className="font-mono font-bold text-slate-900">{vehicleNo ? toBengaliDigits(vehicleNo) : '—'}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">ড্রাইভারের নাম</span>
              <span className="font-bold text-slate-800">{driverName || '—'}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">ড্রাইভার মোবাইল</span>
              <span className="font-mono font-bold text-slate-800">{driverPhone ? toBengaliDigits(driverPhone) : '—'}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">ডেলিভারি তারিখ</span>
              <span className="font-mono font-bold text-slate-800">{dateStr}</span>
            </div>
          </div>
        </div>

      </div>

      {/* --- SECTION 2: 📋 পণ্যের বিবরণ --- */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
          <ClipboardList className="w-4 h-4 text-emerald-600" />
          <h3>পণ্যের বিবরণ</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse text-slate-800">
            <thead>
              <tr className="bg-slate-50 font-bold border-y border-slate-200 text-slate-700 text-center">
                <th className="py-2.5 px-2 w-[6%]">ক্রমিক</th>
                <th className="py-2.5 px-3 text-left w-[32%]">পণ্যের নাম ও বিবরণ</th>
                <th className="py-2.5 px-2 w-[14%]">ব্র্যান্ড</th>
                <th className="py-2.5 px-2 w-[14%]">গ্রেড/সাইজ</th>
                <th className="py-2.5 px-2 w-[10%]">পরিমাণ</th>
                <th className="py-2.5 px-2 w-[8%]">একক</th>
                <th className="py-2.5 px-2 text-right w-[12%]">একক মূল্য (৳)</th>
                <th className="py-2.5 px-3 text-right w-[14%]">মোট মূল্য (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-400 font-bold">কোনো পণ্য নির্বাচন করা হয়নি</td>
                </tr>
              ) : (
                items.map((item: any, idx: number) => {
                  const itemPrice = Number(item.price || 0);
                  const itemQty = Number(item.quantity || 0);
                  const itemTotal = Number(item.total || ((itemPrice - Number(item.discount || 0)) * itemQty));

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
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-2 text-center font-bold text-slate-600">
                        {toBengaliDigits(idx + 1)}
                      </td>
                      <td className="py-2.5 px-3 text-left font-bold text-slate-900">
                        <span>{cleanLegacyBengaliText(item.name)}</span> <span className="text-slate-500 text-[11px] font-normal">{bundleInfo}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-600">
                        {item.brand || '—'}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-600">
                        {item.variant || '—'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900">
                        {toBengaliDigits(itemQty.toLocaleString('en-IN'))}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-600">
                        {isRing ? 'কেজি' : (item.unit || 'পিস')}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                        ৳ {toBengaliDigits(itemPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                        ৳ {toBengaliDigits(itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="flex justify-between items-center border-t border-slate-200 pt-3 text-xs font-bold text-slate-700 px-1">
          <span>মোট মালামাল প্রকার: {toBengaliDigits(items.length)} টি</span>
          <span>মোট মালামাল পরিমাণ: {totalQuantitySummary || '০ পিস'}</span>
        </div>

      </div>

      {/* --- SECTION 3: 2 CARDS (FINANCIAL BREAKDOWN & PAYMENT DETAILS) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Card 1: মোট হিসাব ও বকেয়া বিবরণী */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <h3>মোট হিসাব ও বকেয়া বিবরণী</h3>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">পণ্যের মোট মূল্য</span>
              <span className="font-mono font-bold text-slate-900">৳ {toBengaliDigits(subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between items-center text-rose-600">
                <span className="text-slate-500">বিশেষ ছাড় {discountPercent > 0 ? `(${toBengaliDigits(discountPercent)}%)` : ''}</span>
                <span className="font-mono font-bold">- ৳ {toBengaliDigits(discount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>
            )}

            {shippingCost > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-slate-500">
                    পরিবহন ভাড়া / গাড়ি ভাড়া {shippingCostToCustomer ? '(কাস্টমার প্রদেয়)' : '(দোকান প্রদেয় - বিলে যুক্ত নয়)'}
                  </span>
                  {(rodShippingRate > 0 || cementShippingRate > 0) && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      {rodShippingRate > 0 ? `রড: ৳${toBengaliDigits(rodShippingRate)}/কেজি ` : ''}
                      {cementShippingRate > 0 ? `সিমেন্ট: ৳${toBengaliDigits(cementShippingRate)}/বস্তা` : ''}
                    </span>
                  )}
                </div>
                <div className="text-right space-y-0.5">
                  {shippingCostToCustomer ? (
                    <span className="font-mono font-bold text-slate-900 block">+ ৳ {toBengaliDigits(shippingCost.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                  ) : (
                    <span className="font-mono font-bold text-emerald-700 block text-xs">দোকান বহন করবে</span>
                  )}
                  <span className={cn(
                    "text-[9px] font-black px-1.5 py-0.2 rounded inline-block",
                    (meta.salesShippingPaid || meta.shippingPaid) 
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                      : "bg-blue-100 text-blue-800 border border-blue-200"
                  )}>
                    {(meta.salesShippingPaid || meta.shippingPaid) ? 'ড্রয়ার থেকে পরিশোধিত' : 'ড্রয়ারে প্রদেয়'}
                  </span>
                </div>
              </div>
            )}

            {(rodLaborCost > 0 || (laborCost > 0 && cementUnloadingCost === 0 && rodUnloadingCost === 0)) && (
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-slate-500">
                    লেবার চার্জ (রড লোডিং) {rodLoadingToCustomer ? '(কাস্টমার প্রদেয়)' : '(দোকান প্রদেয় - বিলে যুক্ত নয়)'}
                  </span>
                  {rodLaborRate > 0 && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      রড: ৳${toBengaliDigits(rodLaborRate)}/কেজি
                    </span>
                  )}
                </div>
                <div className="text-right space-y-0.5">
                  {rodLoadingToCustomer ? (
                    <span className="font-mono font-bold text-slate-900 block">+ ৳ {toBengaliDigits((rodLaborCost > 0 ? rodLaborCost : laborCost).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                  ) : (
                    <span className="font-mono font-bold text-sky-700 block text-xs">দোকান বহন করবে</span>
                  )}
                  <span className={cn(
                    "text-[9px] font-black px-1.5 py-0.2 rounded inline-block",
                    meta.rodLaborPaid 
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  )}>
                    {meta.rodLaborPaid ? 'ড্রয়ার থেকে পরিশোধিত' : 'ড্রয়ারে প্রদেয়'}
                  </span>
                </div>
              </div>
            )}

            {rodUnloadingCost > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-slate-500">
                    রড আনলোডিং লেবার {rodUnloadingToCustomer ? '(কাস্টমার প্রদেয়)' : '(দোকান প্রদেয় - বিলে যুক্ত নয়)'}
                  </span>
                  {rodUnloadingRate > 0 && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      {toBengaliDigits(rodRingWeight)} কেজি @ ৳{toBengaliDigits(rodUnloadingRate)}/কেজি
                    </span>
                  )}
                </div>
                <div className="text-right space-y-0.5">
                  {rodUnloadingToCustomer ? (
                    <span className="font-mono font-bold text-slate-900 block">+ ৳ {toBengaliDigits(rodUnloadingCost.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                  ) : (
                    <span className="font-mono font-bold text-teal-700 block text-xs">দোকান বহন করবে</span>
                  )}
                  <span className={cn(
                    "text-[9px] font-black px-1.5 py-0.2 rounded inline-block",
                    meta.rodUnloadingPaid 
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  )}>
                    {meta.rodUnloadingPaid ? 'ড্রয়ার থেকে পরিশোধিত' : 'ড্রয়ারে প্রদেয়'}
                  </span>
                </div>
              </div>
            )}

            {cementUnloadingCost > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-slate-500">
                    সিমেন্ট আনলোডিং লেবার {cementUnloadingToCustomer ? '(কাস্টমার প্রদেয়)' : '(দোকান প্রদেয় - বিলে যুক্ত নয়)'}
                  </span>
                  {cementUnloadingRate > 0 && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      {toBengaliDigits(cementBags)} বস্তা @ ৳{toBengaliDigits(cementUnloadingRate)}/বস্তা
                    </span>
                  )}
                </div>
                <div className="text-right space-y-0.5">
                  {cementUnloadingToCustomer ? (
                    <span className="font-mono font-bold text-slate-900 block">+ ৳ {toBengaliDigits(cementUnloadingCost.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                  ) : (
                    <span className="font-mono font-bold text-emerald-700 block text-xs">দোকান বহন করবে</span>
                  )}
                  <span className={cn(
                    "text-[9px] font-black px-1.5 py-0.2 rounded inline-block",
                    meta.cementUnloadingPaid 
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  )}>
                    {meta.cementUnloadingPaid ? 'ড্রয়ার থেকে পরিশোধিত' : 'ড্রয়ারে প্রদেয়'}
                  </span>
                </div>
              </div>
            )}

            {Number(meta.cementLaborCost || meta.cementLoadingCharge || (cementLaborRate > 0 && cementBags > 0 ? cementLaborRate * cementBags : 0)) > 0 && (
              <div className={cn(
                "flex justify-between items-center p-2 rounded-lg border text-xs",
                cementLoadingToCustomer ? "bg-amber-50/50 border-amber-200" : "bg-amber-50/80 border-amber-200"
              )}>
                <div className="flex flex-col">
                  <span className="font-bold text-amber-950 flex items-center gap-1">
                    🚚 সিমেন্ট লোডিং চার্জ {cementLoadingToCustomer ? '(কাস্টমার প্রদেয়)' : '(দোকান প্রদেয়)'}
                  </span>
                  <span className="text-[10px] text-amber-800 font-medium">
                    {toBengaliDigits(cementBags)} বস্তা @ ৳{toBengaliDigits(cementLaborRate)}/বস্তা {cementLoadingToCustomer ? '(কাস্টমারের বিলে যুক্ত)' : '(কাস্টমারের বিলে যুক্ত নয়)'}
                  </span>
                </div>
                <div className="text-right space-y-0.5">
                  {cementLoadingToCustomer ? (
                    <span className="font-mono font-black text-amber-900 block text-xs">
                      + ৳ {toBengaliDigits(Number(meta.cementLaborCost || meta.cementLoadingCharge || (cementLaborRate > 0 && cementBags > 0 ? cementLaborRate * cementBags : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                    </span>
                  ) : (
                    <span className="font-mono font-bold text-amber-800 block text-xs">দোকান বহন করবে</span>
                  )}
                  <span className={cn(
                    "text-[9px] font-black px-1.5 py-0.2 rounded inline-block",
                    meta.cementLoadingPaid ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-amber-200 text-amber-900 border border-amber-300"
                  )}>
                    {meta.cementLoadingPaid ? 'ড্রয়ার থেকে পরিশোধিত' : 'ড্রয়ারে প্রদেয়'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold text-slate-900">
              <span>চালান সর্বমোট মূল্য</span>
              <span className="font-mono font-black text-slate-900 text-base">৳ {toBengaliDigits(totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-rose-700 font-bold">
              <span className="text-slate-600">পূর্বের জের / বকেয়া</span>
              <span className="font-mono font-bold text-slate-900">+ ৳ {toBengaliDigits(previousBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>

            <div className="flex justify-between items-center p-2 rounded-lg bg-orange-50 border border-orange-200 font-black text-xs text-orange-950">
              <span>সর্বমোট প্রদেয় বিল (বকেয়াসহ)</span>
              <span className="font-mono text-sm">৳ {toBengaliDigits(grandTotalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
              <span className="text-slate-500">মোট পরিশোধিত জমা</span>
              <span className="font-mono font-bold text-emerald-600">৳ {toBengaliDigits(paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-black text-rose-600 text-sm">সর্বশেষ অবশিষ্ট বকেয়া</span>
              <span className="font-mono font-black text-rose-600 text-lg">৳ {toBengaliDigits(finalGrandDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>
          </div>
        </div>

        {/* Card 2: পেমেন্ট বিবরণী */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h3>পেমেন্ট বিবরণী</h3>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">পেমেন্ট মাধ্যম</span>
              <span className="font-bold text-slate-900">
                {isBankToBank ? '🔄 ব্যাংক-টু-ব্যাংক ট্রান্সফার' :
                 isBank ? '🏦 ব্যাংক ট্রান্সফার' :
                 isCheque ? '📄 চেক পেমেন্ট' :
                 isSplit ? '💵+📄 স্প্লিট পেমেন্ট (ক্যাশ ও চেক)' :
                 pmLower.includes('mobile') ? '📱 মোবাইল ব্যাংকিং' :
                 '💵 নগদ'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">পরিশোধিত পরিমাণ</span>
              <span className="font-mono font-bold text-emerald-600">৳ {toBengaliDigits(paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">পেমেন্ট তারিখ</span>
              <span className="font-mono font-bold text-slate-800">{dateStr}</span>
            </div>

            {/* Detailed Bank-to-Bank Transfer Breakdown */}
            {isBankToBank && (
              <div className="mt-3 space-y-2 text-[11px] font-medium text-slate-800">
                {/* Sender (Customer Bank) */}
                <div className="bg-indigo-50/80 p-2.5 rounded-lg border border-indigo-200 space-y-1.5">
                  <div className="flex items-center justify-between pb-1 border-b border-indigo-200/60">
                    <span className="font-black text-indigo-950 text-xs">🏦 প্রেরক (গ্রাহকের ব্যাংক তথ্য)</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">প্রেরক</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                    <div>
                      <span className="text-slate-500 block text-[10px]">ব্যাংক নাম:</span>
                      <span className="font-bold text-slate-900">{custBank || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">অ্যাকাউন্ট নাম:</span>
                      <span className="font-bold text-slate-900">{custAccName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">অ্যাকাউন্ট নম্বর:</span>
                      <span className="font-mono font-bold text-slate-900">{toBengaliDigits(custAcc || '—')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">শাখা / ব্রাঞ্চ:</span>
                      <span className="font-bold text-slate-900">{custBranch || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Receiver (Shop Bank) */}
                <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200 space-y-1.5">
                  <div className="flex items-center justify-between pb-1 border-b border-emerald-200/60">
                    <span className="font-black text-emerald-950 text-xs">🏦 গ্রহীতা (দোকানের ব্যাংক তথ্য)</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">গ্রহীতা</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                    <div>
                      <span className="text-slate-500 block text-[10px]">ব্যাংক নাম:</span>
                      <span className="font-bold text-slate-900">{shopBank || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">অ্যাকাউন্ট নাম:</span>
                      <span className="font-bold text-slate-900">{shopAccName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">অ্যাকাউন্ট নম্বর:</span>
                      <span className="font-mono font-bold text-slate-900">{toBengaliDigits(shopAcc || '—')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">শাখা / ব্রাঞ্চ:</span>
                      <span className="font-bold text-slate-900">{shopBranch || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Txn / Ref ID */}
                {txnRef && (
                  <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">লেনদেন রেফারেন্স নম্বর:</span>
                    <span className="font-mono text-indigo-700 font-black tracking-wide">{toBengaliDigits(txnRef)}</span>
                  </div>
                )}
              </div>
            )}

            {isBank && !isBankToBank && (
              <div className="mt-2 p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg text-[11px] font-medium space-y-1.5 text-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block text-[10px]">ব্যাংক নাম:</span>
                    <span className="font-bold text-slate-900">{shopBank || custBank || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">অ্যাকাউন্ট নম্বর:</span>
                    <span className="font-mono font-bold text-slate-900">{toBengaliDigits(custAcc || shopAcc || '—')}</span>
                  </div>
                </div>
                {txnRef && (
                  <div className="flex justify-between pt-1 border-t border-blue-200">
                    <span className="font-bold">রেফারেন্স আইডি:</span>
                    <span className="font-mono font-bold text-blue-900">{toBengaliDigits(txnRef)}</span>
                  </div>
                )}
              </div>
            )}

            {isCheque && (
              <div className="mt-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] font-medium space-y-1 text-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block text-[10px]">চেক নম্বর:</span>
                    <span className="font-mono font-black text-amber-950">{toBengaliDigits(chqNo || '—')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">ইস্যু ব্যাংক:</span>
                    <span className="font-bold text-slate-900">{chqBank || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">চেকের তারিখ:</span>
                    <span className="font-mono font-bold text-slate-900">{toBengaliDigits(chqDate || '—')}</span>
                  </div>
                </div>
              </div>
            )}

            {isSplit && (
              <div className="mt-2 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-medium space-y-1 text-slate-800">
                <div className="flex justify-between">
                  <span className="font-bold">নগদ জমা:</span>
                  <span className="font-mono font-bold text-emerald-700">৳ {toBengaliDigits(cashPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">চেক জমা:</span>
                  <span className="font-mono font-bold text-indigo-700">৳ {toBengaliDigits(chequePaid.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                </div>
                {chqNo && (
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">চেক নং:</span>
                    <span className="font-mono font-bold">{toBengaliDigits(chqNo)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-black text-slate-900 text-sm">মোট জমা / পরিশোধিত</span>
              <span className="font-mono font-black text-emerald-600 text-lg">৳ {toBengaliDigits(paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>
          </div>
        </div>

      </div>

      {/* --- SECTION 4: 📝 নোট ও শর্তাবলী --- */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
          <FileText className="w-4 h-4 text-emerald-600" />
          <h3>নোট ও শর্তাবলী</h3>
        </div>

        <div className="space-y-2 text-xs font-medium text-slate-700">
          {cleanUserNote ? (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg leading-relaxed text-slate-800">
              <p className="font-bold text-slate-900 mb-1">কাস্টমার নোট / নির্দেশনা:</p>
              <p>{cleanUserNote}</p>
            </div>
          ) : (
            <p className="text-slate-400 font-bold py-1">• কোনো অতিরিক্ত কাস্টমার নোট প্রদান করা হয়নি।</p>
          )}

          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            • বিক্রিত মালামাল সাইটে হস্তান্তরের পর ফেরত বা বদল করা হয় না। সাইটে গণনা করে মালামাল বুঝে নিন।
          </p>
        </div>
      </div>

      {/* --- SECTION 5: ⚙️ সিস্টেম তথ্য (SYSTEM INFO FOOTER) --- */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm mb-3">
          <Settings className="w-4 h-4 text-emerald-600" />
          <h3>সিস্টেম ও স্বাক্ষরকারী তথ্য</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium text-slate-700">
          <div>
            <span className="text-slate-500 block text-[11px]">প্রস্তুতকারীর নাম</span>
            <span className="font-bold text-slate-900 block pt-0.5">{preparedBy || 'ক্যাশিয়ার'}</span>
            <span className="text-slate-500 font-mono text-[11px] block">{dateStr} {timeStr}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">অনুমোদনকারীর নাম</span>
            <span className="font-bold text-slate-900 block pt-0.5">{authorizedBy || 'ব্যবস্থাপক'}</span>
            <span className="text-slate-500 font-mono text-[11px] block">{dateStr}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">গ্রহীতার নাম / সাইট প্রতিনিধি</span>
            <span className="font-bold text-slate-900 block pt-0.5">{receivedBy || siteContact || invoice.customerName || '—'}</span>
            <span className="text-slate-500 font-mono text-[11px] block">স্বাক্ষর বা প্রাপ্তিস্বীকার</span>
          </div>
        </div>
      </div>

    </div>
  );
};
