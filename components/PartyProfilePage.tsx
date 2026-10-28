'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import { 
  Phone, MapPin, Building2, Receipt, Download, Printer, FileSpreadsheet,
  CreditCard, ChevronLeft, ChevronRight, Filter, Calendar, RotateCcw,
  MoreVertical, ChevronFirst, ChevronLast, Mail, FileText,
  FilePlus, Edit3, UserCheck, MessageSquare, X, Truck, Users, Trash2,
  Plus, CheckCircle2, Clock, AlertCircle, Search, HandCoins, DollarSign,
  Lock, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { InvoiceMemo } from '@/components/InvoiceMemo';
import { PurchaseInvoiceMemo } from '@/components/PurchaseInvoiceMemo';
import { PaymentVoucherMemo } from '@/components/PaymentVoucherMemo';
import { SalesInvoiceDetailsView } from '@/components/SalesInvoiceDetailsView';
import { PurchaseInvoiceDetailsView } from '@/components/PurchaseInvoiceDetailsView';
import { PaymentVoucherDetailsView } from '@/components/PaymentVoucherDetailsView';
import { SalesReturnDetailsView } from '@/components/SalesReturnDetailsView';
import { ReturnInvoiceMemo } from '@/components/ReturnInvoiceMemo';
import { BengaliDateRangePicker } from '@/components/ui/BengaliDateRangePicker';
import { printElement } from '@/lib/printUtils';
import { useAuth } from '@/lib/authContext';
import { PartyLedgerPrintMemo } from '@/components/PartyLedgerPrintMemo';
import { DataImportModal } from '@/components/DataImportModal';
import { cleanLegacyBengaliText, toEnglishDigits } from '@/lib/bengaliUtils';
import { computeSiteAdvanceAdjustments } from '@/lib/ledgerUtils';

export const toBnDigits = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  return String(val).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);
};

export interface PartyProfile {
  id: string; 
  name: string; 
  phone: string; 
  altPhone?: string;
  address: string; 
  country?: string;
  division?: string;
  district?: string;
  thana?: string;
  postcode?: string;
  businessName?: string;
  email?: string;
  customerCode?: string;
  supplierCode?: string;
  creditLimit?: number;
  creditDays?: number;
  openingBalance?: number;
  discountPercent?: number;
  rodCommissionRate?: number;
  cementCommissionRate?: number;
  idType?: string;
  nid?: string;
  tinNumber?: string;
  referencePerson?: string;
  joinedDate?: string;
  photoUrl?: string;
  customerType?: string;
  supplyType?: string;
  note?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  totalDue?: number;
  totalSales?: number;
  advanceBalance?: number;
  advance_balance?: number;
  sites?: Array<{ id: number | string; name: string; address?: string; contact_person?: string; contact_phone?: string }>;
}

export interface TransactionDoc {
  id: string; 
  orderId?: string;
  invoiceNo?: string;
  customerName?: string; 
  customerId?: string;
  customerPhone?: string;
  customerAddress?: string;
  siteName?: string;
  siteAddress?: string;
  siteContact?: string;
  supplierName?: string; 
  supplierId?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  items?: any[];
  paymentMethod?: string;
  chequeNo?: string;
  bankName?: string;
  chequeStatus?: 'pending' | 'cleared' | 'bounced';
  note?: string;
  notes?: string;
  transactionType?: string;
  status?: string;
  subtotal?: number;
  discount?: number;
  shippingCost?: number;
  laborCost?: number;
  shippingPayer?: 'shop' | 'supplier';
  laborPayer?: 'shop' | 'supplier';
  shippingStatus?: 'pending' | 'paid' | 'partial' | 'overpaid';
  laborStatus?: 'pending' | 'paid' | 'partial' | 'overpaid';
  shippingPaidAmount?: number;
  laborPaidAmount?: number;
  previousBalance?: number;
  description?: string;
  createdAt: any;
}

export interface LedgerEntry {
  id: string;
  date: Date;
  refNo: string;
  type: 'SALE' | 'PURCHASE' | 'PAYMENT' | 'CHEQUE_PENDING' | 'CHEQUE_CLEARED' | 'ADJUSTMENT' | 'RETURN';
  description: string;
  invoiceNo?: string;
  debit: number;
  credit: number;
  runningBalance: number;
  paymentMethod: string;
  chequeNo?: string;
  bankName?: string;
  chequeStatus?: string;
  isBold?: boolean;
  orderId?: string;
  dueAmount?: number;
  account?: string;
}

export const isRodItem = (it: any): boolean => {
  if (!it) return false;
  const name = (it.product_name || it.name || '').toLowerCase();
  const unit = (it.unit || '').toLowerCase();
  const cat = (it.category || it.category_name || '').toLowerCase();
  return cat.includes('রড') || cat.includes('rod') || cat.includes('রিং') || cat.includes('ring') ||
         name.includes('রড') || name.includes('rod') || name.includes('রিং') || name.includes('ring') ||
         name.includes('মিলি') || name.includes('mm') ||
         unit.includes('কেজি') || unit.includes('টন') || unit.includes('ton') || unit.includes('kg');
};

export const isCementItem = (it: any): boolean => {
  if (!it) return false;
  const name = (it.product_name || it.name || '').toLowerCase();
  const unit = (it.unit || '').toLowerCase();
  const cat = (it.category || it.category_name || '').toLowerCase();
  return cat.includes('সিমেন্ট') || cat.includes('cement') ||
         name.includes('সিমেন্ট') || name.includes('cement') ||
         unit.includes('বস্তা') || unit.includes('ব্যাগ') || unit.includes('bag');
};

export function generateLedgerEntries(
  party: PartyProfile | null,
  transactions: TransactionDoc[],
  isCustomer: boolean,
  isEngineer: boolean = false,
  categoryFilter: 'all' | 'rod' | 'cement' = 'all'
): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  let cumulativeBalance = 0;

  // 1. Opening Balance (Only shown when viewing all products)
  if (categoryFilter === 'all' && party && Number(party.openingBalance || 0) !== 0) {
    const opBal = Number(party.openingBalance);
    cumulativeBalance += opBal;
    entries.push({
      id: 'opening-balance',
      date: new Date(party.joinedDate || party.createdAt || '2026-01-01'),
      refNo: 'OP-BAL',
      type: 'ADJUSTMENT',
      description: opBal < 0 
        ? (isEngineer ? 'প্রারম্ভিক অগ্রিম কমিশন (Opening Advance)' : 'প্রারম্ভিক অগ্রিম জমা (Opening Advance)')
        : (isEngineer ? 'পূর্বের প্রারম্ভিক কমিশন পাওনা (Opening Balance)' : 'পূর্বের প্রারম্ভিক বকেয়া (Opening Balance)'),
      invoiceNo: '—',
      debit: opBal > 0 ? opBal : 0,
      credit: opBal < 0 ? Math.abs(opBal) : 0,
      runningBalance: cumulativeBalance,
      paymentMethod: '—',
      dueAmount: opBal > 0 ? opBal : 0
    });
  }

  const sorted = [...transactions].sort((a, b) => {
    const da = new Date(a.createdAt || 0);
    const db = new Date(b.createdAt || 0);
    return da.getTime() - db.getTime();
  });

  sorted.forEach(tx => {
    // Unapproved / pending invoices must NEVER affect customer ledger or running balance
    if (tx.status === 'cancelled' || tx.status === 'rejected' || tx.status === 'pending' || tx.status === 'draft') {
      return;
    }
    
    let userNote = tx.note || tx.notes || '';
    if (userNote && typeof userNote === 'string' && userNote.trim().startsWith('{')) {
      try {
        const firstLine = userNote.split('\n')[0];
        const parsed = JSON.parse(firstLine);
        if (parsed.userNote !== undefined) {
          userNote = parsed.userNote;
        } else if (userNote.includes('\n')) {
          userNote = userNote.substring(firstLine.length).trim();
        } else {
          userNote = '';
        }
      } catch {}
    }

    const txDate = tx.createdAt ? new Date(tx.createdAt) : new Date();
    const txType = tx.transactionType;

    if (isEngineer) {
      // --- ENGINEER COMMISSION LEDGER LOGIC ---
      if (txType === 'sale' || !txType) {
        let meta: any = {};
        if (tx.notes && typeof tx.notes === 'string' && tx.notes.trim().startsWith('{')) {
          try { meta = JSON.parse(tx.notes.split('\n')[0]); } catch {}
        }
        const comm = Number(meta.engineerTotalCommission || (tx as any).engineerTotalCommission || 0);
        const rodKg = Number(meta.engineerRodKg || (tx as any).engineerRodKg || 0);
        const rodRate = Number(meta.engineerRodRate || (tx as any).engineerRodRate || 0);
        const cemBags = Number(meta.engineerCementBags || (tx as any).engineerCementBags || 0);
        const cemRate = Number(meta.engineerCementRate || (tx as any).engineerCementRate || 0);

        const effectiveComm = comm > 0 ? comm : (rodKg * rodRate + cemBags * cemRate);
        if (effectiveComm > 0) {
          cumulativeBalance += effectiveComm;
          const invNo = tx.invoiceNo || tx.orderId || `INV-${tx.id.slice(0, 5).toUpperCase()}`;

          let desc = `বিক্রয় চালান কমিশন (চালান: #${invNo} | কাস্টমার: ${tx.customerName || 'খুচরা গ্রাহক'}`;
          if (rodKg > 0) desc += ` | রড: ${toBnDigits(rodKg)} কেজি @ ৳${toBnDigits(rodRate)}`;
          if (cemBags > 0) desc += ` | সিমেন্ট: ${toBnDigits(cemBags)} বস্তা @ ৳${toBnDigits(cemRate)}`;
          desc += `)`;

          entries.push({
            id: `${tx.id}-comm`,
            date: txDate,
            refNo: invNo,
            type: 'SALE',
            description: desc,
            invoiceNo: invNo,
            debit: effectiveComm,
            credit: 0,
            runningBalance: cumulativeBalance,
            paymentMethod: '—',
            orderId: tx.id,
            dueAmount: effectiveComm
          });
        }
      } else if (txType === 'payment_out' || txType === 'payment_in' || txType === 'payment') {
        const creditVal = Number(tx.paidAmount || tx.totalAmount || 0);
        cumulativeBalance -= creditVal;
        const payNo = tx.invoiceNo || `PAY-2026-${tx.id.slice(0, 5).toUpperCase()}`;

        let pMethodLabel = 'নগদ';
        if (tx.paymentMethod === 'bank') pMethodLabel = 'ব্যাংক ট্রান্সফার';
        else if (tx.paymentMethod === 'cheque' || tx.chequeNo) {
          pMethodLabel = `চেক (${tx.bankName ? tx.bankName + ' - ' : ''}নম্বর: ${tx.chequeNo || '—'})`;
        } else if (tx.paymentMethod === 'bkash' || tx.paymentMethod === 'mobile') {
          pMethodLabel = 'মোবাইল ব্যাংকিং';
        }

        entries.push({
          id: `${tx.id}-payment`,
          date: txDate,
          refNo: payNo,
          type: 'PAYMENT',
          description: `কমিশন প্রদান / পরিশোধ [পদ্ধতি: ${pMethodLabel}]${userNote ? ` - ${userNote}` : ''}`,
          invoiceNo: '—',
          debit: 0,
          credit: creditVal,
          runningBalance: cumulativeBalance,
          paymentMethod: pMethodLabel,
          orderId: tx.id,
          dueAmount: 0
        });
      }
    } else {
      // --- CUSTOMER / SUPPLIER NORMAL LEDGER LOGIC ---
      if (txType === 'payment_in' || txType === 'payment_out') {
        if (categoryFilter !== 'all') return;
        const paidVal = Number(tx.paidAmount || 0);
        const discountVal = Number(tx.discount || 0);
        // If paidAmount is 0 and totalAmount was set to discount, use paidAmount + discount
        const creditVal = (paidVal > 0) ? paidVal : (Number(tx.totalAmount || 0) === discountVal ? 0 : Number(tx.totalAmount || 0));
        const totalCredit = creditVal + discountVal;
        cumulativeBalance -= totalCredit;

        const rcvPrefix = isCustomer ? 'RCV-2026-' : 'PAY-2026-';
        const rcvNo = tx.invoiceNo || `${rcvPrefix}${tx.id.slice(0, 5).toUpperCase()}`;

        let pMethodLabel = 'নগদ';
        if (tx.paymentMethod === 'bank') pMethodLabel = 'ব্যাংক ট্রান্সফার';
        else if (tx.paymentMethod === 'cheque' || tx.chequeNo) {
          pMethodLabel = `চেক (${tx.bankName ? tx.bankName + ' - ' : ''}নম্বর: ${tx.chequeNo || '—'})`;
        } else if (tx.paymentMethod === 'bkash' || tx.paymentMethod === 'mobile') {
          pMethodLabel = 'মোবাইল ব্যাংকিং';
        }

        const payDesc = isCustomer 
          ? `টাকা প্রাপ্তি / পেমেন্ট জমা [পদ্ধতি: ${pMethodLabel}]${discountVal > 0 ? ` (ছাড়: ৳${toBnDigits(discountVal)})` : ''}${userNote ? ` - ${userNote}` : ''}`
          : `পেমেন্ট পরিশোধ [পদ্ধতি: ${pMethodLabel}]${discountVal > 0 ? ` (ছাড়: ৳${toBnDigits(discountVal)})` : ''}${userNote ? ` - ${userNote}` : ''}`;

        entries.push({
          id: `${tx.id}-payment`,
          date: txDate,
          refNo: rcvNo,
          type: 'PAYMENT',
          description: payDesc,
          invoiceNo: '—',
          debit: 0,
          credit: totalCredit,
          runningBalance: cumulativeBalance,
          paymentMethod: pMethodLabel,
          orderId: tx.id,
          dueAmount: 0
        });
      } else if (txType === 'loan_in') {
        if (categoryFilter !== 'all') return;
        const loanAmount = Number(tx.totalAmount || tx.paidAmount || 0);
        cumulativeBalance += loanAmount;
        const loanNo = tx.invoiceNo || `LOAN-${tx.id.slice(0, 5).toUpperCase()}`;

        let pMethodLabel = 'নগদ';
        if (tx.paymentMethod === 'bank') pMethodLabel = 'ব্যাংক জমা';
        else if (tx.paymentMethod === 'cheque' || tx.chequeNo) {
          pMethodLabel = `চেক (${tx.bankName ? tx.bankName + ' - ' : ''}নম্বর: ${tx.chequeNo || '—'})`;
        } else if (tx.paymentMethod === 'bkash' || tx.paymentMethod === 'mobile') {
          pMethodLabel = 'মোবাইল ব্যাংকিং';
        }

        const loanDesc = `লোন গ্রহণ / ঋণ গ্রহণ [পদ্ধতি: ${pMethodLabel}]${userNote ? ` - ${userNote}` : ''}`;

        entries.push({
          id: `${tx.id}-loan`,
          date: txDate,
          refNo: loanNo,
          type: 'PURCHASE',
          description: loanDesc,
          invoiceNo: loanNo,
          debit: loanAmount,
          credit: 0,
          runningBalance: cumulativeBalance,
          paymentMethod: pMethodLabel,
          orderId: tx.id,
          dueAmount: 0
        });
      } else if (txType === 'sale_return' || txType === 'purchase_return') {
        const returnAmount = Number(tx.totalAmount || 0);
        const refundPaid = Number(tx.paidAmount || 0);
        cumulativeBalance -= returnAmount;
        const retPrefix = isCustomer ? 'RET-2026-' : 'PRET-2026-';
        const retNo = tx.invoiceNo || `${retPrefix}${tx.id.slice(0, 5).toUpperCase()}`;

        // Format detailed items for return
        const rawRetItems = tx.items || [];
        let relevantRetItems = rawRetItems;
        if (categoryFilter === 'rod') {
          relevantRetItems = rawRetItems.filter(isRodItem);
          if (rawRetItems.length > 0 && relevantRetItems.length === 0) return;
        } else if (categoryFilter === 'cement') {
          relevantRetItems = rawRetItems.filter(isCementItem);
          if (rawRetItems.length > 0 && relevantRetItems.length === 0) return;
        }

        let returnDesc = '';
        if (relevantRetItems.length > 0) {
          const itemSummary = relevantRetItems.map((it: any) => {
            const name = cleanLegacyBengaliText(it.product_name || it.name || 'পণ্য');
            const qty = toBnDigits(it.quantity || 1);
            const unit = it.unit || 'টি';
            const price = it.price ? `@ ৳${toBnDigits(Number(it.price).toLocaleString('en-IN'))}` : '';
            return `${name} (${qty} ${unit} ${price})`.trim();
          }).join(', ');
          returnDesc = `${isCustomer ? 'পণ্য ফেরত (বিক্রয় ফেরত)' : 'পণ্য ফেরত (ক্রয় ফেরত)'}: ${itemSummary}`;
          if (tx.note && !tx.note.includes('পণ্য ফেরত ও বকেয়া এডজাস্ট') && tx.note !== 'পণ্য ফেরত' && tx.note !== 'খুচরা বকেয়া মওকুফ') {
            returnDesc += ` [বিবরণ: ${tx.note}]`;
          }
        } else {
          if (categoryFilter !== 'all') return;
          returnDesc = `${isCustomer ? 'পণ্য ফেরত (বিক্রয় ফেরত)' : 'পণ্য ফেরত (ক্রয় ফেরত)'} (${tx.note || 'পণ্য ফেরত জমা'})`;
        }

        entries.push({
          id: `${tx.id}-return`,
          date: txDate,
          refNo: retNo,
          type: 'RETURN',
          description: returnDesc,
          invoiceNo: retNo,
          debit: 0,
          credit: returnAmount,
          runningBalance: cumulativeBalance,
          paymentMethod: '—',
          orderId: tx.id,
          dueAmount: 0
        });

        if (refundPaid > 0) {
          cumulativeBalance += refundPaid;
          let retPayMethod = 'নগদ';
          if (tx.paymentMethod === 'bank') retPayMethod = 'ব্যাংক';
          else if (tx.paymentMethod === 'mobile_banking' || tx.paymentMethod === 'mobile' || tx.paymentMethod === 'bkash') retPayMethod = 'মোবাইল ব্যাংকিং';

          entries.push({
            id: `${tx.id}-refund`,
            date: txDate,
            refNo: `${retNo}-PAY`,
            type: 'PAYMENT',
            description: `${isCustomer ? 'নগদ ক্যাশ ফেরত প্রদান' : 'ফেরত প্রাপ্তি ক্যাশ গ্রহণ'} (চালান #${retNo})`,
            invoiceNo: retNo,
            debit: refundPaid,
            credit: 0,
            runningBalance: cumulativeBalance,
            paymentMethod: retPayMethod,
            orderId: tx.id,
            dueAmount: 0
          });
        }
      } else {
        // Normal Sale or Purchase
        const invPrefix = isCustomer ? 'INV-2026-' : 'PUR-2026-';
        const invNo = tx.invoiceNo || `${invPrefix}${tx.id.slice(0, 5).toUpperCase()}`;

        let meta: any = {};
        if (tx.notes && typeof tx.notes === 'string' && tx.notes.trim().startsWith('{')) {
          try {
            meta = JSON.parse(tx.notes.split('\n')[0]);
          } catch {}
        }

        const invDiscount = Number(tx.discount) > 0 
          ? Number(tx.discount) 
          : Number(meta.discountFlat || meta.discount || meta.discountAmount || meta.cartTotalDiscount || meta.commission || meta.commissionAmount || 0);

        const rawItems = tx.items || [];
        const isRodOnly = categoryFilter === 'rod';
        const isCementOnly = categoryFilter === 'cement';

        let relevantItems = rawItems;
        if (isRodOnly) {
          relevantItems = rawItems.filter(isRodItem);
          if (rawItems.length > 0 && relevantItems.length === 0) return;
        } else if (isCementOnly) {
          relevantItems = rawItems.filter(isCementItem);
          if (rawItems.length > 0 && relevantItems.length === 0) return;
        }

        if (rawItems.length === 0 && categoryFilter !== 'all') {
          const descStr = `${tx.description || ''} ${tx.notes || ''}`.toLowerCase();
          if (isRodOnly && !descStr.includes('রড') && !descStr.includes('rod') && !descStr.includes('রিং')) return;
          if (isCementOnly && !descStr.includes('সিমেন্ট') && !descStr.includes('cement')) return;
        }

        let itemDesc = relevantItems.length > 0
          ? relevantItems.map((it: any) => {
              const name = cleanLegacyBengaliText(it.product_name || it.name || 'পণ্য');
              const qty = toBnDigits(it.quantity || 1);
              const unit = it.unit || 'টি';
              const price = it.price ? `@ ৳${toBnDigits(Number(it.price).toLocaleString('en-IN'))}` : '';
              return `${name} (${qty} ${unit} ${price})`.trim();
            }).join(', ')
          : (isCustomer ? 'পণ্য বিক্রয় (চালান)' : 'পণ্য ক্রয় (চালান)');

        if (invDiscount > 0 && categoryFilter === 'all') {
          itemDesc += ` [ছাড়: ৳${toBnDigits(invDiscount.toLocaleString('en-IN'))}]`;
        }

        const shipCost = Number(meta.shippingCost || (tx as any).shippingCost || (tx as any).shipping_cost || (tx as any).transportCost || 0);
        const labCost = Number(meta.laborCost || (tx as any).laborCost || (tx as any).labor_cost || 0);
        const shipPayer = meta.shippingPayer || (tx as any).shippingPayer || 'shop';
        const laborPayer = meta.laborPayer || (tx as any).laborPayer || 'shop';
        const isPurchaseTx = !isCustomer || tx.transactionType === 'purchase';

        if (isPurchaseTx) {
          const goodsVal = Number(tx.subtotal) > 0 
            ? Math.max(0, Number(tx.subtotal) - invDiscount)
            : Math.max(0, Number(tx.totalAmount || 0) - (shipCost + labCost) - invDiscount);

          cumulativeBalance += goodsVal;

          entries.push({
            id: `${tx.id}-bill`,
            date: txDate,
            refNo: invNo,
            type: 'PURCHASE',
            description: itemDesc,
            invoiceNo: invNo,
            debit: goodsVal,
            credit: 0,
            runningBalance: cumulativeBalance,
            paymentMethod: '—',
            orderId: tx.id,
            dueAmount: Number(tx.dueAmount || 0)
          });

          // Separate row for supplier-paid shipping charge
          if (shipPayer === 'supplier' && shipCost > 0) {
            cumulativeBalance += shipCost;
            entries.push({
              id: `${tx.id}-shipping`,
              date: txDate,
              refNo: invNo,
              type: 'PURCHASE',
              description: `গাড়ি ভাড়া / পরিবহন খরচ (সাপ্লায়ার বহন করবে) [চালান: #${invNo}]`,
              invoiceNo: invNo,
              debit: shipCost,
              credit: 0,
              runningBalance: cumulativeBalance,
              paymentMethod: '—',
              orderId: tx.id,
              dueAmount: 0
            });
          }

          // Separate row for supplier-paid labor charge
          if (laborPayer === 'supplier' && labCost > 0) {
            cumulativeBalance += labCost;
            entries.push({
              id: `${tx.id}-labor`,
              date: txDate,
              refNo: invNo,
              type: 'PURCHASE',
              description: `আনলোডিং / লেবার খরচ (সাপ্লায়ার বহন করবে) [চালান: #${invNo}]`,
              invoiceNo: invNo,
              debit: labCost,
              credit: 0,
              runningBalance: cumulativeBalance,
              paymentMethod: '—',
              orderId: tx.id,
              dueAmount: 0
            });
          }
        } else {
          // Normal Customer Sale
          let debitVal = Math.max(0, Number(tx.totalAmount || 0));
          if (isRodOnly && rawItems.length > 0) {
            const rodGoods = relevantItems.reduce((sum: number, it: any) => sum + (Number(it.total) || (Number(it.quantity || 1) * Number(it.price || 0))), 0);
            const rodLoadToCustomer = meta.rodLoadingToCustomerLedger !== false && (tx as any).rodLoadingToCustomerLedger !== false;
            const rodLab = rodLoadToCustomer ? Number(meta.rodLaborCost || (meta.rodLaborRate ? meta.rodLaborRate * Number(meta.rodRingTotalKg || 0) : 0)) : 0;
            const rodUnloadToCustomer = meta.rodUnloadingToCustomerLedger !== false && (tx as any).rodUnloadingToCustomerLedger !== false;
            const rodUnload = rodUnloadToCustomer ? Number(meta.rodUnloadingCost || (meta.rodUnloadingRate ? meta.rodUnloadingRate * Number(meta.rodRingTotalKg || 0) : 0)) : 0;
            const shipToCustomer = meta.shippingCostToCustomerLedger !== false && (tx as any).shippingCostToCustomerLedger !== false;
            const rodShip = shipToCustomer ? Number(meta.rodShippingCost || 0) : 0;
            debitVal = rodGoods + rodLab + rodUnload + rodShip;
          } else if (isCementOnly && rawItems.length > 0) {
            const cemGoods = relevantItems.reduce((sum: number, it: any) => sum + (Number(it.total) || (Number(it.quantity || 1) * Number(it.price || 0))), 0);
            const cemLoadToCustomer = Boolean(meta.cementLoadingToCustomerLedger || (tx as any).cementLoadingToCustomerLedger);
            const cemLoad = cemLoadToCustomer ? Number(meta.cementLaborCost || (meta.cementLaborRate ? meta.cementLaborRate * Number(meta.cementTotalBags || 0) : 0)) : 0;
            const cemUnloadToCustomer = meta.cementUnloadingToCustomerLedger !== false && (tx as any).cementUnloadingToCustomerLedger !== false;
            const cemUnload = cemUnloadToCustomer ? Number(meta.cementUnloadingCost || (meta.cementUnloadingRate ? meta.cementUnloadingRate * Number(meta.cementTotalBags || 0) : 0)) : 0;
            const shipToCustomer = meta.shippingCostToCustomerLedger !== false && (tx as any).shippingCostToCustomerLedger !== false;
            const cemShip = shipToCustomer ? Number(meta.cementShippingCost || 0) : 0;
            debitVal = cemGoods + cemLoad + cemUnload + cemShip;
          }

          cumulativeBalance += debitVal;

          entries.push({
            id: `${tx.id}-bill`,
            date: txDate,
            refNo: invNo,
            type: 'SALE',
            description: itemDesc,
            invoiceNo: invNo,
            debit: debitVal,
            credit: 0,
            runningBalance: cumulativeBalance,
            paymentMethod: '—',
            orderId: tx.id,
            dueAmount: Number(tx.dueAmount || 0)
          });
        }

        const creditVal = Number(tx.paidAmount || 0);
        if (creditVal > 0 && categoryFilter === 'all') {
          cumulativeBalance -= creditVal;
          const rcvPrefix = isCustomer ? 'RCV-2026-' : 'PAY-2026-';
          const rcvNo = `${rcvPrefix}${tx.id.slice(0, 5).toUpperCase()}`;

          let pMethodLabel = 'নগদ';
          if (tx.paymentMethod === 'bank') pMethodLabel = 'ব্যাংক ট্রান্সফার';
          else if (tx.paymentMethod === 'cheque' || tx.chequeNo) {
            pMethodLabel = `চেক (${tx.bankName ? tx.bankName + ' - ' : ''}নম্বর: ${tx.chequeNo || '—'})`;
          } else if (tx.paymentMethod === 'bkash' || tx.paymentMethod === 'mobile') {
            pMethodLabel = 'বিকাশ / মোবাইল ব্যাংকিং';
          }

          const payDesc = isCustomer 
            ? `টাকা প্রাপ্তি / পেমেন্ট জমা [পদ্ধতি: ${pMethodLabel}] (চালান: ${invNo})`
            : `পেমেন্ট পরিশোধ [পদ্ধতি: ${pMethodLabel}] (চালান: ${invNo})`;

          entries.push({
            id: `${tx.id}-credit`,
            date: txDate,
            refNo: rcvNo,
            type: 'PAYMENT',
            description: payDesc,
            invoiceNo: '—',
            debit: 0,
            credit: creditVal,
            runningBalance: cumulativeBalance,
            paymentMethod: pMethodLabel,
            orderId: tx.id,
            dueAmount: Number(tx.dueAmount || 0)
          });
        }
      }
    }
  });

  return entries;
}

export default function PartyProfilePage({ id, type }: { id: string; type: 'customer' | 'supplier' | 'engineer' }) {
  const router = useRouter();
  const { canCreateInvoice } = useAuth();
  const isCustomer = type === 'customer';
  const isSupplier = type === 'supplier';
  const isEngineer = type === 'engineer';

  const [party, setParty] = useState<PartyProfile | null>(null);
  const [transactions, setTransactions] = useState<TransactionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLedgerImportOpen, setIsLedgerImportOpen] = useState(false);

  // Tab State
  const [activeMainTab, setActiveMainTab] = useState<'profile' | 'ledger' | 'sales' | 'payments' | 'documents' | 'notes'>('profile');

  // Payment Form Modal State
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionDoc | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('cash');
  const [payNote, setPayNote] = useState('');

  // Ledger Filter States
  const [activeTab, setActiveTab] = useState<'all' | 'sale' | 'receive' | 'payment' | 'adjustment' | 'return'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'rod' | 'cement'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [txnTypeFilter, setTxnTypeFilter] = useState('all');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [selectedInvoiceTx, setSelectedInvoiceTx] = useState<TransactionDoc | null>(null);

  // Customer Sites State
  const [customerSites, setCustomerSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [newSiteContact, setNewSiteContact] = useState('');
  const [isSavingSite, setIsSavingSite] = useState(false);

  // Waive / Write-off state
  const [isWaiveOpen, setIsWaiveOpen] = useState(false);
  const [waiveAmount, setWaiveAmount] = useState(0);
  const [waiveReason, setWaiveReason] = useState('খুচরা বকেয়া মওকুফ');
  const [waivePassword, setWaivePassword] = useState('');
  const [showWaivePassword, setShowWaivePassword] = useState(false);
  const [isWaiving, setIsWaiving] = useState(false);

  const getWaivePin = () => {
    if (typeof window !== 'undefined') {
      return toEnglishDigits(localStorage.getItem('waive_pin') || localStorage.getItem('commission_pin') || '1234').trim();
    }
    return '1234';
  };

  const handleConfirmWaive = async () => {
    if (!party || waiveAmount <= 0) {
      toast.error('মওকুফের পরিমাণ সঠিক নয়');
      return;
    }
    const currentPin = getWaivePin();
    if (!waivePassword.trim() || toEnglishDigits(waivePassword).trim() !== currentPin) {
      toast.error('ভুল পাসওয়ার্ড! সঠিক মওকুফ সিকিউরিটি পাসওয়ার্ড প্রদান করুন');
      return;
    }
    try {
      setIsWaiving(true);
      // Clean precision: if user waives close to full totalDue, waive exact remaining due
      const finalWaiveAmount = Math.abs(totalDue - waiveAmount) < 0.5 ? totalDue : waiveAmount;

      const metaJson = JSON.stringify({
        partyId: party.id,
        partyName: party.name,
        partyPhone: party.phone || '',
        partyAddress: party.address || '',
        partyType: 'customer',
        businessName: party.businessName || '',
        discountAmount: finalWaiveAmount,
        previousBalance: totalDue,
        isWaiveOff: true,
        userNote: waiveReason || 'খুচরা বকেয়া মওকুফ'
      });

      const payload: any = {
        party: Number(party.id),
        party_name: party.name,
        party_phone: party.phone || '',
        party_address: party.address || '',
        transaction_type: 'payment_in' as const,
        total_amount: 0,
        paid_amount: 0,
        discount: finalWaiveAmount,
        due_amount: 0,
        payment_method: 'cash',
        status: 'completed',
        notes: metaJson + '\n' + (waiveReason || 'বকেয়া মওকুফ')
      };

      await api.transactions.create(payload);
      toast.success(`${party.name}-এর ৳${toBnDigits(Number(finalWaiveAmount).toFixed(2))} টাকা সফলভাবে মওকুফ করা হয়েছে`);
      setIsWaiveOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error('মওকুফ করতে সমস্যা হয়েছে: ' + (err.message || 'Error'));
    } finally {
      setIsWaiving(false);
    }
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const p = await api.parties.get(id);
      let rodCommissionRate = 0;
      let cementCommissionRate = 0;
      let cleanNote = p.note || '';
      if (p.note && typeof p.note === 'string' && p.note.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(p.note.split('\n')[0]);
          rodCommissionRate = Number(parsed.rodCommissionRate || 0);
          cementCommissionRate = Number(parsed.cementCommissionRate || 0);
          cleanNote = parsed.userNote !== undefined ? parsed.userNote : (p.note.includes('\n') ? p.note.substring(p.note.indexOf('\n') + 1) : '');
        } catch {}
      }

      setParty({
        id: String(p.id),
        name: p.name,
        phone: p.phone,
        altPhone: (p as any).alt_phone || '',
        address: p.address || '',
        country: (p as any).country || 'বাংলাদেশ',
        division: (p as any).division || 'ঢাকা',
        district: (p as any).district || 'গোপালগঞ্জ',
        thana: (p as any).thana || '',
        postcode: (p as any).postcode || '',
        businessName: p.business_name || p.name,
        email: p.email || '',
        customerCode: (p as any).customer_code || `${isEngineer ? 'ইঞ্জি' : isCustomer ? 'গ্রাহক' : 'সরবরাহকারী'}-${toBnDigits(String(p.id).padStart(6, '0'))}`,
        supplierCode: (p as any).supplier_code || `SUP-${String(p.id).padStart(6, '0')}`,
        creditLimit: Number(p.credit_limit || 0),
        creditDays: p.credit_days || 30,
        openingBalance: Number(p.opening_balance || 0),
        discountPercent: Number(p.discount_percent || 0),
        rodCommissionRate,
        cementCommissionRate,
        idType: (p as any).id_type || (isEngineer ? 'IEB মেম্বারশিপ' : isCustomer ? 'NID' : 'TIN'),
        nid: (p as any).nid || '',
        tinNumber: (p as any).tin_number || '',
        referencePerson: (p as any).reference_person || '',
        joinedDate: p.joined_date || (p as any).created_at || '',
        photoUrl: p.photo_url || '',
        customerType: p.customer_type || (isEngineer ? 'সিভিল ইঞ্জিনিয়ার' : 'খুচরা গ্রাহক'),
        supplyType: p.supply_type || '',
        note: cleanNote,
        createdBy: (p as any).created_by || 'এডমিন ইউজার',
        createdAt: (p as any).created_at || '',
        updatedAt: (p as any).updated_at || '',
        totalDue: Number(p.total_due || 0),
        totalSales: Number(p.total_sales || 0),
        advanceBalance: Number((p as any).advance_balance || 0),
        advance_balance: Number((p as any).advance_balance || 0)
      });

      let rawTxList: any[] = [];
      if (isEngineer) {
        // Fetch sales transactions to find invoices where this engineer earned commission
        const salesList = await api.transactions.list({ transaction_type: 'sale' }).catch(() => []);
        const directList = await api.transactions.list({ party: Number(id), include_historical: 'true' }).catch(() => []);

        const engineerSales = salesList.filter(s => {
          let meta: any = {};
          if (s.notes && typeof s.notes === 'string' && s.notes.trim().startsWith('{')) {
            try { meta = JSON.parse(s.notes.split('\n')[0]); } catch {}
          }
          const engId = meta.engineerId || meta.selectedEngineerId || (s as any).engineer_id || (s as any).engineerId;
          const matchId = engId && (String(engId) === String(id));
          const matchName = Boolean(meta.engineerName && p.name && meta.engineerName.trim().toLowerCase() === p.name.trim().toLowerCase());
          const engComm = Number(meta.engineerTotalCommission || (s as any).engineerTotalCommission || 0);
          const rodKg = Number(meta.engineerRodKg || 0);
          const cemBags = Number(meta.engineerCementBags || 0);
          const rodRate = Number(meta.engineerRodRate || 0);
          const cemRate = Number(meta.engineerCementRate || 0);
          return (matchId || matchName) && (engComm > 0 || (rodKg > 0 && rodRate > 0) || (cemBags > 0 && cemRate > 0));
        });

        rawTxList = [...engineerSales, ...directList];
      } else {
        rawTxList = await api.transactions.list({ party: Number(id), include_historical: 'true' }).catch(() => []);
      }

      setTransactions(rawTxList.map((t: any) => {
        let meta: any = {};
        if (t.notes && typeof t.notes === 'string' && t.notes.trim().startsWith('{')) {
          try { meta = JSON.parse(t.notes.split('\n')[0]); } catch {}
        }

        const custName = isEngineer 
          ? ((t as any).party_name || (t as any).customer_name || meta.customerName || (t.party ? `গ্রাহক #${t.party}` : 'খুচরা গ্রাহক'))
          : (isCustomer ? (p.name || '') : '');
        const custPhone = isEngineer 
          ? ((t as any).party_phone || (t as any).customer_phone || (t as any).phone || meta.customerPhone || '')
          : (isCustomer ? (p.phone || '') : '');
        const custAddr = isEngineer 
          ? ((t as any).party_address || (t as any).customer_address || (t as any).address || meta.customerAddress || '')
          : (isCustomer ? (p.address || '') : '');

        const isPaymentTx = t.transaction_type === 'payment_out' || t.transaction_type === 'payment_in' || t.transaction_type === 'payment' || t.transaction_type === 'expense';
        const defaultTxType = isCustomer ? 'sale' : isEngineer ? (isPaymentTx ? 'payment' : 'sale') : 'purchase';

        return {
          id: String(t.id || t.invoice_no),
          orderId: t.invoice_no || String(t.id),
          invoiceNo: t.invoice_no || (isCustomer ? `INV-2026-${String(t.id).padStart(6, '0')}` : isEngineer ? `INV-2026-${String(t.id).padStart(6, '0')}` : `PUR-2026-${String(t.id).padStart(6, '0')}`),
          customerName: custName,
          customerId: isEngineer ? String(t.party || '') : String(p.id),
          customerPhone: custPhone,
          customerAddress: custAddr,
          supplierName: isSupplier ? (t.party_name || p.name) : '',
          supplierId: isSupplier ? String(p.id) : '',
          supplierPhone: isSupplier ? (p.phone || '') : '',
          supplierAddress: isSupplier ? (p.address || '') : '',
          totalAmount: Number(t.total_amount || 0),
          paidAmount: Number(t.paid_amount || 0),
          dueAmount: Number(t.due_amount || 0),
          items: t.items || [],
          paymentMethod: t.payment_method || 'cash',
          chequeNo: t.cheque_number,
          bankName: t.cheque_bank,
          chequeStatus: t.cheque_status,
          note: cleanNote,
          notes: t.notes || cleanNote,
          status: t.status || 'completed',
          transactionType: t.transaction_type || defaultTxType,
          subtotal: Number(t.subtotal || t.total_amount || 0),
          discount: Number(t.discount) > 0 ? Number(t.discount) : Number(meta.discountFlat || meta.discount || meta.discountAmount || meta.cartTotalDiscount || meta.commission || meta.commissionAmount || 0),
          shippingCost: Number(meta.shippingCost || (t as any).shipping_cost || 0),
          laborCost: Number(meta.laborCost || (t as any).labor_cost || 0),
          shippingPayer: meta.shippingPayer || 'shop',
          laborPayer: meta.laborPayer || 'shop',
          shippingStatus: meta.shippingStatus || (meta.shippingCost ? 'paid' : 'pending'),
          laborStatus: meta.laborStatus || (meta.laborCost ? 'paid' : 'pending'),
          shippingPaidAmount: Number(meta.shippingPaidAmount !== undefined ? meta.shippingPaidAmount : (meta.shippingStatus === 'paid' || !meta.shippingStatus ? (meta.shippingCost || (t as any).shipping_cost || 0) : 0)),
          laborPaidAmount: Number(meta.laborPaidAmount !== undefined ? meta.laborPaidAmount : (meta.laborStatus === 'paid' || !meta.laborStatus ? (meta.laborCost || (t as any).labor_cost || 0) : 0)),
          siteName: t.site_name || meta.siteName || meta.site_name || '',
          siteAddress: t.site_address || meta.siteAddress || meta.site_address || '',
          siteContact: t.site_contact || meta.siteContact || meta.site_contact || '',
          createdAt: t.created_at || new Date().toISOString()
        };
      }));
    } catch (err) {
      console.error('Error loading party profile:', err);
    } finally {
      setLoading(false);
    }
  }, [id, isCustomer, isSupplier, isEngineer]);

  useEffect(() => {
    let isMounted = true;
    if (id) {
      Promise.resolve().then(() => {
        if (isMounted) loadData();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [id, loadData]);

  // Site creation & helper methods
  const handleCreateSite = async () => {
    if (!newSiteName.trim()) {
      toast.error('সাইটের নাম লিখুন');
      return;
    }
    try {
      setIsSavingSite(true);
      const created = await api.customerSites.create({
        customer: Number(id),
        name: newSiteName.trim(),
        address: newSiteAddress.trim(),
        contact_person: newSiteContact.trim()
      });
      setCustomerSites(prev => [created, ...prev]);
      toast.success(`"${newSiteName}" সাইট সফলভাবে যুক্ত হয়েছে`);
      setNewSiteName('');
      setNewSiteAddress('');
      setNewSiteContact('');
      setIsAddSiteOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('সাইট সংরক্ষণ করতে ব্যর্থ হয়েছে');
    } finally {
      setIsSavingSite(false);
    }
  };

  const availableSites = useMemo(() => {
    const siteSet = new Set<string>();
    customerSites.forEach(s => {
      if (s.name && s.name.trim()) siteSet.add(s.name.trim());
    });
    transactions.forEach(t => {
      if (t.siteName && t.siteName.trim()) siteSet.add(t.siteName.trim());
    });
    return Array.from(siteSet);
  }, [customerSites, transactions]);

  const hasUnassignedSiteTx = useMemo(() => {
    return transactions.some(t => !t.siteName || t.siteName.trim() === '');
  }, [transactions]);

  // Automatic Advance Deductions for customer sites
  const siteAdvanceAdjustments = useMemo(() => {
    if (!isCustomer || !party) return [];
    return computeSiteAdvanceAdjustments(party, transactions);
  }, [isCustomer, party, transactions]);

  const selectedSiteAdjustments = useMemo(() => {
    if (selectedSite === 'all' || selectedSite === '__no_site__') return [];
    return siteAdvanceAdjustments.filter(adj => adj.siteName.toLowerCase() === selectedSite.trim().toLowerCase());
  }, [siteAdvanceAdjustments, selectedSite]);

  const siteTransactions = useMemo(() => {
    if (selectedSite === 'all') return transactions;
    if (selectedSite === '__no_site__') {
      return transactions.filter(t => !t.siteName || t.siteName.trim() === '');
    }
    const directSiteTx = transactions.filter(t => {
      const sName = (t.siteName || '').trim().toLowerCase();
      return sName === selectedSite.trim().toLowerCase();
    });

    const adjustmentTx: TransactionDoc[] = selectedSiteAdjustments.map(adj => ({
      id: adj.id,
      orderId: adj.saleId,
      invoiceNo: adj.invoiceNo,
      customerName: party?.name,
      customerId: party?.id,
      totalAmount: 0,
      paidAmount: adj.adjustedAmount,
      dueAmount: 0,
      paymentMethod: 'অগ্রিম সমন্বয়',
      note: adj.description,
      notes: adj.description,
      status: 'completed',
      transactionType: 'payment_in',
      siteName: adj.siteName,
      createdAt: typeof adj.date === 'string' ? adj.date : new Date(adj.date).toISOString()
    }));

    return [...directSiteTx, ...adjustmentTx].sort((a, b) => {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });
  }, [transactions, selectedSite, selectedSiteAdjustments, party]);

  const siteTotalBill = useMemo(() => {
    return siteTransactions.filter(t => t.transactionType === 'sale' || !t.transactionType).reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  }, [siteTransactions]);

  const siteTotalPaid = useMemo(() => {
    return siteTransactions.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
  }, [siteTransactions]);

  const siteTotalAdjusted = useMemo(() => {
    return selectedSiteAdjustments.reduce((sum, a) => sum + a.adjustedAmount, 0);
  }, [selectedSiteAdjustments]);

  const siteTotalDue = useMemo(() => {
    if (selectedSite === '__no_site__') {
      const opBal = Number(party?.openingBalance || 0);
      return Math.max(0, siteTotalBill + opBal - siteTotalPaid);
    }
    return Math.max(0, siteTotalBill - siteTotalPaid);
  }, [selectedSite, siteTotalBill, siteTotalPaid, party?.openingBalance]);

  const unassignedSiteDue = useMemo(() => {
    const unTx = transactions.filter(t => !t.siteName || t.siteName.trim() === '');
    const uBill = unTx.filter(t => t.transactionType === 'sale' || !t.transactionType).reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const uPaid = unTx.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
    const opBal = Number(party?.openingBalance || 0);
    return Math.max(0, uBill + opBal - uPaid);
  }, [transactions, party?.openingBalance]);

  const engineerTotalCommissionEarned = isEngineer
    ? transactions.reduce((sum, tx) => {
        if (tx.transactionType === 'sale' && tx.status !== 'cancelled' && tx.status !== 'rejected') {
          let meta: any = {};
          if (tx.notes && typeof tx.notes === 'string' && tx.notes.trim().startsWith('{')) {
            try { meta = JSON.parse(tx.notes.split('\n')[0]); } catch {}
          }
          const comm = Number(meta.engineerTotalCommission || (tx as any).engineerTotalCommission || 0);
          const rodKg = Number(meta.engineerRodKg || (tx as any).engineerRodKg || 0);
          const rodRate = Number(meta.engineerRodRate || (tx as any).engineerRodRate || 0);
          const cemBags = Number(meta.engineerCementBags || (tx as any).engineerCementBags || 0);
          const cemRate = Number(meta.engineerCementRate || (tx as any).engineerCementRate || 0);
          const effComm = comm > 0 ? comm : (rodKg * rodRate + cemBags * cemRate);
          return sum + effComm;
        }
        return sum;
      }, 0)
    : 0;

  const totalBill = isEngineer
    ? engineerTotalCommissionEarned
    : transactions.reduce((a, o) => {
        if (o.status === 'cancelled' || o.status === 'rejected' || o.status === 'pending' || o.status === 'draft') return a;
        const txType = o.transactionType || (isCustomer ? 'sale' : 'purchase');
        if (isCustomer && txType !== 'sale') return a;
        if (isSupplier && txType !== 'purchase') return a;

        let extraCharges = 0;
        if (txType === 'purchase') {
          let meta: any = {};
          if (o.notes && typeof o.notes === 'string' && o.notes.trim().startsWith('{')) {
            try {
              meta = JSON.parse(o.notes.split('\n')[0]);
            } catch {}
          }
          const ship = Number(meta.shippingCost || o.shippingCost || (o as any).shipping_cost || (o as any).transportCost || 0);
          const lab = Number(meta.laborCost || o.laborCost || (o as any).labor_cost || 0);
          const shipPayer = meta.shippingPayer || (o as any).shippingPayer || 'shop';
          const laborPayer = meta.laborPayer || (o as any).laborPayer || 'shop';
          const deductShip = shipPayer !== 'supplier' ? ship : 0;
          const deductLab = laborPayer !== 'supplier' ? lab : 0;
          extraCharges = deductShip + deductLab;
        }
        const effAmount = Math.max(0, Number(o.totalAmount || 0) - extraCharges);
        return a + effAmount;
      }, 0);

  const totalPaid = transactions.reduce((a, o) => {
    if (isEngineer) {
      if (o.transactionType === 'payment_out' || o.transactionType === 'payment_in' || o.transactionType === 'payment') {
        return a + Number(o.paidAmount || o.totalAmount || 0);
      }
      return a;
    }
    return a + Number(o.paidAmount || 0);
  }, 0);



  const formatBnDate = (dateVal: Date | string | undefined | null, pattern: string = 'dd MMMM yyyy') => {
    if (!dateVal) return '—';
    try {
      const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
      if (isNaN(d.getTime())) return String(dateVal);
      const raw = format(d, pattern, { locale: bn });
      return toBnDigits(raw);
    } catch {
      return '—';
    }
  };

  const handlePrintLedger = () => {
    printElement('printable-memo-wrapper');
  };

  // Generate Chronological Ledger Entries
  const ledgerParty = (selectedSite !== 'all' && selectedSite !== '__no_site__') ? { ...party!, openingBalance: 0 } : party;
  const ledgerEntries = generateLedgerEntries(ledgerParty, siteTransactions, isCustomer, isEngineer, categoryFilter);

  const rawClosingBalance = ledgerEntries.length > 0
    ? ledgerEntries[ledgerEntries.length - 1].runningBalance
    : (Number(party?.openingBalance || 0));

  // Clean floating-point precision residues and fractional paisa (< 0.5 Taka)
  const finalClosingBalance = Math.abs(rawClosingBalance) < 0.5 ? 0 : rawClosingBalance;

  const totalDue = (selectedSite !== 'all') ? siteTotalDue : (finalClosingBalance > 0 ? finalClosingBalance : 0);
  const advanceBalance = (selectedSite !== 'all') ? 0 : (finalClosingBalance < 0 ? Math.abs(finalClosingBalance) : 0);

  const handleDownloadCSV = () => {
    if (!party) return;
    let csvContent = "\uFEFFতারিখ,রেফারেন্স/আইডি,ধরণ,বিবরণ,চালান নং,ডেবিট/বিল (৳),ক্রেডিট/জমা (৳),অবশিষ্ট জের (৳),পেমেন্ট পদ্ধতি\n";
    ledgerEntries.forEach(entry => {
      const dStr = format(entry.date, 'yyyy-MM-dd HH:mm');
      const typeStr = entry.type === 'SALE' || entry.type === 'PURCHASE' ? 'চালান' : 'রশিদ';
      const desc = `"${entry.description.replace(/"/g, '""')}"`;
      csvContent += `${dStr},${entry.refNo},${typeStr},${desc},${entry.invoiceNo || '—'},${entry.debit},${entry.credit},${entry.runningBalance},${entry.paymentMethod || '—'}\n`;
    });
    
    csvContent += `\n,,সর্বমোট হিসাব,,,,${totalBill},${totalPaid},${totalDue}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${party.businessName || party.name}_লেজার_খতিয়ান.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV ফাইল ডাউনলোড হয়েছে');
  };

  const openGeneralPaymentModal = useCallback(() => {
    router.push(isCustomer 
      ? `/transactions?type=income&action=create&party=${id}` 
      : `/transactions?type=expense&action=create&party=${id}&party_type=${isEngineer ? 'engineer' : 'supplier'}`
    );
  }, [router, isCustomer, isEngineer, id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        openGeneralPaymentModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openGeneralPaymentModal]);

  const handleDeleteParty = async () => {
    if (!confirm(isEngineer ? 'আপনি কি নিশ্চিত যে এই ইঞ্জিনিয়ারের তথ্য মুছে ফেলতে চান?' : isCustomer ? 'আপনি কি নিশ্চিত যে এই গ্রাহককে মুছে ফেলতে চান?' : 'আপনি কি নিশ্চিত যে এই সরবরাহকারীকে মুছে ফেলতে চান?')) return;
    try {
      await api.parties.delete(id);
      toast.success(isEngineer ? 'ইঞ্জিনিয়ার সফলভাবে মুছে ফেলা হয়েছে' : isCustomer ? 'গ্রাহক সফলভাবে মুছে ফেলা হয়েছে' : 'সরবরাহকারী সফলভাবে মুছে ফেলা হয়েছে');
      router.push(isEngineer ? '/engineers' : isCustomer ? '/customers' : '/suppliers');
    } catch {
      toast.error('তথ্য মুছতে সমস্যা হয়েছে');
    }
  };


  const filteredLedgerEntries = ledgerEntries.filter(entry => {
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase();
      const matchRef = entry.refNo.toLowerCase().includes(q);
      const matchDesc = entry.description.toLowerCase().includes(q);
      const matchInv = (entry.invoiceNo || '').toLowerCase().includes(q);
      if (!matchRef && !matchDesc && !matchInv) return false;
    }

    if (activeTab === 'sale' && (entry.type !== 'SALE' && entry.type !== 'PURCHASE')) return false;
    if (activeTab === 'receive' && entry.type !== 'PAYMENT') return false;
    if (activeTab === 'payment' && entry.type !== 'PAYMENT') return false;

    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      if (entry.date < s) return false;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      if (entry.date > e) return false;
    }

    return true;
  });

  const validCurrentPage = Math.min(currentPage, Math.max(1, Math.ceil(filteredLedgerEntries.length / itemsPerPage)));
  const totalPages = Math.max(1, Math.ceil(filteredLedgerEntries.length / itemsPerPage));
  const paginatedEntries = filteredLedgerEntries.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);

  if (!party && !loading) {
    return (
      <Shell>
        <div className="text-center py-20 font-bengali">
          <p className="text-slate-500 text-lg font-bold">তথ্য পাওয়া যায়নি</p>
          <Link href={isEngineer ? "/engineers" : isCustomer ? "/customers" : "/suppliers"}>
            <Button className="mt-4 rounded-xl font-bold">ফিরে যান</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* ========================================================= */}
      {/* 🖨️ DEDICATED A4 PRINTABLE CUSTOMER PROFILE & LEDGER MEMO */}
      {/* ========================================================= */}
      <div className="hidden print:block">
        <PartyLedgerPrintMemo
          party={party}
          transactions={transactions}
          isCustomer={isCustomer}
          isSupplier={isSupplier}
          isEngineer={isEngineer}
          startDate={startDate}
          endDate={endDate}
          selectedSite={selectedSite}
          categoryFilter={categoryFilter}
          txnTypeFilter={activeTab}
        />
      </div>

      <div className="space-y-4 font-bengali pb-12 print:hidden">
        
        {/* TOP BACK NAVIGATION BAR */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold text-xs shadow-2xs transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
              <span>পিছনে ফিরে যান</span>
            </button>

            <div className="text-xs text-slate-400 font-medium hidden sm:block">
              <Link href={isEngineer ? "/engineers" : isCustomer ? "/customers" : "/suppliers"} className="hover:text-blue-600 transition-colors">
                {isEngineer ? 'ইঞ্জিনিয়ার তালিকা' : isCustomer ? 'গ্রাহক তালিকা' : 'সাপ্লায়ার তালিকা'}
              </Link>
              <span className="mx-1.5 text-slate-300">/</span>
              <span className="text-slate-700 font-bold">{party?.businessName || party?.name}</span>
            </div>
          </div>

          {canCreateInvoice && (
            <Button
              onClick={openGeneralPaymentModal}
              className={cn(
                "h-9 px-4 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95",
                isEngineer
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : isCustomer 
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                    : "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              <CreditCard className="w-4 h-4" />
              <span>{isEngineer ? '+ কমিশন পেমেন্ট' : isCustomer ? '+ পেমেন্ট গ্রহণ' : '+ পেমেন্ট প্রদান'}</span>
            </Button>
          )}
        </div>

        {/* 1. TOP HEADER CARD - ULTRA COMPACT HEIGHT */}
        {party && (
          <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden print:hidden">
            <CardContent className="py-2.5 px-4 sm:px-5">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-0">
                
                {/* 1. PROFILE & CONTACT */}
                <div className="flex items-center gap-3 pr-4 lg:pr-5 py-0.5">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-[#F1E8FF] text-[#8B5CF6] font-bold text-xl flex items-center justify-center border border-[#E9D8FF]">
                      {party.photoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={party.photoUrl} alt={party.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span>{(party.businessName || party.name)[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0"></span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        {party.businessName || party.name}
                      </h2>
                      <span className="inline-block bg-emerald-100/70 text-emerald-700 font-bold text-[10px] px-2 py-0.5 rounded-full">
                        সক্রিয়
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {toBnDigits(party.phone)}
                      </span>
                      {party.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {party.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {party.address || `${party.thana ? party.thana + ', ' : ''}${party.district || 'গোপালগঞ্জ'}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. CLIENT ID */}
                <div className="border-t lg:border-t-0 lg:border-l border-slate-200/80 px-4 lg:px-5 py-0.5 self-stretch flex flex-col justify-center gap-1">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block">{isEngineer ? 'ইঞ্জিনিয়ার আইডি' : isCustomer ? 'গ্রাহক আইডি' : 'সরবরাহকারী আইডি'}</span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5">
                      {party.customerCode || `${isEngineer ? 'ইঞ্জি' : isCustomer ? 'গ্রাহক' : 'সরবরাহকারী'}-${toBnDigits(String(party.id).padStart(6, '0'))}`}
                    </span>
                  </div>
                </div>

                {/* 3. JOIN DATE & CREDIT LIMIT */}
                <div className="border-t lg:border-t-0 lg:border-l border-slate-200/80 px-4 lg:px-5 py-0.5 self-stretch flex flex-col justify-center gap-1.5">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block">যোগদানের তারিখ</span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5">
                      {party.joinedDate ? formatBnDate(party.joinedDate, 'dd MMMM yyyy') : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block">{isEngineer ? 'কমিশন লিমিট' : 'বাকি বা ঋণের সীমা'}</span>
                    <span className="text-xs font-bold text-blue-600 block mt-0.5">
                      ৳ {party.creditLimit ? toBnDigits(party.creditLimit.toLocaleString('en-IN', { minimumFractionDigits: 2 })) : '০.০০'}
                    </span>
                  </div>
                </div>

                {/* 4. DUE & TOTAL SALES */}
                <div className="border-t lg:border-t-0 lg:border-l border-slate-200/80 px-4 lg:px-5 py-0.5 self-stretch flex flex-col justify-center gap-1.5">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block">
                      {isEngineer ? 'মোট পাওনা কমিশন' : advanceBalance > 0 ? 'মোট অগ্রিম জমা' : 'মোট বকেয়া'}
                    </span>
                    <span className={cn(
                      "text-xs font-black block mt-0.5",
                      isEngineer 
                        ? (finalClosingBalance >= 0 ? "text-emerald-700" : "text-blue-600")
                        : (advanceBalance > 0 ? "text-emerald-600" : "text-rose-600")
                    )}>
                      {isEngineer
                        ? (finalClosingBalance >= 0 
                            ? `৳ ${toBnDigits(finalClosingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}`
                            : `৳ ${toBnDigits(Math.abs(finalClosingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 }))} (অগ্রিম পরিশোধিত)`
                          )
                        : (advanceBalance > 0 
                            ? `৳ ${toBnDigits(advanceBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` 
                            : `৳ ${toBnDigits(totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}`
                          )
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block">{isEngineer ? 'মোট রেফারেল' : isCustomer ? 'মোট বিক্রয়' : 'মোট ক্রয়'}</span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5">
                      ৳ {toBnDigits(totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                    </span>
                  </div>
                </div>

                {/* 5. ACTION BUTTONS 2x2 GRID FOR COMPACT HEIGHT */}
                <div className="border-t lg:border-t-0 lg:border-l border-slate-200/80 pl-0 lg:pl-5 py-0.5 grid grid-cols-2 gap-1.5 min-w-[240px]">
                  <Button
                    onClick={() => router.push(isEngineer ? `/engineers?edit=${id}` : isCustomer ? `/customers?edit=${id}` : `/suppliers?edit=${id}`)}
                    className="w-full h-7 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-2xs flex items-center justify-center gap-1 px-2 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />সম্পাদনা
                  </Button>
                  {isCustomer && totalDue > 0 ? (
                    <Button 
                      onClick={() => {
                        setWaiveAmount(Number(Number(totalDue).toFixed(2)));
                        setWaiveReason('খুচরা বকেয়া মওকুফ');
                        setWaivePassword('');
                        setShowWaivePassword(false);
                        setIsWaiveOpen(true);
                      }}
                      className="w-full h-7 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] rounded-lg shadow-2xs flex items-center justify-center gap-1 px-2 cursor-pointer"
                    >
                      <DollarSign className="w-3 h-3 text-rose-600" />বকেয়া মওকুফ
                    </Button>
                  ) : (
                    <Button onClick={handlePrintLedger} variant="outline" className="w-full h-7 border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1 px-2 cursor-pointer">
                      <Printer className="w-3 h-3 text-slate-500" />লেজার প্রিন্ট
                    </Button>
                  )}
                  <Button onClick={handlePrintLedger} variant="outline" className="w-full h-7 border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1 px-2 cursor-pointer">
                    <Printer className="w-3 h-3 text-slate-500" />লেজার প্রিন্ট
                  </Button>
                  <Button onClick={handlePrintLedger} variant="outline" className="w-full h-7 border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1 px-2 cursor-pointer">
                    <Download className="w-3 h-3 text-slate-500" />পিডিএফ ডাউনলোড
                  </Button>
                </div>

              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. NAVIGATION TABS BAR */}
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto bg-white rounded-t-2xl px-3 pt-1 shadow-2xs print:hidden">
          <button
            onClick={() => setActiveMainTab('profile')}
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap",
              activeMainTab === 'profile'
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <UserCheck className="w-4 h-4" />
            <span>প্রোফাইল তথ্য</span>
          </button>

          <button
            onClick={() => setActiveMainTab('ledger')}
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap",
              activeMainTab === 'ledger'
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Receipt className="w-4 h-4" />
            <span>লেজার (খতিয়ান)</span>
          </button>

          <button
            onClick={() => setActiveMainTab('sales')}
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap",
              activeMainTab === 'sales'
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <FileText className="w-4 h-4" />
            <span>{isEngineer ? 'রেফারেল ও কাজ' : isCustomer ? 'বিক্রয় তালিকা' : 'ক্রয় তালিকা'}</span>
          </button>

          <button
            onClick={() => setActiveMainTab('payments')}
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap",
              activeMainTab === 'payments'
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <CreditCard className="w-4 h-4" />
            <span>পেমেন্ট ও জমা</span>
          </button>

          <button
            onClick={() => setActiveMainTab('documents')}
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap",
              activeMainTab === 'documents'
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <FilePlus className="w-4 h-4" />
            <span>ডকুমেন্টস ও ফাইল</span>
          </button>

          <button
            onClick={() => setActiveMainTab('notes')}
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap",
              activeMainTab === 'notes'
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            <span>মন্তব্য ও নোটস</span>
          </button>
        </div>

        {/* 3. TAB 1: PROFILE TAB CONTENT */}
        {activeMainTab === 'profile' && party && (
          <div className="space-y-5">
            
            {/* 2-Column Grid of Detail Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* CARD 1: 👤 মৌলিক তথ্য */}
              <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                      <UserCheck className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      মৌলিক তথ্য
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">{isEngineer ? 'ইঞ্জিনিয়ারের নাম' : isCustomer ? 'গ্রাহকের নাম' : 'কোম্পানি / প্রতিনিধির নাম'}</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">{isEngineer ? 'ইঞ্জিনিয়ার আইডি' : isCustomer ? 'গ্রাহক আইডি' : 'সরবরাহকারী আইডি'}</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.customerCode || `${isEngineer ? 'ইঞ্জি' : isCustomer ? 'গ্রাহক' : 'সরবরাহকারী'}-${toBnDigits(String(party.id).padStart(6, '0'))}`}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">{isEngineer ? 'ফার্ম / কনস্ট্রাকশন' : 'ব্যবসার নাম'}</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.businessName || party.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">{isEngineer ? 'পদবী / ক্যাটাগরি' : isCustomer ? 'গ্রাহকের ধরন' : 'সরবরাহের ধরন'}</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.customerType || (isEngineer ? 'সিভিল ইঞ্জিনিয়ার' : isCustomer ? 'খুচরা গ্রাহক' : 'রড')}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">যোগাযোগের নম্বর</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{toBnDigits(party.phone)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">যোগদানের তারিখ</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.joinedDate ? formatBnDate(party.joinedDate, 'dd MMMM yyyy') : '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">বিকল্প ফোন নম্বর</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.altPhone ? toBnDigits(party.altPhone) : '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 2: 📍 ঠিকানা ও অবস্থান তথ্য */}
              <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      ঠিকানা ও অবস্থান তথ্য
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">দেশ</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.country || 'বাংলাদেশ'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">পূর্ণ ঠিকানা</span>
                      <span className="font-bold text-slate-900 block mt-0.5 leading-relaxed">{party.address || '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">বিভাগ</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.division || 'ঢাকা'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">জেলা</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.district || 'গোপালগঞ্জ'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">থানা</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.thana || '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">পোস্ট কোড</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.postcode ? toBnDigits(party.postcode) : '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 3: 💳 আর্থিক পলিসি ও হিসাব তথ্য */}
              <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      আর্থিক পলিসি ও হিসাব তথ্য
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">{isEngineer ? 'প্রারম্ভিক কমিশন পাওনা' : 'প্রারম্ভিক বকেয়া'}</span>
                      <span className="font-bold text-slate-900 block mt-0.5">৳ {party.openingBalance ? toBnDigits(party.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })) : '০.০০'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">{isEngineer ? 'মোট অর্জিত কমিশন' : 'কমিশন বা ছাড় (%)'}</span>
                      <span className="font-bold text-emerald-700 block mt-0.5">{isEngineer ? `৳ ${toBnDigits(engineerTotalCommissionEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : (party.discountPercent ? toBnDigits(party.discountPercent) + '%' : '০%')}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">{isEngineer ? 'বর্তমান মোট পাওনা' : 'মোট বকেয়া'}</span>
                      <span className="font-black text-rose-600 block mt-0.5">৳ {toBnDigits(totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">{isEngineer ? 'মোট পরিশোধিত কমিশন' : 'টিন বা লাইসেন্স নম্বর'}</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{isEngineer ? `৳ ${toBnDigits(totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : (party.tinNumber || party.nid || '—')}</span>
                    </div>

                    {isEngineer && (
                      <>
                        <div className="bg-orange-50/80 p-2.5 rounded-xl border border-orange-200/80 col-span-2">
                          <span className="text-orange-800 font-bold block text-[11px]">পণ্যভিত্তিক বিক্রয় কমিশন রেট</span>
                          <div className="flex items-center gap-4 mt-1">
                            <div>
                              <span className="text-[10px] text-slate-500 font-medium block">রড কমিশন:</span>
                              <span className="font-black text-slate-900 text-xs">
                                ৳ {party.rodCommissionRate ? toBnDigits(party.rodCommissionRate) : '০.০০'} / কেজি
                              </span>
                            </div>
                            <div className="h-6 w-[1px] bg-orange-200"></div>
                            <div>
                              <span className="text-[10px] text-slate-500 font-medium block">সিমেন্ট কমিশন:</span>
                              <span className="font-black text-slate-900 text-xs">
                                ৳ {party.cementCommissionRate ? toBnDigits(party.cementCommissionRate) : '০.০০'} / বস্তা
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <span className="text-slate-500 font-medium block">{isEngineer ? 'আইডি / মেম্বারশিপ' : 'বাকি বা ঋণের সীমা'}</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{isEngineer ? (party.tinNumber || party.nid || '—') : `৳ ${party.creditLimit ? toBnDigits(party.creditLimit.toLocaleString('en-IN', { minimumFractionDigits: 2 })) : '০.০০'}`}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">পরিশোধের মেয়াদ</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.creditDays ? toBnDigits(party.creditDays) + ' দিন' : '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 4: 👥 অন্যান্য তথ্য */}
              <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      অন্যান্য তথ্য (Other Information)
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">রেফারেন্স ব্যক্তি</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.referencePerson || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">তৈরির তারিখ</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.createdAt ? formatBnDate(party.createdAt, 'dd MMMM yyyy') : '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">নোট</span>
                      <span className="font-bold text-slate-900 block mt-0.5 leading-relaxed">{party.note || 'কোনো বিশেষ নোট নেই'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">সর্বশেষ আপডেট</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.updatedAt ? formatBnDate(party.updatedAt, 'dd MMMM yyyy') : '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">এন্ট্রি করেছেন</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.createdBy || 'এডমিন ইউজার'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* CARD: 📍 কাস্টমারের ডেলিভারি / কনস্ট্রাকশন সাইটসমূহ */}
            {isCustomer && (
              <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                          <span>কাস্টমারের সাইটসমূহ (Delivery / Construction Sites)</span>
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {toBnDigits(availableSites.length)} টি সাইট
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          এখানে প্রতিটি সাইটের মাল ডেলিভারি ও বকেয়া আলাদাভাবে দেখা যায় এবং সাইট অনুযায়ী স্টেটমেন্ট প্রিন্ট করা যায়
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsAddSiteOpen(true)}
                      className="h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>নতুন সাইট যোগ করুন</span>
                    </Button>
                  </div>

                  {availableSites.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs space-y-1">
                      <MapPin className="w-6 h-6 text-slate-400 mx-auto opacity-60" />
                      <p className="font-bold text-slate-700">এখনও কোনো আলাদা সাইট যুক্ত করা হয়নি</p>
                      <p className="text-[11px] text-slate-400">চালান কাটার সময় সাইটের নাম লিখলে তা স্বয়ংক্রিয়ভাবে এখানে চলে আসবে, অথবা উপরের বাটনে চাপ দিয়ে নতুন সাইট যোগ করুন।</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {hasUnassignedSiteTx && (
                        <div 
                          className="p-3.5 rounded-xl border border-amber-200/90 hover:border-amber-300 hover:shadow-xs bg-amber-50/40 transition-all space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold text-xs">
                                📦
                              </span>
                              <span className="font-black text-slate-900 text-xs">সাধারণ খাতা (সাইট ছাড়া)</span>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-800 border border-amber-200">
                              {toBnDigits(transactions.filter(t => !t.siteName || t.siteName.trim() === '').length)} টি রেকর্ড
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[11px] pt-1.5 border-t border-amber-200/60">
                            <div>
                              <span className="text-slate-500 block text-[10px]">সাধারণ বিক্রি/বিল:</span>
                              <span className="font-bold text-slate-900">
                                ৳ {toBnDigits(transactions.filter(t => !t.siteName || t.siteName.trim() === '').filter(t => t.transactionType === 'sale' || !t.transactionType).reduce((sum, t) => sum + (t.totalAmount || 0), 0).toLocaleString('en-IN'))}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[10px]">সাধারণ বকেয়া:</span>
                              <span className="font-bold text-amber-700">৳ {toBnDigits(unassignedSiteDue.toLocaleString('en-IN'))}</span>
                            </div>
                          </div>

                          <div className="pt-1 flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSite('__no_site__');
                                setActiveMainTab('ledger');
                              }}
                              className="flex-1 h-7 text-[11px] font-bold border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300 rounded-lg cursor-pointer"
                            >
                              <span>লেজার দেখুন →</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedSite('__no_site__');
                                setTimeout(() => {
                                  handlePrintLedger();
                                }, 150);
                              }}
                              className="h-7 px-2.5 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="সাধারণ খাতার হিসাব প্রিন্ট করুন"
                            >
                              <Printer className="w-3 h-3" />
                              <span>প্রিন্ট</span>
                            </Button>
                          </div>
                        </div>
                      )}
                      {availableSites.map((siteName, idx) => {
                        const sTx = transactions.filter(t => (t.siteName || '').trim().toLowerCase() === siteName.trim().toLowerCase());
                        const sBill = sTx.filter(t => t.transactionType === 'sale' || !t.transactionType).reduce((sum, t) => sum + (t.totalAmount || 0), 0);
                        const sPaid = sTx.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
                        const sAdjusted = siteAdvanceAdjustments
                          .filter(a => a.siteName.toLowerCase() === siteName.trim().toLowerCase())
                          .reduce((sum, a) => sum + a.adjustedAmount, 0);
                        const sDue = Math.max(0, sBill - sPaid - sAdjusted);
                        return (
                          <div 
                            key={idx}
                            className="p-3.5 rounded-xl border border-slate-200/90 hover:border-blue-300 hover:shadow-xs bg-slate-50/40 transition-all space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="w-6 h-6 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                                  <MapPin className="w-3.5 h-3.5" />
                                </span>
                                <span className="font-black text-slate-900 text-xs">{siteName}</span>
                              </div>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                {toBnDigits(sTx.length)} টি রেকর্ড
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1 text-[11px] pt-1.5 border-t border-slate-200/60">
                              <div>
                                <span className="text-slate-500 block text-[10px]">মোট ডেলিভারি/বিক্রি:</span>
                                <span className="font-bold text-slate-900">৳ {toBnDigits(sBill.toLocaleString('en-IN'))}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">সাইটের বকেয়া:</span>
                                <span className={cn("font-bold", sDue > 0 ? "text-rose-600" : "text-emerald-600")}>
                                  {sDue > 0 ? `৳ ${toBnDigits(sDue.toLocaleString('en-IN'))}` : 'পরিশোধিত'}
                                </span>
                              </div>
                            </div>

                            {sAdjusted > 0 && (
                              <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md flex items-center justify-between">
                                <span className="text-emerald-700">অগ্রিম থেকে সমন্বয়:</span>
                                <span>৳ {toBnDigits(sAdjusted.toLocaleString('en-IN'))}</span>
                              </div>
                            )}

                            <div className="pt-1 flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSite(siteName);
                                  setActiveMainTab('ledger');
                                }}
                                className="flex-1 h-7 text-[11px] font-bold border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 rounded-lg cursor-pointer"
                              >
                                <span>লেজার দেখুন →</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedSite(siteName);
                                  setTimeout(() => {
                                    handlePrintLedger();
                                  }, 150);
                                }}
                                className="h-7 px-2.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="এই সাইটের হিসাব প্রিন্ট করুন"
                              >
                                <Printer className="w-3 h-3" />
                                <span>প্রিন্ট</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* CARD 5: 📄 ডকুমেন্টস (Documents) */}
            <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-black text-slate-900">
                    ডকুমেন্টস (Documents)
                  </h3>
                </div>

                <div className="py-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                  <p className="text-xs font-bold text-slate-500">কোনো ফাইল বা ডকুমেন্ট যুক্ত করা হয়নি</p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={() => toast.info('ডকুমেন্ট আপলোড সুবিধা শীঘ্রই চালু হচ্ছে')}
                    />
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                      <span>নতুন ডকুমেন্ট আপলোড করুন</span>
                    </span>
                  </label>
                </div>
              </CardContent>
            </Card>

          </div>
        )}

        {/* TAB 2: LEDGER (হিসাব) TAB CONTENT - MATCHES IMAGE EXACTLY */}
        {activeMainTab === 'ledger' && (
          <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-4">
              
              {/* 1. FILTER CONTROL BAR */}
              <div className="flex flex-wrap items-end justify-between gap-3">
                
                {/* Left Filter Controls */}
                <div className="flex flex-wrap items-end gap-3 flex-1">
                  {/* 1. Date Range Filter */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      তারিখ
                    </span>
                    <BengaliDateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      onChange={(start, end) => {
                        setStartDate(start);
                        setEndDate(end);
                      }}
                      placeholder="তারিখ ফিল্টার"
                    />
                  </div>

                  {/* 2. Transaction Type Select */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Receipt className="w-3 h-3 text-slate-400" />
                      লেনদেন ধরণ
                    </span>
                    <Select value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
                      <SelectTrigger className="w-32 sm:w-36 h-9 bg-white border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                        <span className="truncate">
                          {activeTab === 'sale' ? 'বিক্রি' : activeTab === 'receive' ? 'পেমেন্ট' : 'সব লেনদেন'}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="font-bengali text-xs">
                        <SelectItem value="all">সব লেনদেন</SelectItem>
                        <SelectItem value="sale">বিক্রি</SelectItem>
                        <SelectItem value="receive">পেমেন্ট</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3. Category Filter Select (রড ও সিমেন্ট ফিল্টার) */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Filter className="w-3 h-3 text-slate-400" />
                      পণ্য ফিল্টার
                    </span>
                    <Select value={categoryFilter} onValueChange={(val: any) => setCategoryFilter(val || 'all')}>
                      <SelectTrigger className="w-32 sm:w-36 h-9 bg-white border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                        <span className="truncate">
                          {categoryFilter === 'rod' ? '🔹 শুধু রড' : categoryFilter === 'cement' ? '🔸 শুধু সিমেন্ট' : '📦 সব পণ্য'}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="font-bengali text-xs">
                        <SelectItem value="all">📦 সব পণ্য</SelectItem>
                        <SelectItem value="rod">🔹 শুধু রড</SelectItem>
                        <SelectItem value="cement">🔸 শুধু সিমেন্ট</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 4. Site Filter Select for Customers */}
                  {isCustomer && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-500" />
                        সাইট / প্রজেক্ট
                      </span>
                      <Select value={selectedSite} onValueChange={(val: any) => setSelectedSite(val || 'all')}>
                        <SelectTrigger className="w-40 sm:w-44 h-9 bg-white border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate">
                              {selectedSite === 'all' 
                                ? 'সব সাইট (একত্রিত)' 
                                : selectedSite === '__no_site__' 
                                  ? '📦 সাধারণ খাতা' 
                                  : selectedSite}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="font-bengali text-xs">
                          <SelectItem value="all">সব সাইট (একত্রিত)</SelectItem>
                          {hasUnassignedSiteTx && (
                            <SelectItem value="__no_site__">📦 সাধারণ খাতা (সাইট ছাড়া)</SelectItem>
                          )}
                          {availableSites.map((s, idx) => (
                            <SelectItem key={idx} value={s}>
                              📍 {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* 5. Search Box */}
                  <div className="flex flex-col gap-1 flex-1 min-w-[180px] max-w-xs">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400" />
                      অনুসন্ধান
                    </span>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        value={ledgerSearch}
                        onChange={e => setLedgerSearch(e.target.value)}
                        placeholder="বিবরণ খুঁজুন..."
                        className="pl-8 h-9 text-xs rounded-xl bg-white border-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button onClick={handlePrintLedger} className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer">
                    <Printer className="w-3.5 h-3.5 text-white" />
                    <span>লেজার প্রিন্ট</span>
                  </Button>
                  <Button variant="outline" className="h-9 px-3.5 border-slate-200 text-slate-700 font-bold text-xs rounded-xl bg-white hover:bg-slate-50 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span>ফিল্টার</span>
                  </Button>
                </div>
              </div>

              {/* Site-Specific Active Summary Banner */}
              {selectedSite !== 'all' && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-blue-600 text-white font-black px-2.5 py-0.5 rounded text-[11px] flex items-center gap-1 shadow-xs">
                      {selectedSite === '__no_site__' ? (
                        <>📦 সাধারণ খাতা (কোন সাইট ছাড়া)</>
                      ) : (
                        <><MapPin className="w-3 h-3" /> {selectedSite} (সাইটের হিসাব)</>
                      )}
                    </span>
                    <span className="text-slate-700 font-bold">
                      মোট বিল: <span className="text-slate-950">৳ {toBnDigits(siteTotalBill.toLocaleString('en-IN'))}</span>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-700 font-bold">
                      পরিশোধ: <span className="text-emerald-700">৳ {toBnDigits(siteTotalPaid.toLocaleString('en-IN'))}</span>
                    </span>
                    {siteTotalAdjusted > 0 && (
                      <>
                        <span className="text-slate-400">|</span>
                        <span className="text-blue-700 font-bold bg-blue-100/80 px-2 py-0.5 rounded text-[11px]">
                          অগ্রিম সমন্বয়: <span className="font-black text-blue-900">৳ {toBnDigits(siteTotalAdjusted.toLocaleString('en-IN'))}</span>
                        </span>
                      </>
                    )}
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-700 font-bold">
                      অবশিষ্ট জের: <span className={siteTotalDue <= 0 ? "text-emerald-600 font-black" : "text-rose-600 font-black"}>
                        {siteTotalDue <= 0 ? 'পরিশোধিত (০.০০)' : `৳ ${toBnDigits(siteTotalDue.toLocaleString('en-IN'))}`}
                      </span>
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setSelectedSite('all')} 
                    className="h-7 px-2 text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:bg-blue-100 cursor-pointer"
                  >
                    ✕ সব সাইট দেখুন
                  </Button>
                </div>
              )}

              {/* 2. LEDGER TABLE */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                    <TableRow className="text-xs text-slate-700 font-black">
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">তারিখ</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">ভাউচার / ইনভয়েস</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">বিবরণ</TableHead>
                      <TableHead className="py-3 px-4 text-right font-black text-slate-900">ডেবিট (৳)</TableHead>
                      <TableHead className="py-3 px-4 text-right font-black text-slate-900">ক্রেডিট (৳)</TableHead>
                      <TableHead className="py-3 px-4 text-right font-black text-slate-900">ব্যালেন্স (৳)</TableHead>
                      <TableHead className="py-3 px-4 text-center font-black text-slate-900">ধরণ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-bold text-slate-800 divide-y divide-slate-100">
                    {paginatedEntries.length > 0 ? (
                      paginatedEntries.map(entry => {
                        const isSale = entry.type === 'SALE' || entry.type === 'PURCHASE';
                        const matchingTx = transactions.find(t => t.id === entry.orderId);

                        return (
                          <TableRow 
                            key={entry.id} 
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                            onClick={() => {
                              if (matchingTx) {
                                setSelectedInvoiceTx(matchingTx);
                              } else {
                                const isPayment = entry.type === 'PAYMENT';
                                const isLoan = entry.description.includes('লোন গ্রহণ');
                                setSelectedInvoiceTx({
                                  id: entry.orderId || entry.refNo || entry.id,
                                  orderId: entry.refNo,
                                  invoiceNo: entry.invoiceNo || entry.refNo,
                                  customerName: party?.name || 'সম্মানিত গ্রাহক',
                                  customerPhone: party?.phone || '',
                                  customerAddress: party?.address || '',
                                  supplierName: party?.name || 'সরবরাহকারী',
                                  supplierPhone: party?.phone || '',
                                  supplierAddress: party?.address || '',
                                  totalAmount: entry.debit > 0 ? entry.debit : entry.credit,
                                  paidAmount: isPayment ? entry.credit : (entry.debit - (entry.dueAmount || 0)),
                                  dueAmount: isPayment ? 0 : (entry.dueAmount !== undefined ? entry.dueAmount : entry.debit),
                                  items: [],
                                  paymentMethod: entry.paymentMethod || 'cash',
                                  transactionType: isLoan ? 'loan_in' : (isPayment ? 'payment' : (isCustomer ? 'sale' : 'purchase')),
                                  createdAt: entry.date,
                                  description: entry.description
                                });
                              }
                            }}
                          >
                            <TableCell className="py-3.5 px-4 text-left text-slate-700 font-medium">
                              {formatBnDate(entry.date, 'dd MMMM yyyy')}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-left font-mono font-bold text-blue-600 hover:underline">
                              <span className="inline-flex items-center gap-1">
                                {isSale ? <FileText className="w-3.5 h-3.5 text-emerald-600" /> : <CreditCard className="w-3.5 h-3.5 text-blue-600" />}
                                <span>{entry.refNo}</span>
                              </span>
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-left text-slate-800 font-bold max-w-md break-words">
                              <div className="leading-snug">
                                {entry.description}
                              </div>
                            </TableCell>

                            {/* DEBIT COLUMN */}
                            <TableCell className="py-3.5 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                              {entry.debit > 0 ? `৳ ${toBnDigits(entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : '—'}
                            </TableCell>

                            {/* CREDIT COLUMN */}
                            <TableCell className="py-3.5 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                              {entry.credit > 0 ? `৳ ${toBnDigits(entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : '—'}
                            </TableCell>

                            {/* RUNNING BALANCE COLUMN */}
                            <TableCell className={cn(
                              "py-3.5 px-4 text-right font-black whitespace-nowrap",
                              entry.runningBalance < 0 ? "text-emerald-700 font-black" : "text-rose-600 font-black"
                            )}>
                              {entry.runningBalance < 0
                                ? `-৳ ${toBnDigits(Math.abs(entry.runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}`
                                : `৳ ${toBnDigits(entry.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}`
                              }
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-center">
                              {entry.description.includes('লোন গ্রহণ') ? (
                                <span className="inline-flex items-center gap-1 bg-purple-100/90 text-purple-800 font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-2xs">
                                  <HandCoins className="w-3 h-3 text-purple-600" />
                                  <span>লোন গ্রহণ</span>
                                </span>
                              ) : isSale ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-100/90 text-emerald-800 font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-2xs">
                                  <FileText className="w-3 h-3 text-emerald-600" />
                                  <span>{isCustomer ? 'বিক্রি (চালান)' : 'ক্রয় (চালান)'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-blue-100/90 text-blue-800 font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-2xs">
                                  <CreditCard className="w-3 h-3 text-blue-600" />
                                  <span>জমা (পেমেন্ট)</span>
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                          কোনো লেনদেনের রেকর্ড পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 3. PAGINATION FOOTER BAR */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-semibold text-slate-500">
                <div>
                  মোট <strong className="text-slate-900 font-bold">{toBnDigits(filteredLedgerEntries.length)}</strong>টি লেনদেন দেখানো হচ্ছে
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(1)}
                    disabled={validCurrentPage === 1}
                    className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600"
                  >
                    «
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={validCurrentPage === 1}
                    className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600"
                  >
                    ‹
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(pNum => (
                    <Button
                      key={pNum}
                      variant={validCurrentPage === pNum ? "default" : "outline"}
                      onClick={() => setCurrentPage(pNum)}
                      className={cn(
                        "w-7 h-7 rounded-lg text-xs font-bold p-0",
                        validCurrentPage === pNum
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {toBnDigits(pNum)}
                    </Button>
                  ))}

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={validCurrentPage === totalPages}
                    className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600"
                  >
                    ›
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={validCurrentPage === totalPages}
                    className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600"
                  >
                    »
                  </Button>

                  <Select value={String(itemsPerPage)} onValueChange={val => setItemsPerPage(Number(val))}>
                    <SelectTrigger className="w-24 h-7 rounded-lg border-slate-200 text-xs font-bold ml-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-bengali text-xs">
                      <SelectItem value="10">১০ / পেজ</SelectItem>
                      <SelectItem value="25">২৫ / পেজ</SelectItem>
                      <SelectItem value="50">৫০ / পেজ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </CardContent>
          </Card>
        )}

        {/* TAB 3: SALES (বিক্রি) TAB CONTENT - MATCHES IMAGE 1 EXACTLY */}
        {activeMainTab === 'sales' && (
          <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-4">
              
              {/* 1. FILTER CONTROL BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Left Filter Controls */}
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  
                  {/* Bengali Date Range Picker */}
                  <BengaliDateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(start, end) => {
                      setStartDate(start);
                      setEndDate(end);
                    }}
                    placeholder="তারিখ ফিল্টার"
                  />

                  {/* Status Filter Dropdown */}
                  <Select defaultValue="all">
                    <SelectTrigger className="w-36 h-9 bg-white border-slate-200 rounded-xl text-xs font-bold">
                      <SelectValue placeholder="সব স্ট্যাটাস" />
                    </SelectTrigger>
                    <SelectContent className="font-bengali text-xs">
                      <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                      <SelectItem value="paid">পরিশোধিত</SelectItem>
                      <SelectItem value="due">বকেয়া</SelectItem>
                      <SelectItem value="partial">আংশিক পরিশোধিত</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Site Filter Select for Customers */}
                  {isCustomer && (
                    <Select value={selectedSite} onValueChange={(val: any) => setSelectedSite(val || 'all')}>
                      <SelectTrigger className="w-40 h-9 bg-white border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <SelectValue placeholder="সব সাইট" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="font-bengali text-xs">
                        <SelectItem value="all">সব সাইট (একত্রিত)</SelectItem>
                        {hasUnassignedSiteTx && (
                          <SelectItem value="__no_site__">📦 সাধারণ খাতা (সাইট ছাড়া)</SelectItem>
                        )}
                        {availableSites.map((s, idx) => (
                          <SelectItem key={idx} value={s}>
                            📍 {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Search Input Box */}
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="ইনভয়েস / গ্রাহক / বিবরণ খুঁজুন..."
                      className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200"
                    />
                  </div>

                  {/* Filter Button */}
                  <Button variant="outline" className="h-9 px-3.5 border-slate-200 text-slate-700 font-bold text-xs rounded-xl bg-white hover:bg-slate-50 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span>ফিল্টার</span>
                  </Button>
                </div>

                {/* Right Action Button: + নতুন বিক্রি */}
                <Link href="/pos">
                  <Button className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    <span>নতুন বিক্রি</span>
                  </Button>
                </Link>
              </div>

              {/* 2. SALES TABLE */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                    <TableRow className="text-xs text-slate-700 font-black">
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">ইনভয়েস নং</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">তারিখ</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">{isEngineer ? 'গ্রাহকের নাম' : isSupplier ? 'সরবরাহকৃত পণ্য' : 'পণ্যর ধরণ'}</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">{isEngineer ? 'পণ্য ও পরিমাণ' : isSupplier ? 'চালান মূল্য (৳)' : 'মোট পরিমাণ (৳)'}</TableHead>
                      <TableHead className="py-3 px-4 text-right font-black text-slate-900">{isEngineer ? 'চালান মূল্য (৳)' : isSupplier ? 'পরিশোধ (৳)' : 'প্রাপ্তি (৳)'}</TableHead>
                      <TableHead className="py-3 px-4 text-right font-black text-slate-900">{isEngineer ? 'অর্জিত কমিশন (৳)' : 'বকেয়া (৳)'}</TableHead>
                      <TableHead className="py-3 px-4 text-center font-black text-slate-900">স্ট্যাটাস</TableHead>
                      <TableHead className="py-3 px-4 text-center font-black text-slate-900">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-bold text-slate-800 divide-y divide-slate-100">
                    {siteTransactions.filter(t => isSupplier ? t.transactionType === 'purchase' : (t.transactionType === 'sale' || !t.transactionType)).length > 0 ? (
                      siteTransactions.filter(t => isSupplier ? t.transactionType === 'purchase' : (t.transactionType === 'sale' || !t.transactionType)).map(t => {
                        let meta: any = {};
                        if (t.notes && typeof t.notes === 'string' && t.notes.trim().startsWith('{')) {
                          try { meta = JSON.parse(t.notes.split('\n')[0]); } catch {}
                        }
                        const comm = Number(meta.engineerTotalCommission || (t as any).engineerTotalCommission || 0);
                        const rodKg = Number(meta.engineerRodKg || (t as any).engineerRodKg || 0);
                        const cemBags = Number(meta.engineerCementBags || (t as any).engineerCementBags || 0);

                        const due = t.dueAmount !== undefined ? t.dueAmount : (t.totalAmount - (t.paidAmount || 0));
                        const isPaid = due <= 0;
                        const isPartial = !isPaid && (t.paidAmount || 0) > 0;
                        return (
                          <TableRow 
                            key={t.id} 
                            className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                            onClick={() => setSelectedInvoiceTx(t)}
                          >
                            <TableCell className="py-3.5 px-4 text-left font-mono font-bold text-blue-600 hover:underline">
                              <div>{t.invoiceNo || (isSupplier ? `PUR-${t.id.slice(0, 6).toUpperCase()}` : `INV-${t.id.slice(0, 6).toUpperCase()}`)}</div>
                              {t.siteName && (
                                <div className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-sans font-semibold mt-0.5">
                                  <MapPin className="w-2.5 h-2.5" /> {t.siteName}
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-left text-slate-700 font-medium">
                              {formatBnDate(t.createdAt, 'dd MMMM yyyy')}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-left text-slate-800 font-bold">
                              {isEngineer ? (t.customerName || 'খুচরা গ্রাহক') : isSupplier ? (t.items && t.items.length > 0 ? t.items.map((i: any) => cleanLegacyBengaliText(i.product_name || i.name || 'পণ্য')).join(', ') : 'পণ্য সামগ্রী') : 'সিমেন্ট / রড'}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-left text-slate-700">
                              {isEngineer ? (
                                <div className="space-y-0.5 text-[11px]">
                                  {rodKg > 0 && <span className="block text-slate-800 font-semibold">রড: {toBnDigits(rodKg)} কেজি</span>}
                                  {cemBags > 0 && <span className="block text-slate-800 font-semibold">সিমেন্ট: {toBnDigits(cemBags)} বস্তা</span>}
                                  {!rodKg && !cemBags && <span>পণ্য সামগ্রী</span>}
                                </div>
                              ) : isSupplier ? (
                                <div className="space-y-0.5 text-[11px]">
                                  <span className="text-slate-900 font-bold block">
                                    ৳ {toBnDigits((t.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                                  </span>
                                  {meta.laborPayer === 'supplier' && Number(meta.laborCost || 0) > 0 && (
                                    <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mr-1">
                                      লেবার: +৳{toBnDigits(Number(meta.laborCost || 0).toLocaleString('en-IN'))}
                                    </span>
                                  )}
                                  {meta.shippingPayer === 'supplier' && Number(meta.shippingCost || 0) > 0 && (
                                    <span className="inline-block text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                      গাড়ি ভাড়া: +৳{toBnDigits(Number(meta.shippingCost || 0).toLocaleString('en-IN'))}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-emerald-600 font-bold">
                                  ৳ {t.totalAmount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-bold text-slate-900">
                              ৳ {toBnDigits((t.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-bold text-emerald-600">
                              {isEngineer ? (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black">
                                  ৳ {toBnDigits(comm.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                                </span>
                              ) : (
                                <span className="text-rose-600 font-bold">
                                  ৳ {toBnDigits(due.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-center">
                              {t.status === 'pending' || t.status === 'draft' ? (
                                <span className="inline-block bg-purple-100/90 text-purple-700 font-black text-[11px] px-2.5 py-0.5 rounded-full border border-purple-200">
                                  অপেক্ষমাণ (Pending)
                                </span>
                              ) : isPaid ? (
                                <span className="inline-block bg-emerald-100/80 text-emerald-700 font-bold text-[11px] px-3 py-0.5 rounded-full">
                                  পরিশোধিত
                                </span>
                              ) : isPartial ? (
                                <span className="inline-block bg-yellow-100/80 text-yellow-800 font-bold text-[11px] px-3 py-0.5 rounded-full">
                                  আংশিক পরিশোধিত
                                </span>
                              ) : (
                                <span className="inline-block bg-amber-100/80 text-amber-700 font-bold text-[11px] px-3 py-0.5 rounded-full">
                                  বকেয়া
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-center">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedInvoiceTx(t); }}
                                className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
                              >
                                👁️
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold">
                          কোনো বিক্রি চালানের রেকর্ড পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 3. PAGINATION FOOTER */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-semibold text-slate-500">
                <div>
                  মোট <strong className="text-slate-900 font-bold">{toBnDigits(transactions.length)}</strong>টি ইনভয়েস দেখানো হচ্ছে
                </div>

                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">«</Button>
                  <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">‹</Button>
                  <Button className="w-7 h-7 rounded-lg text-xs font-bold p-0 bg-blue-600 text-white">১</Button>
                  <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">›</Button>
                  <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">»</Button>
                  <Select defaultValue="10">
                    <SelectTrigger className="w-24 h-7 rounded-lg border-slate-200 text-xs font-bold ml-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-bengali text-xs">
                      <SelectItem value="10">১০ / পেজ</SelectItem>
                      <SelectItem value="25">২৫ / পেজ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </CardContent>
          </Card>
        )}

        {/* TAB 4: PAYMENTS (পেমেন্ট) TAB CONTENT - MATCHES IMAGE 2 EXACTLY */}
        {activeMainTab === 'payments' && (
          <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-4">
              
              {/* 1. FILTER CONTROL BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Left Filter Controls */}
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  
                  {/* Bengali Date Range Picker */}
                  <BengaliDateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(start, end) => {
                      setStartDate(start);
                      setEndDate(end);
                    }}
                    placeholder="তারিখ ফিল্টার"
                  />

                  {/* Payment Method Select */}
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40 h-9 bg-white border-slate-200 rounded-xl text-xs font-bold">
                      <SelectValue placeholder="সব পেমেন্ট মেথড" />
                    </SelectTrigger>
                    <SelectContent className="font-bengali text-xs">
                      <SelectItem value="all">সব পেমেন্ট মেথড</SelectItem>
                      <SelectItem value="cash">ক্যাশ</SelectItem>
                      <SelectItem value="bank">ব্যাংক</SelectItem>
                      <SelectItem value="bkash">বিকাশ</SelectItem>
                      <SelectItem value="nagad">নগদ</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Search Input Box */}
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="রেফারেন্স / বিবরণ খুঁজুন..."
                      className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200"
                    />
                  </div>
                </div>

                {/* Right Action Button: + টাকা গ্রহণ */}
                <Button onClick={openGeneralPaymentModal} className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>টাকা গ্রহণ</span>
                </Button>
              </div>

              {/* 2. PAYMENTS TABLE */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                    <TableRow className="text-xs text-slate-700 font-black">
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">রসিদ নং</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">তারিখ</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">পেমেন্ট মেথড</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">অ্যাকাউন্ট</TableHead>
                      <TableHead className="py-3 px-4 text-right font-black text-slate-900">টাকা (৳)</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">বিবরণ</TableHead>
                      <TableHead className="py-3 px-4 text-center font-black text-slate-900">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-bold text-slate-800 divide-y divide-slate-100">
                    {ledgerEntries.filter(e => e.type === 'PAYMENT').length > 0 ? (
                      ledgerEntries.filter(e => e.type === 'PAYMENT').map(p => (
                        <TableRow key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <TableCell className="py-3.5 px-4 text-left font-mono font-bold text-blue-600 hover:underline cursor-pointer">
                            {p.refNo}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left text-slate-700 font-medium">
                            {formatBnDate(p.date, 'dd MMMM yyyy')}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left text-slate-800 font-bold">
                            {p.paymentMethod || 'ক্যাশ'}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left text-slate-600 font-medium">
                            {p.account || '—'}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-right font-bold text-emerald-600">
                            ৳ {p.credit.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left text-slate-700 font-medium">
                            {p.description || 'ক্যাশ পেমেন্ট'}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-center">
                            <button className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100">
                              👁️
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                          কোনো পেমেন্টের রেকর্ড পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 3. PAGINATION FOOTER */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-semibold text-slate-500">
                <div>
                  মোট <strong className="text-slate-900 font-bold">{toBnDigits(ledgerEntries.filter(e => e.type === 'PAYMENT').length)}</strong>টি লেনদেন দেখানো হচ্ছে
                </div>

                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">«</Button>
                  <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">‹</Button>
                  <Button className="w-7 h-7 rounded-lg text-xs font-bold p-0 bg-blue-600 text-white">১</Button>
                  <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">›</Button>
                  <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">»</Button>
                  <Select defaultValue="10">
                    <SelectTrigger className="w-24 h-7 rounded-lg border-slate-200 text-xs font-bold ml-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-bengali text-xs">
                      <SelectItem value="10">১০ / পেজ</SelectItem>
                      <SelectItem value="25">২৫ / পেজ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </CardContent>
          </Card>
        )}

        {/* TAB 5: DOCUMENTS (ডকুমেন্টস) TAB CONTENT */}
        {activeMainTab === 'documents' && (
          <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <CardContent className="p-6 sm:p-10">
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 max-w-xl mx-auto">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">কোনো ফাইল বা ডকুমেন্ট যুক্ত করা হয়নি</h4>
                  <p className="text-xs text-slate-500 max-w-md">
                    আপনার গ্রাহক বা সরবরাহকারীর সংগে সম্পর্কিত যেকোনো ডকুমেন্টস (যেমন: NID, Trade License, TIN ইত্যাদি) এখানে নিরাপদে আপলোড করে রাখতে পারেন।
                  </p>
                </div>
                <label className="cursor-pointer pt-2">
                  <input
                    type="file"
                    className="hidden"
                    onChange={() => toast.info('ডকুমেন্ট আপলোড সুবিধা শীঘ্রই চালু হচ্ছে')}
                  />
                  <Button type="button" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs h-9 px-4">
                    <Plus className="w-4 h-4" />
                    <span>নতুন ডকুমেন্ট আপলোড করুন</span>
                  </Button>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 6: NOTES (নোটস) TAB CONTENT */}
        {activeMainTab === 'notes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Column 1: অভ্যন্তরীণ নোট */}
            <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">অভ্যন্তরীণ নোট</h3>
                  {party?.createdAt && (
                    <span className="text-[11px] text-slate-400 font-medium">
                      যুক্ত করার তারিখ: {formatBnDate(party.createdAt, 'dd MMMM yyyy')}
                    </span>
                  )}
                </div>

                {party?.note && party.note.trim() ? (
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-medium text-amber-950 leading-relaxed whitespace-pre-wrap">
                      {party.note}
                    </p>
                    <div className="border-t border-amber-200/60 pt-2 flex items-center justify-between text-[11px] text-amber-900/80 font-medium">
                      <span>নিবন্ধিত নোট</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs font-bold text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    কোনো অভ্যন্তরীণ নোট যুক্ত করা হয়নি
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Column 2: কল ইতিহাস */}
            <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">কল ইতিহাস</h3>
                </div>

                <div className="py-12 text-center text-xs font-bold text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  কোনো কল ইতিহাস সংরক্ষণ করা নেই
                </div>
              </CardContent>
            </Card>

          </div>
        )}

      </div>



      {/* 📄 INVOICE & TRANSACTION DETAILS VIEW MODAL */}
      <Dialog open={!!selectedInvoiceTx} onOpenChange={open => !open && setSelectedInvoiceTx(null)}>
        <DialogContent className="w-[96vw] max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-slate-50/90 rounded-2xl border border-slate-200/80 shadow-2xl font-bengali">
          {selectedInvoiceTx && (
            <div className="space-y-4">
              {(() => {
                const isLoanTx = selectedInvoiceTx.transactionType === 'loan_in' || 
                  (selectedInvoiceTx as any).transaction_type === 'loan_in' ||
                  String(selectedInvoiceTx.description || selectedInvoiceTx.note || '').includes('লোন গ্রহণ');

                const isPaymentTx = isLoanTx ||
                  selectedInvoiceTx.transactionType === 'payment' || 
                  selectedInvoiceTx.transactionType === 'payment_in' || 
                  selectedInvoiceTx.transactionType === 'payment_out' || 
                  selectedInvoiceTx.transactionType === 'income' || 
                  selectedInvoiceTx.transactionType === 'expense' || 
                  (!selectedInvoiceTx.items?.length && (selectedInvoiceTx.paidAmount > 0 || (selectedInvoiceTx as any).credit > 0) && selectedInvoiceTx.dueAmount === 0);

                if (isPaymentTx) {
                  const voucherData = {
                    id: selectedInvoiceTx.id,
                    voucherNo: selectedInvoiceTx.orderId || selectedInvoiceTx.invoiceNo || selectedInvoiceTx.id,
                    type: (isLoanTx ? 'income' : (isCustomer ? 'income' : 'expense')) as any,
                    category: isLoanTx ? 'লোন গ্রহণ' : undefined,
                    partyName: isCustomer ? (selectedInvoiceTx.customerName || party?.name || 'গ্রাহক') : (selectedInvoiceTx.supplierName || party?.name || 'সরবরাহকারী'),
                    partyPhone: party?.phone || '',
                    partyAddress: party?.address || '',
                    amount: selectedInvoiceTx.paidAmount || selectedInvoiceTx.totalAmount,
                    paidAmount: selectedInvoiceTx.paidAmount || selectedInvoiceTx.totalAmount,
                    paymentMethod: selectedInvoiceTx.paymentMethod || 'cash',
                    bankName: selectedInvoiceTx.bankName,
                    chequeNo: selectedInvoiceTx.chequeNo,
                    description: selectedInvoiceTx.description || selectedInvoiceTx.note || (isLoanTx ? 'লোন গ্রহণ ভাউচার' : 'পেমেন্ট ভাউচার'),
                    createdAt: selectedInvoiceTx.createdAt
                  };

                  return (
                    <>
                      <PaymentVoucherDetailsView
                        voucher={voucherData}
                        onBack={() => setSelectedInvoiceTx(null)}
                        onPrint={() => printElement('party-printable-payment-voucher')}
                      />
                      <div id="party-printable-payment-voucher" className="hidden print:block">
                        <PaymentVoucherMemo
                          voucher={voucherData}
                          showPrintButton={false}
                        />
                      </div>
                    </>
                  );
                }

                if (selectedInvoiceTx.transactionType === 'sale_return' || selectedInvoiceTx.transactionType === 'purchase_return') {
                  const returnData = {
                    id: selectedInvoiceTx.id,
                    invoiceNo: selectedInvoiceTx.orderId || selectedInvoiceTx.invoiceNo || `RET-${String(selectedInvoiceTx.id).slice(0, 6).toUpperCase()}`,
                    customerName: selectedInvoiceTx.customerName || (isCustomer ? (party?.name || 'সম্মানিত গ্রাহক') : 'সম্মানিত গ্রাহক'),
                    customerPhone: selectedInvoiceTx.customerPhone || (isCustomer ? (party?.phone || '') : ''),
                    customerAddress: selectedInvoiceTx.customerAddress || (isCustomer ? (party?.address || '') : ''),
                    totalReturnValue: selectedInvoiceTx.totalAmount,
                    totalAmount: selectedInvoiceTx.totalAmount,
                    paidAmount: selectedInvoiceTx.paidAmount,
                    cashRefundPaid: selectedInvoiceTx.paidAmount,
                    dueAdjusted: selectedInvoiceTx.dueAmount,
                    dueAmount: selectedInvoiceTx.dueAmount,
                    items: selectedInvoiceTx.items || [],
                    returnedItems: (selectedInvoiceTx.items || []).map((it: any) => ({
                      name: cleanLegacyBengaliText(it.name || it.product_name || 'পণ্য'),
                      quantity: Number(it.quantity || 1),
                      price: Number(it.price || it.rate || 0),
                      unit: it.unit || 'টি',
                      total: Number(it.total || (it.quantity * (it.price || it.rate)) || 0)
                    })),
                    reason: selectedInvoiceTx.note || selectedInvoiceTx.notes || 'পণ্য ফেরত',
                    createdAt: selectedInvoiceTx.createdAt,
                    paymentMethod: selectedInvoiceTx.paymentMethod || 'cash'
                  };

                  return (
                    <>
                      <SalesReturnDetailsView
                        returnEntry={returnData}
                        onBack={() => setSelectedInvoiceTx(null)}
                        onPrint={() => printElement('party-printable-return-memo')}
                      />
                      <div id="party-printable-return-memo" className="hidden print:block">
                        <ReturnInvoiceMemo
                          returnEntry={returnData as any}
                        />
                      </div>
                    </>
                  );
                }

                if (isCustomer || isEngineer || selectedInvoiceTx.transactionType === 'sale') {
                  let meta: any = {};
                  const rawNote = selectedInvoiceTx.note || selectedInvoiceTx.notes || '';
                  if (rawNote && typeof rawNote === 'string' && rawNote.trim().startsWith('{')) {
                    try {
                      meta = JSON.parse(rawNote.split('\n')[0]);
                    } catch {}
                  }
                  const invoiceData = {
                    id: selectedInvoiceTx.id,
                    invoiceNo: selectedInvoiceTx.orderId || selectedInvoiceTx.invoiceNo || `INV-${String(selectedInvoiceTx.id).slice(0, 6).toUpperCase()}`,
                    orderId: selectedInvoiceTx.orderId || selectedInvoiceTx.id,
                    customerName: selectedInvoiceTx.customerName || (isCustomer ? (party?.name || 'সম্মানিত গ্রাহক') : 'সম্মানিত গ্রাহক'),
                    customerPhone: selectedInvoiceTx.customerPhone || (isCustomer ? (party?.phone || '') : ''),
                    customerAddress: selectedInvoiceTx.customerAddress || (isCustomer ? (party?.address || '') : ''),
                    siteName: (selectedInvoiceTx as any).siteName || (selectedInvoiceTx as any).site_name || meta.siteName || meta.site_name || '',
                    siteAddress: (selectedInvoiceTx as any).siteAddress || (selectedInvoiceTx as any).site_address || meta.siteAddress || meta.site_address || '',
                    siteContact: (selectedInvoiceTx as any).siteContact || (selectedInvoiceTx as any).site_contact || meta.siteContact || meta.site_contact || '',
                    totalAmount: selectedInvoiceTx.totalAmount,
                    paidAmount: selectedInvoiceTx.paidAmount,
                    dueAmount: selectedInvoiceTx.dueAmount,
                    items: (selectedInvoiceTx.items || []).map((it: any) => ({
                      name: cleanLegacyBengaliText(it.name || it.product_name || 'পণ্য'),
                      quantity: Number(it.quantity || 1),
                      price: Number(it.price || it.rate || 0),
                      unit: it.unit || 'টি',
                      totalPrice: Number(it.totalPrice || (it.quantity * (it.price || it.rate)) || 0)
                    })),
                    createdAt: selectedInvoiceTx.createdAt,
                    paymentMethod: selectedInvoiceTx.paymentMethod || 'cash',
                    note: selectedInvoiceTx.note || selectedInvoiceTx.notes || '',
                    subtotal: selectedInvoiceTx.subtotal || selectedInvoiceTx.totalAmount,
                    discount: selectedInvoiceTx.discount || 0,
                    shippingCost: selectedInvoiceTx.shippingCost || 0,
                    laborCost: selectedInvoiceTx.laborCost || 0,
                    previousBalance: isCustomer ? Number(party?.openingBalance || 0) : 0
                  };

                  return (
                    <>
                      <SalesInvoiceDetailsView
                        invoice={invoiceData}
                        onBack={() => setSelectedInvoiceTx(null)}
                        onPrint={() => printElement('party-printable-invoice-memo')}
                      />
                      <div id="party-printable-invoice-memo" className="hidden print:block">
                        <InvoiceMemo
                          invoice={invoiceData as any}
                          showPrintButton={false}
                        />
                      </div>
                    </>
                  );
                }

                const purchaseData = {
                  id: selectedInvoiceTx.id,
                  invoiceNo: selectedInvoiceTx.orderId || selectedInvoiceTx.invoiceNo || `PUR-${String(selectedInvoiceTx.id).slice(0, 6).toUpperCase()}`,
                  orderId: selectedInvoiceTx.orderId || selectedInvoiceTx.id,
                  supplierName: selectedInvoiceTx.supplierName || party?.name || 'সরবরাহকারী',
                  supplierPhone: party?.phone || '',
                  supplierAddress: party?.address || '',
                  totalAmount: selectedInvoiceTx.totalAmount,
                  paidAmount: selectedInvoiceTx.paidAmount,
                  dueAmount: selectedInvoiceTx.dueAmount,
                  items: (selectedInvoiceTx.items || []).map((it: any) => ({
                    name: cleanLegacyBengaliText(it.name || it.product_name || 'পণ্য'),
                    quantity: Number(it.quantity || 1),
                    price: Number(it.price || it.rate || 0),
                    unit: it.unit || 'টি',
                    totalPrice: Number(it.totalPrice || (it.quantity * it.price) || 0)
                  })),
                  createdAt: selectedInvoiceTx.createdAt,
                  paymentMethod: selectedInvoiceTx.paymentMethod || 'cash',
                  paymentStatus: selectedInvoiceTx.dueAmount <= 0 ? 'paid' : (selectedInvoiceTx.paidAmount || 0) > 0 ? 'partial' : 'unpaid',
                  note: selectedInvoiceTx.note || selectedInvoiceTx.notes || '',
                  notes: selectedInvoiceTx.notes || selectedInvoiceTx.note || '',
                  shippingCost: selectedInvoiceTx.shippingCost || 0,
                  laborCost: selectedInvoiceTx.laborCost || 0,
                  shippingPayer: selectedInvoiceTx.shippingPayer || 'shop',
                  laborPayer: selectedInvoiceTx.laborPayer || 'shop',
                  shippingStatus: selectedInvoiceTx.shippingStatus || 'paid',
                  laborStatus: selectedInvoiceTx.laborStatus || 'paid',
                  shippingPaidAmount: selectedInvoiceTx.shippingPaidAmount,
                  laborPaidAmount: selectedInvoiceTx.laborPaidAmount
                };

                return (
                  <>
                    <PurchaseInvoiceDetailsView
                      invoice={purchaseData}
                      onBack={() => setSelectedInvoiceTx(null)}
                      onPrint={() => printElement('party-printable-purchase-memo')}
                    />
                    <div id="party-printable-purchase-memo" className="hidden print:block">
                      <PurchaseInvoiceMemo
                        invoice={purchaseData as any}
                        showPrintButton={false}
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Historical Ledger Import Modal */}
      <DataImportModal
        open={isLedgerImportOpen}
        onOpenChange={setIsLedgerImportOpen}
        defaultType="customer_ledger"
        preselectedParty={party ? { id: party.id, name: party.name, phone: party.phone } : undefined}
        onSuccess={() => {
          loadData();
          toast.success('কাস্টমার লেজার সফলভাবে হালনাগাদ করা হয়েছে!');
        }}
      />

      {/* 📍 ADD NEW CUSTOMER SITE MODAL */}
      <Dialog open={isAddSiteOpen} onOpenChange={setIsAddSiteOpen}>
        <DialogContent className="max-w-md font-bengali">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>কাস্টমারের নতুন সাইট যুক্ত করুন</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold text-slate-700">সাইটের নাম *</Label>
              <Input
                value={newSiteName}
                onChange={e => setNewSiteName(e.target.value)}
                placeholder="যেমন: মিয়াপাড়া সাইট, বাসভবন, মার্কেট প্রজেক্ট..."
                className="mt-1 h-9 rounded-xl text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">সাইটের পূর্ণ ঠিকানা (ঐচ্ছিক)</Label>
              <Input
                value={newSiteAddress}
                onChange={e => setNewSiteAddress(e.target.value)}
                placeholder="যেমন: মিয়াপাড়া মোড়, গোপালগঞ্জ"
                className="mt-1 h-9 rounded-xl text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">সাইটের দায়িত্বপ্রাপ্ত ব্যক্তি / মিস্ত্রি (ঐচ্ছিক)</Label>
              <Input
                value={newSiteContact}
                onChange={e => setNewSiteContact(e.target.value)}
                placeholder="যেমন: রফিক মিস্ত্রি (০১৭১১...)"
                className="mt-1 h-9 rounded-xl text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddSiteOpen(false)} className="rounded-xl font-bold">
              বাতিল
            </Button>
            <Button 
              size="sm" 
              onClick={handleCreateSite} 
              disabled={isSavingSite} 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
            >
              {isSavingSite ? 'সংরক্ষণ হচ্ছে...' : 'সাইট যুক্ত করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WAIVE MODAL DIALOG */}
      <Dialog open={isWaiveOpen} onOpenChange={(open) => { if (!open) setIsWaiveOpen(false); }}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6 font-bengali">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </span>
              <span>বকেয়া মওকুফ / রাইট-অফ (Waive-off)</span>
            </DialogTitle>
          </DialogHeader>

          {party && (
            <div className="space-y-4 py-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold">গ্রাহকের নাম:</span>
                  <span className="text-sm font-black text-slate-900">{party.name}</span>
                </div>
                {party.businessName && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-bold">প্রতিষ্ঠান:</span>
                    <span className="text-xs font-bold text-slate-700">{party.businessName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold">বর্তমান বকেয়া:</span>
                  <span className="text-sm font-black text-rose-600">৳ {toBnDigits(totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">মওকুফের পরিমাণ (টাকা):</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                  <Input
                    type="number"
                    value={waiveAmount || ''}
                    onChange={(e) => setWaiveAmount(Number(e.target.value) || 0)}
                    className="pl-8 rounded-xl font-mono font-black text-sm h-10 border-slate-200"
                    placeholder="০"
                    max={totalDue}
                  />
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setWaiveAmount(Number(Number(totalDue).toFixed(2)))}
                    className="text-[11px] font-bold text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded cursor-pointer"
                  >
                    সম্পূর্ণ বকেয়া (৳{toBnDigits(Number(totalDue).toFixed(2))})
                  </button>
                  {Math.round(totalDue) > 20 && (
                    <button
                      type="button"
                      onClick={() => setWaiveAmount(20)}
                      className="text-[11px] font-bold text-slate-600 hover:underline bg-slate-100 px-2 py-0.5 rounded cursor-pointer"
                    >
                      ২০ টাকা
                    </button>
                  )}
                  {Math.round(totalDue) > 10 && (
                    <button
                      type="button"
                      onClick={() => setWaiveAmount(10)}
                      className="text-[11px] font-bold text-slate-600 hover:underline bg-slate-100 px-2 py-0.5 rounded cursor-pointer"
                    >
                      ১০ টাকা
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">মওকুফের কারণ / বিবরণ:</Label>
                <Input
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  className="rounded-xl text-xs font-bold h-10 border-slate-200"
                  placeholder="যেমন: খুচরা বকেয়া মওকুফ"
                />
              </div>

              {/* Security PIN input */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    মওকুফ সিকিউরিটি পাসওয়ার্ড:
                  </Label>
                  <span className="text-[10px] text-slate-400 font-semibold">(সেটিংস থেকে পরিবর্তনযোগ্য)</span>
                </div>
                <div className="relative">
                  <Input
                    type={showWaivePassword ? "text" : "password"}
                    value={waivePassword}
                    onChange={(e) => setWaivePassword(e.target.value)}
                    placeholder="পাসওয়ার্ড লিখুন (যেমন: 1234)"
                    data-no-bangla="true"
                    name="password"
                    autoComplete="off"
                    className="no-bangla rounded-xl text-xs font-bold h-10 border-slate-200 pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWaivePassword(!showWaivePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showWaivePassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                  >
                    {showWaivePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {waivePassword && toEnglishDigits(waivePassword).trim() !== getWaivePin() ? (
                  <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                    ⚠️ ভুল পাসওয়ার্ড! সঠিক মওকুফ সিকিউরিটি পাসওয়ার্ড প্রদান করুন
                  </p>
                ) : waivePassword ? (
                  <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                    ✓ পাসওয়ার্ড সঠিক হয়েছে, মওকুফ নিশ্চিত করতে পারেন
                  </p>
                ) : null}
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11.5px] font-bold text-amber-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  এই ৳{toBnDigits(waiveAmount)} টাকা ডিসকাউন্ট হিসেবে লেজারে জমা হবে এবং অবশিষ্ট বকেয়া থাকবে: <strong>৳{toBnDigits(Math.max(0, Math.round(totalDue - waiveAmount)))}</strong>।
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsWaiveOpen(false)}
              disabled={isWaiving}
              className="rounded-xl text-xs font-bold h-9"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={handleConfirmWaive}
              disabled={isWaiving || waiveAmount <= 0 || !waivePassword.trim() || toEnglishDigits(waivePassword).trim() !== getWaivePin()}
              className="rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white h-9 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isWaiving ? 'মওকুফ হচ্ছে...' : 'মওকুফ নিশ্চিত করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
