'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import {
  Plus, Search, Filter, Trash2, ArrowUpRight, ArrowDownRight, Wallet,
  TrendingUp, TrendingDown, RefreshCcw, Landmark, CreditCard, ArrowLeftRight,
  Receipt, Calendar, DollarSign, AlertCircle, CheckCircle2, Printer, UploadCloud, X,
  Building2, User, Phone, ShieldCheck, FileText, Check, ArrowLeft, Eye, Edit2,
  FileSpreadsheet, FileDown, Clock, PieChart, ChevronLeft, ChevronRight, Lightbulb, PlusCircle,
  ChevronUp, ChevronDown, RotateCcw, MoreVertical, HardHat, MapPin, HandCoins
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerSearchSelect } from '@/components/CustomerSearchSelect';
import { SupplierSearchSelect } from '@/components/SupplierSearchSelect';
import { toast } from 'sonner';
import { format, isToday, isSameMonth } from 'date-fns';
import { bn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toBengaliDigits } from '@/lib/bengaliUtils';
import { PaymentVoucherDetailsView } from '@/components/PaymentVoucherDetailsView';
import { PaymentVoucherMemo } from '@/components/PaymentVoucherMemo';
import { BengaliDateRangePicker } from '@/components/ui/BengaliDateRangePicker';
import { BengaliDatePicker } from '@/components/ui/BengaliDatePicker';
import { printElement } from '@/lib/printUtils';
import { useAuth } from '@/lib/authContext';

interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'contra';
  amount: number;
  category: string;
  description: string;
  accountType?: 'cash' | 'bank';
  bankId?: string;
  paymentId?: string;
  partyName?: string;
  partyPhone?: string;
  partyAddress?: string;
  businessName?: string;
  siteName?: string;
  invoiceNo?: string;
  referenceNo?: string;
  paymentMethod?: string;
  bankAccountName?: string;
  bankName?: string;
  accountNo?: string;
  chequeNo?: string;
  chequeDate?: string;
  transactionType?: string;
  transactionRef?: string;
  discountAmount?: number;
  previousBalance?: number;
  operatorName?: string;
  receiverName?: string;
  status?: 'Completed' | 'Pending' | 'Bounced' | 'Recorded';
  notes?: string;
  createdAt: any;
  raw?: any;
}

interface Bank {
  id: string;
  name: string;
  accNo: string;
  balance: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  businessName?: string;
}

interface Supplier {
  id: string;
  name: string;
  phone: string;
  address?: string;
  businessName?: string;
  total_due?: number;
  totalDue?: number;
  due?: number;
  balance?: number;
}

interface OrderInvoice {
  id: string;
  invoiceNo?: string;
  orderId?: string;
  purchaseId?: string;
  customerName?: string;
  supplierName?: string;
  engineerName?: string;
  engineerCommission?: number;
  partyName?: string;
  customerId?: string;
  supplierId?: string;
  engineerId?: string;
  partyId?: string;
  customerPhone?: string;
  supplierPhone?: string;
  totalAmount?: number;
  totalPrice?: number;
  paidAmount?: number;
  dueAmount?: number;
  siteName?: string;
  paymentStatus?: string;
  createdAt: any;
}

function TransactionsContent() {
  const { canEditInvoice, canDeleteInvoice, canCreateInvoice } = useAuth();
  const searchParams = useSearchParams();
  const partyParam = searchParams ? searchParams.get('party') : null;
  const partyTypeParam = searchParams ? searchParams.get('party_type') : null;
  const filterParam = searchParams ? searchParams.get('filter') : null;
  const typeParam = searchParams ? searchParams.get('type') : null;
  const actionParam = searchParams ? searchParams.get('action') : null;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [engineers, setEngineers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<OrderInvoice[]>([]);
  const [purchases, setPurchases] = useState<OrderInvoice[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense' | 'contra'>('all');
  const [filterBank, setFilterBank] = useState<string>('all');
  const [filterCustomer, setFilterCustomer] = useState<string>('all');
  const [filterInvoiceNo, setFilterInvoiceNo] = useState<string>('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>(partyParam || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const [selectedTxnForView, setSelectedTxnForView] = useState<Transaction | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  // Close open action menu on outside click or scroll or resize
  useEffect(() => {
    const handleClose = () => {
      setOpenMenuId(null);
      setMenuPos(null);
    };
    if (openMenuId) {
      window.addEventListener('click', handleClose);
      window.addEventListener('scroll', handleClose, true);
      window.addEventListener('resize', handleClose);
      return () => {
        window.removeEventListener('click', handleClose);
        window.removeEventListener('scroll', handleClose, true);
        window.removeEventListener('resize', handleClose);
      };
    }
  }, [openMenuId]);

  const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    if (openMenuId === id) {
      setOpenMenuId(null);
      setMenuPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 200; // flip upward if not enough space at bottom

    setOpenMenuId(id);
    setMenuPos({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left: rect.right - 176,
      openUp
    });
  };

  // Modals
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [isAddTxnOpen, setIsAddTxnOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPrintMemoOpen, setIsPrintMemoOpen] = useState(false);
  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);
  const [isMakePaymentOpen, setIsMakePaymentOpen] = useState(false);
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);

  // Add Money (টাকা যোগ) State
  const [addMoneyCategory, setAddMoneyCategory] = useState('ক্যাশে জমা (Add Cash)');
  const [addMoneyAmount, setAddMoneyAmount] = useState<number>(0);
  const [addMoneyMethod, setAddMoneyMethod] = useState<'Cash' | 'Bank'>('Cash');
  const [addMoneyBankId, setAddMoneyBankId] = useState<string>('');
  const [addMoneyNote, setAddMoneyNote] = useState<string>('');
  const [addMoneyDate, setAddMoneyDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Loan Received (লোন গ্রহণ) State
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [loanSupplierId, setLoanSupplierId] = useState<string>('');
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [loanMethod, setLoanMethod] = useState<'Cash' | 'Bank'>('Cash');
  const [loanBankId, setLoanBankId] = useState<string>('');
  const [loanDate, setLoanDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [loanRefNo, setLoanRefNo] = useState<string>('');
  const [loanNote, setLoanNote] = useState<string>('');
  const [isLoanSubmitting, setIsLoanSubmitting] = useState(false);

  // Balance Transfer (ব্যাংক / ক্যাশ ট্রান্সফার) State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferMode, setTransferMode] = useState<'bank_to_cash' | 'bank_to_bank' | 'cash_to_bank'>('bank_to_cash');
  const [transferSourceBankId, setTransferSourceBankId] = useState<string>('');
  const [transferTargetBankId, setTransferTargetBankId] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferDate, setTransferDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [transferRefNo, setTransferRefNo] = useState<string>('');
  const [transferNote, setTransferNote] = useState<string>('');
  const [isTransferSubmitting, setIsTransferSubmitting] = useState(false);

  // Form States for Direct Add
  const [txnType, setTxnType] = useState<'income' | 'expense' | 'contra'>('income');
  const [paymentType, setPaymentType] = useState<'income' | 'expense'>('income');
  const [expensePartyType, setExpensePartyType] = useState<'supplier' | 'engineer'>('supplier');
  const [autoPaymentId, setAutoPaymentId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<string>('বিক্রি প্রাপ্তি');
  const [description, setDescription] = useState<string>('');
  const [accountType, setAccountType] = useState<'cash' | 'bank'>('cash');
  const [bankId, setBankId] = useState<string>('');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [selectedPartyObj, setSelectedPartyObj] = useState<any>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [selectedSiteName, setSelectedSiteName] = useState<string>('');
  const [customerSites, setCustomerSites] = useState<any[]>([]);

  // Collect/Pay State
  const [selectedInvoice, setSelectedInvoice] = useState<OrderInvoice | null>(null);

  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [cashPaidAmount, setCashPaidAmount] = useState<number>(0);
  const [chequePaidAmount, setChequePaidAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState<string>('');

  // Bank & Cheque Detailed States (Exact replica of Invoice Register Payment)
  const [selectedShopBank, setSelectedShopBank] = useState<string>('');
  const [senderBankName, setSenderBankName] = useState<string>('');
  const [senderAccountNo, setSenderAccountNo] = useState<string>('');
  const [senderTxnRef, setSenderTxnRef] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [chequeNo, setChequeNo] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [bankTxnType, setBankTxnType] = useState<string>('Bank Transfer');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');

  const [newBank, setNewBank] = useState({ name: '', accNo: '', initialBalance: 0 });

  const availableBankOptions = banks.map(b => {
    const name = b.name || 'ব্যাংক অ্যাকাউন্ট';
    const acc = b.accNo || '';
    const val = acc ? `${name} - ${acc}` : name;
    return {
      value: val,
      label: acc ? `🏦 ${name} - A/C: ${toBengaliDigits(acc)} (ব্যালেন্স: ৳ ${Number(b.balance || 0).toLocaleString('bn-BD')})` : `🏦 ${name}`
    };
  });

  const loadAllTransactionsData = useCallback(async () => {
    try {
      setLoading(true);
      const [txList, partyList, bankList, orderList, purchaseList] = await Promise.all([
        api.transactions.list().catch(() => []),
        api.parties.list().catch(() => []),
        api.banks.list().catch(() => []),
        api.transactions.list({ transaction_type: 'sale' }).catch(() => []),
        api.transactions.list({ transaction_type: 'purchase' }).catch(() => [])
      ]);

      const safeTxList = Array.isArray(txList) ? txList : [];
      const safePartyList = Array.isArray(partyList) ? partyList : [];
      const safeBankList = Array.isArray(bankList) ? bankList : [];
      const safeOrderList = Array.isArray(orderList) ? orderList : [];
      const safePurchaseList = Array.isArray(purchaseList) ? purchaseList : [];

      setBanks(safeBankList.map((b: any) => ({
        id: String(b.id),
        name: b.name || b.bank_name || 'ব্যাংক',
        accNo: b.account_number || b.accNo || '',
        balance: Number(b.balance || b.current_balance || 0)
      })));

      // Party Lookups
      const partyMapById = new Map<string, any>();
      const partyMapByName = new Map<string, any>();
      safePartyList.forEach((p: any) => {
        const idStr = String(p.id);
        partyMapById.set(idStr, p);
        if (p.name) partyMapByName.set(String(p.name).trim().toLowerCase(), p);
        if (p.business_name) partyMapByName.set(String(p.business_name).trim().toLowerCase(), p);
      });

      // Invoice Lookups (sales & purchases)
      const invoiceMap = new Map<string, any>();
      [...safeOrderList, ...safePurchaseList].forEach((inv: any) => {
        const invNo = inv.invoice_no || inv.order_id || inv.purchase_id || `INV-${inv.id}`;
        if (invNo) invoiceMap.set(String(invNo).trim().toLowerCase(), inv);
        if (inv.id) invoiceMap.set(String(inv.id), inv);
      });

      // EXCLUDE ALL INVOICES (sale, purchase, sale_return, purchase_return)
      const paymentOnlyList = safeTxList.filter(t => 
        t.transaction_type !== 'sale' && 
        t.transaction_type !== 'purchase' && 
        t.transaction_type !== 'sale_return' && 
        t.transaction_type !== 'purchase_return'
      );

      setTransactions(paymentOnlyList.map(t => {
        let meta: any = {};
        let userNote = t.notes || '';
        if (userNote && typeof userNote === 'string' && userNote.trim().startsWith('{')) {
          try {
            const firstLine = userNote.split('\n')[0];
            meta = JSON.parse(firstLine);
            userNote = meta.userNote !== undefined ? meta.userNote : userNote.substring(firstLine.length).trim();
          } catch {}
        }

        const rawNoteStr = String(t.notes || '');
        const isTransfer = meta.isTransfer === true || 
                           rawNoteStr.includes('[ব্যালেন্স ট্রান্সফার') ||
                           rawNoteStr.includes('ক্যাশ উত্তোলন') ||
                           rawNoteStr.includes('ব্যাংক থেকে ক্যাশ') ||
                           rawNoteStr.includes('ব্যাংক টু ব্যাংক');
        const isAddMoney = !isTransfer && (meta.isAddMoney === true || 
                           meta.category === 'টাকা যোগ' || 
                           rawNoteStr.includes('[টাকা যোগ') ||
                           (t.transaction_type as string) === 'contra');

        const isLoanIn = t.transaction_type === 'loan_in' || meta.isLoanIn === true || rawNoteStr.includes('[লোন গ্রহণ');
        const isHawlat = meta.isHawlat === true || rawNoteStr.includes('[হাওলাত');
        const isHawlatGiven = isHawlat && (meta.hawlatType === 'given' || rawNoteStr.includes('[হাওলাত প্রদান') || t.transaction_type === 'payment_out');
        const isHawlatSettled = isHawlat && (meta.hawlatType === 'settled' || rawNoteStr.includes('[হাওলাত আদায়') || rawNoteStr.includes('[হাওলাত পরিশোধ') || t.transaction_type === 'payment_in');

        let txnType: 'income' | 'expense' | 'contra' = 'income';
        let categoryName = 'পেমেন্ট গ্রহণ';
        
        if (isTransfer) {
          txnType = 'contra';
          categoryName = 'ব্যালেন্স ট্রান্সফার';
        } else if (isAddMoney) {
          txnType = 'contra';
          categoryName = 'টাকা যোগ';
        } else if (isLoanIn) {
          txnType = 'income';
          categoryName = 'লোন গ্রহণ';
        } else if (isHawlatGiven) {
          txnType = 'expense';
          categoryName = 'হাওলাত প্রদান';
        } else if (isHawlatSettled) {
          txnType = 'income';
          categoryName = 'হাওলাত আদায়';
        } else if (t.transaction_type === 'payment_out') {
          txnType = 'expense';
          categoryName = 'পেমেন্ট প্রদান';
        } else if (t.transaction_type === 'payment_in') {
          txnType = 'income';
          categoryName = 'পেমেন্ট গ্রহণ';
        } else {
          txnType = 'contra';
          categoryName = 'টাকা যোগ';
        }

        const invNoStr = t.invoice_no || meta.invoiceNo || '';
        const linkedInvoice = invNoStr ? invoiceMap.get(String(invNoStr).trim().toLowerCase()) : null;

        const rawT = t as any;
        const partyIdKey = String(rawT.party_id || (rawT.party && typeof rawT.party === 'object' ? rawT.party.id : '') || meta.partyId || '');
        const rawPartyName = rawT.party_name || (rawT.party && typeof rawT.party === 'object' ? rawT.party.name : '') || meta.partyName || '';
        const partyNameKey = String(rawPartyName).trim().toLowerCase();

        const matchedParty = partyMapById.get(partyIdKey) || 
                             (partyNameKey ? partyMapByName.get(partyNameKey) : null) || 
                             (typeof rawT.party === 'object' ? rawT.party : null) ||
                             (linkedInvoice ? (linkedInvoice.party || linkedInvoice) : null);

        let addMoneyPartyName = 'দোকান ক্যাশ / মূলধন';
        if (isTransfer) {
          addMoneyPartyName = rawPartyName || 'ব্যাংক ➔ ক্যাশ ট্রান্সফার';
        } else if (isAddMoney) {
          if (meta.addMoneyCategory) {
            addMoneyPartyName = meta.addMoneyCategory;
          } else if (rawNoteStr.includes('[টাকা যোগ - ')) {
            const match = rawNoteStr.match(/\[টাকা যোগ - ([^\]]+)\]/);
            if (match && match[1]) {
              addMoneyPartyName = match[1];
            }
          }
        }

        const resolvedPartyName = (isTransfer || isAddMoney)
          ? addMoneyPartyName
          : (rawPartyName && rawPartyName !== 'কাস্টমার' && rawPartyName !== 'সরবরাহকারী')
            ? rawPartyName
            : (matchedParty?.name || matchedParty?.business_name || matchedParty?.customer_name || matchedParty?.customerName || linkedInvoice?.customerName || linkedInvoice?.customer_name || linkedInvoice?.supplierName || linkedInvoice?.supplier_name || meta.partyName || (txnType === 'expense' ? 'সরবরাহকারী' : 'কাস্টমার'));

        const resolvedPartyPhone = rawT.party_phone || (rawT.party && typeof rawT.party === 'object' ? rawT.party.phone : '') || matchedParty?.phone || matchedParty?.customerPhone || matchedParty?.customer_phone || linkedInvoice?.customerPhone || linkedInvoice?.customer_phone || linkedInvoice?.supplierPhone || meta.partyPhone || meta.phone || '';

        const resolvedPartyAddress = rawT.party_address || (rawT.party && typeof rawT.party === 'object' ? rawT.party.address : '') || matchedParty?.address || matchedParty?.customerAddress || matchedParty?.customer_address || linkedInvoice?.customerAddress || linkedInvoice?.customer_address || linkedInvoice?.supplierAddress || meta.partyAddress || meta.address || '';

        const resolvedBusinessName = rawT.business_name || (rawT.party && typeof rawT.party === 'object' ? rawT.party.business_name : '') || matchedParty?.business_name || matchedParty?.businessName || meta.businessName || '';

        const resolvedPreviousBalance = Number(
          rawT.previous_balance !== undefined ? rawT.previous_balance :
          rawT.previous_due !== undefined ? rawT.previous_due :
          matchedParty?.total_due !== undefined ? matchedParty?.total_due :
          matchedParty?.due !== undefined ? matchedParty?.due :
          matchedParty?.balance !== undefined ? matchedParty?.balance :
          meta.previousBalance !== undefined ? meta.previousBalance :
          meta.previousDue !== undefined ? meta.previousDue :
          0
        );

        return {
          id: String(rawT.id),
          paymentId: rawT.invoice_no || meta.paymentId || `PAY-${rawT.id}`,
          type: txnType,
          amount: Number(rawT.paid_amount || rawT.total_amount || meta.amount || 0),
          category: rawT.category || categoryName,
          description: userNote || rawT.notes || categoryName,
          partyName: resolvedPartyName,
          partyPhone: resolvedPartyPhone,
          partyAddress: resolvedPartyAddress,
          businessName: resolvedBusinessName,
          siteName: rawT.site_name || meta.siteName || '',
          invoiceNo: rawT.invoice_no || meta.invoiceNo || '—',
          referenceNo: rawT.reference_no || meta.referenceNo || userNote || '—',
          paymentMethod: meta.paymentMethodName || (rawT.payment_method === 'split' ? 'Split' : rawT.payment_method === 'cheque' ? 'Cheque' : rawT.payment_method === 'bank' ? 'Bank' : (rawT.account_type === 'bank' ? 'Bank' : 'Cash')),
          discountAmount: Number(rawT.discount || rawT.discount_amount || meta.discountAmount || 0),
          previousBalance: resolvedPreviousBalance,
          bankName: (t as any).bank_name || (t as any).bank_account_name || (t as any).cheque_bank || meta.bankName || meta.selectedShopBank || '',
          accountNo: (t as any).account_number || meta.accountNo || meta.supplierAccountNo || '',
          chequeNo: (t as any).cheque_no || (t as any).cheque_number || meta.chequeNo || '',
          chequeDate: (t as any).cheque_date || (t as any).cheque_due_date || meta.chequeDate || '',
          transactionRef: (t as any).transaction_ref || meta.transactionRef || meta.supplierTxnRef || '',
          operatorName: (t as any).operator_name || (t as any).prepared_by || meta.preparedBy || meta.operatorName || 'ক্যাশিয়ার',
          status: (t.status === 'completed' || !t.status) ? 'Completed' : t.status === 'pending' ? 'Pending' : t.status === 'bounced' ? 'Bounced' : 'Completed',
          createdAt: t.created_at,
          raw: t
        };
      }));

      setBanks(safeBankList.map((b: any) => ({
        id: String(b.id),
        name: b.name,
        accNo: b.account_number || '',
        balance: Number(b.balance || 0)
      })));

      const loadedCusts = safePartyList.filter((p: any) => p.party_type === 'customer' || p.party_type === 'both').map((p: any) => ({
        id: String(p.id),
        name: p.name,
        phone: p.phone,
        businessName: p.business_name,
        address: p.address,
        totalDue: Number(p.total_due || 0),
        advanceBalance: Number(p.advance_balance || 0)
      }));
      const loadedSupps = safePartyList.filter((p: any) => p.party_type === 'supplier' || p.party_type === 'both').map((p: any) => ({
        id: String(p.id),
        name: p.name,
        phone: p.phone,
        businessName: p.business_name,
        address: p.address,
        totalDue: Number(p.total_due || 0),
        advanceBalance: Number(p.advance_balance || 0)
      }));
      const loadedEngineers = safePartyList.filter((p: any) => p.party_type === 'engineer').map((p: any) => {
        // Calculate dynamic engineer commission
        const engineerSales = safeOrderList.filter((s: any) => {
          let meta: any = {};
          if (s.notes && typeof s.notes === 'string' && s.notes.trim().startsWith('{')) {
            try { meta = JSON.parse(s.notes.split('\n')[0]); } catch {}
          }
          const matchId = String(meta.engineerId) === String(p.id) || String(s.engineer_id) === String(p.id);
          const matchName = meta.engineerName && p.name && meta.engineerName.trim().toLowerCase() === p.name.trim().toLowerCase();
          const isDirect = String(s.party) === String(p.id);
          return matchId || matchName || isDirect;
        });

        const totalCommission = engineerSales.reduce((sum: number, s: any) => {
          let meta: any = {};
          if (s.notes && typeof s.notes === 'string' && s.notes.trim().startsWith('{')) {
            try { meta = JSON.parse(s.notes.split('\n')[0]); } catch {}
          }
          const comm = Number(meta.engineerTotalCommission || s.engineerTotalCommission || 0);
          const rodKg = Number(meta.engineerRodKg || s.engineerRodKg || 0);
          const rRate = Number(meta.engineerRodRate || s.engineerRodRate || 0);
          const cemBags = Number(meta.engineerCementBags || s.engineerCementBags || 0);
          const cRate = Number(meta.engineerCementRate || s.engineerCementRate || 0);
          const eff = comm > 0 ? comm : (rodKg * rRate + cemBags * cRate);
          return sum + eff;
        }, 0);

        const engineerPayments = safeTxList.filter((t: any) => 
          String(t.party) === String(p.id) && 
          (t.transaction_type === 'payment_out' || t.transaction_type === 'payment_in' || t.transaction_type === 'payment' || t.transaction_type === 'expense')
        );
        const totalPaid = engineerPayments.reduce((sum: number, t: any) => sum + Number(t.paid_amount || t.total_amount || 0), 0);
        const effectiveDue = Math.max(0, Number(p.opening_balance || 0) + totalCommission - totalPaid);

        return {
          id: String(p.id),
          name: p.name,
          phone: p.phone,
          businessName: p.business_name,
          address: p.address,
          supplyType: p.supply_type || p.customer_type || 'ইঞ্জিনিয়ার',
          totalDue: effectiveDue
        };
      });

      setCustomers(loadedCusts);
      setSuppliers(loadedSupps);
      setEngineers(loadedEngineers);

      setOrders(safeOrderList.map((o: any) => {
        let meta: any = {};
        if (o.notes && typeof o.notes === 'string' && o.notes.trim().startsWith('{')) {
          try { meta = JSON.parse(o.notes.split('\n')[0]); } catch {}
        }
        const comm = Number(meta.engineerTotalCommission || o.engineerTotalCommission || 0);
        const rodKg = Number(meta.engineerRodKg || o.engineerRodKg || 0);
        const rRate = Number(meta.engineerRodRate || o.engineerRodRate || 0);
        const cemBags = Number(meta.engineerCementBags || o.engineerCementBags || 0);
        const cRate = Number(meta.engineerCementRate || o.engineerCementRate || 0);
        const engineerCommission = comm > 0 ? comm : (rodKg * rRate + cemBags * cRate);

        return {
          id: String(o.id),
          invoiceNo: o.invoice_no || `INV-${o.id}`,
          customerId: String(o.party || ''),
          customerName: o.party_name || meta.customerName || '',
          engineerId: String(meta.engineerId || o.engineer_id || ''),
          engineerName: meta.engineerName || o.engineer_name || '',
          engineerCommission: engineerCommission,
          totalAmount: Number(o.total_amount || 0),
          paidAmount: Number(o.paid_amount || 0),
          dueAmount: Number(o.due_amount || 0),
          siteName: o.site_name || meta.siteName || meta.site || '',
          createdAt: o.created_at
        };
      }));

      setPurchases(safePurchaseList.map((p: any) => ({
        id: String(p.id),
        invoiceNo: p.invoice_no || `PUR-${p.id}`,
        supplierId: String(p.party || ''),
        supplierName: p.party_name || '',
        totalAmount: Number(p.total_amount || 0),
        paidAmount: Number(p.paid_amount || 0),
        dueAmount: Number(p.due_amount || 0),
        createdAt: p.created_at
      })));

      return { loadedCusts, loadedSupps, loadedEngineers };
    } catch (err) {
      console.error('Error loading transactions page:', err);
      return { loadedCusts: [], loadedSupps: [], loadedEngineers: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  // Open Create Payment Form Overlay
  const handleOpenAddForm = useCallback((
    type: 'income' | 'expense', 
    targetPartyId?: string,
    customCusts?: Customer[],
    customSupps?: Supplier[],
    customEngineers?: Supplier[],
    defaultPartyType?: 'supplier' | 'engineer'
  ) => {
    setEditingTransactionId(null);
    setPaymentType(type);
    setAutoPaymentId(`PAY-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
    
    const engList = customEngineers || engineers;
    const suppList = customSupps || suppliers;
    const custsList = customCusts || customers;
    
    let activeExpType: 'supplier' | 'engineer' = defaultPartyType || 'supplier';
    const pId = targetPartyId || partyParam || '';
    
    if (type === 'expense') {
      if (defaultPartyType) {
        activeExpType = defaultPartyType;
      } else if (pId && engList.some(e => String(e.id) === String(pId))) {
        activeExpType = 'engineer';
      }
      setExpensePartyType(activeExpType);
    }

    setSelectedPartyId(pId);
    if (pId) {
      const partyList = type === 'income' ? custsList : (activeExpType === 'engineer' ? engList : suppList);
      const found = partyList.find(c => String(c.id) === String(pId));
      if (found) {
        setSelectedParty(found);
        setAccountHolderName(found.name);
      }
    } else {
      setSelectedParty(null);
    }
    setSelectedInvoiceId('');
    setSelectedInvoice(null);
    setSelectedSiteName('');
    setPaidAmount(0);
    setDiscountAmount(0);
    setReferenceNo(`REF-${Math.floor(100 + Math.random() * 900)}`);
    setPaymentNote('');
    if (type === 'income') {
      const defaultBank = availableBankOptions[0]?.value || '';
      setSelectedShopBank(defaultBank);
      setBankName(defaultBank);
    } else {
      setSelectedShopBank('');
      setBankName('');
    }
    setTransactionRef('');
    setIsAddOpen(true);
  }, [partyParam, engineers, suppliers, customers, availableBankOptions]);

  useEffect(() => {
    let isCurrent = true;
    if (selectedPartyId && paymentType === 'income') {
      api.customerSites.list({ customer: selectedPartyId })
        .then(res => {
          if (isCurrent) setCustomerSites(res || []);
        })
        .catch(() => {
          if (isCurrent) setCustomerSites([]);
        });
    }
    return () => {
      isCurrent = false;
    };
  }, [selectedPartyId, paymentType]);

  // Edit Existing Transaction
  const handleEditTransaction = (t: Transaction) => {
    setEditingTransactionId(t.id);
    const type = t.type === 'expense' ? 'expense' : 'income';
    setPaymentType(type);
    setAutoPaymentId(t.paymentId || `PAY-${t.id}`);
    
    let activeExpType: 'supplier' | 'engineer' = 'supplier';
    if (type === 'expense') {
      const isEng = engineers.some(e => e.name === t.partyName || String(e.id) === String(t.raw?.party || t.raw?.party_id));
      if (isEng) {
        activeExpType = 'engineer';
      }
      setExpensePartyType(activeExpType);
    }

    const partyList = type === 'income' ? customers : (activeExpType === 'engineer' ? engineers : suppliers);
    const foundParty = partyList.find(p => p.name === t.partyName || String(p.id) === String(t.raw?.party || t.raw?.party_id));
    if (foundParty) {
      setSelectedPartyId(foundParty.id);
      setSelectedParty(foundParty);
      setAccountHolderName(foundParty.name);
    } else {
      setSelectedPartyId('');
      setSelectedParty(t.partyName ? { id: '', name: t.partyName, phone: t.partyPhone || '', address: t.partyAddress || '' } : null);
    }

    setSelectedInvoiceId('');
    setSelectedInvoice(null);
    setSelectedSiteName(t.siteName || (t.raw as any)?.site_name || '');
    setPaidAmount(t.amount || 0);
    setDiscountAmount(t.discountAmount || 0);
    setReferenceNo(t.referenceNo !== '—' ? (t.referenceNo || '') : '');
    setPaymentNote(t.description !== t.category ? (t.description || '') : '');
    setPaymentMethod(t.paymentMethod || (t.accountType === 'bank' ? 'Bank' : 'Cash'));
    if (type === 'income') {
      setSelectedShopBank(t.bankName || availableBankOptions[0]?.value || '');
      setBankName(t.bankName || availableBankOptions[0]?.value || '');
    } else {
      setSelectedShopBank('');
      setBankName(t.bankName || '');
    }
    setChequeNo(t.chequeNo || '');
    setChequeDate(t.chequeDate || '');
    setTransactionRef(t.transactionRef || '');
    setIsAddOpen(true);
  };

  const handleCreateAddMoneySubmit = async () => {
    if (addMoneyAmount <= 0) {
      toast.error('টাকার পরিমাণ প্রদান করুন');
      return;
    }

    const metaJson = JSON.stringify({
      isAddMoney: true,
      category: 'টাকা যোগ',
      addMoneyCategory: addMoneyCategory,
      partyName: addMoneyCategory,
      userNote: addMoneyNote || ''
    });

    try {
      await api.transactions.create({
        party_name: addMoneyCategory,
        transaction_type: 'payment_in',
        total_amount: addMoneyAmount,
        paid_amount: addMoneyAmount,
        due_amount: 0,
        payment_method: (addMoneyMethod.toLowerCase().includes('bank') ? 'bank' : addMoneyMethod.toLowerCase().includes('cheque') ? 'cheque' : addMoneyMethod.toLowerCase()),
        cheque_bank: addMoneyMethod === 'Bank' ? banks.find(b => b.id === addMoneyBankId)?.name : '',
        notes: metaJson + '\n' + `[টাকা যোগ - ${addMoneyCategory}] ${addMoneyNote}`
      });

      toast.success('টাকা সফলভাবে যোগ করা হয়েছে!');
      setIsAddMoneyOpen(false);
      setAddMoneyAmount(0);
      setAddMoneyNote('');
      loadAllTransactionsData();
    } catch (err: any) {
      toast.error('টাকা যোগ করতে সমস্যা হয়েছে');
    }
  };

  const handleCreateLoanSubmit = async () => {
    if (!loanSupplierId) {
      toast.error('অনুগ্রহ করে সরবরাহকারী নির্বাচন করুন');
      return;
    }
    if (loanAmount <= 0) {
      toast.error('সঠিক লোনের পরিমাণ প্রদান করুন');
      return;
    }
    const supplierObj = suppliers.find(s => String(s.id) === String(loanSupplierId));
    if (!supplierObj) {
      toast.error('নির্বাচিত সরবরাহকারী খুঁজে পাওয়া যায়নি');
      return;
    }

    if (loanMethod === 'Bank' && !loanBankId) {
      toast.error('অনুগ্রহ করে ব্যাংক অ্যাকাউন্ট নির্বাচন করুন');
      return;
    }

    setIsLoanSubmitting(true);
    try {
      const selectedBankObj = loanMethod === 'Bank' ? banks.find(b => String(b.id) === String(loanBankId)) : null;

      if (loanMethod === 'Bank' && selectedBankObj) {
        const newBal = Number(selectedBankObj.balance || 0) + loanAmount;
        await api.banks.update(selectedBankObj.id, { balance: newBal });
      }

      const metaJson = JSON.stringify({
        isLoanIn: true,
        loanType: 'supplier_loan',
        supplierId: supplierObj.id,
        supplierName: supplierObj.name,
        supplierPhone: supplierObj.phone || '',
        paymentMethodName: loanMethod === 'Bank' ? 'Bank' : 'Cash',
        selectedShopBank: selectedBankObj ? selectedBankObj.name : '',
        bankId: selectedBankObj ? selectedBankObj.id : undefined,
        referenceNo: loanRefNo || '',
        previousBalance: (supplierObj as any).total_due || (supplierObj as any).totalDue || (supplierObj as any).due || (supplierObj as any).balance || 0,
        userNote: loanNote || ''
      });

      const payload: any = {
        party: Number(supplierObj.id) || supplierObj.id,
        party_name: supplierObj.name,
        party_phone: supplierObj.phone || '',
        party_address: supplierObj.address || (supplierObj as any).party_address || '',
        invoice_no: loanRefNo ? loanRefNo : undefined,
        transaction_type: 'loan_in',
        total_amount: loanAmount,
        paid_amount: loanAmount,
        due_amount: 0,
        payment_method: loanMethod === 'Bank' ? 'bank' : 'cash',
        bank_account: selectedBankObj ? Number(selectedBankObj.id) : undefined,
        status: 'completed',
        created_at: loanDate ? new Date(loanDate).toISOString() : new Date().toISOString(),
        notes: metaJson + '\n' + `[লোন গ্রহণ - ${supplierObj.name}] ${loanNote || ''}`
      };

      await api.transactions.create(payload);

      toast.success(`সরবরাহকারী ${supplierObj.name} থেকে ৳ ${toBengaliDigits(loanAmount.toLocaleString('bn-BD'))} লোন সফলভাবে গ্রহণ ও লেজারে যুক্ত করা হয়েছে!`);
      setIsLoanModalOpen(false);
      setLoanAmount(0);
      setLoanRefNo('');
      setLoanNote('');
      loadAllTransactionsData();
    } catch (err: any) {
      console.error(err);
      toast.error('লোন গ্রহণ সংরক্ষণ করতে সমস্যা হয়েছে: ' + (err.message || err));
    } finally {
      setIsLoanSubmitting(false);
    }
  };

  const handleExecuteTransfer = async () => {
    if (transferAmount <= 0) {
      toast.error('সঠিক টাকার পরিমাণ প্রদান করুন');
      return;
    }

    const sourceBank = banks.find(b => b.id === transferSourceBankId);
    const targetBank = banks.find(b => b.id === transferTargetBankId);

    if (transferMode === 'bank_to_cash') {
      if (!sourceBank) {
        toast.error('উৎস ব্যাংক নির্বাচন করুন');
        return;
      }
      if (Number(sourceBank.balance || 0) < transferAmount) {
        toast.error(`উৎস ব্যাংকে পর্যাপ্ত ব্যালেন্স নেই! বর্তমান ব্যালেন্স: ৳ ${toBengaliDigits(Number(sourceBank.balance || 0).toLocaleString('bn-BD'))}`);
        return;
      }
    } else if (transferMode === 'bank_to_bank') {
      if (!sourceBank) {
        toast.error('উৎস ব্যাংক নির্বাচন করুন');
        return;
      }
      if (!targetBank) {
        toast.error('গন্তব্য ব্যাংক নির্বাচন করুন');
        return;
      }
      if (sourceBank.id === targetBank.id) {
        toast.error('উৎস ও গন্তব্য ব্যাংক একই হতে পারবে না');
        return;
      }
      if (Number(sourceBank.balance || 0) < transferAmount) {
        toast.error(`উৎস ব্যাংকে পর্যাপ্ত ব্যালেন্স নেই! বর্তমান ব্যালেন্স: ৳ ${toBengaliDigits(Number(sourceBank.balance || 0).toLocaleString('bn-BD'))}`);
        return;
      }
    } else if (transferMode === 'cash_to_bank') {
      if (!targetBank) {
        toast.error('গন্তব্য ব্যাংক নির্বাচন করুন');
        return;
      }
    }

    setIsTransferSubmitting(true);
    try {
      if (transferMode === 'bank_to_cash') {
        // 1. Update bank balance
        const newBankBal = Math.max(0, Number(sourceBank!.balance || 0) - transferAmount);
        await api.banks.update(sourceBank!.id, { balance: newBankBal });

        // 2. Create transaction record
        const metaJson = JSON.stringify({
          isTransfer: true,
          transferType: 'bank_to_cash',
          sourceBankId: sourceBank!.id,
          sourceBankName: sourceBank!.name,
          targetAccount: 'cash',
          refNo: transferRefNo,
          userNote: transferNote || ''
        });

        await api.transactions.create({
          party_name: `${sourceBank!.name} ➔ ক্যাশ বাক্স`,
          transaction_type: 'payment_in',
          total_amount: transferAmount,
          paid_amount: transferAmount,
          due_amount: 0,
          payment_method: 'cash',
          cheque_bank: '',
          cheque_number: '',
          cheque_status: 'cleared',
          notes: metaJson + '\n' + `[ব্যালেন্স ট্রান্সফার: ${sourceBank!.name} থেকে ক্যাশ উত্তোলন] ${transferNote}`
        });

      } else if (transferMode === 'bank_to_bank') {
        // 1. Deduct from source bank
        const newSourceBal = Math.max(0, Number(sourceBank!.balance || 0) - transferAmount);
        await api.banks.update(sourceBank!.id, { balance: newSourceBal });

        // 2. Add to target bank
        const newTargetBal = Number(targetBank!.balance || 0) + transferAmount;
        await api.banks.update(targetBank!.id, { balance: newTargetBal });

        // 3. Create transaction record
        const metaJson = JSON.stringify({
          isTransfer: true,
          transferType: 'bank_to_bank',
          sourceBankId: sourceBank!.id,
          sourceBankName: sourceBank!.name,
          targetBankId: targetBank!.id,
          targetBankName: targetBank!.name,
          refNo: transferRefNo,
          userNote: transferNote || ''
        });

        await api.transactions.create({
          party_name: `${sourceBank!.name} ➔ ${targetBank!.name}`,
          transaction_type: 'payment_out',
          total_amount: transferAmount,
          paid_amount: transferAmount,
          due_amount: 0,
          payment_method: 'bank',
          cheque_bank: '',
          cheque_number: '',
          cheque_status: 'cleared',
          notes: metaJson + '\n' + `[ব্যালেন্স ট্রান্সফার: ${sourceBank!.name} থেকে ${targetBank!.name}] ${transferNote}`
        });

      } else if (transferMode === 'cash_to_bank') {
        // 1. Add to target bank
        const newTargetBal = Number(targetBank!.balance || 0) + transferAmount;
        await api.banks.update(targetBank!.id, { balance: newTargetBal });

        // 2. Create transaction record
        const metaJson = JSON.stringify({
          isTransfer: true,
          transferType: 'cash_to_bank',
          sourceAccount: 'cash',
          targetBankId: targetBank!.id,
          targetBankName: targetBank!.name,
          refNo: transferRefNo,
          userNote: transferNote || ''
        });

        await api.transactions.create({
          party_name: `ক্যাশ বাক্স ➔ ${targetBank!.name}`,
          transaction_type: 'payment_out',
          total_amount: transferAmount,
          paid_amount: transferAmount,
          due_amount: 0,
          payment_method: 'cash',
          cheque_bank: '',
          cheque_number: '',
          cheque_status: 'cleared',
          notes: metaJson + '\n' + `[ব্যালেন্স ট্রান্সফার: ক্যাশ থেকে ${targetBank!.name} এ জমা] ${transferNote}`
        });
      }

      toast.success('ব্যালেন্স ট্রান্সফার সফলভাবে সম্পন্ন হয়েছে!');
      setIsTransferOpen(false);
      setTransferAmount(0);
      setTransferRefNo('');
      setTransferNote('');
      loadAllTransactionsData();
    } catch (err) {
      console.error(err);
      toast.error('ব্যালেন্স ট্রান্সফার করতে সমস্যা হয়েছে');
    } finally {
      setIsTransferSubmitting(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      const { loadedCusts, loadedSupps, loadedEngineers } = await loadAllTransactionsData();
      if (ignore) return;
      if (typeParam === 'income' || typeParam === 'expense' || typeParam === 'contra') {
        setActiveTab(typeParam);
      }
      if (typeParam === 'contra' || actionParam === 'create') {
        if (typeParam === 'contra') {
          setIsAddMoneyOpen(true);
        } else {
          const mode = typeParam === 'expense' ? 'expense' : 'income';
          const isEngParam = partyTypeParam === 'engineer' || (partyParam && loadedEngineers?.some(e => String(e.id) === String(partyParam)));
          handleOpenAddForm(mode, partyParam || undefined, loadedCusts, loadedSupps, loadedEngineers, isEngParam ? 'engineer' : 'supplier');
        }
      }
    }
    init();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeParam, actionParam, partyParam, partyTypeParam, loadAllTransactionsData]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setActiveTab('all');
    setFilterCustomer('all');
    setFilterInvoiceNo('');
    setFilterMethod('all');
    setFilterStatus('all');
    setMinAmount('');
    setMaxAmount('');
    toast.info('ফিল্টার রিসেট করা হয়েছে');
  };

  // Update Party Selection
  const handleSelectParty = (partyId: string) => {
    setSelectedPartyId(partyId);
    if (paymentType === 'income') {
      const cust = customers.find(c => c.id === partyId) || null;
      setSelectedParty(cust);
      if (cust) setAccountHolderName(cust.name);
    } else {
      const list = expensePartyType === 'engineer' ? engineers : suppliers;
      const supp = list.find(s => s.id === partyId) || null;
      setSelectedParty(supp);
      if (supp) setAccountHolderName(supp.name);
    }
    setSelectedInvoiceId('');
    setSelectedInvoice(null);
    setSelectedSiteName('');
  };

  // Update Invoice Selection
  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    const invList = (paymentType === 'income' || expensePartyType === 'engineer') ? orders : purchases;
    const inv = invList.find(i => i.id === invId) || null;
    setSelectedInvoice(inv);
    if (inv) {
      if ((inv as any).siteName) {
        setSelectedSiteName((inv as any).siteName);
      }
      if (expensePartyType === 'engineer') {
        const commAmt = (inv as any).engineerCommission || inv.dueAmount || 0;
        setPaidAmount(commAmt);
      } else {
        setPaidAmount(inv.dueAmount || inv.totalAmount || 0);
      }
    }
  };

  // Submit Payment Form
  const handleSubmitPaymentForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) {
      toast.error(paymentType === 'income' ? 'কাস্টমার নির্বাচন করুন' : (expensePartyType === 'engineer' ? 'ইঞ্জিনিয়ার নির্বাচন করুন' : 'সাপ্লায়ার নির্বাচন করুন'));
      return;
    }
    if (paidAmount <= 0 && (!discountAmount || discountAmount <= 0)) {
      toast.error('পরিশোধিত পরিমাণ অথবা ছাড়/মওকুফ সঠিকভাবে ইনপুট দিন');
      return;
    }

    const partyObj: any = selectedParty;
    const isSplit = paymentMethod === 'Split';
    const effPayMethod = isSplit ? 'split' : (paymentMethod.toLowerCase().includes('bank') ? 'bank' : (paymentMethod.toLowerCase().includes('cheque') || paymentMethod.toLowerCase().includes('check')) ? 'cheque' : 'cash');

    const finalCashAmt = isSplit ? (cashPaidAmount || 0) : (effPayMethod === 'cash' ? paidAmount : 0);
    const finalChequeAmt = isSplit ? (chequePaidAmount || 0) : (effPayMethod === 'cheque' ? paidAmount : 0);

    const metaJson = JSON.stringify({
      partyId: partyObj.id,
      partyName: partyObj.name,
      partyPhone: partyObj.phone || '',
      partyAddress: partyObj.address || '',
      partyType: paymentType === 'income' ? 'customer' : expensePartyType,
      businessName: partyObj.businessName || partyObj.business_name || '',
      invoiceNo: selectedInvoice?.orderId || selectedInvoice?.purchaseId || selectedInvoice?.id || selectedInvoiceId || '',
      referenceNo: referenceNo || '',
      siteName: selectedSiteName.trim() || undefined,
      paymentMethodName: paymentMethod,
      bankName: (paymentType === 'income' ? (selectedShopBank || bankName) : bankName) || '',
      accountNo: senderAccountNo || '',
      chequeNo: chequeNo || '',
      chequeDate: chequeDate || '',
      cashPaidAmount: finalCashAmt,
      chequePaidAmount: finalChequeAmt,
      splitCashAmount: finalCashAmt,
      splitChequeAmount: finalChequeAmt,
      transactionRef: transactionRef || '',
      discountAmount: discountAmount || 0,
      previousBalance: partyObj.totalDue || partyObj.due || partyObj.balance || 0,
      userNote: paymentNote || ''
    });

    const isSelectedBankCheck = paymentMethod === 'BankToBank' || paymentMethod === 'Cheque' || paymentMethod === 'Check';

    if (paymentType === 'expense' && Number(paidAmount) > 0) {
      try {
        const stats = await api.dashboard.getStats();
        if (isSelectedBankCheck) {
          const targetAccName = bankName || selectedShopBank;
          const selectedBankObj = banks.find(b => 
            `${b.name} (${b.accNo})` === targetAccName || 
            `${b.name} - ${b.accNo}` === targetAccName || 
            b.name === targetAccName || 
            b.id === targetAccName
          );
          const availBank = selectedBankObj ? selectedBankObj.balance : (stats.totalBank || 0);
          const bankTitle = selectedBankObj ? `'${selectedBankObj.name}'` : 'ব্যাংক';
          if (Number(paidAmount) > availBank) {
            toast.error(`পর্যাপ্ত ব্যাংক ব্যালেন্স নেই! (নির্বাচিত ${bankTitle} একাউন্ট ব্যালেন্স: ৳ ${availBank.toLocaleString('bn-BD')}, প্রদান করতে চাচ্ছেন: ৳ ${Number(paidAmount).toLocaleString('bn-BD')})। অনুগ্রহ করে আগে এই ব্যাংক একাউন্টে ব্যালেন্স জমা করুন।`);
            return;
          }
        } else {
          // Cash & Bank Transfer: check Cash balance
          const availCash = stats.totalCash || 0;
          if (Number(paidAmount) > availCash) {
            toast.error(`পর্যাপ্ত নগদ ক্যাশ ব্যালেন্স নেই! (বর্তমান ক্যাশ ব্যালেন্স: ৳ ${availCash.toLocaleString('bn-BD')}, প্রদান করতে চাচ্ছেন: ৳ ${Number(paidAmount).toLocaleString('bn-BD')})। অনুগ্রহ করে আগে ক্যাশে ব্যালেন্স জমা করুন।`);
            return;
          }
        }
      } catch (err) {
        console.warn('Balance pre-check failed:', err);
      }
    }

    try {
      const payload: any = {
        party: Number(partyObj.id) || partyObj.id,
        party_name: partyObj.name,
        party_phone: partyObj.phone || '',
        party_address: partyObj.address || '',
        invoice_no: selectedInvoice?.orderId || selectedInvoice?.purchaseId || selectedInvoice?.id || referenceNo || '',
        site_name: selectedSiteName.trim() || undefined,
        transaction_type: paymentType === 'income' ? 'payment_in' : 'payment_out',
        total_amount: paidAmount,
        paid_amount: paidAmount,
        discount: discountAmount || 0,
        due_amount: 0,
        payment_method: effPayMethod,
        status: 'completed',
        notes: metaJson + '\n' + (paymentNote || '')
      };

      const matchingSite = customerSites.find(s => s.name?.trim().toLowerCase() === selectedSiteName.trim().toLowerCase());
      if (matchingSite?.id) {
        payload.customer_site = matchingSite.id;
      }

      if (effPayMethod === 'cheque' || effPayMethod === 'split' || chequeNo || finalChequeAmt > 0) {
        payload.cheque_number = chequeNo || `CHQ-${Date.now().toString().slice(-6)}`;
        payload.cheque_bank = (paymentType === 'income' ? (selectedShopBank || bankName) : bankName) || 'ব্যাংক';
        payload.cheque_due_date = chequeDate || undefined;
        payload.cheque_status = 'pending';
      }

      if (editingTransactionId) {
        await api.transactions.update(editingTransactionId, payload);
        toast.success('পেমেন্ট সফলভাবে আপডেট করা হয়েছে');
      } else {
        await api.transactions.create(payload);
        toast.success('পেমেন্ট সফলভাবে সংরক্ষণ করা হয়েছে');
      }

      setEditingTransactionId(null);
      setIsAddTxnOpen(false);
      setIsAddOpen(false);
      loadAllTransactionsData();
    } catch (err: any) {
      console.error(err);
      toast.error('পেমেন্ট সংরক্ষণ করতে সমস্যা হয়েছে: ' + (err.message || err));
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBank.name || !newBank.accNo) {
      toast.error('অনুগ্রহ করে সব তথ্য দিন');
      return;
    }
    try {
      await api.banks.create({
        name: newBank.name,
        account_number: newBank.accNo,
        balance: newBank.initialBalance
      });
      toast.success('ব্যাংক অ্যাকাউন্ট যোগ করা হয়েছে');
      setNewBank({ name: '', accNo: '', initialBalance: 0 });
      setIsAddBankOpen(false);
      loadAllTransactionsData();
    } catch {
      toast.error('ব্যাংক যোগ করা সম্ভব হয়নি');
    }
  };

  const handleDelete = async (t: Transaction) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই লেনদেনটি মুছে ফেলতে চান?')) return;
    try {
      await api.transactions.delete(t.id);
      toast.success('লেনদেন মুছে ফেলা হয়েছে');
      loadAllTransactionsData();
    } catch (err) {
      console.error(err);
      toast.error('মুছে ফেলা সম্ভব হয়নি');
    }
  };

  const formatDate = (at: any) => {
    if (!at) return '—';
    try {
      const date = new Date(at);
      const formatted = format(date, 'dd MMMM yyyy, hh:mm a', { locale: bn });
      return toBengaliDigits(formatted);
    } catch {
      return '—';
    }
  };

  // 100% DYNAMIC PAYMENT-ONLY FILTERING
  const filteredTransactions = transactions.filter(t => {
    // 1. Unified Search (Party Name, Phone, Payment ID, Invoice No, Reference, Category)
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      t.partyName?.toLowerCase().includes(searchLower) ||
      t.partyPhone?.includes(searchQuery) ||
      t.paymentId?.toLowerCase().includes(searchLower) ||
      t.invoiceNo?.toLowerCase().includes(searchLower) ||
      t.referenceNo?.toLowerCase().includes(searchLower) ||
      t.category?.toLowerCase().includes(searchLower);

    // 2. Active Tab / Type Filter (all, income/payment_in, expense/payment_out, contra/transfer)
    let matchesTab = true;
    if (activeTab === 'income') {
      matchesTab = (t.type === 'income' || t.category === 'পেমেন্ট গ্রহণ' || t.category === 'লোন গ্রহণ') && t.type !== 'contra' && t.category !== 'টাকা যোগ' && t.category !== 'ব্যালেন্স ট্রান্সফার';
    } else if (activeTab === 'expense') {
      matchesTab = (t.type === 'expense' || t.category === 'পেমেন্ট প্রদান') && t.type !== 'contra' && t.category !== 'ব্যালেন্স ট্রান্সফার';
    } else if (activeTab === 'contra') {
      matchesTab = t.category === 'টাকা যোগ' || t.category === 'ব্যালেন্স ট্রান্সফার' || t.type === 'contra';
    }

    // 3. Customer / Party Filter
    let matchesParty = true;
    if (filterCustomer !== 'all' && t.partyName !== filterCustomer) matchesParty = false;

    // 4. Payment Method Filter
    let matchesMethod = true;
    if (filterMethod !== 'all' && (t.paymentMethod || (t.accountType === 'bank' ? 'Bank' : 'Cash')) !== filterMethod) matchesMethod = false;

    // 5. Status Filter
    let matchesStatus = true;
    if (filterStatus !== 'all' && (t.status || 'Completed') !== filterStatus) matchesStatus = false;

    // 6. Date Range Filter
    let matchesDate = true;
    if (startDate || endDate) {
      const txDateStr = t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '';
      if (startDate && txDateStr < startDate) matchesDate = false;
      if (endDate && txDateStr > endDate) matchesDate = false;
    }

    // 7. Amount Range Filter
    let matchesAmount = true;
    const amt = t.amount || 0;
    if (minAmount && amt < parseFloat(minAmount)) matchesAmount = false;
    if (maxAmount && amt > parseFloat(maxAmount)) matchesAmount = false;

    return Boolean(matchesSearch) && matchesTab && matchesParty && matchesMethod && matchesStatus && matchesDate && matchesAmount;
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const totalItems = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // 100% DYNAMIC REAL STATS CALCULATIONS (NO DUMMY DATA!)
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  
  const todayIncomes = incomeTransactions.filter(t => {
    const d = new Date(t.createdAt);
    return isToday(d);
  });
  const todayTotalAmount = todayIncomes.reduce((a, t) => a + (t.amount || 0), 0);
  const todayTotalCount = todayIncomes.length;

  const monthIncomes = incomeTransactions.filter(t => {
    const d = new Date(t.createdAt);
    return isSameMonth(d, new Date());
  });
  const monthTotalAmount = monthIncomes.reduce((a, t) => a + (t.amount || 0), 0);
  const monthTotalCount = monthIncomes.length;

  const grandTotalIncomeAmount = incomeTransactions.reduce((a, t) => a + (t.amount || 0), 0);
  const grandTotalIncomeCount = incomeTransactions.length;

  const totalDuesReceivable = customers.reduce((a, c) => a + (Number((c as any).totalDue) || 0), 0);
  const dueCustomersCount = customers.filter(c => Math.round(Number((c as any).totalDue || 0)) > 0).length;

  // Today's Collection Breakdown Cards (Real Data)
  const todayCashAmount = todayIncomes.filter(t => t.paymentMethod === 'Cash' || t.accountType === 'cash').reduce((a, t) => a + (t.amount || 0), 0);
  const todayBankAmount = todayIncomes.filter(t => t.paymentMethod === 'Bank' || t.accountType === 'bank').reduce((a, t) => a + (t.amount || 0), 0);
  const todayCheckAmount = todayIncomes.filter(t => t.paymentMethod === 'Check').reduce((a, t) => a + (t.amount || 0), 0);

  const pendingCheckAmount = incomeTransactions.filter(t => t.paymentMethod === 'Check' && t.status === 'Pending').reduce((a, t) => a + (t.amount || 0), 0);
  const bouncedCheckAmount = incomeTransactions.filter(t => t.paymentMethod === 'Check' && t.status === 'Bounced').reduce((a, t) => a + (t.amount || 0), 0);

  // Form Calculations
  // Form Calculations
  const currentPaymentAmount = paidAmount || 0;
  const safeDiscount = discountAmount || 0;

  const partyDue = Number(selectedParty?.totalDue || 0);
  const partyExistingAdvance = Number(selectedParty?.advanceBalance || 0);
  let newCalculatedDue = 0;
  let newCalculatedAdvance = 0;

  if (paymentType === 'income' && selectedParty) {
    if (partyExistingAdvance > 0) {
      newCalculatedDue = 0;
      newCalculatedAdvance = partyExistingAdvance + currentPaymentAmount;
    } else if (partyDue > 0) {
      if (currentPaymentAmount + safeDiscount > partyDue) {
        newCalculatedDue = 0;
        newCalculatedAdvance = (currentPaymentAmount + safeDiscount) - partyDue;
      } else {
        newCalculatedDue = partyDue - (currentPaymentAmount + safeDiscount);
        newCalculatedAdvance = 0;
      }
    } else {
      newCalculatedDue = 0;
      newCalculatedAdvance = currentPaymentAmount;
    }
  } else if (paymentType === 'expense' && selectedParty) {
    if (partyExistingAdvance > 0) {
      newCalculatedDue = 0;
      newCalculatedAdvance = partyExistingAdvance + currentPaymentAmount;
    } else if (partyDue > 0) {
      if (currentPaymentAmount + safeDiscount > partyDue) {
        newCalculatedDue = 0;
        newCalculatedAdvance = (currentPaymentAmount + safeDiscount) - partyDue;
      } else {
        newCalculatedDue = partyDue - (currentPaymentAmount + safeDiscount);
        newCalculatedAdvance = 0;
      }
    } else {
      newCalculatedDue = 0;
      newCalculatedAdvance = currentPaymentAmount;
    }
  } else {
    newCalculatedDue = Math.max(0, partyDue - (currentPaymentAmount + safeDiscount));
    newCalculatedAdvance = 0;
  }
  const remainingDue = newCalculatedDue;

  return (
    <Shell>
      {selectedTxnForView ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          <PaymentVoucherDetailsView
            voucher={selectedTxnForView}
            onBack={() => setSelectedTxnForView(null)}
            onPrint={() => printElement('printable-memo-wrapper')}
            onDelete={(tx) => {
              setSelectedTxnForView(null);
              handleDelete(tx);
            }}
          />

          {/* Hidden Print Container for iframe printing */}
          <div className="hidden print:block">
            <PaymentVoucherMemo
              voucher={selectedTxnForView}
              showPrintButton={false}
            />
          </div>
        </div>
      ) : !isAddOpen ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-bengali">
          
          {/* TOP BREADCRUMB & PAGE TITLE HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                পেমেন্ট ইতিহাস
              </h1>
              <p className="text-xs text-slate-400 font-bold mt-1">হোম &gt; পেমেন্ট ইতিহাস</p>
            </div>

            {/* TOP ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-2.5">
              {canCreateInvoice && (
                <>
                  <Button 
                    onClick={() => {
                      setIsTransferOpen(true);
                      if (banks.length > 0) {
                        setTransferSourceBankId(banks[0].id);
                        if (banks.length > 1) {
                          setTransferTargetBankId(banks[1].id);
                        }
                      }
                    }} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-5 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-xs cursor-pointer"
                  >
                    <ArrowLeftRight className="w-4 h-4 mr-1.5" /> ⇄ ব্যালেন্স ট্রান্সফার
                  </Button>

                  <Button 
                    onClick={() => setIsAddMoneyOpen(true)} 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-5 rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all text-xs cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 mr-1.5" /> + টাকা যোগ করুন
                  </Button>

                  <Button 
                    onClick={() => {
                      setIsLoanModalOpen(true);
                      if (suppliers.length > 0 && !loanSupplierId) {
                        setLoanSupplierId(String(suppliers[0].id));
                      }
                    }} 
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-11 px-5 rounded-xl shadow-lg shadow-purple-600/20 active:scale-95 transition-all text-xs cursor-pointer"
                  >
                    <HandCoins className="w-4 h-4 mr-1.5" /> 🤝 লোন গ্রহণ
                  </Button>

                  <Button 
                    onClick={() => handleOpenAddForm('income')} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-xs cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4 mr-1.5" /> + পেমেন্ট গ্রহণ
                  </Button>

                  <Button 
                    onClick={() => handleOpenAddForm('expense')} 
                    className="bg-[#8c6b1c] hover:bg-[#735615] text-white font-bold h-11 px-5 rounded-xl shadow-lg shadow-amber-900/20 active:scale-95 transition-all text-xs cursor-pointer"
                  >
                    <ArrowDownRight className="w-4 h-4 mr-1.5" /> - পেমেন্ট প্রদান
                  </Button>
                </>
              )}

              <Button variant="outline" className="h-11 px-4 rounded-xl border-slate-200 text-slate-700 bg-white font-bold text-xs">
                <FileDown className="w-4 h-4 mr-1.5 text-rose-500" /> পিডিএফ ডাউনলোড
              </Button>

              <Button variant="outline" className="h-11 px-4 rounded-xl border-slate-200 text-slate-700 bg-white font-bold text-xs">
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" /> এক্সেল এক্সপোর্ট
              </Button>

              <Button variant="outline" onClick={() => window.print()} className="h-11 px-4 rounded-xl border-slate-200 text-slate-700 bg-white font-bold text-xs">
                <Printer className="w-4 h-4 mr-1.5 text-blue-600" /> প্রিন্ট
              </Button>
            </div>
          </div>

          {/* TOP 4 REAL STAT CARDS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* CARD 1: আজকের আদায় */}
            <Card className="bg-white border-2 border-slate-100/80 rounded-2xl p-5 shadow-xs hover:border-emerald-200 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">আজকের আদায়</p>
                  <h3 className="text-2xl font-black text-emerald-600 mt-0.5">৳ {toBengaliDigits(todayTotalAmount.toLocaleString('bn-BD'))}</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">মোট {toBengaliDigits(todayTotalCount)} টি পেমেন্ট</p>
                </div>
              </div>
            </Card>

            {/* CARD 2: এই মাসের আদায় */}
            <Card className="bg-white border-2 border-slate-100/80 rounded-2xl p-5 shadow-xs hover:border-blue-200 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">এই মাসের আদায়</p>
                  <h3 className="text-2xl font-black text-blue-600 mt-0.5">৳ {toBengaliDigits(monthTotalAmount.toLocaleString('bn-BD'))}</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">মোট {toBengaliDigits(monthTotalCount)} টি পেমেন্ট</p>
                </div>
              </div>
            </Card>

            {/* CARD 3: মোট আদায় */}
            <Card className="bg-white border-2 border-slate-100/80 rounded-2xl p-5 shadow-xs hover:border-purple-200 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">মোট আদায়</p>
                  <h3 className="text-2xl font-black text-purple-700 mt-0.5">৳ {toBengaliDigits(grandTotalIncomeAmount.toLocaleString('bn-BD'))}</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">মোট {toBengaliDigits(grandTotalIncomeCount)} টি পেমেন্ট</p>
                </div>
              </div>
            </Card>

            {/* CARD 4: বকেয়া আদায়যোগ্য */}
            <Card className="bg-white border-2 border-slate-100/80 rounded-2xl p-5 shadow-xs hover:border-amber-200 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">বকেয়া আদায়যোগ্য</p>
                  <h3 className="text-2xl font-black text-rose-600 mt-0.5">৳ {toBengaliDigits(totalDuesReceivable.toLocaleString('bn-BD'))}</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">মোট {toBengaliDigits(dueCustomersCount)} জন কাস্টমার</p>
                </div>
              </div>
            </Card>

          </div>

          {/* MAIN CONTENT GRID (LEFT 75% FILTERS & TABLE + RIGHT 25% SIDEBAR) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT 9 COLUMNS: FILTER CARD & PAYMENT HISTORY TABLE */}
            <div className="lg:col-span-9 space-y-5">
              
              {/* COMPACT & EFFICIENT FILTER CARD */}
              <Card className="border border-slate-200/80 shadow-2xs rounded-md bg-white p-4 font-bengali space-y-3">
                {/* Top Row: Search + Date Range + Type Quick Pills + More Filter Toggle */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                  
                  {/* Unified Search Box */}
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="কাস্টমার/সাপ্লায়ার, ফোন বা লেনদেন আইডি দিয়ে খুঁজুন..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 rounded-md bg-slate-50/80 border-slate-200 text-xs font-bold text-slate-900 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Bengali Date Range Filter */}
                  <BengaliDateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(start, end) => {
                      setStartDate(start);
                      setEndDate(end);
                    }}
                    placeholder="তারিখ ফিল্টার"
                    compact={false}
                  />

                  {/* Transaction Type Filter Dropdown */}
                  <div className="w-full sm:w-44 shrink-0">
                    <Select value={activeTab} onValueChange={(val: string | null) => setActiveTab((val as any) || 'all')}>
                      <SelectTrigger className="rounded-md h-10 bg-slate-50/80 border-slate-200 text-xs font-bold text-slate-800">
                        <SelectValue placeholder="সব লেনদেন" />
                      </SelectTrigger>
                      <SelectContent className="font-bengali">
                        <SelectItem value="all" className="text-xs font-bold">সব লেনদেন</SelectItem>
                        <SelectItem value="income" className="text-xs font-bold text-emerald-600">পেমেন্ট গ্রহণ (জমা)</SelectItem>
                        <SelectItem value="expense" className="text-xs font-bold text-rose-600">পেমেন্ট প্রদান (খরচ)</SelectItem>
                        <SelectItem value="contra" className="text-xs font-bold text-indigo-600">ট্রান্সফার ও টাকা যোগ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* More Filters Toggle */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                      className="h-10 px-3.5 rounded-md border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5"
                    >
                      <Filter className="w-3.5 h-3.5 text-blue-600" />
                      <span>আরও ফিল্টার</span>
                      {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>

                    {(searchQuery || startDate || endDate || activeTab !== 'all' || filterCustomer !== 'all' || filterMethod !== 'all' || filterStatus !== 'all' || minAmount || maxAmount) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetFilters}
                        className="h-10 px-2.5 rounded-md text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1"
                        title="ফিল্টার রিসেট করুন"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Secondary Collapsible Drawer */}
                {isFilterExpanded && (
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in duration-200">
                    {/* Customer Filter */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600">কাস্টমার / পার্টি</Label>
                      <Select value={filterCustomer} onValueChange={(val: string | null) => setFilterCustomer(val || 'all')}>
                        <SelectTrigger className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold">
                          <SelectValue placeholder="সব পার্টি" />
                        </SelectTrigger>
                        <SelectContent className="font-bengali text-xs font-bold max-h-60 z-[99999]">
                          <SelectItem value="all">সব কাস্টমার/পার্টি</SelectItem>
                          {customers.map(c => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Payment Method Filter */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600">পেমেন্ট পদ্ধতি</Label>
                      <Select value={filterMethod} onValueChange={(val: string | null) => setFilterMethod(val || 'all')}>
                        <SelectTrigger className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="font-bengali text-xs font-bold z-[99999]">
                          <SelectItem value="all">সব মাধ্যম</SelectItem>
                          <SelectItem value="Cash">নগদ (Cash)</SelectItem>
                          <SelectItem value="Bank">ব্যাংক (Bank)</SelectItem>
                          <SelectItem value="Check">চেক (Cheque)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600">স্ট্যাটাস</Label>
                      <Select value={filterStatus} onValueChange={(val: string | null) => setFilterStatus(val || 'all')}>
                        <SelectTrigger className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="font-bengali text-xs font-bold z-[99999]">
                          <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                          <SelectItem value="Completed">সম্পন্ন (Completed)</SelectItem>
                          <SelectItem value="Pending">অপেক্ষমাণ (Pending)</SelectItem>
                          <SelectItem value="Bounced">প্রত্যাখ্যাত (Bounced)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount Range */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600">টাকার পরিমাণ (৳)</Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          placeholder="সর্বনিম্ন (৳)"
                          value={minAmount}
                          onChange={e => setMinAmount(e.target.value)}
                          className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                        />
                        <span className="text-slate-300 text-xs">-</span>
                        <Input
                          placeholder="সর্বোচ্চ (৳)"
                          value={maxAmount}
                          onChange={e => setMaxAmount(e.target.value)}
                          className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* PAYMENT LIST TABLE CARD */}
              <Card className="bg-white border border-slate-200/80 rounded-md shadow-2xs overflow-hidden font-bengali">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-black text-slate-900 text-base">পেমেন্ট ও দেনা-পাওনা লেনদেন তালিকা</h3>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                    মোট {toBengaliDigits(filteredTransactions.length)} টি লেনদেন
                  </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-slate-700 text-[11px] tracking-wider font-black py-3.5 px-4 uppercase">লেনদেন আইডি</TableHead>
                        <TableHead className="font-slate-700 text-[11px] tracking-wider font-black uppercase">তারিখ</TableHead>
                        <TableHead className="font-slate-700 text-[11px] tracking-wider font-black uppercase">প্রকার</TableHead>
                        <TableHead className="font-slate-700 text-[11px] tracking-wider font-black uppercase">কাস্টমার / সরবরাহকারী</TableHead>
                        <TableHead className="font-slate-700 text-[11px] tracking-wider font-black uppercase">পেমেন্ট মাধ্যম</TableHead>
                        <TableHead className="font-slate-700 text-[11px] tracking-wider font-black text-right uppercase">পরিমাণ (৳)</TableHead>
                        <TableHead className="font-slate-700 text-[11px] tracking-wider font-black uppercase">নোট / রেফারেন্স</TableHead>
                        <TableHead className="w-16 text-center font-slate-700 text-[11px] tracking-wider font-black py-3.5 px-4 uppercase">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-16 text-slate-400 font-bold text-sm">লোড হচ্ছে...</TableCell></TableRow>
                      ) : filteredTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-16">
                            <div className="flex flex-col items-center justify-center text-slate-400">
                              <Receipt className="w-10 h-10 mb-2 opacity-20" />
                              <p className="font-bold text-sm">কোনো পেমেন্ট বা লেনদেনের রেকর্ড পাওয়া যায়নি</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : paginatedTransactions.map((t, idx) => {
                        const method = t.paymentMethod || (t.accountType === 'bank' ? 'Bank' : 'Cash');
                        const isTransfer = t.category === 'ব্যালেন্স ট্রান্সফার' || t.partyName?.includes('➔') || String(t.notes || '').includes('[ব্যালেন্স ট্রান্সফার');
                        const isAddMoney = !isTransfer && (t.type === 'contra' || t.category === 'টাকা যোগ');
                        const isLoanIn = t.category === 'লোন গ্রহণ' || t.raw?.transaction_type === 'loan_in';
                        const isContra = isTransfer || isAddMoney || t.type === 'contra';
                        const isIncome = (t.type === 'income' || t.category === 'পেমেন্ট গ্রহণ' || isLoanIn) && !isContra;
                        const isExpense = (t.type === 'expense' || t.category === 'পেমেন্ট প্রদান') && !isContra;

                        return (
                          <TableRow 
                            key={t.id} 
                            onClick={() => setSelectedTxnForView(t)}
                            className="border-b border-slate-100 hover:bg-slate-50/90 transition-colors text-xs cursor-pointer group"
                          >
                            <TableCell className="py-3.5 px-4 font-mono font-black text-slate-800">
                              {toBengaliDigits(t.paymentId || `PAY-2026-${(100145 - idx)}`)}
                            </TableCell>
                            <TableCell className="font-semibold text-slate-600">
                              {formatDate(t.createdAt)}
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                "inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-md text-[11px] border",
                                isLoanIn && "bg-purple-50 text-purple-700 border-purple-200",
                                !isLoanIn && isIncome && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                isExpense && "bg-orange-50 text-orange-700 border-orange-200",
                                isTransfer && "bg-indigo-50 text-indigo-700 border-indigo-200",
                                isAddMoney && "bg-blue-50 text-blue-700 border-blue-200"
                              )}>
                                {isLoanIn && <HandCoins className="w-3 h-3 text-purple-600" />}
                                {!isLoanIn && isIncome && <ArrowUpRight className="w-3 h-3 text-emerald-600" />}
                                {isExpense && <ArrowDownRight className="w-3 h-3 text-orange-600" />}
                                {isTransfer && <ArrowLeftRight className="w-3 h-3 text-indigo-600" />}
                                {isAddMoney && <PlusCircle className="w-3 h-3 text-blue-600" />}
                                <span>{isTransfer ? 'ব্যালেন্স ট্রান্সফার' : isAddMoney ? 'টাকা যোগ' : isLoanIn ? 'লোন গ্রহণ' : (t.category || (isIncome ? 'পেমেন্ট গ্রহণ' : 'পেমেন্ট প্রদান'))}</span>
                              </span>
                            </TableCell>
                            <TableCell className="font-black text-slate-900">
                              <div>{t.partyName || 'সাধারণ পার্টি'}</div>
                              {t.siteName && (
                                <div className="text-[10px] text-blue-600 font-bold flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-2.5 h-2.5" />
                                  <span>{t.siteName}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={cn("inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md border text-[11px]",
                                method === 'Cash' && "bg-slate-50 text-slate-700 border-slate-200",
                                method === 'Bank' && "bg-blue-50 text-blue-700 border-blue-200",
                                method === 'Check' && "bg-amber-50 text-amber-700 border-amber-200"
                              )}>
                                {method === 'Cash' && '💵 নগদ'}
                                {method === 'Bank' && '🏦 ব্যাংক'}
                                {method === 'Check' && '📄 চেক'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-900 text-sm">
                              <span className={isLoanIn ? "text-purple-700" : isIncome ? "text-emerald-700" : isExpense ? "text-orange-700" : "text-blue-700"}>
                                {isLoanIn ? '+' : isIncome ? '+' : isExpense ? '-' : '+'} ৳ {toBengaliDigits((t.amount || 0).toLocaleString('bn-BD'))}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-slate-500 max-w-[150px] truncate" title={t.referenceNo || t.description}>
                              {toBengaliDigits(t.referenceNo || t.description || '—')}
                            </TableCell>
                            
                            {/* 3-DOT ACTION MENU BUTTON */}
                            <TableCell className="text-center py-3 px-4" onClick={e => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleToggleMenu(e, t.id)}
                                className={cn(
                                  "h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors",
                                  openMenuId === t.id && "bg-slate-100 text-slate-900"
                                )}
                                title="মেনু"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* TABLE FOOTER WITH DYNAMIC PAGINATION */}
                <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/40">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-semibold">
                      মোট <strong className="text-slate-800">{toBengaliDigits(totalItems)}</strong> টি রেকর্ডের মধ্যে <strong className="text-slate-800">{toBengaliDigits(totalItems > 0 ? startIndex + 1 : 0)}</strong> - <strong className="text-slate-800">{toBengaliDigits(endIndex)}</strong> দেখানো হচ্ছে (পৃষ্ঠা {toBengaliDigits(validCurrentPage)}/{toBengaliDigits(totalPages)})
                    </span>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold border-l pl-3 border-slate-200">
                      <span>প্রতি পেজে:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="h-7 px-2 rounded-md border border-slate-200 bg-white font-bold text-slate-700 cursor-pointer text-xs"
                      >
                        <option value={10}>১০ টি</option>
                        <option value={15}>১৫ টি</option>
                        <option value={25}>২৫ টি</option>
                        <option value={50}>৫০ টি</option>
                        <option value={100}>১০০ টি</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 font-bold">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={validCurrentPage <= 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="h-8 px-2.5 rounded-md text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 mr-0.5" /> আগের পেজ
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                        .map((page, idx, arr) => {
                          const prev = arr[idx - 1];
                          const showEllipsis = prev && page - prev > 1;
                          return (
                            <div key={page} className="flex items-center gap-1">
                              {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                              <button
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                className={cn(
                                  "w-8 h-8 rounded-md text-xs font-bold transition-all border cursor-pointer",
                                  validCurrentPage === page
                                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                )}
                              >
                                {toBengaliDigits(page)}
                              </button>
                            </div>
                          );
                        })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={validCurrentPage >= totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="h-8 px-2.5 rounded-md text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      পরের পেজ <ChevronRight className="w-4 h-4 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* FLOATING FIXED 3-DOT ACTION MENU (NEVER CLIPPED BY FRAME/CARD/OVERFLOW) */}
              {openMenuId && menuPos && (() => {
                const activeMenuTxn = transactions.find(t => t.id === openMenuId);
                if (!activeMenuTxn) return null;
                return (
                  <div 
                    style={{
                      position: 'fixed',
                      top: `${menuPos.top}px`,
                      left: `${Math.max(10, menuPos.left)}px`,
                      transform: menuPos.openUp ? 'translateY(-100%)' : 'none',
                      zIndex: 99999
                    }}
                    onClick={e => e.stopPropagation()}
                    className="w-44 bg-white rounded-lg shadow-2xl border border-slate-200 py-1.5 animate-in fade-in-50 zoom-in-95 duration-100 font-bengali text-xs"
                  >
                    {/* 1. View / বিস্তারিত দেখুন */}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        setMenuPos(null);
                        setSelectedTxnForView(activeMenuTxn);
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-bold transition-colors text-left"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span>বিস্তারিত দেখুন</span>
                    </button>

                    {/* 2. Edit / সম্পাদনা */}
                    {canEditInvoice && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          setMenuPos(null);
                          handleEditTransaction(activeMenuTxn);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-bold transition-colors text-left"
                      >
                        <Edit2 className="w-4 h-4 text-emerald-600" />
                        <span>সম্পাদনা করুন</span>
                      </button>
                    )}

                    {/* 3. Print / প্রিন্ট */}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        setMenuPos(null);
                        setSelectedTxnForView(activeMenuTxn);
                        setTimeout(() => {
                          printElement('printable-memo-wrapper');
                        }, 300);
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-purple-50 hover:text-purple-700 font-bold transition-colors text-left"
                    >
                      <Printer className="w-4 h-4 text-purple-600" />
                      <span>প্রিন্ট ভাউচার</span>
                    </button>

                    {canDeleteInvoice && (
                      <>
                        <div className="my-1 border-t border-slate-100" />

                        {/* 4. Delete / মুছে ফেলুন */}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setMenuPos(null);
                            handleDelete(activeMenuTxn);
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-bold transition-colors text-left"
                        >
                          <Trash2 className="w-4 h-4 text-rose-600" />
                          <span>মুছে ফেলুন</span>
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}

            </div>

            {/* RIGHT 3 COLUMNS: TODAY'S COLLECTION BREAKDOWN & REPORT SHORTCUTS */}
            <div className="lg:col-span-3 space-y-5">
              
              {/* CARD 1: আজকের সংগ্রহ */}
              <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs p-5 space-y-4">
                <Label className="text-xs uppercase tracking-wider font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  আজকের সংগ্রহ ({toBengaliDigits(format(new Date(), 'dd/MM/yyyy'))})
                </Label>

                <div className="space-y-3 text-xs">
                  <h3 className="text-2xl font-black text-slate-900">
                    ৳ {toBengaliDigits(todayTotalAmount.toLocaleString('bn-BD'))}
                  </h3>

                  <div className="space-y-2 pt-2 border-t border-slate-100 font-semibold">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">ক্যাশ</span>
                      <span className="font-bold text-emerald-600">৳ {toBengaliDigits(todayCashAmount.toLocaleString('bn-BD'))}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">ব্যাংক</span>
                      <span className="font-bold text-blue-600">৳ {toBengaliDigits(todayBankAmount.toLocaleString('bn-BD'))}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">চেক</span>
                      <span className="font-bold text-amber-600">৳ {toBengaliDigits(todayCheckAmount.toLocaleString('bn-BD'))}</span>
                    </div>

                    <div className="border-b border-dashed border-slate-200 my-1"></div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">পেন্ডিং চেক</span>
                      <span className="font-bold text-amber-600">৳ {toBengaliDigits(pendingCheckAmount.toLocaleString('bn-BD'))}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">বাউন্স চেক</span>
                      <span className="font-bold text-rose-600">৳ {toBengaliDigits(bouncedCheckAmount.toLocaleString('bn-BD'))}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* CARD 2: রিপোর্ট শর্টকাট */}
              <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs p-5 space-y-3">
                <Label className="text-xs uppercase tracking-wider font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-600" />
                  রিপোর্ট শর্টকাট
                </Label>

                <div className="space-y-2 text-xs font-bold">
                  {[
                    'পেমেন্ট সারাংশ রিপোর্ট',
                    'কাস্টমার ভিত্তিক আদায় রিপোর্ট',
                    'পেমেন্ট পদ্ধতি রিপোর্ট',
                    'পেন্ডিং চেক রিপোর্ট',
                    'বাউন্স চেক রিপোর্ট'
                  ].map((report, idx) => (
                    <a 
                      key={idx}
                      href="/reports/sales" 
                      className="p-2.5 bg-slate-50 hover:bg-orange-50/60 rounded-xl flex items-center gap-2 text-slate-700 hover:text-orange-600 transition-colors border border-slate-100"
                    >
                      <FileText className="w-3.5 h-3.5 text-orange-500" />
                      <span>{report}</span>
                    </a>
                  ))}
                </div>
              </Card>

              {/* CARD 3: দ্রষ্টব্য (NOTICE CARD) */}
              <Card className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-2 text-amber-900 text-xs">
                <p className="font-bold flex items-center gap-1.5 text-amber-950">
                  <Lightbulb className="w-4 h-4 text-amber-600" /> দ্রষ্টব্য
                </p>
                <p className="text-[11px] font-medium text-amber-800">
                  এখানে সর্বশেষ পেমেন্টগুলো দেখানো হচ্ছে। আরো বিস্তারিত দেখতে রিপোর্ট ব্যবহার করুন।
                </p>
              </Card>

            </div>

          </div>
        </div>
        ) : (
          /* IN-PAGE FRAMED PAYMENT FORM VIEW */
          <div className="w-full bg-slate-100 border-2 border-slate-300 shadow-xl rounded-md overflow-hidden flex flex-col min-h-[calc(100vh-100px)] font-bengali animate-in fade-in duration-300">
            
            {/* FRAMED TOP HEADER BAR */}
            <div className="bg-white border-b border-slate-300 px-6 py-3.5 flex items-center justify-between shadow-2xs flex-shrink-0">
              <div className="flex items-center gap-4">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-md h-9 px-3 border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                  <span>তালিকায় ফিরে যান</span>
                </Button>

                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {editingTransactionId
                      ? (paymentType === 'income' ? 'পেমেন্ট গ্রহণ সম্পাদনা' : 'পেমেন্ট প্রদান সম্পাদনা')
                      : (paymentType === 'income' ? 'নতুন পেমেন্ট গ্রহণ এন্ট্রি' : 'নতুন পেমেন্ট প্রদান এন্ট্রি')}
                  </h1>
                  
                  {/* PAYMENT ID BADGE */}
                  <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    আইডি: {toBengaliDigits(autoPaymentId)}
                  </span>

                  {/* STATUS BADGE */}
                  <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-xs font-bold">
                    {editingTransactionId ? 'সম্পাদনা মোড' : 'নতুন খসড়া'}
                  </span>
                </div>
              </div>

              {/* TOP RIGHT CLOSE & RECEIPT PREVIEW */}
              <div className="flex items-center gap-2">
                <Button 
                  type="button"
                  onClick={() => setIsPrintMemoOpen(true)}
                  variant="outline"
                  className="rounded-md h-9 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 font-bold text-xs"
                >
                  <Printer className="w-4 h-4 mr-1.5 text-blue-600" /> রসিদ প্রি-ভিউ
                </Button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors ml-2"
                  title="বন্ধ করুন"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* SCROLLABLE FORM BODY & STICKY FOOTER */}
            <form onSubmit={handleSubmitPaymentForm} className="flex-1 flex flex-col justify-between overflow-y-auto">
              <div className="p-4 md:p-6 w-full space-y-6 flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT 8 COLUMNS: CUSTOMER / PAYMENT / BANK / ATTACHMENT CARDS */}
                  <div className="lg:col-span-8 space-y-5">
                    
                    {/* CARD 1: CUSTOMER / SUPPLIER / ENGINEER INFO */}
                    <Card className="bg-white border border-slate-200/80 rounded-md shadow-2xs">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-2">
                            {paymentType === 'income' ? (
                              <>
                                <User className="w-4 h-4 text-blue-600" />
                                <span>কাস্টমার তথ্য</span>
                              </>
                            ) : expensePartyType === 'engineer' ? (
                              <>
                                <HardHat className="w-4 h-4 text-amber-600" />
                                <span>ইঞ্জিনিয়ার তথ্য</span>
                              </>
                            ) : (
                              <>
                                <Building2 className="w-4 h-4 text-blue-600" />
                                <span>সাপ্লায়ার তথ্য</span>
                              </>
                            )}
                          </Label>

                          {/* Party Type Toggle for Expense (পেমেন্ট প্রদান) */}
                          {paymentType === 'expense' && (
                            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200/80">
                              <span className="text-[11px] font-bold text-slate-500 px-1.5 hidden sm:inline">প্রাপক:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (expensePartyType !== 'supplier') {
                                    setExpensePartyType('supplier');
                                    setSelectedPartyId('');
                                    setSelectedParty(null);
                                    setSelectedInvoiceId('');
                                    setSelectedInvoice(null);
                                  }
                                }}
                                className={cn(
                                  "px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                  expensePartyType === 'supplier'
                                    ? "bg-white text-blue-700 shadow-xs border border-slate-200 font-black"
                                    : "text-slate-600 hover:text-slate-900"
                                )}
                              >
                                <Building2 className="w-3.5 h-3.5" />
                                <span>🏢 সরবরাহকারী (Supplier)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (expensePartyType !== 'engineer') {
                                    setExpensePartyType('engineer');
                                    setSelectedPartyId('');
                                    setSelectedParty(null);
                                    setSelectedInvoiceId('');
                                    setSelectedInvoice(null);
                                  }
                                }}
                                className={cn(
                                  "px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                  expensePartyType === 'engineer'
                                    ? "bg-amber-600 text-white shadow-xs font-black"
                                    : "text-slate-600 hover:text-slate-900"
                                )}
                              >
                                <HardHat className="w-3.5 h-3.5" />
                                <span>👷 ইঞ্জিনিয়ার (Engineer)</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                          
                          {/* Searchable Customer / Supplier / Engineer Selection */}
                          <div className="sm:col-span-5 space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">
                              {paymentType === 'income' 
                                ? 'কাস্টমার নির্বাচন করুন (সার্চ করুন) *' 
                                : expensePartyType === 'engineer'
                                  ? 'ইঞ্জিনিয়ার নির্বাচন করুন (সার্চ করুন) *'
                                  : 'সাপ্লায়ার নির্বাচন করুন (সার্চ করুন) *'}
                            </Label>
                            {paymentType === 'income' ? (
                              <CustomerSearchSelect
                                customers={customers}
                                selectedCustomer={selectedParty}
                                onSelectCustomer={(cust) => {
                                  handleSelectParty(cust ? cust.id : '');
                                }}
                                placeholder="কাস্টমারের নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
                              />
                            ) : expensePartyType === 'engineer' ? (
                              <SupplierSearchSelect
                                suppliers={engineers}
                                selectedSupplier={selectedParty}
                                onSelectSupplier={(eng) => {
                                  handleSelectParty(eng ? eng.id : '');
                                }}
                                placeholder="ইঞ্জিনিয়ারের নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                              />
                            ) : (
                              <SupplierSearchSelect
                                suppliers={suppliers}
                                selectedSupplier={selectedParty}
                                onSelectSupplier={(supp) => {
                                  handleSelectParty(supp ? supp.id : '');
                                }}
                                placeholder="সাপ্লায়ারের নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
                              />
                            )}
                          </div>

                          {/* Party Name */}
                          <div className="sm:col-span-3 space-y-1">
                            <Label className="text-xs font-bold text-slate-500">
                              {paymentType === 'income' 
                                ? 'কাস্টমার নাম' 
                                : expensePartyType === 'engineer'
                                  ? 'ইঞ্জিনিয়ার নাম'
                                  : 'সাপ্লায়ার নাম'}
                            </Label>
                            <p className="text-sm font-black text-slate-900 pt-1.5">
                              {selectedParty?.name || '—'}
                            </p>
                          </div>

                          {/* Mobile Number */}
                          <div className="sm:col-span-2 space-y-1">
                            <Label className="text-xs font-bold text-slate-500">মোবাইল নম্বর</Label>
                            <p className="text-sm font-bold text-slate-700 font-mono pt-1.5">
                              {toBengaliDigits(selectedParty?.phone || '—')}
                            </p>
                          </div>

                          {/* Due / Advance Balance */}
                          <div className="sm:col-span-2 space-y-1 text-right">
                            <Label className="text-xs font-bold text-slate-500">
                              {expensePartyType === 'engineer' 
                                ? 'মোট পাওনা কমিশন' 
                                : (selectedParty?.advanceBalance && selectedParty.advanceBalance > 0)
                                  ? 'অগ্রিম জমা'
                                  : 'বকেয়া পরিমাণ'}
                            </Label>
                            <p className={cn(
                              "text-base font-black pt-1",
                              expensePartyType === 'engineer' 
                                ? "text-emerald-700 font-black" 
                                : (selectedParty?.advanceBalance && selectedParty.advanceBalance > 0)
                                  ? "text-emerald-600 font-black"
                                  : (selectedParty?.totalDue || 0) > 0 
                                    ? "text-rose-600 font-black" 
                                    : "text-slate-600 font-black"
                            )}>
                              ৳ {toBengaliDigits(((selectedParty?.advanceBalance && selectedParty.advanceBalance > 0) ? selectedParty.advanceBalance : (selectedParty?.totalDue || 0)).toLocaleString('bn-BD'))}
                            </p>
                          </div>

                          {/* Site Select / Entry for Customer Payments */}
                          {paymentType === 'income' && (
                            <div className="sm:col-span-12 space-y-1.5 pt-2 border-t border-slate-100">
                              <Label className="text-xs font-bold text-slate-600 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                  সাইট (ঐচ্ছিক)
                                </span>
                                {selectedSiteName && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSiteName('')}
                                    className="text-[10px] text-rose-500 hover:underline font-normal cursor-pointer"
                                  >
                                    মুছুন
                                  </button>
                                )}
                              </Label>
                              {customerSites.length > 0 ? (
                                <Select 
                                  value={selectedSiteName || 'none'} 
                                  onValueChange={(val: string | null) => setSelectedSiteName(val === 'none' ? '' : (val || ''))}
                                >
                                  <SelectTrigger className="rounded-md h-10 bg-slate-50/50 border-slate-200 font-bold text-xs">
                                    <SelectValue placeholder="সাইট নির্বাচন করুন..." />
                                  </SelectTrigger>
                                  <SelectContent className="font-bengali text-xs font-bold max-h-60 z-[99999]">
                                    <SelectItem value="none">কোনো নির্দিষ্ট সাইট নয় (সাধারণ জমা)</SelectItem>
                                    {customerSites.map(s => (
                                      <SelectItem key={s.id || s.name} value={s.name}>
                                        📍 {s.name} {s.address ? `(${s.address})` : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  value={selectedSiteName}
                                  onChange={e => setSelectedSiteName(e.target.value)}
                                  placeholder="সাইটের নাম লিখুন (যদি থাকে)..."
                                  className="rounded-md h-10 bg-slate-50/50 border-slate-200 font-bold text-xs font-bengali"
                                />
                              )}
                            </div>
                          )}

                        </div>
                      </CardContent>
                    </Card>

                    {/* CARD 2: PAYMENT INFO */}
                    <Card className="bg-white border border-slate-200/80 rounded-md shadow-2xs">
                      <CardContent className="p-5 space-y-4">
                        <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          পেমেন্ট এন্ট্রি বিবরণ
                        </Label>

                        <div className="space-y-3 pt-1 font-bengali">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            
                            {/* Payment Date */}
                            <div className="space-y-1">
                              <Label className="text-[11px] font-bold text-slate-600">পেমেন্ট তারিখ *</Label>
                              <Input 
                                type="text"
                                value={paymentDate || toBengaliDigits(format(new Date(), 'dd/MM/yyyy'))}
                                onChange={e => setPaymentDate(e.target.value)}
                                className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-bengali"
                              />
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-1">
                              <Label className="text-[11px] font-bold text-slate-600">পেমেন্ট মাধ্যম *</Label>
                              <Select 
                                value={paymentType === 'expense' && paymentMethod === 'Split' ? 'Cash' : paymentMethod} 
                                onValueChange={(val: string | null) => setPaymentMethod(val || 'Cash')}
                              >
                                <SelectTrigger className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-bengali">
                                  <SelectValue>
                                    {(paymentType === 'expense' && paymentMethod === 'Split' ? 'Cash' : paymentMethod) === 'Cash' ? '💵 নগদ (Cash)' :
                                     paymentMethod === 'Split' ? '💵+📄 নগদ ও চেক (স্প্লিট পেমেন্ট)' :
                                     paymentMethod === 'Cheque' || paymentMethod === 'Check' ? '📄 চেক (Cheque)' :
                                     paymentMethod === 'Bank' ? '🏦 ব্যাংক ট্রান্সফার' :
                                     paymentMethod === 'BankToBank' ? '🔄 ব্যাংক-টু-ব্যাংক' : '💵 নগদ (Cash)'}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="font-bengali text-xs font-bold z-[99999]">
                                  <SelectItem value="Cash">💵 নগদ (Cash)</SelectItem>
                                  {paymentType === 'income' && (
                                    <SelectItem value="Split">💵+📄 নগদ ও চেক (স্প্লিট পেমেন্ট)</SelectItem>
                                  )}
                                  <SelectItem value="Cheque">📄 চেক (Cheque)</SelectItem>
                                  <SelectItem value="Bank">🏦 ব্যাংক ট্রান্সফার</SelectItem>
                                  <SelectItem value="BankToBank">🔄 ব্যাংক-টু-ব্যাংক</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {paymentMethod === 'Split' ? (
                              <>
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-bold text-slate-700">নগদ জমার পরিমাণ (৳)</Label>
                                  <Input 
                                    type="number"
                                    value={cashPaidAmount || ''}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setCashPaidAmount(val);
                                      setPaidAmount(val + chequePaidAmount);
                                    }}
                                    placeholder="০"
                                    className="rounded-md h-10 bg-emerald-50/70 border-emerald-300 text-xs font-black text-emerald-700 font-bengali"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-bold text-slate-700">চেক জমার পরিমাণ (৳)</Label>
                                  <Input 
                                    type="number"
                                    value={chequePaidAmount || ''}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setChequePaidAmount(val);
                                      setPaidAmount(cashPaidAmount + val);
                                    }}
                                    placeholder="০"
                                    className="rounded-md h-10 bg-purple-50/70 border-purple-300 text-xs font-black text-purple-700 font-bengali"
                                  />
                                </div>
                              </>
                            ) : (
                              <div className="space-y-1">
                                <Label className="text-[11px] font-bold text-slate-600">
                                  {paymentType === 'income' ? 'পরিশোধিত জমার পরিমাণ (৳) *' : 'পরিশোধিত প্রদেয় পরিমাণ (৳) *'}
                                </Label>
                                <Input 
                                  type="number"
                                  value={paidAmount || ''}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setPaidAmount(val);
                                    if (paymentMethod === 'Cash') setCashPaidAmount(val);
                                    if (paymentMethod === 'Cheque' || paymentMethod === 'Check') setChequePaidAmount(val);
                                  }}
                                  placeholder="০.০০"
                                  className="rounded-md h-10 bg-emerald-50/60 border-emerald-200 text-xs font-black text-emerald-600 font-bengali"
                                />
                              </div>
                            )}
                            </div>

                          {/* Dynamic Advance / Due Live Explanation */}
                          {paymentType === 'income' && selectedParty && paidAmount > 0 && (
                            <div className={cn(
                              "p-3 rounded-lg border text-xs font-bold font-bengali flex items-start gap-2 animate-in fade-in-50",
                              newCalculatedAdvance > 0 
                                ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" 
                                : "bg-blue-50/80 border-blue-200 text-blue-900"
                            )}>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                              <div className="space-y-0.5">
                                {partyExistingAdvance > 0 ? (
                                  <p>
                                    গ্রাহকের পূর্বে <strong>৳ {toBengaliDigits(partyExistingAdvance.toLocaleString('bn-BD'))}</strong> অগ্রিম জমা ছিল। বর্তমান <strong>৳ {toBengaliDigits(paidAmount.toLocaleString('bn-BD'))}</strong> জমা হয়ে মোট অগ্রিম হবে <span className="text-emerald-700 font-black">৳ {toBengaliDigits(newCalculatedAdvance.toLocaleString('bn-BD'))}</span>।
                                  </p>
                                ) : partyDue > 0 ? (
                                  paidAmount > partyDue ? (
                                    <p>
                                      বকেয়া <strong>৳ {toBengaliDigits(partyDue.toLocaleString('bn-BD'))}</strong> সম্পূর্ণ পরিশোধ হয়ে অতিরিক্ত <span className="text-emerald-700 font-black">৳ {toBengaliDigits(newCalculatedAdvance.toLocaleString('bn-BD'))}</span> অগ্রিম জমা (Advance) হিসেবে গণ্য হবে।
                                    </p>
                                  ) : (
                                    <p>
                                      বকেয়া থেকে <strong>৳ {toBengaliDigits(paidAmount.toLocaleString('bn-BD'))}</strong> সমন্বয় হবে। অবশিষ্ট বকেয়া থাকবে <span className="text-rose-600 font-black">৳ {toBengaliDigits(newCalculatedDue.toLocaleString('bn-BD'))}</span>।
                                    </p>
                                  )
                                ) : (
                                  <p>
                                    গ্রাহকের কোনো বকেয়া নেই। পুরো <span className="text-emerald-700 font-black">৳ {toBengaliDigits(paidAmount.toLocaleString('bn-BD'))}</span> টাকা অগ্রিম জমা (Advance) হিসেবে গণ্য হবে।
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Extra Row: Discount, Reference, Note */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-bold text-slate-600">ছাড় / অ্যাডজাস্টমেন্ট (ঐচ্ছিক)</Label>
                              <Input 
                                type="number"
                                value={discountAmount || ''}
                                onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                                placeholder="০"
                                className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-bengali"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[11px] font-bold text-slate-600">রেফারেন্স নং (ঐচ্ছিক)</Label>
                              <Input 
                                value={referenceNo}
                                onChange={e => setReferenceNo(e.target.value)}
                                placeholder="REF-102"
                                className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-mono font-bold"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[11px] font-bold text-slate-600">নোট (ঐচ্ছিক)</Label>
                              <Input 
                                value={paymentNote}
                                onChange={e => setPaymentNote(e.target.value)}
                                placeholder="পেমেন্টের বিস্তারিত নোট..."
                                className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-medium font-bengali"
                              />
                            </div>
                          </div>

                          {/* BANK DETAILS */}
                          {paymentMethod === 'Bank' && (
                            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-md space-y-2 font-bengali text-xs animate-in fade-in-0">
                              <p className="font-bold text-blue-900 flex items-center gap-1">
                                🏦 ব্যাংক ট্রান্সফার তথ্য
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[10px] font-bold text-slate-600">
                                    {paymentType === 'income' 
                                      ? 'দোকানের ব্যাংক অ্যাকাউন্ট নির্বাচন করুন *' 
                                      : 'প্রাপক / সাপ্লায়ারের ব্যাংক ও অ্যাকাউন্ট নম্বর *'}
                                  </Label>
                                  {paymentType === 'income' ? (
                                    <Select 
                                      value={selectedShopBank || bankName || availableBankOptions[0]?.value} 
                                      onValueChange={(val: string | null) => {
                                        const selectedVal = val || '';
                                        setSelectedShopBank(selectedVal);
                                        setBankName(selectedVal);
                                      }}
                                    >
                                      <SelectTrigger className="h-9 rounded-md bg-white text-xs font-bold border-blue-200">
                                        <SelectValue placeholder="দোকানের ব্যাংক অ্যাকাউন্ট নির্বাচন করুন..." />
                                      </SelectTrigger>
                                      <SelectContent className="font-bengali text-xs font-bold z-[99999]">
                                        {availableBankOptions.map((b) => (
                                          <SelectItem key={b.value} value={b.value}>
                                            {b.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input 
                                      placeholder="প্রাপক ব্যাংক নাম, শাখা ও অ্যাকাউন্ট নং" 
                                      value={bankName} 
                                      onChange={e => {
                                        setBankName(e.target.value);
                                        setSelectedShopBank(e.target.value);
                                      }}
                                      className="h-9 rounded-md bg-white text-xs font-bengali"
                                    />
                                  )}
                                </div>
                                <div>
                                  <Label className="text-[10px] font-bold text-slate-600">ট্রানজেকশন / রেফারেন্স আইডি (ঐচ্ছিক)</Label>
                                  <Input 
                                    placeholder="TXN-123456" 
                                    value={transactionRef} 
                                    onChange={e => setTransactionRef(e.target.value)}
                                    className="h-9 rounded-md bg-white text-xs font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* BANK TO BANK TRANSFER DETAILS */}
                          {paymentMethod === 'BankToBank' && (
                            <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-md space-y-3 font-bengali text-xs animate-in fade-in-0">
                              <p className="font-bold text-indigo-900 flex items-center gap-1">
                                🔄 ব্যাংক-টু-ব্যাংক ট্রান্সফার বিস্তারিত
                              </p>
                              
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-indigo-950 block">
                                  ১. গ্রহীতার ব্যাংক অ্যাকাউন্ট (দোকানের সেভ করা অ্যাকাউন্ট)
                                </Label>
                                <Select value={selectedShopBank} onValueChange={(val: string | null) => setSelectedShopBank(val || '')}>
                                  <SelectTrigger className="h-9 rounded-md bg-white text-xs font-bold border-indigo-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="font-bengali text-xs font-bold z-[99999]">
                                    {banks.length > 0 ? (
                                      banks.map(b => (
                                        <SelectItem key={b.id} value={`${b.name} (${b.accNo})`}>
                                          {b.name} - {b.accNo} (ব্যালেন্স: ৳ {Number(b.balance || 0).toLocaleString('bn-BD')})
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="none" disabled>
                                        ⚠️ কোনো ব্যাংক যুক্ত নেই (আগে ব্যাংক যোগ করুন)
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2 pt-2 border-t border-indigo-100">
                                <Label className="text-[10px] font-bold text-slate-700 block">
                                  ২. প্রেরকের ব্যাংক তথ্য
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-[10px] font-bold text-slate-600">প্রেরক ব্যাংকের নাম</Label>
                                    <Input 
                                      placeholder="ইবিএল / প্রাইম ব্যাংক / ব্যাংকের নাম" 
                                      value={senderBankName} 
                                      onChange={e => setSenderBankName(e.target.value)}
                                      className="h-9 rounded-md bg-white text-xs font-bengali"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] font-bold text-slate-600">প্রেরকের অ্যাকাউন্ট নং / নাম</Label>
                                    <Input 
                                      placeholder="A/C No or Name" 
                                      value={senderAccountNo} 
                                      onChange={e => setSenderAccountNo(e.target.value)}
                                      className="h-9 rounded-md bg-white text-xs font-mono"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <Label className="text-[10px] font-bold text-slate-600">ট্রানজেকশন / রেফারেন্স আইডি</Label>
                                    <Input 
                                      placeholder="Txn ID / Ref No" 
                                      value={senderTxnRef} 
                                      onChange={e => setSenderTxnRef(e.target.value)}
                                      className="h-9 rounded-md bg-white text-xs font-mono"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* CHEQUE DETAILS */}
                          {(paymentMethod === 'Cheque' || paymentMethod === 'Check' || paymentMethod === 'Split' || chequePaidAmount > 0) && (
                            <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-md space-y-2.5 font-bengali text-xs animate-in fade-in-0 shadow-2xs">
                              <p className="font-bold text-purple-900 flex items-center gap-1.5">
                                📄 চেকের বিবরণ {paymentType === 'expense' ? '(দোকানের ব্যাংক একাউন্ট নির্বাচন করুন)' : '(কাস্টমারের চেকের তথ্য)'}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div>
                                  {paymentType === 'expense' ? (
                                    <>
                                      <Label className="text-[10px] font-bold text-purple-900">দোকানের ব্যাংক অ্যাকাউন্ট</Label>
                                      <Select 
                                        value={bankName || selectedShopBank} 
                                        onValueChange={(val: string | null) => {
                                          setBankName(val || '');
                                          setSelectedShopBank(val || '');
                                        }}
                                      >
                                        <SelectTrigger className="h-9 rounded-md bg-white text-xs font-bold border-purple-200">
                                          <SelectValue placeholder="দোকানের ব্যাংক নির্বাচন করুন" />
                                        </SelectTrigger>
                                        <SelectContent className="font-bengali text-xs font-bold">
                                          {banks.length > 0 ? (
                                            banks.map(b => (
                                              <SelectItem key={b.id} value={`${b.name} (${b.accNo})`}>
                                                {b.name} - {b.accNo} (ব্যালেন্স: ৳ {Number(b.balance || 0).toLocaleString('bn-BD')})
                                              </SelectItem>
                                            ))
                                          ) : (
                                            <SelectItem value="none" disabled>
                                              ⚠️ কোনো ব্যাংক যুক্ত নেই (আগে ব্যাংক যোগ করুন)
                                            </SelectItem>
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </>
                                  ) : (
                                    <>
                                      <Label className="text-[10px] font-bold text-purple-900">কাস্টমারের ব্যাংকের নাম</Label>
                                      <Input 
                                        placeholder="সোনালী ব্যাংক / ডাচ-বাংলা / ব্যাংকের নাম" 
                                        value={bankName} 
                                        onChange={e => setBankName(e.target.value)}
                                        className="h-9 rounded-md bg-white text-xs font-bengali"
                                      />
                                    </>
                                  )}
                                </div>
                                <div>
                                  <Label className="text-[10px] font-bold text-purple-900">চেক নম্বর</Label>
                                  <Input 
                                    placeholder="CQ-10023" 
                                    value={chequeNo} 
                                    onChange={e => setChequeNo(e.target.value)}
                                    className="h-9 rounded-md bg-white text-xs font-mono"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] font-bold text-purple-900">চেকের তারিখ</Label>
                                  <Input 
                                    type="text" 
                                    value={chequeDate || toBengaliDigits(format(new Date(), 'dd/MM/yyyy'))} 
                                    onChange={e => setChequeDate(e.target.value)}
                                    className="h-9 rounded-md bg-white text-xs font-bengali font-bold"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      </CardContent>
                    </Card>

                    {/* CARD 4: ATTACHMENTS */}
                    <Card className="bg-white border border-slate-200/80 rounded-md shadow-2xs">
                      <CardContent className="p-5 space-y-3">
                        <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-2">
                          <UploadCloud className="w-4 h-4 text-blue-600" />
                          সংযুক্তি (ঐচ্ছিক)
                        </Label>

                        {/* File Dropzone */}
                        <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 transition-colors rounded-md p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50">
                          <UploadCloud className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                          <p className="text-xs font-bold text-slate-700">ফাইল ড্রাপ করুন অথবা ক্লিক করে আপলোড করুন</p>
                          <p className="text-[10px] text-slate-400 mt-1">সাপোর্টেড ফরম্যাট: JPG, PNG, PDF (সর্বোচ্চ 5MB)</p>
                        </div>
                      </CardContent>
                    </Card>

                  </div>

                  {/* RIGHT 4 COLUMNS: PAYMENT SUMMARY SIDEBAR CARD */}
                  <div className="lg:col-span-4 space-y-5">
                    
                    <Card className="bg-white border border-slate-200/80 rounded-md shadow-2xs">
                      <CardContent className="p-5 space-y-4">
                        <Label className="text-xs uppercase tracking-wider font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-orange-600" />
                          পেমেন্ট সারসংক্ষেপ
                        </Label>

                        {/* Financial Summary Lines */}
                        <div className="space-y-3 text-xs">
                          
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-500 font-semibold">
                              {expensePartyType === 'engineer' ? 'পূর্বের পাওনা কমিশন' : (partyExistingAdvance > 0 ? 'পূর্বের অগ্রিম জমা' : 'পূর্বের মোট বকেয়া')}
                            </span>
                            <span className={cn("font-bold", partyExistingAdvance > 0 ? "text-emerald-700" : "text-slate-800")}>
                              ৳ {toBengaliDigits((partyExistingAdvance > 0 ? partyExistingAdvance : partyDue).toLocaleString('bn-BD'))}
                            </span>
                          </div>

                          {safeDiscount > 0 && (
                            <div className="flex justify-between py-1 border-b border-slate-100 text-rose-600">
                              <span className="font-semibold">ছাড় / ডিসকাউন্ট</span>
                              <span className="font-bold">৳ {toBengaliDigits(safeDiscount.toLocaleString('bn-BD'))}</span>
                            </div>
                          )}

                          <div className="flex justify-between py-1.5 border-b border-slate-100 bg-emerald-50/50 p-2 rounded-md">
                            <span className="font-bold text-emerald-800">বর্তমান পেমেন্ট</span>
                            <span className="font-black text-emerald-600 text-sm">৳ {toBengaliDigits((currentPaymentAmount || 0).toLocaleString('bn-BD'))}</span>
                          </div>

                          {/* Dashed Separator */}
                          <div className="border-b border-dashed border-slate-200 my-2"></div>

                          {newCalculatedAdvance > 0 ? (
                            <div className="space-y-1 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest block">পরবর্তী অগ্রিম জমা (Advance)</span>
                              <span className="text-2xl font-black text-emerald-600 block">
                                ৳ {toBengaliDigits(newCalculatedAdvance.toLocaleString('bn-BD'))}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-widest block">অবশিষ্ট বকেয়া</span>
                              <span className="text-2xl font-black text-rose-600 block">
                                ৳ {toBengaliDigits((remainingDue || 0).toLocaleString('bn-BD'))}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Quick Metadata List */}
                        <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
                          
                          {selectedSiteName && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">সাইট</span>
                              <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded font-bold text-[11px] flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {selectedSiteName}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">পেমেন্ট পদ্ধতি</span>
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-bold text-[11px]">
                              🏦 {paymentMethod === 'Cash' ? 'নগদ' : paymentMethod === 'Bank' ? 'ব্যাংক' : paymentMethod === 'Cheque' || paymentMethod === 'Check' ? 'চেক' : paymentMethod}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">পেমেন্ট তারিখ</span>
                            <span className="font-bold text-slate-700">{paymentDate || toBengaliDigits(format(new Date(), 'dd/MM/yyyy'))}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">রেফারেন্স নং</span>
                            <span className="font-mono font-bold text-slate-700">{toBengaliDigits(referenceNo || '—')}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">স্ট্যাটাস</span>
                            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold text-[10px]">
                              নতুন খসড়া
                            </span>
                          </div>
                        </div>

                        {/* Security Notice Box */}
                        <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-md flex items-center gap-2.5 text-xs text-emerald-900 mt-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          <div>
                            <p className="font-black text-emerald-950">নিরাপদ লেনদেন</p>
                            <p className="text-[10px] text-emerald-700 font-semibold">এই পেমেন্টটি সংরক্ষিত ও নিরাপদে রাখা হবে।</p>
                          </div>
                        </div>

                      </CardContent>
                    </Card>

                  </div>

                </div>
              </div>

              {/* STICKY BOTTOM ACTION FOOTER INSIDE FRAME */}
              <div className="bg-white border-t border-slate-300 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs font-bengali flex-shrink-0 rounded-b-md">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>💡 তথ্য নিশ্চিত হয়ে সংরক্ষণ বাটন চাপুন। এটি লেনদেনের তালিকায় যুক্ত হবে।</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddOpen(false)}
                    className="rounded-md h-10 px-5 text-xs font-bold text-slate-600 border-slate-300 hover:bg-slate-50"
                  >
                    বাতিল করুন
                  </Button>

                  <Button 
                    type="submit" 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md h-10 px-6 text-xs font-black shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                  >
                    💾 পেমেন্ট সংরক্ষণ করুন ✓
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* MONEY RECEIPT MEMO PRINT MODAL */}
        {isPrintMemoOpen && (
          <Dialog open={isPrintMemoOpen} onOpenChange={setIsPrintMemoOpen}>
            <DialogContent className="max-w-xl rounded-3xl p-6 bg-white font-bengali">
              <div className="p-6 border border-slate-200 rounded-2xl space-y-5 bg-white">
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src="/logo.png" 
                      alt="মেসার্স দেলোয়ার এন্ড ব্রাদার্স" 
                      className="w-12 h-12 object-contain rounded-lg border border-slate-200 bg-white p-0.5" 
                    />
                    <div>
                      <h2 className="text-xl font-black text-slate-900">মেসার্স দেলোয়ার এন্ড ব্রাদার্স</h2>
                      <p className="text-xs text-slate-500">রড, সিমেন্ট ও বিল্ডিং সামগ্রী পাইকারী ও খুচরা সরবরাহ কেন্দ্র</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold block mb-1">
                      টাকা প্রাপ্তি রসিদ (Money Receipt)
                    </span>
                    <p className="text-xs font-mono text-slate-500">আইডি: {toBengaliDigits(autoPaymentId)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-500 font-semibold">প্রদানকারী (কাস্টমার):</p>
                    <p className="font-black text-slate-900 text-sm">{selectedParty?.name || '—'}</p>
                    <p className="text-slate-500">{toBengaliDigits(selectedParty?.phone || '—')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 font-semibold">তারিখ &amp; মাধ্যম:</p>
                    <p className="font-bold text-slate-800">{paymentDate || toBengaliDigits(format(new Date(), 'dd/MM/yyyy'))}</p>
                    <p className="font-bold text-blue-700">{paymentMethod === 'Cash' ? 'নগদ' : paymentMethod === 'Bank' ? 'ব্যাংক' : 'চেক'} ({bankTxnType})</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl text-center space-y-1 border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase">প্রাপ্তি পরিমাণ</p>
                  <p className="text-3xl font-black text-emerald-600">৳ {toBengaliDigits((paidAmount || 0).toLocaleString('bn-BD'))}</p>
                </div>

                <div className="flex justify-between items-center pt-8 text-xs font-bold text-slate-500 border-t border-slate-100">
                  <span>গ্রাহকের স্বাক্ষর</span>
                  <span>ক্যাশিয়ারের স্বাক্ষর</span>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsPrintMemoOpen(false)} className="rounded-xl font-bold text-xs">
                  বন্ধ করুন
                </Button>
                <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs">
                  <Printer className="w-4 h-4 mr-1.5" /> প্রিন্ট করুন
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}



        {/* ADD MONEY (টাকা যোগ) MODAL DIALOG */}
        <Dialog open={isAddMoneyOpen} onOpenChange={setIsAddMoneyOpen}>
          <DialogContent className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl font-bengali">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-6 h-6 text-blue-600" /> টাকা যোগ করুন (Add Money)
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Category / Source */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">টাকা যোগের খাত / ধরন *</Label>
                <Select value={addMoneyCategory} onValueChange={(val: string | null) => val && setAddMoneyCategory(val)}>
                  <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 border-slate-200 text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-bengali text-xs font-bold">
                    <SelectItem value="ক্যাশে জমা (Add Cash)">ক্যাশে জমা (Add Cash)</SelectItem>
                    <SelectItem value="ব্যাংক ডিপোজিট (Bank Deposit)">ব্যাংক ডিপোজিট (Bank Deposit)</SelectItem>
                    <SelectItem value="মালিকের মূলধন যোগ (Owner Capital)">মালিকের মূলধন যোগ (Owner Capital)</SelectItem>
                    <SelectItem value="অন্যান্য আয় (Other Income)">অন্যান্য আয় (Other Income)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">টাকার পরিমাণ (৳) *</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={addMoneyAmount || ''}
                    onChange={e => setAddMoneyAmount(parseFloat(e.target.value) || 0)}
                    className="rounded-xl h-11 pl-9 bg-slate-50/50 border-slate-200 text-base font-black text-blue-600 text-right font-bengali"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">পেমেন্ট মাধ্যম *</Label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAddMoneyMethod('Cash')}
                    className={cn(
                      "h-10 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all",
                      addMoneyMethod === 'Cash' 
                        ? "bg-white text-blue-700 border-2 border-blue-500 shadow-xs" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    💵 নগদ (Cash)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMoneyMethod('Bank')}
                    className={cn(
                      "h-10 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all",
                      addMoneyMethod === 'Bank' 
                        ? "bg-white text-blue-700 border-2 border-blue-500 shadow-xs" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    🏦 ব্যাংক (Bank)
                  </button>
                </div>
              </div>

              {/* Select Bank if Bank is selected */}
              {addMoneyMethod === 'Bank' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">ব্যাংক অ্যাকাউন্ট নির্বাচন করুন *</Label>
                  <Select value={addMoneyBankId} onValueChange={(val: string | null) => val && setAddMoneyBankId(val)}>
                    <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 border-slate-200 text-xs font-bold">
                      <SelectValue placeholder="ব্যাংক পছন্দ করুন..." />
                    </SelectTrigger>
                    <SelectContent className="font-bengali text-xs font-bold max-h-48">
                      {banks.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name} ({b.accNo}) — ৳{toBengaliDigits(b.balance.toLocaleString('bn-BD'))}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">তারিখ *</Label>
                <BengaliDatePicker
                  value={addMoneyDate}
                  onChange={val => setAddMoneyDate(val)}
                  placeholder="তারিখ নির্বাচন করুন"
                  className="w-full"
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">নোট / বিবরণী (ঐচ্ছিক)</Label>
                <Input 
                  placeholder="ক্যাশ বক্সে টাকা জমা..."
                  value={addMoneyNote}
                  onChange={e => setAddMoneyNote(e.target.value)}
                  className="rounded-xl h-11 bg-slate-50/50 border-slate-200 text-xs font-bold"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddMoneyOpen(false)} className="rounded-xl font-bold h-11 text-xs">
                বাতিল
              </Button>
              <Button onClick={handleCreateAddMoneySubmit} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold h-11 px-6 shadow-md shadow-blue-600/20 text-xs">
                <Check className="w-4 h-4 mr-1.5" /> টাকা যোগ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SUPPLIER LOAN RECEIVED (সরবরাহকারী লোন গ্রহণ) MODAL DIALOG */}
        <Dialog open={isLoanModalOpen} onOpenChange={setIsLoanModalOpen}>
          <DialogContent className="max-w-lg w-full bg-white rounded-3xl p-6 shadow-2xl font-bengali">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <HandCoins className="w-6 h-6 text-purple-600" /> সরবরাহকারী থেকে লোন গ্রহণ (Loan Received)
              </DialogTitle>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                সরবরাহকারী থেকে ঋণ বা ধার গ্রহণ করুন। এটি ক্যাশ/ব্যাংক ব্যালেন্সে জমা হবে এবং সরবরাহকারীর লেজারে পাওনা হিসেবে যুক্ত হবে।
              </p>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Supplier Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">সরবরাহকারী নির্বাচন করুন *</Label>
                <SupplierSearchSelect
                  suppliers={suppliers}
                  selectedSupplier={suppliers.find(s => String(s.id) === String(loanSupplierId)) || null}
                  onSelectSupplier={(supp) => {
                    setLoanSupplierId(supp ? String(supp.id) : '');
                  }}
                  placeholder="সরবরাহকারীর নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                />
              </div>

              {/* Dynamic Supplier Balance Overview Box */}
              {(() => {
                const suppObj = suppliers.find(s => String(s.id) === String(loanSupplierId));
                if (!suppObj) return null;
                const currentDue = Number((suppObj as any).total_due || (suppObj as any).totalDue || (suppObj as any).due || (suppObj as any).balance || 0);
                const projectedDue = currentDue + (loanAmount || 0);

                return (
                  <div className="p-3 bg-purple-50/80 border border-purple-200/90 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-bold">সরবরাহকারী:</span>
                      <span className="font-black text-slate-900">{suppObj.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-bold">বর্তমান বকেয়া / পাওনা:</span>
                      <span className="font-black text-slate-800">৳ {toBengaliDigits(currentDue.toLocaleString('bn-BD'))}</span>
                    </div>
                    {loanAmount > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-purple-200 font-black">
                        <span className="text-purple-900">লোন গ্রহণের পর মোট পাওনা:</span>
                        <span className="text-purple-700 text-sm font-black">৳ {toBengaliDigits(projectedDue.toLocaleString('bn-BD'))}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Loan Amount */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">লোনের পরিমাণ (৳) *</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={loanAmount || ''}
                    onChange={e => setLoanAmount(parseFloat(e.target.value) || 0)}
                    className="rounded-xl h-11 pl-9 bg-slate-50/50 border-slate-200 text-base font-black text-purple-700 text-right font-bengali"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">জমা গ্রহণের মাধ্যম *</Label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setLoanMethod('Cash')}
                    className={cn(
                      "h-10 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      loanMethod === 'Cash' 
                        ? "bg-white text-purple-700 border-2 border-purple-500 shadow-xs font-black" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    💵 নগদ ক্যাশ বাক্স (Cash)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoanMethod('Bank');
                      if (banks.length > 0 && !loanBankId) {
                        setLoanBankId(banks[0].id);
                      }
                    }}
                    className={cn(
                      "h-10 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      loanMethod === 'Bank' 
                        ? "bg-white text-purple-700 border-2 border-purple-500 shadow-xs font-black" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    🏦 ব্যাংক অ্যাকাউন্ট (Bank)
                  </button>
                </div>
              </div>

              {/* Select Bank if Bank is selected */}
              {loanMethod === 'Bank' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">যে ব্যাংকে টাকা জমা হবে *</Label>
                  <Select value={loanBankId} onValueChange={(val: string | null) => val && setLoanBankId(val)}>
                    <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 border-slate-200 text-xs font-bold">
                      <SelectValue placeholder="ব্যাংক পছন্দ করুন..." />
                    </SelectTrigger>
                    <SelectContent className="font-bengali text-xs font-bold max-h-48">
                      {banks.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} ({b.accNo}) — ব্যালেন্স: ৳{toBengaliDigits((b.balance || 0).toLocaleString('bn-BD'))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date & Ref No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">তারিখ *</Label>
                  <BengaliDatePicker
                    value={loanDate}
                    onChange={val => setLoanDate(val)}
                    placeholder="তারিখ নির্বাচন করুন"
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">ভাউচার / রেফারেন্স নং</Label>
                  <Input 
                    placeholder="LOAN-001 বা চেক নম্বর"
                    value={loanRefNo}
                    onChange={e => setLoanRefNo(e.target.value)}
                    className="rounded-xl h-11 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">নোট / বিবরণ (ঐচ্ছিক)</Label>
                <Input 
                  placeholder="যেমন: জরুরি প্রয়োজনে লোন নেওয়া হলো..."
                  value={loanNote}
                  onChange={e => setLoanNote(e.target.value)}
                  className="rounded-xl h-11 bg-slate-50/50 border-slate-200 text-xs font-bold"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 flex items-center justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsLoanModalOpen(false)} 
                className="rounded-xl font-bold h-11 text-xs cursor-pointer"
              >
                বাতিল
              </Button>
              <Button 
                onClick={handleCreateLoanSubmit} 
                disabled={isLoanSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold h-11 px-6 shadow-md shadow-purple-600/20 text-xs cursor-pointer"
              >
                <HandCoins className="w-4 h-4 mr-1.5" />
                {isLoanSubmitting ? 'সংরক্ষণ হচ্ছে...' : '🤝 লোন গ্রহণ নিশ্চিত করুন'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* BALANCE / FUND TRANSFER (ব্যাংক / ক্যাশ ব্যালেন্স ট্রান্সফার) MODAL DIALOG */}
        <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
          <DialogContent className="max-w-lg w-full bg-white rounded-3xl p-6 shadow-2xl font-bengali">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="w-6 h-6 text-indigo-600" /> ব্যালেন্স ট্রান্সফার (Balance Transfer)
              </DialogTitle>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                ব্যাংক থেকে ক্যাশ উত্তোলন অথবা এক ব্যাংক থেকে অন্য ব্যাংকে ফান্ড স্থানান্তর করুন
              </p>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Transfer Mode Selector Tabs */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">ট্রান্সফারের ধরন *</Label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setTransferMode('bank_to_cash')}
                    className={cn(
                      "py-2.5 px-2 rounded-xl font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer",
                      transferMode === 'bank_to_cash'
                        ? "bg-white text-indigo-700 border-2 border-indigo-500 shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    )}
                  >
                    <span className="text-sm">🏦 ➔ 💵</span>
                    <span className="leading-tight">ব্যাংক ➔ ক্যাশ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTransferMode('bank_to_bank')}
                    className={cn(
                      "py-2.5 px-2 rounded-xl font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer",
                      transferMode === 'bank_to_bank'
                        ? "bg-white text-indigo-700 border-2 border-indigo-500 shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    )}
                  >
                    <span className="text-sm">🏦 ➔ 🏦</span>
                    <span className="leading-tight">ব্যাংক ➔ ব্যাংক</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTransferMode('cash_to_bank')}
                    className={cn(
                      "py-2.5 px-2 rounded-xl font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer",
                      transferMode === 'cash_to_bank'
                        ? "bg-white text-indigo-700 border-2 border-indigo-500 shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    )}
                  >
                    <span className="text-sm">💵 ➔ 🏦</span>
                    <span className="leading-tight">ক্যাশ ➔ ব্যাংক</span>
                  </button>
                </div>
              </div>

              {/* Source & Destination Account Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Source Account (From) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    উৎস (যেখান থেকে টাকা যাবে) *
                  </Label>
                  {transferMode === 'cash_to_bank' ? (
                    <div className="h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-700">
                      <span>💵</span>
                      <span>দোকান ক্যাশ বাক্স (Cash Box)</span>
                    </div>
                  ) : (
                    <Select 
                      value={transferSourceBankId} 
                      onValueChange={(val: string | null) => val && setTransferSourceBankId(val)}
                    >
                      <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 border-slate-200 text-xs font-bold">
                        <SelectValue placeholder="উৎস ব্যাংক বেছে নিন..." />
                      </SelectTrigger>
                      <SelectContent className="font-bengali text-xs font-bold max-h-56">
                        {banks.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} ({b.accNo}) — ৳{toBengaliDigits((b.balance || 0).toLocaleString('bn-BD'))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {transferMode !== 'cash_to_bank' && transferSourceBankId && (
                    <p className="text-[10px] font-semibold text-slate-500">
                      বর্তমান ব্যালেন্স: <strong className="text-indigo-600">৳ {toBengaliDigits((banks.find(b => b.id === transferSourceBankId)?.balance || 0).toLocaleString('bn-BD'))}</strong>
                    </p>
                  )}
                </div>

                {/* Target Account (To) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    গন্তব্য (যেখানে টাকা জমা হবে) *
                  </Label>
                  {transferMode === 'bank_to_cash' ? (
                    <div className="h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-700">
                      <span>💵</span>
                      <span>দোকান ক্যাশ বাক্স (Cash Box)</span>
                    </div>
                  ) : (
                    <Select 
                      value={transferTargetBankId} 
                      onValueChange={(val: string | null) => val && setTransferTargetBankId(val)}
                    >
                      <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 border-slate-200 text-xs font-bold">
                        <SelectValue placeholder="গন্তব্য ব্যাংক বেছে নিন..." />
                      </SelectTrigger>
                      <SelectContent className="font-bengali text-xs font-bold max-h-56">
                        {banks.filter(b => transferMode !== 'bank_to_bank' || b.id !== transferSourceBankId).map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} ({b.accNo}) — ৳{toBengaliDigits((b.balance || 0).toLocaleString('bn-BD'))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {transferMode !== 'bank_to_cash' && transferTargetBankId && (
                    <p className="text-[10px] font-semibold text-slate-500">
                      বর্তমান ব্যালেন্স: <strong className="text-emerald-600">৳ {toBengaliDigits((banks.find(b => b.id === transferTargetBankId)?.balance || 0).toLocaleString('bn-BD'))}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Transfer Amount */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700">স্থানান্তরের টাকার পরিমাণ (৳) *</Label>
                  {transferMode !== 'cash_to_bank' && transferSourceBankId && transferAmount > (banks.find(b => b.id === transferSourceBankId)?.balance || 0) && (
                    <span className="text-[10px] font-bold text-rose-600 flex items-center gap-0.5">
                      <AlertCircle className="w-3 h-3" /> ব্যালেন্স অতিক্রম করেছে!
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={transferAmount || ''}
                    onChange={e => setTransferAmount(parseFloat(e.target.value) || 0)}
                    className="rounded-xl h-11 pl-9 bg-slate-50/50 border-slate-200 text-base font-black text-indigo-700 text-right font-bengali"
                  />
                </div>
              </div>

              {/* Date & Cheque/Reference No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">তারিখ *</Label>
                  <BengaliDatePicker
                    value={transferDate}
                    onChange={val => setTransferDate(val)}
                    placeholder="তারিখ নির্বাচন করুন"
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">চেক / রেফারেন্স / স্লিপ নং</Label>
                  <Input 
                    placeholder="CQ-8492 বা স্লিপ নং"
                    value={transferRefNo}
                    onChange={e => setTransferRefNo(e.target.value)}
                    className="rounded-xl h-11 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Note / Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">নোট / বিবরণ (ঐচ্ছিক)</Label>
                <Input 
                  placeholder={
                    transferMode === 'bank_to_cash' 
                      ? 'দোকানের নগদ খরচের জন্য ব্যাংক উত্তোলন'
                      : transferMode === 'bank_to_bank'
                        ? 'একাউন্ট সমন্বয় / ফান্ড ট্রান্সফার'
                        : 'দিনের অতিরিক্ত ক্যাশ জমা'
                  }
                  value={transferNote}
                  onChange={e => setTransferNote(e.target.value)}
                  className="rounded-xl h-11 bg-slate-50/50 border-slate-200 text-xs font-bold"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 flex items-center justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsTransferOpen(false)} 
                className="rounded-xl font-bold h-11 text-xs cursor-pointer"
              >
                বাতিল
              </Button>
              <Button 
                onClick={handleExecuteTransfer} 
                disabled={isTransferSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold h-11 px-6 shadow-md shadow-indigo-600/20 text-xs cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4 mr-1.5" />
                {isTransferSubmitting ? 'ট্রান্সফার হচ্ছে...' : 'ট্রান্সফার সম্পন্ন করুন'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

    </Shell>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bengali">লোড হচ্ছে...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
