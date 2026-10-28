'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { toBengaliDigits, toEnglishDigits, cleanLegacyBengaliText } from '@/lib/bengaliUtils';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  Users,
  Package,
  Truck,
  Receipt,
  FileText,
  Trash2,
  RefreshCw,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export type ImportType = 'customers' | 'products' | 'suppliers' | 'expenses' | 'customer_ledger';

interface DataImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: ImportType;
  preselectedParty?: { id: string | number; name: string; phone?: string };
  onSuccess?: () => void;
}

export function DataImportModal({
  open,
  onOpenChange,
  defaultType = 'customers',
  preselectedParty,
  onSuccess
}: DataImportModalProps) {
  const [activeType, setActiveType] = useState<ImportType>(defaultType);
  const [clearExisting, setClearExisting] = useState<boolean>(false);
  const [groupByDate, setGroupByDate] = useState<boolean>(true);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset file and preview when changing type
  const handleTypeChange = (type: ImportType) => {
    setActiveType(type);
    setFile(null);
    setParsedRows([]);
    setPreviewData([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 1. Generate & Download Sample Template
  const handleDownloadTemplate = () => {
    try {
      let headers: string[] = [];
      let sampleData: any[] = [];
      let fileName = '';

      if (activeType === 'customers') {
        fileName = 'কাস্টমার_বকেয়া_নমুনা_টেমপ্লেট.xlsx';
        sampleData = [
          {
            'নাম (Name)': 'আব্দুল করিম',
            'মোবাইল (Phone)': '01711122233',
            'ব্যবসা প্রতিষ্ঠান (Business Name)': 'করিম ট্রেডার্স',
            'ঠিকানা (Address)': 'সদর রোড, গোপালগঞ্জ',
            'পূর্বের বকেয়া (Opening Due)': 15000
          },
          {
            'নাম (Name)': 'রফিকুল ইসলাম',
            'মোবাইল (Phone)': '01822233344',
            'ব্যবসা প্রতিষ্ঠান (Business Name)': 'ইসলাম হার্ডওয়্যার',
            'ঠিকানা (Address)': 'নিউ মার্কেট, ঢাকা',
            'পূর্বের বকেয়া (Opening Due)': 8500
          }
        ];
      } else if (activeType === 'products') {
        fileName = 'পণ্য_স্টক_নমুনা_টেমপ্লেট.xlsx';
        sampleData = [
          {
            'পণ্যের নাম (Product Name)': 'BSRM রড ১৬ মিমি',
            'ক্যাটাগরি (Category)': 'রড',
            'একক (Unit)': 'কেজি',
            'বর্তমান স্টক (Stock)': 2500,
            'ক্রয়মূল্য (Purchase Price)': 92.5,
            'বিক্রয়মূল্য (Sell Price)': 96.0,
            'ব্র্যান্ড (Brand)': 'BSRM'
          },
          {
            'পণ্যের নাম (Product Name)': 'শাহ সিমেন্ট স্পেশাল',
            'ক্যাটাগরি (Category)': 'সিমেন্ট',
            'একক (Unit)': 'ব্যাগ',
            'বর্তমান স্টক (Stock)': 300,
            'ক্রয়মূল্য (Purchase Price)': 510,
            'বিক্রয়মূল্য (Sell Price)': 540,
            'ব্র্যান্ড (Brand)': 'Shah Cement'
          }
        ];
      } else if (activeType === 'suppliers') {
        fileName = 'সাপ্লায়ার_পাওনা_নমুনা_টেমপ্লেট.xlsx';
        sampleData = [
          {
            'সাপ্লায়ার নাম (Supplier Name)': 'মেসার্স মেঘনা স্টিল মিলস',
            'মোবাইল (Phone)': '01933344455',
            'প্রতিষ্ঠান (Company Name)': 'মেঘনা গ্রুপ',
            'ঠিকানা (Address)': 'মতিঝিল, ঢাকা',
            'পূর্বের পাওনা (Payable Due)': 120000
          }
        ];
      } else if (activeType === 'expenses') {
        fileName = 'পূর্ববর্তী_খরচ_নমুনা_টেমপ্লেট.xlsx';
        sampleData = [
          {
            'খরচের বিবরণ (Title)': 'দোকান ভাড়া - জানুয়ারি',
            'ক্যাটাগরি (Category)': 'দোকান ভাড়া',
            'টাকার পরিমাণ (Amount)': 15000,
            'তারিখ (Date)': '2025-01-10',
            'পেমেন্ট মেথড (Payment Method)': 'ক্যাশ'
          },
          {
            'খরচের বিবরণ (Title)': 'বিদ্যুৎ বিল - জানুয়ারি',
            'ক্যাটাগরি (Category)': 'বিদ্যুৎ বিল',
            'টাকার পরিমাণ (Amount)': 3200,
            'তারিখ (Date)': '2025-01-15',
            'পেমেন্ট মেথড (Payment Method)': 'ব্যাংক'
          }
        ];
      } else if (activeType === 'customer_ledger') {
        fileName = 'কাস্টমার_লেজার_পূর্ববর্তী_হিসাব_টেমপ্লেট.xlsx';
        sampleData = [
          {
            'তারিখ (Date)': '2024-05-10',
            'কাস্টমার নাম / মোবাইল (Customer)': preselectedParty ? `${preselectedParty.name} (${preselectedParty.phone || ''})` : 'আব্দুল করিম (01711122233)',
            'চালান বা ভাউচার নং (Invoice No)': 'INV-2024-001',
            'বিবরণ বা পণ্যের নাম (Description)': '10 মি.মি বিএসআরএম রড',
            'পরিমাণ (Qty)': 500,
            'দর (Rate)': 95,
            'একক (Unit)': 'কেজি',
            'ডেবিট বা বিক্রয় (Debit/Bill)': 47500,
            'ক্রেডিট বা জমা (Credit/Paid)': 20000,
            'পদ্ধতি (Method)': 'নগদ',
            'মন্তব্য (Remarks)': 'আগের বাকি চালান'
          },
          {
            'তারিখ (Date)': '2024-05-18',
            'কাস্টমার নাম / মোবাইল (Customer)': preselectedParty ? `${preselectedParty.name} (${preselectedParty.phone || ''})` : 'আব্দুল করিম (01711122233)',
            'চালান বা ভাউচার নং (Invoice No)': 'RCV-2024-001',
            'বিবরণ বা পণ্যের নাম (Description)': 'নগদ জমা পরিশোধ',
            'পরিমাণ (Qty)': 1,
            'দর (Rate)': 0,
            'একক (Unit)': '',
            'ডেবিট বা বিক্রয় (Debit/Bill)': 0,
            'ক্রেডিট বা জমা (Credit/Paid)': 15000,
            'পদ্ধতি (Method)': 'ব্যাংক',
            'মন্তব্য (Remarks)': 'পূবালী ব্যাংক মারফত জমা'
          },
          {
            'তারিখ (Date)': '2024-05-25',
            'কাস্টমার নাম / মোবাইল (Customer)': preselectedParty ? `${preselectedParty.name} (${preselectedParty.phone || ''})` : 'আব্দুল করিম (01711122233)',
            'চালান বা ভাউচার নং (Invoice No)': 'INV-2024-002',
            'বিবরণ বা পণ্যের নাম (Description)': 'হোলসিম সিমেন্ট',
            'পরিমাণ (Qty)': 50,
            'দর (Rate)': 540,
            'একক (Unit)': 'বস্তা',
            'ডেবিট বা বিক্রয় (Debit/Bill)': 27000,
            'ক্রেডিট বা জমা (Credit/Paid)': 0,
            'পদ্ধতি (Method)': 'নগদ',
            'মন্তব্য (Remarks)': 'বাকি বিক্রি'
          }
        ];
      }

      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, fileName);
      toast.success('নমুনা এক্সেল টেমপ্লেট সফলভাবে ডাউনলোড হয়েছে');
    } catch (err) {
      console.error('Error downloading template:', err);
      toast.error('টেমপ্লেট ডাউনলোড করা সম্ভব হয়নি');
    }
  };

  // Normalize field names
  const normalizeKey = (key: string): string => {
    const k = key.trim().toLowerCase();
    if (k.includes('তারিখ') || k.includes('date') || k.includes('সময়')) return 'date';
    if (k.includes('চালান') || k.includes('ভাউচার') || k.includes('মেমো') || k.includes('invoice') || k.includes('voucher') || k.includes('ref')) return 'invoice_no';
    if (k.includes('কাস্টমার') || k.includes('গ্রাহক') || k.includes('পার্টি') || k.includes('customer') || k.includes('party')) return 'customer';
    if (k.includes('ফোন') || k.includes('phone') || k.includes('mobile') || k.includes('মোবাইল')) return 'phone';
    if (k.includes('বিবরণ') || k.includes('পণ্য') || k.includes('আইটেম') || k.includes('particular') || k.includes('description') || k.includes('item')) return 'description';
    if (k.includes('পরিমাণ') || k.includes('qty') || k.includes('quantity')) return 'quantity';
    if (k.includes('দর') || k.includes('রেট') || k.includes('মূল্য') || k.includes('rate') || k.includes('price')) return 'rate';
    if (k.includes('একক') || k.includes('unit')) return 'unit';
    if (k.includes('ডেবিট') || k.includes('debit') || k.includes('বিল') || k.includes('bill')) return 'debit';
    if (k.includes('ক্রেডিট') || k.includes('credit') || k.includes('জমা') || k.includes('পরিশোধ') || k.includes('উসুল') || k.includes('deposit') || k.includes('paid')) return 'credit';
    if (k.includes('ব্যবসা') || k.includes('business') || k.includes('প্রতিষ্ঠান') || k.includes('company')) return 'business_name';
    if (k.includes('ঠিকানা') || k.includes('address')) return 'address';
    if (k.includes('বকেয়া') || k.includes('বকেয়া') || k.includes('due') || k.includes('balance') || k.includes('পাওনা')) return 'due';
    if (k.includes('স্টক') || k.includes('stock')) return 'stock';
    if (k.includes('ক্যাটাগরি') || k.includes('category')) return 'category';
    if (k.includes('ক্রয়') || k.includes('কেনা') || k.includes('buy') || k.includes('purchase')) return 'purchase_price';
    if (k.includes('বিক্রয়') || k.includes('বিক্রি') || k.includes('sell') || k.includes('sale')) return 'sell_price';
    if (k.includes('ব্র্যান্ড') || k.includes('brand')) return 'brand';
    if (k.includes('টাকা') || k.includes('amount') || k.includes('খরচ')) return 'amount';
    if (k.includes('পদ্ধতি') || k.includes('মাধ্যম') || k.includes('মেথড') || k.includes('method') || k.includes('payment')) return 'payment_method';
    if (k.includes('মন্তব্য') || k.includes('নোট') || k.includes('note') || k.includes('remark')) return 'note';
    if (k.includes('নাম') || k.includes('name') || k.includes('title')) return 'name';
    return k;
  };

  // Bijoy 52 / SutonnyMJ translation mappings (sorted longest phrase first)
  const SUTONNY_WORDS: [string, string][] = [
    // Fresh rod
    ['10 wg: wj †d«m iW', '10 মি.মি ফ্রেশ রড'],
    ['12 wg: wj †d«m iW', '12 মি.মি ফ্রেশ রড'],
    ['16 wg: wj †d«m iW', '16 মি.মি ফ্রেশ রড'],
    ['20 wg: wj †d«m iW', '20 মি.মি ফ্রেশ রড'],
    ['22 wg: wj †d«m iW', '22 মি.মি ফ্রেশ রড'],
    ['25 wg: wj †d«m iW', '25 মি.মি ফ্রেশ রড'],
    ['8 wg: wj †d«m iW', '8 মি.মি ফ্রেশ রড'],

    ['10 wg.wj †d«m iW', '10 মি.মি ফ্রেশ রড'],
    ['12 wg.wj †d«m iW', '12 মি.মি ফ্রেশ রড'],
    ['16 wg.wj †d«m iW', '16 মি.মি ফ্রেশ রড'],
    ['20 wg.wj †d«m iW', '20 মি.মি ফ্রেশ রড'],
    ['8 wg.wj †d«m iW', '8 মি.মি ফ্রেশ রড'],

    // SCRM rod
    ['10 wg: wj Gm wm Avi Gg iW', '10 মি.মি এসসিআরএম রড'],
    ['12 wg: wj Gm wm Avi Gg iW', '12 মি.মি এসসিআরএম রড'],
    ['16 wg: wj Gm wm Avi Gg iW', '16 মি.মি এসসিআরএম রড'],
    ['20 wg: wj Gm wm Avi Gg iW', '20 মি.মি এসসিআরএম রড'],
    ['22 wg: wj Gm wm Avi Gg iW', '22 মি.মি এসসিআরএম রড'],
    ['25 wg: wj Gm wm Avi Gg iW', '25 মি.মি এসসিআরএম রড'],
    ['8 wg: wj Gm wm Avi Gg iW', '8 মি.মি এসসিআরএম রড'],

    ['10 wg.wj Gm wm Avi Gg', '10 মি.মি এসসিআরএম রড'],
    ['12 wg.wj Gm wm Avi Gg', '12 মি.মি এসসিআরএম রড'],
    ['16 wg.wj Gm wm Avi Gg', '16 মি.মি এসসিআরএম রড'],
    ['20 wg.wj Gm wm Avi Gg', '20 মি.মি এসসিআরএম রড'],
    ['22 wg.wj Gm wm Avi Gg', '22 মি.মি এসসিআরএম রড'],
    ['25 wg.wj Gm wm Avi Gg', '25 মি.মি এসসিআরএম রড'],
    ['8 wg.wj Gm wm Avi Gg', '8 মি.মি এসসিআরএম রড'],
    ['Gm wm Avi Gg', 'এসসিআরএম রড'],

    // BSRM rod
    ['10 wg: wj we Gm Avi Gg iW', '10 মি.মি বিএসআরএম রড'],
    ['12 wg: wj we Gm Avi Gg iW', '12 মি.মি বিএসআরএম রড'],
    ['16 wg: wj we Gm Avi Gg iW', '16 মি.মি বিএসআরএম রড'],
    ['20 wg: wj we Gm Avi Gg iW', '20 মি.মি বিএসআরএম রড'],
    ['8 wg: wj we Gm Avi Gg iW', '8 মি.মি বিএসআরএম রড'],

    ['10 wg: wj G Gm Avi Gg iW', '10 মি.মি বিএসআরএম রড'],
    ['12 wg: wj G Gm Avi Gg iW', '12 মি.মি বিএসআরএম রড'],
    ['16 wg: wj G Gm Avi Gg iW', '16 মি.মি বিএসআরএম রড'],
    ['20 wg: wj G Gm Avi Gg iW', '20 মি.মি বিএসআরএম রড'],
    ['8 wg: wj G Gm Avi Gg iW', '8 মি.মি বিএসআরএম রড'],

    ['10 wg.wj we Gm Avi Gg', '10 মি.মি বিএসআরএম রড'],
    ['12 wg.wj we Gm Avi Gg', '12 মি.মি বিএসআরএম রড'],
    ['16 wg.wj we Gm Avi Gg', '16 মি.মি বিএসআরএম রড'],
    ['20 wg.wj we Gm Avi Gg', '20 মি.মি বিএসআরএম রড'],
    ['22 wg.wj we Gm Avi Gg', '22 মি.মি বিএসআরএম রড'],
    ['25 wg.wj we Gm Avi Gg', '25 মি.মি বিএসআরএম রড'],
    ['8 wg.wj we Gm Avi Gg', '8 মি.মি বিএসআরএম রড'],
    ['we Gm Avi Gg', 'বিএসআরএম রড'],

    // KSML rod
    ['16 wg: wj ‡K Gm Gg Gj iW', '16 মি.মি কেএসএমএল রড'],
    ['10 wg: wj ‡K Gm Gg Gj iW', '10 মি.মি কেএসএমএল রড'],
    ['12 wg: wj ‡K Gm Gg Gj iW', '12 মি.মি কেএসএমএল রড'],
    ['20 wg: wj ‡K Gm Gg Gj iW', '20 মি.মি কেএসএমএল রড'],
    ['8 wg: wj ‡K Gm Gg Gj iW', '8 মি.মি কেএসএমএল রড'],

    // Anwar / AKS rod
    ['10 wg: wj Av‡bvqvi iW', '10 মি.মি আনোয়ার রড'],
    ['12 wg: wj Av‡bvqvi iW', '12 মি.মি আনোয়ার রড'],
    ['16 wg: wj Av‡bvqvi iW', '16 মি.মি আনোয়ার রড'],
    ['10 wg: wj G‡KGm iW', '10 মি.মি একেএস রড'],
    ['12 wg: wj G‡KGm iW', '12 মি.মি একেএস রড'],
    ['16 wg: wj G‡KGm iW', '16 মি.মি একেএস রড'],

    // Cement
    ['G¨vsKi wm‡g›U', 'অ্যাংকর সিমেন্ট'],
    ['wm‡g›U G¨vsKi Avc', 'অ্যাংকর সিমেন্ট'],
    ['wm‡g›U G¨vsKi', 'অ্যাংকর সিমেন্ট'],
    ['G¨vsKi Avc', 'অ্যাংকর সিমেন্ট'],
    ['G¨vsKi', 'অ্যাংকর সিমেন্ট'],
    ['wm‡g›U †nvjwmg', 'হোলসিম সিমেন্ট'],
    ['†nvjwmg wm‡g›U', 'হোলসিম সিমেন্ট'],
    ['†nvjwmg', 'হোলসিম সিমেন্ট'],
    ['wm‡g›U', 'সিমেন্ট'],
    ['‡kL wm‡g›U', 'শেখ সিমেন্ট'],
    ['kvn wm‡g›U', 'শাহ সিমেন্ট'],
    ['AvwKR wm‡g›U', 'আকিজ সিমেন্ট'],
    ['µvDb wm‡g›U', 'ক্রাউন সিমেন্ট'],
    ['†m‡fb wis wm‡g›U', 'সেভেন রিংস সিমেন্ট'],

    // Charges
    ['‡jevwi', 'লেবার বিল'],
    ['‡jevix', 'লেবার বিল'],
    ['fvov', 'ভাড়া'],

    // Customer & Addresses
    ['bRiæj Bmjvg', 'নজরুল ইসলাম'],
    ['bweb evM', 'নবীন বাগ'],
    ['mvBdzj Bmjvg', 'সাইফুল ইসলাম'],
    ['mvw`Kzj Bmjvg', 'সাদিকুল ইসলাম'],
    ['wgqvevwo', 'মিয়াবাড়ি'],
    ['gyb G›UvicÖvBR', 'মুন এন্টারপ্রাইজ'],
    ['cvPzwiqv', 'পাঁচুরিয়া'],
    ['Pi gvwbK`v', 'চর মানিকদা'],
    ['Ry‡qj †kL', 'জুয়েল শেখ'],
    ['‡fv‡Rvi MvwZ', 'ভোজের গাতি'],
    ['iv‡mj Avjg', 'রাসেল আলম'],
    ['Bgb gvgv', 'ইমন মামা'],
    ['‡nKgZ fvB', 'হেকমত ভাই'],

    // Common column labels
    ['‡µZv', 'ক্রেতা'],
    ['wVKvbv', 'ঠিকানা'],
    ['ZvwiL', 'তারিখ'],
    ['weeib', 'বিবরণ'],
    ['cwigvb', 'পরিমাণ'],
    ['Rgv', 'জমা'],
    ['UvKv', 'টাকা'],
    ['evKx', 'বাকী'],
    ['‡gvU', 'মোট'],
    ['K_vq', 'কথায়'],
    ['`i', 'দর']
  ];

  // Sort descending by length so compound phrases replace before single words
  SUTONNY_WORDS.sort((a, b) => b[0].length - a[0].length);

  const cleanSutonny = (txt: any): string => {
    if (txt === null || txt === undefined) return '';
    let str = String(txt).trim();
    for (const [k, v] of SUTONNY_WORDS) {
      if (str.includes(k)) {
        str = str.split(k).join(v);
      }
    }
    // Clean residual Bijoy tokens & apply universal legacy cleaner
    str = str.split('iW').join('রড');
    str = str.split('†d«m').join('ফ্রেশ');
    str = str.split('wg: wj').join('মি.মি');
    str = str.split('wg.wj').join('মি.মি');
    str = str.split('G¨vsKi').join('অ্যাংকর');
    return cleanLegacyBengaliText(str);
  };

  const serialToDateString = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'number') {
      const utcDays = val - 25569;
      const utcValue = utcDays * 86400;
      const dateObj = new Date(utcValue * 1000);
      return dateObj.toISOString().split('T')[0];
    }
    const str = String(val).trim();
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;
    return str;
  };

  // 2. Parse Uploaded File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      let validItems: any[] = [];

      if (activeType === 'customer_ledger') {
        // Use 2D array parsing to handle custom headers, titles, and SutonnyMJ formats
        const sheetRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (sheetRows.length === 0) {
          toast.error('নির্বাচিত ফাইলে কোনো ডাটা পাওয়া যায়নি');
          setIsProcessing(false);
          return;
        }

        let headerRowIdx = -1;
        const colMap = { date: 0, desc: 1, qty: 2, rate: 3, credit: 4, debit: 5, invoice_no: -1, customer: -1 };
        let detectedCustomer = preselectedParty?.name || '';
        let detectedPhone = preselectedParty?.phone || '';

        // Search top 15 rows for header and customer metadata
        for (let i = 0; i < Math.min(sheetRows.length, 15); i++) {
          const row = sheetRows[i];
          const rowStr = row.map((c) => cleanSutonny(c)).join(' ').toLowerCase();

          for (let j = 0; j < row.length; j++) {
            const cellClean = cleanSutonny(row[j]);
            if (cellClean.includes('ক্রেতা') && row[j + 1]) {
              const cust = cleanSutonny(row[j + 1]);
              if (cust && !preselectedParty) detectedCustomer = cust;
            }
          }

          if (
            (rowStr.includes('তারিখ') || rowStr.includes('date') || rowStr.includes('zvwil')) &&
            (rowStr.includes('বিবরণ') || rowStr.includes('weeib') || rowStr.includes('particular') || rowStr.includes('desc'))
          ) {
            headerRowIdx = i;
            row.forEach((col, idx) => {
              const c = cleanSutonny(col).toLowerCase();
              if (c.includes('তারিখ') || c.includes('date') || c.includes('zvwil')) colMap.date = idx;
              else if (c.includes('বিবরণ') || c.includes('weeib') || c.includes('particular') || c.includes('desc')) colMap.desc = idx;
              else if (c.includes('পরিমাণ') || c.includes('cwigvb') || c.includes('qty') || c.includes('quantity')) colMap.qty = idx;
              else if (c.includes('দর') || c.includes('`i') || c.includes('rate') || c.includes('price')) colMap.rate = idx;
              else if (c.includes('জমা') || c.includes('rgv') || c.includes('credit') || c.includes('পরিশোধ')) colMap.credit = idx;
              else if (c.includes('টাকা') || c.includes('uvkv') || c.includes('debit') || c.includes('বিল')) colMap.debit = idx;
              else if (c.includes('চালান') || c.includes('ভাউচার') || c.includes('invoice') || c.includes('voucher')) colMap.invoice_no = idx;
              else if (c.includes('কাস্টমার') || c.includes('customer') || c.includes('নাম')) colMap.customer = idx;
            });
            break;
          }
        }

        const startIdx = headerRowIdx >= 0 ? headerRowIdx + 1 : 1;
        let lastSeenDate = new Date().toISOString().split('T')[0];

        for (let i = startIdx; i < sheetRows.length; i++) {
          const row = sheetRows[i];
          const rowText = row.map((c) => cleanSutonny(c)).join(' ').trim();
          if (!rowText) continue;

          // Skip footer summary rows (মোট, বাকী, কথায়)
          if (
            rowText.includes('মোট') ||
            rowText.includes('বাকী') ||
            rowText.includes('কথায়') ||
            rowText.includes('‡gvU') ||
            rowText.includes('evKx') ||
            rowText.includes('K_vq')
          ) {
            continue;
          }

          let rawDesc = colMap.desc >= 0 ? row[colMap.desc] : '';
          let desc = cleanSutonny(rawDesc);
          let rawCredit = colMap.credit >= 0 ? row[colMap.credit] : 0;
          let rawDebit = colMap.debit >= 0 ? row[colMap.debit] : 0;
          let rawQty = colMap.qty >= 0 ? row[colMap.qty] : 0;
          let rawRate = colMap.rate >= 0 ? row[colMap.rate] : 0;

          let credit = parseFloat(toEnglishDigits(String(rawCredit)).replace(/[^0-9.-]+/g, '')) || 0;
          let debit = parseFloat(toEnglishDigits(String(rawDebit)).replace(/[^0-9.-]+/g, '')) || 0;
          let qty = parseFloat(toEnglishDigits(String(rawQty)).replace(/[^0-9.-]+/g, '')) || 0;
          let rate = parseFloat(toEnglishDigits(String(rawRate)).replace(/[^0-9.-]+/g, '')) || 0;

          // Blank footer row check: no description, no date, no qty/rate
          const rawDate = colMap.date >= 0 ? row[colMap.date] : null;
          if (!desc && !rawDate && qty === 0 && rate === 0) {
            continue;
          }

          const parsedDate = serialToDateString(rawDate);
          if (parsedDate) lastSeenDate = parsedDate;

          // If description mentions जमा and debit has value, move it to credit
          if ((desc.includes('জমা') || desc.includes('পরিশোধ') || desc.includes('Rgv')) && debit > 0 && credit === 0) {
            credit = debit;
            debit = 0;
          }

          if (debit === 0 && credit === 0) {
            continue;
          }

          let custName = preselectedParty?.name || detectedCustomer;
          if (colMap.customer >= 0 && row[colMap.customer]) {
            custName = cleanSutonny(row[colMap.customer]);
          }

          const invNo = colMap.invoice_no >= 0 ? cleanSutonny(row[colMap.invoice_no]) : '';

          validItems.push({
            party_id: preselectedParty?.id,
            name: custName,
            phone: preselectedParty?.phone || detectedPhone,
            date: lastSeenDate,
            invoice_no: invNo,
            description: desc || (debit > 0 ? 'পণ্য বিক্রয়' : 'নগদ জমা'),
            quantity: qty > 0 ? qty : 1,
            rate: rate,
            unit: 'টি',
            debit: debit,
            credit: credit,
            payment_method: 'নগদ',
            note: ''
          });
        }
      } else {
        // Standard JSON parsing for customers, suppliers, products, expenses
        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
        if (rawJson.length === 0) {
          toast.error('নির্বাচিত ফাইলে কোনো ডাটা পাওয়া যায়নি');
          setIsProcessing(false);
          return;
        }

        const formatted = rawJson.map((row) => {
          const item: any = {};
          for (const [key, val] of Object.entries(row)) {
            const normKey = normalizeKey(key);
            item[normKey] = typeof val === 'string' ? val.trim() : val;
          }

          if (activeType === 'customers' || activeType === 'suppliers') {
            const rawDue = item.due !== undefined && item.due !== '' ? item.due : (item.amount !== undefined && item.amount !== '' ? item.amount : 0);
            const dueEn = toEnglishDigits(String(rawDue)).replace(/[^0-9.-]+/g, '');
            const due = parseFloat(dueEn) || 0;
            const phoneEn = toEnglishDigits(item.phone ? String(item.phone) : '').replace(/[^0-9]/g, '');
            return {
              name: item.name || '',
              phone: phoneEn,
              business_name: item.business_name || '',
              address: item.address || '',
              opening_balance: due,
              total_due: due,
              party_type: activeType === 'suppliers' ? 'supplier' : 'customer'
            };
          } else if (activeType === 'products') {
            const stock = parseFloat(toEnglishDigits(String(item.stock || 0)).replace(/[^0-9.-]+/g, '')) || 0;
            const purchase_price = parseFloat(toEnglishDigits(String(item.purchase_price || 0)).replace(/[^0-9.-]+/g, '')) || 0;
            const sell_price = parseFloat(toEnglishDigits(String(item.sell_price || 0)).replace(/[^0-9.-]+/g, '')) || 0;
            return {
              name: item.name || '',
              category_name: item.category || 'সাধারণ পণ্য',
              unit: item.unit || 'পিস',
              stock,
              purchase_price,
              sell_price,
              brand: item.brand || ''
            };
          } else if (activeType === 'expenses') {
            const amount = parseFloat(toEnglishDigits(String(item.amount || 0)).replace(/[^0-9.-]+/g, '')) || 0;
            return {
              title: item.name || item.title || 'সাধারণ খরচ',
              category_name: item.category || 'সাধারণ খরচ',
              amount,
              date: item.date || new Date().toISOString().split('T')[0],
              payment_method: item.payment_method || 'ক্যাশ'
            };
          }
          return item;
        });

        validItems = formatted.filter((item) => 
          item.name || item.title || item.description || (item.debit && item.debit > 0) || (item.credit && item.credit > 0)
        );
      }

      setParsedRows(validItems);
      setPreviewData(validItems.slice(0, 15)); // First 15 for preview
      toast.success(`${toBengaliDigits(validItems.length)} টি রো সফলভাবে লোড হয়েছে`);
    } catch (err) {
      console.error('File parsing error:', err);
      toast.error('ফাইলটি পড়তে সমস্যা হয়েছে। এক্সেল ফরম্যাটটি সঠিক আছে কিনা যাচাই করুন।');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Submit Data to Backend
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      toast.error('ইমপোর্ট করার জন্য কোনো ডাটা নেই');
      return;
    }

    try {
      setIsSubmitting(true);

      if (activeType === 'customers' || activeType === 'suppliers') {
        const res = await api.parties.bulkImport(parsedRows);
        toast.success(
          `ইমপোর্ট সফল! তৈরি: ${toBengaliDigits(res.created_count)}, আপডেট: ${toBengaliDigits(res.updated_count)}`
        );
      } else if (activeType === 'products') {
        const res = await api.inventory.bulkImport(parsedRows);
        toast.success(
          `পণ্য ইমপোর্ট সফল! নতুন: ${toBengaliDigits(res.created_count)}, আপডেট: ${toBengaliDigits(res.updated_count)}`
        );
      } else if (activeType === 'expenses') {
        const res = await api.expenses.bulkImport(parsedRows);
        toast.success(`খরচ ইমপোর্ট সফল! মোট: ${toBengaliDigits(res.created_count)} টি রেকর্ড সংরক্ষিত`);
      } else if (activeType === 'customer_ledger') {
        const res = await api.parties.bulkImportLedger({
          party_id: preselectedParty?.id,
          clear_existing: clearExisting,
          group_by_date: groupByDate,
          entries: parsedRows
        });
        if (res.errors && res.errors.length > 0) {
          toast.warning(`কিছু রো ইমপোর্ট হতে সমস্যা হয়েছে (${toBengaliDigits(res.errors.length)} টি ত্রুটি)`);
        }
        toast.success(
          `লেজার এন্ট্রি ইমপোর্ট সফল! মোট ${toBengaliDigits(res.created_count)} টি রেকর্ড খতিয়ানে যুক্ত হয়েছে।`
        );
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Import execution error:', err);
      toast.error(err?.message || 'ইমপোর্ট করার সময় সার্ভারে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  এক্সেল / CSV ডাটা ও পূর্বের হিসাব ইমপোর্ট
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  আগের খাতা বা অন্য সফটওয়্যার থেকে গ্রাহক, বকেয়া, পণ্য ও খরচের রেকর্ড এক ক্লিকে ইমপোর্ট করুন
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Preselected Party Notice */}
          {preselectedParty && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="text-xs font-bold text-emerald-950">নির্দিষ্ট কাস্টমার: {preselectedParty.name}</span>
                  {preselectedParty.phone && (
                    <span className="text-[11px] text-emerald-700 ml-1.5 font-mono">({preselectedParty.phone})</span>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                />
                <span className="text-[11px] font-medium text-slate-600">আগের আপলোড করা লেজার মুছে নতুন করে দিন</span>
              </label>
            </div>
          )}

          {/* Zero Impact Guarantee & Options Banner for Customer Ledger */}
          {activeType === 'customer_ledger' && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 space-y-2.5 text-xs text-amber-900">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">সফটওয়্যারের জন্য শতভাগ নিরাপদ (Zero-Impact Guarantee):</p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    পূর্বের খতিয়ান ইমপোর্ট করার কারণে দোকানের বর্তমান ইনভেন্টরি স্টক (Stock), ক্যাশ ড্রয়ার বা লাইভ ব্যাংক অ্যাকাউন্ট থেকে কোনো ব্যালেন্স কাটা হবে না। এটি শুধুমাত্র গ্রাহকের পূর্বের হিসাব ও খতিয়ানের বিবরণী হিসেবে নিরাপদে সেভ হবে।
                  </p>
                </div>
              </div>

              {/* Group by Date Option */}
              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between flex-wrap gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={groupByDate}
                    onChange={(e) => setGroupByDate(e.target.checked)}
                    className="rounded border-amber-400 text-orange-600 focus:ring-orange-500 w-4 h-4"
                  />
                  <span className="font-bold text-amber-950 text-xs">
                    একই তারিখের একাধিক পণ্য একটি চালানে (Single Invoice) একত্র করুন
                  </span>
                </label>
                <span className="text-[11px] text-amber-700 font-medium">
                  {groupByDate ? '✅ একই তারিখের সব পণ্য ১টি ভাউচারে তৈরি হবে' : '❌ প্রতিটি লাইনের জন্য আলাদা আলাদা ভাউচার তৈরি হবে'}
                </span>
              </div>
            </div>
          )}

          {/* Step 1: Select Type */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              ১. কী ধরনের ডাটা ইমপোর্ট করতে চান তা নির্বাচন করুন:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {[
                { id: 'customer_ledger' as ImportType, label: 'কাস্টমার লেজার', icon: FileText, desc: 'পূর্বের চালান ও জমার খতিয়ান' },
                { id: 'customers' as ImportType, label: 'গ্রাহক ও বকেয়া', icon: Users, desc: 'কাস্টমার ও প্রারম্ভিক বাকি' },
                { id: 'products' as ImportType, label: 'পণ্য ও স্টক', icon: Package, desc: 'আইটেম, মূল্য ও মজুদ' },
                { id: 'suppliers' as ImportType, label: 'সাপ্লায়ার পাওনা', icon: Truck, desc: 'মহাজনদের আগের পাওনা' },
                { id: 'expenses' as ImportType, label: 'পূর্ববর্তী খরচ', icon: Receipt, desc: 'বিগত তারিখের খরচের তালিকা' }
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeType === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTypeChange(tab.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/50 shadow-sm ring-1 ring-orange-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-orange-600' : 'text-slate-500'}`} />
                      <span className={`text-xs font-bold ${isSelected ? 'text-orange-900' : 'text-slate-800'}`}>
                        {tab.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{tab.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Download Template & Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Download Template Card */}
            <Card className="p-4 border border-slate-200 bg-slate-50/50 flex flex-col justify-between shadow-none">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>নমুনা এক্সেল ফাইল ডাউনলোড করুন</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  কলামগুলোর সঠিক নাম ও ফরম্যাট পেতে প্রথমে নমুনা ফাইলটি ডাউনলোড করে নিন। সেই ফাইলে আপনার তথ্য পেস্ট করুন।
                </p>
              </div>
              <div className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="w-full bg-white hover:bg-slate-100 text-xs font-bold border-slate-300 text-slate-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  নমুনা টেমপ্লেট ডাউনলোড (.xlsx)
                </Button>
              </div>
            </Card>

            {/* Upload Area */}
            <Card className="p-4 border-2 border-dashed border-slate-200 hover:border-orange-400 bg-white transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative shadow-none">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-8 h-8 text-orange-500 mb-1.5" />
              <p className="text-xs font-bold text-slate-800">
                {file ? file.name : 'ফাইল আপলোড করতে ক্লিক করুন বা ড্র্যাগ করুন'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                সমর্থিত ফরম্যাট: .xlsx, .xls অথবা .csv
              </p>
            </Card>
          </div>

          {/* Step 3: Data Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    ডাটা প্রিভিউ (মোট {toBengaliDigits(parsedRows.length)} টি রো লোড হয়েছে)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  প্রথম ১৫টি রো প্রদর্শিত হচ্ছে
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs font-bold w-10">#</TableHead>
                      {activeType === 'customer_ledger' ? (
                        <>
                          <TableHead className="text-xs font-bold">তারিখ</TableHead>
                          <TableHead className="text-xs font-bold">কাস্টমার</TableHead>
                          <TableHead className="text-xs font-bold">চালান/ভাউচার নং</TableHead>
                          <TableHead className="text-xs font-bold">বিবরণ / পণ্য</TableHead>
                          <TableHead className="text-xs font-bold text-right">পরিমাণ</TableHead>
                          <TableHead className="text-xs font-bold text-right">দর</TableHead>
                          <TableHead className="text-xs font-bold text-right">ডেবিট (বিক্রয়)</TableHead>
                          <TableHead className="text-xs font-bold text-right">ক্রেডিট (জমা)</TableHead>
                        </>
                      ) : activeType === 'customers' || activeType === 'suppliers' ? (
                        <>
                          <TableHead className="text-xs font-bold">নাম / বিবরণ</TableHead>
                          <TableHead className="text-xs font-bold">মোবাইল</TableHead>
                          <TableHead className="text-xs font-bold">প্রতিষ্ঠান</TableHead>
                          <TableHead className="text-xs font-bold text-right">পূর্বের বকেয়া/পাওনা</TableHead>
                        </>
                      ) : activeType === 'products' ? (
                        <>
                          <TableHead className="text-xs font-bold">নাম / বিবরণ</TableHead>
                          <TableHead className="text-xs font-bold">ক্যাটাগরি</TableHead>
                          <TableHead className="text-xs font-bold text-right">মজুদ (Stock)</TableHead>
                          <TableHead className="text-xs font-bold text-right">ক্রয়মূল্য</TableHead>
                          <TableHead className="text-xs font-bold text-right">বিক্রয়মূল্য</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-xs font-bold">নাম / বিবরণ</TableHead>
                          <TableHead className="text-xs font-bold">ক্যাটাগরি</TableHead>
                          <TableHead className="text-xs font-bold">তারিখ</TableHead>
                          <TableHead className="text-xs font-bold text-right">টাকা</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/70 text-xs">
                        <TableCell className="font-mono text-slate-400">{idx + 1}</TableCell>
                        {activeType === 'customer_ledger' ? (
                          <>
                            <TableCell className="font-mono text-slate-600 whitespace-nowrap">{row.date}</TableCell>
                            <TableCell className="font-medium text-slate-800">{row.name || (row.phone ? row.phone : '—')}</TableCell>
                            <TableCell className="font-mono text-slate-600">{row.invoice_no || '—'}</TableCell>
                            <TableCell className="text-slate-800">{row.description}</TableCell>
                            <TableCell className="text-right text-slate-600">
                              {row.quantity > 0 ? `${toBengaliDigits(row.quantity)} ${row.unit || ''}` : '—'}
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              {row.rate > 0 ? `৳${toBengaliDigits(row.rate)}` : '—'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900">
                              {row.debit > 0 ? `৳${toBengaliDigits(row.debit.toLocaleString('en-IN'))}` : '—'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">
                              {row.credit > 0 ? `৳${toBengaliDigits(row.credit.toLocaleString('en-IN'))}` : '—'}
                            </TableCell>
                          </>
                        ) : activeType === 'customers' || activeType === 'suppliers' ? (
                          <>
                            <TableCell className="font-medium text-slate-900">{row.name}</TableCell>
                            <TableCell className="font-mono text-slate-600">{row.phone || '—'}</TableCell>
                            <TableCell className="text-slate-600">{row.business_name || '—'}</TableCell>
                            <TableCell className="text-right font-bold text-orange-600">
                              ৳{toBengaliDigits(row.total_due?.toLocaleString('en-IN') || '০')}
                            </TableCell>
                          </>
                        ) : activeType === 'products' ? (
                          <>
                            <TableCell className="font-medium text-slate-900">{row.name}</TableCell>
                            <TableCell className="text-slate-600">{row.category_name}</TableCell>
                            <TableCell className="text-right font-bold text-slate-800">
                              {toBengaliDigits(row.stock)} {row.unit}
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              ৳{toBengaliDigits(row.purchase_price)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">
                              ৳{toBengaliDigits(row.sell_price)}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium text-slate-900">{row.title}</TableCell>
                            <TableCell className="text-slate-600">{row.category_name}</TableCell>
                            <TableCell className="font-mono text-slate-600">{row.date}</TableCell>
                            <TableCell className="text-right font-bold text-rose-600">
                              ৳{toBengaliDigits(row.amount?.toLocaleString('en-IN') || '০')}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            বাতিল
          </Button>

          <div className="flex items-center gap-2">
            {parsedRows.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setParsedRows([]);
                  setPreviewData([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={isSubmitting}
                className="text-xs"
              >
                রিসেট
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleExecuteImport}
              disabled={parsedRows.length === 0 || isSubmitting || isProcessing}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ইমপোর্ট হচ্ছে...
                </>
              ) : (
                <>
                  <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                  ইমপোর্ট সম্পন্ন করুন ({toBengaliDigits(parsedRows.length)})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
