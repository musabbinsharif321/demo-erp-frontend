'use client';

import { ReactNode, useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { api, TransactionData } from '@/lib/api';
import { Button } from './ui/button';
import { HardHat, Truck, Search, Bell, Landmark, CheckCircle2, Calendar, FileText, ShoppingCart, ArrowRight, NotebookPen, Plus, Trash2, X, Info, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { BengaliDatePicker } from './ui/BengaliDatePicker';

export const toBnDigits = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  return String(val).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);
};

export const formatBnDate = (dateVal: any, pattern: string = 'dd MMMM yyyy') => {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const raw = format(d, pattern, { locale: bn });
    return toBnDigits(raw);
  } catch {
    return '—';
  }
};

export interface ChequeItem {
  id: string;
  invoiceId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  bankName?: string;
  chequeNo?: string;
  chequeDate?: string;
  amount: number;
  cashAmount?: number;
  status: 'pending' | 'cleared' | 'bounced';
  note?: string;
  createdAt?: any;
  clearedAt?: any;
}

export interface PendingOrderItem {
  id: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  items?: any[];
  createdAt?: any;
  invoiced?: boolean;
  stage?: string;
}

export interface HawlatItem {
  id: string;
  personName: string;
  amount: number;
  note: string;
  date: string;
  isSettled?: boolean;
  settledAt?: string;
  createdAt: string;
  outflowTxId?: string | number;
  inflowTxId?: string | number;
}

export interface ShippingChargeItem {
  id: string;
  invoiceId: string;
  date: string;
  type?: 'sale' | 'purchase';
  partyName?: string;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  deliveryAddress?: string;
  amount: number;
  status: 'pending' | 'paid' | 'partial' | 'overpaid';
  paidAmount?: number;
  dueAmount?: number;
  overpaidAmount?: number;
  rawTx?: any;
}

export interface LaborChargeItem {
  id: string;
  invoiceId: string;
  date: string;
  type?: 'loading' | 'unloading' | 'rod_loading' | 'cement_unloading' | 'rod_unloading';
  partyName?: string;
  cementBags?: number;
  loadingRate?: number;
  rodKg?: number;
  rodRate?: number;
  unloadingSite?: string;
  operatorName?: string;
  amount: number;
  status: 'pending' | 'paid' | 'partial' | 'overpaid';
  paidAmount?: number;
  dueAmount?: number;
  overpaidAmount?: number;
  rawTx?: any;
}

import { useAuth } from '@/lib/authContext';

export function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, role, isAdmin, isStaff, isViewer, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChequeDrawer, setShowChequeDrawer] = useState(false);
  const [showOrdersDrawer, setShowOrdersDrawer] = useState(false);
  const [showHawlatDrawer, setShowHawlatDrawer] = useState(false);
  const [hawlatItems, setHawlatItems] = useState<HawlatItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedHawlat = localStorage.getItem('dokan_hawlat_items');
        return savedHawlat ? JSON.parse(savedHawlat) : [];
      } catch (e) {
        console.error('Error loading Hawlat items:', e);
      }
    }
    return [];
  });
  const [showAddHawlatForm, setShowAddHawlatForm] = useState(false);
  const [settlingHawlat, setSettlingHawlat] = useState<HawlatItem | null>(null);
  const [isAddingHawlat, setIsAddingHawlat] = useState(false);
  const [isSettlingHawlat, setIsSettlingHawlat] = useState(false);
  const [hawlatFilterTab, setHawlatFilterTab] = useState<'all' | 'pending' | 'settled'>('all');

  // Hawlat Form State
  const [hawlatPersonName, setHawlatPersonName] = useState('');
  const [hawlatAmount, setHawlatAmount] = useState('');
  const [hawlatNote, setHawlatNote] = useState('');
  const [hawlatDate, setHawlatDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showShippingDrawer, setShowShippingDrawer] = useState(false);
  const [showLaborDrawer, setShowLaborDrawer] = useState(false);
  const [shippingItems, setShippingItems] = useState<ShippingChargeItem[]>([]);
  const [laborItems, setLaborItems] = useState<LaborChargeItem[]>([]);
  const [shippingFilterTab, setShippingFilterTab] = useState<'all' | 'pending' | 'paid'>('pending');
  const [laborFilterTab, setLaborFilterTab] = useState<'all' | 'pending' | 'paid'>('pending');
  const [settlingShipping, setSettlingShipping] = useState<ShippingChargeItem | null>(null);
  const [settlingLabor, setSettlingLabor] = useState<LaborChargeItem | null>(null);
  const [isSettlingPayment, setIsSettlingPayment] = useState(false);

  const [cheques, setCheques] = useState<ChequeItem[]>([]);
  const [orders, setOrders] = useState<PendingOrderItem[]>([]);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const saveHawlatItems = (items: HawlatItem[]) => {
    setHawlatItems(items);
    try {
      localStorage.setItem('dokan_hawlat_items', JSON.stringify(items));
    } catch (e) {
      console.error('Error saving Hawlat items:', e);
    }
  };

  const loadHawlats = useCallback(async () => {
    try {
      const apiHawlats = await api.hawlats.list();
      if (Array.isArray(apiHawlats)) {
        const formatted: HawlatItem[] = apiHawlats.map(h => {
          const rawNote = h.note || '';
          let userNote = rawNote;
          let outflowTxId: string | number | undefined;
          let inflowTxId: string | number | undefined;

          if (rawNote.trim().startsWith('{')) {
            try {
              const lines = rawNote.split('\n');
              const meta = JSON.parse(lines[0]);
              outflowTxId = meta.outflowTxId;
              inflowTxId = meta.inflowTxId;
              userNote = lines.slice(1).join('\n').trim();
              if (!userNote && meta.userNote) {
                userNote = meta.userNote;
              }
            } catch (err) {
              console.error('Error parsing hawlat metadata:', err);
            }
          }

          return {
            id: String(h.id),
            personName: h.person_name || 'সাধারণ হাওলাত',
            amount: Number(h.amount || 0),
            note: userNote,
            date: h.date || format(new Date(), 'yyyy-MM-dd'),
            isSettled: !!h.is_settled,
            settledAt: h.settled_at || undefined,
            createdAt: h.created_at || new Date().toISOString(),
            outflowTxId,
            inflowTxId,
          };
        });
        setHawlatItems(formatted);
        try {
          localStorage.setItem('dokan_hawlat_items', JSON.stringify(formatted));
        } catch {}
      }
    } catch (e) {
      console.error('Error fetching hawlats from API:', e);
    }
  }, []);

  const handleAddHawlat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddingHawlat) return;

    const numAmount = parseFloat(hawlatAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('সঠিক টাকার পরিমাণ লিখুন');
      return;
    }

    const pName = hawlatPersonName.trim() || 'সাধারণ ব্যক্তি';
    const uNote = hawlatNote.trim();

    setIsAddingHawlat(true);

    // 1. Record payment_out transaction so Cash balance is immediately deducted (- cash)
    let outflowTxId: string | number | undefined;
    try {
      const tx = await api.transactions.create({
        party_name: `হাওলাত প্রদান (${pName})`,
        transaction_type: 'payment_out',
        total_amount: numAmount,
        paid_amount: numAmount,
        due_amount: 0,
        payment_method: 'cash',
        notes: JSON.stringify({
          isHawlat: true,
          hawlatType: 'given',
          personName: pName,
          hawlatDate: hawlatDate,
          userNote: uNote,
        }) + (uNote ? `\n[হাওলাত প্রদান] ${uNote}` : '\n[হাওলাত প্রদান]')
      });
      if (tx && tx.id) {
        outflowTxId = tx.id;
      }
    } catch (err: any) {
      console.error('Error creating hawlat outflow transaction:', err);
      const errMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : '');
      if (errMsg.includes('পর্যাপ্ত নগদ ক্যাশ ব্যালেন্স নেই') || errMsg.includes('paid_amount')) {
        toast.error('পর্যাপ্ত নগদ ক্যাশ ব্যালেন্স নেই! হাওলাত প্রদান করা সম্ভব নয়।');
      } else {
        toast.error('ক্যাশ থেকে টাকা কর্তন লেনদেন তৈরি করতে সমস্যা হয়েছে');
      }
      setIsAddingHawlat(false);
      return;
    }

    const newHawlat: HawlatItem = {
      id: `hw_${Date.now()}`,
      personName: pName,
      amount: numAmount,
      note: uNote,
      date: hawlatDate,
      isSettled: false,
      createdAt: new Date().toISOString(),
      outflowTxId,
    };

    try {
      const notePayload = JSON.stringify({
        outflowTxId,
        userNote: uNote,
      }) + (uNote ? `\n${uNote}` : '');

      const created = await api.hawlats.create({
        person_name: newHawlat.personName,
        amount: newHawlat.amount,
        note: notePayload,
        date: newHawlat.date,
        is_settled: false
      });
      if (created && created.id) {
        newHawlat.id = String(created.id);
      }
    } catch (err) {
      console.error('API Hawlat create error:', err);
    }

    const updated = [newHawlat, ...hawlatItems];
    saveHawlatItems(updated);
    toast.success(`৳ ${numAmount.toLocaleString('bn-BD')} টাকা হাওলাত প্রদান ও ক্যাশ থেকে কর্তন করা হয়েছে!`);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('orderUpdated'));
    }

    setHawlatPersonName('');
    setHawlatAmount('');
    setHawlatNote('');
    setShowAddHawlatForm(false);
    setIsAddingHawlat(false);
  };

  const handleSettleHawlat = async (item: HawlatItem) => {
    if (isSettlingHawlat) return;
    setIsSettlingHawlat(true);

    try {
      // 1. Record payment_in transaction so Cash balance is immediately credited (+ cash)
      let inflowTxId: string | number | undefined;
      try {
        const inTx = await api.transactions.create({
          party_name: `হাওলাত আদায় / ফেরত (${item.personName})`,
          transaction_type: 'payment_in',
          total_amount: item.amount,
          paid_amount: item.amount,
          due_amount: 0,
          payment_method: 'cash',
          notes: JSON.stringify({
            isHawlat: true,
            hawlatType: 'settled',
            hawlatId: item.id,
            personName: item.personName,
            outflowTxId: item.outflowTxId,
            userNote: item.note,
          }) + (item.note ? `\n[হাওলাত আদায়/পরিশোধ] ${item.note}` : '\n[হাওলাত আদায়/পরিশোধ]')
        });
        if (inTx && inTx.id) {
          inflowTxId = inTx.id;
        }
      } catch (err) {
        console.error('Error creating hawlat inflow transaction:', err);
        toast.error('হাওলাত আদায় ক্যাশে জমা করতে সমস্যা হয়েছে');
        return;
      }

      // 2. Update Hawlat item via API
      try {
        const notePayload = JSON.stringify({
          outflowTxId: item.outflowTxId,
          inflowTxId,
          userNote: item.note,
        }) + (item.note ? `\n${item.note}` : '');

        if (!item.id.startsWith('hw_')) {
          await api.hawlats.update(item.id, {
            is_settled: true,
            settled_at: new Date().toISOString(),
            note: notePayload
          });
        }
      } catch (err) {
        console.error('Error settling hawlat via API:', err);
      }

      const updated = hawlatItems.map(h => 
        h.id === item.id 
          ? { ...h, isSettled: true, settledAt: new Date().toISOString(), inflowTxId } 
          : h
      );
      saveHawlatItems(updated);
      toast.success(`৳ ${item.amount.toLocaleString('bn-BD')} টাকা হাওলাত পরিশোধ সম্পন্ন এবং ক্যাশে জমা হয়েছে!`);
      setSettlingHawlat(null);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orderUpdated'));
      }
    } finally {
      setIsSettlingHawlat(false);
    }
  };

  const handleDeleteHawlat = async (itemOrId: string | HawlatItem) => {
    const item = typeof itemOrId === 'string' ? hawlatItems.find(h => h.id === itemOrId) : itemOrId;
    const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;

    try {
      if (item?.outflowTxId) {
        await api.transactions.delete(item.outflowTxId).catch(err => console.warn('Could not delete outflow tx:', err));
      }
      if (item?.inflowTxId) {
        await api.transactions.delete(item.inflowTxId).catch(err => console.warn('Could not delete inflow tx:', err));
      }
      if (!id.startsWith('hw_')) {
        await api.hawlats.delete(id);
      }
    } catch (err) {
      console.error('API Hawlat delete error:', err);
    }
    const updated = hawlatItems.filter(h => h.id !== id);
    saveHawlatItems(updated);
    toast.info('হাওলাত এন্ট্রি মুছে ফেলা হয়েছে');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('orderUpdated'));
    }
  };

  const pendingHawlatItems = hawlatItems.filter(h => !h.isSettled);
  const settledHawlatItems = hawlatItems.filter(h => h.isSettled);
  const pendingHawlatAmount = pendingHawlatItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const settledHawlatAmount = settledHawlatItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  const filteredHawlatItems = hawlatItems.filter(h => {
    if (hawlatFilterTab === 'pending') return !h.isSettled;
    if (hawlatFilterTab === 'settled') return !!h.isSettled;
    return true;
  });

  const loadChequesAndOrders = useCallback(async () => {
    try {
      const txs = await api.transactions.list();
      const safeTxs = Array.isArray(txs) ? txs : [];
      const chequeItems: ChequeItem[] = safeTxs
        .filter(t => 
          t.status !== 'pending' && 
          t.status !== 'draft' && 
          t.status !== 'cancelled' && 
          t.status !== 'rejected'
        )
        .filter(t => {
          if (t.cheque_status === 'cleared' || t.cheque_status === 'bounced') return false;

          // Never treat internal balance transfers as cheques
          let meta: any = {};
          if (t.notes && typeof t.notes === 'string' && t.notes.trim().startsWith('{')) {
            try {
              meta = JSON.parse(t.notes.split('\n')[0]);
              if (meta.isTransfer === true) return false;
            } catch {}
          }
          const notesStr = String(t.notes || '');
          if (notesStr.includes('ব্যালেন্স ট্রান্সফার') || notesStr.includes('ক্যাশ উত্তোলন') || notesStr.includes('isTransfer')) return false;
          const pName = String(t.party_name || '');
          if (pName.includes('➔') || pName.includes('ক্যাশ বাক্স')) return false;

          if (t.payment_method === 'cheque' || t.payment_method === 'check' || t.payment_method === 'split' || !!t.cheque_number || !!t.cheque_bank) return true;
          if (meta.paymentMethodName === 'Split' || meta.paymentMethodName === 'Cheque' || Number(meta.chequePaidAmount) > 0 || Number(meta.splitChequeAmount) > 0 || !!meta.chequeNo) {
            return true;
          }
          return false;
        })
        .map(t => {
          let chequeAmt = t.paid_amount || t.total_amount || 0;
          let chqNo = t.cheque_number;
          let chqBank = t.cheque_bank;
          let chqDate = t.cheque_due_date || (t.created_at ? format(new Date(t.created_at), 'dd/MM/yyyy') : '');

          if (t.notes && typeof t.notes === 'string' && t.notes.trim().startsWith('{')) {
            try {
              const meta = JSON.parse(t.notes.split('\n')[0]);
              if (meta.chequePaidAmount !== undefined && Number(meta.chequePaidAmount) > 0) {
                chequeAmt = Number(meta.chequePaidAmount);
              } else if (meta.splitChequeAmount !== undefined && Number(meta.splitChequeAmount) > 0) {
                chequeAmt = Number(meta.splitChequeAmount);
              }
              if (!chqNo && meta.chequeNo) chqNo = meta.chequeNo;
              if (!chqBank && (meta.chequeBank || meta.bankName || meta.selectedShopBank)) {
                chqBank = meta.chequeBank || meta.bankName || meta.selectedShopBank;
              }
              if (meta.chequeDate) chqDate = meta.chequeDate;
            } catch {}
          }
          return {
            id: String(t.id || t.invoice_no),
            invoiceId: t.invoice_no,
            customerName: t.party_name || 'অজ্ঞাত গ্রাহক',
            customerPhone: t.party_phone || '',
            bankName: chqBank || 'ব্যাংক',
            chequeNo: chqNo || `CHQ-${t.id}`,
            chequeDate: chqDate,
            amount: chequeAmt,
            status: t.cheque_status || 'pending',
            createdAt: t.created_at
          };
        });
      setCheques(chequeItems);

      const orderItems: PendingOrderItem[] = safeTxs
        .filter(t => {
          if (t.transaction_type !== 'sale') return false;
          let meta: any = {};
          if (t.notes && typeof t.notes === 'string' && t.notes.trim().startsWith('{')) {
            try {
              meta = JSON.parse(t.notes.split('\n')[0]);
            } catch {}
          }
          if (meta.invoiced === true || meta.isOrder === false) return false;
          if (t.status === 'completed' || t.status === 'invoiced' || t.status === 'approved') return false;
          return true;
        })
        .map(t => {
          let meta: any = {};
          if (t.notes && typeof t.notes === 'string' && t.notes.trim().startsWith('{')) {
            try {
              meta = JSON.parse(t.notes.split('\n')[0]);
            } catch {}
          }
          const isInvoiced = meta.invoiced === true || t.status === 'completed' || t.status === 'invoiced' || t.status === 'approved';
          return {
            id: String(t.id || t.invoice_no),
            customerName: t.party_name || 'গ্রাহক',
            customerPhone: t.party_phone || '',
            totalAmount: t.total_amount,
            items: t.items || [],
            createdAt: t.created_at,
            invoiced: isInvoiced,
            stage: t.status || 'pending'
          };
        });
      setOrders(orderItems);

      // Load shipping & labor charges from purchase & sales transactions
      const sItems: ShippingChargeItem[] = [];
      const lItems: LaborChargeItem[] = [];

      safeTxs.forEach(t => {
        let meta: any = {};
        if (t.notes && typeof t.notes === 'string' && t.notes.trim().startsWith('{')) {
          try {
            const firstLine = t.notes.split('\n')[0];
            meta = JSON.parse(firstLine);
          } catch {}
        }

        const tAny = t as any;
        const txDate = t.created_at || new Date().toISOString();

        // 1. PURCHASE TRANSACTIONS (Shipping & Unloading)
        if (t.transaction_type === 'purchase') {
          const rawStatus = String(t.status || meta.status || '').toLowerCase().trim();
          const isPending = rawStatus === 'pending' || rawStatus === 'draft' || rawStatus === 'cancelled' || rawStatus === 'rejected' || rawStatus === 'অপেক্ষমান' || rawStatus === 'বাতিল';
          if (isPending) return;

          const shipCost = Number(tAny.shipping_cost !== undefined ? tAny.shipping_cost : (meta.shippingCost || meta.transportCost || 0));
          const labCost = Number(tAny.labor_cost !== undefined ? tAny.labor_cost : (meta.laborCost || 0));
          const invNo = t.invoice_no || (t.id ? `PUR-${t.id}` : 'PUR-0001');

          const shipPaidAmt = Number(meta.shippingPaidAmount !== undefined ? meta.shippingPaidAmount : (meta.shippingStatus === 'paid' ? shipCost : 0));
          const labPaidAmt = Number(meta.laborPaidAmount !== undefined ? meta.laborPaidAmount : (meta.laborStatus === 'paid' ? labCost : 0));

          const shipPayer = meta.shippingPayer || 'shop';
          const laborPayer = meta.laborPayer || 'shop';

          const shipDue = Math.max(0, Math.round((shipCost - shipPaidAmt) * 100) / 100);
          const shipOver = Math.max(0, Math.round((shipPaidAmt - shipCost) * 100) / 100);
          let shipStatus: 'pending' | 'paid' | 'partial' | 'overpaid' = 'pending';
          if (shipDue > 0) {
            shipStatus = shipPaidAmt > 0 ? 'partial' : 'pending';
          } else if (shipOver > 0) {
            shipStatus = 'overpaid';
          } else {
            shipStatus = 'paid';
          }

          // Only add to Shipping Drawer if Dokan is paying (not supplier)
          if (shipPayer !== 'supplier' && (shipCost > 0 || shipPaidAmt > 0)) {
            sItems.push({
              id: String(t.id),
              invoiceId: invNo,
              date: txDate,
              vehicleNo: tAny.vehicle_no || meta.vehicleNo || '',
              driverName: tAny.driver_name || meta.driverName || '',
              driverPhone: tAny.driver_phone || meta.driverPhone || '',
              amount: shipCost,
              status: shipStatus,
              paidAmount: shipPaidAmt,
              dueAmount: shipDue,
              overpaidAmount: shipOver,
              rawTx: t
            });
          }

          const labDue = Math.max(0, Math.round((labCost - labPaidAmt) * 100) / 100);
          const labOver = Math.max(0, Math.round((labPaidAmt - labCost) * 100) / 100);
          let labStatus: 'pending' | 'paid' | 'partial' | 'overpaid' = 'pending';
          if (labDue > 0) {
            labStatus = labPaidAmt > 0 ? 'partial' : 'pending';
          } else if (labOver > 0) {
            labStatus = 'overpaid';
          } else {
            labStatus = 'paid';
          }

          // Only add to Labor Drawer if Dokan is paying (not supplier)
          if (laborPayer !== 'supplier' && (labCost > 0 || labPaidAmt > 0)) {
            lItems.push({
              id: String(t.id),
              invoiceId: invNo,
              date: txDate,
              type: 'unloading',
              partyName: t.party_name || 'সাপ্লায়ার',
              unloadingSite: tAny.delivery_address || meta.deliveryAddress || meta.unloadingSite || '',
              operatorName: meta.preparedBy || meta.operatorName || '',
              amount: labCost,
              status: labStatus,
              paidAmount: labPaidAmt,
              dueAmount: labDue,
              overpaidAmount: labOver,
              rawTx: t
            });
          }
        }

        // 2. SALES TRANSACTIONS (Shipping, Cement Loading, and Rod Labor)
        // Strictly exclude pending/draft/unapproved invoices
        if (t.transaction_type === 'sale') {
          const rawStatus = String(t.status || meta.status || '').toLowerCase().trim();
          const isPending = rawStatus === 'pending' || rawStatus === 'draft' || rawStatus === 'cancelled' || rawStatus === 'rejected' || rawStatus === 'অপেক্ষমান' || rawStatus === 'বাতিল';
          if (isPending) return;

          const invNo = t.invoice_no || (t.id ? `INV-${t.id}` : 'INV-0001');

          // 2A. Sales Shipping Charges (গাড়ি ভাড়া - ড্রয়ারে যুক্ত হবে)
          const salesShipCost = Number(tAny.shipping_cost !== undefined ? tAny.shipping_cost : (meta.shippingCost || meta.transportCost || 0));
          if (salesShipCost > 0) {
            const isShipPaid = Boolean(meta.salesShippingPaid || meta.shippingPaid || tAny.salesShippingPaid);
            const shipPaidAmt = Number(meta.salesShippingPaidAmount !== undefined ? meta.salesShippingPaidAmount : (isShipPaid ? salesShipCost : 0));

            const shipDue = Math.max(0, Math.round((salesShipCost - shipPaidAmt) * 100) / 100);
            const shipOver = Math.max(0, Math.round((shipPaidAmt - salesShipCost) * 100) / 100);
            let shipStatus: 'pending' | 'paid' | 'partial' | 'overpaid' = 'pending';
            if (shipDue > 0) {
              shipStatus = shipPaidAmt > 0 ? 'partial' : 'pending';
            } else if (shipOver > 0) {
              shipStatus = 'overpaid';
            } else {
              shipStatus = 'paid';
            }

            sItems.push({
              id: `sale-ship-${t.id}`,
              invoiceId: invNo,
              date: txDate,
              type: 'sale',
              partyName: t.party_name || meta.customerName || 'খুচরা গ্রাহক',
              vehicleNo: tAny.vehicle_no || meta.vehicleNo || '',
              driverName: tAny.driver_name || meta.driverName || '',
              driverPhone: tAny.driver_phone || meta.driverPhone || '',
              deliveryAddress: tAny.delivery_address || meta.deliveryAddress || meta.siteAddress || '',
              amount: salesShipCost,
              status: shipStatus,
              paidAmount: shipPaidAmt,
              dueAmount: shipDue,
              overpaidAmount: shipOver,
              rawTx: t
            });
          }

          // 2B. Sales Cement Loading Charges (সিমেন্ট লোডিং খরচ - দোকান প্রদেয়)
          const cementRate = Number(meta.cementLaborRate || tAny.cementLaborRate || 0);
          const cementCost = Number(meta.cementLaborCost || meta.cementLoadingCharge || tAny.cementLaborCost || 0);
          const cementBags = Number(meta.cementTotalBags || tAny.cementTotalBags || 0);
          const totalLoadingCost = cementCost > 0 ? cementCost : (cementRate > 0 && cementBags > 0 ? cementRate * cementBags : 0);

          if (totalLoadingCost > 0 || (cementBags > 0 && cementRate > 0)) {
            const isPaid = Boolean(meta.cementLoadingPaid || tAny.cementLoadingPaid);
            const loadingPaidAmt = Number(meta.cementLoadingPaidAmount !== undefined ? meta.cementLoadingPaidAmount : (isPaid ? totalLoadingCost : 0));

            const labDue = Math.max(0, Math.round((totalLoadingCost - loadingPaidAmt) * 100) / 100);
            const labOver = Math.max(0, Math.round((loadingPaidAmt - totalLoadingCost) * 100) / 100);
            let labStatus: 'pending' | 'paid' | 'partial' | 'overpaid' = 'pending';
            if (labDue > 0) {
              labStatus = loadingPaidAmt > 0 ? 'partial' : 'pending';
            } else if (labOver > 0) {
              labStatus = 'overpaid';
            } else {
              labStatus = 'paid';
            }

            lItems.push({
              id: `sale-cement-${t.id}`,
              invoiceId: invNo,
              date: txDate,
              type: 'loading',
              partyName: t.party_name || meta.customerName || 'খুচরা গ্রাহক',
              cementBags: cementBags > 0 ? cementBags : (cementRate > 0 ? Math.round(totalLoadingCost / cementRate) : undefined),
              loadingRate: cementRate > 0 ? cementRate : undefined,
              unloadingSite: tAny.delivery_address || meta.deliveryAddress || 'গ্রাহকের সাইট / ডেলিভারি',
              operatorName: meta.cementLoadingSardar || meta.preparedBy || meta.operatorName || '',
              amount: totalLoadingCost,
              status: labStatus,
              paidAmount: loadingPaidAmt,
              dueAmount: labDue,
              overpaidAmount: labOver,
              rawTx: t
            });
          }

          // 2C. Sales Rod & Ring Labor Charges (রড ও রিং লোডিং খরচ - ড্রয়ারে যুক্ত হবে)
          const rodRate = Number(meta.rodLaborRate || tAny.rodLaborRate || 0);
          const rodKg = Number(meta.rodRingTotalKg || tAny.rodRingTotalKg || 0);
          const rodLaborCost = Number(meta.rodLaborCost !== undefined ? meta.rodLaborCost : (meta.chargeCalcMode === 'rate' ? rodRate * rodKg : (meta.laborCost || 0)));
          const totalRodCost = rodLaborCost > 0 ? rodLaborCost : (rodRate * rodKg);

          if (totalRodCost > 0 || (rodRate > 0 && rodKg > 0)) {
            const isRodPaid = Boolean(meta.rodLaborPaid || tAny.rodLaborPaid);
            const rodPaidAmt = Number(meta.rodLaborPaidAmount !== undefined ? meta.rodLaborPaidAmount : (isRodPaid ? totalRodCost : 0));

            const labDue = Math.max(0, Math.round((totalRodCost - rodPaidAmt) * 100) / 100);
            const labOver = Math.max(0, Math.round((rodPaidAmt - totalRodCost) * 100) / 100);
            let labStatus: 'pending' | 'paid' | 'partial' | 'overpaid' = 'pending';
            if (labDue > 0) {
              labStatus = rodPaidAmt > 0 ? 'partial' : 'pending';
            } else if (labOver > 0) {
              labStatus = 'overpaid';
            } else {
              labStatus = 'paid';
            }

            lItems.push({
              id: `sale-rod-${t.id}`,
              invoiceId: invNo,
              date: txDate,
              type: 'rod_loading',
              partyName: t.party_name || meta.customerName || 'খুচরা গ্রাহক',
              rodKg: rodKg > 0 ? rodKg : undefined,
              rodRate: rodRate > 0 ? rodRate : undefined,
              unloadingSite: tAny.delivery_address || meta.deliveryAddress || meta.siteAddress || 'গ্রাহকের সাইট / ডেলিভারি',
              operatorName: meta.rodLaborSardar || meta.preparedBy || meta.operatorName || '',
              amount: totalRodCost,
              status: labStatus,
              paidAmount: rodPaidAmt,
              dueAmount: labDue,
              overpaidAmount: labOver,
              rawTx: t
            });
          }

          // 2D. Sales Cement Unloading Charges (সিমেন্ট আনলোডিং খরচ - কাস্টমার প্রদেয়, ড্রয়ারে যুক্ত হবে)
          const cementUnloadRate = Number(meta.cementUnloadingRate || tAny.cementUnloadingRate || 0);
          const cementUnloadCost = Number(meta.cementUnloadingCost !== undefined ? meta.cementUnloadingCost : (cementUnloadRate > 0 && cementBags > 0 ? cementUnloadRate * cementBags : 0));
          const totalCementUnloadCost = cementUnloadCost > 0 ? cementUnloadCost : (cementUnloadRate * cementBags);

          if (totalCementUnloadCost > 0 || (cementUnloadRate > 0 && cementBags > 0)) {
            const isUnloadPaid = Boolean(meta.cementUnloadingPaid || tAny.cementUnloadingPaid);
            const unloadPaidAmt = Number(meta.cementUnloadingPaidAmount !== undefined ? meta.cementUnloadingPaidAmount : (isUnloadPaid ? totalCementUnloadCost : 0));

            const labDue = Math.max(0, Math.round((totalCementUnloadCost - unloadPaidAmt) * 100) / 100);
            const labOver = Math.max(0, Math.round((unloadPaidAmt - totalCementUnloadCost) * 100) / 100);
            let labStatus: 'pending' | 'paid' | 'partial' | 'overpaid' = 'pending';
            if (labDue > 0) {
              labStatus = unloadPaidAmt > 0 ? 'partial' : 'pending';
            } else if (labOver > 0) {
              labStatus = 'overpaid';
            } else {
              labStatus = 'paid';
            }

            lItems.push({
              id: `sale-cement-unload-${t.id}`,
              invoiceId: invNo,
              date: txDate,
              type: 'cement_unloading',
              partyName: t.party_name || meta.customerName || 'খুচরা গ্রাহক',
              cementBags: cementBags > 0 ? cementBags : undefined,
              loadingRate: cementUnloadRate > 0 ? cementUnloadRate : undefined,
              unloadingSite: tAny.delivery_address || meta.deliveryAddress || meta.siteAddress || 'গ্রাহকের সাইট / ডেলিভারি',
              operatorName: meta.cementUnloadingSardar || meta.preparedBy || meta.operatorName || '',
              amount: totalCementUnloadCost,
              status: labStatus,
              paidAmount: unloadPaidAmt,
              dueAmount: labDue,
              overpaidAmount: labOver,
              rawTx: t
            });
          }

          // 2E. Sales Rod Unloading Charges (রড আনলোডিং খরচ - ড্রয়ারে যুক্ত হবে)
          const rodUnloadRate = Number(meta.rodUnloadingRate || tAny.rodUnloadingRate || 0);
          const rodUnloadCost = Number(meta.rodUnloadingCost !== undefined ? meta.rodUnloadingCost : (rodUnloadRate > 0 && rodKg > 0 ? rodUnloadRate * rodKg : 0));
          const totalRodUnloadCost = rodUnloadCost > 0 ? rodUnloadCost : (rodUnloadRate * rodKg);

          if (totalRodUnloadCost > 0 || (rodUnloadRate > 0 && rodKg > 0)) {
            const isRodUnloadPaid = Boolean(meta.rodUnloadingPaid || tAny.rodUnloadingPaid);
            const rodUnloadPaidAmt = Number(meta.rodUnloadingPaidAmount !== undefined ? meta.rodUnloadingPaidAmount : (isRodUnloadPaid ? totalRodUnloadCost : 0));

            const labDue = Math.max(0, Math.round((totalRodUnloadCost - rodUnloadPaidAmt) * 100) / 100);
            const labOver = Math.max(0, Math.round((rodUnloadPaidAmt - totalRodUnloadCost) * 100) / 100);
            let labStatus: 'pending' | 'paid' | 'partial' | 'overpaid' = 'pending';
            if (labDue > 0) {
              labStatus = rodUnloadPaidAmt > 0 ? 'partial' : 'pending';
            } else if (labOver > 0) {
              labStatus = 'overpaid';
            } else {
              labStatus = 'paid';
            }

            lItems.push({
              id: `sale-rod-unload-${t.id}`,
              invoiceId: invNo,
              date: txDate,
              type: 'rod_unloading',
              partyName: t.party_name || meta.customerName || 'খুচরা গ্রাহক',
              rodKg: rodKg > 0 ? rodKg : undefined,
              rodRate: rodUnloadRate > 0 ? rodUnloadRate : undefined,
              unloadingSite: tAny.delivery_address || meta.deliveryAddress || meta.siteAddress || 'গ্রাহকের সাইট / ডেলিভারি',
              operatorName: meta.rodUnloadingSardar || meta.preparedBy || meta.operatorName || '',
              amount: totalRodUnloadCost,
              status: labStatus,
              paidAmount: rodUnloadPaidAmt,
              dueAmount: labDue,
              overpaidAmount: labOver,
              rawTx: t
            });
          }
        }
      });

      // Sort newest first
      lItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      sItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setShippingItems(sItems);
      setLaborItems(lItems);
    } catch (e) {
      console.error('Error loading Shell data:', e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadChequesAndOrders();
      void loadHawlats();
    }, 0);

    const handleReload = () => {
      void loadChequesAndOrders();
      void loadHawlats();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('orderUpdated', handleReload);
      window.addEventListener('focus', handleReload);
    }

    const interval = setInterval(handleReload, 20000);

    return () => {
      clearTimeout(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('orderUpdated', handleReload);
        window.removeEventListener('focus', handleReload);
      }
      clearInterval(interval);
    };
  }, [loadChequesAndOrders, loadHawlats]);

  const pendingCheques = cheques.filter(c => c.status === 'pending');
  const pendingTotalAmount = pendingCheques.reduce((sum, c) => sum + (c.amount || 0), 0);

  const pendingOrders = orders.filter(o => !o.invoiced && o.stage !== 'completed' && o.stage !== 'invoiced' && o.stage !== 'approved');
  const pendingOrdersTotal = pendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const pendingShippingItems = shippingItems.filter(s => (s.dueAmount || 0) > 0 || (s.overpaidAmount || 0) > 0);
  const pendingLaborItems = laborItems.filter(l => (l.dueAmount || 0) > 0 || (l.overpaidAmount || 0) > 0);

  const filteredShippingItems = shippingItems.filter(s => {
    if (shippingFilterTab === 'pending') return (s.dueAmount || 0) > 0 || (s.overpaidAmount || 0) > 0;
    if (shippingFilterTab === 'paid') return s.status === 'paid' && (s.dueAmount || 0) === 0 && (s.overpaidAmount || 0) === 0;
    return true;
  });

  const filteredLaborItems = laborItems.filter(l => {
    if (laborFilterTab === 'pending') return (l.dueAmount || 0) > 0 || (l.overpaidAmount || 0) > 0;
    if (laborFilterTab === 'paid') return l.status === 'paid' && (l.dueAmount || 0) === 0 && (l.overpaidAmount || 0) === 0;
    return true;
  });

  const handleSettleShipping = async (item: ShippingChargeItem) => {
    if (isSettlingPayment) return;
    if (item.status === 'paid' || (item.dueAmount !== undefined && item.dueAmount <= 0)) {
      setSettlingShipping(null);
      return;
    }
    setIsSettlingPayment(true);
    // Optimistically update drawer state immediately
    setShippingItems(prev => prev.map(s => s.id === item.id ? { ...s, status: 'paid', dueAmount: 0, paidAmount: item.amount } : s));
    setSettlingShipping(null);

    try {
      const payAmount = item.dueAmount !== undefined ? item.dueAmount : item.amount;
      const t = item.rawTx;
      let meta: any = {};
      let userNote = t?.notes || '';
      if (userNote && typeof userNote === 'string' && userNote.trim().startsWith('{')) {
        try {
          const firstLine = userNote.split('\n')[0];
          meta = JSON.parse(firstLine);
          userNote = userNote.substring(firstLine.length).trim();
        } catch {}
      }

      const isSale = item.type === 'sale' || t?.transaction_type === 'sale';

      if (isSale) {
        meta.salesShippingPaid = true;
        meta.salesShippingPaidAmount = item.amount;
        meta.salesShippingPaidAt = new Date().toISOString();
        meta.salesShippingPaidMethod = 'নগদ';
        meta.shippingPaid = true;
        meta.shippingPaidAmount = item.amount;
        meta.shippingStatus = 'paid';
      } else {
        meta.shippingStatus = 'paid';
        meta.shippingPaidAmount = item.amount;
      }

      // 1. Record payment_out transaction so Cash balance and Transactions list are debited
      await api.transactions.create({
        party_name: `গাড়ি ভাড়া (${item.driverName || item.vehicleNo || (isSale ? 'বিক্রয় পরিবহন' : 'ক্রয় পরিবহন')})`,
        transaction_type: 'payment_out',
        total_amount: Number(payAmount),
        paid_amount: Number(payAmount),
        due_amount: 0,
        payment_method: 'cash',
        notes: JSON.stringify({
          category: 'পরিবহন খরচ',
          expenseCategory: 'পরিবহন খরচ',
          invoiceId: item.invoiceId,
          invoiceNo: item.invoiceId,
          isShippingExpense: true,
          isSalesShipping: isSale
        }) + `\n[${isSale ? 'বিক্রয়' : 'ক্রয়'} গাড়ি ভাড়া পরিশোধ] চালান: #${item.invoiceId}`
      }).catch(err => console.warn('Transaction record fallback:', err));

      // 2. Record in expenses table (with duplicate check specifically for transport/shipping)
      const targetTitle = isSale
        ? `বিক্রয় চালান পরিবহন / গাড়ি ভাড়া (চালান #${item.invoiceId})`
        : `পরিবহন / গাড়ি ভাড়া (চালান #${item.invoiceId})`;
      const existingExpenses = await api.expenses.list({ search: item.invoiceId }).catch(() => []);
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const isAlreadyRecorded = Array.isArray(existingExpenses) && existingExpenses.some((e: any) => 
        e.title?.includes(item.invoiceId) && 
        Number(e.amount) === Number(payAmount) &&
        (e.date === todayStr) &&
        (e.title?.includes('পরিবহন') || e.title?.includes('গাড়ি ভাড়া') || e.title?.includes('ভাড়া'))
      );
      if (!isAlreadyRecorded) {
        await api.expenses.create({
          title: targetTitle,
          category_name: 'পরিবহন খরচ',
          amount: Number(payAmount),
          date: format(new Date(), 'yyyy-MM-dd'),
          payment_method: 'Cash',
          notes: isSale
            ? `বিক্রয় চালান নং: ${item.invoiceId} | গ্রাহক: ${item.partyName || ''} | গাড়ি: ${item.vehicleNo || ''} | ড্রাইভার: ${item.driverName || ''}`
            : `চালান নং: ${item.invoiceId} | গাড়ি: ${item.vehicleNo || ''} | ড্রাইভার: ${item.driverName || ''}`
        }).catch(err => console.warn('Expense record fallback:', err));
      }

      const newNotes = JSON.stringify(meta) + (userNote ? `\n${userNote}` : '');
      const txId = item.rawTx?.id || item.id;
      await api.transactions.update(txId, { notes: newNotes });

      toast.success(`গাড়ি ভাড়া ৳ ${payAmount.toLocaleString('bn-BD')} ক্যাশ থেকে পরিশোধ করা হয়েছে!`);
      void loadChequesAndOrders();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orderUpdated'));
      }
    } catch (err) {
      console.error(err);
      toast.error('গাড়ি ভাড়া পরিশোধ করতে সমস্যা হয়েছে');
    } finally {
      setIsSettlingPayment(false);
    }
  };

  const handleAdjustOverpaidShipping = async (item: ShippingChargeItem) => {
    try {
      const refundAmount = item.overpaidAmount || 0;
      const t = item.rawTx;
      let meta: any = {};
      let userNote = t?.notes || '';
      if (userNote && typeof userNote === 'string' && userNote.trim().startsWith('{')) {
        try {
          const firstLine = userNote.split('\n')[0];
          meta = JSON.parse(firstLine);
          userNote = userNote.substring(firstLine.length).trim();
        } catch {}
      }

      const isSale = item.type === 'sale' || t?.transaction_type === 'sale';
      if (isSale) {
        meta.salesShippingPaid = true;
        meta.salesShippingPaidAmount = item.amount;
        meta.shippingPaid = true;
        meta.shippingPaidAmount = item.amount;
        meta.shippingStatus = 'paid';
      } else {
        meta.shippingStatus = 'paid';
        meta.shippingPaidAmount = item.amount;
      }

      const newNotes = JSON.stringify(meta) + (userNote ? `\n${userNote}` : '');
      const txId = item.rawTx?.id || item.id;
      await api.transactions.update(txId, { notes: newNotes });

      toast.success(`অতিরিক্ত গাড়ি ভাড়া ৳ ${refundAmount.toLocaleString('bn-BD')} সফলভাবে ERP-তে সমন্বয় করা হয়েছে!`);
      setSettlingShipping(null);
      void loadChequesAndOrders();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orderUpdated'));
      }
    } catch (err) {
      console.error(err);
      toast.error('গাড়ি ভাড়া সমন্বয় করতে সমস্যা হয়েছে');
    }
  };

  const handleSettleLabor = async (item: LaborChargeItem) => {
    if (isSettlingPayment) return;
    if (item.status === 'paid' || (item.dueAmount !== undefined && item.dueAmount <= 0)) {
      setSettlingLabor(null);
      return;
    }
    setIsSettlingPayment(true);
    // Optimistically update drawer state immediately
    setLaborItems(prev => prev.map(l => l.id === item.id ? { ...l, status: 'paid', dueAmount: 0, paidAmount: item.amount } : l));
    setSettlingLabor(null);

    try {
      const payAmount = item.dueAmount !== undefined ? item.dueAmount : item.amount;
      const t = item.rawTx;
      let meta: any = {};
      let userNote = t?.notes || '';
      if (userNote && typeof userNote === 'string' && userNote.trim().startsWith('{')) {
        try {
          const firstLine = userNote.split('\n')[0];
          meta = JSON.parse(firstLine);
          userNote = userNote.substring(firstLine.length).trim();
        } catch {}
      }

      if (item.type === 'loading') {
        meta.cementLoadingPaid = true;
        meta.cementLoadingPaidAmount = item.amount;
        meta.cementLoadingPaidAt = new Date().toISOString();
        meta.cementLoadingPaidMethod = 'নগদ';
      } else if (item.type === 'rod_loading') {
        meta.rodLaborPaid = true;
        meta.rodLaborPaidAmount = item.amount;
        meta.rodLaborPaidAt = new Date().toISOString();
        meta.rodLaborPaidMethod = 'নগদ';
      } else if (item.type === 'rod_unloading') {
        meta.rodUnloadingPaid = true;
        meta.rodUnloadingPaidAmount = item.amount;
        meta.rodUnloadingPaidAt = new Date().toISOString();
        meta.rodUnloadingPaidMethod = 'নগদ';
      } else if (item.type === 'cement_unloading') {
        meta.cementUnloadingPaid = true;
        meta.cementUnloadingPaidAmount = item.amount;
        meta.cementUnloadingPaidAt = new Date().toISOString();
        meta.cementUnloadingPaidMethod = 'নগদ';
      } else {
        meta.laborStatus = 'paid';
        meta.laborPaidAmount = item.amount;
      }

      const partyLabel = item.type === 'loading'
        ? `লোডিং লেবার বিল (${item.partyName || 'বিক্রয় সিমেন্ট'})`
        : item.type === 'rod_loading'
        ? `রড লোডিং লেবার বিল (${item.partyName || 'বিক্রয় রড'})`
        : item.type === 'rod_unloading'
        ? `রড আনলোডিং লেবার বিল (${item.partyName || 'বিক্রয় রড'})`
        : item.type === 'cement_unloading'
        ? `সিমেন্ট আনলোডিং লেবার বিল (${item.partyName || 'বিক্রয় সিমেন্ট'})`
        : `আনলোডিং লেবার বিল (${item.partyName || 'ক্রয়'})`;

      const typeLabel = item.type === 'loading'
        ? 'বিক্রয় সিমেন্ট লোডিং'
        : item.type === 'rod_loading'
        ? 'বিক্রয় রড লোডিং'
        : item.type === 'rod_unloading'
        ? 'বিক্রয় রড আনলোডিং'
        : item.type === 'cement_unloading'
        ? 'বিক্রয় সিমেন্ট আনলোডিং'
        : 'ক্রয় আনলোডিং';

      // 1. Record payment_out transaction so Cash balance and Transactions list immediately deduct cash (ক্যাশ থেকে আউট)
      await api.transactions.create({
        party_name: partyLabel,
        transaction_type: 'payment_out',
        total_amount: Number(payAmount),
        paid_amount: Number(payAmount),
        due_amount: 0,
        payment_method: 'cash',
        notes: JSON.stringify({
          category: 'লোডিং ও খালাস খরচ',
          expenseCategory: 'লোডিং ও খালাস খরচ',
          invoiceId: item.invoiceId,
          invoiceNo: item.invoiceId,
          type: item.type,
          cementBags: item.cementBags,
          loadingRate: item.loadingRate,
          rodKg: item.rodKg,
          rodRate: item.rodRate,
          isLaborExpense: true
        }) + `\n[লেবার খরচ পরিশোধ - ${typeLabel}] চালান: #${item.invoiceId}`
      }).catch(err => console.warn('Transaction record fallback:', err));

      // 2. Also record in expenses table (with duplicate check specifically for labor/loading/unloading)
      const targetTitle = item.type === 'loading' 
        ? `বিক্রয় চালান লোডিং চার্জ (চালান #${item.invoiceId})`
        : item.type === 'rod_loading'
        ? `বিক্রয় চালান রড লোডিং চার্জ (চালান #${item.invoiceId})`
        : item.type === 'rod_unloading'
        ? `বিক্রয় চালান রড আনলোডিং লেবার চার্জ (চালান #${item.invoiceId})`
        : item.type === 'cement_unloading'
        ? `বিক্রয় চালান সিমেন্ট আনলোডিং লেবার চার্জ (চালান #${item.invoiceId})`
        : `ক্রয় চালান আনলোডিং চার্জ (চালান #${item.invoiceId})`;

      const existingExpenses = await api.expenses.list({ search: item.invoiceId }).catch(() => []);
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const isAlreadyRecorded = Array.isArray(existingExpenses) && existingExpenses.some((e: any) => 
        e.title?.includes(item.invoiceId) && 
        Number(e.amount) === Number(payAmount) &&
        (e.date === todayStr) &&
        (
          item.type === 'loading' 
            ? (e.title?.includes('লোডিং') && (e.title?.includes('সিমেন্ট') || !e.title?.includes('রড')))
            : item.type === 'rod_loading'
            ? (e.title?.includes('রড') && !e.title?.includes('আনলোডিং'))
            : item.type === 'rod_unloading'
            ? (e.title?.includes('রড') && e.title?.includes('আনলোডিং'))
            : item.type === 'cement_unloading'
            ? (e.title?.includes('আনলোডিং') && (e.title?.includes('সিমেন্ট') || e.title?.includes('বিক্রয়')))
            : (e.title?.includes('ক্রয় চালান') || (e.title?.includes('আনলোডিং') && !e.title?.includes('বিক্রয়')) || e.title?.includes('লেবার'))
        )
      );
      if (!isAlreadyRecorded) {
        await api.expenses.create({
          title: targetTitle,
          category_name: 'লোডিং ও খালাস খরচ',
          amount: Number(payAmount),
          date: format(new Date(), 'yyyy-MM-dd'),
          payment_method: 'Cash',
          notes: item.type === 'loading' 
            ? `বিক্রয় চালান নং: ${item.invoiceId} | গ্রাহক: ${item.partyName || ''} | সিমেন্ট: ${item.cementBags || 0} বস্তা`
            : item.type === 'rod_loading'
            ? `বিক্রয় চালান নং: ${item.invoiceId} | গ্রাহক: ${item.partyName || ''} | রড ও রিং লোডিং: ${item.rodKg || 0} কেজি (@ ৳${item.rodRate || 0}/কেজি)`
            : item.type === 'rod_unloading'
            ? `বিক্রয় চালান নং: ${item.invoiceId} | গ্রাহক: ${item.partyName || ''} | রড ও রিং আনলোডিং: ${item.rodKg || 0} কেজি (@ ৳${item.rodRate || 0}/কেজি)`
            : item.type === 'cement_unloading'
            ? `বিক্রয় চালান নং: ${item.invoiceId} | গ্রাহক: ${item.partyName || ''} | সিমেন্ট আনলোডিং: ${item.cementBags || 0} বস্তা`
            : `ক্রয় চালান নং: ${item.invoiceId} | সাপ্লায়ার: ${item.partyName || ''} | স্থান: ${item.unloadingSite || 'প্রধান গুদাম'}`
        }).catch(err => console.warn('Expense record fallback:', err));
      }

      const newNotes = JSON.stringify(meta) + (userNote ? `\n${userNote}` : '');
      const txId = item.rawTx?.id || item.id;
      await api.transactions.update(txId, { notes: newNotes });

      toast.success(`${item.type === 'loading' ? 'সিমেন্ট লোডিং' : item.type === 'rod_loading' ? 'রড লোডিং' : item.type === 'rod_unloading' ? 'রড আনলোডিং' : item.type === 'cement_unloading' ? 'সিমেন্ট আনলোডিং' : 'লেবার'} খরচ ৳ ${payAmount.toLocaleString('bn-BD')} ক্যাশ থেকে পরিশোধ করা হয়েছে!`);
      void loadChequesAndOrders();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orderUpdated'));
      }
    } catch (err) {
      console.error(err);
      toast.error('লেবার খরচ পরিশোধ করতে সমস্যা হয়েছে');
    } finally {
      setIsSettlingPayment(false);
    }
  };

  const handleAdjustOverpaidLabor = async (item: LaborChargeItem) => {
    try {
      const refundAmount = item.overpaidAmount || 0;
      const t = item.rawTx;
      let meta: any = {};
      let userNote = t?.notes || '';
      if (userNote && typeof userNote === 'string' && userNote.trim().startsWith('{')) {
        try {
          const firstLine = userNote.split('\n')[0];
          meta = JSON.parse(firstLine);
          userNote = userNote.substring(firstLine.length).trim();
        } catch {}
      }

      if (item.type === 'loading') {
        meta.cementLoadingPaid = true;
        meta.cementLoadingPaidAmount = item.amount;
      } else if (item.type === 'rod_loading') {
        meta.rodLaborPaid = true;
        meta.rodLaborPaidAmount = item.amount;
      } else if (item.type === 'rod_unloading') {
        meta.rodUnloadingPaid = true;
        meta.rodUnloadingPaidAmount = item.amount;
      } else if (item.type === 'cement_unloading') {
        meta.cementUnloadingPaid = true;
        meta.cementUnloadingPaidAmount = item.amount;
      } else {
        meta.laborStatus = 'paid';
        meta.laborPaidAmount = item.amount;
      }

      const newNotes = JSON.stringify(meta) + (userNote ? `\n${userNote}` : '');
      const txId = item.rawTx?.id || item.id;
      await api.transactions.update(txId, { notes: newNotes });

      toast.success(`অতিরিক্ত লেবার খরচ ৳ ${refundAmount.toLocaleString('bn-BD')} সফলভাবে ERP-তে সমন্বয় করা হয়েছে!`);
      setSettlingLabor(null);
      void loadChequesAndOrders();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orderUpdated'));
      }
    } catch (err) {
      console.error(err);
      toast.error('লেবার খরচ সমন্বয় করতে সমস্যা হয়েছে');
    }
  };

  const handleClearCheque = async (cheque: ChequeItem) => {
    try {
      setClearingId(cheque.id);
      await api.transactions.update(cheque.id, {
        cheque_status: 'cleared'
      });
      toast.success(`চেক ক্যাশ হয়েছে: ৳${cheque.amount.toLocaleString('bn-BD')}`);
      loadChequesAndOrders();
    } catch (err) {
      toast.error('চেক ক্যাশ করতে সমস্যা হয়েছে');
    } finally {
      setClearingId(null);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-[#faf8f5] text-[#2e2316] font-sans antialiased selection:bg-[#b88e2d] selection:text-white overflow-x-hidden">
      {/* Printed Subtle Pattern Background Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(#d6cbb8_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-70" />
      {/* Soft Printed Ambient Gradient Accents */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-[#d4af37]/15 via-[#b88e2d]/5 to-transparent rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[700px] h-[700px] bg-gradient-to-tr from-[#8c6b1c]/10 via-[#c59b27]/5 to-transparent rounded-full blur-3xl pointer-events-none z-0" />

      {/* Sidebar Component */}
      <Suspense fallback={null}>
        <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      </Suspense>

      {/* Main Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        {/* Top Navbar Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-3 sm:px-4 md:px-6 bg-white/95 backdrop-blur-md border-b border-[#e8dfd0] shadow-2xs print:hidden">
          {/* Left: Mobile Hamburger & Search Bar */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-[200px] xs:max-w-xs sm:max-w-md">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#4a3b2c] hover:text-[#8c6b1c] hover:bg-[#f5f0e6] rounded-xl transition-colors flex-shrink-0 cursor-pointer"
              title="মেনু খুলুন"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8c7a65]" />
              <input
                type="text"
                placeholder="সার্চ করুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-[#f5f0e6]/70 border border-[#e2d7c5] rounded-xl text-[#2e2316] placeholder:text-[#8c7a65] focus:outline-none focus:ring-2 focus:ring-[#b88e2d]/30 focus:border-[#b88e2d] transition-all font-bengali"
              />
            </div>
          </div>

          {/* Right: Quick Triggers & User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            {/* Shipping Charges Drawer Trigger */}
            <button
              onClick={() => setShowShippingDrawer(!showShippingDrawer)}
              className="relative p-1.5 sm:p-2 sm:px-2.5 text-slate-700 hover:text-slate-900 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all flex items-center gap-1.5 font-bengali font-semibold text-xs shadow-2xs cursor-pointer"
              title="গাড়ি ভাড়া খাতা (ট্রাক / পরিবহন খরচ)"
            >
              <Truck className="h-4.5 w-4.5 text-blue-600" />
              <span className="hidden lg:inline text-slate-800 font-bold">গাড়ি ভাড়া</span>
              {pendingShippingItems.length > 0 && (
                <span className="flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full min-w-[18px]">
                  {toBnDigits(pendingShippingItems.length)}
                </span>
              )}
            </button>

            {/* Labor Charges Drawer Trigger */}
            <button
              onClick={() => setShowLaborDrawer(!showLaborDrawer)}
              className="relative p-1.5 sm:p-2 sm:px-2.5 text-slate-700 hover:text-slate-900 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl transition-all flex items-center gap-1.5 font-bengali font-semibold text-xs shadow-2xs cursor-pointer"
              title="লেবার খরচ খাতা (আনলোডিং / শ্রমিক মজুরি)"
            >
              <HardHat className="h-4.5 w-4.5 text-amber-600" />
              <span className="hidden lg:inline text-slate-800 font-bold">লেবার খরচ</span>
              {pendingLaborItems.length > 0 && (
                <span className="flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-amber-600 text-white rounded-full min-w-[18px]">
                  {toBnDigits(pendingLaborItems.length)}
                </span>
              )}
            </button>

            {/* Pending Orders Drawer Trigger */}
            <button
              onClick={() => setShowOrdersDrawer(!showOrdersDrawer)}
              className="relative p-1.5 sm:p-2 text-slate-600 hover:text-amber-800 hover:bg-amber-50 rounded-xl transition-all flex items-center gap-1.5"
              title="চালান অপেক্ষমাণ অর্ডারসমূহ"
            >
              <ShoppingCart className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-amber-700" />
              {pendingOrders.length > 0 && (
                <span className="flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-[#b88e2d] to-[#d4af37] text-white rounded-full min-w-[18px] shadow-xs">
                  {toBnDigits(pendingOrders.length)}
                </span>
              )}
            </button>

            {/* Hawlat Drawer Trigger */}
            <button
              onClick={() => setShowHawlatDrawer(!showHawlatDrawer)}
              className="relative p-1.5 sm:p-2 sm:px-2.5 text-slate-700 hover:text-slate-900 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all flex items-center gap-1.5 font-bengali font-semibold text-xs shadow-2xs"
              title="হাওলাত খাতা (নোট মেমো)"
            >
              <NotebookPen className="h-4.5 w-4.5 text-emerald-600" />
              <span className="hidden lg:inline text-slate-800 font-bold">হাওলাত</span>
              {hawlatItems.length > 0 && (
                <span className="flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded-full min-w-[18px]">
                  {toBnDigits(hawlatItems.length)}
                </span>
              )}
            </button>

            {/* Cheque Drawer Trigger */}
            <button
              onClick={() => setShowChequeDrawer(!showChequeDrawer)}
              className="relative p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1.5"
              title="চেক ব্যবস্থাপনা"
            >
              <Landmark className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-indigo-600" />
              {pendingCheques.length > 0 && (
                <span className="flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full min-w-[18px]">
                  {toBnDigits(pendingCheques.length)}
                </span>
              )}
            </button>

            {/* User Avatar & Name & Role */}
            <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
              <div className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm flex-shrink-0 overflow-hidden border border-slate-200",
                role === 'staff' ? "bg-blue-600 shadow-blue-600/20" : "bg-amber-600 shadow-amber-600/20"
              )}>
                {user?.avatar ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  role === 'staff' ? '👔' : '👑'
                )}
              </div>
              <div className="hidden md:block text-left font-bengali">
                <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span className="truncate max-w-[140px]">{user?.full_name || user?.username || 'ইউজার'}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
                    role === 'staff' ? "bg-blue-100 text-blue-900 border border-blue-300" : "bg-amber-100 text-amber-900 border border-amber-300"
                  )}>
                    {role === 'staff' ? 'স্টাফ' : 'অ্যাডমিন'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Container - Widescreen Optimized with responsive padding */}
        <main className="flex-1 p-2 sm:p-4 md:p-6 w-full max-w-[1700px] mx-auto min-w-0">
          {children}
        </main>
      </div>

      {/* Cheque Management Drawer */}
      <AnimatePresence>
        {showChequeDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChequeDrawer(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-white">পেন্ডিং চেকসমূহ</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowChequeDrawer(false)} className="text-slate-400 hover:text-white">
                  বন্ধ করুন
                </Button>
              </div>

              <div className="mt-4 p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl">
                <p className="text-xs text-indigo-300">মোট পেন্ডিং পরিমাণ</p>
                <p className="text-2xl font-black text-indigo-400">৳ {pendingTotalAmount.toLocaleString('bn-BD')}</p>
              </div>

              <div className="mt-6 flex-1 space-y-3">
                {pendingCheques.length === 0 ? (
                  <p className="text-center text-slate-500 py-10 text-sm">কোন পেন্ডিং চেক নেই</p>
                ) : (
                  pendingCheques.map(cheque => (
                    <div key={cheque.id} className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-200 text-sm">{cheque.customerName}</p>
                          <p className="text-xs text-slate-400">{cheque.bankName} - {cheque.chequeNo}</p>
                        </div>
                        <span className="text-sm font-extrabold text-orange-400">৳{cheque.amount.toLocaleString('bn-BD')}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-700/40">
                        <span className="text-[11px] text-slate-400">{cheque.chequeDate ? `তারিখ: ${cheque.chequeDate}` : 'তারিখ নির্দিষ্ট নেই'}</span>
                        <Button
                          size="sm"
                          onClick={() => handleClearCheque(cheque)}
                          disabled={clearingId === cheque.id}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> ক্যাশ করুন
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Pending Orders Management Drawer */}
      <AnimatePresence>
        {showOrdersDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOrdersDrawer(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto shadow-2xl flex flex-col font-bengali"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-bold text-white">চালান অপেক্ষমাণ অর্ডারসমূহ</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowOrdersDrawer(false)} className="text-slate-400 hover:text-white">
                  বন্ধ করুন
                </Button>
              </div>

              <div className="mt-4 p-3.5 bg-orange-950/40 border border-orange-800/40 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-xs text-orange-300 font-semibold">অপেক্ষমাণ অর্ডারের সংখ্যা</p>
                  <p className="text-xl font-black text-orange-400 mt-0.5">{toBnDigits(pendingOrders.length)} টি অর্ডার</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-orange-300 font-semibold">মোট বকেয়া বিল</p>
                  <p className="text-xl font-black text-orange-400 mt-0.5">৳ {pendingOrdersTotal.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="mt-6 flex-1 space-y-3">
                {pendingOrders.length === 0 ? (
                  <div className="text-center text-slate-500 py-16 space-y-2">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500/40 mx-auto" />
                    <p className="font-bold text-slate-400 text-base">সব অর্ডারের চালান সম্পন্ন হয়েছে!</p>
                    <p className="text-xs text-slate-600">বর্তমানে কোনো অপেক্ষমাণ অর্ডার নেই</p>
                  </div>
                ) : (
                  pendingOrders.map(order => (
                    <div
                      key={order.id}
                      onClick={() => {
                        setShowOrdersDrawer(false);
                        router.push(`/orders?id=${order.id}`);
                      }}
                      className="p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-orange-500/50 rounded-2xl space-y-2.5 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                              #{toBnDigits(order.id.slice(0, 8).toUpperCase())}
                            </span>
                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                              চালান বাকি
                            </span>
                          </div>
                          <p className="font-bold text-slate-100 text-base mt-1 group-hover:text-orange-400 transition-colors">
                            {order.customerName}
                          </p>
                          {order.customerPhone && (
                            <p className="text-xs text-slate-400 font-semibold">{toBnDigits(order.customerPhone)}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-emerald-400 block">
                            ৳ {order.totalAmount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[11px] text-slate-400 mt-1 block">
                            {formatBnDate(order.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-xs text-orange-400 font-bold group-hover:translate-x-0.5 transition-transform">
                        <span>বিবরণী ও চালান তৈরি করুন</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hawlat Note Tracker Drawer */}
      <AnimatePresence>
        {showHawlatDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHawlatDrawer(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-slate-900 border-l border-slate-800 p-5 md:p-6 overflow-y-auto shadow-2xl flex flex-col font-bengali text-slate-100"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <NotebookPen className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      হাওলাত খাতা
                      <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        মেমো নোট
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">ব্যক্তিগত বা সাময়িক হাওলাতের হিসেব নোট</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowHawlatDrawer(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Informational Banner */}
              <div className="mt-4 p-3 bg-slate-800/80 border border-emerald-500/30 rounded-xl flex items-start gap-2.5">
                <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  এখানে কাউকে <span className="text-amber-400 font-bold">হাওলাত দিলে সরাসরি ক্যাশ ব্যালেন্স থেকে কর্তন (-) হবে</span> এবং পরবর্তীতে <span className="text-emerald-400 font-bold">পরিশোধে ক্লিক করলে ক্যাশে জমা (+ ইন)</span> হবে।
                </p>
              </div>

              {/* Stats & Add Button Header */}
              <div className="mt-4 p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex gap-4 items-center">
                  <div>
                    <p className="text-[11px] text-amber-400 font-semibold">চলতি হাওলাত</p>
                    <p className="text-xl font-black text-amber-400 mt-0.5">
                      ৳ {pendingHawlatAmount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-slate-800" />
                  <div>
                    <p className="text-[11px] text-emerald-400 font-semibold">পরিশোধিত</p>
                    <p className="text-xl font-black text-emerald-400 mt-0.5">
                      ৳ {settledHawlatAmount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowAddHawlatForm(!showAddHawlatForm)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-1.5 transition-all"
                >
                  {showAddHawlatForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {showAddHawlatForm ? 'ফর্ম বন্ধ করুন' : 'নতুন হাওলাত যোগ করুন'}
                </Button>
              </div>

              {/* Filter Tabs */}
              <div className="mt-4 flex items-center gap-1 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs">
                <button
                  onClick={() => setHawlatFilterTab('all')}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer",
                    hawlatFilterTab === 'all' ? "bg-slate-700 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  সবগুলো ({toBnDigits(hawlatItems.length)})
                </button>
                <button
                  onClick={() => setHawlatFilterTab('pending')}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer",
                    hawlatFilterTab === 'pending' ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  চলতি ({toBnDigits(pendingHawlatItems.length)})
                </button>
                <button
                  onClick={() => setHawlatFilterTab('settled')}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer",
                    hawlatFilterTab === 'settled' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  পরিশোধিত ({toBnDigits(settledHawlatItems.length)})
                </button>
              </div>

              {/* New Hawlat Entry Form */}
              <AnimatePresence>
                {showAddHawlatForm && (
                  <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleAddHawlat}
                    className="mt-4 p-4 bg-slate-800/90 border border-slate-700/80 rounded-2xl space-y-3 overflow-hidden shadow-xl"
                  >
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                      <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> নতুন হাওলাত তথ্য লিখুন
                      </h4>
                      <span className="text-[11px] text-amber-400/90 font-medium">
                        * হাওলাত দিলে ক্যাশ থেকে কর্তন (-) হবে
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-300 font-medium mb-1">ব্যক্তি / গ্রাহকের নাম</label>
                        <input
                          type="text"
                          placeholder="রহিম ভাই / ব্যক্তির নাম"
                          value={hawlatPersonName}
                          onChange={(e) => setHawlatPersonName(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 font-medium mb-1">টাকার পরিমাণ (৳) *</label>
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="০.০০"
                          value={hawlatAmount}
                          onChange={(e) => setHawlatAmount(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-bold text-emerald-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-300 font-medium mb-1">তারিখ</label>
                        <BengaliDatePicker
                          value={hawlatDate}
                          onChange={(val) => setHawlatDate(val)}
                          placeholder="তারিখ নির্বাচন"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 font-medium mb-1">নোট / বিবরণ</label>
                        <input
                          type="text"
                          placeholder="জরুরি প্রয়োজনে দেয়া হলো / বিবরণ"
                          value={hawlatNote}
                          onChange={(e) => setHawlatNote(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isAddingHawlat}
                        onClick={() => setShowAddHawlatForm(false)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        বাতিল
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isAddingHawlat}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 flex items-center gap-1.5"
                      >
                        {isAddingHawlat ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            সংরক্ষণ হচ্ছে...
                          </>
                        ) : (
                          'সংরক্ষণ করুন (ক্যাশ কর্তন)'
                        )}
                      </Button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Hawlat List Table */}
              <div className="mt-5 flex-1 overflow-y-auto">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  হাওলাত এন্ট্রি তালিকা
                </h4>

                {filteredHawlatItems.length === 0 ? (
                  <div className="text-center text-slate-500 py-16 space-y-3 bg-slate-800/40 border border-slate-800 rounded-2xl">
                    <NotebookPen className="w-12 h-12 text-slate-600/50 mx-auto" />
                    <p className="font-bold text-slate-300 text-sm">কোনো হাওলাত এন্ট্রি পাওয়া যায়নি</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      &quot;নতুন হাওলাত যোগ করুন&quot; বাটনে ক্লিক করে নতুন নোট তৈরি করুন
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-800/40">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-700/60">
                          <tr>
                            <th className="py-2.5 px-3">তারিখ</th>
                            <th className="py-2.5 px-3">ব্যক্তি ও বিবরণ</th>
                            <th className="py-2.5 px-3 text-right">পরিমাণ (৳)</th>
                            <th className="py-2.5 px-2 text-center">অবস্থা / অ্যাকশন</th>
                            <th className="py-2.5 px-1 text-center">মুছুন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 font-bengali">
                          {filteredHawlatItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-800/60 transition-colors group">
                              <td className="py-3 px-3 align-top font-sans text-[11px] text-slate-400 whitespace-nowrap">
                                {formatBnDate(item.date, 'dd/MM/yyyy')}
                              </td>
                              <td className="py-3 px-3 align-top">
                                <p className="font-bold text-slate-100 text-sm group-hover:text-emerald-400 transition-colors">
                                  {item.personName}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                                  {item.note}
                                </p>
                              </td>
                              <td className="py-3 px-3 align-top text-right whitespace-nowrap font-black text-amber-400 text-sm">
                                ৳ {item.amount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-2 align-top text-center whitespace-nowrap">
                                {item.isSettled ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    পরিশোধিত
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => setSettlingHawlat(item)}
                                    className="px-2.5 py-1 text-[11px] font-bold bg-amber-500/20 hover:bg-emerald-600 text-amber-300 hover:text-white border border-amber-500/30 hover:border-emerald-500 rounded-lg transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    পরিশোধ করুন
                                  </button>
                                )}
                              </td>
                              <td className="py-3 px-1 align-top text-center">
                                <button
                                  onClick={() => handleDeleteHawlat(item)}
                                  title="মুছে ফেলুন"
                                  className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hawlat Settlement Confirmation Modal */}
      <AnimatePresence>
        {settlingHawlat && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSettlingHawlat) setSettlingHawlat(null);
              }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 font-bengali"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-sm w-full text-slate-100 shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">হাওলাত পরিশোধ নিশ্চিতকরণ</h3>
                    <p className="text-xs text-slate-400">এই হাওলাতের টাকা কি আদায়/ফেরত পাওয়া গেছে?</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ব্যক্তি/গ্রাহক:</span>
                    <span className="font-bold text-white">{settlingHawlat.personName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">টাকার পরিমাণ:</span>
                    <span className="font-black text-amber-400">৳ {settlingHawlat.amount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {settlingHawlat.note && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">বিবরণ:</span>
                      <span className="text-slate-300 truncate max-w-[180px]">{settlingHawlat.note}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  নিশ্চিত করলে এই এন্ট্রিটি &quot;<span className="text-emerald-400 font-bold">পরিশোধিত</span>&quot; চিহ্নিত হবে এবং <span className="text-emerald-400 font-bold">৳ {settlingHawlat.amount.toLocaleString('bn-BD')} টাকা সরাসরি ক্যাশ ব্যালেন্সে যোগ (+ ইন)</span> হবে।
                </p>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isSettlingHawlat}
                    onClick={() => setSettlingHawlat(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    বাতিল
                  </Button>
                  <Button
                    size="sm"
                    disabled={isSettlingHawlat}
                    onClick={() => handleSettleHawlat(settlingHawlat)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 rounded-xl flex items-center gap-1.5"
                  >
                    {isSettlingHawlat ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        সংরক্ষণ হচ্ছে...
                      </>
                    ) : (
                      'হ্যাঁ, পরিশোধিত নিশ্চিত করুন'
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Shipping Charges Drawer (গাড়ি ভাড়া খাতা) */}
      <AnimatePresence>
        {showShippingDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShippingDrawer(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs font-bengali"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-slate-900 text-white shadow-2xl flex flex-col border-l border-slate-800 font-bengali"
            >
              <div className="p-5 bg-gradient-to-r from-blue-900/40 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/20 rounded-2xl border border-blue-500/30 text-blue-400">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                      গাড়ি ভাড়া খাতা <span className="text-xs font-normal text-blue-400">(পরিবহন খরচ)</span>
                    </h3>
                    <p className="text-xs text-slate-400">ক্রয় ও বিক্রয় চালানের ড্রাইভার ও গাড়ি ভাড়ার হিসাব</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowShippingDrawer(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setShippingFilterTab('pending')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-bold transition-all",
                      shippingFilterTab === 'pending' ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                    )}
                  >
                    বকেয়া/সমন্বয় ({toBnDigits(pendingShippingItems.length)})
                  </button>
                  <button
                    onClick={() => setShippingFilterTab('paid')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-bold transition-all",
                      shippingFilterTab === 'paid' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                    )}
                  >
                    পরিশোধিত
                  </button>
                  <button
                    onClick={() => setShippingFilterTab('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-bold transition-all",
                      shippingFilterTab === 'all' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-white"
                    )}
                  >
                    সকল
                  </button>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">মোট বকেয়া গাড়ি ভাড়া</span>
                  <span className="text-base font-black text-blue-400">
                    ৳ {pendingShippingItems.reduce((a, b) => a + (b.dueAmount || 0), 0).toLocaleString('bn-BD')}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredShippingItems.length === 0 ? (
                  <div className="text-center text-slate-500 py-20 space-y-3 bg-slate-800/30 border border-slate-800/60 rounded-2xl">
                    <Truck className="w-12 h-12 text-slate-600/40 mx-auto" />
                    <p className="font-bold text-slate-300 text-sm">কোনো গাড়ি ভাড়া রেকর্ড পাওয়া যায়নি</p>
                  </div>
                ) : (
                  filteredShippingItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-2xl transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                              #{item.invoiceId}
                            </span>
                            {item.type === 'sale' ? (
                              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                🚚 বিক্রয় চালান
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md border border-blue-500/30">
                                🏗️ ক্রয় চালান
                              </span>
                            )}
                            <span className="text-xs text-slate-400 font-sans">
                              {formatBnDate(item.date, 'dd/MM/yyyy')}
                            </span>
                          </div>
                          {item.type === 'sale' && item.partyName && (
                            <p className="text-xs text-slate-300 mt-1">
                              গ্রাহক: <strong className="text-white">{item.partyName}</strong>
                            </p>
                          )}
                          <p className="font-bold text-slate-200 text-sm mt-0.5">
                            গাড়ি নং: <span className="text-white">{item.vehicleNo || '—'}</span>
                          </p>
                          {item.deliveryAddress && (
                            <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                              স্থান: {item.deliveryAddress}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-amber-400">
                            ৳ {item.amount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                          </p>
                          {(item.dueAmount || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md mt-0.5">
                              বকেয়া: ৳ {(item.dueAmount || 0).toLocaleString('bn-BD')}
                            </span>
                          ) : (item.overpaidAmount || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md mt-0.5">
                              অতিরিক্ত: ৳ {(item.overpaidAmount || 0).toLocaleString('bn-BD')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md mt-0.5">
                              <CheckCircle2 className="w-3 h-3" /> পরিশোধিত
                            </span>
                          )}
                        </div>
                      </div>

                      {item.paidAmount !== undefined && item.paidAmount > 0 && (
                        <div className="text-xs text-slate-400 bg-slate-900/40 px-2.5 py-1.5 rounded-lg flex justify-between">
                          <span>পূর্বে পরিশোধিত: <strong className="text-slate-200">৳ {item.paidAmount.toLocaleString('bn-BD')}</strong></span>
                          <span>সংশোধিত খরচ: <strong className="text-slate-200">৳ {item.amount.toLocaleString('bn-BD')}</strong></span>
                        </div>
                      )}

                      {(item.driverName || item.driverPhone) && (
                        <div className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
                          <span>ড্রাইভার: <strong className="text-slate-200">{item.driverName || '—'}</strong></span>
                          <span>মোবাইল: <strong className="text-slate-200">{item.driverPhone || '—'}</strong></span>
                        </div>
                      )}

                      {(item.dueAmount || 0) > 0 && (
                        <div className="pt-2 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => setSettlingShipping(item)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 rounded-xl shadow-md cursor-pointer"
                          >
                            বাকি ৳ {(item.dueAmount || 0).toLocaleString('bn-BD')} পরিশোধ করুন
                          </Button>
                        </div>
                      )}

                      {(item.overpaidAmount || 0) > 0 && (
                        <div className="pt-2 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => setSettlingShipping(item)}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 rounded-xl shadow-md cursor-pointer"
                          >
                            অতিরিক্ত ৳ {(item.overpaidAmount || 0).toLocaleString('bn-BD')} ERP-তে সমন্বয় করুন
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Labor Charges Drawer (লেবার খরচ খাতা) */}
      <AnimatePresence>
        {showLaborDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLaborDrawer(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs font-bengali"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-slate-900 text-white shadow-2xl flex flex-col border-l border-slate-800 font-bengali"
            >
              <div className="p-5 bg-gradient-to-r from-amber-900/40 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 rounded-2xl border border-amber-500/30 text-amber-400">
                    <HardHat className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                      লেবার খরচ খাতা <span className="text-xs font-normal text-amber-400">(লোডিং ও আনলোডিং মজুরি)</span>
                    </h3>
                    <p className="text-xs text-slate-400">ক্রয় আনলোডিং ও বিক্রয় লোডিং (সিমেন্ট ও রড) লেবার মজুরির হিসাব</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLaborDrawer(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setLaborFilterTab('pending')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-bold transition-all",
                      laborFilterTab === 'pending' ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                    )}
                  >
                    বকেয়া/সমন্বয় ({toBnDigits(pendingLaborItems.length)})
                  </button>
                  <button
                    onClick={() => setLaborFilterTab('paid')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-bold transition-all",
                      laborFilterTab === 'paid' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                    )}
                  >
                    পরিশোধিত
                  </button>
                  <button
                    onClick={() => setLaborFilterTab('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-bold transition-all",
                      laborFilterTab === 'all' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-white"
                    )}
                  >
                    সকল
                  </button>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">মোট বকেয়া লেবার খরচ</span>
                  <span className="text-base font-black text-amber-400">
                    ৳ {pendingLaborItems.reduce((a, b) => a + (b.dueAmount || 0), 0).toLocaleString('bn-BD')}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredLaborItems.length === 0 ? (
                  <div className="text-center text-slate-500 py-20 space-y-3 bg-slate-800/30 border border-slate-800/60 rounded-2xl">
                    <HardHat className="w-12 h-12 text-slate-600/40 mx-auto" />
                    <p className="font-bold text-slate-300 text-sm">কোনো লেবার খরচ রেকর্ড পাওয়া যায়নি</p>
                  </div>
                ) : (
                  filteredLaborItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-2xl transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                              #{item.invoiceId}
                            </span>
                            {item.type === 'loading' ? (
                              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                                🚚 বিক্রয় লোডিং (সিমেন্ট)
                              </span>
                            ) : item.type === 'rod_loading' ? (
                              <span className="text-[10px] font-bold bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-md border border-sky-500/30">
                                🔹 বিক্রয় লোডিং (রড)
                              </span>
                            ) : item.type === 'rod_unloading' ? (
                              <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-md border border-teal-500/30">
                                🏗️ বিক্রয় আনলোডিং (রড)
                              </span>
                            ) : item.type === 'cement_unloading' ? (
                              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                🏗️ বিক্রয় আনলোডিং (সিমেন্ট)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md border border-blue-500/30">
                                🏗️ ক্রয় আনলোডিং
                              </span>
                            )}
                            <span className="text-xs text-slate-400 font-sans">
                              {formatBnDate(item.date, 'dd/MM/yyyy')}
                            </span>
                          </div>

                          {item.type === 'loading' ? (
                            <div className="text-xs space-y-0.5 mt-1.5">
                              <p className="text-slate-300">
                                গ্রাহক: <strong className="text-white">{item.partyName || 'খুচরা গ্রাহক'}</strong>
                              </p>
                              {item.cementBags ? (
                                <p className="text-slate-300">
                                  সিমেন্ট পরিমাণ: <strong className="text-amber-300 font-mono">{toBnDigits(item.cementBags)} বস্তা</strong> {item.loadingRate ? `(@ ৳${toBnDigits(item.loadingRate)}/বস্তা)` : ''}
                                </p>
                              ) : null}
                              {item.unloadingSite && (
                                <p className="text-slate-400 text-[11px]">ডেলিভারি ঠিকানা: {item.unloadingSite}</p>
                              )}
                            </div>
                          ) : item.type === 'rod_loading' ? (
                            <div className="text-xs space-y-0.5 mt-1.5">
                              <p className="text-slate-300">
                                গ্রাহক: <strong className="text-white">{item.partyName || 'খুচরা গ্রাহক'}</strong>
                              </p>
                              {item.rodKg ? (
                                <p className="text-slate-300">
                                  রড ও রিং ওজন: <strong className="text-sky-300 font-mono">{toBnDigits(item.rodKg)} কেজি</strong> {item.rodRate ? `(@ ৳${toBnDigits(item.rodRate)}/কেজি)` : ''}
                                </p>
                              ) : null}
                              {item.unloadingSite && (
                                <p className="text-slate-400 text-[11px]">ডেলিভারি ঠিকানা: {item.unloadingSite}</p>
                              )}
                            </div>
                          ) : item.type === 'rod_unloading' ? (
                            <div className="text-xs space-y-0.5 mt-1.5">
                              <p className="text-slate-300">
                                গ্রাহক: <strong className="text-white">{item.partyName || 'খুচরা গ্রাহক'}</strong>
                              </p>
                              {item.rodKg ? (
                                <p className="text-slate-300">
                                  রড আনলোডিং ওজন: <strong className="text-teal-300 font-mono">{toBnDigits(item.rodKg)} কেজি</strong> {item.rodRate ? `(@ ৳${toBnDigits(item.rodRate)}/কেজি)` : ''}
                                </p>
                              ) : null}
                              {item.unloadingSite && (
                                <p className="text-slate-400 text-[11px]">ডেলিভারি ঠিকানা: {item.unloadingSite}</p>
                              )}
                            </div>
                          ) : item.type === 'cement_unloading' ? (
                            <div className="text-xs space-y-0.5 mt-1.5">
                              <p className="text-slate-300">
                                গ্রাহক: <strong className="text-white">{item.partyName || 'খুচরা গ্রাহক'}</strong>
                              </p>
                              {item.cementBags ? (
                                <p className="text-slate-300">
                                  সিমেন্ট পরিমাণ: <strong className="text-emerald-300 font-mono">{toBnDigits(item.cementBags)} বস্তা</strong> {item.loadingRate ? `(@ ৳${toBnDigits(item.loadingRate)}/বস্তা)` : ''}
                                </p>
                              ) : null}
                              {item.unloadingSite && (
                                <p className="text-slate-400 text-[11px]">ডেলিভারি ঠিকানা: {item.unloadingSite}</p>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs space-y-0.5 mt-1.5">
                              {item.partyName && (
                                <p className="text-slate-300">সাপ্লায়ার: <strong className="text-white">{item.partyName}</strong></p>
                              )}
                              <p className="font-bold text-slate-200">
                                আনলোডিং স্থান: <span className="text-white">{item.unloadingSite || 'প্রধান গুদাম'}</span>
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-amber-400 font-mono">
                            ৳ {item.amount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                          </p>
                          {(item.dueAmount || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md mt-0.5 font-mono">
                              বকেয়া: ৳ {(item.dueAmount || 0).toLocaleString('bn-BD')}
                            </span>
                          ) : (item.overpaidAmount || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md mt-0.5 font-mono">
                              অতিরিক্ত: ৳ {(item.overpaidAmount || 0).toLocaleString('bn-BD')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md mt-0.5">
                              <CheckCircle2 className="w-3 h-3" /> পরিশোধিত
                            </span>
                          )}
                        </div>
                      </div>

                      {item.paidAmount !== undefined && item.paidAmount > 0 && (
                        <div className="text-xs text-slate-400 bg-slate-900/40 px-2.5 py-1.5 rounded-lg flex justify-between font-mono">
                          <span>পূর্বে পরিশোধিত: <strong className="text-slate-200">৳ {item.paidAmount.toLocaleString('bn-BD')}</strong></span>
                          <span>মোট খরচ: <strong className="text-slate-200">৳ {item.amount.toLocaleString('bn-BD')}</strong></span>
                        </div>
                      )}

                      {(item.dueAmount || 0) > 0 && (
                        <div className="pt-2 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => setSettlingLabor(item)}
                            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 rounded-xl shadow-md cursor-pointer"
                          >
                            বাকি ৳ {(item.dueAmount || 0).toLocaleString('bn-BD')} {item.type === 'loading' ? 'লোডিং' : item.type === 'rod_loading' ? 'রড লেবার' : 'লেবার'} খরচ পরিশোধ করুন
                          </Button>
                        </div>
                      )}

                      {(item.overpaidAmount || 0) > 0 && (
                        <div className="pt-2 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => setSettlingLabor(item)}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 rounded-xl shadow-md cursor-pointer"
                          >
                            অতিরিক্ত ৳ {(item.overpaidAmount || 0).toLocaleString('bn-BD')} ERP-তে সমন্বয় করুন
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Shipping Settlement / Adjustment Confirmation Modal */}
      <AnimatePresence>
        {settlingShipping && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 font-bengali">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-sm w-full text-slate-100 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-3 rounded-2xl border",
                  (settlingShipping.overpaidAmount || 0) > 0 ? "bg-rose-500/20 border-rose-500/30" : "bg-blue-500/20 border-blue-500/30"
                )}>
                  <Truck className={cn("w-6 h-6", (settlingShipping.overpaidAmount || 0) > 0 ? "text-rose-400" : "text-blue-400")} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {(settlingShipping.overpaidAmount || 0) > 0 
                      ? 'অতিরিক্ত গাড়ি ভাড়া সমন্বয়' 
                      : settlingShipping.type === 'sale'
                      ? 'বিক্রয় গাড়ি ভাড়া পরিশোধ নিশ্চিতকরণ'
                      : 'গাড়ি ভাড়া পরিশোধ নিশ্চিতকরণ'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {(settlingShipping.overpaidAmount || 0) > 0 
                      ? 'খরচ কমানোর ফলে অতিরিক্ত টাকা ERP-তে সমন্বয় করুন' 
                      : settlingShipping.type === 'sale'
                      ? 'বিক্রয় চালানের ড্রাইভার ও গাড়ি ভাড়া ক্যাশ থেকে পরিশোধ সম্পন্ন করুন'
                      : 'বকেয়া গাড়ি ভাড়া পরিশোধ সম্পন্ন করুন'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">ইনভয়েস নং:</span>
                  <span className="font-bold text-white">#{settlingShipping.invoiceId}</span>
                </div>
                {settlingShipping.type === 'sale' && settlingShipping.partyName && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">গ্রাহক:</span>
                    <span className="font-bold text-slate-200">{settlingShipping.partyName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">গাড়ি / ড্রাইভার:</span>
                  <span className="font-bold text-slate-200">{settlingShipping.vehicleNo || settlingShipping.driverName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">সংশোধিত মোট খরচ:</span>
                  <span className="font-bold text-slate-200">৳ {settlingShipping.amount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                </div>
                {settlingShipping.paidAmount !== undefined && settlingShipping.paidAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">পূর্বে পরিশোধিত:</span>
                    <span className="font-bold text-slate-200">৳ {settlingShipping.paidAmount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-700/80 pt-1.5">
                  <span className="font-bold text-slate-300">
                    {(settlingShipping.overpaidAmount || 0) > 0 ? 'সমন্বয়যোগ্য অতিরিক্ত টাকা:' : 'বাকি প্রদেয় টাকা:'}
                  </span>
                  <span className={cn("font-black text-sm", (settlingShipping.overpaidAmount || 0) > 0 ? "text-rose-400" : "text-amber-400")}>
                    ৳ {((settlingShipping.overpaidAmount || 0) > 0 ? settlingShipping.overpaidAmount! : (settlingShipping.dueAmount !== undefined ? settlingShipping.dueAmount : settlingShipping.amount)).toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettlingShipping(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  বাতিল
                </Button>
                {(settlingShipping.overpaidAmount || 0) > 0 ? (
                  <Button
                    size="sm"
                    disabled={isSettlingPayment}
                    onClick={() => handleAdjustOverpaidShipping(settlingShipping)}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 rounded-xl disabled:opacity-50"
                  >
                    {isSettlingPayment ? 'সমন্বয় হচ্ছে...' : `হ্যাঁ, অতিরিক্ত ৳ ${settlingShipping.overpaidAmount!.toLocaleString('bn-BD')} সমন্বয় করুন`}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={isSettlingPayment}
                    onClick={() => handleSettleShipping(settlingShipping)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 rounded-xl disabled:opacity-50"
                  >
                    {isSettlingPayment ? 'পরিশোধ হচ্ছে...' : `হ্যাঁ, বাকি ৳ ${(settlingShipping.dueAmount !== undefined ? settlingShipping.dueAmount : settlingShipping.amount).toLocaleString('bn-BD')} পরিশোধ করুন`}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Labor Settlement / Adjustment Confirmation Modal */}
      <AnimatePresence>
        {settlingLabor && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 font-bengali">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-sm w-full text-slate-100 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-3 rounded-2xl border",
                  (settlingLabor.overpaidAmount || 0) > 0 ? "bg-rose-500/20 border-rose-500/30" : "bg-amber-500/20 border-amber-500/30"
                )}>
                  <HardHat className={cn("w-6 h-6", (settlingLabor.overpaidAmount || 0) > 0 ? "text-rose-400" : "text-amber-400")} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {(settlingLabor.overpaidAmount || 0) > 0 
                      ? 'অতিরিক্ত খরচ সমন্বয়' 
                      : settlingLabor.type === 'rod_loading'
                      ? 'বিক্রয় রড লোডিং খরচ পরিশোধ'
                      : (settlingLabor.type === 'loading' ? 'বিক্রয় লোডিং খরচ পরিশোধ' : 'ক্রয় লেবার খরচ পরিশোধ')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {(settlingLabor.overpaidAmount || 0) > 0 
                      ? 'খরচ কমানোর ফলে অতিরিক্ত টাকা ERP-তে সমন্বয় করুন' 
                      : settlingLabor.type === 'rod_loading'
                      ? 'বিক্রয় চালানের রড ও রিং লোডিং লেবার মজুরি ক্যাশ থেকে পরিশোধ করুন'
                      : (settlingLabor.type === 'loading' ? 'বিক্রয় চালানের সিমেন্ট লোডিং খরচ পরিশোধ করুন' : 'বকেয়া আনলোডিং লেবার মজুরি পরিশোধ করুন')}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">ইনভয়েস নং:</span>
                  <span className="font-bold text-white">#{settlingLabor.invoiceId}</span>
                </div>
                {settlingLabor.type === 'loading' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">গ্রাহকের নাম:</span>
                      <span className="font-bold text-slate-200">{settlingLabor.partyName || 'খুচরা গ্রাহক'}</span>
                    </div>
                    {settlingLabor.cementBags && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">সিমেন্ট পরিমাণ:</span>
                        <span className="font-bold text-amber-300 font-mono">{toBnDigits(settlingLabor.cementBags)} বস্তা</span>
                      </div>
                    )}
                  </>
                ) : settlingLabor.type === 'rod_loading' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">গ্রাহকের নাম:</span>
                      <span className="font-bold text-slate-200">{settlingLabor.partyName || 'খুচরা গ্রাহক'}</span>
                    </div>
                    {settlingLabor.rodKg && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">রড ও রিং ওজন:</span>
                        <span className="font-bold text-sky-300 font-mono">{toBnDigits(settlingLabor.rodKg)} কেজি {settlingLabor.rodRate ? `(@ ৳${toBnDigits(settlingLabor.rodRate)}/কেজি)` : ''}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {settlingLabor.partyName && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">সাপ্লায়ার:</span>
                        <span className="font-bold text-slate-200">{settlingLabor.partyName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">আনলোডিং স্থান:</span>
                      <span className="font-bold text-slate-200">{settlingLabor.unloadingSite || 'প্রধান গুদাম'}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">মোট খরচ:</span>
                  <span className="font-bold text-slate-200 font-mono">৳ {settlingLabor.amount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                </div>
                {settlingLabor.paidAmount !== undefined && settlingLabor.paidAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">পূর্বে পরিশোধিত:</span>
                    <span className="font-bold text-slate-200 font-mono">৳ {settlingLabor.paidAmount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-700/80 pt-1.5">
                  <span className="font-bold text-slate-300">
                    {(settlingLabor.overpaidAmount || 0) > 0 ? 'সমন্বয়যোগ্য অতিরিক্ত টাকা:' : 'বাকি প্রদেয় টাকা:'}
                  </span>
                  <span className={cn("font-black text-sm", (settlingLabor.overpaidAmount || 0) > 0 ? "text-rose-400" : "text-amber-400")}>
                    ৳ {((settlingLabor.overpaidAmount || 0) > 0 ? settlingLabor.overpaidAmount! : (settlingLabor.dueAmount !== undefined ? settlingLabor.dueAmount : settlingLabor.amount)).toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettlingLabor(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  বাতিল
                </Button>
                {(settlingLabor.overpaidAmount || 0) > 0 ? (
                  <Button
                    size="sm"
                    disabled={isSettlingPayment}
                    onClick={() => handleAdjustOverpaidLabor(settlingLabor)}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 rounded-xl disabled:opacity-50"
                  >
                    {isSettlingPayment ? 'সমন্বয় হচ্ছে...' : `হ্যাঁ, অতিরিক্ত ৳ ${settlingLabor.overpaidAmount!.toLocaleString('bn-BD')} সমন্বয় করুন`}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={isSettlingPayment}
                    onClick={() => handleSettleLabor(settlingLabor)}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 rounded-xl disabled:opacity-50"
                  >
                    {isSettlingPayment ? 'পরিশোধ হচ্ছে...' : `হ্যাঁ, বাকি ৳ ${(settlingLabor.dueAmount !== undefined ? settlingLabor.dueAmount : settlingLabor.amount).toLocaleString('bn-BD')} পরিশোধ করুন`}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


