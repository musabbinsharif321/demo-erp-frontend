'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Shell } from '@/components/Shell';
import { api, CustomerSiteData } from '@/lib/api';
import { 
  Search, Eye, Printer, X, FileText, Receipt, Banknote, AlertCircle, Trash2, CheckCircle2, Plus, 
  ShoppingCart, User, Tag, ArrowRight, ShieldAlert, Clock, Truck, HardHat, Calendar, MapPin, PhoneCall, Building,
  Paperclip, HelpCircle, Bell, Info, Save, Package, MoreVertical, Pencil, Filter, ChevronUp, ChevronDown, RotateCcw, ArrowLeft, Lightbulb, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { cn, fixMiliName } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { InvoiceMemo } from '@/components/InvoiceMemo';
import { printElement } from '@/lib/printUtils';
import { toBengaliDigits, toEnglishDigits, formatProductName } from '@/lib/bengaliUtils';
import { CustomerSearchSelect } from '@/components/CustomerSearchSelect';
import { ProductSearchSelect } from '@/components/ProductSearchSelect';
import { CascadingProductSelector, SelectedProductDetails } from '@/components/CascadingProductSelector';
import { CartItemQtyInput } from '@/components/CartItemQtyInput';
import { BengaliDateRangePicker } from '@/components/ui/BengaliDateRangePicker';
import { BengaliDatePicker } from '@/components/ui/BengaliDatePicker';
import { useAuth } from '@/lib/authContext';

interface Product { 
  id: string; 
  name: string; 
  sellPrice: number; 
  stock: number; 
  unit: string; 
  category: string; 
  code?: string;
}

interface Customer { 
  id: string; 
  name: string; 
  phone?: string; 
  address?: string; 
  businessName?: string; 
  sites?: CustomerSiteData[];
}

interface OrderItem { 
  id: string; 
  name: string; 
  unit: string; 
  price: number; 
  quantity: number; 
  discount: number; 
  bundle?: number | string;
  series?: string;
  variant?: string;
}

interface Order { 
  id: string; 
  orderId?: string; 
  customerName: string; 
  customerPhone: string; 
  customerAddress?: string; 
  businessName?: string; 
  customerId?: string; 
  customerSiteId?: string;
  siteName?: string;
  siteAddress?: string;
  siteContact?: string;
  totalAmount: number; 
  paidAmount: number; 
  dueAmount: number; 
  items: OrderItem[]; 
  stage: 'draft' | 'pending' | 'approved' | 'rejected';
  paymentStatus: string; 
  createdAt: any; 
  note?: string;
  transportCost?: number;
  laborCost?: number;
  vehicleNo?: string;
  driverInfo?: string;
  expectedPaymentDate?: string;
  invoiced?: boolean;
}

export default function OrdersPage() {
  const router = useRouter();
  const { canEditInvoice, canDeleteInvoice, canCreateInvoice, isViewer } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('সব');
  const [filterStatus, setFilterStatus] = useState('সব');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [minBill, setMinBill] = useState('');
  const [maxBill, setMaxBill] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleResetFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setFilterStatus('সব');
    setMinBill('');
    setMaxBill('');
  };

  // Invoice & Print Modal States
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPrintMemoOpen, setIsPrintMemoOpen] = useState(false);
  const [orderToInvoice, setOrderToInvoice] = useState<Order | null>(null);
  const [invoicePaid, setInvoicePaid] = useState<number>(0);
  const [invoiceMethod, setInvoiceMethod] = useState<string>('Cash');
  const [bankName, setBankName] = useState<string>('');
  const [chequeNo, setChequeNo] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>('');

  // Form States
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('পেন্ডিং');
  const [autoOrderId, setAutoOrderId] = useState<string>('');

  // Customer Selection States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', address: '', businessName: '' });
  const [siteAddress, setSiteAddress] = useState('');
  const [siteContact, setSiteContact] = useState('');
  const [customerSites, setCustomerSites] = useState<CustomerSiteData[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('none');
  const [siteName, setSiteName] = useState<string>('');
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
    } else if (activeVal === 'new') {
      setSiteName('');
      setSiteAddress('');
      setSiteContact('');
    } else {
      const site = customerSites.find(s => String(s.id) === String(activeVal));
      if (site) {
        setSiteName(site.name);
        setSiteAddress(site.address || '');
        const contactInfo = site.contact_person ? `${site.contact_person}${site.contact_phone ? ` (${site.contact_phone})` : ''}` : (site.contact_phone || '');
        setSiteContact(contactInfo);
      }
    }
  };

  // Bank & Payment Details
  const [savedBanks, setSavedBanks] = useState<{ id: string; name: string; accNo: string; balance?: number }[]>([]);
  const [selectedShopBank, setSelectedShopBank] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [senderBankName, setSenderBankName] = useState('');
  const [senderAccountNo, setSenderAccountNo] = useState('');
  const [senderTxnRef, setSenderTxnRef] = useState('');

  // Cart & Item Selector States
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedCascadingProduct, setSelectedCascadingProduct] = useState<SelectedProductDetails | null>(null);
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemDiscount, setItemDiscount] = useState<number>(0);
  const [bundleCount, setBundleCount] = useState<string>('');

  // Transport & Advance Logistics States
  const [transportCost, setTransportCost] = useState<number>(300);
  const [laborCost, setLaborCost] = useState<number>(0);
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverInfo, setDriverInfo] = useState('');
  const [advancePaid, setAdvancePaid] = useState<number>(5000);
  const [advanceMethod, setAdvanceMethod] = useState('Cash');
  const [expectedPaymentDate, setExpectedPaymentDate] = useState('');
  const [orderNote, setOrderNote] = useState<string>('');

  // Reference ERP Form Screen-Matched States
  const [orderDate, setOrderDate] = useState('২৮/০৭/২০২৬');
  const [deliveryDate, setDeliveryDate] = useState('৩১/০৭/২০২৬');
  const [requiredDelivery, setRequiredDelivery] = useState('না');
  const [itemUnit, setItemUnit] = useState('বস্তা (Bag)');
  const [salesRepresentative, setSalesRepresentative] = useState('রাশেদ আহমেদ');
  const [referenceReceiver, setReferenceReceiver] = useState('মোঃ করিম উদ্দিন');
  const [deliveryAddressText, setDeliveryAddressText] = useState('বাড়ি নং-১২, রোড নং-৫, মিরপুর, ঢাকা-১২১৬');
  const [deliveryInstruction, setDeliveryInstruction] = useState('');
  const [customerNoteText, setCustomerNoteText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [deliveryNoteText, setDeliveryNoteText] = useState('');
  const [vatRate, setVatRate] = useState(0);

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [paymentMethodSelect, setPaymentMethodSelect] = useState('ক্যাশ');
  const [paymentReferenceNo, setPaymentReferenceNo] = useState('—');
  const [cashBankAccount, setCashBankAccount] = useState('নগদ ব্যাংক');

  const generateOrderCode = () => 'ORD-' + Math.floor(100000 + Math.random() * 900000);

  const loadOrdersData = async () => {
    try {
      setLoading(true);
      const sales = await api.transactions.list({ transaction_type: 'sale' });
      setOrders(sales.map(s => {
        let meta: any = {};
        if (s.notes && typeof s.notes === 'string' && s.notes.trim().startsWith('{')) {
          try {
            meta = JSON.parse(s.notes.split('\n')[0]);
          } catch {}
        }
        const isInvoiced = meta.invoiced === true || s.status === 'completed' || s.status === 'invoiced' || s.status === 'approved';
        return {
          id: String(s.id),
          orderId: s.invoice_no,
          customerName: s.party_name || 'গ্রাহক',
          customerPhone: s.party_phone || '',
          customerId: String(s.party || ''),
          customerSiteId: s.customer_site ? String(s.customer_site) : (meta.customerSiteId ? String(meta.customerSiteId) : ''),
          siteName: s.site_name || meta.siteName || meta.site_name || '',
          siteAddress: s.site_address || meta.siteAddress || meta.site_address || '',
          siteContact: s.site_contact || meta.siteContact || meta.site_contact || '',
          totalAmount: s.total_amount,
          paidAmount: s.paid_amount,
          dueAmount: s.due_amount,
          stage: isInvoiced ? 'approved' : 'pending',
          invoiced: isInvoiced,
          paymentStatus: s.due_amount <= 0 ? 'paid' : 'unpaid',
          items: (s.items || []).map(i => ({
            id: String(i.product || i.id || ''),
            name: formatProductName(fixMiliName(i.product_name)),
            price: i.price,
            quantity: i.quantity,
            unit: i.unit || 'পিস',
            discount: 0
          })),
          createdAt: s.created_at
        };
      }));

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
      setCustomers(partyList.map(p => ({
        id: String(p.id),
        name: p.name,
        phone: p.phone,
        address: p.address || '',
        businessName: p.business_name || ''
      })));

      const bankList = await api.banks.list();
      setSavedBanks(bankList.map(b => ({
        id: String(b.id),
        name: b.name,
        accNo: b.account_number || ''
      })));
    } catch (err) {
      console.error('Error loading orders data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toBnDigits = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null || val === '') return '';
    return String(val).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadOrdersData();
    })();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'create') {
        queueMicrotask(() => {
          setIsCreateOrderOpen(true);
        });
      }
      const targetId = params.get('id') || params.get('view');
      if (targetId && orders.length > 0) {
        const match = orders.find(o => String(o.id) === String(targetId) || o.orderId === targetId);
        if (match) {
          queueMicrotask(() => {
            setSelectedOrder(match);
          });
        }
      }
    }
  }, [orders]);

  const toggleMenu = (e: React.MouseEvent<HTMLButtonElement>, orderId: string) => {
    e.stopPropagation();
    if (openMenuId === orderId) {
      setOpenMenuId(null);
      setMenuPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 130;
    const menuWidth = 180;

    const openAbove = rect.top > menuHeight + 10;
    const top = openAbove ? rect.top - menuHeight - 6 : rect.bottom + 6;
    const left = Math.min(window.innerWidth - menuWidth - 10, Math.max(10, rect.right - menuWidth));

    setMenuPos({ top, left });
    setOpenMenuId(orderId);
  };

  const handleOpenCreateModal = () => {
    setEditingOrderId(null);
    resetCreateForm();
    setAutoOrderId(generateOrderCode());
    setIsCreateOrderOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrderId(order.id);
    setAutoOrderId((order as any).orderId || order.id);
    setOrderStatus((order as any).status || 'পেন্ডিং');
    setOrderDate((order as any).orderDate || new Date().toISOString().split('T')[0]);
    
    const foundCust = customers.find(c => c.id === order.customerId);
    if (foundCust) {
      setSelectedCustomer(foundCust);
      setIsNewCustomer(false);
      loadSitesForCustomer(foundCust.id);
    } else {
      setSelectedCustomer(null);
      setIsNewCustomer(true);
      setNewCustomerData({
        name: order.customerName || '',
        phone: order.customerPhone || '',
        address: order.customerAddress || '',
        businessName: ''
      });
      setCustomerSites([]);
    }

    if (order.customerSiteId) {
      setSelectedSiteId(order.customerSiteId);
    } else if (order.siteName) {
      setSelectedSiteId('new');
    } else {
      setSelectedSiteId('none');
    }
    setSiteName(order.siteName || '');
    setSiteAddress(order.siteAddress || '');
    setSiteContact(order.siteContact || '');
    setSaveSiteForFuture(true);

    setCart(order.items?.map(i => ({
      id: i.id || String(Date.now()),
      name: i.name || '',
      unit: i.unit || 'বস্তা',
      price: i.price || 0,
      quantity: i.quantity || 1,
      discount: i.discount || 0
    })) || []);

    setOrderNote(order.note || '');
    setIsCreateOrderOpen(true);
  };

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

  // Cart Add Item with Bundle/Piece option
  const handleAddCartItem = () => {
    const itemName = selectedCascadingProduct?.name || products.find(p => p.id === selectedProductId)?.name;
    if (!itemName) {
      toast.error('পণ্য নির্বাচন করুন');
      return;
    }

    if (selectedCascadingProduct && selectedCascadingProduct.stock <= 0) {
      toast.error('পণ্যটি স্টকে নেই! বিক্রয় অর্ডারে কেবল স্টকে থাকা পণ্য যোগ করা যাবে।');
      return;
    }

    const isRing = (selectedCascadingProduct?.category === 'রিং') || (itemName || '').includes('রিং');
    const itemUnitToUse = isRing ? 'কেজি' : (selectedCascadingProduct?.unit || 'বস্তা/কেজি');
    const itemId = selectedCascadingProduct?.productId || selectedProductId || String(Date.now());
    const finalPrice = selectedCascadingProduct?.price || 0;

    setCart(prev => {
      const existing = prev.find(i => i.name === itemName);
      if (existing) {
        return prev.map(i => i.name === itemName ? { 
          ...i, 
          quantity: Math.round((i.quantity + itemQty) * 100) / 100, 
          price: finalPrice || i.price,
          discount: itemDiscount,
          bundle: bundleCount || i.bundle
        } : i);
      }
      return [...prev, {
        id: itemId,
        name: itemName,
        unit: itemUnitToUse,
        price: finalPrice,
        quantity: itemQty,
        discount: itemDiscount || 0,
        bundle: bundleCount || ''
      }];
    });

    setSelectedProductId('');
    setItemQty(1);
    setItemPrice(0);
    setItemDiscount(0);
    setBundleCount('');
    toast.success(`${itemName} অর্ডারে যোগ করা হয়েছে`);
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
    const cleanQty = Math.round(newQty * 100) / 100;
    setCart(prev => prev.map((i, idx) => {
      if (index !== undefined && idx === index) return { ...i, quantity: cleanQty };
      if (String(i.id) === String(id)) return { ...i, quantity: cleanQty };
      return i;
    }));
  };

  // Rod & Cement Complete Cart Calculations
  const cartSubtotal = cart.reduce((a, i) => a + (i.price * i.quantity), 0);
  const cartTotalDiscount = cart.reduce((a, i) => a + ((i.discount || 0) * i.quantity), 0);
  const productTotal = Math.max(0, cartSubtotal - cartTotalDiscount);
  const cartGrandTotal = productTotal + (transportCost || 0) + (laborCost || 0);
  const cartDueAmount = Math.max(0, cartGrandTotal - (advancePaid || 0));

  const resetCreateForm = () => {
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setNewCustomerData({ name: '', phone: '', address: '', businessName: '' });
    setCustomerSites([]);
    setSelectedSiteId('none');
    setSiteName('');
    setSiteAddress('');
    setSiteContact('');
    setSaveSiteForFuture(true);
    setCart([]);
    setSelectedProductId('');
    setItemQty(1);
    setItemPrice(0);
    setItemDiscount(0);
    setBundleCount('');
    setTransportCost(0);
    setLaborCost(0);
    setVehicleNo('');
    setDriverInfo('');
    setAdvancePaid(0);
    setAdvanceMethod('Cash');
    setExpectedPaymentDate('');
    setOrderNote('');
    setOrderStatus('পেন্ডিং');
    setAutoOrderId('');
  };

  // Create Order
  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error('অন্তত একটি পণ্য নির্বাচন করুন');
      return;
    }
    if (!selectedCustomer && (!isNewCustomer || !newCustomerData.name.trim())) {
      toast.error('কাস্টমার নির্বাচন করুন অথবা নাম পূরণ করুন');
      return;
    }

    try {
      let finalCustId = selectedCustomer?.id;
      if (isNewCustomer && newCustomerData.name.trim()) {
        const createdParty = await api.parties.create({
          party_type: 'customer',
          name: newCustomerData.name.trim(),
          phone: toEnglishDigits(newCustomerData.phone).trim(),
          address: newCustomerData.address.trim(),
          business_name: newCustomerData.businessName.trim(),
          district: 'গোপালগঞ্জ'
        });
        finalCustId = String(createdParty.id);
      }

      let savedSiteRecord: CustomerSiteData | null = null;
      if (finalCustId && siteName.trim() && (selectedSiteId === 'new' || saveSiteForFuture)) {
        const exists = customerSites.some(s => s.name.trim().toLowerCase() === siteName.trim().toLowerCase());
        if (!exists && saveSiteForFuture) {
          try {
            savedSiteRecord = await api.customerSites.create({
              customer: finalCustId,
              name: siteName.trim(),
              address: siteAddress.trim(),
              contact_person: siteContact.trim()
            });
          } catch (err) {
            console.error('Failed to auto-save customer site from order:', err);
          }
        }
      }

      const activeSiteId = savedSiteRecord?.id 
        ? String(savedSiteRecord.id) 
        : (selectedSiteId !== 'none' && selectedSiteId !== 'new' ? selectedSiteId : undefined);

      const orderMetadata = {
        isOrder: true,
        invoiced: false,
        orderStatus: orderStatus || 'পেন্ডিং',
        deliveryDate,
        requiredDelivery,
        customerSiteId: activeSiteId,
        siteName: siteName.trim(),
        siteAddress: siteAddress.trim(),
        siteContact: siteContact.trim(),
        userNote: orderNote || '',
        subtotal: cartSubtotal,
        discount: cartTotalDiscount,
        cartTotalDiscount,
        transportCost,
        laborCost
      };
      const finalNotesPayload = JSON.stringify(orderMetadata) + (orderNote ? `\n${orderNote}` : '');

      const sitePayload = {
        customer_site: activeSiteId ? Number(activeSiteId) : null,
        site_name: siteName.trim() || null,
        site_address: siteAddress.trim() || null,
        site_contact: siteContact.trim() || null,
      };

      if (editingOrderId) {
        await api.transactions.update(editingOrderId, {
          party: finalCustId ? Number(finalCustId) : null,
          subtotal: cartSubtotal,
          discount: cartTotalDiscount,
          total_amount: cartGrandTotal,
          paid_amount: advancePaid,
          due_amount: cartDueAmount,
          payment_method: (advanceMethod.toLowerCase().includes('bank') ? 'bank' : advanceMethod.toLowerCase().includes('cheque') ? 'cheque' : advanceMethod.toLowerCase()),
          ...sitePayload,
          items: cart.map(i => {
            const prodId = Number(i.id);
            return {
              product: !isNaN(prodId) && prodId > 0 ? prodId : undefined,
              product_name: i.name,
              quantity: i.quantity,
              price: i.price,
              unit: i.unit,
              total: i.price * i.quantity
            };
          }),
          notes: finalNotesPayload
        });
        toast.success('বিক্রয় অর্ডার সফলভাবে আপডেট করা হয়েছে!');
      } else {
        await api.transactions.create({
          party: finalCustId ? Number(finalCustId) : null,
          transaction_type: 'sale',
          status: 'pending',
          subtotal: cartSubtotal,
          discount: cartTotalDiscount,
          total_amount: cartGrandTotal,
          paid_amount: advancePaid,
          due_amount: cartDueAmount,
          payment_method: (advanceMethod.toLowerCase().includes('bank') ? 'bank' : advanceMethod.toLowerCase().includes('cheque') ? 'cheque' : advanceMethod.toLowerCase()),
          ...sitePayload,
          items: cart.map(i => {
            const prodId = Number(i.id);
            return {
              product: !isNaN(prodId) && prodId > 0 ? prodId : undefined,
              product_name: i.name,
              quantity: i.quantity,
              price: i.price,
              unit: i.unit,
              total: i.price * i.quantity
            };
          }),
          notes: finalNotesPayload
        });
        toast.success('নতুন রড ও সিমেন্ট বিক্রয় অর্ডার সফলভাবে সংরক্ষিত হয়েছে!');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orderUpdated'));
      }

      resetCreateForm();
      setIsCreateOrderOpen(false);
      setEditingOrderId(null);
      loadOrdersData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'অর্ডার সংরক্ষণ করতে সমস্যা হয়েছে');
    }
  };

  // Process Invoice ONLY for the selected single order
  const handleConfirmSingleOrderInvoice = async () => {
    if (!orderToInvoice) return;

    try {
      let meta: any = {};
      const raw = await api.transactions.get(orderToInvoice.id).catch(() => null);
      let userNote = raw?.notes || '';
      if (userNote && typeof userNote === 'string' && userNote.trim().startsWith('{')) {
        try {
          const firstLine = userNote.split('\n')[0];
          meta = JSON.parse(firstLine);
          userNote = userNote.substring(firstLine.length).trim();
        } catch {}
      }
      meta.invoiced = true;
      meta.isOrder = false;

      await api.transactions.update(orderToInvoice.id, {
        status: 'pending',
        paid_amount: invoicePaid,
        due_amount: Math.max(0, orderToInvoice.totalAmount - invoicePaid),
        payment_method: (invoiceMethod.toLowerCase().includes('bank') ? 'bank' : invoiceMethod.toLowerCase().includes('cheque') ? 'cheque' : invoiceMethod.toLowerCase()),
        notes: JSON.stringify(meta) + (userNote ? `\n${userNote}` : '')
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orderUpdated'));
      }

      toast.success('চালান তৈরি হয়েছে (অনুমোদনের জন্য অপেক্ষমাণ)! অ্যাডমিন অনুমোদন করলে স্টক ও হিসাবে যুক্ত হবে।');
      setIsInvoiceModalOpen(false);
      setOrderToInvoice(null);
      loadOrdersData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'চালান তৈরি করতে সমস্যা হয়েছে');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই অর্ডারটি মুছে ফেলতে চান?')) return;
    try {
      await api.transactions.delete(id);
      toast.success('অর্ডার মুছে ফেলা হয়েছে');
      loadOrdersData();
    } catch {
      toast.error('সমস্যা হয়েছে');
    }
  };

  // Filter list
  const filtered = orders.filter(o => {
    const searchLower = search.toLowerCase();
    const matchesSearch = Boolean(
      !search || 
      (o.customerName && o.customerName.toLowerCase().includes(searchLower)) || 
      (o.customerPhone && o.customerPhone.includes(search)) || 
      (o.id && o.id.toLowerCase().includes(searchLower)) ||
      (o.orderId && o.orderId.toLowerCase().includes(searchLower))
    );

    let matchesStatus = true;
    if (filterStatus === 'অপেক্ষমাণ') matchesStatus = !o.invoiced;
    if (filterStatus === 'সম্পন্ন') matchesStatus = Boolean(o.invoiced);

    let matchesDate = true;
    if (startDate || endDate) {
      const orderDateStr = format(new Date(o.createdAt), 'yyyy-MM-dd');
      if (startDate && orderDateStr < startDate) matchesDate = false;
      if (endDate && orderDateStr > endDate) matchesDate = false;
    }

    let matchesBill = true;
    if (minBill && o.totalAmount < parseFloat(minBill)) matchesBill = false;
    if (maxBill && o.totalAmount > parseFloat(maxBill)) matchesBill = false;

    return Boolean(matchesSearch) && matchesStatus && matchesDate && matchesBill;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const paginatedOrders = filtered.slice(startIndex, endIndex);

  const pendingOrdersCount = orders.filter(o => !o.invoiced).length;
  const invoicedOrdersCount = orders.filter(o => o.invoiced).length;

  return (
    <Shell>
      {!isCreateOrderOpen ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 font-bengali flex items-center gap-2">
              <ShoppingCart className="w-8 h-8 text-orange-500" /> বিক্রয় অর্ডার ইতিহাস
            </h2>
            <p className="text-slate-500 font-bengali mt-1">দোকানের সকল বিক্রয় অর্ডারের তালিকা ও চালান ব্যবস্থাপনা</p>
          </div>
          
          {canCreateInvoice && (
            <Button 
              onClick={handleOpenCreateModal}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bengali h-12 px-6 rounded-md font-bold shadow-md shadow-orange-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5 mr-2" />নতুন অর্ডার তৈরি করুন
            </Button>
          )}
        </div>

        {/* Summary Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2 border-orange-100 bg-orange-50/50 shadow-sm rounded-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-md flex items-center justify-center bg-orange-600 text-white shadow-xs">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-black text-slate-500 font-bengali">চালান অপেক্ষমাণ অর্ডার</p>
                <p className="text-2xl font-black font-bengali text-orange-700 mt-0.5">{toBengaliDigits(pendingOrdersCount)} টি</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-emerald-100 bg-emerald-50/50 shadow-sm rounded-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-md flex items-center justify-center bg-emerald-600 text-white shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-black text-slate-500 font-bengali">চালান সম্পন্ন অর্ডার</p>
                <p className="text-2xl font-black font-bengali text-emerald-700 mt-0.5">{toBengaliDigits(invoicedOrdersCount)} টি</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-100 bg-white shadow-sm rounded-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-md flex items-center justify-center bg-slate-900 text-white shadow-xs">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-black text-slate-500 font-bengali">সর্বমোট অর্ডার রেকর্ড</p>
                <p className="text-2xl font-black font-bengali text-slate-900 mt-0.5">{toBengaliDigits(orders.length)} টি</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COMPACT & EFFICIENT FILTER CARD */}
        <Card className="border border-slate-200/80 shadow-xs rounded-md bg-white p-4 font-bengali space-y-3">
          {/* Top Row: Search + Date Range + Status Quick Pills + More Filter Toggle */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Unified Search Box (Order No, Customer Name, Phone) */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="অর্ডার নং, কাস্টমার নাম বা নম্বর..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-md bg-slate-50/80 border-slate-200 text-xs font-bold text-slate-900 focus:bg-white transition-all placeholder:text-slate-400"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
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

            {/* Quick Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {[
                { id: 'সব', label: 'সব অর্ডার' },
                { id: 'অপেক্ষমাণ', label: 'চালান অপেক্ষমাণ' },
                { id: 'সম্পন্ন', label: 'চালান সম্পন্ন' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setFilterStatus(p.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-md text-xs font-bold transition-all border whitespace-nowrap",
                    filterStatus === p.id
                      ? "bg-orange-600 text-white border-orange-600 shadow-xs"
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
                <Filter className="w-3.5 h-3.5 text-orange-600" />
                <span>আরও ফিল্টার</span>
                {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>

              {(search || startDate || endDate || filterStatus !== 'সব' || minBill || maxBill) && (
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

          {/* Secondary Collapsible Drawer: Bill Range */}
          {isFilterExpanded && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in duration-200">
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
            </div>
          )}
        </Card>

        {/* Order History Table */}
        <Card className="border-slate-100 shadow-md rounded-md bg-white overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black py-4 px-6 uppercase">অর্ডার #</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black uppercase">তারিখ</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black uppercase">ক্রেতার নাম</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black text-center uppercase">আইটেম</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black text-right uppercase">মোট বিল</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black text-center uppercase">চালান স্ট্যাটাস</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black text-right py-4 px-6 uppercase">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-20 text-slate-400 font-bengali font-bold text-lg">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <FileText className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-bengali font-bold text-lg">কোনো অর্ডার পাওয়া যায়নি</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedOrders.map(o => (
                  <TableRow 
                    key={o.id} 
                    onClick={() => setSelectedOrder(o)} 
                    className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <TableCell className="py-4 px-6">
                      <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md text-xs">#{toBengaliDigits(o.id.slice(0, 8).toUpperCase())}</span>
                    </TableCell>
                    <TableCell className="font-bengali text-xs font-semibold text-slate-500">{formatDate(o.createdAt)}</TableCell>
                    <TableCell className="font-bengali font-black text-slate-800 text-sm">
                      <p>{o.customerName}</p>
                      {o.siteName && (
                        <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200" title={o.siteAddress || undefined}>
                          📍 {o.siteName}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-bengali text-xs font-bold text-slate-600">{toBengaliDigits(o.items?.length || 0)} টি পণ্য</TableCell>
                    <TableCell className="text-right font-bengali font-black text-slate-900 text-base">৳{toBengaliDigits((o.totalAmount || 0).toLocaleString('en-IN'))}</TableCell>
                    <TableCell className="text-center">
                      <span className={cn("px-3 py-1 rounded-md text-[11px] font-black font-bengali uppercase tracking-wider inline-block",
                        o.invoiced 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      )}>
                        {o.invoiced ? 'চালান সম্পন্ন ✓' : 'চালান অপেক্ষমাণ'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-4 px-6" onClick={e => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => toggleMenu(e, o.id)}
                        className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>

          {/* PAGINATION FOOTER NAVBAR */}
          {filtered.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 font-bengali text-xs font-semibold">
              <div className="text-slate-600 flex items-center gap-2">
                <span>
                  মোট <strong className="text-slate-900 font-bold">{toBengaliDigits(filtered.length)}</strong> টি অর্ডারের মধ্যে <strong className="text-slate-900 font-bold">{toBengaliDigits(startIndex + 1)}</strong> - <strong className="text-slate-900 font-bold">{toBengaliDigits(endIndex)}</strong> টি দেখানো হচ্ছে
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
                    disabled={currentPage <= 1}
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
                                  ? "bg-orange-600 text-white border-orange-600 shadow-xs"
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
        /* CREATE / EDIT SALES ORDER IN-PAGE VIEW (Direct Page View, Framed Container) */
        <div className="space-y-4 animate-in fade-in duration-300 font-bengali">
          <div className="w-full bg-slate-100 border-2 border-slate-300 shadow-xl rounded-md overflow-hidden flex flex-col min-h-[calc(100vh-100px)]">
            
            {/* FRAME TOP HEADER BAR */}
            <div className="bg-white border-b border-slate-300 px-6 py-3.5 flex items-center justify-between shadow-xs flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => { setIsCreateOrderOpen(false); resetCreateForm(); }}
                  className="w-9 h-9 rounded-md bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold shadow-xs flex-shrink-0 transition-colors"
                  title="তালিকায় ফিরে যান"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <span className="text-[10px] font-black tracking-widest text-orange-600 uppercase block">
                    অর্ডার ব্যবস্থাপনা
                  </span>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                    {editingOrderId ? 'বিক্রয় অর্ডার সম্পাদনা করুন' : 'নতুন বিক্রয় অর্ডার তৈরি করুন'}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-orange-50 border border-orange-200 rounded-md px-3 py-1.5 flex items-center gap-2">
                  <span className="text-[11px] text-orange-800 font-bold">অর্ডার নং:</span>
                  <span className="text-xs font-mono font-black text-rose-600">#{toBengaliDigits(autoOrderId || 'SO-২০২৬-০০০১৫৬')}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => { setIsCreateOrderOpen(false); resetCreateForm(); }}
                  className="h-9 w-9 rounded-md hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors"
                  title="বন্ধ করুন"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* MAIN FORM GRID INSIDE FRAME */}
            <form onSubmit={handleCreateOrderSubmit} className="p-4 md:p-6 w-full space-y-6 flex-1 overflow-y-auto">
              
              {/* MAIN TWO-COLUMN GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* --- LEFT COLUMN (WIDE ~70%) --- */}
                <div className="lg:col-span-8 space-y-5">

                  {/* 1. TOP BAR FILTERS ROW */}
                  <div className="bg-white p-5 rounded-md border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600">• অর্ডার তারিখ</Label>
                      <Input 
                        type="text"
                        value={orderDate} 
                        onChange={e => setOrderDate(e.target.value)} 
                        className="rounded-md h-10 border-slate-200 bg-white text-xs font-bold text-slate-800" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600">• ডেলিভারি তারিখ</Label>
                      <Input 
                        type="text"
                        value={deliveryDate} 
                        onChange={e => setDeliveryDate(e.target.value)} 
                        className="rounded-md h-10 border-slate-200 bg-white text-xs font-bold text-slate-800" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600">• অর্ডার স্ট্যাটাস</Label>
                      <Select value={orderStatus} onValueChange={(v: string | null) => setOrderStatus(v || 'পেন্ডিং')}>
                        <SelectTrigger className="rounded-md h-10 border-slate-200 bg-white text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="font-bengali">
                          <SelectItem value="পেন্ডিং">
                            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-md">পেন্ডিং</span>
                          </SelectItem>
                          <SelectItem value="প্রসেসিং">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-md">প্রসেসিং</span>
                          </SelectItem>
                          <SelectItem value="সম্পন্ন">
                            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-md">সম্পন্ন</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600">• প্রয়োজনীয় ডেলিভারি</Label>
                      <Select value={requiredDelivery} onValueChange={(v: string | null) => setRequiredDelivery(v || 'না')}>
                        <SelectTrigger className="rounded-md h-10 border-slate-200 bg-white text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="font-bengali">
                          <SelectItem value="না">না</SelectItem>
                          <SelectItem value="হ্যাঁ">হ্যাঁ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 2. CUSTOMER SELECTION CARD */}
                  <div className="bg-white p-5 rounded-md border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-600" /> কাস্টমার নির্বাচন করুন
                      </h2>
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsNewCustomer(!isNewCustomer);
                          if (isNewCustomer) setSelectedCustomer(null);
                        }}
                        className="rounded-md h-9 text-xs font-bold text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                      >
                        + নতুন কাস্টমার
                      </Button>
                    </div>

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
                        placeholder="কাস্টমারের নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input 
                          value={newCustomerData.name} 
                          onChange={e => setNewCustomerData(prev => ({ ...prev, name: e.target.value }))} 
                          placeholder="কাস্টমার নাম *" 
                          className="rounded-md h-11 border-slate-200 text-xs bg-white" 
                        />
                        <Input 
                          value={newCustomerData.phone} 
                          onChange={e => {
                            const val = toBengaliDigits(e.target.value).replace(/[^০-৯]/g, '').slice(0, 11);
                            setNewCustomerData(prev => ({ ...prev, phone: val }));
                          }}
                          placeholder="মোবাইল নম্বর" 
                          className="rounded-md h-11 border-slate-200 text-xs bg-white font-bengali tracking-wide" 
                        />
                      </div>
                    )}

                    {/* Selected Customer Stats Row */}
                    <div className="p-3.5 bg-slate-50/70 border border-slate-200/70 rounded-md grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bengali">
                      <div>
                        <p className="text-slate-500 font-semibold text-[11px] flex items-center gap-1">
                          <PhoneCall className="w-3 h-3 text-slate-400" /> মোবাইল নম্বর
                        </p>
                        <p className="font-bold text-slate-900 mt-0.5">{selectedCustomer?.phone ? toBengaliDigits(selectedCustomer.phone) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-semibold text-[11px] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" /> ঠিকানা
                        </p>
                        <p className="font-bold text-slate-900 mt-0.5">{selectedCustomer?.address || '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-semibold text-[11px]">ধরন</p>
                        {selectedCustomer ? (
                          <span className="inline-block bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5">
                            নিয়মিত কাস্টমার
                          </span>
                        ) : (
                          <p className="font-bold text-slate-400 mt-0.5">—</p>
                        )}
                      </div>
                      <div>
                        <p className="text-slate-500 font-semibold text-[11px]">বকেয়া</p>
                        <p className="font-black text-rose-600 mt-0.5">
                          {selectedCustomer ? `৳ ${toBengaliDigits(((selectedCustomer as any)?.totalDue || 0).toLocaleString('en-IN'))}` : '—'}
                        </p>
                      </div>
                    </div>

                    {/* CUSTOMER SITE / DELIVERY PROJECT SELECTION */}
                    <div className="p-3.5 bg-sky-50/50 border border-sky-200/80 rounded-lg space-y-3 font-bengali">
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
                                onChange={e => setSiteAddress(e.target.value)}
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
                              <span>ভবিষ্যতের অর্ডারে ব্যবহারের জন্য এই সাইটটি কাস্টমারের প্রোফাইলে সংরক্ষণ করুন</span>
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. PRODUCT ADDING CARD */}
                  <div className="bg-white p-5 rounded-md border border-slate-200/80 shadow-xs space-y-4">
                    <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-emerald-600" /> পণ্য যোগ করুন
                    </h2>

                    {/* Step-by-Step Cascading Product Selector */}
                    <CascadingProductSelector
                      products={products}
                      onlyInStock={true}
                      onProductChange={(selected) => {
                        setSelectedCascadingProduct(selected);
                        if (selected && selected.productId) {
                          setSelectedProductId(selected.productId);
                        }
                      }}
                      showPriceField={false}
                      itemQty={itemQty}
                      onQtyChange={setItemQty}
                      itemPrice={itemPrice}
                      onPriceChange={setItemPrice}
                      onAddCartItem={handleAddCartItem}
                    />

                    {/* 4. CART ITEMS TABLE */}
                    <div className="space-y-3 pt-2">
                      <h3 className="text-xs font-bold text-slate-800">অর্ডারে যোগ করা পণ্যসমূহ</h3>
                      
                      <div className="border border-slate-200/80 rounded-md overflow-hidden bg-white">
                        <Table>
                          <TableHeader className="bg-slate-50 border-b border-slate-200">
                            <TableRow>
                              <TableHead className="w-10 text-center font-bold text-slate-700 text-[11px]">#</TableHead>
                              <TableHead className="font-bold text-slate-700 text-[11px]">পণ্যের নাম</TableHead>
                              <TableHead className="text-center font-bold text-slate-700 text-[11px]">ইউনিট</TableHead>
                              <TableHead className="text-center font-bold text-slate-700 text-[11px]">পরিমাণ</TableHead>
                              <TableHead className="text-center font-bold text-slate-700 text-[11px]">স্টক উপলব্ধ</TableHead>
                              <TableHead className="text-center font-bold text-slate-700 text-[11px]">মন্তব্য</TableHead>
                              <TableHead className="w-16 text-center font-bold text-slate-700 text-[11px]">অ্যাকশন</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="text-xs font-bengali">
                            {cart.length > 0 ? (
                              cart.map((item, idx) => (
                                <TableRow key={item.id || idx} className="border-b border-slate-100">
                                  <TableCell className="text-center font-semibold text-slate-500">{toBengaliDigits(idx + 1)}</TableCell>
                                  <TableCell className="font-bold text-slate-900">
                                    <span className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 text-[10px]">
                                        {item.unit === 'কেজি' ? '🥢' : '🛢️'}
                                      </span>
                                      {item.name}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center text-slate-600">{item.unit || 'বস্তা'}</TableCell>
                                  <TableCell className="text-center">
                                    <CartItemQtyInput
                                      value={item.quantity}
                                      onChange={(val) => handleUpdateCartQty(item.id || idx, val, idx)}
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                      {toBengaliDigits((item as any).stock || 0)} {item.unit || 'বস্তা'}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center text-slate-400">—</TableCell>
                                  <TableCell className="text-center">
                                    <button 
                                      type="button"
                                      onClick={() => handleRemoveCartItem(item.id)}
                                      className="w-7 h-7 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center mx-auto transition-colors"
                                      title="সরিয়ে ফেলুন"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-slate-400 font-semibold">
                                  কোনো পণ্য যোগ করা হয়নি। উপর থেকে পণ্য নির্বাচন করে &quot;+ যোগ করুন&quot; বাটনে ক্লিক করুন।
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Notice Info Box */}
                      <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-md text-blue-800 text-xs flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="font-medium">পণ্য তালিকা থেকে কোনো আইটেম অপসারণ করতে ডিলিট বাটনে ক্লিক করুন।</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. NOTES & ATTACHMENT CARD */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-md border border-slate-200/80 shadow-xs space-y-2">
                      <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        ✏️ অর্ডার নোট (ঐচ্ছিক)
                      </Label>
                      <textarea 
                        value={orderNote}
                        onChange={e => setOrderNote(e.target.value)}
                        placeholder="অর্ডার সম্পর্কে কোনো বিশেষ নোট..." 
                        className="w-full h-24 p-3 rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bengali resize-none"
                      />
                    </div>

                    <div className="bg-white p-5 rounded-md border border-slate-200/80 shadow-xs space-y-2">
                      <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        📑 সংযুক্তি (ঐচ্ছিক)
                      </Label>
                      <div className="border-2 border-dashed border-slate-200 rounded-md h-24 flex flex-col items-center justify-center p-3 text-center bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                        <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">ফাইল সংযুক্ত করুন</p>
                        <p className="text-[10px] text-slate-400">বা এখানে ড্রপ করুন</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* --- RIGHT SIDEBAR (~30% ORDER SUMMARY) --- */}
                <div className="lg:col-span-4 space-y-5">
                  <div className="bg-white p-5 rounded-md border border-slate-200/80 shadow-xs space-y-4 font-bengali">
                    <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      📑 অর্ডার সারসংক্ষেপ
                    </h2>

                    <div className="space-y-3 text-xs">
                      {/* Stat 1 */}
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-md flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500 font-semibold">মোট আইটেম</p>
                          <p className="text-base font-black text-slate-900">{toBengaliDigits(cart.length)}</p>
                        </div>
                      </div>

                      {/* Stat 2 */}
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-md flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
                          <ShoppingCart className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500 font-semibold">মোট পরিমাণ</p>
                          <p className="text-base font-black text-slate-900">
                            {toBengaliDigits(cart.reduce((a, i) => a + i.quantity, 0))}
                          </p>
                          {cart.length > 0 && (
                            <p className="text-[10px] text-slate-400 font-semibold">
                              ( {cart.map(i => `${toBengaliDigits(i.quantity)} ${i.unit || ''}`).join(', ')} )
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Stat 3 */}
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-md flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500 font-semibold">মোট ওজন (রড)</p>
                          <p className="text-base font-black text-slate-900">
                            {toBengaliDigits(cart.filter(i => i.unit?.includes('কেজি') || i.name?.includes('রড')).reduce((a, i) => a + i.quantity, 0))} কেজি
                          </p>
                        </div>
                      </div>

                      {/* Stat 4 */}
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-md flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500 font-semibold">ডেলিভারি তারিখ</p>
                          <p className="text-sm font-bold text-slate-900">{toBengaliDigits(deliveryDate) || '—'}</p>
                        </div>
                      </div>

                      {/* Stat 5 */}
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-md flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500 font-semibold">অর্ডার স্ট্যাটাস</p>
                          <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-0.5 rounded-md mt-0.5">
                            {orderStatus || 'পেন্ডিং'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tip Card */}
                    <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-md text-amber-900 text-xs space-y-1">
                      <p className="font-bold flex items-center gap-1 text-amber-800">
                        💡 অর্ডার সংরক্ষণ করলে এটি পেন্ডিং থাকবে।
                      </p>
                      <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                        অনুমোদন করার পরেই ইনভয়েসে এবং হিসাব খাতায় হিট হবে।
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* STICKY BOTTOM ACTION BAR INSIDE FRAME */}
              <div className="bg-white border-t border-slate-300 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm font-bengali flex-shrink-0 mt-6">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <Lightbulb className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  <span>সংরক্ষণের পূর্বে সব তথ্য পুনরায় পরীক্ষা করে নিন।</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => { setIsCreateOrderOpen(false); resetCreateForm(); }}
                    className="rounded-md h-11 px-5 font-bold text-slate-600 border-slate-300 hover:bg-slate-50"
                  >
                    বাতিল করুন
                  </Button>
                  <Button 
                    type="submit" 
                    className="rounded-md h-11 px-6 font-black text-white bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/20 active:scale-95 transition-all"
                  >
                    অর্ডার সম্পূর্ণ করুন ✓
                  </Button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DEDICATED SINGLE-ORDER INVOICING MODAL */}
      <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
        <DialogContent className="w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-none shadow-2xl">
          <div className="bg-gradient-to-br from-emerald-900 to-slate-900 p-6 text-white">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="font-bengali text-xl font-black flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-400" /> চালান তৈরি করুন (একক অর্ডার)
                  </DialogTitle>
                  <p className="text-slate-300 font-mono text-xs mt-1">অর্ডার #{orderToInvoice?.id.toUpperCase()}</p>
                </div>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </DialogHeader>
          </div>

          {orderToInvoice && (
            <div className="p-6 space-y-5 bg-white font-bengali max-h-[75vh] overflow-y-auto">
              <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">কাস্টমারের নাম:</span>
                  <span className="font-bold text-slate-900">{orderToInvoice.customerName}</span>
                </div>
                {orderToInvoice.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">ফোন নম্বর:</span>
                    <span className="font-semibold text-slate-700">{orderToInvoice.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-emerald-200/60 pt-2 text-base">
                  <span className="font-bold text-slate-800">সর্বমোট ইনভয়েস বিল:</span>
                  <span className="font-black text-emerald-700 text-lg">৳ {toBengaliDigits((orderToInvoice.totalAmount || 0).toLocaleString('en-IN'))}</span>
                </div>
              </div>

              {/* ITEMS IN THIS ORDER ONLY */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200">
                      <th className="p-2.5 text-left font-bold text-slate-700">পণ্য</th>
                      <th className="p-2.5 text-center font-bold text-slate-700">পরিমাণ</th>
                      <th className="p-2.5 text-right font-bold text-slate-700">একক মূল্য</th>
                      <th className="p-2.5 text-right font-bold text-slate-700">মোট (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderToInvoice.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-800">{item.name}</td>
                        <td className="p-2.5 text-center text-slate-600 font-medium">{toBengaliDigits(item.quantity)} {item.unit}</td>
                        <td className="p-2.5 text-right text-slate-600">৳{toBengaliDigits((item.price || 0).toLocaleString('en-IN'))}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">৳{toBengaliDigits(((item.price - (item.discount || 0)) * item.quantity).toLocaleString('en-IN'))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAYMENT INPUTS */}
              <div className="space-y-4 pt-1 font-bengali">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest font-black text-slate-600">পেমেন্ট মাধ্যম</Label>
                  <Select value={invoiceMethod} onValueChange={(val: string | null) => setInvoiceMethod(val || 'Cash')}>
                    <SelectTrigger className="rounded-xl h-11 bg-white font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-bengali font-bold">
                      <SelectItem value="Cash">💵 নগদ (Cash)</SelectItem>
                      <SelectItem value="Bank">🏦 ব্যাংক ট্রান্সফার (Bank Transfer)</SelectItem>
                      <SelectItem value="BankToBank">🔄 ব্যাংক-টু-ব্যাংক ট্রান্সফার (Bank to Bank)</SelectItem>
                      <SelectItem value="Cheque">📄 চেক (Cheque)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest font-black text-slate-600">গ্রহণকৃত পরিমাণ (৳)</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={invoicePaid}
                    onChange={e => setInvoicePaid(parseFloat(e.target.value) || 0)}
                    className="h-12 rounded-xl text-center text-xl font-black text-emerald-600 bg-emerald-50/50"
                  />
                </div>

                {/* BANK TRANSFER (SAVED ACCOUNT SELECTOR) */}
                {invoiceMethod === 'Bank' && (
                  <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl space-y-3 font-bengali animate-in fade-in-0">
                    <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      🏦 সেভ করা দোকান ব্যাংক অ্যাকাউন্ট
                    </p>
                    <div className="space-y-1 text-xs">
                      <Label className="text-[11px] font-bold text-slate-600">গ্রহীতার ব্যাংক অ্যাকাউন্ট (দোকান)</Label>
                      <Select value={selectedShopBank} onValueChange={(val: string | null) => setSelectedShopBank(val || '')}>
                        <SelectTrigger className="h-9 rounded-lg bg-white text-xs font-bold border-slate-200">
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

                    <div>
                      <Label className="text-[11px] font-bold text-slate-600">ট্রানজেকশন / রেফারেন্স আইডি (অপশনাল)</Label>
                      <Input 
                        placeholder="Txn ID / Ref No" 
                        value={transactionRef} 
                        onChange={e => setTransactionRef(e.target.value)}
                        className="h-9 rounded-lg bg-white mt-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* BANK TO BANK TRANSFER (RECEIVER SAVED SELECTOR + SENDER CUSTOMER INPUTS) */}
                {invoiceMethod === 'BankToBank' && (
                  <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-3 font-bengali animate-in fade-in-0">
                    <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      🔄 ব্যাংক-টু-ব্যাংক ট্রান্সফার বিস্তারিত
                    </p>
                    
                    {/* RECEIVER (SHOP) ACCOUNT */}
                    <div className="space-y-1 text-xs">
                      <Label className="text-[11px] font-bold text-indigo-950 block">
                        ১. গ্রহীতার ব্যাংক অ্যাকাউন্ট (দোকানের সেভ করা অ্যাকাউন্ট)
                      </Label>
                      <Select value={selectedShopBank} onValueChange={(val: string | null) => setSelectedShopBank(val || '')}>
                        <SelectTrigger className="h-9 rounded-lg bg-white text-xs font-bold border-indigo-200">
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

                    {/* SENDER (CUSTOMER) BANK INPUTS */}
                    <div className="space-y-2 pt-2 border-t border-indigo-100">
                      <Label className="text-[11px] font-bold text-slate-700 block">
                        ২. প্রেরকের ব্যাংক তথ্য (কাস্টমারের ব্যাংক অ্যাকাউন্ট)
                      </Label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <Label className="text-[10px] font-bold text-slate-600">প্রেরক ব্যাংকের নাম</Label>
                          <Input 
                            placeholder="ইবিএল / প্রাইম ব্যাংক / ব্যাংকের নাম" 
                            value={senderBankName} 
                            onChange={e => setSenderBankName(e.target.value)}
                            className="h-9 rounded-lg bg-white mt-0.5 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-bold text-slate-600">প্রেরকের অ্যাকাউন্ট নং / নাম</Label>
                          <Input 
                            placeholder="A/C No or Name" 
                            value={senderAccountNo} 
                            onChange={e => setSenderAccountNo(e.target.value)}
                            className="h-9 rounded-lg bg-white mt-0.5 text-xs font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px] font-bold text-slate-600">ট্রানজেকশন / রেফারেন্স আইডি</Label>
                          <Input 
                            placeholder="Txn ID / Ref No" 
                            value={senderTxnRef} 
                            onChange={e => setSenderTxnRef(e.target.value)}
                            className="h-9 rounded-lg bg-white mt-0.5 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CHEQUE SPECIFIC FIELDS */}
                {invoiceMethod === 'Cheque' && (
                  <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-xl space-y-3 font-bengali animate-in fade-in-0">
                    <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      📄 চেকের বিবরণ
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <Label className="text-[11px] font-bold text-slate-600">ব্যাংকের নাম</Label>
                        <Input 
                          placeholder="ব্যাংকের নাম" 
                          value={bankName} 
                          onChange={e => setBankName(e.target.value)}
                          className="h-9 rounded-lg bg-white mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-bold text-slate-600">চেক নম্বর</Label>
                        <Input 
                          placeholder="চেক নং (e.g. CQ-10293)" 
                          value={chequeNo} 
                          onChange={e => setChequeNo(e.target.value)}
                          className="h-9 rounded-lg bg-white mt-1 text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[11px] font-bold text-slate-600">চেকের তারিখ / মেয়াদ</Label>
                        <BengaliDatePicker
                          value={chequeDate}
                          onChange={val => setChequeDate(val)}
                          placeholder="তারিখ নির্বাচন"
                          className="w-full mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {orderToInvoice.totalAmount - invoicePaid > 0 ? (
                  <p className="text-xs text-rose-600 font-bold text-center">কাস্টমারের বকেয়া খাতায় যুক্ত হবে: ৳ {(orderToInvoice.totalAmount - invoicePaid).toLocaleString()}</p>
                ) : (
                  <p className="text-xs text-emerald-600 font-bold text-center">পরিশোধিত ✓ (কোনো বকেয়া থাকবে না)</p>
                )}
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsInvoiceModalOpen(false)} 
                  className="rounded-xl h-12 font-bold text-slate-600 border-slate-200"
                >
                  বাতিল
                </Button>
                <Button 
                  type="button" 
                  onClick={handleConfirmSingleOrderInvoice} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-base"
                >
                  চালান সম্পন্ন করুন ✓
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 1:1 REPLICA ERP ORDER DETAIL VIEW OVERLAY */}
      {selectedOrder && (
        <div className="fixed inset-0 sm:left-[72px] z-[60] bg-[#f8fafc] overflow-y-auto font-bengali p-6 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-6 pb-16">
            
            {/* TOP HEADER BAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedOrder(null)} 
                  className="rounded-xl h-9 px-3.5 text-xs font-bold text-slate-700 bg-white border-slate-300 hover:bg-slate-100 shadow-2xs mb-3 flex items-center gap-1.5"
                >
                  ← ফিরে যান (Back)
                </Button>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">অর্ডার বিস্তারিত</h1>
                  <span className="bg-orange-50 text-orange-600 font-mono text-sm font-black px-3 py-1 rounded-lg border border-orange-200">
                    {(selectedOrder as any).orderId || selectedOrder.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                    {selectedOrder.invoiced ? 'চালান সম্পন্ন' : 'Pending Approval'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  অর্ডার তৈরি হয়েছে: {formatDate(selectedOrder.createdAt)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedOrder(null)} 
                  className="rounded-xl h-10 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100"
                >
                  ← ফিরে যান
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    const orderToEdit = selectedOrder;
                    setSelectedOrder(null);
                    handleEditOrder(orderToEdit);
                  }}
                  className="rounded-xl h-10 text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" /> এডিট করুন
                </Button>

                <Button 
                  onClick={() => {
                    router.push(`/invoices?fromOrder=${selectedOrder.id}`);
                  }}
                  className="rounded-xl h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" /> চালান তৈরি করুন
                </Button>

                <Button 
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  className="rounded-xl h-10 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> অর্ডার বাতিল করুন
                </Button>
              </div>
            </div>

            {/* PROGRESS STEPPER BAR */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="grid grid-cols-5 gap-2 relative text-center">
                <div className="flex flex-col items-center space-y-2 z-10">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 border-2 border-emerald-500 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">অর্ডার তৈরি</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center space-y-2 z-10">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 border-2 border-amber-400 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">অ্যাপ্রুভাল অপেক্ষায়</p>
                    <p className="text-[10px] text-amber-600 font-bold">{(selectedOrder as any).status || 'পেন্ডিং'}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center space-y-2 z-10">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold border-2", selectedOrder.invoiced ? "bg-emerald-100 text-emerald-600 border-emerald-500" : "bg-slate-100 text-slate-400 border-slate-200")}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">ইনভয়েস তৈরি</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{selectedOrder.invoiced ? 'সম্পন্ন ✓' : 'অপেক্ষমাণ'}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center space-y-2 z-10">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 border-2 border-slate-200 flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">ডেলিভারি</p>
                    <p className="text-[10px] text-slate-400 font-semibold">—</p>
                  </div>
                </div>

                <div className="flex flex-col items-center space-y-2 z-10">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 border-2 border-slate-200 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">সম্পন্ন</p>
                    <p className="text-[10px] text-slate-400 font-semibold">—</p>
                  </div>
                </div>

                <div className="absolute top-5 left-12 right-12 h-0.5 border-t-2 border-dashed border-slate-200 z-0" />
              </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* LEFT COLUMN */}
              <div className="lg:col-span-8 space-y-6">

                {/* Customer & Order Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Customer Info */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 font-bengali">
                    <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <User className="w-4 h-4 text-blue-600" /> কাস্টমার তথ্য
                    </h2>

                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">কাস্টমারের নাম</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-base font-black text-slate-900">{selectedOrder.customerName || 'সাধারণ ক্রেতা'}</p>
                          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">নিয়মিত কাস্টমার</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <PhoneCall className="w-3 h-3 text-slate-400" /> মোবাইল নম্বর
                          </p>
                          <p className="font-bold text-slate-800 mt-0.5">{selectedOrder.customerPhone ? toBengaliDigits(selectedOrder.customerPhone) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" /> ঠিকানা
                          </p>
                          <p className="font-bold text-slate-800 mt-0.5">{selectedOrder.customerAddress || '—'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold">বকেয়া ব্যালেন্স</p>
                          <p className="text-sm font-black text-rose-600 mt-0.5">
                            ৳ {toBengaliDigits((((customers.find(c => c.id === selectedOrder.customerId) as any)?.totalDue || 0)).toLocaleString('en-IN'))}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold">মোট বিল</p>
                          <p className="text-sm font-black text-emerald-600 mt-0.5">
                            ৳ {toBengaliDigits((selectedOrder.totalAmount || 0).toLocaleString('en-IN'))}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                        <div>
                          <p className="text-slate-400">তৈরি সময়</p>
                          <p className="font-bold text-slate-700 mt-0.5">{formatDate(selectedOrder.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">চালান স্ট্যাটাস</p>
                          <p className="font-bold text-emerald-600 mt-0.5">{selectedOrder.invoiced ? 'চালান সম্পন্ন ✓' : 'অপেক্ষমাণ'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 font-bengali">
                    <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <FileText className="w-4 h-4 text-blue-600" /> অর্ডার তথ্য
                    </h2>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">অর্ডার আইডি</p>
                        <p className="font-mono font-black text-slate-900 mt-0.5">
                          {toBengaliDigits(((selectedOrder as any).orderId || selectedOrder.id.slice(0, 8)).toUpperCase())}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">অর্ডার তারিখ</p>
                        <p className="font-bold text-slate-900 mt-0.5">{(selectedOrder as any).orderDate || formatDate(selectedOrder.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">ডেলিভারি তারিখ</p>
                        <p className="font-bold text-slate-900 mt-0.5">{(selectedOrder as any).deliveryDate ? toBengaliDigits((selectedOrder as any).deliveryDate) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">অর্ডার স্ট্যাটাস</p>
                        <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5">
                          {(selectedOrder as any).status || (selectedOrder.invoiced ? 'চালান সম্পন্ন' : 'পেন্ডিং')}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">মোট আইটেম</p>
                        <p className="font-bold text-slate-900 mt-0.5">{toBengaliDigits(selectedOrder.items?.length || 0)} টি</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">সর্বমোট বিল</p>
                        <p className="font-black text-emerald-600 mt-0.5">৳ {toBengaliDigits((selectedOrder.totalAmount || 0).toLocaleString('en-IN'))}</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Ordered Items Table */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 font-bengali">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    📦 অর্ডারকৃত পণ্যের তালিকা
                  </h2>

                  <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow>
                          <TableHead className="w-10 text-center font-bold text-slate-700 text-[11px]">#</TableHead>
                          <TableHead className="font-bold text-slate-700 text-[11px]">পণ্যের নাম</TableHead>
                          <TableHead className="text-center font-bold text-slate-700 text-[11px]">ইউনিট</TableHead>
                          <TableHead className="text-center font-bold text-slate-700 text-[11px]">পরিমাণ</TableHead>
                          <TableHead className="text-right font-bold text-slate-700 text-[11px]">একক মূল্য</TableHead>
                          <TableHead className="text-right font-bold text-slate-700 text-[11px]">মোট মূল্য</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        {selectedOrder.items?.map((item, idx) => (
                          <TableRow key={idx} className="border-b border-slate-100">
                            <TableCell className="text-center font-semibold text-slate-500">{toBengaliDigits(idx + 1)}</TableCell>
                            <TableCell className="font-bold text-slate-900">
                              <span className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-600 text-[10px]">
                                  {item.unit === 'কেজি' ? '🥢' : '🛢️'}
                                </span>
                                {item.name}
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-slate-600">{item.unit || 'বস্তা'}</TableCell>
                            <TableCell className="text-center font-bold text-slate-900">{toBengaliDigits(item.quantity)}</TableCell>
                            <TableCell className="text-right font-semibold text-slate-700">৳ {toBengaliDigits((item.price || 0).toLocaleString('en-IN'))}</TableCell>
                            <TableCell className="text-right font-black text-slate-900">৳ {toBengaliDigits(((item.price || 0) * item.quantity).toLocaleString('en-IN'))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl grid grid-cols-3 gap-4 text-xs font-bengali">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold">মোট আইটেম</p>
                        <p className="text-base font-black text-slate-900">{toBengaliDigits(selectedOrder.items?.length || 0)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold">মোট সিমেন্ট</p>
                        <p className="text-base font-black text-slate-900">
                          {toBengaliDigits(selectedOrder.items?.filter(i => i.unit?.includes('বস্তা') || i.name?.includes('সিমেন্ট')).reduce((a, b) => a + b.quantity, 0))} বস্তা
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold">মোট রড</p>
                        <p className="text-base font-black text-slate-900">
                          {toBengaliDigits(selectedOrder.items?.filter(i => i.unit?.includes('কেজি') || i.name?.includes('রড')).reduce((a, b) => a + b.quantity, 0))} কেজি
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Note & Attachment */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 font-bengali">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    ✏️ অর্ডার নোট
                  </h3>
                  <p className="text-xs font-semibold text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    {selectedOrder.note || 'কোনো বিষয় দ্রষ্টব্য নোট দেওয়া হয়নি।'}
                  </p>
                </div>

              </div>

              {/* RIGHT SIDEBAR COLUMN */}
              <div className="lg:col-span-4 space-y-6">

                {/* Quick Actions */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 font-bengali">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    ⚡ দ্রুত কার্যক্রম
                  </h2>

                  <div className="space-y-2">
                    {!selectedOrder.invoiced && (
                      <Button 
                        onClick={() => router.push(`/invoices?fromOrder=${selectedOrder.id}`)}
                        className="w-full justify-start bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs h-10 rounded-xl border border-emerald-200/80"
                      >
                        ✓ অর্ডার অনুমোদন / চালান তৈরি করুন
                      </Button>
                    )}
                    <Button 
                      onClick={() => setIsPrintMemoOpen(true)}
                      className="w-full justify-start bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs h-10 rounded-xl border border-purple-200/80"
                    >
                      🖨️ অর্ডার ক্যাশ মেমো প্রিন্ট করুন
                    </Button>
                    <Button 
                      onClick={() => {
                        const orderToEdit = selectedOrder;
                        setSelectedOrder(null);
                        handleEditOrder(orderToEdit);
                      }}
                      className="w-full justify-start bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold text-xs h-10 rounded-xl border border-cyan-200/80"
                    >
                      ✏️ অর্ডার এডিট করুন
                    </Button>
                    <Button 
                      onClick={() => handleDeleteOrder(selectedOrder.id)}
                      className="w-full justify-start bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs h-10 rounded-xl border border-rose-200/80"
                    >
                      ✕ অর্ডার বাতিল করুন
                    </Button>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 font-bengali">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                    📊 অর্ডার সংক্ষিপ্ত বিবরণ
                  </h2>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">মোট আইটেম</span>
                      <span className="font-bold text-slate-900">{toBengaliDigits(selectedOrder.items?.length || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">মোট পরিমাণ (আইটেমস)</span>
                      <span className="font-bold text-slate-900">{toBengaliDigits(selectedOrder.items?.reduce((a, b) => a + b.quantity, 0) || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">মোট সিমেন্ট (ব্যাগ)</span>
                      <span className="font-bold text-slate-900">
                        {toBengaliDigits(selectedOrder.items?.filter(i => i.unit?.includes('বস্তা') || i.name?.includes('সিমেন্ট')).reduce((a, b) => a + b.quantity, 0))} বস্তা
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">মোট রড (কেজি)</span>
                      <span className="font-bold text-slate-900">
                        {toBengaliDigits(selectedOrder.items?.filter(i => i.unit?.includes('কেজি') || i.name?.includes('রড')).reduce((a, b) => a + b.quantity, 0))} কেজি
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">চালান স্ট্যাটাস</span>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", selectedOrder.invoiced ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>
                        {selectedOrder.invoiced ? 'চালান সম্পন্ন' : 'অপেক্ষমাণ'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">সর্বমোট বিল</span>
                      <span className="font-black text-emerald-600">৳ {toBengaliDigits((selectedOrder.totalAmount || 0).toLocaleString('en-IN'))}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 font-bengali">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                    🕒 অর্ডার কার্যক্রম (Timeline)
                  </h2>

                  <div className="space-y-4 text-xs pl-2 relative border-l-2 border-slate-100 ml-2">
                    <div className="relative pl-4">
                      <div className="absolute -left-[21px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                      <p className="font-bold text-slate-900">অর্ডার তৈরি হয়েছে</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{formatDate(selectedOrder.createdAt)}</p>
                    </div>

                    <div className="relative pl-4">
                      <div className="absolute -left-[21px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white" />
                      <p className="font-bold text-slate-900">পণ্য যোগ করা হয়েছে ({toBengaliDigits(selectedOrder.items?.length || 0)} টি আইটেম)</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{formatDate(selectedOrder.createdAt)}</p>
                    </div>

                    <div className="relative pl-4">
                      <div className={cn("absolute -left-[21px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white", selectedOrder.invoiced ? "bg-emerald-500" : "bg-amber-500")} />
                      <p className="font-bold text-slate-900">{selectedOrder.invoiced ? 'চালান সম্পন্ন হয়েছে' : 'অনুমোদনের জন্য পেন্ডিং'}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{selectedOrder.invoiced ? 'সম্পন্ন ✓' : 'অপেক্ষমাণ'}</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* PRINT MEMO MODAL */}
      <Dialog open={isPrintMemoOpen} onOpenChange={setIsPrintMemoOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-[2rem] p-0 border-none shadow-2xl custom-scrollbar font-bengali">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white flex justify-between items-center print:hidden">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-500" /> অর্ডার ক্যাশ মেমোর খসড়া ও পিন্ট
              </DialogTitle>
              <p className="text-slate-400 font-mono text-xs mt-0.5">অর্ডার #{selectedOrder?.id?.toUpperCase()}</p>
            </DialogHeader>
            <div className="flex gap-2">
              <Button 
                onClick={() => printElement('printable-memo-wrapper')}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl px-4 h-10 shadow-md"
              >
                <Printer className="w-4 h-4 mr-2" /> প্রিন্ট মেমো
              </Button>
            </div>
          </div>

          {selectedOrder && (
            <div className="p-6 bg-slate-100 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div id="printable-memo-wrapper" className="bg-white p-2 rounded-xl shadow-sm">
                <InvoiceMemo invoice={selectedOrder as any} />
              </div>
            </div>
          )}
          <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center print:hidden">
            <div className="text-xs text-slate-500 font-bold">
              * এটি বিক্রয় অর্ডারের ক্যাশ মেমো কপি।
            </div>
            <Button variant="outline" onClick={() => setIsPrintMemoOpen(false)} className="rounded-xl font-bold text-slate-600 border-slate-200">
              বন্ধ করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* 3-DOT FLOATING PORTAL MENU */}
      {openMenuId && menuPos && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => { setOpenMenuId(null); setMenuPos(null); }} />
          <div
            style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
            className="fixed z-[9999] w-44 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 font-bengali animate-in fade-in-0 zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const targetOrder = orders.find(o => o.id === openMenuId);
              if (!targetOrder) return null;
              return (
                <div className="space-y-0.5">
                  {canEditInvoice && (
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        setMenuPos(null);
                        handleEditOrder(targetOrder);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" /> এডিট করুন
                    </button>
                  )}

                  {!targetOrder.invoiced && canCreateInvoice && (
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        setMenuPos(null);
                        router.push(`/invoices?fromOrder=${targetOrder.id}`);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" /> চালান তৈরি করুন
                    </button>
                  )}

                  {canDeleteInvoice && (
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        setMenuPos(null);
                        handleDeleteOrder(targetOrder.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> ডিলেট করুন
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </>,
        document.body
      )}
    </Shell>
  );
}

