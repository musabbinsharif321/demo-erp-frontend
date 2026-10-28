'use client';

import React from 'react';
import { toBnDigits, PartyProfile } from '@/components/PartyProfilePage';
import { numberToBengaliWords, cleanLegacyBengaliText } from '@/lib/bengaliUtils';
import { DEVELOPER_LOGO_BASE64 } from '@/lib/developerLogo';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { computeSiteAdvanceAdjustments } from '@/lib/ledgerUtils';

export interface PrintLedgerRow {
  date: string;
  description: string;
  quantity: string;
  rate: string;
  deposit: string;
  amount: string;
  rawDeposit: number;
  rawAmount: number;
}

export const formatLedgerNum = (val: number | string | undefined | null, emptyValue: string = '-'): string => {
  if (val === undefined || val === null || val === '') return emptyValue;
  const num = Number(val);
  if (isNaN(num) || num === 0) return emptyValue;
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const parts = absNum.toFixed(1).split('.');
  const intPart = Number(parts[0]).toLocaleString('en-IN');
  const decPart = parts[1];
  return `${isNegative ? '-' : ''}${toBnDigits(`${intPart}.${decPart}`)}`;
};

export const formatLedgerDate = (dateVal: any): string => {
  if (!dateVal) return '—';
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return String(dateVal);
    const raw = format(d, 'dd-MM-yyyy', { locale: bn });
    return toBnDigits(raw);
  } catch {
    return '—';
  }
};

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

export function buildLedgerPrintRows(
  party: PartyProfile | null,
  transactions: any[],
  isCustomer: boolean,
  isEngineer: boolean = false,
  startDate?: string,
  endDate?: string,
  isSupplier: boolean = false,
  selectedSite?: string,
  categoryFilter: 'all' | 'rod' | 'cement' = 'all',
  txnTypeFilter: string = 'all'
): { rows: PrintLedgerRow[]; totalAmount: number; totalDeposit: number; netBalance: number } {
  const rows: PrintLedgerRow[] = [];
  let totalAmount = 0;
  let totalDeposit = 0;

  const startObj = startDate ? new Date(startDate) : null;
  const endObj = endDate ? new Date(endDate) : null;
  if (endObj) endObj.setHours(23, 59, 59, 999);

  const isSiteFiltered = Boolean(selectedSite && selectedSite !== 'all');

  // Separate opening / previous balance from transactions prior to startDate (only for combined/all sites or general account)
  let priorBalance = (categoryFilter !== 'all' || (isSiteFiltered && selectedSite !== '__no_site__')) ? 0 : Number(party?.openingBalance || 0);

  // Automatic Advance Deductions for customer sites
  const siteAdjustments = (isCustomer && isSiteFiltered && selectedSite !== '__no_site__')
    ? computeSiteAdvanceAdjustments(party, transactions).filter(adj => adj.siteName.toLowerCase() === selectedSite!.trim().toLowerCase())
    : [];

  const adjustmentTxList = siteAdjustments.map(adj => ({
    id: adj.id,
    orderId: adj.saleId,
    invoiceNo: adj.invoiceNo,
    totalAmount: 0,
    paidAmount: adj.adjustedAmount,
    paymentMethod: 'অগ্রিম সমন্বয়',
    notes: adj.description,
    description: adj.description,
    status: 'completed',
    transactionType: 'payment_in',
    siteName: adj.siteName,
    createdAt: typeof adj.date === 'string' ? adj.date : new Date(adj.date).toISOString()
  }));

  const combinedTransactions = [...transactions, ...adjustmentTxList];

  const sorted = combinedTransactions.sort((a, b) => {
    const da = new Date(a.createdAt || 0);
    const db = new Date(b.createdAt || 0);
    return da.getTime() - db.getTime();
  });

  const inScopeTransactions: any[] = [];

  sorted.forEach(tx => {
    if (tx.status === 'cancelled' || tx.status === 'rejected' || tx.status === 'pending' || tx.status === 'draft') return;
    
    // Site filter when specific site is chosen
    if (isSiteFiltered) {
      const txSite = (tx.siteName || tx.site_name || '').trim();
      if (selectedSite === '__no_site__') {
        if (txSite !== '') return;
      } else {
        if (txSite.toLowerCase() !== selectedSite!.trim().toLowerCase()) return;
      }
    }

    const txDate = new Date(tx.createdAt || 0);

    if (startObj && txDate < startObj) {
      // Accumulate into prior balance
      const txType = tx.transactionType;
      let bill = Number(tx.totalAmount || 0);
      const paid = Number(tx.paidAmount || 0);

      let meta: any = {};
      if (tx.notes && typeof tx.notes === 'string' && tx.notes.trim().startsWith('{')) {
        try { meta = JSON.parse(tx.notes.split('\n')[0]); } catch {}
      }

      // Exclude labor & shipping charges for suppliers only if Dokan is paying them
      if (txType === 'purchase' || !isCustomer || isSupplier) {
        const labCost = Number(meta.laborCost || (tx as any).laborCost || (tx as any).labor_cost || 0);
        const shipCost = Number(meta.shippingCost || (tx as any).shippingCost || (tx as any).shipping_cost || (tx as any).transportCost || 0);
        const shipPayer = meta.shippingPayer || (tx as any).shippingPayer || 'shop';
        const laborPayer = meta.laborPayer || (tx as any).laborPayer || 'shop';
        const deductLab = laborPayer !== 'supplier' ? labCost : 0;
        const deductShip = shipPayer !== 'supplier' ? shipCost : 0;
        bill = Math.max(0, bill - (deductLab + deductShip));
      }

      if (txType === 'loan_in') {
        priorBalance += (bill || paid);
      } else if (txType === 'payment_in' || txType === 'payment_out' || (isEngineer && txType === 'payment')) {
        priorBalance -= (paid || bill);
      } else if (txType === 'sale_return' || txType === 'purchase_return') {
        priorBalance -= (bill - paid);
      } else if (isEngineer) {
        const comm = Number(meta.engineerTotalCommission || (tx as any).engineerTotalCommission || 0);
        const rodKg = Number(meta.engineerRodKg || (tx as any).engineerRodKg || 0);
        const rodRate = Number(meta.engineerRodRate || (tx as any).engineerRodRate || 0);
        const cemBags = Number(meta.engineerCementBags || (tx as any).engineerCementBags || 0);
        const cemRate = Number(meta.engineerCementRate || (tx as any).engineerCementRate || 0);
        const effectiveComm = comm > 0 ? comm : (rodKg * rodRate + cemBags * cemRate);
        priorBalance += effectiveComm;
      } else {
        priorBalance += bill;
        if (paid > 0) priorBalance -= paid;
      }
      return;
    }

    if (endObj && txDate > endObj) return;

    inScopeTransactions.push(tx);
  });

  // 1. Opening row if priorBalance is non-zero
  if (priorBalance !== 0) {
    const opDateStr = startDate 
      ? formatLedgerDate(startDate) 
      : formatLedgerDate(party?.joinedDate || party?.createdAt || new Date());

    if (priorBalance > 0) {
      totalAmount += priorBalance;
      rows.push({
        date: opDateStr,
        description: isEngineer ? 'পূর্বের কমিশন পাওনা' : 'পূর্বের প্রারম্ভিক বকেয়া',
        quantity: '-',
        rate: '-',
        deposit: '-',
        amount: formatLedgerNum(priorBalance),
        rawDeposit: 0,
        rawAmount: priorBalance,
      });
    } else {
      const absBal = Math.abs(priorBalance);
      totalDeposit += absBal;
      rows.push({
        date: opDateStr,
        description: isEngineer ? 'পূর্বের অগ্রিম কমিশন' : 'পূর্বের প্রারম্ভিক জমা',
        quantity: '-',
        rate: '-',
        deposit: formatLedgerNum(absBal),
        amount: '-',
        rawDeposit: absBal,
        rawAmount: 0,
      });
    }
  }

  // 2. Iterate in-scope transactions
  inScopeTransactions.forEach(tx => {
    const txDateStr = formatLedgerDate(tx.createdAt);
    const txType = tx.transactionType;

    let meta: any = {};
    if (tx.notes && typeof tx.notes === 'string' && tx.notes.trim().startsWith('{')) {
      try { meta = JSON.parse(tx.notes.split('\n')[0]); } catch {}
    }

    if (txType === 'loan_in') {
      const loanAmt = Number(tx.totalAmount || tx.paidAmount || 0);
      if (loanAmt > 0) {
        totalAmount += loanAmt;
        const loanNo = tx.invoiceNo || tx.orderId || `LOAN-${String(tx.id || '').slice(0, 5).toUpperCase()}`;
        const userNote = tx.description || tx.notes || '';
        let cleanNote = userNote;
        if (cleanNote.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(cleanNote.split('\n')[0]);
            cleanNote = parsed.userNote || parsed.note || '';
          } catch {
            cleanNote = '';
          }
        }
        rows.push({
          date: txDateStr,
          description: `লোন গ্রহণ / ঋণ (ভাউচার: #${loanNo})${cleanNote ? ` - ${cleanNote}` : ''}`,
          quantity: '-',
          rate: '-',
          deposit: '-',
          amount: formatLedgerNum(loanAmt),
          rawDeposit: 0,
          rawAmount: loanAmt,
        });
      }
    } else if (txType === 'payment_in' || txType === 'payment_out' || (isEngineer && txType === 'payment')) {
      if (txnTypeFilter === 'sale') return;
      const paid = Number(tx.paidAmount || tx.totalAmount || 0);
      if (paid > 0) {
        totalDeposit += paid;
        let payDesc = isEngineer ? 'কমিশন পরিশোধ' : 'জমা';
        if (tx.paymentMethod === 'অগ্রিম সমন্বয়' || (tx.description && tx.description.includes('অগ্রিম'))) {
          payDesc = tx.description;
        } else if (tx.notes && typeof tx.notes === 'string' && !tx.notes.trim().startsWith('{') && tx.notes.trim() !== '') {
          payDesc = `জমা (${tx.notes.trim()})`;
        }

        rows.push({
          date: txDateStr,
          description: payDesc,
          quantity: '-',
          rate: '-',
          deposit: formatLedgerNum(paid),
          amount: '-',
          rawDeposit: paid,
          rawAmount: 0,
        });
      }

      const payDiscount = Number(tx.discount || 0);
      if (payDiscount > 0) {
        totalDeposit += payDiscount;
        rows.push({
          date: txDateStr,
          description: 'ছাড় / বাট্টা',
          quantity: '-',
          rate: '-',
          deposit: formatLedgerNum(payDiscount),
          amount: '-',
          rawDeposit: payDiscount,
          rawAmount: 0,
        });
      }
    } else if (txType === 'sale_return' || txType === 'purchase_return') {
      const retAmt = Number(tx.totalAmount || 0);
      const refundPaid = Number(tx.paidAmount || 0);
      const items = tx.items || [];

      let relevantRetItems = items;
      if (categoryFilter === 'rod') {
        relevantRetItems = items.filter(isRodItem);
        if (items.length > 0 && relevantRetItems.length === 0) return;
      } else if (categoryFilter === 'cement') {
        relevantRetItems = items.filter(isCementItem);
        if (items.length > 0 && relevantRetItems.length === 0) return;
      }

      if (relevantRetItems.length > 0) {
        relevantRetItems.forEach((it: any) => {
          let name = cleanLegacyBengaliText(it.product_name || it.name || 'পণ্য ফেরত');
          const qty = Number(it.quantity || 1);
          const price = Number(it.price || 0);
          const itemTotal = Number(it.total) || (qty * price);

          totalDeposit += itemTotal;
          rows.push({
            date: txDateStr,
            description: `পণ্য ফেরত: ${name}`,
            quantity: formatLedgerNum(qty),
            rate: formatLedgerNum(price),
            deposit: formatLedgerNum(itemTotal),
            amount: '-',
            rawDeposit: itemTotal,
            rawAmount: 0,
          });
        });
      } else if (categoryFilter === 'all' && retAmt > 0) {
        totalDeposit += retAmt;
        rows.push({
          date: txDateStr,
          description: tx.note ? `পণ্য ফেরত (${tx.note})` : 'পণ্য ফেরত',
          quantity: '-',
          rate: '-',
          deposit: formatLedgerNum(retAmt),
          amount: '-',
          rawDeposit: retAmt,
          rawAmount: 0,
        });
      }
      if (refundPaid > 0) {
        totalAmount += refundPaid;
        rows.push({
          date: txDateStr,
          description: isCustomer ? 'নগদ ক্যাশ ফেরত প্রদান' : 'ফেরত প্রাপ্তি ক্যাশ গ্রহণ',
          quantity: '-',
          rate: '-',
          deposit: '-',
          amount: formatLedgerNum(refundPaid),
          rawDeposit: 0,
          rawAmount: refundPaid,
        });
      }
    } else if (isEngineer) {
      if (txType === 'sale' || !txType) {
        const comm = Number(meta.engineerTotalCommission || (tx as any).engineerTotalCommission || 0);
        const rodKg = Number(meta.engineerRodKg || (tx as any).engineerRodKg || 0);
        const rodRate = Number(meta.engineerRodRate || (tx as any).engineerRodRate || 0);
        const cemBags = Number(meta.engineerCementBags || (tx as any).engineerCementBags || 0);
        const cemRate = Number(meta.engineerCementRate || (tx as any).engineerCementRate || 0);
        const effectiveComm = comm > 0 ? comm : (rodKg * rodRate + cemBags * cemRate);

        if (effectiveComm > 0) {
          totalAmount += effectiveComm;
          const invNo = tx.invoiceNo || tx.orderId || `INV-${String(tx.id || '').slice(0, 5).toUpperCase()}`;
          const custName = tx.customerName || (tx.party_name ? tx.party_name : 'খুচরা গ্রাহক');
          let desc = `বিক্রয় চালান কমিশন (চালান: #${invNo}`;
          if (custName) desc += ` | খরিদ্দার: ${custName}`;
          if (rodKg > 0) desc += ` | রড: ${toBnDigits(rodKg)} কেজি @ ৳${toBnDigits(rodRate)}`;
          if (cemBags > 0) desc += ` | সিমেন্ট: ${toBnDigits(cemBags)} বস্তা @ ৳${toBnDigits(cemRate)}`;
          desc += `)`;

          rows.push({
            date: txDateStr,
            description: desc,
            quantity: '-',
            rate: '-',
            deposit: '-',
            amount: formatLedgerNum(effectiveComm),
            rawDeposit: 0,
            rawAmount: effectiveComm,
          });
        }
      }
    } else {
      // Normal sale / purchase invoice: Expand every line item
      const items = tx.items || [];
      const labCost = Number(meta.laborCost || (tx as any).laborCost || (tx as any).labor_cost || 0);
      const shipCost = Number(meta.shippingCost || (tx as any).shippingCost || (tx as any).shipping_cost || (tx as any).transportCost || 0);

      // Special discount from invoice or purchase
      const discountPercent = Number(meta.discountPercent || 0);
      let invDiscount = Number(tx.discount) > 0 
        ? Number(tx.discount) 
        : Number(meta.discountFlat || meta.discount || meta.discountAmount || meta.cartTotalDiscount || meta.commission || meta.commissionAmount || 0);

      if (invDiscount <= 0 && discountPercent > 0 && items.length > 0) {
        const sub = items.reduce((sum: number, it: any) => sum + (Number(it.total) || (Number(it.quantity || 1) * Number(it.price || 0))), 0);
        invDiscount = Math.round(((sub * discountPercent) / 100) * 100) / 100;
      }

      // Check item-level discounts
      if (invDiscount <= 0 && items.length > 0) {
        const itemDiscounts = items.reduce((sum: number, it: any) => sum + ((Number(it.discount) || 0) * (Number(it.quantity) || 1)), 0);
        if (itemDiscounts > 0) {
          invDiscount = itemDiscounts;
        }
      }

      // Fallback: check difference between subtotal and totalAmount
      if (invDiscount <= 0 && tx.subtotal && tx.totalAmount) {
        const expectedTotal = Number(tx.subtotal) + (isCustomer ? (labCost + shipCost) : 0);
        const actualTotal = Number(tx.totalAmount);
        if (expectedTotal - actualTotal > 0.5) {
          invDiscount = Math.round((expectedTotal - actualTotal) * 100) / 100;
        }
      }

      if (items.length > 0) {
        let relevantItems = items;
        if (categoryFilter === 'rod') {
          relevantItems = items.filter(isRodItem);
        } else if (categoryFilter === 'cement') {
          relevantItems = items.filter(isCementItem);
        }

        if (categoryFilter !== 'all' && relevantItems.length === 0) {
          return;
        }

        relevantItems.forEach((it: any) => {
          let name = cleanLegacyBengaliText(it.product_name || it.name || 'পণ্য');
          const qty = Number(it.quantity || 1);
          const price = Number(it.price || 0);
          const itemTotal = Number(it.total) || (qty * price);

          totalAmount += itemTotal;
          rows.push({
            date: txDateStr,
            description: name,
            quantity: formatLedgerNum(qty),
            rate: formatLedgerNum(price),
            deposit: '-',
            amount: formatLedgerNum(itemTotal),
            rawDeposit: 0,
            rawAmount: itemTotal,
          });
        });

        if (categoryFilter === 'rod') {
          const rodLoadToCustomer = meta.rodLoadingToCustomerLedger !== false && (tx as any).rodLoadingToCustomerLedger !== false;
          const rodLab = rodLoadToCustomer ? Number(meta.rodLaborCost || (meta.rodLaborRate ? meta.rodLaborRate * Number(meta.rodRingTotalKg || 0) : 0)) : 0;
          if (rodLab > 0) {
            totalAmount += rodLab;
            rows.push({
              date: txDateStr,
              description: 'লেবার খরচ (রড লোডিং)',
              quantity: '১.০',
              rate: formatLedgerNum(rodLab),
              deposit: '-',
              amount: formatLedgerNum(rodLab),
              rawDeposit: 0,
              rawAmount: rodLab,
            });
          }
          const rodUnloadToCustomer = meta.rodUnloadingToCustomerLedger !== false && (tx as any).rodUnloadingToCustomerLedger !== false;
          const rodUnload = rodUnloadToCustomer ? Number(meta.rodUnloadingCost || (meta.rodUnloadingRate ? meta.rodUnloadingRate * Number(meta.rodRingTotalKg || 0) : 0)) : 0;
          if (rodUnload > 0) {
            totalAmount += rodUnload;
            rows.push({
              date: txDateStr,
              description: 'রড আনলোডিং লেবার',
              quantity: '১.০',
              rate: formatLedgerNum(rodUnload),
              deposit: '-',
              amount: formatLedgerNum(rodUnload),
              rawDeposit: 0,
              rawAmount: rodUnload,
            });
          }
          const shipToCustomer = meta.shippingCostToCustomerLedger !== false && (tx as any).shippingCostToCustomerLedger !== false;
          const rodShip = shipToCustomer ? Number(meta.rodShippingCost || 0) : 0;
          if (rodShip > 0) {
            totalAmount += rodShip;
            rows.push({
              date: txDateStr,
              description: 'গাড়ি ভাড়া (রড)',
              quantity: '১.০',
              rate: formatLedgerNum(rodShip),
              deposit: '-',
              amount: formatLedgerNum(rodShip),
              rawDeposit: 0,
              rawAmount: rodShip,
            });
          }
        } else if (categoryFilter === 'cement') {
          const cemLoadToCustomer = Boolean(meta.cementLoadingToCustomerLedger || (tx as any).cementLoadingToCustomerLedger);
          const cemLoad = cemLoadToCustomer ? Number(meta.cementLaborCost || (meta.cementLaborRate ? meta.cementLaborRate * Number(meta.cementTotalBags || 0) : 0)) : 0;
          if (cemLoad > 0) {
            totalAmount += cemLoad;
            rows.push({
              date: txDateStr,
              description: 'সিমেন্ট লোডিং লেবার',
              quantity: '১.০',
              rate: formatLedgerNum(cemLoad),
              deposit: '-',
              amount: formatLedgerNum(cemLoad),
              rawDeposit: 0,
              rawAmount: cemLoad,
            });
          }
          const cemUnloadToCustomer = meta.cementUnloadingToCustomerLedger !== false && (tx as any).cementUnloadingToCustomerLedger !== false;
          const cemUnload = cemUnloadToCustomer ? Number(meta.cementUnloadingCost || (meta.cementUnloadingRate ? meta.cementUnloadingRate * Number(meta.cementTotalBags || 0) : 0)) : 0;
          if (cemUnload > 0) {
            totalAmount += cemUnload;
            rows.push({
              date: txDateStr,
              description: 'সিমেন্ট আনলোডিং লেবার',
              quantity: '১.০',
              rate: formatLedgerNum(cemUnload),
              deposit: '-',
              amount: formatLedgerNum(cemUnload),
              rawDeposit: 0,
              rawAmount: cemUnload,
            });
          }
          const shipToCustomer = meta.shippingCostToCustomerLedger !== false && (tx as any).shippingCostToCustomerLedger !== false;
          const cemShip = shipToCustomer ? Number(meta.cementShippingCost || 0) : 0;
          if (cemShip > 0) {
            totalAmount += cemShip;
            rows.push({
              date: txDateStr,
              description: 'গাড়ি ভাড়া (সিমেন্ট)',
              quantity: '১.০',
              rate: formatLedgerNum(cemShip),
              deposit: '-',
              amount: formatLedgerNum(cemShip),
              rawDeposit: 0,
              rawAmount: cemShip,
            });
          }
        }
      } else {
        if (categoryFilter !== 'all') {
          const descStr = `${tx.description || ''} ${tx.notes || ''}`.toLowerCase();
          if (categoryFilter === 'rod' && !descStr.includes('রড') && !descStr.includes('rod') && !descStr.includes('রিং')) return;
          if (categoryFilter === 'cement' && !descStr.includes('সিমেন্ট') && !descStr.includes('cement')) return;
        }

        let bill = Number(tx.subtotal || tx.totalAmount || 0);
        if (!tx.subtotal && invDiscount > 0) {
          bill += invDiscount;
        }
        // Deduct labor and shipping so bill represents strictly the goods value
        bill = Math.max(0, bill - (labCost + shipCost));
        totalAmount += bill;
        rows.push({
          date: txDateStr,
          description: isCustomer ? 'পণ্য বিক্রয়' : 'পণ্য ক্রয়',
          quantity: '১.০',
          rate: formatLedgerNum(bill),
          deposit: '-',
          amount: formatLedgerNum(bill),
          rawDeposit: 0,
          rawAmount: bill,
        });
      }

      const isSupplierTx = txType === 'purchase' || isSupplier || !isCustomer;
      const shipPayer = meta.shippingPayer || (tx as any).shippingPayer || 'shop';
      const laborPayer = meta.laborPayer || (tx as any).laborPayer || 'shop';

      // Labor charge: Added to customer sales, or to supplier purchases if supplier pays/bills it (only for all-product view)
      if (categoryFilter === 'all') {
        const shouldAddLabor = isSupplierTx ? (laborPayer === 'supplier' && labCost > 0) : (labCost > 0);
        if (shouldAddLabor) {
          totalAmount += labCost;
          rows.push({
            date: txDateStr,
            description: isSupplierTx ? 'আনলোডিং / লেবার খরচ (সাপ্লায়ার বহন করবে)' : 'লেবারি',
            quantity: '১.০',
            rate: formatLedgerNum(labCost),
            deposit: '-',
            amount: formatLedgerNum(labCost),
            rawDeposit: 0,
            rawAmount: labCost,
          });
        }

        // Transport / shipping charge
        const shouldAddShipping = isSupplierTx ? (shipPayer === 'supplier' && shipCost > 0) : (shipCost > 0);
        if (shouldAddShipping) {
          totalAmount += shipCost;
          rows.push({
            date: txDateStr,
            description: isSupplierTx ? 'গাড়ি ভাড়া / পরিবহন (সাপ্লায়ার বহন করবে)' : 'ভাড়া',
            quantity: '১.০',
            rate: formatLedgerNum(shipCost),
            deposit: '-',
            amount: formatLedgerNum(shipCost),
            rawDeposit: 0,
            rawAmount: shipCost,
          });
        }

        if (invDiscount > 0) {
          totalAmount -= invDiscount;
          rows.push({
            date: txDateStr,
            description: isSupplier ? 'বিশেষ ছাড় / কমিশন' : 'বিশেষ ছাড় (ডিসকাউন্ট)',
            quantity: '-',
            rate: '-',
            deposit: '-',
            amount: `-${formatLedgerNum(invDiscount)}`,
            rawDeposit: 0,
            rawAmount: -invDiscount,
          });
        }
      }

      // Immediate cash payment on invoice
      const initPaid = Number(tx.paidAmount || 0);
      if (initPaid > 0 && txnTypeFilter !== 'sale' && categoryFilter === 'all') {
        totalDeposit += initPaid;
        rows.push({
          date: txDateStr,
          description: 'জমা',
          quantity: '-',
          rate: '-',
          deposit: formatLedgerNum(initPaid),
          amount: '-',
          rawDeposit: initPaid,
          rawAmount: 0,
        });
      }
    }
  });

  const netBalance = totalAmount - totalDeposit;
  return { rows, totalAmount, totalDeposit, netBalance };
}

interface PartyLedgerPrintMemoProps {
  party: PartyProfile | null;
  transactions: any[];
  isCustomer: boolean;
  isSupplier?: boolean;
  isEngineer?: boolean;
  startDate?: string;
  endDate?: string;
  selectedSite?: string;
  categoryFilter?: 'all' | 'rod' | 'cement';
  txnTypeFilter?: string;
}

export const PartyLedgerPrintMemo: React.FC<PartyLedgerPrintMemoProps> = ({
  party,
  transactions,
  isCustomer,
  isSupplier = false,
  isEngineer = false,
  startDate,
  endDate,
  selectedSite,
  categoryFilter = 'all',
  txnTypeFilter = 'all'
}) => {
  const [promo] = React.useState(() => {
    const defaults = {
      softwareCompany: 'Hasanah Tech Solution',
      softwarePhone: '01349345353',
      softwareWebsite: 'www.hasanahtech.vercel.app',
    };
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('softwarePromoInfo');
        if (saved) return { ...defaults, ...JSON.parse(saved) };
      } catch {}
    }
    return defaults;
  });

  const { rows, totalAmount, totalDeposit, netBalance } = buildLedgerPrintRows(
    party,
    transactions,
    isCustomer,
    isEngineer,
    startDate,
    endDate,
    isSupplier,
    selectedSite,
    categoryFilter,
    txnTypeFilter
  );

  const hasSelectedSite = Boolean(selectedSite && selectedSite !== 'all');

  return (
    <div 
      id="printable-memo-wrapper" 
      className="printable-memo font-bengali text-black bg-white w-full max-w-[850px] mx-auto p-4 leading-tight print:p-0 print:m-0 print:w-full print:max-w-none flex flex-col justify-between min-h-[275mm]"
    >
      {/* 1. TOP COLORFUL SHOP BANNER (MATCHES USER'S UPLOADED FILE EXACTLY) */}
      <div className="relative overflow-hidden border border-slate-300 rounded-sm mb-1.5 p-2.5 text-center bg-gradient-to-r from-blue-50/50 via-white to-sky-50/50">
        
        {/* Left Geometric Angular Accents */}
        <div className="absolute top-0 left-0 w-24 h-full pointer-events-none overflow-hidden opacity-90">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <polygon points="0,0 80,0 30,100 0,100" fill="#1e3a8a" />
            <polygon points="40,0 100,0 50,100 20,100" fill="#dc2626" opacity="0.85" />
            <polygon points="70,0 100,0 80,100 45,100" fill="#0284c7" opacity="0.9" />
          </svg>
        </div>

        {/* Right Geometric Angular Accents */}
        <div className="absolute top-0 right-0 w-24 h-full pointer-events-none overflow-hidden opacity-90">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <polygon points="20,0 100,0 100,100 70,100" fill="#0284c7" />
            <polygon points="0,0 60,0 40,100 0,100" fill="#dc2626" opacity="0.85" />
            <polygon points="10,0 50,0 80,100 30,100" fill="#1e3a8a" opacity="0.9" />
          </svg>
        </div>

        {/* Banner Texts */}
        <div className="relative z-10 space-y-0.5">
          <p className="text-[11px] font-bold text-slate-800 tracking-wider">
            মোবাইলঃ ০১৭১২-০১৪২২৫, ০১৭২৭-৯৫২৫১৩
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-[#154284] tracking-tight leading-tight">
            মেসার্স দেলোয়ার এন্ড ব্রাদার্স
          </h1>
          <p className="text-xs font-bold text-[#9e1c1c]">
            প্রোঃ- মোঃ মিকাঈল শেখ
          </p>
          <div className="pt-0.5">
            <span className="inline-block bg-[#325288] text-white px-4 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
              পরিচালনায়ঃ মোঃ সায়মন শেখ
            </span>
          </div>
          <p className="text-[11px] font-bold text-[#c52222]">
            রড, সিমেন্ট, পাইকারী ও খুচরা বিক্রয় করা হয়।
          </p>
          <p className="text-[11px] font-bold text-[#1a56b0]">
            ডিলারঃ এ্যাংকর সিমেন্ট এবং হোলসিম সিমেন্ট, BSRM / SCRM রড
          </p>
          <div className="pt-0.5">
            <span className="inline-block bg-[#1a365d] text-white px-5 py-0.5 rounded text-[10px] font-semibold">
              চৌধুরী নিউ সুপার মার্কেট ...., বঙ্গবন্ধু সড়ক, গোপালগঞ্জ।
            </span>
          </div>
        </div>
      </div>

      {/* 2. INVOICE META & CUSTOMER DETAILS BOX */}
      <div className="border border-black mb-1 bg-white">
        <div className="relative border-b border-black py-0.5 px-3 text-center">
          <span className="font-black text-xs tracking-widest uppercase">
            {hasSelectedSite 
              ? (selectedSite === '__no_site__' ? `খতিয়ান / চালান (সাধারণ খাতা - সাইট ছাড়া${categoryFilter === 'rod' ? ' - শুধু রড' : categoryFilter === 'cement' ? ' - শুধু সিমেন্ট' : ''})` : `খতিয়ান / চালান (সাইট: ${selectedSite}${categoryFilter === 'rod' ? ' - শুধু রড' : categoryFilter === 'cement' ? ' - শুধু সিমেন্ট' : ''})`) 
              : `খতিয়ান / চালান${categoryFilter === 'rod' ? ' (শুধু রড)' : categoryFilter === 'cement' ? ' (শুধু সিমেন্ট)' : ''}`}
          </span>
          <span className="absolute right-3 top-0.5 font-bold text-xs">০১</span>
        </div>
        <div className={`grid ${hasSelectedSite ? 'grid-cols-3' : 'grid-cols-2'} text-xs`}>
          <div className="border-r border-black py-1 px-3 flex items-center gap-2">
            <span className="font-black whitespace-nowrap">
              {isCustomer ? 'ক্রেতা ঃ' : isSupplier ? 'সরবরাহকারী ঃ' : 'পার্টি ঃ'}
            </span>
            <span className="font-bold text-black">{party?.name || ''}</span>
          </div>
          {hasSelectedSite && (
            <div className="border-r border-black py-1 px-3 flex items-center gap-2 bg-slate-50">
              <span className="font-black whitespace-nowrap text-blue-950">সাইট ঃ</span>
              <span className="font-black text-blue-900">{selectedSite === '__no_site__' ? 'সাধারণ খাতা (সাইট ছাড়া)' : selectedSite}</span>
            </div>
          )}
          <div className="py-1 px-3 flex items-center gap-2">
            <span className="font-black whitespace-nowrap">ঠিকানা ঃ</span>
            <span className="font-normal text-black">{party?.address || party?.businessName || '—'}</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN LEDGER CHRONOLOGICAL TABLE (6 COLUMNS) */}
      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr className="border-b border-black bg-white font-black text-black">
            <th className="border border-black py-1 px-2 text-center w-[95px] font-bold">তারিখ</th>
            <th className="border border-black py-1 px-2 text-center font-bold">বিবরণ</th>
            <th className="border border-black py-1 px-2 text-center w-[85px] font-bold">পরিমাণ</th>
            <th className="border border-black py-1 px-2 text-center w-[75px] font-bold">দর</th>
            <th className="border border-black py-1 px-2 text-center w-[100px] font-bold">জমা</th>
            <th className="border border-black py-1 px-2 text-center w-[115px] font-bold">টাকা</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="border-b border-black text-black">
              <td colSpan={6} className="border border-black py-6 text-center font-bold text-slate-500">
                কোনো লেনদেনের তথ্য পাওয়া যায়নি
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={idx} className="border-b border-black text-black break-inside-avoid">
                <td className="border border-black py-0.5 px-2 text-center font-normal whitespace-nowrap">{row.date}</td>
                <td className="border border-black py-0.5 px-2 text-center font-bold">{row.description}</td>
                <td className="border border-black py-0.5 px-2 text-right font-normal">{row.quantity}</td>
                <td className="border border-black py-0.5 px-2 text-right font-normal">{row.rate}</td>
                <td className="border border-black py-0.5 px-2 text-right font-bold">{row.deposit}</td>
                <td className="border border-black py-0.5 px-2 text-right font-bold">{row.amount}</td>
              </tr>
            ))
          )}

          {/* Summary Box (Rendered once at the end of the ledger on the final page) */}
          <tr className="border-t-2 border-black font-bold break-inside-avoid">
            <td colSpan={4} rowSpan={3} className="border border-black p-2.5 align-middle text-left bg-white">
              <div className="flex items-start gap-2">
                <span className="font-black whitespace-nowrap">কথায় ঃ</span>
                <span className="font-bold text-black">{numberToBengaliWords(netBalance).replace(' টাকা মাত্র', '')} টাকা মাত্র।</span>
              </div>
              {hasSelectedSite && selectedSite !== '__no_site__' && Number((party as any)?.advance_balance || (party as any)?.advanceBalance || 0) > 0 && (
                <div className="text-[11px] font-bold text-slate-800 mt-1.5 border-t border-dashed border-slate-300 pt-1">
                  * বিঃ দ্রঃ— সম্মানিত গ্রাহকের মূল একাউন্টে এখনো ৳{toBnDigits(Number((party as any)?.advance_balance || (party as any)?.advanceBalance || 0).toLocaleString('en-IN'))} অগ্রিম জমা বিদ্যমান রয়েছে।
                </div>
              )}
            </td>
            <td className="border border-black py-1 px-2 text-center font-black">মোট</td>
            <td className="border border-black py-1 px-2 text-right font-black">{formatLedgerNum(totalAmount, toBnDigits('০.০'))}</td>
          </tr>
          <tr className="border-t border-black font-bold break-inside-avoid">
            <td className="border border-black py-1 px-2 text-center font-black">জমা</td>
            <td className="border border-black py-1 px-2 text-right font-black">{formatLedgerNum(totalDeposit, toBnDigits('০.০'))}</td>
          </tr>
          <tr className="border-t border-black font-bold break-inside-avoid">
            <td className="border border-black py-1 px-2 text-center font-black">বাকী</td>
            <td className="border border-black py-1 px-2 text-right font-black">{formatLedgerNum(netBalance, toBnDigits('০.০'))}</td>
          </tr>
        </tbody>
      </table>

      {/* 4. SIGNATURES */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold pt-8 pb-2 text-black break-inside-avoid">
        <div>
          <div className="w-28 mx-auto border-t border-dashed border-black pt-1 font-bold">
            প্রস্তুতকারী
          </div>
        </div>
        <div>
          <div className="w-28 mx-auto border-t border-dashed border-black pt-1 font-bold">
            হিসাব রক্ষক
          </div>
        </div>
        <div>
          <div className="w-28 mx-auto border-t border-dashed border-black pt-1 font-bold">
            ব্যবস্থাপক
          </div>
        </div>
        <div>
          <div className="w-28 mx-auto border-t border-dashed border-black pt-1 font-bold">
            গ্রহীতা / খরিদ্দার
          </div>
        </div>
      </div>

      {/* 5. PROFESSIONAL DEVELOPER BRANDING FOOTER (ALWAYS AT PAGE BOTTOM) */}
      <div 
        data-has-dev-footer="true" 
        className="mt-auto pt-2 pb-0.5 border-t border-slate-200/90 flex items-center justify-between text-[9px] font-sans text-slate-400 select-none break-inside-avoid"
      >
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DEVELOPER_LOGO_BASE64} alt="" className="w-3.5 h-3.5 object-contain opacity-60 grayscale rounded-xs" />
          <span className="text-[7.5px] font-mono font-semibold uppercase tracking-wider px-1 py-0.2 rounded border border-slate-200 bg-slate-50 text-slate-500">
            SYS
          </span>
          <span className="text-slate-500 font-normal">
            সফটওয়্যার পরিচালনায়: <strong className="font-semibold text-slate-600">{promo.softwareCompany || 'Hasanah Tech Solution'}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 font-mono text-[8.5px]">
          {promo.softwareWebsite && (
            <>
              <span className="text-slate-400 font-normal">{promo.softwareWebsite}</span>
              <span className="text-slate-300">•</span>
            </>
          )}
          <span className="text-slate-500 font-normal">
            হটলাইন: <strong className="font-semibold text-slate-600">{toBnDigits(promo.softwarePhone || '01349345353')}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
