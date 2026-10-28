// Complete Bijoy 52 Keyboard Engine and SutonnyMJ to Unicode Converter

// 1. Bijoy Key to Unicode Bengali character mapping
export const BIJOY_KEY_MAP: Record<string, string> = {
  // Consonants
  'j': 'ক', 'J': 'খ',
  'o': 'গ', 'O': 'ঘ',
  'q': 'ঙ', 'Q': 'ং',
  'y': 'চ', 'Y': 'ছ',
  'u': 'জ', 'U': 'ঝ',
  'I': 'ঞ',
  't': 'ট', 'T': 'ঠ',
  'e': 'ড', 'E': 'ঢ',
  'B': 'ণ',
  'k': 'ত', 'K': 'থ',
  'l': 'দ', 'L': 'ধ',
  'b': 'ন',
  'r': 'প', 'R': 'ফ',
  'h': 'ব', 'H': 'ভ',
  'm': 'ম',
  'z': '্য', 'Z': 'য',
  'v': 'র', 'V': 'ল',
  'M': 'শ', 'N': 'ষ',
  'n': 'স',
  'i': 'হ',
  'p': 'ড়', 'P': 'ঢ়',
  'w': 'য়', 'W': 'ৎ',
  '\\': 'ৎ', '|': 'ৎ',
  ':': 'ঃ',
  '^': 'ঁ',
  '$': '৳',

  // Vowel Signs (কার)
  'f': 'া',
  'd': 'ি',
  'D': 'ী',
  's': 'ু',
  'S': 'ূ',
  'a': 'ৃ',
  'c': 'ে',
  'C': 'ৈ',
  'x': 'ো',
  'X': 'ৌ',

  // Link / Hasant
  'g': '্',

  // Independent Vowels
  'F': 'অ',

  // Digits
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
};

// Vowels formed with Link 'g' + Kar
export const BIJOY_G_VOWELS: Record<string, string> = {
  'f': 'আ', // g + f = আ
  'd': 'ই', // g + d = ই
  'D': 'ঈ', // g + D = ঈ
  's': 'উ', // g + s = উ
  'S': 'ঊ', // g + S = ঊ
  'a': 'ঋ', // g + a = ঋ
  'c': 'এ', // g + c = এ
  'C': 'ঐ', // g + C = ঐ
  'x': 'ও', // g + x = ও
  'X': 'ঔ', // g + X = ঔ
};

// Pre-kars in Bijoy typing (typed before consonant in Bijoy layout)
export const IS_PRE_KAR: Record<string, string> = {
  'd': 'ি',
  'c': 'ে',
  'C': 'ৈ',
};

/**
 * Converts Bijoy Classic / SutonnyMJ ANSI text to pure Unicode Bengali.
 */
export function bijoyClassicToUnicode(src: string): string {
  if (!src) return '';

  let text = src;

  // Basic character replacements
  const repMap: Record<string, string> = {
    '&': '্',
    'Av': 'আ',
    'A': 'অ',
    'B': 'ই',
    'C': 'ঈ',
    'D': 'উ',
    'E': 'ঊ',
    'F': 'ঋ',
    'G': 'এ',
    'H': 'ঐ',
    'I': 'ও',
    'J': 'ঔ',
    'a': 'ম্ন',
    'b': 'ঞ',
    'c': 'প',
    'd': 'দ',
    'e': 'জ',
    'f': 'া',
    'g': '্',
    'h': 'ব',
    'i': 'হ',
    'j': 'ক',
    'k': 'গ',
    'l': 'দ',
    'm': 'ম',
    'n': 'ন',
    'o': 'গ',
    'p': 'ণ',
    'q': 'ঙ',
    'r': 'র',
    's': 'স',
    't': 'ট',
    'u': 'ু',
    'v': 'া',
    'w': 'ি',
    'x': 'ী',
    'y': 'ু',
    'z': 'য',
    '~': 'ূ',
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
  };

  // Reorder pre-kar symbols in SutonnyMJ (w, †, ‡, ‰)
  text = text.replace(/w([a-zA-Z\u0980-\u09FF])/g, '$1ি');
  text = text.replace(/[†‡]([a-zA-Z\u0980-\u09FF])v/g, '$1ো');
  text = text.replace(/[†‡]([a-zA-Z\u0980-\u09FF])Š/g, '$1ৌ');
  text = text.replace(/[†‡]([a-zA-Z\u0980-\u09FF])/g, '$1ে');
  text = text.replace(/‰([a-zA-Z\u0980-\u09FF])/g, '$1ৈ');

  let res = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    res += repMap[ch] || ch;
  }

  return res;
}
