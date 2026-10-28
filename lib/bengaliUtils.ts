                        export const toBengaliDigits = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null || num === '') return '০';
  const str = String(num);
  const bengaliNumerals: Record<string, string> = {
    '0': '০',
    '1': '১',
    '2': '২',
    '3': '৩',
    '4': '৪',
    '5': '৫',
    '6': '৬',
    '7': '৭',
    '8': '৮',
    '9': '৯',
  };
  return str.replace(/[0-9]/g, (match) => bengaliNumerals[match] || match);
};

export const toEnglishDigits = (str: string | number | undefined | null): string => {
  if (str === undefined || str === null || str === '') return '';
  const bnToEn: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return String(str).replace(/[০-৯]/g, (match) => bnToEn[match] || match);
};

export const normalizeForSearch = (str: string | number | undefined | null): string => {
  if (!str) return '';
  return toEnglishDigits(String(str)).toLowerCase().trim();
};

export const formatBengaliTaka = (amount: number | undefined | null, includeSymbol: boolean = false): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '০/=';
  const formatted = amount.toLocaleString('en-IN');
  const bnFormatted = toBengaliDigits(formatted);
  return includeSymbol ? `৳ ${bnFormatted}/=` : `${bnFormatted}/=`;
};

const bnWordsMap: Record<number, string> = {
  0: 'শূন্য', 1: 'এক', 2: 'দুই', 3: 'তিন', 4: 'চার', 5: 'পাঁচ', 6: 'ছয়', 7: 'সাত', 8: 'আট', 9: 'নয়', 10: 'দশ',
  11: 'এগারো', 12: 'বারো', 13: 'তেরো', 14: 'চৌদ্দ', 15: 'পনেরো', 16: 'ষোলো', 17: 'সতেরো', 18: 'আঠারো', 19: 'উনিশ', 20: 'বিশ',
  21: 'একুশ', 22: 'বাইশ', 23: 'তেইশ', 24: 'চব্বিশ', 25: 'পঁচিশ', 26: 'ছাব্বিশ', 27: 'সাতাশ', 28: 'আঠাশ', 29: 'উনত্রিশ', 30: 'ত্রিশ',
  31: 'একত্রিশ', 32: 'বত্রিশ', 33: 'তেত্রিশ', 34: 'চৌত্রিশ', 35: 'পঁয়ত্রিশ', 36: 'ছত্রিশ', 37: 'সাইত্রিশ', 38: 'আটত্রিশ', 39: 'উনচল্লিশ', 40: 'চল্লিশ',
  41: 'একচল্লিশ', 42: 'বিয়াল্লিশ', 43: 'তেতাল্লিশ', 44: 'চৌয়াল্লিশ', 45: 'পঁয়তাল্লিশ', 46: 'ছেচল্লিশ', 47: 'সাতচল্লিশ', 48: 'আটচল্লিশ', 49: 'উনপঞ্চাশ', 50: 'পঞ্চাশ',
  51: 'একান্ন', 52: 'বায়ান্ন', 53: 'তিপ্পান্ন', 54: 'চৌয়ান্ন', 55: 'পঞ্চান্ন', 56: 'ছাপ্পান্ন', 57: 'সাতান্ন', 58: 'আটান্ন', 59: 'উনষাট', 60: 'ষাট',
  61: 'একষট্টি', 62: 'বাষট্টি', 63: 'তেষট্টি', 64: 'চৌষট্টি', 65: 'পঁয়ষট্টি', 66: 'ছেষট্টি', 67: 'সাতষট্টি', 68: 'আটষট্টি', 69: 'উনসত্তর', 70: 'সত্তর',
  71: 'একাত্তর', 72: 'বাস্তুর', 73: 'তিয়াত্তর', 74: 'চৌয়াত্তর', 75: 'পঁচাত্তর', 76: 'ছিয়াত্তর', 77: 'সাতাত্তর', 78: 'আটাত্তর', 79: 'উনাশি', 80: 'আশি',
  81: 'একাশি', 82: 'বিরাশি', 83: 'তিরাশি', 84: 'চৌরাশি', 85: 'পঁচাশি', 86: 'ছিয়াশি', 87: 'সাতাশি', 88: 'অষ্টাদশ', 89: 'উননব্বই', 90: 'নব্বই',
  91: 'একানব্বই', 92: 'বিয়ানব্বই', 93: 'তেরানব্বই', 94: 'চৌরানব্বই', 95: 'পঁচানব্বই', 96: 'ছিয়ানব্বই', 97: 'সাতানব্বই', 98: 'আটানব্বই', 99: 'নিরানব্বই'
};

function convertTwoDigits(n: number): string {
  if (n <= 0) return '';
  return bnWordsMap[n] || String(n);
}

export const numberToBengaliWords = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num) || num === 0) return 'শূন্য টাকা মাত্র';
  
  let amount = Math.floor(Math.abs(num));
  let result = '';

  if (amount >= 10000000) {
    const crore = Math.floor(amount / 10000000);
    result += numberToBengaliWords(crore).replace(' টাকা মাত্র', '') + ' কোটি ';
    amount %= 10000000;
  }

  if (amount >= 100000) {
    const lakh = Math.floor(amount / 100000);
    result += convertTwoDigits(lakh) + ' লক্ষ ';
    amount %= 100000;
  }

  if (amount >= 1000) {
    const thousand = Math.floor(amount / 1000);
    result += convertTwoDigits(thousand) + ' হাজার ';
    amount %= 1000;
  }

  if (amount >= 100) {
    const hundred = Math.floor(amount / 100);
    result += convertTwoDigits(hundred) + ' শত ';
    amount %= 100;
  }

  if (amount > 0) {
    result += convertTwoDigits(amount) + ' ';
  }

  return (result.trim() + ' টাকা মাত্র').replace(/\s+/g, ' ');
};

export const formatCurrencyToWords = (amount: number): string => {
  const taka = Math.floor(amount);
  const poisha = Math.round((amount - taka) * 100);
  let result = '';
  if (taka > 0) result += `${numberToBengaliWords(taka).replace(' টাকা মাত্র', '')}`;
  if (poisha > 0) result += `${result ? ' এবং ' : ''}${convertTwoDigits(poisha)} পয়সা`;
  return `${result} টাকা মাত্র`;
};

export interface ParsedProductInfo {
  categoryName: string;
  brandName: string;
  sizeName: string;
  cementType?: 'OPC' | 'PCC' | '';
}

export function parseProductDetails(item: { 
  name: string; 
  category?: string; 
  brand?: string; 
  mmSize?: string; 
  size?: string; 
  variant?: string;
  cementType?: string;
}): ParsedProductInfo {
  const name = item.name || '';
  const lowerName = name.toLowerCase();

  // 1. Category / Product Type (পণ্য / রড / সিমেন্ট / রিং)
  let categoryName = item.category || '';
  if (!categoryName) {
    if (lowerName.includes('সিমেন্ট') || lowerName.includes('cement')) {
      categoryName = 'সিমেন্ট';
    } else if (
      lowerName.includes('রড') || 
      lowerName.includes('rod') || 
      lowerName.includes('মিলি') || 
      lowerName.includes('mm') ||
      lowerName.includes('মি.লি') ||
      lowerName.includes('মি.মি') ||
      lowerName.includes('মিমি') ||
      lowerName.includes('bsrm') ||
      lowerName.includes('scrm') ||
      lowerName.includes('ksrm') ||
      lowerName.includes('aks') ||
      lowerName.includes('gph') ||
      lowerName.includes('বি এস আর এম') ||
      lowerName.includes('বিএসআরএম') ||
      lowerName.includes('এসসিআরএম') ||
      lowerName.includes('কেএসআরএম')
    ) {
      categoryName = 'রড';
    } else if (lowerName.includes('রিং') || lowerName.includes('ring')) {
      categoryName = 'রিং';
    } else {
      categoryName = name || 'অন্যান্য';
    }
  }

  // Detect cement type if present
  let detectedCementType: 'OPC' | 'PCC' | '' = '';
  if (item.cementType === 'OPC' || item.cementType === 'PCC') {
    detectedCementType = item.cementType;
  } else if (item.variant === 'OPC' || item.variant === 'PCC') {
    detectedCementType = item.variant;
  } else if (/\bopc\b|\(opc\)|ওপিসি/i.test(lowerName)) {
    detectedCementType = 'OPC';
  } else if (/\bpcc\b|\(pcc\)|পিসিসি/i.test(lowerName)) {
    detectedCementType = 'PCC';
  }

  // 2. Brand (ব্র্যান্ড)
  let brandName = item.brand || '';
  if (!brandName) {
    if (name.includes('বি এস আর এম') || name.includes('বিএসআরএম')) {
      brandName = 'BSRM';
    } else if (name.includes('এসসিআরএম') || name.includes('এস সি আর এম')) {
      brandName = 'SCRM';
    } else if (name.includes('কেএসআরএম') || name.includes('কে এস আর এম')) {
      brandName = 'KSRM';
    } else if (name.includes('একেএস') || name.includes('এ কে এস')) {
      brandName = 'AKS';
    }

    if (!brandName) {
      const knownBrands = [
        'BSRM', 'SCRM TMX', 'SCRM', 'KSML', 'HKG', 'DSRM',
        'Holcim Strong structure', 'Holcim Supercrete Plus', 'Holcim Supercrete', 'Holcim Coastal Guard', 'Holcim Waterprotect', 'King Brand', 'Aman',
        'KSRM', 'AKS', 'GPH Ispat', 'Anwar Ispat', 'RSRM', 'Baizid', 'Metrocem', 'SSRM',
        'শাহ সিমেন্ট', 'সেভেন রিংস', 'বসুন্ধরা সিমেন্ট', 'ফ্রেশ সিমেন্ট', 'ক্রাউন সিমেন্ট', 'প্রিমিয়ার সিমেন্ট',
        'হোলসিম সিমেন্ট', 'আকিজ সিমেন্ট', 'শাহ', 'সেভেন রিং', 'বসুন্ধরা', 'ফ্রেশ', 'ক্রাউন', 'প্রিমিয়ার', 'হোলসিম', 'আকিজ'
      ];
      for (const b of knownBrands) {
        if (name.includes(b)) {
          brandName = categoryName === 'সিমেন্ট' ? b.replace(/\s*সিমেন্ট$/, '').trim() : b;
          break;
        }
      }
    }
    if (!brandName && categoryName === 'সিমেন্ট') {
      const cleaned = name.replace(/\((?:OPC|PCC|ওপিসি|পিসিসি)\)/gi, '').replace(/\b(?:OPC|PCC|ওপিসি|পিসিসি)\b/gi, '').replace(/\s*সিমেন্ট$/gi, '').trim();
      if (cleaned) brandName = formatCementNameToEnglish(cleaned);
    }
    if (categoryName === 'সিমেন্ট' && brandName) {
      brandName = formatCementNameToEnglish(brandName).replace(/\s*-\s*(?:PCC|OPC)$/i, '').replace(/\s*\((?:PCC|OPC)\)$/i, '').trim();
    }
  }

  // 3. Size / Variant (সাইজ / গ্রেড / টাইপ)
  let sizeName = item.mmSize || item.size || item.variant || '';
  if (categoryName === 'সিমেন্ট' && detectedCementType) {
    sizeName = detectedCementType;
  } else if (!sizeName) {
    if (detectedCementType) {
      sizeName = detectedCementType;
    } else {
      const mmMatch = name.match(/([0-9০-৯]+(?:\.[0-9০-৯]+)?\s*(?:মিলি|মি\.লি|মি\.মি|মিমি|mm))/i) 
                   || name.match(/([0-9০-৯]+)\s*(?:মিলি|মি\.লি|মি\.মি|মিমি|mm)/i)
                   || name.match(/\b(8|10|12|16|20|22|25|28|32|৮|১০|১২|১৬|২০|২২|২৫|২৮|৩২)\s*(?:মিলি|মি\.লি|মি\.মি|মিমি|mm|রড)?/i);
      if (mmMatch) {
        const numPart = (mmMatch[1] || mmMatch[0]).replace(/(?:মিলি|মি\.লি|মি\.মি|মিমি|mm|রড)/gi, '').trim();
        sizeName = numPart ? `${numPart} মিলি` : mmMatch[0];
      } else {
        const ringDashMatch = name.match(/\b([0-9০-৯]+-[0-9০-৯]+)\b/) || name.match(/Pistol\s*ring/i) || name.match(/পিস্তল\s*রিং/i);
        const ringMatch = name.match(/([0-9০-৯]+["″]?\s*[\*×xX]\s*[0-9০-৯]+["″]?)/);
        if (ringDashMatch) {
          sizeName = ringDashMatch[0];
        } else if (ringMatch) {
          sizeName = ringMatch[1].replace(/[*xX]/g, '″ × ') + (ringMatch[1].includes('″') ? '' : '″');
        }
      }
    }
  }

  return {
    categoryName: categoryName || 'পণ্য',
    brandName: brandName || '—',
    sizeName: sizeName || '—',
    cementType: detectedCementType
  };
}

/**
 * Formats any cement product name into clean, standardized English name.
 * e.g. "হোলসিম স্ট্রং স্ট্রাকচার (Holcim Strong Structure - PCC)" -> "Holcim Strong Structure - PCC"
 *      "হোলসিম সুপারক্রিট (Holcim Supercrete - PCC)" -> "Holcim Supercrete - PCC"
 *      "হোলসিম কোস্টাল গার্ড (Holcim Coastal Guard - PCC)" -> "Holcim Coastal Guard - PCC"
 *      "কিং ব্র্যান্ড সিমেন্ট (King Brand - PCC)" -> "King Brand - PCC"
 *      "Holcim Waterprotect সিমেন্ট" -> "Holcim Waterprotect"
 *      "হোলসিম সুপারক্রিট প্লাস (Holcim Supercrete Plus)" -> "Holcim Supercrete Plus"
 *      "Aman (OPC) সিমেন্ট" -> "Aman (OPC)"
 */
export function formatCementNameToEnglish(name: string | undefined | null): string {
  if (!name) return '';
  let str = String(name).trim();

  // Preserve any invoice tag like (ইনভ:INV-2026-4240)
  let invTag = '';
  const invMatch = str.match(/\s*(\((?:ইনভ|inv)?:?\s*[a-zA-Z0-9-]+\))/i);
  if (invMatch) {
    invTag = ' ' + invMatch[1];
    str = str.replace(invMatch[0], '').trim();
  }

  // If already contains English in parentheses e.g. (Holcim Strong Structure - PCC)
  const engParenMatch = str.match(/\((Holcim[^)]+|King Brand[^)]+|Aman[^)]+)\)/i);
  if (engParenMatch) {
    str = engParenMatch[1].trim();
  }

  const lower = str.toLowerCase();
  const isOpc = /\bopc\b|\(opc\)|ওপিসি|ও\s*পি\s*সি/i.test(lower);

  let brand = '';
  if (lower.includes('strong structure') || lower.includes('স্ট্রং স্ট্রাকচার')) {
    brand = 'Holcim Strong Structure';
  } else if (lower.includes('supercrete plus') || lower.includes('সুপারক্রিট প্লাস') || lower.includes('সুপার ক্রিট প্লাস')) {
    brand = 'Holcim Supercrete Plus';
  } else if (lower.includes('supercrete') || lower.includes('সুপারক্রিট') || lower.includes('সুপার ক্রিট')) {
    brand = 'Holcim Supercrete';
  } else if (lower.includes('coastal guard') || lower.includes('কোস্টাল গার্ড') || lower.includes('কোস্টাল')) {
    brand = 'Holcim Coastal Guard';
  } else if (lower.includes('waterprotect') || lower.includes('ওয়াটারপ্রটেক্ট') || lower.includes('ওয়াটার প্রটেক্ট') || lower.includes('ওয়াটার প্রোটেক্ট')) {
    brand = 'Holcim Waterprotect';
  } else if (lower.includes('king brand') || lower.includes('কিং ব্র্যান্ড') || lower.includes('কিং-ব্র্যান্ড') || lower.includes('কিংব্র্যান্ড')) {
    brand = 'King Brand';
  } else if (lower.includes('aman') || lower.includes('আমান')) {
    brand = 'Aman';
  } else if (lower.includes('anchor up') || lower.includes('অ্যাংকর আপ') || lower.includes('এ্যাংকর আপ') || lower.includes('এ্যাংকার আপ')) {
    brand = 'Anchor Up Cement';
  } else if (lower.includes('anchor') || lower.includes('অ্যাংকর') || lower.includes('এ্যাংকর') || lower.includes('এ্যাংকার')) {
    brand = 'Anchor Cement';
  } else if (lower.includes('fresh') || lower.includes('ফ্রেশ')) brand = 'Fresh Cement';
  else if (lower.includes('crown') || lower.includes('ক্রাউন')) brand = 'Crown Cement';
  else if (lower.includes('seven ring') || lower.includes('সেভেন রিংস') || lower.includes('সেভেন রিং')) brand = 'Seven Rings Cement';
  else if (lower.includes('premier') || lower.includes('প্রিমিয়ার')) brand = 'Premier Cement';
  else if (lower.includes('akij') || lower.includes('আকিজ')) brand = 'Akij Cement';
  else if (lower.includes('shah') || lower.includes('শাহ')) brand = 'Shah Cement';
  else if (lower.includes('bashundhara') || lower.includes('বসুন্ধরা')) brand = 'Bashundhara Cement';
  else if (lower.includes('asha') || lower.includes('আশা')) brand = 'Asha Cement';
  else if (lower.includes('holcim') || lower.includes('হোলসিম')) brand = 'Holcim Cement';
  else {
    brand = str;
  }

  // Strip PCC completely (as requested: "pcc eta show korte hobe na ... opc chara naki sob cement pcc eta display kora lagbe na")
  let cleanBrand = brand
    .replace(/\s*[-/|]\s*PCC\b/gi, '')
    .replace(/\s*\(\s*PCC\s*\)/gi, '')
    .replace(/\bPCC\b/gi, '')
    .replace(/\s*-\s*OPC\b/gi, '')
    .replace(/\s*\(\s*OPC\s*\)/gi, '')
    .trim();

  // If OPC, append (OPC)
  if (isOpc) {
    return `${cleanBrand} (OPC)${invTag}`;
  }

  return `${cleanBrand}${invTag}`;
}

/**
 * Universal product name formatter:
 * - Cement: Strictly English (as requested: "just cement er namegulo shudhu english ei thakbe sob jagay")
 * - Rod: Retains Bangla digits & rod formatting (as requested: "rod jevabe ache sevabei thakbe")
 * - Ring / Other: Retains standard formatting
 */
export function formatProductName(name: string | undefined | null, category?: string): string {
  if (!name) return '';
  const str = String(name).trim();
  const lower = str.toLowerCase();
  const cat = (category || '').toLowerCase();

  // If Rod: Leave intact as requested
  if (cat === 'রড' || cat.includes('rod') || (!cat && (lower.includes('রড') || lower.includes('bsrm') || lower.includes('scrm') || lower.includes('ksml') || lower.includes('hkg') || lower.includes('dsrm')))) {
    return str;
  }

  // If Ring: Leave intact
  if (cat === 'রিং' || cat.includes('ring') || (!cat && (lower.includes('রিং') || lower.includes('ring')))) {
    return str;
  }

  // If Cement: Convert strictly to English
  if (cat === 'সিমেন্ট' || cat.includes('cement') || isCementProduct({ name: str })) {
    return formatCementNameToEnglish(str);
  }

  return str;
}

/**
 * Universal cleaner for legacy Bijoy 52 / SutonnyMJ text remnants in product names and ledger descriptions.
 * Converts strings like "10 মি.মি Gm wm Avi Gg রড" to "10 মি.মি এসসিআরএম রড".
 * For Cement: Returns clean English name.
 * For Rod & Ring: Preserves standard format.
 */
export function cleanLegacyBengaliText(input: any): string {
  if (input === null || input === undefined) return '';
  let str = String(input).trim();
  if (!str) return '';

  // If it's a cement product, strictly return the English name!
  if (isCementProduct({ name: str })) {
    return formatCementNameToEnglish(str);
  }

  // 1. Specific brand phrases (longest phrase first)
  const PHRASES: [RegExp, string | ((m: string) => string)][] = [
    // SCRM rod
    [/10\s*wg[:.]\s*wj\s+Gm\s+wm\s+Avi\s+Gg\s+iW/gi, '10 মি.মি এসসিআরএম রড'],
    [/12\s*wg[:.]\s*wj\s+Gm\s+wm\s+Avi\s+Gg\s+iW/gi, '12 মি.মি এসসিআরএম রড'],
    [/16\s*wg[:.]\s*wj\s+Gm\s+wm\s+Avi\s+Gg\s+iW/gi, '16 মি.মি এসসিআরএম রড'],
    [/20\s*wg[:.]\s*wj\s+Gm\s+wm\s+Avi\s+Gg\s+iW/gi, '20 মি.মি এসসিআরএম রড'],
    [/22\s*wg[:.]\s*wj\s+Gm\s+wm\s+Avi\s+Gg\s+iW/gi, '22 মি.মি এসসিআরএম রড'],
    [/25\s*wg[:.]\s*wj\s+Gm\s+wm\s+Avi\s+Gg\s+iW/gi, '25 মি.মি এসসিআরএম রড'],
    [/8\s*wg[:.]\s*wj\s+Gm\s+wm\s+Avi\s+Gg\s+iW/gi, '8 মি.মি এসসিআরএম রড'],

    // BSRM rod
    [/10\s*wg[:.]\s*wj\s+(?:we|G)\s+Gm\s+Avi\s+Gg\s+iW/gi, '10 মি.মি বিএসআরএম রড'],
    [/12\s*wg[:.]\s*wj\s+(?:we|G)\s+Gm\s+Avi\s+Gg\s+iW/gi, '12 মি.মি বিএসআরএম রড'],
    [/16\s*wg[:.]\s*wj\s+(?:we|G)\s+Gm\s+Avi\s+Gg\s+iW/gi, '16 মি.মি বিএসআরএম রড'],
    [/20\s*wg[:.]\s*wj\s+(?:we|G)\s+Gm\s+Avi\s+Gg\s+iW/gi, '20 মি.মি বিএসআরএম রড'],
    [/22\s*wg[:.]\s*wj\s+(?:we|G)\s+Gm\s+Avi\s+Gg\s+iW/gi, '22 মি.মি বিএসআরএম রড'],
    [/25\s*wg[:.]\s*wj\s+(?:we|G)\s+Gm\s+Avi\s+Gg\s+iW/gi, '25 মি.মি বিএসআরএম রড'],
    [/8\s*wg[:.]\s*wj\s+(?:we|G)\s+Gm\s+Avi\s+Gg\s+iW/gi, '8 মি.মি বিএসআরএম রড'],

    // Fresh rod
    [/(?:10|12|16|20|22|25|8)\s*wg[:.]\s*wj\s+†d«m\s+iW/gi, (m: string) => m.replace(/wg[:.]\s*wj/gi, 'মি.মি').replace(/†d«m/g, 'ফ্রেশ').replace(/iW/g, 'রড')],

    // KSML rod
    [/16\s*wg[:.]\s*wj\s+‡K\s+Gm\s+Gg\s+Gj\s+iW/gi, '16 মি.মি কেএসএমএল রড'],
    [/12\s*wg[:.]\s*wj\s+‡K\s+Gm\s+Gg\s+Gj\s+iW/gi, '12 মি.মি কেএসএমএল রড'],
    [/10\s*wg[:.]\s*wj\s+‡K\s+Gm\s+Gg\s+Gj\s+iW/gi, '10 মি.মি কেএসএমএল রড'],
    [/8\s*wg[:.]\s*wj\s+‡K\s+Gm\s+Gg\s+Gj\s+iW/gi, '8 মি.মি কেএসএমএল রড'],

    // Anwar / AKS rod
    [/(?:10|12|16)\s*wg[:.]\s*wj\s+Av‡bvqvi\s+iW/gi, (m: string) => m.replace(/wg[:.]\s*wj/gi, 'মি.মি').replace(/Av‡bvqvi/g, 'আনোয়ার').replace(/iW/g, 'রড')],
    [/(?:10|12|16)\s*wg[:.]\s*wj\s+G‡KGm\s+iW/gi, (m: string) => m.replace(/wg[:.]\s*wj/gi, 'মি.মি').replace(/G‡KGm/g, 'একেএস').replace(/iW/g, 'রড')],

    // Charges
    [/‡jevwi|‡jevix/gi, 'লেবার বিল'],
    [/fvov/gi, 'ভাড়া']
  ];

  for (const [pattern, replacement] of PHRASES) {
    if (typeof replacement === 'string') {
      str = str.replace(pattern, replacement);
    } else {
      str = str.replace(pattern, replacement as any);
    }
  }

  // 2. Individual Brand tokens anywhere in text (handles already partially converted text like "10 মি.মি Gm wm Avi Gg রড")
  str = str.replace(/Gm\s+wm\s+Avi\s+Gg/gi, 'এসসিআরএম');
  str = str.replace(/we\s+Gm\s+Avi\s+Gg/gi, 'বিএসআরএম');
  str = str.replace(/G\s+Gm\s+Avi\s+Gg/gi, 'বিএসআরএম');
  str = str.replace(/‡K\s+Gm\s+Gg\s+Gj/gi, 'কেএসএমএল');
  str = str.replace(/Av‡bvqvi/gi, 'আনোয়ার');
  str = str.replace(/G‡KGm/gi, 'একেএস');
  str = str.replace(/†d«m/gi, 'ফ্রেশ');
  str = str.replace(/iW/g, 'রড');
  str = str.replace(/wg[:.]\s*wj/gi, 'মি.মি');

  // Normalize multi-spaces
  return str.replace(/\s+/g, ' ').trim();
}

export const isCementProduct = (item?: { name?: string; unit?: string; category?: string } | null): boolean => {
  if (!item) return false;
  const n = (item.name || '').toLowerCase();
  const u = (item.unit || '').toLowerCase();
  const c = ((item as any).category || '').toLowerCase();

  if (u.includes('বস্তা') || u.includes('ব্যাগ') || u.includes('bag')) return true;
  if (c.includes('সিমেন্ট') || c.includes('cement')) return true;

  return (
    n.includes('সিমেন্ট') || n.includes('cement') ||
    n.includes('হোলসিম') || n.includes('holcim') ||
    n.includes('কোস্টাল') || n.includes('coastal') ||
    n.includes('সুপারক্রিট') || n.includes('supercrete') ||
    n.includes('কিং ব্র্যান্ড') || n.includes('king') ||
    n.includes('অ্যাংকর') || n.includes('anchor') ||
    n.includes('আকিজ') || n.includes('akij') ||
    n.includes('শাহ') || n.includes('shah') ||
    n.includes('সেভেন রিংস') || n.includes('seven rings') ||
    n.includes('স্ট্রং স্ট্রাকচার') ||
    n.includes('pcc') || n.includes('opc')
  );
};

export const isRodProduct = (item?: { name?: string; unit?: string; category?: string } | null): boolean => {
  if (!item) return false;
  const n = (item.name || '').toLowerCase();
  const u = (item.unit || '').toLowerCase();
  const c = ((item as any).category || '').toLowerCase();

  if (u.includes('কেজি') || u.includes('টন') || u.includes('kg') || u.includes('ton')) return true;
  if (c.includes('রড') || c.includes('rod')) return true;

  return (
    n.includes('রড') || n.includes('rod') ||
    n.includes('মিমি') || n.includes('মি.মি') || n.includes('মিলি') || n.includes('mm') ||
    n.includes('রিং') || n.includes('ring') ||
    n.includes('বিএসআরএম') || n.includes('bsrm') ||
    n.includes('এসসিআরএম') || n.includes('scrm') ||
    n.includes('কেএসএমএল') || n.includes('ksml') ||
    n.includes('এফএসএল') || n.includes('fsl') ||
    n.includes('ডিএসআরএম') || n.includes('dsrm') ||
    n.includes('থার্মেক্স') || n.includes('thermax') ||
    n.includes('এইচকেজি') || n.includes('আইআরএমএল') || n.includes('আইআরএল')
  );
};

