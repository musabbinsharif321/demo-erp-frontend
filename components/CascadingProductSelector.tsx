'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { toast } from 'sonner';
import { toBengaliDigits, toEnglishDigits, formatProductName } from '@/lib/bengaliUtils';

export interface ProductInventoryItem {
  id: string;
  name: string;
  sellPrice: number;
  buyPrice?: number;
  stock: number;
  unit: string;
  category?: string;
  brand?: string;
  code?: string;
  alertThreshold?: number;
}

export interface SelectedProductDetails {
  productId?: string;
  name: string;
  category: 'রড' | 'সিমেন্ট' | 'রিং' | 'অন্যান্য';
  mmSize?: string;
  brand?: string;
  cementType?: 'OPC' | 'PCC' | '';
  variant?: string;
  price: number;
  sellPrice?: number;
  unit: string;
  stock: number;
}


interface CascadingProductSelectorProps {
  products: ProductInventoryItem[];
  onProductChange: (selection: SelectedProductDetails | null) => void;
  showPriceField: boolean; // true for Invoice/Purchase, false for Order
  onlyInStock?: boolean; // true for Invoice/Order (Sales), false for Purchase
  autoLoadPrice?: boolean; // false by default: user manually enters unit price
  priceLabel?: string;
  itemPrice: number;
  onPriceChange: (price: number) => void;
  
  showTotalPriceField?: boolean; // true for Purchase Invoice
  itemTotalPrice?: number;
  onTotalPriceChange?: (total: number) => void;

  showSellPriceField?: boolean; // true for Purchase Invoice
  itemSellPrice?: number;
  onSellPriceChange?: (price: number) => void;
  
  showAlertLimitField?: boolean; // true for Purchase Invoice
  itemAlertLimit?: number;
  onAlertLimitChange?: (limit: number) => void;

  itemQty: number;
  onQtyChange: (qty: number) => void;
  onAddCartItem: () => void;
  itemUnit?: string;
  onUnitChange?: (unit: string) => void;
  buttonLabel?: string;
  className?: string;
  purchaseType?: 'rod' | 'cement';
  allowedCategories?: ('রড' | 'সিমেন্ট' | 'রিং' | 'অন্যান্য')[];
}

const ROD_MM_OPTIONS = [
  '৮ মিলি',
  '১০ মিলি',
  '১২ মিলি',
  '১৬ মিলি',
  '২০ মিলি',
  '২২ মিলি',
  '২৫ মিলি',
  '৩২ মিলি',
];

const ROD_BRAND_OPTIONS = [
  'BSRM',
  'SCRM',
  'SCRM TMX',
  'KSML',
  'HKG',
  'DSRM',
];

const CEMENT_BRAND_OPTIONS = [
  'Holcim Strong structure',
  'Holcim Supercrete',
  'Holcim Supercrete Plus',
  'Holcim Coastal Guard',
  'Holcim Waterprotect',
  'King Brand',
  'Aman',
];

const RING_SIZE_OPTIONS = [
  '3-3',
  '3-4',
  '3-7',
  '7-7',
  '7-9',
  'Pistol ring',
];

const RING_BRAND_OPTIONS = [
  '৮ মিলি রিং',
  '১০ মিলি রিং',
  'সাইট মেইড',
];

export function CascadingProductSelector({
  products,
  onProductChange,
  showPriceField,
  onlyInStock = false,
  autoLoadPrice = false,
  priceLabel = 'একক মূল্য (৳)',
  itemPrice,
  onPriceChange,
  showTotalPriceField = false,
  itemTotalPrice,
  onTotalPriceChange,
  showSellPriceField = false,
  itemSellPrice = 0,
  onSellPriceChange,
  showAlertLimitField = false,
  itemAlertLimit = 0,
  onAlertLimitChange,
  itemQty,
  onQtyChange,
  onAddCartItem,
  itemUnit,
  onUnitChange,
  buttonLabel = '+ যোগ করুন',
  className,
  purchaseType,
  allowedCategories,
}: CascadingProductSelectorProps) {
  const isPurchaseMode = showTotalPriceField || showSellPriceField || !!purchaseType;
  const [enteredTotal, setEnteredTotal] = useState<number | ''>('');

  // Local text states to preserve '.' and trailing decimals while typing
  const [prevItemQty, setPrevItemQty] = useState<number>(itemQty);
  const [qtyInput, setQtyInput] = useState<string>(() => (itemQty ? toBengaliDigits(itemQty) : ''));

  if (itemQty !== prevItemQty) {
    setPrevItemQty(itemQty);
    const currentNum = parseFloat(toEnglishDigits(qtyInput).replace(/[^0-9.]/g, '')) || 0;
    const propNum = Number(itemQty) || 0;
    if (propNum !== currentNum || (propNum === 0 && qtyInput !== '' && qtyInput !== '০')) {
      setQtyInput(itemQty ? toBengaliDigits(itemQty) : '');
    }
  }

  const [prevItemPrice, setPrevItemPrice] = useState<number>(itemPrice);
  const [priceInput, setPriceInput] = useState<string>(() => (itemPrice ? toBengaliDigits(itemPrice) : ''));

  if (itemPrice !== prevItemPrice) {
    setPrevItemPrice(itemPrice);
    const currentNum = parseFloat(toEnglishDigits(priceInput).replace(/[^0-9.]/g, '')) || 0;
    const propNum = Number(itemPrice) || 0;
    if (propNum !== currentNum || (propNum === 0 && priceInput !== '' && priceInput !== '০')) {
      setPriceInput(itemPrice ? toBengaliDigits(itemPrice) : '');
    }
  }

  const [prevEnteredTotal, setPrevEnteredTotal] = useState<number | ''>(enteredTotal);
  const [totalInput, setTotalInput] = useState<string>(() => (enteredTotal !== '' ? toBengaliDigits(enteredTotal) : ''));

  if (enteredTotal !== prevEnteredTotal) {
    setPrevEnteredTotal(enteredTotal);
    const currentNum = parseFloat(toEnglishDigits(totalInput).replace(/[^0-9.]/g, '')) || 0;
    const stateNum = enteredTotal !== '' ? Number(enteredTotal) : 0;
    if (stateNum !== currentNum || (enteredTotal === '' && totalInput !== '')) {
      setTotalInput(enteredTotal !== '' ? toBengaliDigits(enteredTotal) : '');
    }
  }

  const categoriesToDisplay = useMemo<('রড' | 'সিমেন্ট' | 'রিং' | 'অন্যান্য')[]>(() => {
    if (allowedCategories && allowedCategories.length > 0) return allowedCategories;
    if (purchaseType === 'rod') return ['রড', 'রিং'];
    if (purchaseType === 'cement') return ['সিমেন্ট'];
    return ['রড', 'সিমেন্ট', 'রিং', 'অন্যান্য'];
  }, [allowedCategories, purchaseType]);

  const initialCategory = categoriesToDisplay[0] || 'রড';
  const [categoryState, setCategoryState] = useState<'রড' | 'সিমেন্ট' | 'রিং' | 'অন্যান্য'>(initialCategory);

  const category = categoriesToDisplay.includes(categoryState)
    ? categoryState
    : initialCategory;

  const [selectedMm, setSelectedMm] = useState<string>(
    initialCategory === 'রিং' ? '3-3' : initialCategory === 'সিমেন্ট' ? '' : '১০ মিলি'
  );
  const [selectedBrand, setSelectedBrand] = useState<string>(
    initialCategory === 'সিমেন্ট' ? 'Holcim Supercrete' : initialCategory === 'রিং' ? '৮ মিলি রিং' : 'BSRM'
  );
  const [enableCementType, setEnableCementType] = useState<boolean>(true);
  const [cementType, setCementType] = useState<'OPC' | 'PCC'>('PCC');
  const [otherProductId, setOtherProductId] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');

  // Products with positive stock
  const inStockProducts = useMemo(() => {
    return products.filter(p => (p.stock || 0) > 0);
  }, [products]);

  // Dynamically filter Rod Brands
  const availableRodBrands = useMemo(() => {
    if (!onlyInStock) return ROD_BRAND_OPTIONS;
    const rodItems = inStockProducts.filter(p => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return cat === 'রড' || cat.includes('rod') || name.includes('রড') || name.includes('মিলি') || name.includes('mm');
    });

    const sortedRodBrands = [...ROD_BRAND_OPTIONS].sort((a, b) => b.length - a.length);
    const matchedBrands = new Set<string>();

    for (const p of rodItems) {
      const pName = p.name.toLowerCase();
      const pBrand = (p.brand || '').toLowerCase();

      let foundBrand: string | null = null;
      for (const b of sortedRodBrands) {
        const bLower = b.toLowerCase();
        const isBsrm = (bLower === 'bsrm') && (pName.includes('বি এস আর এম') || pName.includes('বিএসআরএম'));
        const isScrm = (bLower === 'scrm') && (pName.includes('এসসিআরএম') || pName.includes('এস সি আর এম'));
        const isKsrm = (bLower === 'ksrm') && (pName.includes('কেএসআরএম') || pName.includes('কে এস আর এম'));
        const isAks = (bLower === 'aks') && (pName.includes('একেএস') || pName.includes('এ কে এস'));
        if (pBrand === bLower || pName.includes(bLower) || isBsrm || isScrm || isKsrm || isAks) {
          foundBrand = b;
          break;
        }
      }

      if (foundBrand) {
        matchedBrands.add(foundBrand);
      } else if (p.brand) {
        matchedBrands.add(p.brand);
      }
    }

    return Array.from(matchedBrands);
  }, [onlyInStock, inStockProducts]);

  // Dynamically filter Rod mm options for selectedBrand
  const availableRodMms = useMemo(() => {
    if (!onlyInStock) return ROD_MM_OPTIONS;
    const rodItems = inStockProducts.filter(p => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return cat === 'রড' || cat.includes('rod') || name.includes('রড') || name.includes('মিলি') || name.includes('mm');
    });

    const filtered = ROD_MM_OPTIONS.filter(mm => {
      const mmNum = mm.replace(/[^0-9]/g, '');
      return rodItems.some(p => {
        const name = p.name.toLowerCase();
        const isBsrmMatch = selectedBrand === 'BSRM' && (name.includes('বি এস আর এম') || name.includes('বিএসআরএম'));
        const isScrmMatch = selectedBrand === 'SCRM' && (name.includes('এসসিআরএম') || name.includes('এস সি আর এম'));
        const matchesBrand = !selectedBrand || name.includes(selectedBrand.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(selectedBrand.toLowerCase())) || isBsrmMatch || isScrmMatch;
        const matchesMm = name.includes(mm.toLowerCase()) || (mmNum ? (name.includes(`${mmNum}mm`) || name.includes(`${mmNum} মিলি`) || name.includes(`${mmNum} মি.লি`) || name.includes(`${mmNum} মি.মি`) || name.includes(`${mmNum}মিমি`)) : false);
        return matchesBrand && matchesMm;
      });
    });
    return filtered;
  }, [onlyInStock, selectedBrand, inStockProducts]);

  // Dynamically filter Cement Brands
  const availableCementBrands = useMemo(() => {
    if (!onlyInStock) return CEMENT_BRAND_OPTIONS;
    const cementItems = inStockProducts.filter(p => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return cat === 'সিমেন্ট' || cat.includes('cement') || name.includes('সিমেন্ট');
    });

    const sortedOptions = [...CEMENT_BRAND_OPTIONS].sort((a, b) => b.length - a.length);
    const matchedBrands = new Set<string>();

    for (const p of cementItems) {
      const pName = p.name.toLowerCase();
      const pBrand = (p.brand || '').toLowerCase();

      let foundBrand: string | null = null;
      for (const b of sortedOptions) {
        const bCore = b.replace('সিমেন্ট', '').trim().toLowerCase();
        if (pBrand === b.toLowerCase() || pBrand === bCore) {
          foundBrand = b;
          break;
        }
        if (pName.includes(bCore)) {
          foundBrand = b;
          break;
        }
      }

      if (foundBrand) {
        matchedBrands.add(foundBrand);
      } else if (p.brand) {
        matchedBrands.add(p.brand);
      }
    }

    return Array.from(matchedBrands);
  }, [onlyInStock, inStockProducts]);

  // Dynamically filter Ring Sizes & Brands
  const availableRingSizes = useMemo(() => {
    if (!onlyInStock) return RING_SIZE_OPTIONS;
    const ringItems = inStockProducts.filter(p => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return cat === 'রিং' || cat.includes('ring') || name.includes('রিং') || name.includes('ring');
    });

    const filtered = RING_SIZE_OPTIONS.filter(sz => {
      return ringItems.some(p => {
        const name = p.name.toLowerCase();
        if (name.includes(sz.toLowerCase())) return true;
        const parts = sz.split('-');
        if (parts.length === 2 && name.includes(parts[0]) && name.includes(parts[1])) return true;
        return false;
      });
    });

    const customSizes = ringItems
      .map(p => p.name)
      .filter((s): s is string => !!s && !filtered.includes(s));

    return Array.from(new Set([...filtered, ...customSizes]));
  }, [onlyInStock, inStockProducts]);

  const availableRingBrands = useMemo(() => {
    if (!onlyInStock) return RING_BRAND_OPTIONS;
    const ringItems = inStockProducts.filter(p => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return cat === 'রিং' || cat.includes('ring') || name.includes('রিং') || name.includes('ring');
    });

    const filtered = RING_BRAND_OPTIONS.filter(b =>
      ringItems.some(p => p.name.toLowerCase().includes(b.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(b.toLowerCase())))
    );
    return filtered;
  }, [onlyInStock, inStockProducts]);

  // Handle Category Switch & defaults
  const handleCategorySelect = useCallback((cat: 'রড' | 'সিমেন্ট' | 'রিং' | 'অন্যান্য') => {
    setCategoryState(cat);
    if (cat === 'রড') {
      const defaultBrand = onlyInStock ? (availableRodBrands[0] || '') : 'BSRM';
      const defaultMm = onlyInStock ? (availableRodMms[0] || '') : '১০ মিলি';
      setSelectedMm(defaultMm);
      setSelectedBrand(defaultBrand);
      if (onUnitChange) onUnitChange('কেজি');
    } else if (cat === 'সিমেন্ট') {
      const defaultBrand = onlyInStock ? (availableCementBrands[0] || '') : 'Holcim Supercrete';
      setSelectedMm('');
      setSelectedBrand(defaultBrand);
      setCementType('PCC');
      if (onUnitChange) onUnitChange('বস্তা');
    } else if (cat === 'রিং') {
      const defaultSz = onlyInStock ? (availableRingSizes[0] || '') : '3-3';
      const defaultBrand = onlyInStock ? (availableRingBrands[0] || '') : '৮ মিলি রিং';
      setSelectedMm(defaultSz);
      setSelectedBrand(defaultBrand);
      if (onUnitChange) onUnitChange('পিস');
    } else {
      setSelectedMm('');
      setSelectedBrand('');
      setOtherProductId('');
      if (onUnitChange) onUnitChange('পিস');
    }
    if (onSellPriceChange) onSellPriceChange(0);
    if (onAlertLimitChange) onAlertLimitChange(0);
  }, [onlyInStock, availableRodBrands, availableRodMms, availableCementBrands, availableRingSizes, availableRingBrands, onUnitChange, onAlertLimitChange, onSellPriceChange]);


  // Derive effective activeBrand and activeMm based on availability
  const activeBrand = useMemo(() => {
    if (onlyInStock) {
      if (category === 'সিমেন্ট') {
        return availableCementBrands.includes(selectedBrand) ? selectedBrand : (availableCementBrands[0] || '');
      } else if (category === 'রড') {
        return availableRodBrands.includes(selectedBrand) ? selectedBrand : (availableRodBrands[0] || '');
      } else if (category === 'রিং') {
        return availableRingBrands.includes(selectedBrand) ? selectedBrand : (availableRingBrands[0] || '');
      }
    }
    if (category === 'সিমেন্ট') {
      if (!availableCementBrands.includes(selectedBrand)) {
        return availableCementBrands[0] || 'Holcim Supercrete';
      }
    } else if (category === 'রড') {
      if (!availableRodBrands.includes(selectedBrand)) {
        return availableRodBrands[0] || 'BSRM';
      }
    } else if (category === 'রিং') {
      if (!availableRingBrands.includes(selectedBrand)) {
        return availableRingBrands[0] || '৮ মিলি রিং';
      }
    }
    return selectedBrand;
  }, [onlyInStock, category, availableRodBrands, availableCementBrands, availableRingBrands, selectedBrand]);

  const activeMm = useMemo(() => {
    if (onlyInStock) {
      if (category === 'রড') {
        return availableRodMms.includes(selectedMm) ? selectedMm : (availableRodMms[0] || '');
      }
      if (category === 'রিং') {
        return availableRingSizes.includes(selectedMm) ? selectedMm : (availableRingSizes[0] || '');
      }
    }
    return selectedMm;
  }, [onlyInStock, category, availableRodMms, availableRingSizes, selectedMm]);

  // Cement type availability for activeBrand
  const cementTypeAvailability = useMemo(() => {
    if (category !== 'সিমেন্ট') {
      return { hasOpc: false, hasPcc: false, hasPlain: false };
    }
    if (!onlyInStock) {
      return { hasOpc: true, hasPcc: true, hasPlain: true };
    }
    if (!activeBrand) {
      return { hasOpc: false, hasPcc: false, hasPlain: false };
    }

    const bCore = activeBrand.replace('সিমেন্ট', '').trim().toLowerCase();

    // Match in-stock products for this brand
    const brandProducts = inStockProducts.filter(p => {
      const cat = (p.category || '').toLowerCase();
      const pName = p.name.toLowerCase();
      const pBrand = (p.brand || '').toLowerCase();
      const isCement = cat === 'সিমেন্ট' || cat.includes('cement') || pName.includes('সিমেন্ট');
      if (!isCement) return false;

      if (pBrand === activeBrand.toLowerCase() || pBrand === bCore) return true;
      if (pName.includes(bCore)) {
        // Prevent matching if a longer brand option matches
        const longerOption = CEMENT_BRAND_OPTIONS.find(opt => {
          const optCore = opt.replace('সিমেন্ট', '').trim().toLowerCase();
          return optCore.length > bCore.length && optCore.includes(bCore) && pName.includes(optCore);
        });
        if (longerOption) return false;
        return true;
      }
      return false;
    });

    const hasOpc = brandProducts.some(p => p.name.toLowerCase().includes('opc') && (p.stock || 0) > 0);
    const hasPcc = brandProducts.some(p => p.name.toLowerCase().includes('pcc') && (p.stock || 0) > 0);
    const hasPlain = brandProducts.some(p => !p.name.toLowerCase().includes('opc') && !p.name.toLowerCase().includes('pcc') && (p.stock || 0) > 0);

    return {
      hasOpc,
      hasPcc,
      hasPlain,
    };
  }, [category, onlyInStock, activeBrand, inStockProducts]);

  const canToggleCementType = useMemo(() => {
    if (!onlyInStock) return true;
    const { hasOpc, hasPcc, hasPlain } = cementTypeAvailability;
    // If only plain exists (no OPC and no PCC), cannot turn ON
    if (hasPlain && !hasOpc && !hasPcc) return false;
    // If only OPC/PCC exists (no plain), cannot turn OFF
    if (!hasPlain && (hasOpc || hasPcc)) return false;
    return true;
  }, [onlyInStock, cementTypeAvailability]);

  // Cement type is always enabled for cement with PCC as default unless switched to OPC
  const effectiveEnableCementType = category === 'সিমেন্ট';
  const effectiveCementType: 'OPC' | 'PCC' = cementType || 'PCC';

  // Derive constructed product name & match inventory product
  const matchedProductInfo = useMemo(() => {
    const isPurchaseMode = showSellPriceField;
    const searchPool = onlyInStock ? inStockProducts : products;

    if (category === 'অন্যান্য') {
      if (otherProductId) {
        const found = searchPool.find(p => p.id === otherProductId);
        if (found) {
          const buyP = Number(found.buyPrice || 0);
          const sellP = Number(found.sellPrice || 0);
          return {
            productId: found.id,
            name: found.name,
            price: isPurchaseMode ? (buyP || sellP) : (sellP || buyP),
            sellPrice: sellP,
            unit: found.unit || 'পিস',
            stock: found.stock || 0,
          };
        }
      }
      return {
        productId: undefined,
        name: customName || 'অন্যান্য পণ্য',
        price: 0,
        sellPrice: 0,
        unit: 'পিস',
        stock: 0,
      };
    }

    let constructedName = '';
    let defaultUnit = 'পিস';

    if (category === 'রড') {
      constructedName = activeBrand && activeMm ? `${activeBrand} ${activeMm} রড`.trim() : '';
      defaultUnit = 'কেজি';
    } else if (category === 'সিমেন্ট') {
      if (activeBrand) {
        const brandClean = activeBrand.replace(/\s*সিমেন্ট$/, '').trim();
        if (effectiveEnableCementType && effectiveCementType === 'OPC') {
          constructedName = `${brandClean} (OPC)`;
        } else {
          // PCC is default, do not display PCC as requested: "opc chara naki sob cement pcc eta display kora lagbe na"
          constructedName = brandClean;
        }
      } else {
        constructedName = '';
      }
      defaultUnit = 'বস্তা';
    } else if (category === 'রিং') {
      if (activeMm.toLowerCase().includes('pistol')) {
        constructedName = activeBrand && activeBrand !== 'সাইট মেইড' ? `Pistol Ring (${activeBrand})` : 'Pistol Ring';
      } else {
        constructedName = activeMm ? `${activeMm} রিং ${activeBrand && activeBrand !== 'সাইট মেইড' ? `(${activeBrand})` : ''}`.trim() : '';
      }
      defaultUnit = 'কেজি';
    }

    if (!constructedName) {
      return {
        productId: undefined,
        name: '',
        price: 0,
        sellPrice: 0,
        unit: defaultUnit,
        stock: 0,
      };
    }

    // Exact match search in searchPool
    const exact = searchPool.find(p => {
      const pName = p.name.toLowerCase();
      const cName = constructedName.toLowerCase();
      if (pName === cName) return true;
      if (category === 'রড') {
        const mmNum = (activeMm || '').replace(/[^0-9]/g, '');
        const mmMatches = (activeMm && pName.includes(activeMm.toLowerCase())) || (mmNum ? (pName.includes(`${mmNum}mm`) || pName.includes(`${mmNum} মিলি`) || pName.includes(`${mmNum} মি.লি`) || pName.includes(`${mmNum} মি.মি`) || pName.includes(`${mmNum}মিমি`)) : false);
        const isBsrmMatch = activeBrand === 'BSRM' && (pName.includes('বি এস আর এম') || pName.includes('বিএসআরএম'));
        const isScrmMatch = activeBrand === 'SCRM' && (pName.includes('এসসিআরএম') || pName.includes('এস সি আর এম'));
        const brandMatches = !activeBrand || (p.brand && p.brand.toLowerCase() === activeBrand.toLowerCase()) || pName.includes(activeBrand.toLowerCase()) || isBsrmMatch || isScrmMatch;
        if (pName === `${activeMm} ${activeBrand} রড`.toLowerCase() || pName === `${activeBrand} ${activeMm} রড`.toLowerCase()) return true;
        if (brandMatches && mmMatches) return true;
      }
      if (category === 'সিমেন্ট' && activeBrand) {
        const bCore = activeBrand.replace('সিমেন্ট', '').trim().toLowerCase();
        const longerOption = CEMENT_BRAND_OPTIONS.find(opt => {
          const optCore = opt.replace('সিমেন্ট', '').trim().toLowerCase();
          return optCore.length > bCore.length && optCore.includes(bCore) && pName.includes(optCore);
        });
        if (longerOption) return false;

        if (effectiveEnableCementType && effectiveCementType === 'OPC') {
          return pName.includes(bCore) && pName.includes('opc');
        } else {
          return pName.includes(bCore) && !pName.includes('opc');
        }
      }
      if (category === 'রিং' && activeMm) {
        return pName === activeMm.toLowerCase() || pName === `${activeMm} রিং`.toLowerCase();
      }
      return false;
    });
    if (exact) {
      const buyP = Number(exact.buyPrice || 0);
      const sellP = Number(exact.sellPrice || 0);
      return {
        productId: exact.id,
        name: formatProductName(exact.name, exact.category),
        price: isPurchaseMode ? (buyP || sellP) : (sellP || buyP),
        sellPrice: sellP,
        unit: category === 'রিং' ? 'কেজি' : (exact.unit || defaultUnit),
        stock: exact.stock || 0,
      };
    }

    // Partial search (contains mm and brand) in searchPool
    const partial = searchPool.find(p => {
      const pName = p.name.toLowerCase();
      if (category === 'রড') {
        const mmNum = (activeMm || '').replace(/[^0-9]/g, '');
        const mmMatches = (activeMm && pName.includes(activeMm.toLowerCase())) || (mmNum ? (pName.includes(`${mmNum}mm`) || pName.includes(`${mmNum} মিলি`) || pName.includes(`${mmNum} মি.লি`) || pName.includes(`${mmNum} মি.মি`) || pName.includes(`${mmNum}মিমি`)) : false);
        const isBsrmMatch = activeBrand === 'BSRM' && (pName.includes('বি এস আর এম') || pName.includes('বিএসআরএম'));
        const isScrmMatch = activeBrand === 'SCRM' && (pName.includes('এসসিআরএম') || pName.includes('এস সি আর এম'));
        const brandMatches = !activeBrand || (p.brand && p.brand.toLowerCase() === activeBrand.toLowerCase()) || pName.includes(activeBrand.toLowerCase()) || isBsrmMatch || isScrmMatch;
        return Boolean(brandMatches && mmMatches);
      }
      if (category === 'সিমেন্ট') {
        const bCore = activeBrand.replace('সিমেন্ট', '').trim().toLowerCase();
        const longerOption = CEMENT_BRAND_OPTIONS.find(opt => {
          const optCore = opt.replace('সিমেন্ট', '').trim().toLowerCase();
          return optCore.length > bCore.length && optCore.includes(bCore) && pName.includes(optCore);
        });
        if (longerOption) return false;

        if (effectiveEnableCementType && effectiveCementType === 'OPC') {
          return activeBrand && pName.includes(bCore) && pName.includes('opc');
        } else {
          return activeBrand && pName.includes(bCore) && !pName.includes('opc');
        }
      }
      if (category === 'রিং') {
        return activeMm && pName.includes(activeMm.toLowerCase());
      }
      return false;
    });

    if (partial) {
      const buyP = Number(partial.buyPrice || 0);
      const sellP = Number(partial.sellPrice || 0);
      return {
        productId: partial.id,
        name: formatProductName(partial.name, partial.category),
        price: isPurchaseMode ? (buyP || sellP) : (sellP || buyP),
        sellPrice: sellP,
        unit: category === 'রিং' ? 'কেজি' : (partial.unit || defaultUnit),
        stock: partial.stock || 0,
      };
    }

    return {
      productId: undefined,
      name: formatProductName(constructedName, category),
      price: 0,
      sellPrice: 0,
      unit: defaultUnit,
      stock: 0,
    };
  }, [category, activeMm, activeBrand, otherProductId, customName, onlyInStock, inStockProducts, products, showSellPriceField, effectiveEnableCementType, effectiveCementType]);

  // Sync state up to parent when selection changes
  useEffect(() => {
    onProductChange({
      productId: matchedProductInfo.productId,
      name: matchedProductInfo.name,
      category,
      mmSize: category === 'সিমেন্ট' && effectiveEnableCementType ? effectiveCementType : activeMm,
      brand: activeBrand,
      cementType: category === 'সিমেন্ট' && effectiveEnableCementType ? effectiveCementType : '',
      variant: category === 'সিমেন্ট' && effectiveEnableCementType ? effectiveCementType : activeMm,
      price: matchedProductInfo.price,
      sellPrice: matchedProductInfo.sellPrice,
      unit: matchedProductInfo.unit,
      stock: matchedProductInfo.stock,
    });

    if (autoLoadPrice) {
      onPriceChange(matchedProductInfo.price || 0);
      if (onSellPriceChange) {
        onSellPriceChange(matchedProductInfo.sellPrice || 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, activeMm, activeBrand, otherProductId, customName, matchedProductInfo, autoLoadPrice, effectiveEnableCementType, effectiveCementType]);

  return (
    <div className={cn('p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-4 font-bengali', className)}>
      {/* 1. Category Selection Row */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
          <span>১. পণ্যের ধরন নির্বাচন করুন (Category)</span>
          {matchedProductInfo.stock > 0 ? (
            <span className="text-[11px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">
              বর্তমান স্টক: {toBengaliDigits(matchedProductInfo.stock)} {matchedProductInfo.unit}
            </span>
          ) : (
            <span className="text-[11px] font-black text-rose-600 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md">
              ⚠️ স্টকে নেই (স্টক: ০ {matchedProductInfo.unit})
            </span>
          )}
        </Label>
        
        <div className={cn("grid gap-2", 
          categoriesToDisplay.length === 1 ? "grid-cols-1 sm:grid-cols-2" :
          categoriesToDisplay.length === 2 ? "grid-cols-2" :
          "grid-cols-2 sm:grid-cols-4"
        )}>
          {categoriesToDisplay.map((cat) => {
            const isSelected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={cn(
                  'py-2.5 px-3 rounded-xl font-black text-xs transition-all border flex items-center justify-center gap-1.5',
                  isSelected
                    ? 'bg-gradient-to-r from-[#b88e2d] to-[#d4af37] text-white border-[#8c6b1c] shadow-md shadow-amber-500/20 scale-[1.02]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-[#fbf9f5]'
                )}
              >
                {cat === 'রড' && '🏗️'}
                {cat === 'সিমেন্ট' && '🧱'}
                {cat === 'রিং' && '⭕'}
                {cat === 'অন্যান্য' && '📦'}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Cascading Attributes Row (Based on Category) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        {/* ROD FLOW: Brand Select + mm Select */}
        {category === 'রড' && (
          <>
            <div className="sm:col-span-7 space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">২. কোম্পানি / ব্র্যান্ড (Brand)</Label>
              <Select 
                value={activeBrand} 
                onValueChange={(val: string | null) => {
                  setSelectedBrand(val || '');
                  setEnteredTotal('');
                  onPriceChange(0);
                  if (onSellPriceChange) onSellPriceChange(0);
                  if (onAlertLimitChange) onAlertLimitChange(0);
                }}
              >
                <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  {availableRodBrands.length === 0 ? (
                    <SelectItem value="_none" disabled>স্টকে কোনো ব্র্যান্ড নেই</SelectItem>
                  ) : (
                    availableRodBrands.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-5 space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">৩. মিলি (mm / Size)</Label>
              <Select 
                value={activeMm} 
                onValueChange={(val: string | null) => {
                  setSelectedMm(val || '');
                  setEnteredTotal('');
                  onPriceChange(0);
                  if (onSellPriceChange) onSellPriceChange(0);
                  if (onAlertLimitChange) onAlertLimitChange(0);
                }}
              >
                <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  {availableRodMms.length === 0 ? (
                    <SelectItem value="_none" disabled>স্টকে কোনো মিলি/সাইজ নেই</SelectItem>
                  ) : (
                    availableRodMms.map((mm) => (
                      <SelectItem key={mm} value={mm}>{mm}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* CEMENT FLOW: Brand Select + Cement Type (OPC / PCC) Switch */}
        {category === 'সিমেন্ট' && (
          <>
            <div className={cn(enableCementType ? "sm:col-span-7" : "sm:col-span-7", "space-y-1")}>
              <Label className="text-[11px] font-bold text-slate-600">২. সিমেন্ট ব্র্যান্ড (Brand)</Label>
              <Select 
                value={activeBrand} 
                onValueChange={(val: string | null) => {
                  setSelectedBrand(val || '');
                  setEnteredTotal('');
                  onPriceChange(0);
                  if (onSellPriceChange) onSellPriceChange(0);
                  if (onAlertLimitChange) onAlertLimitChange(0);
                }}
              >
                <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  {availableCementBrands.length === 0 ? (
                    <SelectItem value="_none" disabled>স্টকে কোনো সিমেন্ট ব্র্যান্ড নেই</SelectItem>
                  ) : (
                    availableCementBrands.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-5 space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 select-none">
                  <span>৩. সিমেন্ট টাইপ</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded font-black tracking-wide transition-colors",
                    effectiveCementType === 'PCC' ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-blue-100 text-blue-800 border border-blue-300"
                  )}>
                    {effectiveCementType === 'PCC' ? 'PCC (ডিফল্ট)' : 'OPC'}
                  </span>
                </Label>

                {/* 2-Way Animated Toggle Switch (Left is PCC, Right is OPC) */}
                <div 
                  className="flex items-center gap-1.5 cursor-pointer select-none"
                  onClick={() => {
                    const nextType = effectiveCementType === 'PCC' ? 'OPC' : 'PCC';
                    setCementType(nextType);
                    setEnteredTotal('');
                    onPriceChange(0);
                    if (onSellPriceChange) onSellPriceChange(0);
                  }}
                  title="PCC ও OPC এর মধ্যে সুইচ করুন"
                >
                  <span className={cn(
                    "text-[11px] font-black transition-colors",
                    effectiveCementType === 'PCC' ? "text-emerald-700 font-bold" : "text-slate-400"
                  )}>
                    PCC
                  </span>

                  <div
                    role="switch"
                    aria-checked={effectiveCementType === 'OPC'}
                    className={cn(
                      "relative inline-flex h-6 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer shadow-inner",
                      effectiveCementType === 'OPC' ? "bg-blue-600" : "bg-emerald-600"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[9px] font-black",
                        effectiveCementType === 'OPC' ? "translate-x-6 text-blue-700" : "translate-x-0 text-emerald-700"
                      )}
                    >
                      {effectiveCementType === 'OPC' ? 'O' : 'P'}
                    </span>
                  </div>

                  <span className={cn(
                    "text-[11px] font-black transition-colors",
                    effectiveCementType === 'OPC' ? "text-blue-700 font-bold" : "text-slate-400"
                  )}>
                    OPC
                  </span>
                </div>
              </div>

              {/* 2-Way Segmented Switch: One side PCC, other side OPC */}
              <div className="grid grid-cols-2 gap-1.5 h-10 p-1 bg-slate-100/90 rounded-xl border border-slate-200 select-none">
                {/* PCC Button (Left) */}
                <button
                  type="button"
                  onClick={() => {
                    setCementType('PCC');
                    setEnteredTotal('');
                    onPriceChange(0);
                    if (onSellPriceChange) onSellPriceChange(0);
                  }}
                  className={cn(
                    "h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 border cursor-pointer",
                    effectiveCementType === 'PCC'
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-700 shadow-md shadow-emerald-500/20 scale-[1.01]"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  )}
                  title="PCC নির্বাচন করুন (ডিফল্ট)"
                >
                  <span>PCC</span>
                  {effectiveCementType === 'PCC' && <span className="text-[10px] font-bold">✓ (ডিফল্ট)</span>}
                </button>

                {/* OPC Button (Right) */}
                <button
                  type="button"
                  onClick={() => {
                    setCementType('OPC');
                    setEnteredTotal('');
                    onPriceChange(0);
                    if (onSellPriceChange) onSellPriceChange(0);
                  }}
                  className={cn(
                    "h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 border cursor-pointer",
                    effectiveCementType === 'OPC'
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-700 shadow-md shadow-blue-500/20 scale-[1.01]"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  )}
                  title="OPC নির্বাচন করুন"
                >
                  <span>OPC</span>
                  {effectiveCementType === 'OPC' && <span className="text-[10px] font-bold">✓</span>}
                </button>
              </div>
            </div>
          </>
        )}

        {/* RING FLOW: Size Select + Gauge/Brand Select */}
        {category === 'রিং' && (
          <>
            <div className="sm:col-span-5 space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">২. রিং সাইজ (Size)</Label>
              <Select 
                value={activeMm} 
                onValueChange={(val: string | null) => {
                  setSelectedMm(val || '');
                  setEnteredTotal('');
                  onPriceChange(0);
                  if (onSellPriceChange) onSellPriceChange(0);
                  if (onAlertLimitChange) onAlertLimitChange(0);
                }}
              >
                <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  {availableRingSizes.length === 0 ? (
                    <SelectItem value="_none" disabled>স্টকে কোনো রিং সাইজ নেই</SelectItem>
                  ) : (
                    availableRingSizes.map((sz) => (
                      <SelectItem key={sz} value={sz}>{sz}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-7 space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">৩. রিং গেজ / ক্যাটাগরি</Label>
              <Select 
                value={activeBrand} 
                onValueChange={(val: string | null) => {
                  setSelectedBrand(val || '');
                  setEnteredTotal('');
                  onPriceChange(0);
                  if (onSellPriceChange) onSellPriceChange(0);
                  if (onAlertLimitChange) onAlertLimitChange(0);
                }}
              >
                <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  {availableRingBrands.length === 0 ? (
                    <SelectItem value="_none" disabled>স্টকে কোনো রিং গেজ নেই</SelectItem>
                  ) : (
                    availableRingBrands.map((rb) => (
                      <SelectItem key={rb} value={rb}>{rb}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </>
        )}




        {/* OTHERS FLOW: Existing Product Select */}
        {category === 'অন্যান্য' && (
          <div className="sm:col-span-12 space-y-1">
            <Label className="text-[11px] font-bold text-slate-600">পণ্য নির্বাচন করুন</Label>
            <Select 
              value={otherProductId} 
              onValueChange={(val: string | null) => {
                const v = val || '';
                setOtherProductId(v);
                const match = products.find(p => p.id === v);
                if (match && autoLoadPrice) {
                  if (showPriceField) onPriceChange(match.buyPrice || match.sellPrice || 0);
                  if (showSellPriceField && onSellPriceChange) onSellPriceChange(match.sellPrice || 0);
                }
              }}
            >
              <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                <SelectValue placeholder="পণ্য নির্বাচন করুন..." />
              </SelectTrigger>
              <SelectContent className="font-bengali text-xs font-bold max-h-60">
                {(onlyInStock ? products.filter(p => (p.stock || 0) > 0) : products).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.sellPrice ? `— ৳${p.sellPrice}/${p.unit || 'পিস'}` : ''} (স্টক: {p.stock || 0} {p.unit || 'পিস'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* 3. Quantities, Prices & Alert Limit Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
        {/* Quantity Field */}
        <div className={cn(isPurchaseMode ? 'sm:col-span-3' : 'sm:col-span-4', 'space-y-1')}>
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold text-slate-600">পরিমাণ ({matchedProductInfo.unit})</Label>
            {matchedProductInfo.productId && (
              <span className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1",
                matchedProductInfo.stock > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"
              )}>
                <span>স্টক:</span>
                <span>{toBengaliDigits(matchedProductInfo.stock.toLocaleString('en-IN'))} {matchedProductInfo.unit}</span>
              </span>
            )}
          </div>
          <Input
            type="text"
            inputMode="decimal"
            value={qtyInput}
            onChange={(e) => {
              const val = e.target.value;
              const enStr = toEnglishDigits(val).replace(/[।\,]/g, '.').replace(/[^0-9.]/g, '');
              const parts = enStr.split('.');
              const cleanEn = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : enStr;

              if (cleanEn === '') {
                setQtyInput('');
                onQtyChange('' as any);
              } else {
                setQtyInput(toBengaliDigits(cleanEn));
                const parsed = parseFloat(cleanEn);
                const newQty = isNaN(parsed) ? ('' as any) : parsed;
                onQtyChange(newQty);
                if (typeof newQty === 'number' && newQty > 0 && enteredTotal !== '' && Number(enteredTotal) > 0) {
                  const computedPrice = Math.round((Number(enteredTotal) / newQty) * 100) / 100;
                  onPriceChange(computedPrice);
                } else if (typeof newQty === 'number' && newQty > 0 && itemPrice > 0) {
                  setEnteredTotal(Math.round(newQty * itemPrice * 100) / 100);
                }
              }
            }}
            onBlur={() => {
              const enStr = toEnglishDigits(qtyInput).replace(/[^0-9.]/g, '');
              const parsed = parseFloat(enStr);
              if (isNaN(parsed) || parsed <= 0) {
                if (itemQty) {
                  setQtyInput(toBengaliDigits(itemQty));
                } else {
                  setQtyInput('');
                }
              } else {
                const clean = Math.round(parsed * 100) / 100;
                setQtyInput(toBengaliDigits(clean));
                onQtyChange(clean);
              }
            }}
            onFocus={(e) => e.target.select()}
            placeholder="পরিমাণ লিখুন"
            className="rounded-xl h-10 bg-white text-center font-bold text-xs font-bengali tracking-wide"
          />
        </div>

        {/* Total Price Input (For Purchase Invoice) */}
        {isPurchaseMode && (
          <div className="sm:col-span-4 space-y-1">
            <Label className="text-[11px] font-black text-indigo-700 flex items-center justify-between">
              <span>মোট ক্রয় মূল্য (৳)</span>
              <span className="text-[9px] font-bold text-indigo-500">(ইনভয়েস মোট টাকা)</span>
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={totalInput}
              onChange={(e) => {
                const val = e.target.value;
                const enStr = toEnglishDigits(val).replace(/[।\,]/g, '.').replace(/[^0-9.]/g, '');
                const parts = enStr.split('.');
                const cleanEn = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : enStr;

                if (cleanEn === '') {
                  setTotalInput('');
                  setEnteredTotal('');
                  onPriceChange(0);
                  if (onTotalPriceChange) onTotalPriceChange(0);
                } else {
                  setTotalInput(toBengaliDigits(cleanEn));
                  const parsed = parseFloat(cleanEn);
                  const newTotal = isNaN(parsed) ? '' : parsed;
                  setEnteredTotal(newTotal);
                  if (typeof newTotal === 'number') {
                    if (onTotalPriceChange) onTotalPriceChange(newTotal);
                    const currentQty = Number(itemQty) || 0;
                    if (currentQty > 0) {
                      const computedPrice = Math.round((newTotal / currentQty) * 100) / 100;
                      onPriceChange(computedPrice);
                    }
                  }
                }
              }}
              onBlur={() => {
                const enStr = toEnglishDigits(totalInput).replace(/[^0-9.]/g, '');
                const parsed = parseFloat(enStr);
                if (isNaN(parsed) || parsed <= 0) {
                  if (enteredTotal !== '') {
                    setTotalInput(toBengaliDigits(enteredTotal));
                  } else {
                    setTotalInput('');
                  }
                } else {
                  const clean = Math.round(parsed * 100) / 100;
                  setTotalInput(toBengaliDigits(clean));
                  setEnteredTotal(clean);
                }
              }}
              onFocus={(e) => e.target.select()}
              placeholder="মোট টাকা লিখুন"
              className="rounded-xl h-10 bg-indigo-50/70 border-indigo-200 text-center font-black text-xs text-indigo-700 focus:bg-white transition-colors font-bengali tracking-wide"
            />
          </div>
        )}

        {/* Primary Price Field (Only in Non-Purchase / Sales mode) */}
        {showPriceField && !isPurchaseMode && (
          <div className="sm:col-span-4 space-y-1">
            <Label className="text-[11px] font-bold text-slate-600">{priceLabel}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={priceInput}
              onChange={(e) => {
                const val = e.target.value;
                const enStr = toEnglishDigits(val).replace(/[।\,]/g, '.').replace(/[^0-9.]/g, '');
                const parts = enStr.split('.');
                const cleanEn = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : enStr;

                if (cleanEn === '') {
                  setPriceInput('');
                  onPriceChange('' as any);
                } else {
                  setPriceInput(toBengaliDigits(cleanEn));
                  const parsed = parseFloat(cleanEn);
                  onPriceChange(isNaN(parsed) ? ('' as any) : parsed);
                }
              }}
              onBlur={() => {
                const enStr = toEnglishDigits(priceInput).replace(/[^0-9.]/g, '');
                const parsed = parseFloat(enStr);
                if (isNaN(parsed) || parsed <= 0) {
                  if (itemPrice) {
                    setPriceInput(toBengaliDigits(itemPrice));
                  } else {
                    setPriceInput('');
                  }
                } else {
                  const clean = Math.round(parsed * 100) / 100;
                  setPriceInput(toBengaliDigits(clean));
                  onPriceChange(clean);
                }
              }}
              onFocus={(e) => e.target.select()}
              placeholder="০.০০"
              className="rounded-xl h-10 bg-white text-center font-bold text-xs text-orange-600 font-bengali tracking-wide"
            />
          </div>
        )}

        {/* Sell Price Field (For Purchase Invoice) */}
        {showSellPriceField && onSellPriceChange && (
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-[11px] font-bold text-slate-600">বিক্রয় মূল্য (৳)</Label>
            <Input
              type="number"
              min="0"
              value={!itemSellPrice && itemSellPrice !== 0 ? '' : itemSellPrice}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onSellPriceChange('' as any);
                } else {
                  const parsed = parseFloat(val);
                  onSellPriceChange(isNaN(parsed) ? ('' as any) : parsed);
                }
              }}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="rounded-xl h-10 bg-white text-center font-bold text-xs text-emerald-600"
            />
          </div>
        )}

        {/* Stock Alert Limit Field (For Purchase Invoice) */}
        {showAlertLimitField && onAlertLimitChange && (
          <div className="sm:col-span-1 space-y-1">
            <Label className="text-[11px] font-bold text-slate-600">অ্যালার্ট</Label>
            <Input
              type="number"
              min="0"
              value={!itemAlertLimit && itemAlertLimit !== 0 ? '' : itemAlertLimit}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onAlertLimitChange('' as any);
                } else {
                  const parsed = parseFloat(val);
                  onAlertLimitChange(isNaN(parsed) ? ('' as any) : parsed);
                }
              }}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="rounded-xl h-10 bg-white text-center font-bold text-xs text-purple-600"
            />
          </div>
        )}

        {/* Add Row Button */}
        <div className={cn(isPurchaseMode ? 'sm:col-span-2' : 'sm:col-span-4', 'flex items-end')}>
          <Button
            type="button"
            onClick={() => {
              if (onlyInStock) {
                if (matchedProductInfo.stock <= 0) {
                  toast.error('এই পণ্যটি বর্তমানে স্টকে নেই!');
                  return;
                }
                if (itemQty > matchedProductInfo.stock) {
                  toast.error(`⚠️ স্টকে মাত্র ${matchedProductInfo.stock} ${matchedProductInfo.unit} রয়েছে! এর বেশি বিক্রি/নেওয়া সম্ভব নয়।`);
                  return;
                }
              }
              onAddCartItem();
              setEnteredTotal('');
            }}
            className="w-full bg-gradient-to-r from-[#b88e2d] to-[#d4af37] hover:from-[#a37c22] hover:to-[#be9b2d] text-white h-10 rounded-xl font-bold text-xs shadow-xs"
          >
            {buttonLabel}
          </Button>
        </div>
      </div>

      {/* Selected Item Summary Pill */}
      <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200/80 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-bold">আইটেম সারসংক্ষেপ:</span>
          <span className="font-black text-slate-900">{matchedProductInfo.name || 'পণ্য নির্বাচন করুন'}</span>
          <span className="text-slate-500 font-bold">({toBengaliDigits(itemQty || 0)} {matchedProductInfo.unit})</span>
          {matchedProductInfo.productId && (
            <span className={cn(
              "text-[11px] font-bold px-2 py-0.5 rounded-md border",
              matchedProductInfo.stock > 0 ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
            )}>
              বর্তমান মজুত: <strong>{toBengaliDigits(matchedProductInfo.stock.toLocaleString('en-IN'))} {matchedProductInfo.unit}</strong>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(isPurchaseMode ? (enteredTotal !== '' || (itemPrice > 0 && itemQty > 0)) : showPriceField) && (
            <span className="font-black text-indigo-700">
              মোট: ৳{toBengaliDigits(((enteredTotal !== '' && Number(enteredTotal) > 0) ? Number(enteredTotal) : (itemQty * (itemPrice || 0))).toLocaleString('en-IN'))}
            </span>
          )}
          {showSellPriceField && itemSellPrice > 0 && (
            <span className="font-bold text-emerald-600">
              (বিক্রয়: ৳{toBengaliDigits(itemSellPrice.toLocaleString('en-IN'))}/{matchedProductInfo.unit})
            </span>
          )}
        </div>
      </div>

    </div>
  );
}

