'use client';

import { useState, useEffect, useMemo, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { api, CustomerSiteData } from '@/lib/api';
import { 
  Search, Eye, Printer, X, FileText, Receipt, Banknote, AlertCircle, Plus, 
  ShoppingCart, User, Phone, Tag, CheckCircle2, DollarSign, Trash2, ArrowRight, ArrowLeft,
  Lightbulb, Calendar, Building, UserCheck, Percent, HelpCircle, Edit2, Filter, ChevronUp, ChevronDown, RotateCcw, Zap, ArrowUpDown, ChevronLeft, ChevronRight,
  MapPin
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { format, isToday, isYesterday, isSameWeek, isSameMonth, startOfDay, endOfDay } from 'date-fns';
import { bn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CustomerSearchSelect } from '@/components/CustomerSearchSelect';
import { EngineerSearchSelect, EngineerOption } from '@/components/EngineerSearchSelect';
import { toBengaliDigits, toEnglishDigits, parseProductDetails, formatProductName } from '@/lib/bengaliUtils';
import { ProductSearchSelect } from '@/components/ProductSearchSelect';
import { CascadingProductSelector, SelectedProductDetails } from '@/components/CascadingProductSelector';
import { CartItemQtyInput } from '@/components/CartItemQtyInput';
import { InvoiceMemo } from '@/components/InvoiceMemo';
import { SalesInvoiceDetailsView } from '@/components/SalesInvoiceDetailsView';
import { BengaliDateRangePicker } from '@/components/ui/BengaliDateRangePicker';
import { BengaliDatePicker } from '@/components/ui/BengaliDatePicker';
import { printElement } from '@/lib/printUtils';
import { TableRowActionMenu } from '@/components/TableRowActionMenu';
import { useAuth } from '@/lib/authContext';

interface Product { 
  id: string; 
  name: string; 
  sellPrice: number; 
  stock: number; 
  unit: string; 
  category: string; 
}

interface Customer { 
  id: string; 
  name: string; 
  phone?: string; 
  address?: string; 
  businessName?: string;
  totalDue?: number;
  due?: number;
  balance?: number;
  previousDue?: number;
  openingBalance?: number;
  advanceBalance?: number;
  sites?: CustomerSiteData[];
}

interface OrderItem {
  id?: string;
  name: string;
  code?: string;
  category?: string;
  brand?: string;
  mmSize?: string;
  price: number;
  quantity: number;
  unit: string;
  total: number;
  discount?: number;
  bundle?: number | string;
  weightKg?: number;
}

interface Invoice {
  id: string;
  orderId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  businessName?: string;
  customerId?: string;
  customerSiteId?: string;
  siteName?: string;
  siteAddress?: string;
  siteContact?: string;
  engineerId?: string;
  engineerName?: string;
  engineerPhone?: string;
  items: OrderItem[];
  subtotal?: number;
  discount?: number;
  vatTax?: number;
  shippingCost?: number;
  laborCost?: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  stage?: 'draft' | 'pending' | 'approved' | 'rejected';
  status?: string;
  createdAt: any;
  invoiceNo?: string;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  deliveryAddress?: string;
  note?: string;
  paymentMethod?: string;
  paymentMethodName?: string;
  bankName?: string;
  accountNo?: string;
  transactionRef?: string;
  receiverShopBank?: string;
  senderBankName?: string;
  senderAccountNo?: string;
  senderTxnRef?: string;
  chequeNo?: string;
  chequeDate?: string;
  chargeCalcMode?: 'rate' | 'manual';
  rodLaborRate?: number;
  rodShippingRate?: number;
  rodLaborCost?: number;
  rodShippingCost?: number;
  rodRingTotalKg?: number;
  rodLoadingToCustomerLedger?: boolean;
  rodUnloadingRate?: number;
  rodUnloadingCost?: number;
  rodUnloadingToCustomerLedger?: boolean;
  cementLaborRate?: number;
  cementShippingRate?: number;
  cementLaborCost?: number;
  cementShippingCost?: number;
  cementTotalBags?: number;
  cementLoadingToCustomerLedger?: boolean;
  cementUnloadingRate?: number;
  cementUnloadingCost?: number;
  cementUnloadingToCustomerLedger?: boolean;
  shippingCostToCustomerLedger?: boolean;
  engineerRodRate?: number;
  engineerCementRate?: number;
  engineerRodKg?: number;
  engineerCementBags?: number;
  engineerRodCommission?: number;
  engineerCementCommission?: number;
  engineerTotalCommission?: number;
}

// Helpers for safe decimal inputs with Bengali numerals and preserving decimal points
const toBengaliInputDigits = (val: string): string => {
  if (!val) return '';
  const bnDigits: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
  };
  return val.replace(/[0-9]/g, m => bnDigits[m] || m);
};

const formatDecimalInput = (val: string): string => {
  if (!val) return '';
  const en = toEnglishDigits(val).replace(/[।\,]/g, '.');
  const clean = en.replace(/[^0-9.]/g, '');
  if (clean === '') return '';
  
  const parts = clean.split('.');
  let normalized = parts[0];
  if (parts.length > 1) {
    if (normalized === '') normalized = '0';
    normalized += '.' + parts.slice(1).join('');
  }
  return toBengaliInputDigits(normalized);
};

const parseInputNumber = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  const en = toEnglishDigits(String(val)).replace(/[^0-9.]/g, '');
  const n = parseFloat(en);
  return isNaN(n) ? 0 : n;
};

function InvoicesContent() {
  const router = useRouter();
  const { canEditInvoice, canDeleteInvoice, canCreateInvoice, canApproveInvoice, isViewer } = useAuth();
  const searchParams = useSearchParams();
  const convertOrderId = searchParams ? (searchParams.get('fromOrder') || searchParams.get('convert')) : null;
  const fromOrderId = convertOrderId;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allOrders, setAllOrders] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [engineers, setEngineers] = useState<EngineerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('সব');
  const [addPayment, setAddPayment] = useState(0);

  // Image-Matched Filter States
  const [filterInvoiceNo, setFilterInvoiceNo] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('all');
  const [filterEngineer, setFilterEngineer] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [filterSalesPerson, setFilterSalesPerson] = useState('all');
  const [filterInvoiceType, setFilterInvoiceType] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterStageStatus, setFilterStageStatus] = useState('all');
  const [filterApprovalStatus, setFilterApprovalStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [minBill, setMinBill] = useState('');
  const [maxBill, setMaxBill] = useState('');
  const [minDue, setMinDue] = useState('');
  const [maxDue, setMaxDue] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isQuickFilterExpanded, setIsQuickFilterExpanded] = useState(true);

  // Direct / Converted Invoice Creation Form States
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [convertedOrderId, setConvertedOrderId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingInvoiceMeta, setEditingInvoiceMeta] = useState<any>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedEngineer, setSelectedEngineer] = useState<EngineerOption | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', address: '' });
  
  // Cart & Item Selector States
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedCascadingProduct, setSelectedCascadingProduct] = useState<SelectedProductDetails | null>(null);
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemDiscount, setItemDiscount] = useState<number>(0);

  // Billing & Payment States
  const [invoicePaidAmountInput, setInvoicePaidAmountInput] = useState<string>('');
  const [cashPaidAmountInput, setCashPaidAmountInput] = useState<string>('');
  const [chequePaidAmountInput, setChequePaidAmountInput] = useState<string>('');
  const invoicePaidAmount = parseInputNumber(invoicePaidAmountInput);
  const cashPaidAmount = parseInputNumber(cashPaidAmountInput);
  const chequePaidAmount = parseInputNumber(chequePaidAmountInput);
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState<string>('Cash');
  const [invoiceDate, setInvoiceDate] = useState<string>('');
  const [invoiceNote, setInvoiceNote] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNo, setAccountNo] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [chequeNo, setChequeNo] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>('');
  const [savedBanks, setSavedBanks] = useState<{ id: string; name: string; accNo: string }[]>([]);
  const [selectedShopBank, setSelectedShopBank] = useState<string>('');
  const [senderBankName, setSenderBankName] = useState<string>('');
  const [senderAccountNo, setSenderAccountNo] = useState<string>('');
  const [senderTxnRef, setSenderTxnRef] = useState<string>('');

  // 1:1 Screenshot Extension States
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountPercentInput, setDiscountPercentInput] = useState<string>('');
  const [discountFlatInput, setDiscountFlatInput] = useState<string>('');
  const discountPercent = parseInputNumber(discountPercentInput);
  const discountFlat = parseInputNumber(discountFlatInput);
  const [paymentOption, setPaymentOption] = useState<'now' | 'later'>('now');
  const [preparedBy, setPreparedBy] = useState<string>('');
  const [authorizedBy, setAuthorizedBy] = useState<string>('');
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [warehouse, setWarehouse] = useState<string>('Main');

  // Rod & Cement Transport, Labor & Gate Pass States
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  
  // Customer Project/Delivery Sites State
  const [customerSites, setCustomerSites] = useState<CustomerSiteData[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('none');
  const [siteName, setSiteName] = useState<string>('');
  const [siteAddress, setSiteAddress] = useState<string>('');
  const [siteContact, setSiteContact] = useState<string>('');
  const [saveSiteForFuture, setSaveSiteForFuture] = useState<boolean>(true);
  const [isLoadingSites, setIsLoadingSites] = useState<boolean>(false);

  const loadSitesForCustomer = useCallback(async (custId?: string | number) => {
    if (!custId) {
      setCustomerSites([]);
      return;
    }
    setIsLoadingSites(true);
    try {
      const sites = await api.customerSites.list({ customer: custId });
      setCustomerSites(sites);
    } catch (err) {
      console.error('Error fetching customer sites:', err);
      setCustomerSites([]);
    } finally {
      setIsLoadingSites(false);
    }
  }, []);

  const handleSiteSelectionChange = (val: string | null) => {
    const activeVal = val || 'none';
    setSelectedSiteId(activeVal);
    if (activeVal === 'none') {
      setSiteName('');
      setSiteAddress('');
      setSiteContact('');
      setDeliveryAddress(selectedCustomer?.address || '');
    } else if (activeVal === 'new') {
      setSiteName('');
      setSiteAddress('');
      setSiteContact('');
      setDeliveryAddress('');
    } else {
      const site = customerSites.find(s => String(s.id) === String(activeVal));
      if (site) {
        setSiteName(site.name);
        setSiteAddress(site.address || '');
        const contactInfo = site.contact_person ? `${site.contact_person}${site.contact_phone ? ` (${site.contact_phone})` : ''}` : (site.contact_phone || '');
        setSiteContact(contactInfo);
        setDeliveryAddress(site.address || '');
      }
    }
  };
  
  // Rate-based vs manual extra charge states
  const [chargeCalcMode, setChargeCalcMode] = useState<'rate' | 'manual'>('rate');
  const [rodLaborRateInput, setRodLaborRateInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_rod_labor_rate');
      return saved ? formatDecimalInput(saved) : '';
    }
    return '';
  });
  const [rodLoadingToCustomerLedger, setRodLoadingToCustomerLedger] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_rod_loading_to_customer');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });
  const [rodUnloadingRateInput, setRodUnloadingRateInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_rod_unloading_rate');
      return saved ? formatDecimalInput(saved) : '';
    }
    return '';
  });
  const [rodUnloadingToCustomerLedger, setRodUnloadingToCustomerLedger] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_rod_unloading_to_customer');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });
  const [cementLaborRateInput, setCementLaborRateInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_cement_labor_rate');
      return saved ? formatDecimalInput(saved) : '';
    }
    return '';
  });
  const [cementLoadingToCustomerLedger, setCementLoadingToCustomerLedger] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_cement_loading_to_customer');
      if (saved !== null) return saved === 'true';
    }
    return false;
  });
  const [cementUnloadingRateInput, setCementUnloadingRateInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_cement_unloading_rate');
      return saved ? formatDecimalInput(saved) : '';
    }
    return '';
  });
  const [cementUnloadingToCustomerLedger, setCementUnloadingToCustomerLedger] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_cement_unloading_to_customer');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });
  const [shippingCostToCustomerLedger, setShippingCostToCustomerLedger] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_shipping_to_customer');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });
  const [shippingCostInput, setShippingCostInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_shipping_cost');
      return saved ? formatDecimalInput(saved) : '';
    }
    return '';
  });

  const [manualLaborCostInput, setManualLaborCostInput] = useState<string>('');
  const [engineerRodRateInput, setEngineerRodRateInput] = useState<string>('');
  const [engineerCementRateInput, setEngineerCementRateInput] = useState<string>('');

  const [rodLaborTotalInput, setRodLaborTotalInput] = useState<string>('');
  const [rodUnloadingTotalInput, setRodUnloadingTotalInput] = useState<string>('');
  const [cementLaborTotalInput, setCementLaborTotalInput] = useState<string>('');
  const [cementUnloadingTotalInput, setCementUnloadingTotalInput] = useState<string>('');
  const [rodShippingRateInput, setRodShippingRateInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_rod_shipping_rate');
      return saved ? formatDecimalInput(saved) : '';
    }
    return '';
  });
  const [cementShippingRateInput, setCementShippingRateInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_cement_shipping_rate');
      return saved ? formatDecimalInput(saved) : '';
    }
    return '';
  });

  const rodLaborRate = parseInputNumber(rodLaborRateInput);
  const rodUnloadingRate = parseInputNumber(rodUnloadingRateInput);
  const cementLaborRate = parseInputNumber(cementLaborRateInput);
  const cementUnloadingRate = parseInputNumber(cementUnloadingRateInput);
  const rodShippingRate = parseInputNumber(rodShippingRateInput);
  const cementShippingRate = parseInputNumber(cementShippingRateInput);
  const shippingCost = parseInputNumber(shippingCostInput);
  const manualShippingCost = shippingCost;
  const manualLaborCost = parseInputNumber(manualLaborCostInput);
  const engineerRodRate = parseInputNumber(engineerRodRateInput);
  const engineerCementRate = parseInputNumber(engineerCementRateInput);

  const [isGatePassOpen, setIsGatePassOpen] = useState<boolean>(false);
  const [isPrintMemoOpen, setIsPrintMemoOpen] = useState<boolean>(false);
  const [invoiceViewMode, setInvoiceViewMode] = useState<'details' | 'memo'>('details');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const handleSaveDefaultCharges = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dokan_sales_rod_labor_rate', (rodLaborRate || 0).toString());
      localStorage.setItem('dokan_sales_rod_loading_to_customer', rodLoadingToCustomerLedger.toString());
      localStorage.setItem('dokan_sales_rod_unloading_rate', (rodUnloadingRate || 0).toString());
      localStorage.setItem('dokan_sales_rod_unloading_to_customer', rodUnloadingToCustomerLedger.toString());
      localStorage.setItem('dokan_sales_cement_labor_rate', (cementLaborRate || 0).toString());
      localStorage.setItem('dokan_sales_cement_loading_to_customer', cementLoadingToCustomerLedger.toString());
      localStorage.setItem('dokan_sales_cement_unloading_rate', (cementUnloadingRate || 0).toString());
      localStorage.setItem('dokan_sales_cement_unloading_to_customer', cementUnloadingToCustomerLedger.toString());
      localStorage.setItem('dokan_sales_shipping_to_customer', shippingCostToCustomerLedger.toString());
      localStorage.setItem('dokan_sales_rod_shipping_rate', (rodShippingRate || 0).toString());
      localStorage.setItem('dokan_sales_cement_shipping_rate', (cementShippingRate || 0).toString());
      localStorage.setItem('dokan_sales_shipping_cost', (shippingCost || 0).toString());
      toast.success(`ডিফল্ট চার্জ সেভ করা হয়েছে (রড লোডিং: ৳${toBengaliDigits(rodLaborRate)}/কেজি [${rodLoadingToCustomerLedger ? 'লেজারে যুক্ত' : 'দোকান প্রদেয়'}], রড আনলোডিং: ৳${toBengaliDigits(rodUnloadingRate)}/কেজি [${rodUnloadingToCustomerLedger ? 'লেজারে যুক্ত' : 'দোকান প্রদেয়'}], সিমেন্ট লোডিং: ৳${toBengaliDigits(cementLaborRate)}/বস্তা [${cementLoadingToCustomerLedger ? 'লেজারে যুক্ত' : 'দোকান প্রদেয়'}], সিমেন্ট আনলোডিং: ৳${toBengaliDigits(cementUnloadingRate)}/বস্তা [${cementUnloadingToCustomerLedger ? 'লেজারে যুক্ত' : 'দোকান প্রদেয়'}]${shippingCost > 0 ? `, গাড়ি ভাড়া: ৳${toBengaliDigits(shippingCost)} [${shippingCostToCustomerLedger ? 'লেজারে যুক্ত' : 'দোকান প্রদেয়'}]` : ''})`);
    }
  };

  const loadInvoicesData = async () => {
    try {
      setLoading(true);
      const sales = await api.transactions.list({ transaction_type: 'sale' });
      const mappedInvoices: Invoice[] = sales
        .filter(s => {
          let meta: any = {};
          if (s.notes && typeof s.notes === 'string' && s.notes.trim().startsWith('{')) {
            try {
              meta = JSON.parse(s.notes.split('\n')[0]);
            } catch {}
          }
          // Do not list unconverted sales orders in invoices list until chalan is made
          if (meta.isOrder === true && !meta.invoiced) {
            return false;
          }
          return true;
        })
        .map(s => {
          let meta: any = {};
          let cleanNote = s.notes || '';
          if (s.notes) {
            try {
              if (s.notes.trim().startsWith('{')) {
                const idx = s.notes.indexOf('\n');
                const jsonStr = idx !== -1 ? s.notes.substring(0, idx) : s.notes;
                meta = JSON.parse(jsonStr);
                cleanNote = meta.userNote !== undefined ? meta.userNote : (idx !== -1 ? s.notes.substring(idx + 1) : '');
              }
            } catch {
              meta = {};
            }
          }

        return {
          id: String(s.id),
          orderId: s.invoice_no,
          customerName: s.party_name || 'গ্রাহক',
          customerPhone: s.party_phone || '',
          customerId: String(s.party || ''),
          engineerId: meta.engineerId || meta.engineer_id || '',
          engineerName: meta.engineerName || meta.engineer_name || '',
          engineerPhone: meta.engineerPhone || meta.engineer_phone || '',
          items: (s.items || []).map(i => ({
            id: String(i.product || ''),
            name: formatProductName(i.product_name),
            price: i.price,
            quantity: i.quantity,
            unit: i.unit || 'পিস',
            total: i.total
          })),
          subtotal: Number(s.subtotal || 0),
          discount: Number(s.discount || meta.discountFlat || 0),
          vatTax: Number(s.tax || 0),
          shippingCost: Number(meta.transportCost || meta.shippingCost || 0),
          laborCost: Number(meta.laborCost || 0),
          totalAmount: Number(s.total_amount || 0),
          paidAmount: Number(s.paid_amount || 0),
          dueAmount: Number(s.due_amount || 0),
          paymentStatus: s.due_amount <= 0 ? 'পরিশোধিত' : (s.paid_amount || 0) > 0 ? 'আংশিক' : 'বাকি',
          stage: s.status === 'pending' || s.status === 'draft' ? 'pending' : 'approved',
          status: s.status || 'pending',
          createdAt: s.created_at,
          customerSiteId: s.customer_site ? String(s.customer_site) : (meta.customerSiteId ? String(meta.customerSiteId) : ''),
          siteName: s.site_name || meta.siteName || meta.site_name || '',
          siteAddress: s.site_address || meta.siteAddress || meta.site_address || meta.deliveryAddress || '',
          siteContact: s.site_contact || meta.siteContact || meta.site_contact || '',
          vehicleNo: meta.vehicleNo || '',
          driverName: meta.driverName || '',
          driverPhone: meta.driverPhone || '',
          deliveryAddress: meta.deliveryAddress || '',
          note: cleanNote,
          paymentMethod: s.payment_method || 'cash',
          paymentMethodName: meta.paymentMethodName || s.payment_method || 'cash',
          bankName: meta.bankName || s.cheque_bank || '',
          accountNo: meta.accountNo || '',
          transactionRef: meta.transactionRef || '',
          receiverShopBank: meta.receiverShopBank || meta.selectedShopBank || '',
          senderBankName: meta.senderBankName || '',
          senderAccountNo: meta.senderAccountNo || '',
          senderTxnRef: meta.senderTxnRef || '',
          chequeNo: meta.chequeNo || s.cheque_number || '',
          chequeDate: meta.chequeDate || (s.cheque_due_date ? String(s.cheque_due_date) : ''),
          cashPaidAmount: Number(meta.cashPaidAmount || 0),
          chequePaidAmount: Number(meta.chequePaidAmount || 0),
          chargeCalcMode: meta.chargeCalcMode,
          rodLaborRate: meta.rodLaborRate !== undefined ? Number(meta.rodLaborRate) : undefined,
          rodShippingRate: meta.rodShippingRate !== undefined ? Number(meta.rodShippingRate) : undefined,
          rodLaborCost: meta.rodLaborCost !== undefined ? Number(meta.rodLaborCost) : undefined,
          rodShippingCost: meta.rodShippingCost !== undefined ? Number(meta.rodShippingCost) : undefined,
          rodRingTotalKg: meta.rodRingTotalKg !== undefined ? Number(meta.rodRingTotalKg) : undefined,
          rodLoadingToCustomerLedger: meta.rodLoadingToCustomerLedger !== undefined ? Boolean(meta.rodLoadingToCustomerLedger) : undefined,
          rodUnloadingRate: meta.rodUnloadingRate !== undefined ? Number(meta.rodUnloadingRate) : undefined,
          rodUnloadingCost: meta.rodUnloadingCost !== undefined ? Number(meta.rodUnloadingCost) : undefined,
          rodUnloadingToCustomerLedger: meta.rodUnloadingToCustomerLedger !== undefined ? Boolean(meta.rodUnloadingToCustomerLedger) : undefined,
          cementLaborRate: meta.cementLaborRate !== undefined ? Number(meta.cementLaborRate) : undefined,
          cementShippingRate: meta.cementShippingRate !== undefined ? Number(meta.cementShippingRate) : undefined,
          cementLaborCost: meta.cementLaborCost !== undefined ? Number(meta.cementLaborCost) : undefined,
          cementShippingCost: meta.cementShippingCost !== undefined ? Number(meta.cementShippingCost) : undefined,
          cementTotalBags: meta.cementTotalBags !== undefined ? Number(meta.cementTotalBags) : undefined,
          cementLoadingToCustomerLedger: meta.cementLoadingToCustomerLedger !== undefined ? Boolean(meta.cementLoadingToCustomerLedger) : undefined,
          cementUnloadingRate: meta.cementUnloadingRate !== undefined ? Number(meta.cementUnloadingRate) : undefined,
          cementUnloadingCost: meta.cementUnloadingCost !== undefined ? Number(meta.cementUnloadingCost) : undefined,
          cementUnloadingToCustomerLedger: meta.cementUnloadingToCustomerLedger !== undefined ? Boolean(meta.cementUnloadingToCustomerLedger) : undefined,
          shippingCostToCustomerLedger: meta.shippingCostToCustomerLedger !== undefined ? Boolean(meta.shippingCostToCustomerLedger) : (meta.shippingToCustomerLedger !== undefined ? Boolean(meta.shippingToCustomerLedger) : undefined),
          engineerRodRate: meta.engineerRodRate !== undefined ? Number(meta.engineerRodRate) : undefined,
          engineerCementRate: meta.engineerCementRate !== undefined ? Number(meta.engineerCementRate) : undefined,
          engineerRodKg: meta.engineerRodKg !== undefined ? Number(meta.engineerRodKg) : undefined,
          engineerCementBags: meta.engineerCementBags !== undefined ? Number(meta.engineerCementBags) : undefined,
          engineerRodCommission: meta.engineerRodCommission !== undefined ? Number(meta.engineerRodCommission) : undefined,
          engineerCementCommission: meta.engineerCementCommission !== undefined ? Number(meta.engineerCementCommission) : undefined,
          engineerTotalCommission: meta.engineerTotalCommission !== undefined ? Number(meta.engineerTotalCommission) : undefined
        };
      });
      setInvoices(mappedInvoices);
      setAllOrders(mappedInvoices);

      const prodList = await api.inventory.list();
      setProducts(prodList.map(p => ({
        id: String(p.id),
        name: formatProductName(p.name, p.category_name),
        sellPrice: Number(p.sell_price || 0),
        stock: Number(p.stock || 0),
        unit: p.unit || 'পিস',
        category: p.category_name || 'অন্যান্য'
      })));

      const partyList = await api.parties.list({ party_type: 'customer' });
      setCustomers(partyList.map(p => {
        const d = Number(p.total_due !== undefined ? p.total_due : (p.opening_balance || 0));
        return {
          id: String(p.id),
          name: p.name,
          phone: p.phone,
          address: p.address || '',
          businessName: p.business_name || '',
          totalDue: d,
          due: d,
          balance: d,
          previousDue: d,
          openingBalance: Number(p.opening_balance || 0),
          advanceBalance: Number(p.advance_balance || 0)
        };
      }));

      const engineerList = await api.parties.list({ party_type: 'engineer' }).catch(() => []);
      setEngineers(engineerList.map(p => {
        let rodCommissionRate = 0;
        let cementCommissionRate = 0;
        if (p.note && typeof p.note === 'string' && p.note.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(p.note.split('\n')[0]);
            rodCommissionRate = Number(parsed.rodCommissionRate || 0);
            cementCommissionRate = Number(parsed.cementCommissionRate || 0);
          } catch {}
        }
        return {
          id: String(p.id),
          name: p.name,
          phone: p.phone,
          address: p.address || '',
          businessName: p.business_name || '',
          customerType: p.customer_type || 'ইঞ্জিনিয়ার',
          totalDue: Number(p.total_due || 0),
          rodCommissionRate,
          cementCommissionRate
        };
      }));

      const bankList = await api.banks.list();
      setSavedBanks(bankList.map(b => ({
        id: String(b.id),
        name: b.name || b.bank_name || 'ব্যাংক',
        accNo: b.account_number || ''
      })));
    } catch (err) {
      console.error('Error loading invoices page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadInvoicesData();
    })();
    return () => { ignore = true; };
  }, []);

  // Handle pre-filling form if arriving from /orders with ?fromOrder={id}
  useEffect(() => {
    if (!fromOrderId) return;
    if (convertedOrderId === fromOrderId && isCreateInvoiceOpen) return;

    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        // Fetch raw order transaction directly by ID
        const raw = await api.transactions.get(fromOrderId);
        if (!raw || !isMounted) return;

        // Ensure customers are available for matching
        let currentCustList = customers;
        if (currentCustList.length === 0) {
          const partyList = await api.parties.list({ party_type: 'customer' }).catch(() => []);
          currentCustList = partyList.map(p => {
            const d = Number(p.total_due !== undefined ? p.total_due : (p.opening_balance || 0));
            return {
              id: String(p.id),
              name: p.name,
              phone: p.phone,
              address: p.address || '',
              businessName: p.business_name || '',
              totalDue: d,
              due: d,
              balance: d,
              previousDue: d,
              openingBalance: Number(p.opening_balance || 0)
            };
          });
          setCustomers(currentCustList);
        }

        const rawPartyId = raw.party ? String(raw.party) : '';
        const foundCust = currentCustList.find(c => (rawPartyId && c.id === rawPartyId) || (raw.party_name && c.name?.trim().toLowerCase() === raw.party_name?.trim().toLowerCase()));

        if (foundCust) {
          setSelectedCustomer(foundCust);
          setIsNewCustomer(false);
          loadSitesForCustomer(foundCust.id);
        } else {
          setSelectedCustomer(null);
          setIsNewCustomer(true);
          setNewCustomerData({
            name: raw.party_name || 'গ্রাহক',
            phone: raw.party_phone || '',
            address: ''
          });
          setCustomerSites([]);
        }

        // Check for site details in order
        let parsedOrderMeta: any = {};
        if (raw.notes && raw.notes.trim().startsWith('{')) {
          try {
            parsedOrderMeta = JSON.parse(raw.notes.split('\n')[0]);
          } catch {}
        }
        const orderSiteId = raw.customer_site ? String(raw.customer_site) : (parsedOrderMeta.customerSiteId ? String(parsedOrderMeta.customerSiteId) : '');
        const orderSiteName = raw.site_name || parsedOrderMeta.siteName || '';
        const orderSiteAddress = raw.site_address || parsedOrderMeta.siteAddress || '';
        const orderSiteContact = raw.site_contact || parsedOrderMeta.siteContact || '';
        if (orderSiteId) {
          setSelectedSiteId(orderSiteId);
        } else if (orderSiteName) {
          setSelectedSiteId('new');
        } else {
          setSelectedSiteId('none');
        }
        setSiteName(orderSiteName);
        setSiteAddress(orderSiteAddress);
        setSiteContact(orderSiteContact);

        // Map order items to invoice cart items
        const rawItems: OrderItem[] = (raw.items || []).map(i => ({
          id: String(i.product || i.id || ''),
          name: formatProductName(i.product_name),
          price: Number(i.price || 0),
          quantity: Number(i.quantity || 1),
          unit: i.unit || 'পিস',
          total: Number(i.total || (Number(i.price || 0) * Number(i.quantity || 1)))
        }));

        setCart(rawItems);
        const orderPaid = Number(raw.paid_amount || 0);
        setInvoicePaidAmountInput(orderPaid > 0 ? formatDecimalInput(String(orderPaid)) : '');
        if (parsedOrderMeta.paymentOption) {
          setPaymentOption(parsedOrderMeta.paymentOption);
        } else if (orderPaid > 0) {
          setPaymentOption('now');
        }
        if (parsedOrderMeta.paymentMethodName) {
          setInvoicePaymentMethod(parsedOrderMeta.paymentMethodName);
        }
        if (parsedOrderMeta.cashPaidAmount) {
          setCashPaidAmountInput(formatDecimalInput(String(parsedOrderMeta.cashPaidAmount)));
        } else if (orderPaid > 0 && (!parsedOrderMeta.paymentMethodName || parsedOrderMeta.paymentMethodName === 'Cash')) {
          setCashPaidAmountInput(formatDecimalInput(String(orderPaid)));
        }
        if (parsedOrderMeta.chequePaidAmount) {
          setChequePaidAmountInput(formatDecimalInput(String(parsedOrderMeta.chequePaidAmount)));
        }
        if (parsedOrderMeta.bankName) {
          setBankName(parsedOrderMeta.bankName);
        }
        if (parsedOrderMeta.chequeNo) {
          setChequeNo(parsedOrderMeta.chequeNo);
        }
        if (parsedOrderMeta.chequeDate) {
          setChequeDate(parsedOrderMeta.chequeDate);
        }
        if (parsedOrderMeta.receiverShopBank) {
          setSelectedShopBank(parsedOrderMeta.receiverShopBank);
        }
        if (parsedOrderMeta.transactionRef) {
          setTransactionRef(parsedOrderMeta.transactionRef);
        }
        if (parsedOrderMeta.senderBankName) {
          setSenderBankName(parsedOrderMeta.senderBankName);
        }
        if (parsedOrderMeta.senderAccountNo) {
          setSenderAccountNo(parsedOrderMeta.senderAccountNo);
        }
        if (parsedOrderMeta.senderTxnRef) {
          setSenderTxnRef(parsedOrderMeta.senderTxnRef);
        }
        
        if (parsedOrderMeta.rodLoadingToCustomerLedger !== undefined) {
          setRodLoadingToCustomerLedger(Boolean(parsedOrderMeta.rodLoadingToCustomerLedger));
        }
        if (parsedOrderMeta.rodUnloadingToCustomerLedger !== undefined) {
          setRodUnloadingToCustomerLedger(Boolean(parsedOrderMeta.rodUnloadingToCustomerLedger));
        }
        if (parsedOrderMeta.cementLoadingToCustomerLedger !== undefined) {
          setCementLoadingToCustomerLedger(Boolean(parsedOrderMeta.cementLoadingToCustomerLedger));
        }
        if (parsedOrderMeta.cementUnloadingToCustomerLedger !== undefined) {
          setCementUnloadingToCustomerLedger(Boolean(parsedOrderMeta.cementUnloadingToCustomerLedger));
        }
        if (parsedOrderMeta.shippingCostToCustomerLedger !== undefined) {
          setShippingCostToCustomerLedger(Boolean(parsedOrderMeta.shippingCostToCustomerLedger));
        } else if (parsedOrderMeta.shippingToCustomerLedger !== undefined) {
          setShippingCostToCustomerLedger(Boolean(parsedOrderMeta.shippingToCustomerLedger));
        }

        let cleanNote = raw.notes || '';
        if (cleanNote.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(cleanNote.split('\n')[0]);
            cleanNote = parsed.userNote || '';
          } catch {}
        }
        setInvoiceNote(cleanNote);

        // Check for engineer metadata in order
        if (raw.notes && raw.notes.trim().startsWith('{')) {
          try {
            const parsedMeta = JSON.parse(raw.notes.split('\n')[0]);
            if (parsedMeta.engineerName || parsedMeta.engineerId) {
              setSelectedEngineer({
                id: parsedMeta.engineerId || 'eng-order',
                name: parsedMeta.engineerName,
                phone: parsedMeta.engineerPhone || ''
              });
            } else {
              setSelectedEngineer(null);
            }
          } catch {
            setSelectedEngineer(null);
          }
        } else {
          setSelectedEngineer(null);
        }

        setConvertedOrderId(String(raw.id));
        setEditingInvoiceId(null);
        setIsCreateInvoiceOpen(true);
        toast.info('বিক্রয় অর্ডারের তথ্য নিয়ে চালানের ফর্ম ওপেন হয়েছে।');
      } catch (err) {
        console.error('Error opening order for invoice:', err);
        toast.error('অর্ডারের তথ্য লোড করতে সমস্যা হয়েছে');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromOrderId]);

  const formatDate = (at: any) => {
    if (!at) return '';
    try {
      const date = at?.toDate ? at.toDate() : new Date(at);
      if (isNaN(date.getTime())) return '';
      return toBengaliDigits(format(date, 'dd MMMM yyyy, hh:mm a', { locale: bn }));
    } catch {
      return '';
    }
  };

  // Cart Add Item
  const handleAddCartItem = () => {
    const itemName = selectedCascadingProduct?.name || products.find(p => p.id === selectedProductId)?.name;
    if (!itemName) {
      toast.error('পণ্য নির্বাচন করুন');
      return;
    }

    const foundProd = products.find(p => p.id === (selectedCascadingProduct?.productId || selectedProductId) || p.name === itemName);
    const availableStock = Number(foundProd?.stock ?? selectedCascadingProduct?.stock ?? 0);

    if (availableStock <= 0) {
      toast.error('⚠️ পণ্যটি স্টকে নেই! বিক্রয় চালানে কেবল স্টকে থাকা পণ্য যোগ করা যাবে।');
      return;
    }

    const requestedQty = parseFloat(String(itemQty)) || 1;
    const existing = cart.find(i => i.name === itemName || (foundProd && String(i.id) === String(foundProd.id)));
    const currentInCart = existing ? Number(existing.quantity) : 0;

    const parsedItem = parseProductDetails({ name: itemName, category: selectedCascadingProduct?.category || (foundProd as any)?.category });
    const isRing = parsedItem.categoryName === 'রিং' || itemName.includes('রিং');
    const itemUnitToUse = isRing ? 'কেজি' : (selectedCascadingProduct?.unit || foundProd?.unit || 'পিস');

    if (currentInCart + requestedQty > availableStock) {
      toast.error(`⚠️ স্টকে মাত্র ${availableStock} ${itemUnitToUse} রয়েছে! (কার্টে ইতিমধ্যে আছে: ${currentInCart} ${itemUnitToUse}), এর বেশি যোগ করা সম্ভব নয়।`);
      return;
    }

    const itemId = selectedCascadingProduct?.productId || selectedProductId || foundProd?.id || String(Date.now());
    const finalPrice = itemPrice || selectedCascadingProduct?.price || foundProd?.sellPrice || 0;

    setCart(prev => {
      const existingItem = prev.find(i => i.name === itemName || String(i.id) === String(itemId));
      if (existingItem) {
        const updatedQty = Math.round((existingItem.quantity + requestedQty) * 100) / 100;
        return prev.map(i => (i.name === itemName || String(i.id) === String(itemId)) ? { 
          ...i, 
          quantity: updatedQty, 
          price: finalPrice, 
          discount: itemDiscount,
          total: Math.round(finalPrice * updatedQty * 100) / 100
        } : i);
      }
      return [...prev, {
        id: itemId,
        name: itemName,
        category: selectedCascadingProduct?.category || (foundProd as any)?.category,
        brand: selectedCascadingProduct?.brand || (foundProd as any)?.brand,
        mmSize: selectedCascadingProduct?.mmSize,
        unit: itemUnitToUse,
        price: finalPrice,
        quantity: requestedQty,
        discount: itemDiscount || 0,
        total: Math.round(finalPrice * requestedQty * 100) / 100
      }];
    });

    setSelectedProductId('');
    setItemQty(1);
    setItemPrice(0);
    setItemDiscount(0);
  };

  const handleRemoveCartItem = (id?: string | number, index?: number) => {
    if (index !== undefined) {
      setCart(prev => prev.filter((_, idx) => idx !== index));
      return;
    }
    if (id === undefined || id === null) return;
    setCart(prev => prev.filter(i => String(i.id) !== String(id)));
  };

  const handleUpdateCartQty = (id: string | number, newQty: number, index?: number) => {
    if (newQty <= 0) return;
    const targetItem = cart.find((i, idx) => index !== undefined ? idx === index : String(i.id) === String(id));
    if (targetItem) {
      const foundProd = products.find(p => p.id === String(targetItem.id) || p.name === targetItem.name);
      const availableStock = Number(foundProd?.stock || 0);
      if (availableStock > 0 && newQty > availableStock) {
        toast.error(`⚠️ স্টকে মাত্র ${availableStock} ${targetItem.unit || 'পিস'} রয়েছে, এর বেশি বিক্রি করা সম্ভব নয়!`);
        newQty = availableStock;
      }
    }
    const cleanQty = Math.round(newQty * 100) / 100;
    setCart(prev => prev.map((i, idx) => {
      if (index !== undefined && idx === index) return { ...i, quantity: cleanQty, total: Math.round((i.price || 0) * cleanQty * 100) / 100 };
      if (String(i.id) === String(id)) return { ...i, quantity: cleanQty, total: Math.round((i.price || 0) * cleanQty * 100) / 100 };
      return i;
    }));
  };

  // Helper to prevent floating point precision issues in DecimalField API validation
  const round2 = (val: number) => Math.round((Number(val) || 0) * 100) / 100;

  // Category-specific quantity calculations (Rod/Ring in KG, Cement in Bags)
  const rodRingTotalKg = useMemo(() => {
    return round2(cart.reduce((sum, item) => {
      const parsed = parseProductDetails(item);
      const isRod = parsed.categoryName === 'রড' || 
        item.category === 'রড' || 
        (item.unit || '').includes('কেজি') || 
        (item.unit || '').toLowerCase().includes('kg') || 
        (item.unit || '').includes('টন') || 
        (item.unit || '').toLowerCase().includes('ton') || 
        (item.name || '').includes('রড') || 
        (item.name || '').includes('মিলি') || 
        (item.name || '').includes('মি.লি') || 
        (item.name || '').includes('মি.মি') || 
        (item.name || '').includes('মিমি');
      const isRing = parsed.categoryName === 'রিং' || 
        item.category === 'রিং' || 
        (item.name || '').includes('রিং') || 
        (item.name || '').toLowerCase().includes('ring');
      if (isRod || isRing) {
        const isTon = (item.unit || '').toLowerCase().includes('ton') || (item.unit || '').includes('টন');
        return sum + (Number(item.quantity) || 0) * (isTon ? 1000 : 1);
      }
      return sum;
    }, 0));
  }, [cart]);

  const cementTotalBags = useMemo(() => {
    return round2(cart.reduce((sum, item) => {
      const parsed = parseProductDetails(item);
      const isCement = parsed.categoryName === 'সিমেন্ট' || 
        item.category === 'সিমেন্ট' || 
        (item.unit || '').includes('বস্তা') || 
        (item.unit || '').includes('ব্যাগ') || 
        (item.unit || '').toLowerCase().includes('bag') || 
        (item.name || '').includes('সিমেন্ট') || 
        (item.name || '').toLowerCase().includes('cement');
      if (isCement) {
        return sum + (Number(item.quantity) || 0);
      }
      return sum;
    }, 0));
  }, [cart]);

  // Reactive automatic rate * quantity calculations
  const rodLaborAuto = round2(rodRingTotalKg * (rodLaborRate || 0));
  const rodLaborTotal = chargeCalcMode === 'rate'
    ? (rodRingTotalKg > 0
        ? (rodLaborTotalInput !== '' ? parseInputNumber(rodLaborTotalInput) : rodLaborAuto)
        : 0)
    : 0;
  
  const rodUnloadingAuto = round2(rodRingTotalKg * (rodUnloadingRate || 0));
  const rodUnloadingTotal = chargeCalcMode === 'rate'
    ? (rodRingTotalKg > 0
        ? (rodUnloadingTotalInput !== '' ? parseInputNumber(rodUnloadingTotalInput) : rodUnloadingAuto)
        : 0)
    : 0;
  const rodShippingTotal = 0;

  const cementLaborAuto = round2(cementTotalBags * (cementLaborRate || 0));
  const cementLaborTotal = chargeCalcMode === 'rate'
    ? (cementTotalBags > 0
        ? (cementLaborTotalInput !== '' ? parseInputNumber(cementLaborTotalInput) : cementLaborAuto)
        : 0)
    : 0;

  const cementUnloadingAuto = round2(cementTotalBags * (cementUnloadingRate || 0));
  const cementUnloadingTotal = chargeCalcMode === 'rate'
    ? (cementTotalBags > 0
        ? (cementUnloadingTotalInput !== '' ? parseInputNumber(cementUnloadingTotalInput) : cementUnloadingAuto)
        : 0)
    : 0;
  const cementShippingTotal = 0;

  // Rate change handlers: clears manual override so that changing rate immediately recalculates from weight/bags
  const handleRodLaborRateChange = (val: string) => {
    const formatted = formatDecimalInput(val);
    setRodLaborRateInput(formatted);
    setRodLaborTotalInput('');
  };

  const handleRodUnloadingRateChange = (val: string) => {
    const formatted = formatDecimalInput(val);
    setRodUnloadingRateInput(formatted);
    setRodUnloadingTotalInput('');
  };

  const handleCementLaborRateChange = (val: string) => {
    const formatted = formatDecimalInput(val);
    setCementLaborRateInput(formatted);
    setCementLaborTotalInput('');
  };

  const handleCementUnloadingRateChange = (val: string) => {
    const formatted = formatDecimalInput(val);
    setCementUnloadingRateInput(formatted);
    setCementUnloadingTotalInput('');
  };

  const handleRodShippingRateChange = (val: string) => {
    const formatted = formatDecimalInput(val);
    setRodShippingRateInput(formatted);
    const rRate = parseInputNumber(formatted);
    const cRate = parseInputNumber(cementShippingRateInput);
    const total = round2((rodRingTotalKg * rRate) + (cementTotalBags * cRate));
    if (total > 0) {
      setShippingCostInput(formatDecimalInput(String(total)));
    }
  };

  const handleCementShippingRateChange = (val: string) => {
    const formatted = formatDecimalInput(val);
    setCementShippingRateInput(formatted);
    const cRate = parseInputNumber(formatted);
    const rRate = parseInputNumber(rodShippingRateInput);
    const total = round2((rodRingTotalKg * rRate) + (cementTotalBags * cRate));
    if (total > 0) {
      setShippingCostInput(formatDecimalInput(String(total)));
    }
  };

  // Labor charges added to customer bill/ledger depending on each individual toggle
  const effectiveRodLoading = rodLoadingToCustomerLedger ? rodLaborTotal : 0;
  const effectiveRodUnloading = rodUnloadingToCustomerLedger ? rodUnloadingTotal : 0;
  const effectiveCementLoading = cementLoadingToCustomerLedger ? cementLaborTotal : 0;
  const effectiveCementUnloading = cementUnloadingToCustomerLedger ? cementUnloadingTotal : 0;

  const laborCost = chargeCalcMode === 'rate' 
    ? round2(effectiveRodLoading + effectiveRodUnloading + effectiveCementLoading + effectiveCementUnloading) 
    : manualLaborCost;
  // Note: shippingCost (vehicle rent) is directly entered as a flat amount and parsed above

  // Engineer Commission Calculations (Per KG for Rod, Per Bag for Cement)
  const engineerRodCommission = round2(rodRingTotalKg * (engineerRodRate || 0));
  const engineerCementCommission = round2(cementTotalBags * (engineerCementRate || 0));
  const engineerTotalCommission = round2(engineerRodCommission + engineerCementCommission);

  // Cart Calculations matching 1:1 Screenshot (Cement loading is borne by shop, not added to customer bill)
  const cartSubtotal = round2(cart.reduce((a, i) => a + (i.price * i.quantity), 0));
  const computedDiscount = discountType === 'percentage' 
    ? round2((cartSubtotal * (discountPercent || 0)) / 100) 
    : round2(discountFlat || 0);
  const cartTotalDiscount = round2(computedDiscount + cart.reduce((a, i) => a + ((i.discount || 0) * i.quantity), 0));
  const effectiveShippingCost = shippingCostToCustomerLedger ? (shippingCost || 0) : 0;
  const cartTotalAmount = round2(Math.max(0, cartSubtotal - cartTotalDiscount + effectiveShippingCost + (laborCost || 0)));

  // Total Paid considering Split payment or single payment
  const isSplitPayment = invoicePaymentMethod === 'Split';
  const totalReceivedPayment = round2(paymentOption === 'later'
    ? 0
    : (isSplitPayment
      ? ((cashPaidAmount || 0) + (chequePaidAmount || 0))
      : (invoicePaidAmount || 0)));

  const cartDueAmount = round2(paymentOption === 'now' ? Math.max(0, cartTotalAmount - totalReceivedPayment) : cartTotalAmount);

  // Selected Customer Existing Due & Advance Calculation
  const selectedCustomerDue = selectedCustomer 
    ? Number(selectedCustomer.totalDue !== undefined ? selectedCustomer.totalDue : (selectedCustomer.due || 0))
    : 0;
  const selectedCustomerAdvance = selectedCustomer 
    ? Number(selectedCustomer.advanceBalance || 0)
    : 0;
  const netPayableWithPrevious = selectedCustomerAdvance > 0
    ? Math.max(0, cartTotalAmount - selectedCustomerAdvance)
    : (cartTotalAmount + selectedCustomerDue);

  const resetCreateForm = () => {
    setEditingInvoiceId(null);
    setConvertedOrderId(null);
    setSelectedCustomer(null);
    setSelectedEngineer(null);
    setIsNewCustomer(false);
    setNewCustomerData({ name: '', phone: '', address: '' });
    setCart([]);
    setSelectedProductId('');
    setItemQty(1);
    setItemPrice(0);
    setItemDiscount(0);
    setInvoicePaidAmountInput('');
    setCashPaidAmountInput('');
    setChequePaidAmountInput('');
    setBankName('');
    setChequeNo('');
    setChequeDate('');
    setInvoicePaymentMethod('Cash');
    setInvoiceNote('');
    setDiscountType('percentage');
    setDiscountPercentInput('');
    setDiscountFlatInput('');
    setPaymentOption('now');
    setPreparedBy('');
    setAuthorizedBy('');
    setReceivedBy('');
    setWarehouse('Main');
    setVehicleNo('');
    setDriverName('');
    setDriverPhone('');
    setDeliveryAddress('');
    setCustomerSites([]);
    setSelectedSiteId('none');
    setSiteName('');
    setSiteAddress('');
    setSiteContact('');
    setSaveSiteForFuture(true);
    
    // Load default per-unit rates from localStorage
    const defRodLab = typeof window !== 'undefined' ? (localStorage.getItem('dokan_sales_rod_labor_rate') || '') : '';
    const defRodLoadToCust = typeof window !== 'undefined' ? localStorage.getItem('dokan_sales_rod_loading_to_customer') : null;
    const defRodUnload = typeof window !== 'undefined' ? (localStorage.getItem('dokan_sales_rod_unloading_rate') || '') : '';
    const defRodUnloadToCust = typeof window !== 'undefined' ? localStorage.getItem('dokan_sales_rod_unloading_to_customer') : null;
    const defCemLab = typeof window !== 'undefined' ? (localStorage.getItem('dokan_sales_cement_labor_rate') || '') : '';
    const defCemLoadToCust = typeof window !== 'undefined' ? localStorage.getItem('dokan_sales_cement_loading_to_customer') : null;
    const defCemUnload = typeof window !== 'undefined' ? (localStorage.getItem('dokan_sales_cement_unloading_rate') || '') : '';
    const defShip = typeof window !== 'undefined' ? (localStorage.getItem('dokan_sales_shipping_cost') || '') : '';
    const defRodShip = typeof window !== 'undefined' ? (localStorage.getItem('dokan_sales_rod_shipping_rate') || '') : '';
    const defCemShip = typeof window !== 'undefined' ? (localStorage.getItem('dokan_sales_cement_shipping_rate') || '') : '';

    setRodLaborRateInput(defRodLab ? formatDecimalInput(defRodLab) : '');
    setRodLaborTotalInput('');
    setRodLoadingToCustomerLedger(defRodLoadToCust !== null ? defRodLoadToCust === 'true' : true);
    setRodUnloadingRateInput(defRodUnload ? formatDecimalInput(defRodUnload) : '');
    setRodUnloadingTotalInput('');
    setRodUnloadingToCustomerLedger(defRodUnloadToCust !== null ? defRodUnloadToCust === 'true' : true);
    setCementLaborRateInput(defCemLab ? formatDecimalInput(defCemLab) : '');
    setCementLaborTotalInput('');
    setCementLoadingToCustomerLedger(defCemLoadToCust !== null ? defCemLoadToCust === 'true' : false);
    setCementUnloadingRateInput(defCemUnload ? formatDecimalInput(defCemUnload) : '');
    setCementUnloadingTotalInput('');
    const defCemUnloadToCust = typeof window !== 'undefined' ? localStorage.getItem('dokan_sales_cement_unloading_to_customer') : null;
    setCementUnloadingToCustomerLedger(defCemUnloadToCust !== null ? defCemUnloadToCust === 'true' : true);
    const defShipToCust = typeof window !== 'undefined' ? localStorage.getItem('dokan_sales_shipping_to_customer') : null;
    setShippingCostToCustomerLedger(defShipToCust !== null ? defShipToCust === 'true' : true);
    setRodShippingRateInput(defRodShip ? formatDecimalInput(defRodShip) : '');
    setCementShippingRateInput(defCemShip ? formatDecimalInput(defCemShip) : '');
    setShippingCostInput(defShip ? formatDecimalInput(defShip) : '');
    setChargeCalcMode('rate');
    setManualLaborCostInput('');
    setEngineerRodRateInput('');
    setEngineerCementRateInput('');
    setEditingInvoiceId(null);
    setEditingInvoiceMeta(null);

    if (fromOrderId) {
      router.replace('/invoices');
    }
  };

  // Open Edit Invoice Overlay
  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    const cust = customers.find(c => c.id === inv.customerId || c.name === inv.customerName);
    if (cust) {
      setSelectedCustomer(cust);
      setIsNewCustomer(false);
    } else {
      setSelectedCustomer(null);
      setIsNewCustomer(true);
      setNewCustomerData({
        name: inv.customerName || '',
        phone: inv.customerPhone || '',
        address: inv.customerAddress || ''
      });
    }

    const eng = engineers.find(e => e.id === inv.engineerId || e.name === inv.engineerName);
    if (eng) {
      setSelectedEngineer(eng);
      setEngineerRodRateInput(inv.engineerRodRate !== undefined ? formatDecimalInput(String(inv.engineerRodRate)) : (eng.rodCommissionRate ? formatDecimalInput(String(eng.rodCommissionRate)) : ''));
      setEngineerCementRateInput(inv.engineerCementRate !== undefined ? formatDecimalInput(String(inv.engineerCementRate)) : (eng.cementCommissionRate ? formatDecimalInput(String(eng.cementCommissionRate)) : ''));
    } else if (inv.engineerName) {
      setSelectedEngineer({
        id: inv.engineerId || 'custom-eng',
        name: inv.engineerName,
        phone: inv.engineerPhone || '',
        rodCommissionRate: inv.engineerRodRate || 0,
        cementCommissionRate: inv.engineerCementRate || 0
      });
      setEngineerRodRateInput(inv.engineerRodRate !== undefined ? formatDecimalInput(String(inv.engineerRodRate)) : '');
      setEngineerCementRateInput(inv.engineerCementRate !== undefined ? formatDecimalInput(String(inv.engineerCementRate)) : '');
    } else {
      setSelectedEngineer(null);
      setEngineerRodRateInput('');
      setEngineerCementRateInput('');
    }

    setCart(inv.items ? inv.items.map(i => ({ ...i })) : []);
    
    // Parse existing invoice metadata to preserve across edits
    let rawMeta: any = {};
    const rawNoteStr = (inv as any).notes || inv.note || '';
    if (rawNoteStr && typeof rawNoteStr === 'string' && rawNoteStr.trim().startsWith('{')) {
      try {
        rawMeta = JSON.parse(rawNoteStr.split('\n')[0]);
      } catch {}
    }
    setEditingInvoiceMeta(rawMeta);

    const currentMethod = inv.paymentMethod || rawMeta.paymentMethodName || 'Cash';
    setInvoicePaymentMethod(currentMethod);

    const paidAmt = Number(inv.paidAmount || 0);
    if (paidAmt > 0) {
      setPaymentOption('now');
      setInvoicePaidAmountInput(formatDecimalInput(String(paidAmt)));
      if (currentMethod === 'Split') {
        setCashPaidAmountInput((inv as any).cashAmount || (inv as any).cashPaidAmount || rawMeta.cashPaidAmount ? formatDecimalInput(String((inv as any).cashAmount || (inv as any).cashPaidAmount || rawMeta.cashPaidAmount)) : '');
        setChequePaidAmountInput((inv as any).chequeAmount || (inv as any).chequePaidAmount || rawMeta.chequePaidAmount ? formatDecimalInput(String((inv as any).chequeAmount || (inv as any).chequePaidAmount || rawMeta.chequePaidAmount)) : '');
      } else {
        setCashPaidAmountInput('');
        setChequePaidAmountInput('');
      }
    } else {
      setPaymentOption('later');
      setInvoicePaidAmountInput('');
      setCashPaidAmountInput('');
      setChequePaidAmountInput('');
    }

    setBankName((inv as any).bankName || rawMeta.bankName || '');
    setChequeNo((inv as any).chequeNo || rawMeta.chequeNo || '');
    setChequeDate((inv as any).chequeDate || rawMeta.chequeDate || '');
    setInvoiceNote(inv.note || rawMeta.userNote || '');
    
    // Vehicle Fare (Flat carriage) & Labor
    const invAny = inv as any;
    if (invAny.shippingCost !== undefined || invAny.transportCost !== undefined) {
      setShippingCostInput(formatDecimalInput(String(invAny.shippingCost || invAny.transportCost || '')));
    } else if (invAny.rodShippingCost || invAny.cementShippingCost) {
      const legacyShip = Number(invAny.rodShippingCost || 0) + Number(invAny.cementShippingCost || 0);
      setShippingCostInput(legacyShip > 0 ? formatDecimalInput(String(legacyShip)) : '');
    } else {
      setShippingCostInput('');
    }

    if (invAny.laborCost !== undefined || invAny.manualLaborCost !== undefined) {
      setManualLaborCostInput(formatDecimalInput(String(invAny.laborCost || invAny.manualLaborCost || '')));
    } else {
      setManualLaborCostInput('');
    }

    setVehicleNo(inv.vehicleNo || '');
    setDriverName(inv.driverName || '');
    setDriverPhone(inv.driverPhone || '');
    setDeliveryAddress(inv.deliveryAddress || inv.customerAddress || '');

    // Restore customer site fields
    const targetCustId = cust?.id || inv.customerId;
    if (targetCustId) {
      loadSitesForCustomer(targetCustId);
    }
    if (inv.customerSiteId) {
      setSelectedSiteId(String(inv.customerSiteId));
    } else if (inv.siteName) {
      setSelectedSiteId('new');
    } else {
      setSelectedSiteId('none');
    }
    setSiteName(inv.siteName || '');
    setSiteAddress(inv.siteAddress || '');
    setSiteContact(inv.siteContact || '');
    setSaveSiteForFuture(true);

    if (invAny.rodLaborRate !== undefined) setRodLaborRateInput(formatDecimalInput(String(invAny.rodLaborRate || '')));
    if (invAny.rodLaborCost !== undefined) setRodLaborTotalInput(formatDecimalInput(String(invAny.rodLaborCost || '')));
    else if (invAny.rodLaborRate && invAny.rodRingTotalKg) setRodLaborTotalInput(formatDecimalInput(String(round2(invAny.rodLaborRate * invAny.rodRingTotalKg))));
    else setRodLaborTotalInput('');

    if (invAny.rodLoadingToCustomerLedger !== undefined) {
      setRodLoadingToCustomerLedger(Boolean(invAny.rodLoadingToCustomerLedger));
    } else {
      setRodLoadingToCustomerLedger(true);
    }

    if (invAny.rodUnloadingRate !== undefined) setRodUnloadingRateInput(formatDecimalInput(String(invAny.rodUnloadingRate || '')));
    if (invAny.rodUnloadingCost !== undefined) setRodUnloadingTotalInput(formatDecimalInput(String(invAny.rodUnloadingCost || '')));
    else if (invAny.rodUnloadingRate && invAny.rodRingTotalKg) setRodUnloadingTotalInput(formatDecimalInput(String(round2(invAny.rodUnloadingRate * invAny.rodRingTotalKg))));
    else setRodUnloadingTotalInput('');

    if (invAny.rodUnloadingToCustomerLedger !== undefined) {
      setRodUnloadingToCustomerLedger(Boolean(invAny.rodUnloadingToCustomerLedger));
    } else {
      setRodUnloadingToCustomerLedger(true);
    }

    if (invAny.cementLaborRate !== undefined) setCementLaborRateInput(formatDecimalInput(String(invAny.cementLaborRate || '')));
    if (invAny.cementLaborCost !== undefined) setCementLaborTotalInput(formatDecimalInput(String(invAny.cementLaborCost || '')));
    else if (invAny.cementLaborRate && invAny.cementTotalBags) setCementLaborTotalInput(formatDecimalInput(String(round2(invAny.cementLaborRate * invAny.cementTotalBags))));
    else setCementLaborTotalInput('');

    if (invAny.cementLoadingToCustomerLedger !== undefined) {
      setCementLoadingToCustomerLedger(Boolean(invAny.cementLoadingToCustomerLedger));
    } else {
      setCementLoadingToCustomerLedger(false);
    }

    if (invAny.cementUnloadingRate !== undefined) setCementUnloadingRateInput(formatDecimalInput(String(invAny.cementUnloadingRate || '')));
    if (invAny.cementUnloadingCost !== undefined) setCementUnloadingTotalInput(formatDecimalInput(String(invAny.cementUnloadingCost || '')));
    else if (invAny.cementUnloadingRate && invAny.cementTotalBags) setCementUnloadingTotalInput(formatDecimalInput(String(round2(invAny.cementUnloadingRate * invAny.cementTotalBags))));
    else setCementUnloadingTotalInput('');

    if (invAny.cementUnloadingToCustomerLedger !== undefined) {
      setCementUnloadingToCustomerLedger(Boolean(invAny.cementUnloadingToCustomerLedger));
    } else {
      setCementUnloadingToCustomerLedger(true);
    }
    if (invAny.shippingCostToCustomerLedger !== undefined) {
      setShippingCostToCustomerLedger(Boolean(invAny.shippingCostToCustomerLedger));
    } else if (invAny.shippingToCustomerLedger !== undefined) {
      setShippingCostToCustomerLedger(Boolean(invAny.shippingToCustomerLedger));
    } else {
      setShippingCostToCustomerLedger(true);
    }
    if (invAny.rodShippingRate !== undefined) setRodShippingRateInput(formatDecimalInput(String(invAny.rodShippingRate || '')));
    if (invAny.cementShippingRate !== undefined) setCementShippingRateInput(formatDecimalInput(String(invAny.cementShippingRate || '')));
    if (inv.shippingCost !== undefined) setShippingCostInput(formatDecimalInput(String(inv.shippingCost || '')));
    if (invAny.chargeCalcMode) setChargeCalcMode(invAny.chargeCalcMode);

    setSelectedInvoice(null);
    setIsCreateInvoiceOpen(true);
  };

  // Delete Invoice Handler with Firestore Transaction (Restores stock & adjusts customer balance)
  const handleDeleteInvoiceConfirm = async () => {
    if (!deletingInvoice) return;
    setIsDeleting(true);
    try {
      await api.transactions.delete(deletingInvoice.id);
      toast.success('চালানটি সফলভাবে মুছে ফেলা হয়েছে এবং স্টক ফেরত দেয়া হয়েছে!');
      setIsDeleteDialogOpen(false);
      setDeletingInvoice(null);
      if (selectedInvoice?.id === deletingInvoice.id) {
        setSelectedInvoice(null);
      }
      loadInvoicesData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'চালান মুছতে সমস্যা হয়েছে');
    } finally {
      setIsDeleting(false);
    }
  };

  // Create, Convert, or Edit Invoice Handler
  const handleCreateInvoiceSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (isSubmitting) return;
    if (cart.length === 0) {
      toast.error('অন্তত একটি পণ্য নির্বাচন করুন');
      return;
    }
    if (!selectedCustomer && (!isNewCustomer || !newCustomerData.name.trim())) {
      toast.error('কাস্টমার নির্বাচন করুন অথবা নাম পূরণ করুন');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalCustId = selectedCustomer?.id;
      if (isNewCustomer && newCustomerData.name.trim()) {
        const createdParty = await api.parties.create({
          party_type: 'customer',
          name: newCustomerData.name.trim(),
          phone: toEnglishDigits(newCustomerData.phone).trim(),
          address: newCustomerData.address.trim(),
          district: 'গোপালগঞ্জ'
        });
        finalCustId = String(createdParty.id);
      }

      const isSplitPayment = invoicePaymentMethod === 'Split';
      const finalPaidAmount = paymentOption === 'now' 
        ? (isSplitPayment ? round2((cashPaidAmount || 0) + (chequePaidAmount || 0)) : round2(invoicePaidAmount || 0))
        : 0;

      let effectivePaymentMethod = 'cash';
      if (isSplitPayment) {
        effectivePaymentMethod = 'split';
      } else {
        const pmLower = (invoicePaymentMethod || 'cash').toLowerCase();
        if (pmLower.includes('split')) effectivePaymentMethod = 'split';
        else if (pmLower.includes('bank')) effectivePaymentMethod = 'bank';
        else if (pmLower.includes('cheque') || pmLower.includes('check')) effectivePaymentMethod = 'cheque';
        else if (pmLower.includes('mobile') || pmLower.includes('bkash') || pmLower.includes('nagad')) effectivePaymentMethod = 'mobile_banking';
        else effectivePaymentMethod = 'cash';
      }

      const hasCheque = effectivePaymentMethod === 'cheque' || effectivePaymentMethod === 'split' || (chequePaidAmount || 0) > 0 || !!chequeNo;

      const chequePayload = hasCheque ? {
        cheque_number: chequeNo || 'CHQ-PAYMENT',
        cheque_bank: bankName || senderBankName || 'ব্যাংক',
        cheque_due_date: chequeDate || undefined,
        cheque_status: 'pending' as const
      } : {};

      let savedSiteRecord: CustomerSiteData | null = null;
      if (finalCustId && siteName.trim() && (selectedSiteId === 'new' || saveSiteForFuture)) {
        const exists = customerSites.some(s => s.name.trim().toLowerCase() === siteName.trim().toLowerCase());
        if (!exists && saveSiteForFuture) {
          try {
            savedSiteRecord = await api.customerSites.create({
              customer: finalCustId,
              name: siteName.trim(),
              address: siteAddress.trim() || deliveryAddress.trim(),
              contact_person: siteContact.trim()
            });
          } catch (err) {
            console.error('Failed to auto-save customer site:', err);
          }
        }
      }

      const activeSiteId = savedSiteRecord?.id 
        ? String(savedSiteRecord.id) 
        : (selectedSiteId !== 'none' && selectedSiteId !== 'new' ? selectedSiteId : undefined);

      const logisticsMeta = {
        discountType,
        discountPercent: Number(discountPercent || 0),
        discountFlat: Number(discountFlat || 0),
        discountAmount: round2(cartTotalDiscount),
        cartTotalDiscount: round2(cartTotalDiscount),
        chargeCalcMode,
        rodLaborRate: Number(rodLaborRate || 0),
        rodShippingRate: Number(rodShippingRate || 0),
        rodLaborCost: Number(rodLaborTotal || 0),
        rodLoadingToCustomerLedger: Boolean(rodLoadingToCustomerLedger),
        rodUnloadingRate: Number(rodUnloadingRate || 0),
        rodUnloadingCost: Number(rodUnloadingTotal || 0),
        rodUnloadingToCustomerLedger: Boolean(rodUnloadingToCustomerLedger),
        rodUnloadingPaid: editingInvoiceMeta ? Boolean(editingInvoiceMeta.rodUnloadingPaid) : false,
        rodUnloadingPaidAmount: editingInvoiceMeta ? Number(editingInvoiceMeta.rodUnloadingPaidAmount || 0) : 0,
        rodUnloadingPaidAt: editingInvoiceMeta ? (editingInvoiceMeta.rodUnloadingPaidAt || '') : '',
        rodUnloadingPaidMethod: editingInvoiceMeta ? (editingInvoiceMeta.rodUnloadingPaidMethod || '') : '',
        rodUnloadingSardar: editingInvoiceMeta ? (editingInvoiceMeta.rodUnloadingSardar || '') : '',
        rodShippingCost: Number(rodShippingTotal || 0),
        rodRingTotalKg: Number(rodRingTotalKg || 0),
        cementLaborRate: Number(cementLaborRate || 0),
        cementShippingRate: Number(cementShippingRate || 0),
        cementLaborCost: Number(cementLaborTotal || 0),
        cementLoadingCharge: Number(cementLaborTotal || 0),
        cementLoadingToCustomerLedger: Boolean(cementLoadingToCustomerLedger),
        cementLoadingPaid: editingInvoiceMeta ? Boolean(editingInvoiceMeta.cementLoadingPaid) : false,
        cementLoadingPaidAmount: editingInvoiceMeta ? Number(editingInvoiceMeta.cementLoadingPaidAmount || 0) : 0,
        cementLoadingPaidAt: editingInvoiceMeta ? (editingInvoiceMeta.cementLoadingPaidAt || '') : '',
        cementLoadingPaidMethod: editingInvoiceMeta ? (editingInvoiceMeta.cementLoadingPaidMethod || '') : '',
        cementLoadingSardar: editingInvoiceMeta ? (editingInvoiceMeta.cementLoadingSardar || '') : '',
        cementUnloadingRate: Number(cementUnloadingRate || 0),
        cementUnloadingCost: Number(cementUnloadingTotal || 0),
        cementUnloadingToCustomerLedger: Boolean(cementUnloadingToCustomerLedger),
        shippingCostToCustomerLedger: Boolean(shippingCostToCustomerLedger),
        cementUnloadingPaid: editingInvoiceMeta ? Boolean(editingInvoiceMeta.cementUnloadingPaid) : false,
        cementUnloadingPaidAmount: editingInvoiceMeta ? Number(editingInvoiceMeta.cementUnloadingPaidAmount || 0) : 0,
        cementUnloadingPaidAt: editingInvoiceMeta ? (editingInvoiceMeta.cementUnloadingPaidAt || '') : '',
        cementUnloadingPaidMethod: editingInvoiceMeta ? (editingInvoiceMeta.cementUnloadingPaidMethod || '') : '',
        cementUnloadingSardar: editingInvoiceMeta ? (editingInvoiceMeta.cementUnloadingSardar || '') : '',
        salesShippingPaid: editingInvoiceMeta ? Boolean(editingInvoiceMeta.salesShippingPaid || editingInvoiceMeta.shippingPaid) : false,
        salesShippingPaidAmount: editingInvoiceMeta ? Number(editingInvoiceMeta.salesShippingPaidAmount !== undefined ? editingInvoiceMeta.salesShippingPaidAmount : (editingInvoiceMeta.shippingPaidAmount || 0)) : 0,
        salesShippingPaidAt: editingInvoiceMeta ? (editingInvoiceMeta.salesShippingPaidAt || '') : '',
        salesShippingPaidMethod: editingInvoiceMeta ? (editingInvoiceMeta.salesShippingPaidMethod || '') : '',
        rodLaborPaid: editingInvoiceMeta ? Boolean(editingInvoiceMeta.rodLaborPaid) : false,
        rodLaborPaidAmount: editingInvoiceMeta ? Number(editingInvoiceMeta.rodLaborPaidAmount || 0) : 0,
        rodLaborPaidAt: editingInvoiceMeta ? (editingInvoiceMeta.rodLaborPaidAt || '') : '',
        rodLaborPaidMethod: editingInvoiceMeta ? (editingInvoiceMeta.rodLaborPaidMethod || '') : '',
        rodLaborSardar: editingInvoiceMeta ? (editingInvoiceMeta.rodLaborSardar || '') : '',
        isShopLoadingExpense: !cementLoadingToCustomerLedger,
        cementShippingCost: Number(cementShippingTotal || 0),
        cementTotalBags: Number(cementTotalBags || 0),
        laborCost: Number(laborCost || 0),
        transportCost: Number(shippingCost || 0),
        shippingCost: Number(shippingCost || 0),
        vehicleNo: vehicleNo || '',
        driverName: driverName || '',
        driverPhone: driverPhone || '',
        deliveryAddress: (siteAddress.trim() || deliveryAddress.trim()) || '',
        customerSiteId: activeSiteId,
        siteName: siteName.trim(),
        siteAddress: (siteAddress.trim() || deliveryAddress.trim()) || '',
        siteContact: siteContact.trim(),
        paymentMethodName: invoicePaymentMethod,
        bankName: bankName || senderBankName || selectedShopBank || '',
        accountNo: accountNo || senderAccountNo || '',
        transactionRef: transactionRef || senderTxnRef || '',
        receiverShopBank: selectedShopBank || '',
        senderBankName: senderBankName || '',
        senderAccountNo: senderAccountNo || '',
        senderTxnRef: senderTxnRef || '',
        chequeNo: chequeNo || '',
        chequeDate: chequeDate || '',
        cashPaidAmount: finalPaidAmount > 0 ? (isSplitPayment ? Number(cashPaidAmount || 0) : (invoicePaymentMethod === 'Cash' ? Number(finalPaidAmount || 0) : 0)) : 0,
        chequePaidAmount: finalPaidAmount > 0 ? (isSplitPayment ? Number(chequePaidAmount || 0) : (invoicePaymentMethod === 'Cheque' ? Number(finalPaidAmount || 0) : 0)) : 0,
        previousBalance: selectedCustomer ? Number((selectedCustomer as any).totalDue || (selectedCustomer as any).due || (selectedCustomer as any).balance || (selectedCustomer as any).previousDue || (selectedCustomer as any).openingBalance || 0) : 0,
        engineerId: selectedEngineer ? String(selectedEngineer.id) : '',
        engineerName: selectedEngineer ? selectedEngineer.name : '',
        engineerPhone: selectedEngineer ? (selectedEngineer.phone || '') : '',
        engineerRodRate: Number(engineerRodRate || 0),
        engineerCementRate: Number(engineerCementRate || 0),
        engineerRodKg: Number(rodRingTotalKg || 0),
        engineerCementBags: Number(cementTotalBags || 0),
        engineerRodCommission: Number(engineerRodCommission || 0),
        engineerCementCommission: Number(engineerCementCommission || 0),
        engineerTotalCommission: Number(engineerTotalCommission || 0),
        invoiced: true,
        isOrder: false,
        userNote: invoiceNote || ''
      };

      const finalNotesPayload = JSON.stringify(logisticsMeta) + (invoiceNote ? `\n${invoiceNote}` : '');

      const safeSubtotal = round2(cartSubtotal);
      const safeDiscount = round2(cartTotalDiscount);
      const safeTotalAmount = round2(cartTotalAmount);
      const safePaidAmount = round2(finalPaidAmount);
      const safeDueAmount = round2(cartDueAmount);

      const sitePayload = {
        customer_site: activeSiteId ? Number(activeSiteId) : null,
        site_name: siteName.trim() || null,
        site_address: (siteAddress.trim() || deliveryAddress.trim()) || null,
        site_contact: siteContact.trim() || null,
      };

      if (editingInvoiceId) {
        await api.transactions.update(editingInvoiceId, {
          party: finalCustId ? Number(finalCustId) : null,
          subtotal: safeSubtotal,
          discount: safeDiscount,
          total_amount: safeTotalAmount,
          paid_amount: safePaidAmount,
          due_amount: safeDueAmount,
          payment_method: effectivePaymentMethod,
          ...sitePayload,
          ...chequePayload,
          items: cart.map(i => {
            const prodId = Number(i.id);
            return {
              product: !isNaN(prodId) && prodId > 0 ? prodId : undefined,
              product_name: i.name,
              quantity: i.quantity,
              price: round2(i.price),
              unit: i.unit,
              total: round2(i.price * i.quantity)
            };
          }),
          notes: finalNotesPayload
        });
        toast.success('চালান সফলভাবে এডিট ও আপডেট করা হয়েছে!');
      } else if (convertedOrderId) {
        await api.transactions.update(convertedOrderId, {
          party: finalCustId ? Number(finalCustId) : null,
          status: 'pending',
          subtotal: safeSubtotal,
          discount: safeDiscount,
          total_amount: safeTotalAmount,
          paid_amount: safePaidAmount,
          due_amount: safeDueAmount,
          payment_method: effectivePaymentMethod,
          ...sitePayload,
          ...chequePayload,
          items: cart.map(i => {
            const prodId = Number(i.id);
            return {
              product: !isNaN(prodId) && prodId > 0 ? prodId : undefined,
              product_name: i.name,
              quantity: i.quantity,
              price: round2(i.price),
              unit: i.unit,
              total: round2(i.price * i.quantity)
            };
          }),
          notes: finalNotesPayload
        });
        toast.success('বিক্রয় অর্ডার সফলভাবে চালানে রূপান্তর করা হয়েছে (অনুমোদনের অপেক্ষায়)!');
      } else {
        await api.transactions.create({
          party: finalCustId ? Number(finalCustId) : null,
          transaction_type: 'sale',
          status: 'pending',
          subtotal: safeSubtotal,
          discount: safeDiscount,
          total_amount: safeTotalAmount,
          paid_amount: safePaidAmount,
          due_amount: safeDueAmount,
          payment_method: effectivePaymentMethod,
          ...sitePayload,
          ...chequePayload,
          items: cart.map(i => {
            const prodId = Number(i.id);
            return {
              product: !isNaN(prodId) && prodId > 0 ? prodId : undefined,
              product_name: i.name,
              quantity: i.quantity,
              price: round2(i.price),
              unit: i.unit,
              total: round2(i.price * i.quantity)
            };
          }),
          notes: finalNotesPayload
        });
        toast.success(convertedOrderId ? 'বিক্রয় অর্ডার চালানে রূপান্তর করা হয়েছে!' : 'বিক্রয় চালান অপেক্ষমান (Pending) হিসেবে সংরক্ষিত হয়েছে! অনুমোদন করার পর হিসাব ও স্টকে যুক্ত হবে।');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orderUpdated'));
      }

      resetCreateForm();
      setIsCreateInvoiceOpen(false);
      loadInvoicesData();
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, '', url.pathname);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'চালান তৈরি/এডিট করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Due Payment
  const handleAddPayment = async () => {
    if (!selectedInvoice || addPayment <= 0) return;
    const newPaid = (selectedInvoice.paidAmount || 0) + addPayment;
    const newDue = Math.max(0, selectedInvoice.totalAmount - newPaid);
    try {
      await api.transactions.update(selectedInvoice.id, {
        paid_amount: newPaid,
        due_amount: newDue
      });

      toast.success('বকেয়া পেমেন্ট আপডেট হয়েছে');
      setAddPayment(0);
      loadInvoicesData();
    } catch {
      toast.error('বকেয়া পেমেন্ট যোগ করতে সমস্যা হয়েছে');
    }
  };

  const handleApproveInvoice = async (inv: Invoice) => {
    try {
      await api.transactions.approve(inv.id);
      toast.success(`বিক্রয় চালান (${inv.invoiceNo || inv.id}) সফলভাবে অনুমোদন করা হয়েছে! স্টক ও কাস্টমার একাউন্টে যুক্ত হয়েছে।`);
      loadInvoicesData();
      if (selectedInvoice && selectedInvoice.id === inv.id) {
        setSelectedInvoice({ ...selectedInvoice, status: 'approved' });
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orderUpdated'));
      }
    } catch (err: any) {
      toast.error(err.message || 'অনুমোদন করতে সমস্যা হয়েছে');
    }
  };

  const handleDirectPrintInvoice = (inv: Invoice) => {
    setPrintingInvoice(inv);
    setTimeout(() => {
      printElement('printable-memo-wrapper');
    }, 100);
  };

  const parseInvoiceDate = (at: any): Date | null => {
    if (!at) return null;
    try {
      const d = at?.toDate ? at.toDate() : new Date(at);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const handleResetFilters = () => {
    setFilterInvoiceNo('');
    setFilterCustomer('all');
    setFilterEngineer('all');
    setStartDate('');
    setEndDate('');
    setFilterPaymentStatus('all');
    setFilterPaymentMethod('all');
    setFilterSalesPerson('all');
    setFilterInvoiceType('all');
    setFilterBranch('all');
    setFilterStageStatus('all');
    setFilterApprovalStatus('all');
    setMinBill('');
    setMaxBill('');
    setMinDue('');
    setMaxDue('');
    setQuickFilter('all');
    setSearch('');
  };

  const filtered = invoices.filter(item => {
    // 1. Invoice No / Search
    const q = (filterInvoiceNo || search).trim().toLowerCase();
    if (q) {
      const idMatch = item.id?.toLowerCase().includes(q);
      const orderIdMatch = item.orderId?.toLowerCase().includes(q);
      const custMatch = item.customerName?.toLowerCase().includes(q);
      const phoneMatch = item.customerPhone?.includes(q);
      const engMatch = item.engineerName?.toLowerCase().includes(q);
      if (!idMatch && !orderIdMatch && !custMatch && !phoneMatch && !engMatch) return false;
    }

    // 2. Customer
    if (filterCustomer !== 'all') {
      const matchesCustId = item.customerId && String(item.customerId) === filterCustomer;
      const matchesCustName = item.customerName === filterCustomer;
      if (!matchesCustId && !matchesCustName) return false;
    }

    // 2.1 Engineer
    if (filterEngineer !== 'all') {
      const matchesEngId = item.engineerId && String(item.engineerId) === filterEngineer;
      const matchesEngName = item.engineerName === filterEngineer;
      if (!matchesEngId && !matchesEngName) return false;
    }

    // 3. Date Range (Start / End)
    const itemDate = parseInvoiceDate(item.createdAt);
    if (startDate && itemDate) {
      if (itemDate < startOfDay(new Date(startDate))) return false;
    }
    if (endDate && itemDate) {
      if (itemDate > endOfDay(new Date(endDate))) return false;
    }

    // 4. Payment Status
    if (filterPaymentStatus !== 'all') {
      const isPaid = item.dueAmount <= 0 || item.paymentStatus === 'paid' || item.paymentStatus === 'পরিশোধিত';
      const isPartial = (item.paidAmount || 0) > 0 && item.dueAmount > 0;
      const isUnpaid = (item.paidAmount || 0) === 0 && item.dueAmount > 0;

      if (filterPaymentStatus === 'paid' && !isPaid) return false;
      if (filterPaymentStatus === 'partial' && !isPartial) return false;
      if (filterPaymentStatus === 'unpaid' && !isUnpaid) return false;
    }

    // 5. Approval Status (Approved vs Pending/Unapproved)
    if (filterApprovalStatus !== 'all') {
      const isPending = item.status === 'pending' || item.status === 'draft' || item.status === 'অপেক্ষমান';
      if (filterApprovalStatus === 'approved' && isPending) return false;
      if (filterApprovalStatus === 'pending' && !isPending) return false;
    }

    // 6. Payment Method
    if (filterPaymentMethod !== 'all') {
      const method = (item.paymentMethod || 'cash').toLowerCase();
      if (!method.includes(filterPaymentMethod)) return false;
    }

    // 7. Min/Max Bill
    if (minBill !== '' && Number(minBill) > 0 && item.totalAmount < Number(minBill)) return false;
    if (maxBill !== '' && Number(maxBill) > 0 && item.totalAmount > Number(maxBill)) return false;

    // 8. Min/Max Due
    if (minDue !== '' && Number(minDue) > 0 && item.dueAmount < Number(minDue)) return false;
    if (maxDue !== '' && Number(maxDue) > 0 && item.dueAmount > Number(maxDue)) return false;

    // 9. Quick Filter Pills
    if (quickFilter !== 'all') {
      if (quickFilter === 'today' && itemDate && !isToday(itemDate)) return false;
      if (quickFilter === 'yesterday' && itemDate && !isYesterday(itemDate)) return false;
      if (quickFilter === 'this_week' && itemDate && !isSameWeek(itemDate, new Date())) return false;
      if (quickFilter === 'this_month' && itemDate && !isSameMonth(itemDate, new Date())) return false;

      const isPaid = item.dueAmount <= 0 || item.paymentStatus === 'paid' || item.paymentStatus === 'পরিশোধিত';
      const isPartial = (item.paidAmount || 0) > 0 && item.dueAmount > 0;
      const isUnpaid = (item.paidAmount || 0) === 0 && item.dueAmount > 0;

      if (quickFilter === 'unpaid' && !isUnpaid) return false;
      if (quickFilter === 'partial' && !isPartial) return false;
      if (quickFilter === 'paid' && !isPaid) return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const paginatedInvoices = filtered.slice(startIndex, endIndex);

  const totalSales = invoices.reduce((a, o) => a + o.totalAmount, 0);
  const totalPaid = invoices.reduce((a, o) => a + (o.paidAmount || 0), 0);
  const totalDue = invoices.reduce((a, o) => a + (o.dueAmount || 0), 0);

  return (
    <Shell>
      {selectedInvoice ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          <SalesInvoiceDetailsView
            invoice={selectedInvoice}
            onBack={() => setSelectedInvoice(null)}
            onEdit={(inv) => {
              const current = selectedInvoice;
              setSelectedInvoice(null);
              handleEditInvoice(current || inv);
            }}
            onApprove={canApproveInvoice ? (inv) => handleApproveInvoice(inv) : undefined}
            onPrint={() => printElement('printable-memo-wrapper')}
          />

          {/* Hidden Print Container for iframe printing */}
          {(printingInvoice || selectedInvoice) && (
            <div className="hidden print:block">
              <InvoiceMemo
                invoice={{
                  ...(printingInvoice || selectedInvoice),
                  transportCost: (printingInvoice || selectedInvoice)?.shippingCost || 0
                } as any}
                showPrintButton={false}
              />
            </div>
          )}
        </div>
      ) : !isCreateInvoiceOpen ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Always render Hidden Print Container if triggered from list table */}
          {printingInvoice && !selectedInvoice && (
            <div className="hidden print:block">
              <InvoiceMemo
                invoice={{
                  ...printingInvoice,
                  transportCost: printingInvoice.shippingCost || 0
                } as any}
                showPrintButton={false}
              />
            </div>
          )}
        {/* Top Title & Header Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 font-bengali flex items-center gap-2">
              <Receipt className="w-8 h-8 text-emerald-600" /> বিক্রয় চালান ও নগদ ক্যাশ ড্যাশবোর্ড
            </h2>
            <p className="text-slate-500 font-bengali mt-1">চুড়ান্ত চালানের তালিকা, নগদ প্রাপ্তি ও বকেয়া চালানের হিসাব</p>
          </div>
          
          {canCreateInvoice && (
            <Button 
              onClick={() => { resetCreateForm(); setIsCreateInvoiceOpen(true); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bengali h-12 px-6 rounded-md font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5 mr-2" />সরাসরি চালান তৈরি করুন
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'মোট ইনভয়েস বিক্রয়', value: `৳ ${toBengaliDigits(totalSales.toLocaleString('en-IN'))}`, icon: Receipt, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-100' },
            { label: 'মোট ক্যাশ প্রাপ্তি', value: `৳ ${toBengaliDigits(totalPaid.toLocaleString('en-IN'))}`, icon: Banknote, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'মোট বকেয়া চালান', value: `৳ ${toBengaliDigits(totalDue.toLocaleString('en-IN'))}`, icon: AlertCircle, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' },
          ].map((s, i) => (
            <Card key={i} className={cn("border-2 shadow-sm rounded-md transition-all hover:shadow-md", s.border, s.bg)}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-md flex items-center justify-center bg-white shadow-sm", s.color)}>
                  <s.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest font-black text-slate-500 font-bengali opacity-80">{s.label}</p>
                  <p className={cn("text-2xl font-black font-bengali mt-0.5", s.color)}>{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* COMPACT & EFFICIENT FILTER CARD */}
        <Card className="border border-slate-200/80 shadow-xs rounded-md bg-white p-4 font-bengali space-y-3">
          {/* Top Row: Search + Date Range + Status Quick Pills + More Filter Toggle */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Unified Search Box (Invoice No, Customer Name, Phone) */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="ইনভয়েস নং, কাস্টমার নাম বা নম্বর..."
                value={search}
                onChange={e => { setSearch(e.target.value); setFilterInvoiceNo(e.target.value); }}
                className="pl-10 h-10 rounded-md bg-slate-50/80 border-slate-200 text-xs font-bold text-slate-900 focus:bg-white transition-all placeholder:text-slate-400"
              />
              {search && (
                <button 
                  onClick={() => { setSearch(''); setFilterInvoiceNo(''); }}
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

            {/* Approval Status Filter Dropdown */}
            <div className="w-full sm:w-[155px] shrink-0">
              <Select value={filterApprovalStatus} onValueChange={(val) => setFilterApprovalStatus(val || 'all')}>
                <SelectTrigger className="rounded-md h-10 bg-slate-50/80 border-slate-200 text-xs font-bold text-slate-700">
                  <SelectValue placeholder="সব অনুমোদন" />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  <SelectItem value="all">সব অনুমোদন</SelectItem>
                  <SelectItem value="approved">🟢 অনুমোদিত</SelectItem>
                  <SelectItem value="pending">🟡 অপেক্ষমান</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {[
                { id: 'all', label: 'সব' },
                { id: 'paid', label: 'পরিশোধিত' },
                { id: 'partial', label: 'আংশিক' },
                { id: 'unpaid', label: 'বাকি' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setFilterPaymentStatus(p.id);
                    setQuickFilter(p.id);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-md text-xs font-bold transition-all border whitespace-nowrap",
                    (filterPaymentStatus === p.id || quickFilter === p.id)
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* More Filters Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="h-10 px-3.5 rounded-md border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>আরও ফিল্টার</span>
                {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>

              {(search || filterInvoiceNo || filterCustomer !== 'all' || startDate || endDate || filterPaymentStatus !== 'all' || filterPaymentMethod !== 'all' || filterApprovalStatus !== 'all' || minBill || maxBill || minDue || maxDue || quickFilter !== 'all') && (
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

          {/* Secondary Collapsible Drawer: Advanced Options (Payment Method, Engineer, Amount Ranges) */}
          {isFilterExpanded && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 animate-in fade-in duration-200">
              {/* Payment Method */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">পেমেন্ট মাধ্যম</Label>
                <Select value={filterPaymentMethod} onValueChange={(val) => setFilterPaymentMethod(val || 'all')}>
                  <SelectTrigger className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold">
                    <SelectValue placeholder="সব মাধ্যম" />
                  </SelectTrigger>
                  <SelectContent className="font-bengali text-xs font-bold">
                    <SelectItem value="all">সব মাধ্যম</SelectItem>
                    <SelectItem value="cash">নগদ</SelectItem>
                    <SelectItem value="bank">ব্যাংক</SelectItem>
                    <SelectItem value="cheque">চেক</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filter by Engineer */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">ইঞ্জিনিয়ার</Label>
                <Select value={filterEngineer} onValueChange={(val) => setFilterEngineer(val || 'all')}>
                  <SelectTrigger className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold">
                    <SelectValue placeholder="সব ইঞ্জিনিয়ার" />
                  </SelectTrigger>
                  <SelectContent className="font-bengali text-xs font-bold">
                    <SelectItem value="all">সব ইঞ্জিনিয়ার</SelectItem>
                    {engineers.map(e => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Time Pills */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">সময়সূচী</Label>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'today', label: 'আজ' },
                    { id: 'yesterday', label: 'গতকাল' },
                    { id: 'this_week', label: 'এই সপ্তাহ' },
                    { id: 'this_month', label: 'এই মাস' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setQuickFilter(quickFilter === t.id ? 'all' : t.id)}
                      className={cn(
                        "px-2 py-1.5 rounded-md text-[11px] font-bold transition-all border flex-1 text-center whitespace-nowrap",
                        quickFilter === t.id
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bill Range */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">মোট বিল (৳)</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="সর্বনিম্ন"
                    value={minBill}
                    onChange={e => setMinBill(e.target.value)}
                    className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                  <span className="text-slate-300 text-xs">-</span>
                  <Input
                    placeholder="সর্বোচ্চ"
                    value={maxBill}
                    onChange={e => setMaxBill(e.target.value)}
                    className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Due Range */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">বকেয়া পরিমাণ (৳)</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="সর্বনিম্ন"
                    value={minDue}
                    onChange={e => setMinDue(e.target.value)}
                    className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                  <span className="text-slate-300 text-xs">-</span>
                  <Input
                    placeholder="সর্বোচ্চ"
                    value={maxDue}
                    onChange={e => setMaxDue(e.target.value)}
                    className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* SECTION 3: INVOICES DATA TABLE */}
        <Card className="border border-slate-200/80 shadow-md rounded-md bg-white overflow-hidden">
          <CardContent className="p-0 overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 text-center py-4 px-3">
                    <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4">
                    <div className="flex items-center gap-1 cursor-pointer select-none">
                      <span>ইনভয়েস নং</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4">
                    <div className="flex items-center gap-1 cursor-pointer select-none">
                      <span>তারিখ ও সময়</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4">কাস্টমার নাম</TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 cursor-pointer select-none">
                      <span>মোট বিল (৳)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 cursor-pointer select-none">
                      <span>নগদ প্রাপ্তি (৳)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 cursor-pointer select-none">
                      <span>বকেয়া (৳)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 cursor-pointer select-none">
                      <span>পেমেন্ট স্ট্যাটাস</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 cursor-pointer select-none">
                      <span>স্ট্যাটাস</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-6 text-center">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-20 text-slate-400 font-bengali font-bold text-lg">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-20">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Receipt className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-bengali font-bold text-lg">কোনো ইনভয়েস/চালান পাওয়া যায়নি</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedInvoices.map(inv => {
                  const isPaid = inv.dueAmount <= 0 || inv.paymentStatus === 'paid' || inv.paymentStatus === 'পরিশোধিত';
                  const isPartial = (inv.paidAmount || 0) > 0 && inv.dueAmount > 0;
                  const isUnpaid = (inv.paidAmount || 0) === 0 && inv.dueAmount > 0;

                  return (
                    <TableRow
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <TableCell className="text-center py-4 px-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-sm text-xs">
                          #{toBengaliDigits(inv.orderId || inv.id.slice(0, 8).toUpperCase())}
                        </span>
                      </TableCell>
                      <TableCell className="font-bengali text-xs font-medium text-slate-600">
                        {formatDate(inv.createdAt)}
                      </TableCell>
                      <TableCell className="font-bengali text-slate-800 py-4 px-4">
                        <p className="font-bold text-sm text-slate-900">{inv.customerName}</p>
                        {inv.customerPhone && (
                          <p className="text-xs text-slate-400 font-bengali mt-0.5">{toBengaliDigits(inv.customerPhone)}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {inv.siteName && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200" title={inv.siteAddress || undefined}>
                              📍 {inv.siteName}
                            </span>
                          )}
                          {inv.engineerName && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                              👷‍♂️ {inv.engineerName}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bengali font-bold text-slate-900 text-sm py-4 px-4">
                        ৳{toBengaliDigits((inv.totalAmount || 0).toLocaleString('en-IN'))}
                      </TableCell>
                      <TableCell className="text-right font-bengali font-bold text-emerald-600 text-sm py-4 px-4">
                        ৳{toBengaliDigits((inv.paidAmount || 0).toLocaleString('en-IN'))}
                      </TableCell>
                      <TableCell className="text-right font-bengali font-bold text-rose-600 text-sm py-4 px-4">
                        ৳{toBengaliDigits((inv.dueAmount || 0).toLocaleString('en-IN'))}
                      </TableCell>
                      <TableCell className="text-center py-4 px-4">
                        <span className={cn(
                          "px-3 py-1 rounded-md text-xs font-bold font-bengali border inline-block",
                          isPaid ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          isPartial ? "bg-amber-50 text-amber-600 border-amber-100" :
                          "bg-rose-50 text-rose-600 border-rose-100"
                        )}>
                          {isPaid ? 'পরিশোধিত' : isPartial ? 'আংশিক' : 'বাকি'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-4 px-4">
                        {inv.status === 'pending' || inv.status === 'draft' || inv.status === 'অপেক্ষমান' ? (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2.5 py-1 rounded-md text-xs font-bengali inline-flex items-center gap-1">
                            🟡 অপেক্ষমান
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-1 rounded-md text-xs font-bengali inline-flex items-center gap-1">
                            🟢 অনুমোদিত
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-3.5 px-6" onClick={e => e.stopPropagation()}>
                        <TableRowActionMenu
                          onView={() => setSelectedInvoice(inv)}
                          onPrint={() => handleDirectPrintInvoice(inv)}
                          onEdit={() => handleEditInvoice(inv)}
                          onDelete={() => { setDeletingInvoice(inv); setIsDeleteDialogOpen(true); }}
                          onApprove={canApproveInvoice ? () => handleApproveInvoice(inv) : undefined}
                          isPending={inv.status === 'pending' || inv.status === 'draft' || inv.status === 'অপেক্ষমান'}
                          canEdit={canEditInvoice}
                          canDelete={canDeleteInvoice}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>

          {/* PAGINATION FOOTER NAVBAR */}
          {filtered.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 font-bengali text-xs font-semibold">
              <div className="text-slate-600 flex items-center gap-2">
                <span>
                  মোট <strong className="text-slate-900 font-bold">{toBengaliDigits(filtered.length)}</strong> টি ইনভয়েসের মধ্যে <strong className="text-slate-900 font-bold">{toBengaliDigits(startIndex + 1)}</strong> - <strong className="text-slate-900 font-bold">{toBengaliDigits(endIndex)}</strong> টি দেখানো হচ্ছে
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span>প্রতি পেজে:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-8 rounded-md bg-white border border-slate-200 px-2 font-bold text-xs text-slate-800 outline-none cursor-pointer"
                  >
                    <option value={10}>১০ টি</option>
                    <option value={20}>২০ টি</option>
                    <option value={50}>৫০ টি</option>
                    <option value={100}>১০০ টি</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="h-8 px-2.5 rounded-md text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4 mr-0.5" /> আগের পেজ
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((page, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && page - prev > 1;
                        return (
                          <div key={page} className="flex items-center gap-1">
                            {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                "w-8 h-8 rounded-md text-xs font-bold transition-all border",
                                currentPage === page
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
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
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="h-8 px-2.5 rounded-md text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                  >
                    পরের পেজ <ChevronRight className="w-4 h-4 ml-0.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
      ) : (
        /* CREATE / CONVERT INVOICE IN-PAGE VIEW (Direct Page View, No Popup Overlay) */
        <div className="space-y-4 animate-in fade-in duration-300 font-bengali">
          <div className="w-full bg-slate-100 border-2 border-slate-300 shadow-xl rounded-md overflow-hidden flex flex-col min-h-[calc(100vh-100px)]">
            
            {/* FRAME TOP HEADER BAR */}
            <div className="bg-white border-b border-slate-300 px-6 py-3.5 flex items-center justify-between shadow-xs flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => { setIsCreateInvoiceOpen(false); resetCreateForm(); }}
                  className="w-9 h-9 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold shadow-xs flex-shrink-0 transition-colors"
                  title="তালিকায় ফিরে যান"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase block">
                    ইনভয়েস ব্যবস্থাপনা
                  </span>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                    {editingInvoiceId ? 'চালান সম্পাদনা করুন' : convertedOrderId ? 'বিক্রয় অর্ডার থেকে চালান তৈরি' : 'নতুন বিক্রয় ইনভয়েস তৈরি করুন'}
                  </h1>
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { setIsCreateInvoiceOpen(false); resetCreateForm(); }}
                className="h-9 w-9 rounded-md hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* MAIN FORM GRID INSIDE FRAME */}
            <form onSubmit={handleCreateInvoiceSubmit} className="p-4 md:p-6 w-full space-y-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT 9 COLUMNS: 7 STEPS */}
                <div className="lg:col-span-9 space-y-5">
                <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center">১</span>
                        দোকান ও প্রাথমিক তথ্য
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !isNewCustomer;
                          setIsNewCustomer(nextState);
                          setSelectedCustomer(null);
                          setCustomerSites([]);
                          setSelectedSiteId('none');
                          setSiteName('');
                          setSiteAddress('');
                          setSiteContact('');
                        }}
                        className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        {isNewCustomer ? '← তালিকা থেকে বাছুন' : '+ নতুন কাস্টমার এন্ট্রি করুন'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Select Shop / Customer */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">কাস্টমার / দোকান নির্বাচন করুন <span className="text-rose-500">*</span></Label>
                        {!isNewCustomer ? (
                          <CustomerSearchSelect
                            customers={customers}
                            selectedCustomer={selectedCustomer}
                            onSelectCustomer={(cust) => {
                              setSelectedCustomer(cust);
                              if (cust?.id) {
                                loadSitesForCustomer(cust.id);
                              } else {
                                setCustomerSites([]);
                              }
                              setSelectedSiteId('none');
                              setSiteName('');
                              setSiteAddress('');
                              setSiteContact('');
                              setDeliveryAddress(cust?.address || '');
                            }}
                            onAddNewClick={() => {
                              setIsNewCustomer(true);
                              setSelectedCustomer(null);
                              setCustomerSites([]);
                              setSelectedSiteId('none');
                              setSiteName('');
                              setSiteAddress('');
                              setSiteContact('');
                            }}
                            placeholder="কাস্টমার / দোকান সার্চ করুন..."
                          />
                        ) : (
                          <div className="space-y-2">
                            <Input
                              required
                              placeholder="কাস্টমারের নাম"
                              value={newCustomerData.name}
                              onChange={e => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                              className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                            />
                            <Input
                              placeholder="মোবাইল নম্বর (১১ ডিজিট)"
                              value={newCustomerData.phone}
                              maxLength={11}
                              onChange={e => {
                                const val = toBengaliDigits(e.target.value).replace(/[^০-৯]/g, '').slice(0, 11);
                                setNewCustomerData({ ...newCustomerData, phone: val });
                              }}
                              className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-bengali tracking-wide"
                            />
                          </div>
                        )}
                      </div>

                      {/* Select Engineer */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">ইঞ্জিনিয়ার নির্বাচন (ঐচ্ছিক)</Label>
                        <EngineerSearchSelect
                          engineers={engineers}
                          selectedEngineer={selectedEngineer}
                          onSelectEngineer={(eng) => {
                            setSelectedEngineer(eng);
                            if (eng) {
                              setEngineerRodRateInput(eng.rodCommissionRate ? formatDecimalInput(String(eng.rodCommissionRate)) : '');
                              setEngineerCementRateInput(eng.cementCommissionRate ? formatDecimalInput(String(eng.cementCommissionRate)) : '');
                            } else {
                              setEngineerRodRateInput('');
                              setEngineerCementRateInput('');
                            }
                          }}
                          placeholder="ইঞ্জিনিয়ার সার্চ করুন..."
                        />
                      </div>

                      {/* Invoice Number */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">ইনভয়েস নম্বর</Label>
                        <Input
                          disabled
                          value="স্বয়ংক্রিয় (অটো জেনারেট)"
                          className="rounded-md h-11 bg-slate-100 border-slate-200 text-xs font-bold text-slate-500 cursor-not-allowed"
                        />
                      </div>

                      {/* Invoice Date */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">ইনভয়েস তারিখ <span className="text-rose-500">*</span></Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={invoiceDate || toBengaliDigits(format(new Date(), 'dd/MM/yyyy'))}
                            onChange={e => setInvoiceDate(e.target.value)}
                            className="rounded-md h-11 bg-slate-50 border-slate-200 text-xs font-bold font-bengali pr-9"
                          />
                          <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Customer & Engineer Alert Boxes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {selectedCustomer && (
                        <div className={cn(
                          "p-3.5 border rounded-md flex items-center justify-between text-xs font-bengali",
                          selectedCustomerAdvance > 0
                            ? "bg-emerald-50/80 border-emerald-200"
                            : selectedCustomerDue > 0
                              ? "bg-rose-50/80 border-rose-200"
                              : "bg-slate-50 border-slate-200"
                        )}>
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-8 h-8 rounded-md flex items-center justify-center font-bold",
                              selectedCustomerAdvance > 0 
                                ? "bg-emerald-100 text-emerald-700" 
                                : selectedCustomerDue > 0 
                                  ? "bg-rose-100 text-rose-700" 
                                  : "bg-slate-200 text-slate-700"
                            )}>
                              {selectedCustomerAdvance > 0 ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <AlertCircle className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <span className="font-black text-slate-900">{selectedCustomer.name}</span>
                              {selectedCustomer.phone && <span className="ml-2 text-slate-600 font-semibold">({toBengaliDigits(selectedCustomer.phone)})</span>}
                              {selectedCustomer.address && <p className="text-slate-500 text-[11px] font-semibold">{selectedCustomer.address}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            {selectedCustomerAdvance > 0 ? (
                              <>
                                <span className="text-[11px] text-emerald-700 font-bold block">পূর্বের অগ্রিম জমা (Advance)</span>
                                <span className="font-black text-emerald-700 text-base">৳ {toBengaliDigits(selectedCustomerAdvance.toLocaleString('en-IN'))}</span>
                              </>
                            ) : selectedCustomerDue > 0 ? (
                              <>
                                <span className="text-[11px] text-rose-600 font-bold block">পূর্বের মোট বকেয়া</span>
                                <span className="font-black text-rose-700 text-base">৳ {toBengaliDigits(selectedCustomerDue.toLocaleString('en-IN'))}</span>
                              </>
                            ) : (
                              <>
                                <span className="text-[11px] text-slate-500 font-bold block">পূর্বের ব্যালেন্স</span>
                                <span className="font-black text-slate-700 text-base">৳ ০.০০</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SHOW SELECTED ENGINEER COMMISSION BADGE & INPUTS */}
                      {selectedEngineer && (
                        <div className="p-3 bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-orange-50/80 border border-orange-200 rounded-md font-bengali text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-orange-200/80">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">👷‍♂️</span>
                              <div>
                                <span className="font-bold text-slate-800 text-xs block">{selectedEngineer.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">{selectedEngineer.phone || 'মোবাইল নেই'}</span>
                              </div>
                            </div>
                            {selectedEngineer.businessName && (
                              <div>
                                <span className="text-[11px] text-slate-500 font-bold block">ফার্ম / প্রজেক্ট</span>
                                <span className="font-bold text-slate-800 text-xs">{selectedEngineer.businessName}</span>
                              </div>
                            )}
                          </div>

                          {/* COMMISSION CALCULATION & RATE TWEAK */}
                          <div className="pt-2 bg-white/80 p-2.5 rounded-lg border border-orange-200 space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-black text-orange-950">👷‍♂️ কমিশন হিসাব (রড ও সিমেন্ট)</span>
                              <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                মোট কমিশন: ৳ {toBengaliDigits(engineerTotalCommission.toLocaleString('en-IN'))}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              {/* Rod Commission Line */}
                              <div className="flex items-center justify-between bg-white p-1.5 rounded border border-orange-100">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-700 block">রড ({toBengaliDigits(rodRingTotalKg)} কেজি)</span>
                                  <span className="text-[10px] text-slate-400">কমিশন রেট (৳/কেজি)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={engineerRodRateInput}
                                    onChange={(e) => setEngineerRodRateInput(formatDecimalInput(e.target.value))}
                                    placeholder="০.০০"
                                    className="w-16 h-7 text-xs font-bold text-center bg-slate-50 border-orange-200 p-0 font-bengali"
                                  />
                                  <span className="font-black text-slate-900 font-mono w-16 text-right">৳{toBengaliDigits(engineerRodCommission.toLocaleString('en-IN'))}</span>
                                </div>
                              </div>

                              {/* Cement Commission Line */}
                              <div className="flex items-center justify-between bg-white p-1.5 rounded border border-orange-100">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-700 block">সিমেন্ট ({toBengaliDigits(cementTotalBags)} বস্তা)</span>
                                  <span className="text-[10px] text-slate-400">কমিশন রেট (৳/বস্তা)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={engineerCementRateInput}
                                    onChange={(e) => setEngineerCementRateInput(formatDecimalInput(e.target.value))}
                                    placeholder="০.০০"
                                    className="w-16 h-7 text-xs font-bold text-center bg-slate-50 border-orange-200 p-0 font-bengali"
                                  />
                                  <span className="font-black text-slate-900 font-mono w-16 text-right">৳{toBengaliDigits(engineerCementCommission.toLocaleString('en-IN'))}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CUSTOMER SITE / DELIVERY PROJECT SELECTION */}
                    <div className="mt-4 p-4 bg-sky-50/50 border border-sky-200/80 rounded-lg space-y-3 font-bengali">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <Label className="text-xs font-black text-sky-950 flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-sky-600" />
                            গ্রাহকের প্রজেক্ট / ডেলিভারি সাইট (কাজের স্থান)
                          </Label>
                          {isLoadingSites && (
                            <span className="text-[11px] text-sky-600 font-semibold animate-pulse">
                              সাইটের তথ্য লোড হচ্ছে...
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-slate-600">সাইট নির্বাচন করুন বা নতুন যোগ করুন</Label>
                            <Select 
                              value={selectedSiteId} 
                              onValueChange={handleSiteSelectionChange}
                            >
                              <SelectTrigger className="rounded-md h-10 bg-white border-sky-300 text-xs font-bold text-slate-800">
                                <SelectValue placeholder="সাইট নির্বাচন করুন" />
                              </SelectTrigger>
                              <SelectContent className="font-bengali text-xs font-bold">
                                <SelectItem value="none">
                                  🏠 সাধারণ ডেলিভারি (মূল কাস্টমার ঠিকানা / নির্দিষ্ট সাইট ছাড়া)
                                </SelectItem>
                                {customerSites.map(site => (
                                  <SelectItem key={String(site.id)} value={String(site.id)}>
                                    📍 {site.name} {site.address ? `(${site.address})` : ''}
                                  </SelectItem>
                                ))}
                                <SelectItem value="new" className="text-emerald-700 font-black">
                                  ➕ নতুন সাইট এন্ট্রি করুন (New Site)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* If an existing site is picked */}
                          {selectedSiteId !== 'none' && selectedSiteId !== 'new' && (
                            <div className="p-2.5 bg-white border border-sky-200 rounded-md text-xs space-y-1 self-end">
                              <div className="flex items-center gap-1 font-black text-sky-900">
                                <span>📍 নির্বাচিত সাইট: {siteName}</span>
                              </div>
                              {siteAddress && (
                                <p className="text-slate-600 text-[11px]">ঠিকানা: {siteAddress}</p>
                              )}
                              {siteContact && (
                                <p className="text-slate-600 text-[11px]">যোগাযোগ: {siteContact}</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* If New Site is chosen or entering custom site */}
                        {selectedSiteId === 'new' && (
                          <div className="p-3 bg-white border border-emerald-300 rounded-md space-y-3 mt-2">
                            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800 border-b border-emerald-100 pb-1.5">
                              <span>➕ নতুন সাইটের বিবরণ লিখুন</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[11px] font-bold text-slate-700">সাইটের নাম <span className="text-rose-500">*</span></Label>
                                <Input 
                                  placeholder="যেমন: উত্তরা সেক্টর-১০ প্রজেক্ট"
                                  value={siteName}
                                  onChange={e => setSiteName(e.target.value)}
                                  className="rounded-md h-9 bg-slate-50 border-slate-300 text-xs font-bold"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] font-bold text-slate-700">সাইটের ডেলিভারি ঠিকানা</Label>
                                <Input 
                                  placeholder="রোড-৪, বাড়ি-১২, উত্তরা, ঢাকা"
                                  value={siteAddress}
                                  onChange={e => {
                                    setSiteAddress(e.target.value);
                                    setDeliveryAddress(e.target.value);
                                  }}
                                  className="rounded-md h-9 bg-slate-50 border-slate-300 text-xs font-bold"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] font-bold text-slate-700">সাইট ইনচার্জ / কন্টাক্ট</Label>
                                <Input 
                                  placeholder="নাম ও মোবাইল (যেমন: রফিক - 017...)"
                                  value={siteContact}
                                  onChange={e => setSiteContact(e.target.value)}
                                  className="rounded-md h-9 bg-slate-50 border-slate-300 text-xs font-bold"
                                />
                              </div>
                            </div>

                            {selectedCustomer && (
                              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-800 pt-1">
                                <input 
                                  type="checkbox"
                                  checked={saveSiteForFuture}
                                  onChange={e => setSaveSiteForFuture(e.target.checked)}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>ভবিষ্যতের চালানে ব্যবহারের জন্য এই সাইটটি কাস্টমারের প্রোফাইলে সংরক্ষণ করুন</span>
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                {/* STEP 2: Item Lines */}
                <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center">২</span>
                        পণ্যসমূহ (আইটেম লাইন)
                      </Label>
                      <Button 
                        type="button"
                        onClick={handleAddCartItem}
                        size="sm" 
                        className="h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> নতুন সারি যোগ
                      </Button>
                    </div>

                    {/* Step-by-Step Cascading Product Selector (Rod, Cement, Ring) */}
                    <CascadingProductSelector
                      products={products}
                      onlyInStock={true}
                      onProductChange={(selected) => {
                        setSelectedCascadingProduct(selected);
                        if (selected && selected.productId) {
                          setSelectedProductId(selected.productId);
                        }
                      }}
                      showPriceField={true}
                      itemQty={itemQty}
                      onQtyChange={setItemQty}
                      itemPrice={itemPrice}
                      onPriceChange={setItemPrice}
                      onAddCartItem={handleAddCartItem}
                    />

                    {/* Table matching screenshot columns */}
                    <div className="border border-slate-200 rounded-md overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow className="text-[11px]">
                            <TableHead className="w-10 text-center font-black">#</TableHead>
                            <TableHead className="font-black">পণ্যের নাম</TableHead>
                            <TableHead className="text-center font-black">ব্র্যান্ড</TableHead>
                            <TableHead className="text-center font-black">সাইজ</TableHead>
                            <TableHead className="text-center font-black">পরিমাণ</TableHead>
                            <TableHead className="text-right font-black">একক মূল্য</TableHead>
                            <TableHead className="text-right font-black">মোট মূল্য</TableHead>
                            <TableHead className="w-10 text-center font-black">🗑️</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cart.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-400 font-semibold">
                                কার্ট খালি। উপর থেকে পণ্য নির্বাচন করে যোগ করুন।
                              </TableCell>
                            </TableRow>
                          ) : cart.map((item, idx) => {
                            const parsed = parseProductDetails(item);
                            return (
                              <TableRow key={item.id ? `${item.id}-${idx}` : `${item.name}-${idx}`} className="text-xs border-b border-slate-100">
                                <TableCell className="text-center font-bold text-slate-400">{toBengaliDigits(idx + 1)}</TableCell>
                                <TableCell className="font-bold text-slate-900">{parsed.categoryName}</TableCell>
                                <TableCell className="text-center font-bold text-slate-700">{parsed.brandName}</TableCell>
                                <TableCell className="text-center font-bold text-slate-700">{parsed.sizeName}</TableCell>
                                <TableCell className="text-center">
                                  <CartItemQtyInput
                                    value={item.quantity}
                                    unit={item.unit}
                                    onChange={(val) => handleUpdateCartQty(item.id || idx, val, idx)}
                                  />
                                </TableCell>
                                <TableCell className="text-right font-medium text-slate-600">৳{toBengaliDigits((item.price || 0).toLocaleString('en-IN'))}</TableCell>
                                <TableCell className="text-right font-black text-slate-900">৳{toBengaliDigits(((item.price || 0) * item.quantity).toLocaleString('en-IN'))}</TableCell>
                                <TableCell className="text-center">
                                  <button type="button" onClick={() => handleRemoveCartItem(item.id, idx)} className="p-1 text-rose-500 hover:bg-rose-50 rounded-sm cursor-pointer transition-colors" title="আইটেম বাদ দিন">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* STEP 3 & STEP 4 ROW */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* STEP 3: Totals, Discount & Tax */}
                  <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                    <CardContent className="p-5 space-y-4">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center">৩</span>
                        মোট বিল, ছাড় ও অতিরিক্ত খরচ
                      </Label>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">ছাড়ের ধরণ</Label>
                          <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                            <SelectTrigger className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-bengali">
                              <SelectValue>
                                {discountType === 'percentage' ? 'শতকরা (%)' : 'ফ্ল্যাট (৳)'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="font-bengali text-xs font-bold">
                              <SelectItem value="percentage">শতকরা (%)</SelectItem>
                              <SelectItem value="flat">ফ্ল্যাট (৳)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">ছাড়ের পরিমাণ (% / ৳)</Label>
                          <Input 
                            type="text"
                            inputMode="decimal"
                            value={discountType === 'percentage' ? discountPercentInput : discountFlatInput}
                            onChange={e => {
                              const formatted = formatDecimalInput(e.target.value);
                              if (discountType === 'percentage') setDiscountPercentInput(formatted);
                              else setDiscountFlatInput(formatted);
                            }}
                            placeholder="০"
                            className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-bengali"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">হিসাবকৃত মোট ছাড়</Label>
                          <Input 
                            disabled
                            value={`৳ ${toBengaliDigits(computedDiscount.toLocaleString('en-IN'))}`}
                            className="rounded-md h-10 bg-slate-100 border-slate-200 text-xs font-black text-emerald-600 cursor-not-allowed font-bengali"
                          />
                        </div>
                      </div>

                      {/* Extra Charges Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-2.5 rounded-md border border-slate-200 text-xs gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                          <span className="font-bold text-slate-800 font-bengali">প্রতি ইউনিট রেট অনুযায়ী (রড কেজি ও সিমেন্ট বস্তা)</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveDefaultCharges}
                          className="text-[10px] font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-sm border border-amber-300 transition-colors cursor-pointer font-bengali self-start sm:self-auto"
                          title="বর্তমানে দেওয়া রেটগুলো সব সময় ডিফল্ট হিসেবে রাখতে এখানে ক্লিক করুন"
                        >
                          📌 ডিফল্ট রেট সেভ করুন
                        </button>
                      </div>

                      <div className="space-y-3 font-bengali">
                          {/* Rod & Ring Rate Box */}
                          {(rodRingTotalKg > 0 || (rodRingTotalKg === 0 && cementTotalBags === 0)) && (
                            <div className="bg-sky-50/60 border border-sky-200 rounded-md p-3 space-y-3">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-black text-sky-900 flex items-center gap-1.5">
                                  🔹 রড ও রিং লেবার খরচ
                                </span>
                                <span className="bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded text-[11px]">
                                  মোট ওজন: {toBengaliDigits(rodRingTotalKg.toLocaleString('en-IN'))} কেজি
                                </span>
                              </div>

                              {/* Rod Loading Section */}
                              <div className={cn(
                                "space-y-1.5 p-2 rounded-md transition-all",
                                rodLoadingToCustomerLedger ? "bg-sky-50/80 border border-sky-200" : "bg-slate-50/80 border border-slate-200"
                              )}>
                                <div className="flex items-center justify-between gap-2">
                                  <Label className="text-[11px] font-bold text-slate-700">লোডিং লেবার খরচ</Label>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={rodLoadingToCustomerLedger}
                                      onClick={() => setRodLoadingToCustomerLedger(!rodLoadingToCustomerLedger)}
                                      className={cn(
                                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-sky-500",
                                        rodLoadingToCustomerLedger ? "bg-sky-600" : "bg-slate-300"
                                      )}
                                      title="কাস্টমারের লেজারে যুক্ত বা বাদ দিতে ক্লিক করুন"
                                    >
                                      <span
                                        className={cn(
                                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                          rodLoadingToCustomerLedger ? "translate-x-4" : "translate-x-0"
                                        )}
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRodLoadingToCustomerLedger(!rodLoadingToCustomerLedger)}
                                      className={cn(
                                        "text-[9px] font-black px-1.5 py-0.5 rounded border select-none cursor-pointer transition-colors",
                                        rodLoadingToCustomerLedger 
                                          ? "bg-sky-100 text-sky-800 border-sky-300" 
                                          : "bg-slate-200 text-slate-600 border-slate-300"
                                      )}
                                    >
                                      {rodLoadingToCustomerLedger ? 'কাস্টমার লেজারে যুক্ত' : 'দোকান প্রদেয় / লেজারে বাদ'}
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-500 font-medium">লোডিং রেট (৳/কেজি)</span>
                                    <Input 
                                      type="text"
                                      inputMode="decimal"
                                      value={rodLaborRateInput}
                                      onChange={e => handleRodLaborRateChange(e.target.value)}
                                      placeholder="০.০০"
                                      className="rounded-md h-9 bg-white border-sky-300 text-xs font-bold text-slate-800 font-bengali"
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-slate-500 font-medium">মোট লোডিং (৳)</span>
                                      <span className="text-[9px] text-amber-700 font-bold">(রাউন্ড/এডিটযোগ্য)</span>
                                    </div>
                                    <Input 
                                      type="text"
                                      inputMode="decimal"
                                      value={rodLaborTotalInput !== '' ? rodLaborTotalInput : (rodLaborTotal > 0 ? String(rodLaborTotal) : '')}
                                      onChange={e => setRodLaborTotalInput(formatDecimalInput(e.target.value))}
                                      placeholder={rodLaborTotal > 0 ? String(rodLaborTotal) : '০.০০'}
                                      className="rounded-md h-9 bg-white border-sky-300 text-xs font-bold text-amber-700 font-bengali"
                                    />
                                  </div>
                                </div>
                                <span className={cn(
                                  "text-[10px] font-medium block",
                                  rodLoadingToCustomerLedger ? "text-sky-800" : "text-amber-800"
                                )}>
                                  {rodLoadingToCustomerLedger 
                                    ? '💡 রড লোডিং খরচ কাস্টমারের বিলে ও লেজারে যুক্ত হবে।' 
                                    : '💡 রড লোডিং খরচ কাস্টমারের বিলে বা লেজারে যুক্ত হবে না (দোকান বহন করবে / আলাদা হিসাব)।'}
                                </span>
                              </div>

                              {/* Rod Unloading Section */}
                              <div className={cn(
                                "pt-2 border-t border-sky-200/80 space-y-1.5 p-2 rounded-md transition-all",
                                rodUnloadingToCustomerLedger ? "bg-emerald-50/40 border border-emerald-200/60" : "bg-slate-50/80 border border-slate-200"
                              )}>
                                <div className="flex items-center justify-between gap-2">
                                  <Label className="text-[11px] font-bold text-slate-700">আনলোডিং লেবার খরচ</Label>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={rodUnloadingToCustomerLedger}
                                      onClick={() => setRodUnloadingToCustomerLedger(!rodUnloadingToCustomerLedger)}
                                      className={cn(
                                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-emerald-500",
                                        rodUnloadingToCustomerLedger ? "bg-emerald-600" : "bg-slate-300"
                                      )}
                                      title="কাস্টমারের লেজারে যুক্ত বা বাদ দিতে ক্লিক করুন"
                                    >
                                      <span
                                        className={cn(
                                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                          rodUnloadingToCustomerLedger ? "translate-x-4" : "translate-x-0"
                                        )}
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRodUnloadingToCustomerLedger(!rodUnloadingToCustomerLedger)}
                                      className={cn(
                                        "text-[9px] font-black px-1.5 py-0.5 rounded border select-none cursor-pointer transition-colors",
                                        rodUnloadingToCustomerLedger 
                                          ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                                          : "bg-slate-200 text-slate-600 border-slate-300"
                                      )}
                                    >
                                      {rodUnloadingToCustomerLedger ? 'কাস্টমার লেজারে যুক্ত' : 'দোকান প্রদেয় / লেজারে বাদ'}
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-500 font-medium">আনলোডিং রেট (৳/কেজি)</span>
                                    <Input 
                                      type="text"
                                      inputMode="decimal"
                                      value={rodUnloadingRateInput}
                                      onChange={e => handleRodUnloadingRateChange(e.target.value)}
                                      placeholder="০.০০"
                                      className={cn(
                                        "rounded-md h-9 bg-white text-xs font-bold font-bengali transition-colors",
                                        rodUnloadingToCustomerLedger ? "border-emerald-300 text-slate-800" : "border-slate-300 text-slate-800"
                                      )}
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-slate-500 font-medium">মোট আনলোডিং (৳)</span>
                                      <span className="text-[9px] text-emerald-700 font-bold">(রাউন্ড/এডিটযোগ্য)</span>
                                    </div>
                                    <Input 
                                      type="text"
                                      inputMode="decimal"
                                      value={rodUnloadingTotalInput !== '' ? rodUnloadingTotalInput : (rodUnloadingTotal > 0 ? String(rodUnloadingTotal) : '')}
                                      onChange={e => setRodUnloadingTotalInput(formatDecimalInput(e.target.value))}
                                      placeholder={rodUnloadingTotal > 0 ? String(rodUnloadingTotal) : '০.০০'}
                                      className={cn(
                                        "rounded-md h-9 bg-white text-xs font-bold font-bengali transition-colors",
                                        rodUnloadingToCustomerLedger ? "border-emerald-300 text-emerald-800" : "border-slate-300 text-slate-700"
                                      )}
                                    />
                                  </div>
                                </div>
                                <span className={cn(
                                  "text-[10px] font-medium block",
                                  rodUnloadingToCustomerLedger ? "text-emerald-800" : "text-amber-800"
                                )}>
                                  {rodUnloadingToCustomerLedger 
                                    ? '💡 রড আনলোডিং খরচ কাস্টমারের বিলে ও লেজারে যুক্ত হবে।' 
                                    : '💡 রড আনলোডিং খরচ কাস্টমারের বিলে বা লেজারে যুক্ত হবে না (দোকান বহন করবে / আলাদা হিসাব)।'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Cement Rate Box */}
                          {(cementTotalBags > 0 || (rodRingTotalKg === 0 && cementTotalBags === 0)) && (
                            <div className="bg-amber-50/60 border border-amber-200 rounded-md p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-black text-amber-900 flex items-center gap-1.5">
                                  🔸 সিমেন্ট লোডিং ও আনলোডিং খরচ (বস্তা হিসেবে)
                                </span>
                                <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[11px]">
                                  মোট পরিমাণ: {toBengaliDigits(cementTotalBags.toLocaleString('en-IN'))} বস্তা
                                </span>
                              </div>

                              {/* Cement Loading Section */}
                              <div className={cn(
                                "space-y-1.5 p-2 rounded-md transition-all",
                                cementLoadingToCustomerLedger ? "bg-amber-100/50 border border-amber-300" : "bg-slate-50/80 border border-slate-200"
                              )}>
                                <div className="flex items-center justify-between gap-2">
                                  <Label className="text-[11px] font-bold text-slate-700">লোডিং লেবার খরচ</Label>
                                  
                                  {/* Toggle Button for Customer Ledger */}
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={cementLoadingToCustomerLedger}
                                      onClick={() => setCementLoadingToCustomerLedger(!cementLoadingToCustomerLedger)}
                                      className={cn(
                                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-amber-500",
                                        cementLoadingToCustomerLedger ? "bg-amber-600" : "bg-slate-300"
                                      )}
                                      title="কাস্টমারের লেজারে যুক্ত বা বাদ দিতে ক্লিক করুন"
                                    >
                                      <span
                                        className={cn(
                                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                          cementLoadingToCustomerLedger ? "translate-x-4" : "translate-x-0"
                                        )}
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCementLoadingToCustomerLedger(!cementLoadingToCustomerLedger)}
                                      className={cn(
                                        "text-[9px] font-black px-1.5 py-0.5 rounded border select-none cursor-pointer transition-colors",
                                        cementLoadingToCustomerLedger 
                                          ? "bg-amber-200 text-amber-900 border-amber-400" 
                                          : "bg-slate-200 text-slate-600 border-slate-300"
                                      )}
                                    >
                                      {cementLoadingToCustomerLedger ? 'কাস্টমার লেজারে যুক্ত' : 'দোকান প্রদেয় / লেজারে বাদ'}
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-500 font-medium">রেট (৳/বস্তা)</span>
                                    <Input 
                                      type="text"
                                      inputMode="decimal"
                                      value={cementLaborRateInput}
                                      onChange={e => handleCementLaborRateChange(e.target.value)}
                                      placeholder="০.০০"
                                      className="rounded-md h-9 bg-white border-amber-300 text-xs font-bold text-slate-800 font-bengali"
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-slate-500 font-medium">মোট লোডিং (৳)</span>
                                      <span className="text-[9px] text-amber-700 font-bold">(রাউন্ড/এডিটযোগ্য)</span>
                                    </div>
                                    <Input 
                                      type="text"
                                      inputMode="decimal"
                                      value={cementLaborTotalInput !== '' ? cementLaborTotalInput : (cementLaborTotal > 0 ? String(cementLaborTotal) : '')}
                                      onChange={e => setCementLaborTotalInput(formatDecimalInput(e.target.value))}
                                      placeholder={cementLaborTotal > 0 ? String(cementLaborTotal) : '০.০০'}
                                      className="rounded-md h-9 bg-white border-amber-300 text-xs font-bold text-amber-700 font-bengali"
                                    />
                                  </div>
                                </div>
                                <span className={cn(
                                  "text-[10px] font-medium block",
                                  cementLoadingToCustomerLedger ? "text-amber-900" : "text-amber-800"
                                )}>
                                  {cementLoadingToCustomerLedger 
                                    ? '💡 সিমেন্ট লোডিং খরচ কাস্টমারের বিলে ও লেজারে যুক্ত হবে।' 
                                    : '💡 লোডিং খরচ কাস্টমারের বিলে যুক্ত হবে না, দোকান লোডিং বিল হিসেবে পরিশোধ হবে।'}
                                </span>
                              </div>

                              {/* Cement Unloading Rate with Customer Ledger Toggle */}
                              <div className={cn(
                                "pt-2 border-t border-amber-200/80 space-y-1.5 p-2 rounded-md transition-all",
                                cementUnloadingToCustomerLedger ? "bg-emerald-50/40" : "bg-slate-50/80 border border-slate-200"
                              )}>
                                <div className="flex items-center justify-between gap-2">
                                  <Label className="text-[11px] font-bold text-slate-700">আনলোডিং লেবার খরচ</Label>
                                  
                                  {/* Toggle Button for Customer Ledger */}
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={cementUnloadingToCustomerLedger}
                                      onClick={() => setCementUnloadingToCustomerLedger(!cementUnloadingToCustomerLedger)}
                                      className={cn(
                                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-emerald-500",
                                        cementUnloadingToCustomerLedger ? "bg-emerald-600" : "bg-slate-300"
                                      )}
                                      title="কাস্টমারের লেজারে যুক্ত বা বাদ দিতে ক্লিক করুন"
                                    >
                                      <span
                                        className={cn(
                                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                          cementUnloadingToCustomerLedger ? "translate-x-4" : "translate-x-0"
                                        )}
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCementUnloadingToCustomerLedger(!cementUnloadingToCustomerLedger)}
                                      className={cn(
                                        "text-[9px] font-black px-1.5 py-0.5 rounded border select-none cursor-pointer transition-colors",
                                        cementUnloadingToCustomerLedger 
                                          ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                                          : "bg-slate-200 text-slate-600 border-slate-300"
                                      )}
                                    >
                                      {cementUnloadingToCustomerLedger ? 'কাস্টমার লেজারে যুক্ত' : 'লেজারে যুক্ত নয়'}
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-500 font-medium">রেট (৳/বস্তা)</span>
                                    <Input 
                                      type="text"
                                      inputMode="decimal"
                                      value={cementUnloadingRateInput}
                                      onChange={e => handleCementUnloadingRateChange(e.target.value)}
                                      placeholder="০.০০"
                                      className={cn(
                                        "rounded-md h-9 bg-white text-xs font-bold font-bengali transition-colors",
                                        cementUnloadingToCustomerLedger ? "border-emerald-300 text-slate-800" : "border-slate-300 text-slate-800"
                                      )}
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-slate-500 font-medium">মোট আনলোডিং (৳)</span>
                                      <span className="text-[9px] text-emerald-700 font-bold">(রাউন্ড/এডিটযোগ্য)</span>
                                    </div>
                                    <Input 
                                      type="text"
                                      inputMode="decimal"
                                      value={cementUnloadingTotalInput !== '' ? cementUnloadingTotalInput : (cementUnloadingTotal > 0 ? String(cementUnloadingTotal) : '')}
                                      onChange={e => setCementUnloadingTotalInput(formatDecimalInput(e.target.value))}
                                      placeholder={cementUnloadingTotal > 0 ? String(cementUnloadingTotal) : '০.০০'}
                                      className={cn(
                                        "rounded-md h-9 bg-white text-xs font-bold font-bengali transition-colors",
                                        cementUnloadingToCustomerLedger ? "border-emerald-300 text-emerald-800" : "border-slate-300 text-slate-700"
                                      )}
                                    />
                                  </div>
                                </div>
                                <span className={cn(
                                  "text-[10px] font-medium block",
                                  cementUnloadingToCustomerLedger ? "text-emerald-800" : "text-amber-800"
                                )}>
                                  {cementUnloadingToCustomerLedger 
                                    ? '💡 আনলোডিং খরচ কাস্টমারের বিলে ও লেজারে যুক্ত হবে।' 
                                    : '💡 আনলোডিং খরচ কাস্টমারের বিলে বা লেজারে যুক্ত হবে না (দোকান বহন করবে / আলাদা হিসাব)।'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Dedicated Vehicle Fare Box */}
                          <div className={cn(
                            "border rounded-md p-3 space-y-2 transition-all",
                            shippingCostToCustomerLedger ? "bg-emerald-50/50 border-emerald-200" : "bg-slate-50/80 border-slate-200"
                          )}>
                            <div className="flex items-center justify-between text-xs gap-2">
                              <div className="flex items-center gap-1.5">
                                <Label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                                  🚚 পরিবহন / গাড়ি ভাড়া
                                </Label>
                                <span className="hidden sm:inline text-[10px] text-slate-500">
                                  (রেট দিলে হিসাব হবে অথবা সরাসরি মোট ভাড়া লিখুন)
                                </span>
                              </div>
                              {/* Toggle Button for Customer Ledger */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={shippingCostToCustomerLedger}
                                  onClick={() => setShippingCostToCustomerLedger(!shippingCostToCustomerLedger)}
                                  className={cn(
                                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-emerald-500",
                                    shippingCostToCustomerLedger ? "bg-emerald-600" : "bg-slate-300"
                                  )}
                                  title="কাস্টমারের লেজারে যুক্ত বা বাদ দিতে ক্লিক করুন"
                                >
                                  <span
                                    className={cn(
                                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                      shippingCostToCustomerLedger ? "translate-x-4" : "translate-x-0"
                                    )}
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShippingCostToCustomerLedger(!shippingCostToCustomerLedger)}
                                  className={cn(
                                    "text-[9px] font-black px-1.5 py-0.5 rounded border select-none cursor-pointer transition-colors",
                                    shippingCostToCustomerLedger 
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                                      : "bg-slate-200 text-slate-600 border-slate-300"
                                  )}
                                >
                                  {shippingCostToCustomerLedger ? 'কাস্টমার লেজারে যুক্ত' : 'লেজারে যুক্ত নয়'}
                                </button>
                              </div>
                            </div>
                            <span className={cn(
                              "text-[10px] font-medium block",
                              shippingCostToCustomerLedger ? "text-emerald-800" : "text-amber-800"
                            )}>
                              {shippingCostToCustomerLedger 
                                ? '💡 গাড়ি ভাড়া কাস্টমারের বিলে ও লেজারে যুক্ত হবে।' 
                                : '💡 গাড়ি ভাড়া কাস্টমারের বিলে বা লেজারে যুক্ত হবে না (দোকান বহন করবে / আলাদা হিসাব)।'}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {rodRingTotalKg > 0 && (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-slate-600 font-medium">রড গাড়ি ভাড়া (৳/কেজি)</span>
                                  <Input 
                                    type="text"
                                    inputMode="decimal"
                                    value={rodShippingRateInput}
                                    onChange={e => handleRodShippingRateChange(e.target.value)}
                                    placeholder="০.০০"
                                    className="rounded-md h-9 bg-white border-emerald-300 text-xs font-bold text-slate-800 font-bengali"
                                  />
                                </div>
                              )}
                              {cementTotalBags > 0 && (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-slate-600 font-medium">সিমেন্ট গাড়ি ভাড়া (৳/বস্তা)</span>
                                  <Input 
                                    type="text"
                                    inputMode="decimal"
                                    value={cementShippingRateInput}
                                    onChange={e => handleCementShippingRateChange(e.target.value)}
                                    placeholder="০.০০"
                                    className="rounded-md h-9 bg-white border-emerald-300 text-xs font-bold text-slate-800 font-bengali"
                                  />
                                </div>
                              )}
                              <div className={cn(
                                "space-y-0.5",
                                !(rodRingTotalKg > 0 || cementTotalBags > 0) && "sm:col-span-3",
                                ((rodRingTotalKg > 0 && cementTotalBags === 0) || (cementTotalBags > 0 && rodRingTotalKg === 0)) && "sm:col-span-2"
                              )}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-800 font-bold">মোট গাড়ি ভাড়া (৳)</span>
                                  <span className="text-[9px] text-emerald-700 font-bold">(রাউন্ড/এডিটযোগ্য)</span>
                                </div>
                                <Input 
                                  type="text"
                                  inputMode="decimal"
                                  value={shippingCostInput}
                                  onChange={e => setShippingCostInput(formatDecimalInput(e.target.value))}
                                  placeholder="০"
                                  className={cn(
                                    "rounded-md h-9 bg-white text-xs font-bold font-bengali transition-colors",
                                    shippingCostToCustomerLedger ? "border-emerald-300 text-slate-800" : "border-slate-300 text-slate-700"
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                    </CardContent>
                  </Card>

                  {/* STEP 4: Register Payment */}
                  <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                    <CardContent className="p-5 space-y-4">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5 font-bengali">
                        <span className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center">৪</span>
                        পেমেন্ট এন্ট্রি বিবরণ
                      </Label>

                      <div className="flex items-center gap-4 text-xs font-bold pt-1 font-bengali">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="radio" 
                            name="paymentOption" 
                            checked={paymentOption === 'now'}
                            onChange={() => setPaymentOption('now')}
                            className="accent-emerald-600"
                          />
                          <span>● এখনই পেমেন্ট জমা নিবেন</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="radio" 
                            name="paymentOption" 
                            checked={paymentOption === 'later'}
                            onChange={() => {
                              setPaymentOption('later');
                              setInvoicePaidAmountInput('');
                              setCashPaidAmountInput('');
                              setChequePaidAmountInput('');
                            }}
                            className="accent-emerald-600"
                          />
                          <span>○ পরে পেমেন্ট রেকর্ড করবেন</span>
                        </label>
                      </div>

                      {paymentOption === 'now' && (
                        <div className="space-y-3 pt-1 font-bengali">
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                              <div className="space-y-1 sm:col-span-1 min-w-0">
                                <Label className="text-[11px] font-bold text-slate-600">পেমেন্ট মাধ্যম</Label>
                                <Select value={invoicePaymentMethod} onValueChange={(val: string | null) => {
                                  const method = val || 'Cash';
                                  setInvoicePaymentMethod(method);
                                  if (method !== 'Split') {
                                    setCashPaidAmountInput('');
                                    setChequePaidAmountInput('');
                                  }
                                }}>
                                  <SelectTrigger className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-bengali w-full overflow-hidden">
                                    <SelectValue>
                                      {invoicePaymentMethod === 'Cash' ? '💵 নগদ (Cash)' :
                                       invoicePaymentMethod === 'Split' ? '💵+📄 নগদ ও চেক (স্প্লিট)' :
                                       invoicePaymentMethod === 'Cheque' ? '📄 চেক (Cheque)' :
                                       invoicePaymentMethod === 'Bank' ? '🏦 ব্যাংক ট্রান্সফার' :
                                       invoicePaymentMethod === 'BankToBank' ? '🔄 ব্যাংক-টু-ব্যাংক' : '💵 নগদ (Cash)'}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="font-bengali text-xs font-bold">
                                    <SelectItem value="Cash">💵 নগদ (Cash)</SelectItem>
                                    <SelectItem value="Split">💵+📄 নগদ ও চেক (স্প্লিট পেমেন্ট)</SelectItem>
                                    <SelectItem value="Cheque">📄 চেক (Cheque)</SelectItem>
                                    <SelectItem value="Bank">🏦 ব্যাংক ট্রান্সফার</SelectItem>
                                    <SelectItem value="BankToBank">🔄 ব্যাংক-টু-ব্যাংক</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {invoicePaymentMethod === 'Split' ? (
                                <>
                                  <div className="space-y-1 min-w-0">
                                    <Label className="text-[11px] font-bold text-slate-700 truncate block">নগদ জমার পরিমাণ (৳)</Label>
                                    <Input 
                                      type="text"
                                      inputMode="decimal"
                                      value={cashPaidAmountInput}
                                      onChange={e => setCashPaidAmountInput(formatDecimalInput(e.target.value))}
                                      placeholder="০"
                                      className="rounded-md h-10 bg-emerald-50/70 border-emerald-300 text-xs font-black text-emerald-700 font-bengali w-full"
                                    />
                                  </div>
                                  <div className="space-y-1 min-w-0">
                                    <Label className="text-[11px] font-bold text-slate-700 truncate block">চেক জমার পরিমাণ (৳)</Label>
                                    <Input 
                                      type="text"
                                      inputMode="decimal"
                                      value={chequePaidAmountInput}
                                      onChange={e => setChequePaidAmountInput(formatDecimalInput(e.target.value))}
                                      placeholder="০"
                                      className="rounded-md h-10 bg-purple-50/70 border-purple-300 text-xs font-black text-purple-700 font-bengali w-full"
                                    />
                                  </div>
                                </>
                              ) : (
                                <div className="space-y-1 sm:col-span-2">
                                  <Label className="text-[11px] font-bold text-slate-600">পরিশোধিত জমার পরিমাণ (৳)</Label>
                                  <Input 
                                    type="text"
                                    inputMode="decimal"
                                    value={invoicePaidAmountInput}
                                    onChange={e => {
                                      const formatted = formatDecimalInput(e.target.value);
                                      setInvoicePaidAmountInput(formatted);
                                      if (invoicePaymentMethod === 'Cash') setCashPaidAmountInput(formatted);
                                      if (invoicePaymentMethod === 'Cheque') setChequePaidAmountInput(formatted);
                                    }}
                                    placeholder="০"
                                    className="rounded-md h-10 bg-emerald-50/60 border-emerald-200 text-xs font-black text-emerald-600 font-bengali"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Total Paid Display Banner for Split */}
                            {invoicePaymentMethod === 'Split' && (
                              <div className="p-2.5 bg-slate-100/80 rounded-md border border-slate-200 flex items-center justify-between text-xs font-bold font-bengali">
                                <span className="text-slate-600">মোট প্রাপ্তি (নগদ ৳{toBengaliDigits(cashPaidAmount.toLocaleString('en-IN'))} + চেক ৳{toBengaliDigits(chequePaidAmount.toLocaleString('en-IN'))}):</span>
                                <span className="text-sm font-black text-emerald-700">৳{toBengaliDigits((cashPaidAmount + chequePaidAmount).toLocaleString('en-IN'))}</span>
                              </div>
                            )}

                            {/* BANK TRANSFER (SAVED BANK ACCOUNTS SELECTOR) */}
                            {invoicePaymentMethod === 'Bank' && (
                              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-md space-y-2 font-bengali text-xs animate-in fade-in-0">
                                <p className="font-bold text-blue-900 flex items-center gap-1">
                                  🏦 সেভ করা দোকান ব্যাংক অ্যাকাউন্ট
                                </p>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-slate-600">গ্রহীতার ব্যাংক অ্যাকাউন্ট (দোকান)</Label>
                                  <Select value={selectedShopBank} onValueChange={(val: string | null) => setSelectedShopBank(val || '')}>
                                    <SelectTrigger className="h-8 rounded-md bg-white text-xs font-bold border-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="font-bengali text-xs font-bold">
                                      {savedBanks.length > 0 ? (
                                        savedBanks.map(b => (
                                          <SelectItem key={b.id} value={`${b.name} (${b.accNo})`}>
                                            {b.name} {b.accNo ? `- ${b.accNo}` : ''}
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
                                <div>
                                  <Label className="text-[10px] font-bold text-slate-600">ট্রানজেকশন / রেফারেন্স আইডি (অপশনাল)</Label>
                                  <Input 
                                    placeholder="Txn ID" 
                                    value={transactionRef} 
                                    onChange={e => setTransactionRef(e.target.value)}
                                    className="h-8 rounded-md bg-white text-xs font-mono"
                                  />
                                </div>
                              </div>
                            )}

                            {/* BANK TO BANK TRANSFER (RECEIVER SAVED SELECTOR + SENDER CUSTOMER INPUTS) */}
                            {invoicePaymentMethod === 'BankToBank' && (
                              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-md space-y-3 font-bengali text-xs animate-in fade-in-0">
                                <p className="font-bold text-indigo-900 flex items-center gap-1">
                                  🔄 ব্যাংক-টু-ব্যাংক ট্রান্সফার বিস্তারিত
                                </p>
                                
                                {/* RECEIVER SHOP BANK */}
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-indigo-950 block">
                                    ১. গ্রহীতার ব্যাংক অ্যাকাউন্ট (দোকানের সেভ করা অ্যাকাউন্ট)
                                  </Label>
                                  <Select value={selectedShopBank} onValueChange={(val: string | null) => setSelectedShopBank(val || '')}>
                                    <SelectTrigger className="h-8 rounded-md bg-white text-xs font-bold border-indigo-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="font-bengali text-xs font-bold">
                                      {savedBanks.length > 0 ? (
                                        savedBanks.map(b => (
                                          <SelectItem key={b.id} value={`${b.name} (${b.accNo})`}>
                                            {b.name} - {b.accNo}
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

                                {/* SENDER CUSTOMER BANK INPUTS */}
                                <div className="space-y-2 pt-2 border-t border-indigo-100">
                                  <Label className="text-[10px] font-bold text-slate-700 block">
                                    ২. প্রেরকের ব্যাংক তথ্য (কাস্টমারের ব্যাংক অ্যাকাউন্ট)
                                  </Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-[10px] font-bold text-slate-600">প্রেরক ব্যাংকের নাম</Label>
                                      <Input 
                                        placeholder="ইবিএল / প্রাইম ব্যাংক / ব্যাংকের নাম" 
                                        value={senderBankName} 
                                        onChange={e => setSenderBankName(e.target.value)}
                                        className="h-8 rounded-md bg-white text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] font-bold text-slate-600">প্রেরকের অ্যাকাউন্ট নং / নাম</Label>
                                      <Input 
                                        placeholder="A/C No or Name" 
                                        value={senderAccountNo} 
                                        onChange={e => setSenderAccountNo(e.target.value)}
                                        className="h-8 rounded-md bg-white text-xs font-mono"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <Label className="text-[10px] font-bold text-slate-600">ট্রানজেকশন / রেফারেন্স আইডি</Label>
                                      <Input 
                                        placeholder="Txn ID / Ref No" 
                                        value={senderTxnRef} 
                                        onChange={e => setSenderTxnRef(e.target.value)}
                                        className="h-8 rounded-md bg-white text-xs font-mono"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* CHEQUE DETAILS (Show when method is Cheque or Split or chequePaidAmount > 0) */}
                            {(invoicePaymentMethod === 'Cheque' || invoicePaymentMethod === 'Split' || chequePaidAmount > 0) && (
                              <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-md space-y-2 font-bengali text-xs animate-in fade-in-0 shadow-2xs">
                                <p className="font-bold text-purple-900 flex items-center gap-1.5">
                                  📄 অভাঙানো চেকের বিস্তারিত (পেন্ডিং চেকের তালিকায় যুক্ত হবে)
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <Label className="text-[10px] font-bold text-purple-900">ব্যাংকের নাম</Label>
                                    <Input 
                                      placeholder="ব্যাংকের নাম" 
                                      value={bankName} 
                                      onChange={e => setBankName(e.target.value)}
                                      className="h-8 rounded-md bg-white text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] font-bold text-purple-900">চেক নম্বর</Label>
                                    <Input 
                                      placeholder="CQ-10023" 
                                      value={chequeNo} 
                                      onChange={e => setChequeNo(e.target.value)} 
                                      className="h-8 rounded-md bg-white text-xs font-mono" 
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] font-bold text-purple-900">চেকের তারিখ</Label>
                                    <BengaliDatePicker 
                                      value={chequeDate} 
                                      onChange={val => setChequeDate(val)} 
                                      placeholder="তারিখ নির্বাচন" 
                                      className="w-full" 
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </div>

                {/* STEP 5: Notes (Optional) */}
                <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                  <CardContent className="p-5 space-y-3">
                    <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center">৫</span>
                      বিশেষ নির্দেশনার নোট (ঐচ্ছিক)
                    </Label>

                    <textarea
                      rows={3}
                      value={invoiceNote}
                      onChange={e => setInvoiceNote(e.target.value)}
                      placeholder="যে কোনো বিশেষ নির্দেশনার নোট লিখুন..."
                      className="w-full rounded-md p-3 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </CardContent>
                </Card>

              </div>

              {/* RIGHT 3 COLUMNS: SUMMARY SIDEBAR CARDS (Light Theme) */}
              <div className="lg:col-span-3 space-y-4">
                
                {/* CARD 1: INVOICE SUMMARY */}
                <Card className="bg-white border-slate-200/80 rounded-md shadow-xs overflow-hidden">
                  <CardContent className="p-5 space-y-4 font-bengali">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">ইনভয়েস সারসংক্ষেপ</h3>
                      </div>
                      <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded-sm border border-emerald-200 uppercase tracking-widest">
                        ড্রাফট
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-semibold">
                      <div className="flex justify-between text-slate-500">
                        <span>কাস্টমার / দোকান</span>
                        <span className="font-bold text-slate-900">{selectedCustomer?.name || 'সাধারণ ক্রেতা'}</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>মোবাইল নম্বর</span>
                        <span className="font-bold text-slate-800">{selectedCustomer?.phone ? toBengaliDigits(selectedCustomer.phone) : '—'}</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>ঠিকানা</span>
                        <span className="font-bold text-slate-800 text-right max-w-[120px] truncate">{selectedCustomer?.address || 'ঠিকানা দেওয়া হয়নি'}</span>
                      </div>

                      <div className="flex justify-between text-slate-500 pt-2 border-t border-slate-100">
                        <span>ইনভয়েস নম্বর</span>
                        <span className="font-bold text-slate-800">স্বয়ংক্রিয় (অটো)</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>ইনভয়েস তারিখ</span>
                        <span className="font-bold text-slate-800">{invoiceDate || toBengaliDigits(format(new Date(), 'dd/MM/yyyy'))}</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>চালানের ধরণ</span>
                        <span className="font-bold text-slate-800">বিক্রয়</span>
                      </div>

                      <div className="space-y-1.5 pt-3 border-t border-slate-100">
                        <div className="flex justify-between text-slate-600">
                          <span>পণ্যের মোট মূল্য</span>
                          <span className="font-bold text-slate-900">৳ {toBengaliDigits(cartSubtotal.toLocaleString('en-IN'))}</span>
                        </div>

                        {cartTotalDiscount > 0 && (
                          <div className="flex justify-between text-emerald-600">
                            <span>মোট ছাড়</span>
                            <span className="font-bold">- ৳ {toBengaliDigits(cartTotalDiscount.toLocaleString('en-IN'))}</span>
                          </div>
                        )}

                        {shippingCost > 0 && (
                          shippingCostToCustomerLedger ? (
                            <div className="flex justify-between text-blue-600">
                              <span>গাড়ি ভাড়া</span>
                              <span className="font-bold">+ ৳ {toBengaliDigits(shippingCost.toLocaleString('en-IN'))}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center bg-blue-50/60 p-1.5 rounded border border-blue-200 text-[11px] text-blue-900 font-bold">
                              <span>গাড়ি ভাড়া (দোকান প্রদেয় / লেজারে বাদ):</span>
                              <span className="font-black font-mono">৳ {toBengaliDigits(shippingCost.toLocaleString('en-IN'))} (বিলে যুক্ত নয়)</span>
                            </div>
                          )
                        )}

                        {rodLaborTotal > 0 && (
                          rodLoadingToCustomerLedger ? (
                            <div className="flex justify-between text-sky-700">
                              <span>রড লোডিং লেবার</span>
                              <span className="font-bold">+ ৳ {toBengaliDigits(rodLaborTotal.toLocaleString('en-IN'))}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center bg-sky-50/60 p-1.5 rounded border border-sky-200 text-[11px] text-sky-900 font-bold">
                              <span>রড লোডিং (দোকান প্রদেয়):</span>
                              <span className="font-black font-mono">৳ {toBengaliDigits(rodLaborTotal.toLocaleString('en-IN'))} (বিলে যুক্ত নয়)</span>
                            </div>
                          )
                        )}

                        {rodUnloadingTotal > 0 && (
                          rodUnloadingToCustomerLedger ? (
                            <div className="flex justify-between text-emerald-700">
                              <span>রড আনলোডিং লেবার</span>
                              <span className="font-bold">+ ৳ {toBengaliDigits(rodUnloadingTotal.toLocaleString('en-IN'))}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center bg-emerald-50/60 p-1.5 rounded border border-emerald-200 text-[11px] text-emerald-900 font-bold">
                              <span>রড আনলোডিং (দোকান প্রদেয়):</span>
                              <span className="font-black font-mono">৳ {toBengaliDigits(rodUnloadingTotal.toLocaleString('en-IN'))} (বিলে যুক্ত নয়)</span>
                            </div>
                          )
                        )}

                        {cementLaborTotal > 0 && (
                          cementLoadingToCustomerLedger ? (
                            <div className="flex justify-between text-amber-700">
                              <span>সিমেন্ট লোডিং লেবার</span>
                              <span className="font-bold">+ ৳ {toBengaliDigits(cementLaborTotal.toLocaleString('en-IN'))}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center bg-amber-50 p-1.5 rounded border border-amber-200 text-[11px] text-amber-900 font-bold">
                              <span>সিমেন্ট লোডিং (দোকান প্রদেয়):</span>
                              <span className="font-black font-mono">৳ {toBengaliDigits(cementLaborTotal.toLocaleString('en-IN'))} (বিলে যুক্ত নয়)</span>
                            </div>
                          )
                        )}

                        {cementUnloadingTotal > 0 && (
                          cementUnloadingToCustomerLedger ? (
                            <div className="flex justify-between text-emerald-700">
                              <span>সিমেন্ট আনলোডিং লেবার</span>
                              <span className="font-bold">+ ৳ {toBengaliDigits(cementUnloadingTotal.toLocaleString('en-IN'))}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center bg-emerald-50/60 p-1.5 rounded border border-emerald-200 text-[11px] text-emerald-900 font-bold">
                              <span>সিমেন্ট আনলোডিং (দোকান প্রদেয়):</span>
                              <span className="font-black font-mono">৳ {toBengaliDigits(cementUnloadingTotal.toLocaleString('en-IN'))} (বিলে যুক্ত নয়)</span>
                            </div>
                          )
                        )}

                        {chargeCalcMode === 'manual' && manualLaborCost > 0 && (
                          <div className="flex justify-between text-amber-600">
                            <span>লেবার খরচ</span>
                            <span className="font-bold">+ ৳ {toBengaliDigits(manualLaborCost.toLocaleString('en-IN'))}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-slate-700 font-bold pt-1">
                          <span>সর্বমোট ইনভয়েস বিল</span>
                          <span className="font-black text-slate-900">৳ {toBengaliDigits(cartTotalAmount.toLocaleString('en-IN'))}</span>
                        </div>

                        {selectedCustomerAdvance > 0 ? (
                          <div className="flex justify-between text-emerald-600 font-bold">
                            <span>পূর্বের অগ্রিম জমা</span>
                            <span className="font-black">- ৳ {toBengaliDigits(selectedCustomerAdvance.toLocaleString('en-IN'))}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between text-rose-600 font-bold">
                            <span>পূর্বের বকেয়া</span>
                            <span className="font-black">+ ৳ {toBengaliDigits(selectedCustomerDue.toLocaleString('en-IN'))}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                        <div>
                          <span className="text-xs font-bold text-slate-700 block">
                            {selectedCustomerAdvance > 0 ? 'সমন্বয় পরবর্তী প্রদেয়' : 'সর্বমোট প্রদেয় বিল (বকেয়াসহ)'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {selectedCustomerAdvance > 0 ? 'চালান বিল - পূর্বের অগ্রিম' : 'চালান + পূর্বের বকেয়া'}
                          </span>
                        </div>
                        <span className="text-2xl font-black text-orange-600">৳ {toBengaliDigits(netPayableWithPrevious.toLocaleString('en-IN'))}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* CARD 2: PAYMENT SUMMARY */}
                <Card className="bg-white border-slate-200/80 rounded-md shadow-xs overflow-hidden">
                  <CardContent className="p-5 space-y-3 font-bengali">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">পেমেন্ট সারসংক্ষেপ</h3>
                      </div>
                    </div>

                    <div className="text-center py-2 bg-slate-50 rounded-md border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase block">
                        {invoicePaidAmount > 0 ? `জমা: ৳ ${toBengaliDigits(invoicePaidAmount.toLocaleString('en-IN'))}` : 'কোনো পেমেন্ট দেওয়া হয়নি'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
                      <span className="font-bold text-slate-600">সর্বশেষ অবশিষ্ট বকেয়া</span>
                      <span className="text-lg font-black text-rose-600">৳ {toBengaliDigits(cartDueAmount.toLocaleString('en-IN'))}</span>
                    </div>
                  </CardContent>
                </Card>

              </div>

            </div>
          {/* STICKY BOTTOM ACTION BAR INSIDE FRAME */}
          <div className="bg-white border-t border-slate-300 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm font-bengali flex-shrink-0">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Lightbulb className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>সংরক্ষণের পূর্বে সব তথ্য পুনরায় পরীক্ষা করে নিন।</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => { setIsCreateInvoiceOpen(false); resetCreateForm(); }}
                className="rounded-md h-11 px-5 font-bold text-slate-600 border-slate-300 hover:bg-slate-50"
              >
                বাতিল করুন
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="rounded-md h-11 px-6 font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'চালান সম্পূর্ণ করুন ✓'}
              </Button>
            </div>
          </div>
          </form>
        </div>
      </div>
      )}

 

      {/* GATE PASS / DELIVERY CHALAN MODAL */}
      <Dialog open={isGatePassOpen} onOpenChange={setIsGatePassOpen}>
        <DialogContent className="max-w-2xl rounded-md p-6 bg-white font-bengali">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>মেসার্স রড & সিমেন্ট স্টোর</span>
                </DialogTitle>
                <p className="text-xs font-bold text-emerald-600 tracking-wider uppercase mt-0.5">ডেলিভারি চালান / গেট পাস (Delivery Chalan & Gate Pass)</p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-sm">#{(selectedInvoice as any)?.id?.toUpperCase() || ''}</span>
            </div>
          </DialogHeader>

          {(() => {
            const currentInvoice = selectedInvoice as Invoice | null;
            if (!currentInvoice) return null;
            return (
              <div id="gate-pass-printable-wrapper" className="space-y-4 py-3 text-xs">
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-md">
                  <div>
                    <span className="font-bold text-slate-400 text-[11px] block">কাস্টমার / দোকান</span>
                    <span className="font-black text-slate-900 text-sm">{currentInvoice.customerName}</span>
                    <span className="block text-slate-500">{currentInvoice.customerPhone}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 text-[11px] block">ডেলিভারি সাইটের ঠিকানা</span>
                    <span className="font-bold text-slate-800">{currentInvoice.deliveryAddress || currentInvoice.customerAddress || 'প্রধান ঠিকানা'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 text-[11px] block">গাড়ি / ট্রাক নম্বর</span>
                    <span className="font-black text-emerald-600">{currentInvoice.vehicleNo || 'তথ্য দেওয়া হয়নি'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 text-[11px] block">ড্রাইভারের নাম ও মোবাইল</span>
                    <span className="font-bold text-slate-800">{currentInvoice.driverName || '—'} {currentInvoice.driverPhone ? `(${currentInvoice.driverPhone})` : ''}</span>
                  </div>
                </div>

                {/* Items Table for Gate Pass */}
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow className="text-[11px]">
                        <TableHead className="w-12 text-center font-black">#</TableHead>
                        <TableHead className="font-black">পণ্যের নাম (Product)</TableHead>
                        <TableHead className="text-center font-black">পরিমাণ (Quantity)</TableHead>
                        <TableHead className="text-center font-black">একক (Unit)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentInvoice.items?.map((item: any, idx: number) => (
                        <TableRow key={idx} className="border-b border-slate-100">
                          <TableCell className="text-center font-bold text-slate-400">{idx + 1}</TableCell>
                          <TableCell className="font-black text-slate-800 text-sm">{item.name}</TableCell>
                          <TableCell className="text-center font-black text-emerald-600 text-base">{item.quantity}</TableCell>
                          <TableCell className="text-center font-bold text-slate-600">{item.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="pt-6 grid grid-cols-3 gap-4 text-center text-[11px] font-bold text-slate-500">
                  <div className="border-t border-slate-300 pt-2">প্রস্তুতকারীর স্বাক্ষর</div>
                  <div className="border-t border-slate-300 pt-2">ড্রাইভারের স্বাক্ষর</div>
                  <div className="border-t border-slate-300 pt-2">গ্রহীতার স্বাক্ষর</div>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsGatePassOpen(false)} className="rounded-md font-bold">
              বন্ধ করুন
            </Button>
            <Button onClick={() => printElement('gate-pass-printable-wrapper')} className="rounded-md font-bold bg-slate-900 text-white hover:bg-slate-800">
              🖨️ গেট পাস প্রিন্ট করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE INVOICE CONFIRMATION DIALOG */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md rounded-md p-6 bg-white font-bengali">
          <DialogHeader className="text-center sm:text-left">
            <div className="mx-auto sm:mx-0 w-12 h-12 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-black text-slate-900">
              চালানটি মুছে ফেলতে চান?
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              আপনি কি নিশ্চিত যে চালান <span className="font-mono font-bold text-slate-700">#{deletingInvoice?.id.slice(0, 8).toUpperCase()}</span> মুছে ফেলতে চান? 
              <br /><br />
              <strong className="text-rose-600 block">⚠️ সতর্কতা:</strong>
              চালানটি মুছে ফেললে পণ্যের স্টক পুনরায় গুদামে যুক্ত হবে এবং কাস্টমারের বকেয়া/মোট খরচ ব্যালেন্স স্বয়ংক্রিয়ভাবে সমন্বয় করা হবে।
            </p>
          </DialogHeader>

          <DialogFooter className="flex gap-2 pt-4 border-t border-slate-100 mt-4">
            <Button 
              variant="outline" 
              onClick={() => { setIsDeleteDialogOpen(false); setDeletingInvoice(null); }} 
              className="rounded-md font-bold flex-1"
              disabled={isDeleting}
            >
              বাতিল
            </Button>
            <Button 
              onClick={handleDeleteInvoiceConfirm} 
              disabled={isDeleting}
              className="rounded-md font-black bg-rose-600 hover:bg-rose-700 text-white flex-1 shadow-md shadow-rose-600/20"
            >
              {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bengali font-bold text-slate-400">লোড হচ্ছে...</div>}>
      <InvoicesContent />
    </Suspense>
  );
}
