'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Shell } from '@/components/Shell';
import { api, PartyData } from '@/lib/api';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Building2,
  MoreVertical,
  Filter,
  DollarSign,
  Camera,
  Mail,
  Receipt,
  MapPin,
  X,
  ShieldCheck,
  Save,
  Calendar,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  ArrowLeft,
  Lightbulb,
  LayoutGrid,
  List,
  HardHat,
  BadgeCheck,
  Coins,
  Wallet,
  Sparkles,
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';
import { DataImportModal } from '@/components/DataImportModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { bdLocationData } from '@/lib/bangladeshData';
import { BengaliDateRangePicker } from '@/components/ui/BengaliDateRangePicker';
import { BengaliDatePicker } from '@/components/ui/BengaliDatePicker';
import { TableRowActionMenu } from '@/components/TableRowActionMenu';
import { useAuth } from '@/lib/authContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { toEnglishDigits, normalizeForSearch } from '@/lib/bengaliUtils';

export const toBnDigits = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  return String(val).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);
};

export const formatBnDate = (dateVal: Date | string | undefined | null, pattern: string = 'dd MMMM yyyy') => {
  if (!dateVal) return '';
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return String(dateVal);
    const raw = format(d, pattern, { locale: bn });
    return toBnDigits(raw);
  } catch {
    return String(dateVal);
  }
};

export interface Party {
  id: string;
  name: string;
  businessName?: string;
  customerType?: string;
  supplyType?: string;
  phone: string;
  altPhone?: string;
  email?: string;
  country?: string;
  division?: string;
  district?: string;
  thana?: string;
  address: string;
  postcode?: string;
  idType?: string;
  nid?: string;
  tinNumber?: string;
  openingBalance?: number;
  creditLimit?: number;
  creditDays?: number;
  discountPercent?: number;
  rodCommissionRate?: number;
  cementCommissionRate?: number;
  joinedDate?: string;
  note?: string;
  photoUrl?: string;
  totalDue?: number;
  advanceBalance?: number;
  totalPurchase?: number;
}

interface PartyManagementPageProps {
  type: 'customer' | 'supplier' | 'engineer';
}

import { useSearchParams } from 'next/navigation';

export default function PartyManagementPage({ type }: PartyManagementPageProps) {
  const { canModifyData } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdParam = searchParams ? searchParams.get('edit') : null;
  const actionParam = searchParams ? searchParams.get('action') : null;
  const isCustomer = type === 'customer';
  const isSupplier = type === 'supplier';
  const isEngineer = type === 'engineer';

  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('সব');
  const [filterDue, setFilterDue] = useState('সব');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [minDue, setMinDue] = useState('');
  const [maxDue, setMaxDue] = useState('');
  const [filterDivision, setFilterDivision] = useState('সব');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [prevFilterKey, setPrevFilterKey] = useState<string>('');
  const [userViewMode, setUserViewMode] = useState<'card' | 'table' | null>(null);
  const viewMode = userViewMode ?? (isEngineer ? 'card' : 'table');

  const handleResetFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setFilterType('সব');
    setFilterDue('সব');
    setMinDue('');
    setMaxDue('');
    setFilterDivision('সব');
    setCurrentPage(1);
  };

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const toggleMenu = (e: React.MouseEvent<HTMLButtonElement>, partyId: string) => {
    e.stopPropagation();
    if (openMenuId === partyId) {
      setOpenMenuId(null);
      setMenuPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 96;
    const menuWidth = 176;

    const openAbove = rect.top > menuHeight + 10;
    const top = openAbove ? rect.top - menuHeight - 6 : rect.bottom + 6;
    const left = Math.min(window.innerWidth - menuWidth - 10, Math.max(10, rect.right - menuWidth));

    setMenuPos({ top, left });
    setOpenMenuId(partyId);
  };

  // Form State
  const [formData, setFormData] = useState<{
    businessName: string;
    name: string;
    customerType: string;
    phone: string;
    altPhone: string;
    email: string;
    country: string;
    division: string;
    district: string;
    thana: string;
    address: string;
    postcode: string;
    idType: string;
    nid: string;
    tinNumber: string;
    openingBalance: number | string;
    openingBalanceType: 'due' | 'advance';
    creditLimit: number | string;
    creditDays: number | string;
    discountPercent: number | string;
    rodCommissionRate: number | string;
    cementCommissionRate: number | string;
    joinedDate: string;
    note: string;
    photoUrl: string;
  }>({
    businessName: '',
    name: '',
    customerType: isEngineer ? 'সিভিল ইঞ্জিনিয়ার' : isCustomer ? 'খুচরা গ্রাহক' : 'রড',
    phone: '',
    altPhone: '',
    email: '',
    country: 'বাংলাদেশ',
    division: 'ঢাকা',
    district: 'গোপালগঞ্জ',
    thana: '',
    address: '',
    postcode: '',
    idType: isEngineer ? 'IEB মেম্বারশিপ' : isCustomer ? 'NID' : 'TIN',
    nid: '',
    tinNumber: '',
    openingBalance: '',
    openingBalanceType: 'due',
    creditLimit: '',
    creditDays: 30,
    discountPercent: '',
    rodCommissionRate: '',
    cementCommissionRate: '',
    joinedDate: new Date().toISOString().split('T')[0],
    note: '',
    photoUrl: ''
  });

  // Cascading Location Helpers
  const selectedDivisionObj = bdLocationData.find(d => d.name === formData.division) || bdLocationData[0];
  const availableDistricts = selectedDivisionObj ? selectedDivisionObj.districts : [];
  const selectedDistrictObj = availableDistricts.find(d => d.name === formData.district) || availableDistricts[0];
  const availableThanas = selectedDistrictObj ? selectedDistrictObj.thanas : [];

  const openEdit = useCallback((p: Party) => {
    setEditing(p);
    setFormData({
      businessName: p.businessName || '',
      name: p.name || '',
      customerType: p.customerType || p.supplyType || (isEngineer ? 'সিভিল ইঞ্জিনিয়ার' : isCustomer ? 'খুচরা গ্রাহক' : 'রড'),
      phone: p.phone ? toBnDigits(p.phone) : '',
      altPhone: p.altPhone ? toBnDigits(p.altPhone) : '',
      email: p.email || '',
      country: p.country || 'বাংলাদেশ',
      division: p.division || 'ঢাকা',
      district: p.district || 'গোপালগঞ্জ',
      thana: p.thana || '',
      address: p.address || '',
      postcode: p.postcode || '',
      idType: p.idType || (isEngineer ? 'IEB মেম্বারশিপ' : isCustomer ? 'NID' : 'TIN'),
      nid: p.nid || '',
      tinNumber: p.tinNumber || '',
      openingBalance: p.openingBalance !== undefined && p.openingBalance !== null && p.openingBalance !== 0 ? String(Math.abs(p.openingBalance)) : '',
      openingBalanceType: (p.openingBalance || 0) < 0 ? 'advance' : 'due',
      creditLimit: p.creditLimit ? String(p.creditLimit) : '',
      creditDays: p.creditDays || 30,
      discountPercent: p.discountPercent ? String(p.discountPercent) : '',
      rodCommissionRate: p.rodCommissionRate !== undefined && p.rodCommissionRate > 0 ? String(p.rodCommissionRate) : '',
      cementCommissionRate: p.cementCommissionRate !== undefined && p.cementCommissionRate > 0 ? String(p.cementCommissionRate) : '',
      joinedDate: p.joinedDate || new Date().toISOString().split('T')[0],
      note: p.note || '',
      photoUrl: p.photoUrl || ''
    });
    setIsAddOpen(true);
  }, [isCustomer, isEngineer]);

  const fetchParties = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.parties.list({ party_type: type });
      const safeData = Array.isArray(data) ? data : [];
      let transactions: any[] = [];
      if (isEngineer) {
        try {
          transactions = await api.transactions.list();
        } catch {}
      }

      const partyList: Party[] = safeData.map((p) => {
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

        let calculatedDue = Number(p.total_due || 0);
        let dueAmount = 0;
        let advanceAmount = 0;

        if (isEngineer) {
          // Engineer commission calculation matching PartyProfilePage
          const engineerSales = transactions.filter(s => {
            if (s.transaction_type !== 'sale' && s.transaction_type) return false;
            if (s.status === 'pending' || s.status === 'draft' || s.status === 'cancelled' || s.status === 'rejected') return false;
            let meta: any = {};
            if (s.notes && typeof s.notes === 'string' && s.notes.trim().startsWith('{')) {
              try { meta = JSON.parse(s.notes.split('\n')[0]); } catch {}
            }
            const matchId = String(meta.engineerId) === String(p.id) || String((s as any).engineer_id) === String(p.id);
            const matchName = meta.engineerName && p.name && meta.engineerName.trim().toLowerCase() === p.name.trim().toLowerCase();
            const isDirect = String(s.party) === String(p.id);
            return matchId || matchName || isDirect;
          });

          const totalCommission = engineerSales.reduce((sum, s) => {
            let meta: any = {};
            if (s.notes && typeof s.notes === 'string' && s.notes.trim().startsWith('{')) {
              try { meta = JSON.parse(s.notes.split('\n')[0]); } catch {}
            }
            const comm = Number(meta.engineerTotalCommission || (s as any).engineerTotalCommission || 0);
            const rodKg = Number(meta.engineerRodKg || (s as any).engineerRodKg || 0);
            const rRate = Number(meta.engineerRodRate || (s as any).engineerRodRate || 0);
            const cemBags = Number(meta.engineerCementBags || (s as any).engineerCementBags || 0);
            const cRate = Number(meta.engineerCementRate || (s as any).engineerCementRate || 0);
            const eff = comm > 0 ? comm : (rodKg * rRate + cemBags * cRate);
            return sum + eff;
          }, 0);

          const engineerPayments = transactions.filter(t => 
            String(t.party) === String(p.id) && 
            (t.transaction_type === 'payment_out' || t.transaction_type === 'payment_in' || t.transaction_type === 'payment' || t.transaction_type === 'expense')
          );
          const totalPaid = engineerPayments.reduce((sum, t) => sum + Number(t.paid_amount || t.total_amount || 0), 0);

          calculatedDue = Math.max(0, Number(p.opening_balance || 0) + totalCommission - totalPaid);
          dueAmount = calculatedDue;
        } else if (isCustomer) {
          dueAmount = Number(p.total_due !== undefined && p.total_due !== null ? p.total_due : 0);
          advanceAmount = Number(p.advance_balance || 0);
        } else {
          dueAmount = Number(p.total_due || 0);
          advanceAmount = Number(p.advance_balance || 0);
        }

        return {
          id: String(p.id),
          name: p.name,
          businessName: p.business_name || '',
          customerType: p.customer_type || '',
          supplyType: p.supply_type || '',
          phone: p.phone,
          altPhone: p.alt_phone || '',
          email: p.email || '',
          country: p.country || 'বাংলাদেশ',
          division: p.division || 'ঢাকা',
          district: p.district || 'গোপালগঞ্জ',
          thana: p.thana || '',
          address: p.address || '',
          postcode: p.postcode || '',
          idType: p.id_type || 'NID',
          nid: p.nid || '',
          tinNumber: p.tin_number || '',
          openingBalance: Number(p.opening_balance || 0),
          creditLimit: Number(p.credit_limit || 0),
          creditDays: p.credit_days || 30,
          discountPercent: Number(p.discount_percent || 0),
          rodCommissionRate,
          cementCommissionRate,
          joinedDate: p.joined_date || '',
          note: cleanNote,
          photoUrl: p.photo_url || '',
          totalDue: dueAmount,
          advanceBalance: advanceAmount,
          totalPurchase: Number(p.total_purchases || 0)
        };
      });
      setParties(partyList);
      return partyList;
    } catch (err) {
      console.error('Error fetching parties:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [type, isEngineer, isCustomer]);

  const resetForm = useCallback(() => {
    setEditing(null);
    setFormData({
      businessName: '',
      name: '',
      customerType: isEngineer ? 'সিভিল ইঞ্জিনিয়ার' : isCustomer ? 'খুচরা গ্রাহক' : 'রড',
      phone: '',
      altPhone: '',
      email: '',
      country: 'বাংলাদেশ',
      division: 'ঢাকা',
      district: 'গোপালগঞ্জ',
      thana: '',
      address: '',
      postcode: '',
      idType: isEngineer ? 'IEB মেম্বারশিপ' : isCustomer ? 'NID' : 'TIN',
      nid: '',
      tinNumber: '',
      openingBalance: '',
      openingBalanceType: 'due',
      creditLimit: '',
      creditDays: 30,
      discountPercent: '',
      rodCommissionRate: '',
      cementCommissionRate: '',
      joinedDate: new Date().toISOString().split('T')[0],
      note: '',
      photoUrl: ''
    });
  }, [isEngineer, isCustomer]);

  const handleOpenAdd = useCallback(() => {
    resetForm();
    setIsAddOpen(true);
  }, [resetForm]);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      const partyList = await fetchParties();
      if (ignore) return;
      if (editIdParam && partyList && partyList.length > 0) {
        const target = partyList.find((p) => String(p.id) === String(editIdParam));
        if (target) {
          openEdit(target);
          router.replace(isEngineer ? '/engineers' : isCustomer ? '/customers' : '/suppliers');
        }
      } else if (actionParam === 'add' || actionParam === 'new') {
        handleOpenAdd();
        router.replace(isEngineer ? '/engineers' : isCustomer ? '/customers' : '/suppliers');
      }
    }
    loadData();
    return () => { ignore = true; };
  }, [fetchParties, editIdParam, actionParam, openEdit, handleOpenAdd, router, isCustomer, isEngineer]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('ছবি ফাইল সাইজ ২MB এর নিচে হতে হবে');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, photoUrl: reader.result as string }));
        toast.success('ছবি আপলোড সম্পন্ন হয়েছে');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(isEngineer ? 'ইঞ্জিনিয়ারের নাম পূরণ করুন' : isCustomer ? 'গ্রাহকের নাম পূরণ করুন' : 'কোম্পানি বা প্রতিনিধির নাম পূরণ করুন');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('মোবাইল নম্বর পূরণ করুন');
      return;
    }

    const rodComm = parseFloat(toEnglishDigits(formData.rodCommissionRate) || '0') || 0;
    const cementComm = parseFloat(toEnglishDigits(formData.cementCommissionRate) || '0') || 0;
    const rawOpenBal = parseFloat(toEnglishDigits(formData.openingBalance) || '0') || 0;
    const openBal = formData.openingBalanceType === 'advance' ? -Math.abs(rawOpenBal) : Math.abs(rawOpenBal);
    const credLim = parseFloat(toEnglishDigits(formData.creditLimit) || '0') || 0;
    const credDays = parseInt(toEnglishDigits(formData.creditDays) || '30', 10) || 30;
    const discPct = parseFloat(toEnglishDigits(formData.discountPercent) || '0') || 0;
    const cleanPhone = toEnglishDigits(formData.phone).replace(/[^0-9]/g, '');
    const cleanAltPhone = formData.altPhone ? toEnglishDigits(formData.altPhone).replace(/[^0-9]/g, '') : undefined;

    const meta = {
      rodCommissionRate: rodComm,
      cementCommissionRate: cementComm,
      userNote: formData.note || ''
    };
    const notePayload = JSON.stringify(meta) + (formData.note ? `\n${formData.note}` : '');

    const payload: PartyData = {
      party_type: type,
      name: formData.name.trim(),
      business_name: formData.businessName.trim() || formData.name.trim(),
      customer_type: formData.customerType,
      supply_type: formData.customerType,
      phone: cleanPhone,
      alt_phone: cleanAltPhone,
      email: formData.email,
      country: formData.country,
      division: formData.division,
      district: formData.district,
      thana: formData.thana,
      address: formData.address,
      postcode: formData.postcode,
      id_type: formData.idType,
      nid: formData.nid,
      tin_number: formData.tinNumber,
      opening_balance: openBal,
      credit_limit: credLim,
      credit_days: credDays,
      discount_percent: discPct,
      total_due: editing ? (editing.totalDue || 0) : (openBal > 0 ? openBal : 0),
      advance_balance: editing ? (editing.advanceBalance || 0) : (openBal < 0 ? Math.abs(openBal) : 0),
      joined_date: formData.joinedDate,
      note: isEngineer ? notePayload : formData.note,
      photo_url: formData.photoUrl
    };

    try {
      if (editing) {
        await api.parties.update(editing.id, payload);
        toast.success(isEngineer ? 'ইঞ্জিনিয়ারের তথ্য আপডেট হয়েছে' : isCustomer ? 'গ্রাহকের তথ্য আপডেট হয়েছে' : 'সরবরাহকারীর তথ্য আপডেট হয়েছে');
      } else {
        await api.parties.create(payload);
        toast.success(isEngineer ? 'নতুন ইঞ্জিনিয়ার নিবন্ধিত হয়েছে' : isCustomer ? 'নতুন গ্রাহক নিবন্ধিত হয়েছে' : 'নতুন সরবরাহকারী নিবন্ধিত হয়েছে');
      }
      setIsAddOpen(false);
      resetForm();
      fetchParties();
    } catch (err) {
      console.error(err);
      toast.error('তথ্য সংরক্ষণ করা সম্ভব হয়নি');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isEngineer ? 'এই ইঞ্জিনিয়ারের তথ্য মুছে ফেলবেন?' : isCustomer ? 'এই গ্রাহকের তথ্য মুছে ফেলবেন?' : 'এই সরবরাহকারীর তথ্য মুছে ফেলবেন?')) return;
    try {
      await api.parties.delete(id);
      toast.success('তথ্য মুছে ফেলা হয়েছে');
      fetchParties();
    } catch {
      toast.error('মুছে ফেলা সম্ভব হয়নি');
    }
  };

  const filtered = parties.filter((p) => {
    const searchLower = search.toLowerCase().trim();
    const searchNorm = normalizeForSearch(search);
    const partyPhoneNorm = normalizeForSearch(p.phone || '');
    const partyAltPhoneNorm = normalizeForSearch(p.altPhone || '');
    const partyNameNorm = (p.name || '').toLowerCase();
    const partyBizNorm = (p.businessName || '').toLowerCase();
    const partyAddrNorm = (p.address || '').toLowerCase();

    const matchesSearch = !search ||
      partyNameNorm.includes(searchLower) ||
      partyBizNorm.includes(searchLower) ||
      partyAddrNorm.includes(searchLower) ||
      partyPhoneNorm.includes(searchNorm) ||
      partyAltPhoneNorm.includes(searchNorm) ||
      (p.phone && p.phone.includes(search)) ||
      (p.email && p.email.toLowerCase().includes(searchLower));

    const matchesType =
      filterType === 'সব' ||
      (p.customerType || (isCustomer ? 'খুচরা গ্রাহক' : 'রড')) === filterType;

    const matchesDue =
      filterDue === 'সব'
        ? true
        : filterDue === 'বকেয়া আছে'
        ? (p.totalDue || 0) > 0
        : (p.totalDue || 0) <= 0;

    let matchesDate = true;
    if (startDate || endDate) {
      const partyDate = p.joinedDate || '';
      if (startDate && partyDate < startDate) matchesDate = false;
      if (endDate && partyDate > endDate) matchesDate = false;
    }

    let matchesDueAmount = true;
    const dueVal = p.totalDue || 0;
    if (minDue && dueVal < parseFloat(minDue)) matchesDueAmount = false;
    if (maxDue && dueVal > parseFloat(maxDue)) matchesDueAmount = false;

    let matchesDivision = true;
    if (filterDivision !== 'সব' && p.division !== filterDivision) {
      matchesDivision = false;
    }

    return Boolean(matchesSearch) && matchesType && matchesDue && matchesDate && matchesDueAmount && matchesDivision;
  });

  const currentFilterKey = `${search}|${filterType}|${filterDue}|${startDate}|${endDate}|${minDue}|${maxDue}|${filterDivision}`;

  if (prevFilterKey !== currentFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const paginatedParties = filtered.slice(startIndex, endIndex);

  const totalDue = parties.reduce((a, p) => a + (p.totalDue || 0), 0);
  const totalAdvance = parties.reduce((a, p) => a + (p.advanceBalance || 0), 0);

  return (
    <Shell>
      {!isAddOpen ? (
        <div className="space-y-5 font-bengali pb-10">
        
        {/* 1. TOP TITLE, BREADCRUMB & HEADER ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isEngineer ? 'ইঞ্জিনিয়ার' : isCustomer ? 'কাস্টমার' : 'সরবরাহকারী'}
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              হোম &gt; {isEngineer ? 'ইঞ্জিনিয়ার' : isCustomer ? 'কাস্টমার' : 'সরবরাহকারী'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isCustomer && (
              <Link href="/customers/dues">
                <Button variant="outline" className="h-9 px-3.5 border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-100/50 font-bold text-xs rounded-md shadow-2xs flex items-center gap-1.5 cursor-pointer">
                  <Receipt className="w-3.5 h-3.5 text-rose-600" />
                  <span>বাকী তালিকা</span>
                </Button>
              </Link>
            )}

            <Button variant="outline" className="h-9 px-3.5 border-slate-200 text-blue-600 bg-white hover:bg-slate-50 font-bold text-xs rounded-md shadow-2xs flex items-center gap-1.5 cursor-pointer">
              <Receipt className="w-3.5 h-3.5 text-blue-600" />
              <span>রিপোর্ট এক্সপোর্ট</span>
            </Button>

            {canModifyData && (
              <Button
                variant="outline"
                onClick={() => setIsImportOpen(true)}
                className="h-9 px-3.5 border-orange-200 text-orange-700 bg-orange-50/50 hover:bg-orange-100/50 font-bold text-xs rounded-md shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-orange-600" />
                <span>এক্সেল ইমপোর্ট</span>
              </Button>
            )}

            {canModifyData && (
              <Button
                onClick={handleOpenAdd}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isEngineer ? 'নতুন ইঞ্জিনিয়ার' : isCustomer ? 'নতুন কাস্টমার' : 'নতুন সরবরাহকারী'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* 2. 4 TOP METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* CARD 1: সর্বমোট কাস্টমার/সরবরাহকারী/ইঞ্জিনিয়ার */}
          <div className="bg-white border border-blue-100 rounded-md p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">{isEngineer ? 'সর্বমোট ইঞ্জিনিয়ার' : isCustomer ? 'সর্বমোট কাস্টমার' : 'সর্বমোট সরবরাহকারী'}</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {toBnDigits(parties.length)} <span className="text-xs font-medium text-slate-500">জন</span>
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{isEngineer ? 'তালিকাভুক্ত ইঞ্জিনিয়ার' : isCustomer ? 'সকল কাস্টমারের সংখ্যা' : 'সকল সরবরাহকারীর সংখ্যা'}</p>
            </div>
          </div>

          {/* CARD 2: সক্রিয় কাস্টমার/সরবরাহকারী/প্রজেক্ট */}
          <div className="bg-white border border-emerald-100 rounded-md p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">{isEngineer ? 'সক্রিয় প্রজেক্ট / সাইট' : isCustomer ? 'সক্রিয় কাস্টমার' : 'সক্রিয় সরবরাহকারী'}</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {toBnDigits(parties.length)} <span className="text-xs font-medium text-slate-500">{isEngineer ? 'টি' : 'জন'}</span>
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{isEngineer ? 'চলমান কনস্ট্রাকশন' : 'লেনদেন করেছেন'}</p>
            </div>
          </div>

          {/* CARD 3: মোট বাকি/পাওনা */}
          <div className="bg-white border border-amber-100 rounded-md p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 font-bold text-lg">
              ৳
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">{isEngineer ? 'মোট কমিশন / পাওনা' : 'মোট বাকি'}</p>
              <p className="text-xl font-black text-rose-600 mt-0.5">
                ৳ {toBnDigits(totalDue.toLocaleString('en-IN'))}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{isEngineer ? 'ইঞ্জিনিয়ারদের পাওনা ব্যালেন্স' : isCustomer ? 'সকল কাস্টমারের বাকি' : 'সকল পাওয়া পাওনা'}</p>
            </div>
          </div>

          {/* CARD 4: মোট অগ্রিম জমা */}
          <div className="bg-white border border-emerald-100 rounded-md p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">{isEngineer ? 'মোট অগ্রিম কমিশন' : 'মোট অগ্রিম জমা'}</p>
              <p className="text-xl font-black text-emerald-600 mt-0.5">
                ৳ {toBnDigits(totalAdvance.toLocaleString('en-IN'))}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">গ্রাহকদের অগ্রিম জমার পরিমাণ</p>
            </div>
          </div>

        </div>

        {/* COMPACT & EFFICIENT FILTER CARD */}
        <Card className="border border-slate-200/80 shadow-xs rounded-md bg-white p-4 font-bengali space-y-3">
          {/* Top Row: Search + Date Range + Status Quick Pills + More Filter Toggle */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Unified Search Box */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={isEngineer ? "ইঞ্জিনিয়ারের নাম, পদবী, মোবাইল, ফার্ম বা কাজের এলাকা দিয়ে খুঁজুন..." : isCustomer ? "কাস্টমার নাম, মোবাইল, বা ইমেইল দিয়ে খুঁজুন..." : "কোম্পানি বা সরবরাহকারীর নাম, ফোন দিয়ে খুঁজুন..."}
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
              placeholder="যোগদানের তারিখ ফিল্টার"
              compact={false}
            />

            {/* Quick Status/Due Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {[
                { id: 'সব', label: isEngineer ? 'সব ইঞ্জিনিয়ার' : isCustomer ? 'সব কাস্টমার' : 'সব সরবরাহকারী' },
                { id: 'বকেয়া আছে', label: isEngineer ? 'পাওনা আছে' : 'বকেয়া আছে' },
                { id: 'পরিশোধিত', label: 'হিসাব পরিষ্কার' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setFilterDue(p.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-md text-xs font-bold transition-all border whitespace-nowrap",
                    filterDue === p.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
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
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>আরও ফিল্টার</span>
                {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>

              {(search || startDate || endDate || filterType !== 'সব' || filterDue !== 'সব' || minDue || maxDue || filterDivision !== 'সব') && (
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
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in duration-200">
              
              {/* Type Selector */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">পদবী / শ্রেণী / ধরন</Label>
                <Select value={filterType} onValueChange={(val) => setFilterType(val || 'সব')}>
                  <SelectTrigger className="w-full h-9 bg-slate-50/50 border-slate-200 rounded-md text-xs font-bold">
                    <SelectValue placeholder="সকল ধরন" />
                  </SelectTrigger>
                  <SelectContent className="font-bengali text-xs font-bold">
                    <SelectItem value="সব">সকল ধরন</SelectItem>
                    {isEngineer ? (
                      <>
                        <SelectItem value="সিভিল ইঞ্জিনিয়ার">সিভিল ইঞ্জিনিয়ার</SelectItem>
                        <SelectItem value="স্ট্রাকচারাল ইঞ্জিনিয়ার">স্ট্রাকচারাল ইঞ্জিনিয়ার</SelectItem>
                        <SelectItem value="ডিপ্লোমা ইঞ্জিনিয়ার">ডিপ্লোমা ইঞ্জিনিয়ার</SelectItem>
                        <SelectItem value="আর্কিটেক্ট">আর্কিটেক্ট / স্থপতি</SelectItem>
                        <SelectItem value="কনসালটেন্ট">কনসালটেন্ট</SelectItem>
                        <SelectItem value="সাইট সুপারভাইজার">সাইট সুপারভাইজার</SelectItem>
                        <SelectItem value="কন্ট্রাকটর">কন্ট্রাকটর / হেড মিস্ত্রি</SelectItem>
                      </>
                    ) : isCustomer ? (
                      <>
                        <SelectItem value="খুচরা গ্রাহক">খুচরা ক্রেতা</SelectItem>
                        <SelectItem value="কন্ট্রাকটর">ঠিকাদার</SelectItem>
                        <SelectItem value="পাইকারি গ্রাহক">পাইকারি</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="রড">রড</SelectItem>
                        <SelectItem value="সিমেন্ট">সিমেন্ট</SelectItem>
                        <SelectItem value="রড ও সিমেন্ট">রড ও সিমেন্ট</SelectItem>
                        <SelectItem value="অন্যান্য">অন্যান্য</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Division Selector */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">বিভাগ</Label>
                <Select value={filterDivision} onValueChange={(val) => setFilterDivision(val || 'সব')}>
                  <SelectTrigger className="w-full h-9 bg-slate-50/50 border-slate-200 rounded-md text-xs font-bold">
                    <SelectValue placeholder="সকল বিভাগ" />
                  </SelectTrigger>
                  <SelectContent className="font-bengali text-xs font-bold">
                    <SelectItem value="সব">সকল বিভাগ</SelectItem>
                    {Object.keys(bdLocationData).map((div) => (
                      <SelectItem key={div} value={div}>{div}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Range */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">বকেয়া / পাওনার পরিমাণ (৳)</Label>
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


        {viewMode === 'card' ? (
          /* CARD GRID VIEW */
          <div className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div key={n} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-3 animate-pulse max-w-[320px] w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-2 pt-1">
                      <div className="h-3 bg-slate-200 rounded w-full" />
                      <div className="h-3 bg-slate-200 rounded w-4/5" />
                    </div>
                    <div className="h-10 bg-slate-100 rounded-lg" />
                    <div className="h-8 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="bg-white border border-slate-200/80 rounded-xl shadow-xs p-12 text-center">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  {isEngineer ? <HardHat className="w-7 h-7" /> : <Users className="w-7 h-7" />}
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">কোনো {isEngineer ? 'ইঞ্জিনিয়ারের' : isCustomer ? 'কাস্টমারের' : 'সরবরাহকারীর'} তথ্য পাওয়া যায়নি</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  {search || startDate || endDate || filterType !== 'সব' || filterDue !== 'সব' || minDue || maxDue || filterDivision !== 'সব'
                    ? 'আপনার ফিল্টারের শর্ত অনুযায়ী কোনো তথ্য মেলেনি। ফিল্টার রিসেট করে আবার চেষ্টা করুন।'
                    : `এখনই আপনার প্রথম ${isEngineer ? 'ইঞ্জিনিয়ার' : isCustomer ? 'কাস্টমার' : 'সরবরাহকারী'} যোগ করুন।`}
                </p>
                {canModifyData && (
                  <Button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer">
                    <Plus className="w-4 h-4 mr-1.5" />
                    নতুন যোগ করুন
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {paginatedParties.map((p) => {
                  const isWholesale = p.customerType === 'পাইকারি গ্রাহক';
                  const isContractor = p.customerType === 'কন্ট্রাকটর';
                  const suppType = p.customerType || p.supplyType || 'রড';
                  const engRole = p.customerType || 'সিভিল ইঞ্জিনিয়ার';
                  const profileRoute = isEngineer ? `/engineers/${p.id}` : isCustomer ? `/customers/${p.id}` : `/suppliers/${p.id}`;

                  if (isEngineer) {
                    const hasCommission = (p.rodCommissionRate || 0) > 0 || (p.cementCommissionRate || 0) > 0;

                    return (
                      <div
                        key={p.id}
                        onClick={() => router.push(profileRoute)}
                        className="group relative bg-white border border-slate-200/90 hover:border-blue-500 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer overflow-hidden w-full max-w-[320px]"
                      >
                        {/* Sleek Top Accent Line */}
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500" />

                        <div className="space-y-3">
                          {/* Header: Avatar, Name, Role & Action Menu */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-900 to-blue-900 text-white font-bold text-sm flex items-center justify-center border border-slate-200/80 shadow-2xs overflow-hidden">
                                  {p.photoUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span>{p.name?.charAt(0) || 'ই'}</span>
                                  )}
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" title="সক্রিয়" />
                              </div>

                              <div className="min-w-0">
                                <h3 className="font-black text-slate-900 text-sm tracking-tight truncate group-hover:text-blue-600 transition-colors">
                                  {p.name}
                                </h3>
                                <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
                                  <span className="inline-block px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-100">
                                    {engRole}
                                  </span>
                                  {p.businessName && (
                                    <span className="truncate text-slate-400">• {p.businessName}</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                              <TableRowActionMenu
                                onView={() => router.push(profileRoute)}
                                onEdit={() => openEdit(p)}
                                onDelete={() => handleDelete(p.id)}
                                canEdit={canModifyData}
                                canDelete={canModifyData}
                              />
                            </div>
                          </div>

                          {/* Contact Info: Phone & Location */}
                          <div className="flex items-center justify-between gap-2 text-xs bg-slate-50/80 rounded-xl px-3 py-2 border border-slate-100">
                            <a
                              href={`tel:${p.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 transition-colors truncate"
                              title="ফোন কল করুন"
                            >
                              <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="tracking-wide">{toBnDigits(p.phone)}</span>
                            </a>

                            {(p.district || p.thana || p.address) && (
                              <span className="text-[11px] text-slate-500 font-medium truncate max-w-[140px] text-right flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                {[p.thana, p.district].filter(Boolean).join(', ') || p.address}
                              </span>
                            )}
                          </div>

                          {/* Commission Rates (Compact Pill) */}
                          {hasCommission && (
                            <div className="flex items-center justify-between gap-2 text-[11px] bg-blue-50/50 rounded-lg px-2.5 py-1.5 border border-blue-100/80">
                              <span className="text-slate-500 font-medium">কমিশন রেট:</span>
                              <div className="flex items-center gap-2 font-bold text-blue-800">
                                {p.rodCommissionRate ? <span>রড: ৳{toBnDigits(p.rodCommissionRate)}/কেজি</span> : null}
                                {p.rodCommissionRate && p.cementCommissionRate ? <span className="text-blue-300">|</span> : null}
                                {p.cementCommissionRate ? <span>সিমেন্ট: ৳{toBnDigits(p.cementCommissionRate)}/বস্তা</span> : null}
                              </div>
                            </div>
                          )}

                          {/* Financial Balance Summary (Clean & Standard) */}
                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                মোট কমিশন পাওনা
                              </p>
                              <p className="text-base font-black text-emerald-700 mt-0.5">
                                ৳ {toBnDigits((p.totalDue || 0).toLocaleString('en-IN'))}
                              </p>
                            </div>

                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                              (p.totalDue || 0) > 0
                                ? "bg-emerald-100/70 text-emerald-800 border-emerald-300"
                                : "bg-slate-200/60 text-slate-600 border-slate-300"
                            )}>
                              {(p.totalDue || 0) > 0 ? 'পাওনা রয়েছে' : 'পরিশোধিত'}
                            </span>
                          </div>
                        </div>

                        {/* Card Footer: View Details & Call Action */}
                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            onClick={() => router.push(profileRoute)}
                            variant="outline"
                            className="flex-1 h-8.5 text-xs font-bold text-blue-700 bg-blue-50/60 hover:bg-blue-600 hover:text-white border-blue-200 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>প্রোফাইল ও হিসাব</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>

                          <a
                            href={`tel:${p.phone}`}
                            className="h-8.5 w-8.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center justify-center transition-colors shadow-2xs shrink-0 cursor-pointer"
                            title="ফোন কল করুন"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>

                          {canModifyData && (
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="h-8.5 w-8.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-700 hover:text-amber-600 flex items-center justify-center transition-colors shadow-2xs shrink-0 cursor-pointer"
                              title="তথ্য সম্পাদনা"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  /* Default Card Layout for Customers & Suppliers */
                  return (
                    <div
                      key={p.id}
                      onClick={() => router.push(profileRoute)}
                      className="group relative bg-white border border-slate-200/80 hover:border-blue-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer overflow-hidden w-full max-w-[320px]"
                    >
                      {/* Top Gradient Accent Line */}
                      <div className={cn(
                        "absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r",
                        isCustomer 
                          ? "from-emerald-500 via-teal-500 to-blue-500"
                          : "from-amber-500 via-orange-500 to-rose-500"
                      )} />

                      <div className="space-y-4">
                        {/* Header: Avatar, Name, Degree/Firm, Actions */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <div className="w-13 h-13 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-xs border-2 border-white ring-1 ring-slate-200/80 overflow-hidden">
                                {p.photoUrl ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{p.name?.charAt(0) || 'ক'}</span>
                                )}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" title="সক্রিয়" />
                            </div>

                            <div className="min-w-0">
                              <h3 className="font-black text-slate-900 text-sm tracking-tight truncate group-hover:text-blue-600 transition-colors">
                                {p.name}
                              </h3>
                              {p.businessName ? (
                                <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                                  <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{p.businessName}</span>
                                </p>
                              ) : (
                                <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5 truncate">
                                  <span>{isCustomer ? 'কাস্টমার' : 'সরবরাহকারী'}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Menu (stops propagation) */}
                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <TableRowActionMenu
                              onView={() => router.push(profileRoute)}
                              onEdit={() => openEdit(p)}
                              onDelete={() => handleDelete(p.id)}
                              canEdit={canModifyData}
                              canDelete={canModifyData}
                            />
                          </div>
                        </div>

                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {isCustomer ? (
                            <span className={cn(
                              "inline-block font-bold text-[11px] px-2.5 py-0.5 rounded-md border",
                              isContractor
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : isWholesale
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}>
                              {isContractor ? 'ঠিকাদার' : isWholesale ? 'পাইকারি' : 'খুচরা ক্রেতা'}
                            </span>
                          ) : (
                            <span className={cn(
                              "inline-block font-bold text-[11px] px-2.5 py-0.5 rounded-md border",
                              suppType === 'সিমেন্ট'
                                ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                : suppType === 'রড ও সিমেন্ট'
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            )}>
                              {suppType}
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold text-[10px] px-2 py-0.5 rounded-md ml-auto">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            সক্রিয়
                          </span>
                        </div>

                        {/* Contact & Location Details */}
                        <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/60 rounded-lg p-2.5 border border-slate-100">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 font-medium text-[11px]">মোবাইল:</span>
                            <a
                              href={`tel:${p.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-slate-800 hover:text-blue-600 flex items-center gap-1 tracking-wider"
                            >
                              <Phone className="w-3 h-3 text-blue-600" />
                              <span>{toBnDigits(p.phone)}</span>
                            </a>
                          </div>

                          {(p.address || p.district) && (
                            <div className="flex items-start justify-between gap-2 text-[11px]">
                              <span className="text-slate-400 font-medium shrink-0">ঠিকানা:</span>
                              <span className="text-right font-medium text-slate-700 truncate max-w-[190px]">
                                {[p.thana, p.district].filter(Boolean).join(', ') || p.address}
                              </span>
                            </div>
                          )}

                          {p.joinedDate && (
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-slate-400 font-medium">যোগদান:</span>
                              <span className="font-medium text-slate-700">{formatBnDate(p.joinedDate, 'dd MMMM yyyy')}</span>
                            </div>
                          )}
                        </div>

                        {/* Financial Balance Banner */}
                        <div className={cn(
                          "p-3 rounded-xl border flex items-center justify-between",
                          (p.advanceBalance || 0) > 0 || (p.totalDue || 0) < 0
                            ? "bg-emerald-50/50 border-emerald-200/70"
                            : (p.totalDue || 0) > 0
                            ? "bg-rose-50/50 border-rose-200/70"
                            : "bg-slate-50/50 border-slate-200/70"
                        )}>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              {(p.advanceBalance || 0) > 0 || (p.totalDue || 0) < 0 
                                ? 'অগ্রিম জমা' 
                                : (isCustomer ? 'মোট বকেয়া' : 'মোট প্রদেয়')}
                            </p>
                            <p className={cn(
                              "text-base font-black tracking-tight mt-0.5",
                              (p.advanceBalance || 0) > 0 || (p.totalDue || 0) < 0
                                ? "text-emerald-700"
                                : (p.totalDue || 0) > 0
                                ? "text-rose-600"
                                : "text-slate-700"
                            )}>
                              {(p.advanceBalance || 0) > 0
                                ? `৳ ${toBnDigits((p.advanceBalance || 0).toLocaleString('en-IN'))}`
                                : (p.totalDue || 0) < 0
                                ? `৳ ${toBnDigits(Math.abs(p.totalDue || 0).toLocaleString('en-IN'))}`
                                : `৳ ${toBnDigits((p.totalDue || 0).toLocaleString('en-IN'))}`
                              }
                            </p>
                          </div>

                          <div className="text-right">
                            <span className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded-md",
                              (p.advanceBalance || 0) > 0 || (p.totalDue || 0) < 0
                                ? "bg-emerald-100 text-emerald-800"
                                : (p.totalDue || 0) > 0
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-600"
                            )}>
                              {(p.advanceBalance || 0) > 0 || (p.totalDue || 0) < 0 ? 'অগ্রিম জমা' : (p.totalDue || 0) > 0 ? 'বকেয়া বাকি' : 'পরিশোধিত'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Quick Actions */}
                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          onClick={() => router.push(profileRoute)}
                          className="flex-1 h-8.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>প্রোফাইল ও লেজার</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>

                        <a
                          href={`tel:${p.phone}`}
                          className="h-8.5 w-8.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="কল করুন"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>

                        {canModifyData && (
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="h-8.5 w-8.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-700 hover:text-amber-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="তথ্য সম্পাদনা"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Footer for Card View */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200/80 rounded-md p-3 shadow-2xs">
              <div>
                মোট <strong className="text-slate-900 font-bold">{toBnDigits(filtered.length)}</strong> জন {isEngineer ? 'ইঞ্জিনিয়ারের' : isCustomer ? 'কাস্টমারের' : 'সরবরাহকারীর'} মধ্যে {filtered.length === 0 ? '০' : `${toBnDigits(startIndex + 1)} থেকে ${toBnDigits(endIndex)}`} দেখানো হচ্ছে
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <Button 
                  variant="outline" 
                  size="icon" 
                  disabled={validCurrentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600 disabled:opacity-40"
                  title="প্রথম পেজ"
                >
                  «
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  disabled={validCurrentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600 disabled:opacity-40"
                  title="পূর্ববর্তী পেজ"
                >
                  ‹
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && page - prev > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="text-slate-400 px-1 text-xs">...</span>}
                        <Button
                          variant={validCurrentPage === page ? "default" : "outline"}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-7 h-7 rounded-lg text-xs font-bold p-0",
                            validCurrentPage === page
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "border-slate-200 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          {toBnDigits(page)}
                        </Button>
                      </React.Fragment>
                    );
                  })}

                <Button 
                  variant="outline" 
                  size="icon" 
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600 disabled:opacity-40"
                  title="পরবর্তী পেজ"
                >
                  ›
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600 disabled:opacity-40"
                  title="শেষ পেজ"
                >
                  »
                </Button>

                <Select 
                  value={String(pageSize)} 
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-24 h-7 rounded-lg border-slate-200 text-xs font-bold ml-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-bengali text-xs">
                    <SelectItem value="10">১০ / পেজ</SelectItem>
                    <SelectItem value="25">২৫ / পেজ</SelectItem>
                    <SelectItem value="50">৫০ / পেজ</SelectItem>
                    <SelectItem value="100">১০০ / পেজ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
        /* 3. TABLE CONTAINER CARD */
        <Card className="bg-white border border-slate-200/80 rounded-md shadow-xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Table */}
            <div className="border border-slate-200/80 rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                  <TableRow className="text-xs text-slate-700 font-black">
                    <TableHead className="py-3 px-4 text-left font-black text-slate-900 w-12">ক্রমিক</TableHead>
<TableHead className="py-3 px-4 text-left font-black text-slate-900">
                      {isEngineer ? 'ইঞ্জিনিয়ারের নাম ও ডিগ্রি' : isCustomer ? 'কাস্টমারের নাম' : 'কোম্পানি / সরবরাহকারী'}
                    </TableHead>
                    <TableHead className="py-3 px-4 text-left font-black text-slate-900">মোবাইল নম্বর</TableHead>
                    <TableHead className="py-3 px-4 text-left font-black text-slate-900">
                      {isEngineer ? 'পদবী / ক্যাটাগরি' : isCustomer ? 'গ্রুপ' : 'সরবরাহের ধরন'}
                    </TableHead>
                    <TableHead className="py-3 px-4 text-right font-black text-slate-900">
                      {isEngineer ? 'মোট পাওনা / ব্যালেন্স' : 'মোট বকেয়া'}
                    </TableHead>
                    <TableHead className="py-3 px-4 text-left font-black text-slate-900">যুক্ত হওয়ার তারিখ</TableHead>
                    <TableHead className="py-3 px-4 text-center font-black text-slate-900">স্ট্যাটাস</TableHead>
                    <TableHead className="py-3 px-4 text-center font-black text-slate-900">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs font-bold text-slate-800 divide-y divide-slate-100">
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold">
                        লোড হচ্ছে...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold">
                        কোনো তথ্য পাওয়া যায়নি
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedParties.map((p, idx) => {
                      const isWholesale = p.customerType === 'পাইকারি গ্রাহক';
                      const isContractor = p.customerType === 'কন্ট্রাকটর';
                      const suppType = p.customerType || p.supplyType || 'রড';
                      const engRole = p.customerType || 'সিভিল ইঞ্জিনিয়ার';
                      const profileRoute = isEngineer ? `/engineers/${p.id}` : isCustomer ? `/customers/${p.id}` : `/suppliers/${p.id}`;

                      return (
                        <TableRow
                          key={p.id}
                          onClick={() => router.push(profileRoute)}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        >
                          <TableCell className="py-3.5 px-4 text-left text-slate-500 font-mono font-bold">
                            {toBnDigits(String(startIndex + idx + 1).padStart(2, '0'))}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center border border-blue-200 flex-shrink-0">
                                {p.photoUrl ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={p.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  p.name?.charAt(0) || 'ই'
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-xs">{p.name}</p>
                                <p className="text-[11px] text-slate-400 font-medium">{p.businessName ? `${p.businessName} • ` : ''}{p.email ? p.email : (p.phone ? toBnDigits(p.phone) : '')}</p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left text-slate-700 font-medium">
                            {toBnDigits(p.phone)}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left">
                            {isEngineer ? (
                              <div className="space-y-1">
                                <span className={cn(
                                  "inline-block font-bold text-[11px] px-3 py-0.5 rounded-md",
                                  engRole.includes('আর্কিটেক্ট')
                                    ? "bg-purple-100/80 text-purple-700"
                                    : engRole.includes('স্ট্রাকচারাল')
                                    ? "bg-amber-100/80 text-amber-800"
                                    : engRole.includes('ডিপ্লোমা')
                                    ? "bg-cyan-100/80 text-cyan-700"
                                    : "bg-blue-100/80 text-blue-700"
                                )}>
                                  {engRole}
                                </span>
                                {((p.rodCommissionRate || 0) > 0 || (p.cementCommissionRate || 0) > 0) && (
                                  <div className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-flex flex-wrap gap-1">
                                    {p.rodCommissionRate ? <span>রড: ৳{toBnDigits(p.rodCommissionRate)}/কেজি</span> : null}
                                    {p.cementCommissionRate ? <span>সিমেন্ট: ৳{toBnDigits(p.cementCommissionRate)}/বস্তা</span> : null}
                                  </div>
                                )}
                              </div>
                            ) : isCustomer ? (
                              <span className={cn(
                                "inline-block font-bold text-[11px] px-3 py-0.5 rounded-md",
                                isContractor
                                  ? "bg-blue-100/80 text-blue-700"
                                  : isWholesale
                                  ? "bg-purple-100/80 text-purple-700"
                                  : "bg-emerald-100/80 text-emerald-700"
                              )}>
                                {isContractor ? 'ঠিকাদার' : isWholesale ? 'পাইকারি' : 'খুচরা ক্রেতা'}
                              </span>
                            ) : (
                              <span className={cn(
                                "inline-block font-bold text-[11px] px-3 py-0.5 rounded-md",
                                suppType === 'সিমেন্ট'
                                  ? "bg-cyan-100/80 text-cyan-700"
                                  : suppType === 'রড ও সিমেন্ট'
                                  ? "bg-purple-100/80 text-purple-700"
                                  : suppType === 'অন্যান্য'
                                  ? "bg-slate-100/80 text-slate-700"
                                  : "bg-amber-100/80 text-amber-800"
                              )}>
                                {suppType}
                              </span>
                            )}
                          </TableCell>

                          <TableCell className={cn(
                            "py-3.5 px-4 text-right font-black",
                            isEngineer 
                              ? "text-emerald-700" 
                              : (p.totalDue || 0) < 0 ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {isEngineer
                              ? `৳ ${toBnDigits((p.totalDue || 0).toLocaleString('en-IN'))}`
                              : (p.totalDue || 0) < 0
                                ? `-৳ ${toBnDigits(Math.abs(p.totalDue || 0).toLocaleString('en-IN'))}`
                                : `৳ ${toBnDigits((p.totalDue || 0).toLocaleString('en-IN'))}`
                            }
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left">
                            <p className="text-slate-700 font-medium text-[11px]">{p.joinedDate ? formatBnDate(p.joinedDate, 'dd MMMM yyyy') : '—'}</p>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 bg-emerald-100/80 text-emerald-700 font-bold text-[11px] px-2.5 py-0.5 rounded-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              সক্রিয়
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                            <TableRowActionMenu
                              onView={() => router.push(profileRoute)}
                              onEdit={() => openEdit(p)}
                              onDelete={() => handleDelete(p.id)}
                              canEdit={canModifyData}
                              canDelete={canModifyData}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-semibold text-slate-500">
              <div>
                মোট <strong className="text-slate-900 font-bold">{toBnDigits(filtered.length)}</strong> জন {isEngineer ? 'ইঞ্জিনিয়ারের' : isCustomer ? 'কাস্টমারের' : 'সরবরাহকারীর'} মধ্যে {filtered.length === 0 ? '০' : `${toBnDigits(startIndex + 1)} থেকে ${toBnDigits(endIndex)}`} দেখানো হচ্ছে
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <Button 
                  variant="outline" 
                  size="icon" 
                  disabled={validCurrentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600 disabled:opacity-40"
                  title="প্রথম পেজ"
                >
                  «
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  disabled={validCurrentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600 disabled:opacity-40"
                  title="পূর্ববর্তী পেজ"
                >
                  ‹
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && page - prev > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="text-slate-400 px-1 text-xs">...</span>}
                        <Button
                          variant={validCurrentPage === page ? "default" : "outline"}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-7 h-7 rounded-lg text-xs font-bold p-0",
                            validCurrentPage === page
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "border-slate-200 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          {toBnDigits(page)}
                        </Button>
                      </React.Fragment>
                    );
                  })}

                <Button 
                  variant="outline" 
                  size="icon" 
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600 disabled:opacity-40"
                  title="পরবর্তী পেজ"
                >
                  ›
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600 disabled:opacity-40"
                  title="শেষ পেজ"
                >
                  »
                </Button>

                <Select 
                  value={String(pageSize)} 
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-24 h-7 rounded-lg border-slate-200 text-xs font-bold ml-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-bengali text-xs">
                    <SelectItem value="10">১০ / পেজ</SelectItem>
                    <SelectItem value="25">২৫ / পেজ</SelectItem>
                    <SelectItem value="50">৫০ / পেজ</SelectItem>
                    <SelectItem value="100">১০০ / পেজ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </CardContent>
        </Card>
        )}
      </div>
      ) : (
        /* CREATE / EDIT IN-PAGE VIEW (Direct Page View, Framed Container) */
        <div className="space-y-4 animate-in fade-in duration-300 font-bengali">
          <div className="w-full bg-slate-100 border-2 border-slate-300 shadow-xl rounded-md overflow-hidden flex flex-col min-h-[calc(100vh-100px)]">
            
            {/* FRAME TOP HEADER BAR */}
            <div className="bg-white border-b border-slate-300 px-6 py-3.5 flex items-center justify-between shadow-xs flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => { setIsAddOpen(false); resetForm(); }}
                  className="w-9 h-9 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold shadow-xs flex-shrink-0 transition-colors"
                  title="তালিকায় ফিরে যান"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase block">
                    {isEngineer ? 'ইঞ্জিনিয়ার ব্যবস্থাপনা' : isCustomer ? 'কাস্টমার ব্যবস্থাপনা' : 'সরবরাহকারী ব্যবস্থাপনা'}
                  </span>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                    {editing
                      ? isEngineer ? 'ইঞ্জিনিয়ারের তথ্য সম্পাদনা করুন' : isCustomer ? 'গ্রাহকের তথ্য সম্পাদনা করুন' : 'সরবরাহকারীর তথ্য সম্পাদনা করুন'
                      : isEngineer ? 'নতুন ইঞ্জিনিয়ার নিবন্ধন করুন' : isCustomer ? 'নতুন গ্রাহক যোগ করুন' : 'নতুন কোম্পানি / সরবরাহকারী যোগ করুন'}
                  </h1>
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { setIsAddOpen(false); resetForm(); }}
                className="h-9 w-9 rounded-md hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* MAIN FORM GRID INSIDE FRAME */}
            <form onSubmit={handleSubmit} className="p-4 md:p-6 w-full space-y-6 flex-1 overflow-y-auto font-bengali">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* --- LEFT COLUMN (WIDE ~75%) --- */}
                <div className="lg:col-span-9 space-y-5">
                  
                  {/* STEP 1: ❶ প্রাথমিক ও পেশাগত তথ্য */}
                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span className="w-6 h-6 rounded-md bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        ১
                      </span>
                      <h2 className="text-sm font-black text-slate-900 tracking-wide">
                        {isEngineer ? 'প্রাথমিক ও পেশাগত তথ্য' : 'প্রাথমিক তথ্য'}
                      </h2>
                    </div>

                    <div className={cn("grid grid-cols-1 gap-3 text-xs font-bold text-slate-700", (isCustomer || isEngineer) ? "md:grid-cols-3" : "md:grid-cols-2")}>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          {isEngineer ? 'ইঞ্জিনিয়ারের পুরো নাম' : isCustomer ? 'গ্রাহকের নাম' : 'কোম্পানি / প্রতিনিধির নাম'} <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder=""
                          className="rounded-xl h-10 bg-white border-slate-200 font-bold"
                        />
                      </div>

                      {(isCustomer || isEngineer) && (
                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-slate-700">
                            {isEngineer ? 'ফার্ম / কনস্ট্রাকশন কোম্পানি / অফিসের নাম' : 'ব্যবসা / প্রতিষ্ঠানের নাম'} <span className="text-xs font-normal text-slate-400">(ঐচ্ছিক)</span>
                          </Label>
                          <Input
                            value={formData.businessName}
                            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                            placeholder=""
                            className="rounded-xl h-10 bg-white border-slate-200 font-bold"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          {isEngineer ? 'পদবী / ক্যাটাগরি' : isCustomer ? 'গ্রাহকের ধরন (ঐচ্ছিক)' : 'সরবরাহের ধরন / ক্যাটাগরি (ঐচ্ছিক)'}
                        </Label>
                        <Select
                          value={formData.customerType}
                          onValueChange={(val: string | null) =>
                            setFormData({ ...formData, customerType: val || (isEngineer ? 'সিভিল ইঞ্জিনিয়ার' : isCustomer ? 'খুচরা গ্রাহক' : 'রড') })
                          }
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent className="font-bengali text-xs">
                            {isEngineer ? (
                              <>
                                <SelectItem value="সিভিল ইঞ্জিনিয়ার">📐 সিভিল ইঞ্জিনিয়ার</SelectItem>
                                <SelectItem value="স্ট্রাকচারাল ইঞ্জিনিয়ার">🏛️ স্ট্রাকচারাল ইঞ্জিনিয়ার</SelectItem>
                                <SelectItem value="ডিপ্লোমা ইঞ্জিনিয়ার">🏗️ ডিপ্লোমা ইঞ্জিনিয়ার</SelectItem>
                                <SelectItem value="আর্কিটেক্ট">🎨 আর্কিটেক্ট / স্থপতি</SelectItem>
                                <SelectItem value="কনসালটেন্ট">💼 কনসালটেন্ট</SelectItem>
                                <SelectItem value="সাইট সুপারভাইজার">👷‍♂️ সাইট সুপারভাইজার</SelectItem>
                                <SelectItem value="কন্ট্রাকটর">🛠️ ঠিকাদার / হেড মিস্ত্রি</SelectItem>
                              </>
                            ) : isCustomer ? (
                              <>
                                <SelectItem value="খুচরা গ্রাহক">খুচরা গ্রাহক</SelectItem>
                                <SelectItem value="পাইকারি গ্রাহক">পাইকারি গ্রাহক</SelectItem>
                                <SelectItem value="কন্ট্রাকটর">কন্ট্রাকটর / ডেভেলপার</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="রড">🧱 রড সরবরাহকারী</SelectItem>
                                <SelectItem value="সিমেন্ট">🏗️ সিমেন্ট সরবরাহকারী</SelectItem>
                                <SelectItem value="রড ও সিমেন্ট">🏢 রড ও সিমেন্ট সরবরাহকারী</SelectItem>
                                <SelectItem value="অন্যান্য">📦 সাধারণ / অন্যান্য সরবরাহকারী</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold text-slate-700 pt-1">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-slate-700">
                            মোবাইল নম্বর <span className="text-rose-500">*</span>
                          </Label>
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, altPhone: prev.altPhone ? '' : '01' }))}
                            className="text-[11px] font-bold text-orange-600 hover:underline flex items-center gap-1"
                          >
                            + অতিরিক্ত নম্বর
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="relative">
                            <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                            <Input
                              required
                              value={formData.phone}
                              maxLength={11}
                              onChange={(e) => {
                                const val = toBnDigits(e.target.value).replace(/[^০-৯]/g, '').slice(0, 11);
                                setFormData({ ...formData, phone: val });
                              }}
                              placeholder="০১৭১..."
                              className="rounded-xl h-10 bg-white border-slate-200 pr-9 font-bold font-bengali text-sm tracking-wide"
                            />
                          </div>
                          {formData.altPhone !== undefined && (
                            <div className="relative">
                              <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                              <Input
                                value={formData.altPhone}
                                maxLength={11}
                                onChange={(e) => {
                                  const val = toBnDigits(e.target.value).replace(/[^০-৯]/g, '').slice(0, 11);
                                  setFormData({ ...formData, altPhone: val });
                                }}
                                placeholder="০১৭১..."
                                className="rounded-xl h-10 bg-white border-slate-200 pr-9 font-bold font-bengali text-sm tracking-wide"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">ইমেইল ঠিকানা (ঐচ্ছিক)</Label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder=""
                            className="rounded-xl h-10 bg-white border-slate-200 pr-9 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STEP 2: ❷ ঠিকানা ও প্রজেক্ট তথ্য */}
                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span className="w-6 h-6 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        ২
                      </span>
                      <h2 className="text-sm font-black text-slate-900 tracking-wide">
                        {isEngineer ? 'ঠিকানা ও চলমান সাইট / প্রজেক্টের তথ্য' : 'ঠিকানা ও অবস্থান তথ্য (ঐচ্ছিক)'}
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold text-slate-700">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          দেশ
                        </Label>
                        <Select
                          value={formData.country}
                          onValueChange={(val: string | null) =>
                            setFormData({ ...formData, country: val || 'বাংলাদেশ' })
                          }
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="font-bengali text-xs">
                            <SelectItem value="বাংলাদেশ">বাংলাদেশ</SelectItem>
                            <SelectItem value="আন্তর্জাতিক">আন্তর্জাতিক</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          বিভাগ
                        </Label>
                        <Select
                          value={formData.division}
                          onValueChange={(val: string | null) => {
                            const newDiv = val || 'ঢাকা';
                            const divObj = bdLocationData.find(d => d.name === newDiv);
                            const firstDist = newDiv === 'ঢাকা'
                              ? (divObj?.districts.find(d => d.name === 'গোপালগঞ্জ')?.name || divObj?.districts[0]?.name || '')
                              : (divObj && divObj.districts.length > 0 ? divObj.districts[0].name : '');
                            const distObj = divObj?.districts.find(d => d.name === firstDist);
                            const firstThana = distObj && distObj.thanas.length > 0 ? distObj.thanas[0] : '';
                            setFormData({
                              ...formData,
                              division: newDiv,
                              district: firstDist,
                              thana: firstThana
                            });
                          }}
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold">
                            <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent className="font-bengali text-xs">
                            {bdLocationData.map((d) => (
                              <SelectItem key={d.name} value={d.name}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">জেলা</Label>
                        <Select
                          value={formData.district}
                          onValueChange={(val: string | null) => {
                            const newDist = val || '';
                            const distObj = availableDistricts.find(d => d.name === newDist);
                            const firstThana = distObj && distObj.thanas.length > 0 ? distObj.thanas[0] : '';
                            setFormData({
                              ...formData,
                              district: newDist,
                              thana: firstThana
                            });
                          }}
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold">
                            <SelectValue placeholder="জেলা নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent className="font-bengali text-xs">
                            {availableDistricts.map((dst) => (
                              <SelectItem key={dst.name} value={dst.name}>
                                {dst.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-bold text-slate-700">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">উপজেলা / থানা</Label>
                        <Select
                          value={formData.thana}
                          onValueChange={(val: string | null) => setFormData({ ...formData, thana: val || '' })}
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold">
                            <SelectValue placeholder="থানা নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent className="font-bengali text-xs">
                            {availableThanas.map((th) => (
                              <SelectItem key={th} value={th}>
                                {th}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          {isEngineer ? 'বিস্তারিত চেম্বার / অফিসের ঠিকানা' : 'বিস্তারিত ঠিকানা (বিল্ডিং / রোড / এলাকা)'}
                        </Label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder=""
                          className="rounded-xl h-10 bg-white border-slate-200 font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">পোস্ট কোড</Label>
                        <Input
                          value={formData.postcode}
                          onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                          placeholder=""
                          className="rounded-xl h-10 bg-white border-slate-200 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* STEP 3: ❸ আর্থিক পলিসি, কমিশন ও পরিচয়পত্র */}
                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span className="w-6 h-6 rounded-md bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        ৩
                      </span>
                      <h2 className="text-sm font-black text-slate-900 tracking-wide">
                        {isEngineer ? 'কমিশন পলিসি, আইডি ও হিসাবের শর্তাবলী' : 'আর্থিক পলিসি ও পরিচয়পত্র'}
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold text-slate-700">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">পরিচয়পত্রের ধরন</Label>
                        <Select
                          value={formData.idType}
                          onValueChange={(val: string | null) => setFormData({ ...formData, idType: val || (isEngineer ? 'IEB মেম্বারশিপ' : 'জাতীয় পরিচয়পত্র') })}
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="font-bengali text-xs">
                            {isEngineer ? (
                              <>
                                <SelectItem value="IEB মেম্বারশিপ">IEB মেম্বারশিপ কার্ড</SelectItem>
                                <SelectItem value="রাজউক লাইসেন্স">রাজউক লাইসেন্স</SelectItem>
                                <SelectItem value="জাতীয় পরিচয়পত্র">জাতীয় পরিচয়পত্র (এনআইডি)</SelectItem>
                                <SelectItem value="ট্রেড লাইসেন্স">ট্রেড লাইসেন্স</SelectItem>
                                <SelectItem value="পাসপোর্ট">পাসপোর্ট</SelectItem>
                                <SelectItem value="অন্যান্য">অন্যান্য পরিচয়পত্র</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="জাতীয় পরিচয়পত্র">জাতীয় পরিচয়পত্র (এনআইডি)</SelectItem>
                                <SelectItem value="ট্রেড লাইসেন্স">ট্রেড লাইসেন্স</SelectItem>
                                <SelectItem value="পাসপোর্ট">পাসপোর্ট</SelectItem>
                                <SelectItem value="জন্ম নিবন্ধন">জন্ম নিবন্ধন</SelectItem>
                                <SelectItem value="অন্যান্য">অন্যান্য পরিচয়পত্র</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          {isEngineer ? 'মেম্বারশিপ / লাইসেন্স / এনআইডি নম্বর' : 'পরিচয়পত্র / লাইসেন্স নম্বর'}
                        </Label>
                        <Input
                          value={formData.nid}
                          onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
                          placeholder=""
                          className="rounded-xl h-10 bg-white border-slate-200 font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">ই-টিন (টিন) নম্বর</Label>
                        <Input
                          value={formData.tinNumber}
                          onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                          placeholder=""
                          className="rounded-xl h-10 bg-white border-slate-200 font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold text-slate-700 pt-1">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-slate-700">
                            {isEngineer ? 'প্রারম্ভিক কমিশন (৳)' : 'প্রারম্ভিক ব্যালেন্স (৳)'}
                          </Label>
                          {!isEngineer && (
                            <div className="flex items-center gap-2 text-[10px] font-bold">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="opBalType" 
                                  checked={formData.openingBalanceType === 'due'} 
                                  onChange={() => setFormData({ ...formData, openingBalanceType: 'due' })} 
                                  className="accent-rose-600" 
                                />
                                <span className={formData.openingBalanceType === 'due' ? 'text-rose-600 font-black' : 'text-slate-400'}>বকেয়া</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="opBalType" 
                                  checked={formData.openingBalanceType === 'advance'} 
                                  onChange={() => setFormData({ ...formData, openingBalanceType: 'advance' })} 
                                  className="accent-emerald-600" 
                                />
                                <span className={formData.openingBalanceType === 'advance' ? 'text-emerald-600 font-black' : 'text-slate-400'}>অগ্রিম</span>
                              </label>
                            </div>
                          )}
                        </div>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={formData.openingBalance ?? ''}
                          onChange={(e) =>
                            setFormData({ ...formData, openingBalance: e.target.value })
                          }
                          placeholder="০.০০"
                          className={cn(
                            "rounded-xl h-10 bg-white border-slate-200 font-black transition-colors",
                            formData.openingBalanceType === 'advance' ? "text-emerald-600 focus:border-emerald-500" : "text-rose-600 focus:border-rose-500"
                          )}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          {isEngineer ? 'সর্বোচ্চ পাওনা লিমিট (৳)' : 'বাকি বা ঋণের সীমা (৳)'}
                        </Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={formData.creditLimit ?? ''}
                          onChange={(e) =>
                            setFormData({ ...formData, creditLimit: e.target.value })
                          }
                          placeholder=""
                          className="rounded-xl h-10 bg-white border-slate-200 font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          {isEngineer ? 'রেফারেল কমিশন হার (%)' : 'স্পেশাল কমিশন / ছাড় (%)'}
                        </Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={formData.discountPercent ?? ''}
                          onChange={(e) =>
                            setFormData({ ...formData, discountPercent: e.target.value })
                          }
                          placeholder=""
                          className="rounded-xl h-10 bg-white border-slate-200 font-bold"
                        />
                      </div>

                      {/* Pure Bengali Date Selector */}
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">যুক্ত হওয়ার তারিখ</Label>
                        <BengaliDatePicker
                          value={formData.joinedDate}
                          onChange={(val) => setFormData({ ...formData, joinedDate: val })}
                          placeholder=""
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Engineer Specific Rod & Cement Commission Per-Unit Inputs */}
                    {isEngineer && (
                      <div className="p-4 bg-orange-50/80 border border-orange-200 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-base shrink-0">
                            👷‍♂️
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-orange-950">পণ্যভিত্তিক বিক্রয় কমিশন রেট (রড ও সিমেন্ট)</h4>
                            <p className="text-[11px] text-orange-700 font-semibold">
                              চালান/ইনভয়েস তৈরির সময় কাস্টমার যত কেজি রড বা যত বস্তা সিমেন্ট নিবে, সেই পরিমাণের উপর স্বয়ংক্রিয়ভাবে কমিশন হিসাব হবে।
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          {/* Rod Commission (Per KG) */}
                          <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-orange-200/80 shadow-2xs">
                            <Label className="text-xs font-black text-slate-800 flex items-center justify-between">
                              <span>রড কমিশন রেট <span className="text-orange-600 font-bold">(প্রতি কেজি)</span></span>
                              <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-bold">৳ / কেজি</span>
                            </Label>
                            <div className="relative">
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={formData.rodCommissionRate ?? ''}
                                onChange={(e) => setFormData({ ...formData, rodCommissionRate: e.target.value })}
                                placeholder=""
                                className="rounded-lg h-10 bg-slate-50 border-orange-200 font-black text-slate-900 text-sm pl-7"
                              />
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">৳</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium">
                              ১ টন রড বিক্রি হলে কমিশন হবে: <strong className="text-orange-700 font-bold font-mono">৳ {(Number(toEnglishDigits(formData.rodCommissionRate) || 0) * 1000).toLocaleString('en-IN')}</strong>
                            </p>
                          </div>

                          {/* Cement Commission (Per Bag) */}
                          <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-orange-200/80 shadow-2xs">
                            <Label className="text-xs font-black text-slate-800 flex items-center justify-between">
                              <span>সিমেন্ট কমিশন রেট <span className="text-orange-600 font-bold">(প্রতি বস্তা)</span></span>
                              <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-bold">৳ / বস্তা</span>
                            </Label>
                            <div className="relative">
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={formData.cementCommissionRate ?? ''}
                                onChange={(e) => setFormData({ ...formData, cementCommissionRate: e.target.value })}
                                placeholder=""
                                className="rounded-lg h-10 bg-slate-50 border-orange-200 font-black text-slate-900 text-sm pl-7"
                              />
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">৳</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium">
                              ১০০ বস্তা সিমেন্ট বিক্রি হলে কমিশন হবে: <strong className="text-orange-700 font-bold font-mono">৳ {(Number(formData.cementCommissionRate || 0) * 100).toLocaleString('en-IN')}</strong>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 pt-1">
                      <Label className="text-xs font-bold text-slate-700">
                        {isEngineer ? 'চলমান সাইট / প্রজেক্ট বা চুক্তির বিশেষ নোট' : 'বিশেষ মন্তব্য / নোট'}
                      </Label>
                      <Input
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        placeholder=""
                        className="rounded-xl h-10 bg-white border-slate-200 font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* --- RIGHT COLUMN (NARROW SIDEBAR PANEL ~25%) --- */}
                <div className="lg:col-span-3 space-y-4">
                  {/* CARD 1: LOGO / PHOTO UPLOAD */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-center">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                      {isEngineer ? 'ইঞ্জিনিয়ারের ছবি' : isCustomer ? 'গ্রাহকের ছবি / লোগো' : 'কোম্পানির লোগো / ছবি'}
                    </h2>

                    <div className="flex flex-col items-center gap-2.5">
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 border-2 border-blue-200 flex items-center justify-center shadow-inner group">
                        {formData.photoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={formData.photoUrl} alt="লোগো / ছবি" className="w-full h-full object-cover" />
                        ) : isEngineer ? (
                          <Users className="w-9 h-9 text-blue-400" />
                        ) : isCustomer ? (
                          <Users className="w-9 h-9 text-slate-300" />
                        ) : (
                          <Building2 className="w-9 h-9 text-slate-300" />
                        )}
                      </div>

                      <div className="space-y-1.5 w-full">
                        <p className="text-[10px] text-slate-400 font-bold leading-tight">
                          {isEngineer ? 'প্রোফাইল ছবি আপলোড করুন' : 'ছবি বা লোগো আপলোড করুন'}
                          <br />
                          <span className="text-[9px] text-slate-400 font-semibold">জেপিজি বা পিএনজি (সর্বোচ্চ ২ মেগাবাইট)</span>
                        </p>

                        <label className="cursor-pointer w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition-colors">
                          <Camera className="w-3.5 h-3.5" /> {formData.photoUrl ? 'ছবি পরিবর্তন করুন' : 'ছবি আপলোড করুন'}
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>

                        {formData.photoUrl && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, photoUrl: '' }))}
                              className="text-[11px] text-rose-600 font-bold hover:underline"
                            >
                              ছবি মুছুন
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: QUICK INFO */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs font-bold text-slate-700">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">দ্রুত তথ্য</h2>

                    <div className="space-y-2.5 pt-0.5 text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-semibold">
                          {isEngineer ? 'ইঞ্জিনিয়ার আইডি' : isCustomer ? 'গ্রাহক আইডি' : 'কোম্পানি আইডি'}
                        </span>
                        <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          {isEngineer ? (editing ? `ইঞ্জি-${toBnDigits(editing.id)}` : 'স্বয়ংক্রিয় তৈরি') : isCustomer ? (editing ? `গ্রাহক-${toBnDigits(editing.id)}` : 'স্বয়ংক্রিয় তৈরি') : (editing ? `সরবরাহকারী-${toBnDigits(editing.id)}` : 'স্বয়ংক্রিয় তৈরি')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-semibold">স্ট্যাটাস</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          সক্রিয়
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-semibold">
                          {isEngineer ? 'পদবী' : isCustomer ? 'গ্রাহকের ধরন' : 'সরবরাহের ধরন'}
                        </span>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {formData.customerType || (isEngineer ? 'সিভিল ইঞ্জিনিয়ার' : isCustomer ? 'খুচরা গ্রাহক' : 'রড')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* STICKY BOTTOM ACTION BAR INSIDE FRAME */}
              <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm font-bengali flex-shrink-0 mt-6 rounded-b-2xl">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>
                    💡 {isEngineer ? 'ইঞ্জিনিয়ারের তথ্য সংরক্ষণের পূর্বে সঠিকতা যাচাই করে নিন।' : isCustomer ? 'গ্রাহকের তথ্য সংরক্ষণের পূর্বে সঠিকতা যাচাই করে নিন।' : 'কোম্পানির তথ্য সংরক্ষণের পূর্বে যাচাই করে নিন।'}
                  </span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setIsAddOpen(false); resetForm(); }}
                    className="rounded-xl h-11 px-5 font-bold text-slate-600 border-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    বাতিল করুন
                  </Button>

                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 h-11 rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all text-sm cursor-pointer"
                  >
                    <Save className="w-4 h-4 mr-2 inline" />
                    {isEngineer ? 'ইঞ্জিনিয়ার সংরক্ষণ করুন' : isCustomer ? 'গ্রাহকের তথ্য সংরক্ষণ করুন' : 'সরবরাহকারী সংরক্ষণ করুন'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel/CSV Bulk Data Import Modal */}
      <DataImportModal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        defaultType={isCustomer ? 'customers' : isEngineer ? 'customers' : 'suppliers'}
        onSuccess={fetchParties}
      />
    </Shell>
  );
}
