'use client';

import React from 'react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { 
  ArrowLeft, Printer, Download, Mail, Edit, 
  Receipt, User, Truck, ClipboardList, CreditCard, Trash2, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toBengaliDigits, parseProductDetails } from '@/lib/bengaliUtils';
import { printElement } from '@/lib/printUtils';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/utils';

export interface PurchaseInvoiceDetailsViewProps {
  invoice: any;
  onBack?: () => void;
  onEdit?: (invoice: any) => void;
  onDelete?: (invoice: any) => void;
  onPrint?: (invoice: any) => void;
  onDownloadPdf?: (invoice: any) => void;
  onSendEmail?: (invoice: any) => void;
  onApprove?: (invoice: any) => void;
}

export const PurchaseInvoiceDetailsView: React.FC<PurchaseInvoiceDetailsViewProps> = ({
  invoice,
  onBack,
  onEdit,
  onDelete,
  onPrint,
  onDownloadPdf,
  onSendEmail,
  onApprove
}) => {
  const { canEditInvoice, canDeleteInvoice } = useAuth();
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

  // Freight & Labor Charges
  const shippingCost = Number(invoice.shippingCost || invoice.transportCost || meta.transportCost || meta.shippingCost || 0);
  const laborCost = Number(invoice.laborCost || meta.laborCost || 0);
  const shippingPayer = (invoice as any).shippingPayer || meta.shippingPayer || 'shop';
  const laborPayer = (invoice as any).laborPayer || meta.laborPayer || 'shop';

  const shippingStatus = meta.shippingStatus || ((invoice as any).shippingStatus) || 'pending';
  const shippingPaidAmount = Number(meta.shippingPaidAmount !== undefined ? meta.shippingPaidAmount : (shippingStatus === 'paid' ? shippingCost : 0));
  const isShippingPaid = shippingCost > 0 && (shippingStatus === 'paid' || shippingPaidAmount >= shippingCost);

  const laborStatus = meta.laborStatus || ((invoice as any).laborStatus) || 'pending';
  const laborPaidAmount = Number(meta.laborPaidAmount !== undefined ? meta.laborPaidAmount : (laborStatus === 'paid' ? laborCost : 0));
  const isLaborPaid = laborCost > 0 && (laborStatus === 'paid' || laborPaidAmount >= laborCost);

  // Freight & Labor Charges Per Unit
  const totalExtra = shippingCost + laborCost;
  const totalQtySum = items.reduce((a: number, i: any) => a + Number(i.quantity || 0), 0);
  const extraPerUnit = totalQtySum > 0 ? (totalExtra / totalQtySum) : 0;

  // Stored sum of item totals in record
  const storedItemsSum = items.reduce((sum: number, i: any) => sum + (Number(i.price || i.buyPrice || 0) * Number(i.quantity || 0)), 0);
  const invoiceTotalInRecord = Number(invoice.totalAmount || 0);

  // Detect if stored item price already contains landed cost (Base + Extra)
  let isStoredAsLandedCost = false;
  if (totalExtra > 0 && storedItemsSum > 0 && invoiceTotalInRecord > 0) {
    if (Math.abs(storedItemsSum - invoiceTotalInRecord) <= 1.0 || (storedItemsSum + totalExtra - invoiceTotalInRecord) > 1.0) {
      isStoredAsLandedCost = true;
    }
  }

  // Base Subtotal (excluding extra shipping & labor charges)
  const subtotal = isStoredAsLandedCost 
    ? Math.max(0, storedItemsSum - totalExtra)
    : (invoice.subtotal ? Number(invoice.subtotal) : storedItemsSum);

  const commission = Number(invoice.commission !== undefined ? invoice.commission : (meta.commission !== undefined ? meta.commission : (meta.commissionAmount || 0)));
  const commissionRate = Number(invoice.commissionRate !== undefined ? invoice.commissionRate : (meta.commissionRate || 0));
  const commissionAdjustment = invoice.commissionAdjustment || meta.commissionAdjustment || 'pending';
  const commissionNote = meta.commissionNote || '';
  const commissionDeduction = commissionAdjustment === 'deduct' ? commission : 0;

  const totalAmount = Math.max(0, subtotal - commissionDeduction + shippingCost + laborCost);

  const paidAmount = Number(invoice.paidAmount || 0);
  const goodsTotal = Math.max(0, subtotal - commissionDeduction);
  const supplierShipCharge = shippingPayer === 'supplier' ? shippingCost : 0;
  const supplierLabCharge = laborPayer === 'supplier' ? laborCost : 0;
  const supplierInvoiceBill = goodsTotal + supplierShipCharge + supplierLabCharge;
  const supplierGoodsDue = meta.supplierDue !== undefined ? Number(meta.supplierDue) : Math.max(0, supplierInvoiceBill - paidAmount);
  const dueAmount = supplierGoodsDue;

  const previousSupplierDue = Number(
    invoice.previousSupplierDue !== undefined ? invoice.previousSupplierDue :
    invoice.previousBalance !== undefined ? invoice.previousBalance :
    invoice.previous_due !== undefined ? invoice.previous_due :
    invoice.supplier_due !== undefined ? invoice.supplier_due :
    invoice.supplier?.due !== undefined ? invoice.supplier?.due :
    meta.previousSupplierDue !== undefined ? meta.previousSupplierDue :
    meta.previousDue !== undefined ? meta.previousDue :
    0
  );
  const grandTotalPayable = supplierGoodsDue + previousSupplierDue;
  const finalGrandDue = Math.max(0, grandTotalPayable);

  // Logistics & Transport Fields
  const vehicleNo = invoice.vehicleNo || meta.vehicleNo || '';
  const driverName = invoice.driverName || invoice.driverInfo || meta.driverName || '';
  const driverPhone = invoice.driverPhone || meta.driverPhone || '';
  const deliveryAddress = invoice.unloadingSite || invoice.deliveryAddress || meta.deliveryAddress || meta.unloadingSite || invoice.supplierAddress || '';
  const warehouse = invoice.warehouse || meta.warehouse || 'প্রধান গুদাম';
  const supplierName = invoice.supplierName || invoice.customerName || 'সাধারণ সরবরাহকারী';
  const supplierContact = invoice.contactPerson || meta.contactPerson || invoice.supplierName || '—';
  const supplierPhone = invoice.supplierPhone || invoice.customerPhone || '';
  const supplierAddress = invoice.supplierAddress || invoice.customerAddress || '—';

  // System Roles
  const preparedBy = invoice.preparedBy || invoice.operatorName || meta.preparedBy || meta.operatorName || 'ক্যাশিয়ার';
  
  // Payment Breakdown Fields
  const paymentMethodName = invoice.paymentMethodName || meta.paymentMethodName || invoice.paymentMethod || 'Cash';
  const pmLower = paymentMethodName.toLowerCase();
  const isBankToBank = pmLower.includes('banktobank') || pmLower.includes('ব্যাংক-টু-ব্যাংক');
  const isBank = pmLower.includes('bank') || pmLower.includes('ব্যাংক');
  const isCheque = pmLower.includes('cheque') || pmLower.includes('check') || pmLower.includes('চেক');
  const isSplit = pmLower.includes('split') || pmLower.includes('স্প্লিট');

  const shopBank = invoice.receiverShopBank || invoice.selectedShopBank || meta.selectedShopBank || meta.receiverShopBank || '';
  const supplierBank = invoice.supplierBankName || meta.supplierBankName || invoice.bankName || meta.bankName || '';
  const supplierAcc = invoice.supplierAccountNo || meta.supplierAccountNo || invoice.accountNo || meta.accountNo || '';
  const txnRef = invoice.supplierTxnRef || meta.supplierTxnRef || invoice.transactionRef || meta.transactionRef || meta.txnRef || '';
  const chqNo = invoice.chequeNo || meta.chequeNo || '';
  const chqDate = invoice.chequeDate || meta.chequeDate || '';
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

  const invoiceNo = invoice.purchaseId || invoice.orderId || (invoice.id ? (invoice.id.startsWith('PUR') ? invoice.id : `PUR-${invoice.id.slice(-6).toUpperCase()}`) : 'PUR-000101');

  return (
    <div className="w-full bg-slate-100 min-h-screen p-4 sm:p-6 font-bengali space-y-4 text-slate-800">
      
      {/* --- TOP HEADER ACTION BAR --- */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Title with Back Button */}
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              onClick={onBack}
              variant="outline"
              size="sm"
              className="rounded-lg h-9 px-3 border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 mr-1 text-slate-600" />
              <span>ফিরে যান</span>
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                ক্রয় ইনভয়েস বিবরণী
              </h1>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {toBengaliDigits(invoiceNo)}
              </span>
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                isPartial ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                'bg-rose-100 text-rose-800 border border-rose-200'
              }`}>
                {isPaid ? 'পরিশোধিত' : isPartial ? 'আংশিক পরিশোধিত' : 'বাকি'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              তারিখ: {dateStr} {timeStr ? `• সময়: ${timeStr}` : ''}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          <Button
            onClick={() => onPrint ? onPrint(invoice) : printElement('printable-memo-wrapper')}
            className="rounded-lg h-9 px-3.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>ক্রয় মেমো প্রিন্ট</span>
          </Button>

          {onDownloadPdf && (
            <Button
              onClick={() => onDownloadPdf(invoice)}
              variant="outline"
              className="rounded-lg h-9 px-3.5 text-xs font-bold text-slate-700 border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
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

          {onDelete && canDeleteInvoice && (
            <Button
              onClick={() => onDelete(invoice)}
              variant="outline"
              className="rounded-lg h-9 px-3.5 text-xs font-bold text-rose-700 border-rose-300 bg-rose-50 hover:bg-rose-100 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>মুছে ফেলুন</span>
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
              <p className="text-sm font-black text-amber-900">এই ক্রয় ইনভয়েসটি এখনো অনুমোদিত হয়নি (অপেক্ষমান / Pending)</p>
              <p className="text-amber-700 font-medium text-[11px]">অনুমোদন করার আগ পর্যন্ত এটি সরবরাহকারীর খতিয়ান (Ledger), নগদ ক্যাশ/ব্যাংক এবং পণ্যের স্টকে কোনো পরিবর্তন করবে না।</p>
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

      {/* --- SECTION 1: 3 CARDS (PURCHASE INFO, SUPPLIER INFO, LOGISTICS INFO) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Card 1: ক্রয়ের তথ্য */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
            <Receipt className="w-4 h-4 text-blue-600" />
            <h3>ক্রয়ের তথ্য</h3>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">ভাউচার / মেমো নং</span>
              <span className="font-mono font-bold text-slate-900">{toBengaliDigits(invoiceNo)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">ক্রয়ের তারিখ</span>
              <span className="font-bold text-slate-800">{dateStr}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">ক্রয়ের ধরন</span>
              <span className="font-bold text-slate-800">পণ্য ক্রয়</span>
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
              <span className="text-slate-500">গ্রহণকারী গোডাউন</span>
              <span className="font-bold text-slate-800">{warehouse}</span>
            </div>

            {preparedBy && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">তৈরি করেছেন</span>
                <span className="font-bold text-slate-800">{preparedBy}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: সরবরাহকারীর তথ্য */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
            <User className="w-4 h-4 text-blue-600" />
            <h3>সরবরাহকারীর তথ্য</h3>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">কোম্পানির নাম</span>
              <span className="font-black text-slate-900 text-sm">{supplierName}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">প্রতিনিধি / কন্টাক্ট</span>
              <span className="font-bold text-slate-800">{supplierContact}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">মোবাইল নম্বর</span>
              <span className="font-mono font-bold text-slate-800">{supplierPhone ? toBengaliDigits(supplierPhone) : '—'}</span>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-slate-500 shrink-0">ঠিকানা</span>
              <span className="font-bold text-slate-800 text-right leading-tight">{supplierAddress}</span>
            </div>

            {previousSupplierDue > 0 && (
              <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                <span className="text-slate-500">পূর্বের পাওনা</span>
                <span className="font-mono font-bold text-slate-900">৳ {toBengaliDigits(previousSupplierDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
              <span className="text-slate-500 font-bold">বর্তমান বাকি দেনা</span>
              <span className="font-mono font-black text-rose-600 text-sm">৳ {toBengaliDigits(finalGrandDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>
          </div>
        </div>

        {/* Card 3: পরিবহন ও ডেলিভারি তথ্য */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
            <Truck className="w-4 h-4 text-blue-600" />
            <h3>পরিবহন ও চালানের তথ্য</h3>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            <div className="flex justify-between items-start">
              <span className="text-slate-500 shrink-0">গন্তব্য গোডাউন</span>
              <span className="font-bold text-slate-800 text-right leading-tight">{deliveryAddress}</span>
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
              <span className="text-slate-500">রিসিভ করার তারিখ</span>
              <span className="font-mono font-bold text-slate-800">{dateStr}</span>
            </div>
          </div>
        </div>

      </div>

      {/* --- SECTION 2: 📋 ক্রয়কৃত পণ্যের বিবরণ --- */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <h3>ক্রয়কৃত পণ্যের বিবরণ</h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            মোট মালামাল: {totalQuantitySummary}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black">
                <th className="py-2.5 px-3 text-center w-12">ক্রমিক</th>
                <th className="py-2.5 px-3">পণ্যের নাম ও বিবরণ</th>
                <th className="py-2.5 px-3 text-center">ব্র্যান্ড</th>
                <th className="py-2.5 px-3 text-center">গ্রেড / সাইজ</th>
                <th className="py-2.5 px-3 text-center">পরিমাণ</th>
                <th className="py-2.5 px-3 text-center">একক</th>
                <th className="py-2.5 px-3 text-right">একক ক্রয় মূল্য (৳)</th>
                <th className="py-2.5 px-3 text-right">মোট পণ্য মূল্য (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                    কোনো পণ্য পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                items.map((item: any, idx: number) => {
                  const storedPrice = Number(item.price || item.buyPrice || 0);
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
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                        {toBengaliDigits(idx + 1)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {item.name}
                        {item.bundle && <span className="text-[11px] font-normal text-slate-500 block">({toBengaliDigits(item.bundle)} বান্ডিল)</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{item.brand || '—'}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-bold">
                        {(() => {
                          const v = item.variant || parseProductDetails(item).sizeName;
                          if (v === 'OPC') return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">OPC</span>;
                          if (v === 'PCC') return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">PCC</span>;
                          return v || '—';
                        })()}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                        {toBengaliDigits(itemQty.toLocaleString('en-IN'))}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{item.unit || 'পিস'}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                        <div className="font-bold">৳ {toBengaliDigits(baseUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</div>
                        {extraPerUnit > 0 && (
                          <div className="text-[10px] text-blue-700 font-extrabold" title="লেবার ও শিপিং ভাড়া সহ কার্যকর একক দর">
                            (খরচসহ ৳ {toBengaliDigits(landedUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }))})
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                        <div className="font-black text-slate-900">৳ {toBengaliDigits(baseItemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</div>
                        {extraPerUnit > 0 && (
                          <div className="text-[10px] text-blue-700 font-extrabold" title="লেবার ও শিপিং ভাড়া সহ কার্যকর মোট বিল">
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

      </div>

      {/* --- SECTION 3: 2 CARDS (FINANCIAL BREAKDOWN & PAYMENT DETAILS) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Card 1: মোট হিসাব ও দেনা বিবরণী */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
            <Receipt className="w-4 h-4 text-blue-600" />
            <h3>মোট হিসাব ও দেনা বিবরণী</h3>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">পণ্যের মোট কেনা মূল্য</span>
              <span className="font-mono font-bold text-slate-900">৳ {toBengaliDigits(subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>

            {commission > 0 && (
              <div className="flex justify-between items-center text-emerald-800 bg-emerald-50/80 p-2 rounded-md border border-emerald-200">
                <div>
                  <span className="font-bold flex items-center gap-1 text-emerald-950">
                    💰 কোম্পানি কমিশন {commissionRate > 0 ? `(রেট: ৳${toBengaliDigits(commissionRate)})` : ''}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold block">
                    {commissionAdjustment === 'pending' ? '🟡 পেন্ডিং কমিশন তালিকায় জমা' : '✂️ চালান বিলে সরাসরি কর্তন/ছাড়'}
                  </span>
                </div>
                <span className="font-mono font-black text-emerald-800">৳ {toBengaliDigits(commission.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1 border-t border-slate-100 font-bold text-slate-900">
              <span className="text-slate-700">কোম্পানির পণ্যের পাওনা</span>
              <span className="font-mono font-black text-indigo-700">৳ {toBengaliDigits(goodsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>

            {shippingCost > 0 && (
              <div className="flex justify-between items-center text-blue-700 bg-blue-50/60 p-1.5 rounded-md border border-blue-100">
                <span className="text-blue-900 font-bold flex items-center gap-1">
                  🚚 পরিবহন / গাড়ি ভাড়া{' '}
                  <span className={cn(
                    "text-[10px] px-1 py-0.5 rounded",
                    shippingPayer === 'supplier' 
                      ? "bg-orange-100 text-orange-800 font-bold" 
                      : isShippingPaid
                        ? "bg-emerald-100 text-emerald-800 font-bold"
                        : "bg-blue-100 text-blue-800 font-normal"
                  )}>
                    {shippingPayer === 'supplier' 
                      ? '(সাপ্লায়ারের লেজারে যুক্ত)' 
                      : isShippingPaid 
                        ? '(ড্রয়ার থেকে পরিশোধিত)' 
                        : '(ট্রাক ভাড়া খাতায় যুক্ত)'}
                  </span>
                </span>
                <span className="font-mono font-bold">+ ৳ {toBengaliDigits(shippingCost.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>
            )}

            {laborCost > 0 && (
              <div className="flex justify-between items-center text-amber-700 bg-amber-50/60 p-1.5 rounded-md border border-amber-100">
                <span className="text-amber-900 font-bold flex items-center gap-1">
                  🏗️ আনলোডিং / লেবার চার্জ{' '}
                  <span className={cn(
                    "text-[10px] px-1 py-0.5 rounded",
                    laborPayer === 'supplier' 
                      ? "bg-orange-100 text-orange-800 font-bold" 
                      : isLaborPaid
                        ? "bg-emerald-100 text-emerald-800 font-bold"
                        : "bg-amber-100 text-amber-800 font-normal"
                  )}>
                    {laborPayer === 'supplier' 
                      ? '(সাপ্লায়ারের লেজারে যুক্ত)' 
                      : isLaborPaid 
                        ? '(ড্রয়ার থেকে পরিশোধিত)' 
                        : '(লেবার খরচ খাতায় যুক্ত)'}
                  </span>
                </span>
                <span className="font-mono font-bold">+ ৳ {toBengaliDigits(laborCost.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold text-slate-900">
              <span>চালানের সর্বমোট খরচ</span>
              <span className="font-mono font-black text-slate-900 text-base">৳ {toBengaliDigits(totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-rose-700 font-bold">
              <span className="text-slate-600">কোম্পানির পূর্বের পাওনা / বকেয়া</span>
              <span className="font-mono font-bold text-slate-900">+ ৳ {toBengaliDigits(previousSupplierDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>

            <div className="flex justify-between items-center p-2 rounded-lg bg-blue-50 border border-blue-200 font-black text-xs text-blue-950">
              <span>সর্বমোট প্রদেয় বিল (বকেয়াসহ)</span>
              <span className="font-mono text-sm">৳ {toBengaliDigits(grandTotalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
              <span className="text-slate-500">আজকের পরিশোধিত জমা</span>
              <span className="font-mono font-bold text-emerald-600">৳ {toBengaliDigits(paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-black text-rose-600 text-sm">সর্বশেষ অবশিষ্ট দেনা</span>
              <span className="font-mono font-black text-rose-600 text-lg">৳ {toBengaliDigits(finalGrandDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>
          </div>
        </div>

        {/* Card 2: পেমেন্ট বিস্তারিত ও ব্যাংক অ্যাকাউন্ট তথ্য */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-black text-sm">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <h3>পেমেন্ট বিস্তারিত ও ব্যাংক অ্যাকাউন্ট তথ্য</h3>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">পেমেন্ট মাধ্যম</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {isBankToBank ? '🔄 ব্যাংক-টু-ব্যাংক ট্রান্সফার' :
                 isBank ? '🏦 ব্যাংক ট্রান্সফার' :
                 isCheque ? '📄 চেক' :
                 isSplit ? '💵+📄 স্প্লিট পেমেন্ট (ক্যাশ ও চেক)' :
                 '💵 নগদ'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">কোম্পানির পণ্যের পরিশোধ</span>
              <span className="font-mono font-bold text-emerald-600">৳ {toBengaliDigits(paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
            </div>

            {(shippingCost > 0 || laborCost > 0) && (
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 block border-b border-slate-200/60 pb-1">পরিবহন ও লেবার পরিশোধের বিবরণ:</span>
                {shippingCost > 0 && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-600">• গাড়ি ভাড়া (৳ {toBengaliDigits(shippingCost.toLocaleString('en-IN'))}):</span>
                    <span className={cn(
                      "font-bold px-1.5 py-0.5 rounded text-[10px]",
                      shippingPayer === 'supplier' ? "bg-orange-100 text-orange-800" :
                      isShippingPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    )}>
                      {shippingPayer === 'supplier' ? 'সাপ্লায়ার বহন করবে' :
                       isShippingPaid ? 'পরিশোধিত (ক্যাশ)' : 'ড্রয়ারে প্রদেয় / অপেক্ষমান'}
                    </span>
                  </div>
                )}
                {laborCost > 0 && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-600">• লেবার চার্জ (৳ {toBengaliDigits(laborCost.toLocaleString('en-IN'))}):</span>
                    <span className={cn(
                      "font-bold px-1.5 py-0.5 rounded text-[10px]",
                      laborPayer === 'supplier' ? "bg-orange-100 text-orange-800" :
                      isLaborPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    )}>
                      {laborPayer === 'supplier' ? 'সাপ্লায়ার বহন করবে' :
                       isLaborPaid ? 'পরিশোধিত (ক্যাশ)' : 'ড্রয়ারে প্রদেয় / অপেক্ষমান'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* SPLIT PAYMENT BREAKDOWN */}
            {isSplit && (
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">• নগদ প্রদান</span>
                  <span className="font-mono font-bold text-emerald-700">৳ {toBengaliDigits(cashPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">• চেক প্রদান</span>
                  <span className="font-mono font-bold text-blue-700">৳ {toBengaliDigits(chequePaid.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                </div>
              </div>
            )}

            {/* BANK DETAILS */}
            {(isBank || isBankToBank) && (
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1.5 text-blue-950">
                {shopBank && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">• প্রেরক ব্যাংক (দোকান)</span>
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
                    <span className="text-slate-600">• অ্যাকাউন্ট নম্বর</span>
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

            {/* CHEQUE DETAILS */}
            {(isCheque || isSplit) && (chqNo || chqDate) && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                {chqNo && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">• চেক নম্বর</span>
                    <span className="font-mono font-bold text-slate-900">{toBengaliDigits(chqNo)}</span>
                  </div>
                )}
                {chqDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">• চেকের তারিখ</span>
                    <span className="font-mono font-bold text-slate-900">{toBengaliDigits(chqDate)}</span>
                  </div>
                )}
              </div>
            )}

            {cleanUserNote && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block mb-1">নোট / মন্তব্য:</span>
                <p className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 italic">
                  {cleanUserNote}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
