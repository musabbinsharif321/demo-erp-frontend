export interface SiteAdvanceAdjustment {
  id: string;
  saleId: string;
  invoiceNo: string;
  siteName: string;
  adjustedAmount: number;
  date: string | Date;
  description: string;
  sourcePaymentId?: string;
}

/**
 * Computes automatic advance deductions for customer site invoices.
 * 
 * Logic:
 * 1. Tracks general advance pool (from general payments, negative opening balance, or unassigned credits).
 * 2. When a sale occurs on a specific site with unpaid due:
 *    - If general advance is available, it automatically adjusts/covers the site due.
 * 3. When a general payment (with no site) is made later:
 *    - It first settles any unpaid site invoices in chronological order (FIFO).
 *    - Any remaining amount stays in the advance pool for future site deliveries.
 */
export function computeSiteAdvanceAdjustments(
  party: any,
  allTransactions: any[]
): SiteAdvanceAdjustment[] {
  if (!party || !Array.isArray(allTransactions) || allTransactions.length === 0) {
    return [];
  }

  // Filter out invalid/pending transactions
  const validTx = allTransactions.filter(t => 
    t.status !== 'cancelled' && 
    t.status !== 'rejected' && 
    t.status !== 'pending' && 
    t.status !== 'draft'
  );

  // Sort chronologically
  const sorted = [...validTx].sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime();
    const db = new Date(b.createdAt || 0).getTime();
    return da - db;
  });

  const adjustments: SiteAdvanceAdjustment[] = [];

  // Initial Advance Pool from opening balance (if negative, it's customer advance)
  const rawOpBal = Number(party?.openingBalance !== undefined ? party.openingBalance : (party?.opening_balance !== undefined ? party.opening_balance : 0));
  let advancePool = rawOpBal < 0 ? Math.abs(rawOpBal) : 0;
  let initialUnpaidDue = rawOpBal > 0 ? rawOpBal : 0;

  // Queue of unpaid site invoices waiting for payments
  const unpaidSiteInvoices: Array<{
    tx: any;
    siteName: string;
    remainingDue: number;
    invoiceNo: string;
  }> = [];

  for (const tx of sorted) {
    const txType = tx.transactionType || 'sale';
    const sName = (tx.siteName || (tx as any).site_name || '').trim();

    if (txType === 'sale') {
      const bill = Number(tx.totalAmount || 0);
      const directPaid = Number(tx.paidAmount || 0);
      let unpaid = Math.max(0, bill - directPaid);

      if (unpaid > 0) {
        if (sName) {
          // Invoice belongs to a specific site
          const invNo = tx.invoiceNo || tx.orderId || `INV-${String(tx.id).slice(0, 5).toUpperCase()}`;

          // Check if general advance pool is available
          if (advancePool > 0) {
            const canCover = Math.min(unpaid, advancePool);
            advancePool -= canCover;
            unpaid -= canCover;

            adjustments.push({
              id: `adj-adv-${tx.id}-${adjustments.length}`,
              saleId: String(tx.id),
              invoiceNo: invNo,
              siteName: sName,
              adjustedAmount: canCover,
              date: tx.createdAt || new Date().toISOString(),
              description: `পূর্বের সাধারণ অগ্রিম জমা থেকে সমন্বয় (চালান #${invNo})`
            });
          }

          // If still unpaid, add to queue for future general payments to settle
          if (unpaid > 0) {
            unpaidSiteInvoices.push({
              tx,
              siteName: sName,
              remainingDue: unpaid,
              invoiceNo: invNo
            });
          }
        } else {
          // General sale (no site assigned)
          if (advancePool > 0) {
            const canCover = Math.min(unpaid, advancePool);
            advancePool -= canCover;
            unpaid -= canCover;
          }
          if (unpaid > 0) {
            initialUnpaidDue += unpaid;
          }
        }
      }
    } else if (txType === 'payment_in' || txType === 'payment') {
      const payAmt = Number(tx.paidAmount || tx.totalAmount || 0) + Number(tx.discount || 0);
      if (payAmt > 0) {
        if (sName) {
          // Direct payment assigned to a site
          let remPay = payAmt;
          for (const inv of unpaidSiteInvoices) {
            if (remPay <= 0) break;
            if (inv.siteName.toLowerCase() !== sName.toLowerCase() || inv.remainingDue <= 0) continue;
            const cover = Math.min(inv.remainingDue, remPay);
            inv.remainingDue -= cover;
            remPay -= cover;
          }
        } else {
          // General payment (No site)
          let avail = payAmt;

          // 1. Pay off general unpaid due first
          if (initialUnpaidDue > 0) {
            const coverGen = Math.min(initialUnpaidDue, avail);
            initialUnpaidDue -= coverGen;
            avail -= coverGen;
          }

          // 2. Pay off pending site invoices in FIFO order
          for (const inv of unpaidSiteInvoices) {
            if (avail <= 0) break;
            if (inv.remainingDue <= 0) continue;

            const cover = Math.min(inv.remainingDue, avail);
            inv.remainingDue -= cover;
            avail -= cover;

            adjustments.push({
              id: `adj-pay-${tx.id}-${inv.tx.id}-${adjustments.length}`,
              saleId: String(inv.tx.id),
              invoiceNo: inv.invoiceNo,
              siteName: inv.siteName,
              adjustedAmount: cover,
              date: tx.createdAt || new Date().toISOString(),
              description: `সাধারণ জমা থেকে বকেয়া সমন্বয় (চালান #${inv.invoiceNo})`,
              sourcePaymentId: String(tx.id)
            });
          }

          // 3. Any leftover stays in advancePool for future site invoices
          advancePool += avail;
        }
      }
    } else if (txType === 'sale_return') {
      const retAmt = Math.max(0, Number(tx.totalAmount || 0) - Number(tx.paidAmount || 0));
      if (retAmt > 0) {
        if (sName) {
          let remRet = retAmt;
          for (const inv of unpaidSiteInvoices) {
            if (remRet <= 0) break;
            if (inv.siteName.toLowerCase() !== sName.toLowerCase() || inv.remainingDue <= 0) continue;
            const cover = Math.min(inv.remainingDue, remRet);
            inv.remainingDue -= cover;
            remRet -= cover;
          }
        } else {
          let avail = retAmt;
          for (const inv of unpaidSiteInvoices) {
            if (avail <= 0) break;
            if (inv.remainingDue <= 0) continue;
            const cover = Math.min(inv.remainingDue, avail);
            inv.remainingDue -= cover;
            avail -= cover;
            adjustments.push({
              id: `adj-ret-${tx.id}-${inv.tx.id}-${adjustments.length}`,
              saleId: String(inv.tx.id),
              invoiceNo: inv.invoiceNo,
              siteName: inv.siteName,
              adjustedAmount: cover,
              date: tx.createdAt || new Date().toISOString(),
              description: `ফেরত সমন্বয় (চালান #${inv.invoiceNo})`
            });
          }
          advancePool += avail;
        }
      }
    } else if (txType === 'payment_out') {
      const refAmt = Number(tx.paidAmount || tx.totalAmount || 0);
      advancePool = Math.max(0, advancePool - refAmt);
    }
  }

  return adjustments;
}
