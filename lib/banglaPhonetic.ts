// Avro-compatible phonetic Bengali parser engine for browser input
// Converts Romanized phonetic Bengali (e.g. "rohim", "dhaka", "bsrm", "khoroch") into authentic Bengali Unicode.

const VOWEL_MAP_INDEPENDENT: Record<string, string> = {
  'a': 'আ',
  'aa': 'আ',
  'A': 'আ',
  'i': 'ই',
  'I': 'ঈ',
  'ee': 'ঈ',
  'u': 'উ',
  'U': 'ঊ',
  'oo': 'ঊ',
  'e': 'এ',
  'E': 'এ',
  'o': 'অ',
  'O': 'ও',
  'oi': 'ঐ',
  'OI': 'ঐ',
  'ou': 'ঔ',
  'OU': 'ঔ',
  'ow': 'ঔ',
  'rri': 'ঋ',
};

const VOWEL_MAP_KAR: Record<string, string> = {
  'a': 'া',
  'aa': 'া',
  'A': 'া',
  'i': 'ি',
  'I': 'ী',
  'ee': 'ী',
  'u': 'ু',
  'U': 'ূ',
  'oo': 'ূ',
  'e': 'ে',
  'E': 'ে',
  'oi': 'ৈ',
  'OI': 'ৈ',
  'o': 'ো',
  'O': 'ো',
  'ou': 'ৌ',
  'OU': 'ৌ',
  'ow': 'ৌ',
  'rri': 'ৃ',
};

const CONJUNCTS_3: Record<string, string> = {
  'kkh': 'ক্ষ',
  'kSh': 'ক্ষ',
  'ggy': 'জ্ঞ',
  'Ngk': 'ঙ্ক',
  'Ngg': 'ঙ্গ',
  'nch': 'ঞ্চ',
  'njh': 'ঞ্ঝ',
  'nTh': 'ণ্ঠ',
  'nDh': 'ণ্ঢ',
  'sth': 'স্থ',
  'sph': 'স্ফ',
  'shh': 'ষ',
  'chh': 'ছ',
  'STh': 'ষ্ঠ',
  'skh': 'স্খ',
  'str': 'স্ত্র',
  'spr': 'স্প্র',
  'ndr': 'ন্দ্র',
  'ndh': 'ন্ধ',
  'ntr': 'ন্ত্র',
  'bhd': 'ব্ধ',
  'kTr': 'ক্ট্র',
  'shc': 'শ্চ',
  'shn': 'শ্ন',
  'shm': 'শ্ম',
  'shl': 'শ্ল',
  'shb': 'শ্ব',
  'Sch': 'শ্ছ',
};

const CONJUNCTS_2: Record<string, string> = {
  'kh': 'খ',
  'gh': 'ঘ',
  'Ng': 'ঙ',
  'NG': 'ঞ',
  'ch': 'চ',
  'Ch': 'ছ',
  'jh': 'ঝ',
  'Th': 'ঠ',
  'Dh': 'ঢ',
  'th': 'থ',
  'dh': 'ধ',
  'ph': 'ফ',
  'bh': 'ভ',
  'sh': 'শ',
  'Sh': 'ষ',
  'Rh': 'ঢ়',
  'kk': 'ক্ক',
  'kt': 'ক্ত',
  'ks': 'ক্স',
  'kx': 'ক্ষ',
  'gg': 'জ্ঞ',
  'gn': 'গ্ন',
  'gm': 'গ্ম',
  'gl': 'গ্ল',
  'cc': 'চ্চ',
  'jj': 'জ্জ',
  'jT': 'জ্ট',
  'TT': 'ট্ট',
  'DD': 'ড্ড',
  'NT': 'ণ্ট',
  'ND': 'ণ্ড',
  'NN': 'ণ্ণ',
  'tt': 'ত্ত',
  'tT': 'ত্ট',
  'tn': 'ত্ন',
  'tm': 'ত্ম',
  'tr': 'ত্র',
  'dd': 'দ্দ',
  'db': 'দ্ব',
  'dm': 'দ্ম',
  'nn': 'ন্ন',
  'nt': 'ন্ত',
  'nd': 'ন্দ',
  'ns': 'ন্স',
  'pt': 'প্ত',
  'pn': 'প্ন',
  'pp': 'প্প',
  'pl': 'প্ল',
  'ps': 'প্স',
  'bd': 'ব্দ',
  'bb': 'ব্ব',
  'bl': 'ব্ল',
  'mn': 'ম্ন',
  'mp': 'ম্প',
  'mf': 'ম্ফ',
  'mb': 'ম্ব',
  'mm': 'ম্ম',
  'ml': 'ম্ল',
  'lt': 'ল্ত',
  'ld': 'ল্দ',
  'lk': 'ল্ক',
  'lg': 'ল্গ',
  'lp': 'ল্প',
  'lb': 'ল্ব',
  'lm': 'ল্ম',
  'll': 'ল্ল',
  'Sk': 'ষ্ক',
  'ST': 'ষ্ট',
  'Sp': 'ষ্প',
  'Sm': 'ীষ্ম',
  'sk': 'স্ক',
  'st': 'স্ত',
  'sn': 'স্ন',
  'sp': 'স্প',
  'sb': 'স্ব',
  'sm': 'স্ম',
  'sl': 'স্ল',
  'hn': 'হ্ন',
  'hm': 'হ্ম',
  'hl': 'হ্ল',
  'hb': 'হ্ব',
  'hr': 'হ্র',
  'ng': 'ং',
  't`': 'ৎ',
};

const CONSONANT_MAP_1: Record<string, string> = {
  'k': 'ক',
  'K': 'ক',
  'g': 'গ',
  'G': 'গ',
  'c': 'চ',
  'C': 'চ',
  'j': 'জ',
  'J': 'জ',
  'T': 'ট',
  't': 'ত',
  'D': 'ড',
  'd': 'দ',
  'N': 'ণ',
  'n': 'ন',
  'p': 'প',
  'P': 'প',
  'f': 'ফ',
  'F': 'ফ',
  'b': 'ব',
  'B': 'ব',
  'v': 'ভ',
  'V': 'ভ',
  'm': 'ম',
  'M': 'ম',
  'z': 'য',
  'Z': 'য',
  'r': 'র',
  'R': 'ড়',
  'l': 'ল',
  'L': 'ল',
  'S': 'শ',
  's': 'স',
  'h': 'হ',
  'H': 'হ',
  'y': 'য়',
  'Y': 'য়',
  'w': 'ওয়',
  'W': 'ওয়',
  'q': 'ক',
  'Q': 'ক',
  'x': 'ক্স',
  'X': 'ক্স',
};

const DIGITS_MAP: Record<string, string> = {
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

// Check if a character is a vowel key
function isVowelKey(char: string): boolean {
  return /^[aeiouAEIOU]$/.test(char);
}

/**
 * Transliterates a single English/phonetic word into Bengali.
 */
export function transliterateWord(input: string): string {
  if (!input) return '';
  let i = 0;
  let result = '';
  let lastWasConsonant = false;

  while (i < input.length) {
    const char = input[i];

    // Numbers
    if (DIGITS_MAP[char]) {
      result += DIGITS_MAP[char];
      lastWasConsonant = false;
      i++;
      continue;
    }

    // Special markers
    if (char === ':') {
      result += 'ঃ';
      lastWasConsonant = false;
      i++;
      continue;
    }
    if (char === '^') {
      result += 'ঁ';
      lastWasConsonant = false;
      i++;
      continue;
    }

    // Ro-fola handling (consonant + r) e.g. "pr" -> "প্র", "br" -> "ব্র", "gr" -> "গ্র"
    if (lastWasConsonant && (char === 'r' || char === 'R') && (i + 1 >= input.length || isVowelKey(input[i + 1]) || input[i + 1] === 'y')) {
      result += '্' + 'র';
      lastWasConsonant = true;
      i++;
      continue;
    }

    // Yo-fola handling (consonant + y/Z) e.g. "by" -> "ব্য", "ny" -> "ন্য", "ky" -> "ক্য"
    if (lastWasConsonant && (char === 'y' || char === 'Z' || char === 'Y') && (i + 1 >= input.length || isVowelKey(input[i + 1]))) {
      result += '্' + 'য';
      lastWasConsonant = true;
      i++;
      continue;
    }

    // Check 3-char conjuncts/combinations
    if (i + 2 < input.length) {
      const sub3 = input.substring(i, i + 3);
      if (CONJUNCTS_3[sub3]) {
        result += CONJUNCTS_3[sub3];
        lastWasConsonant = true;
        i += 3;
        continue;
      }
      if (sub3 === 'rri') {
        result += lastWasConsonant ? VOWEL_MAP_KAR['rri'] : VOWEL_MAP_INDEPENDENT['rri'];
        lastWasConsonant = false;
        i += 3;
        continue;
      }
    }

    // Check 2-char combinations (vowels or consonants)
    if (i + 1 < input.length) {
      const sub2 = input.substring(i, i + 2);
      
      // 2-char vowels: ee, oo, oi, ou, aa, ow
      if (VOWEL_MAP_INDEPENDENT[sub2]) {
        result += lastWasConsonant ? (VOWEL_MAP_KAR[sub2] || VOWEL_MAP_KAR[sub2.toLowerCase()] || '') : VOWEL_MAP_INDEPENDENT[sub2];
        lastWasConsonant = false;
        i += 2;
        continue;
      }

      // 2-char consonants & conjuncts
      if (CONJUNCTS_2[sub2]) {
        result += CONJUNCTS_2[sub2];
        lastWasConsonant = (sub2 !== 'ng' && sub2 !== 't`');
        i += 2;
        continue;
      }
    }

    // 1-char vowel
    if (VOWEL_MAP_INDEPENDENT[char]) {
      if (lastWasConsonant) {
        if (char === 'o') {
          if (i + 1 < input.length && isVowelKey(input[i + 1])) {
            result += 'ো';
          }
        } else {
          result += VOWEL_MAP_KAR[char] || '';
        }
      } else {
        result += VOWEL_MAP_INDEPENDENT[char];
      }
      lastWasConsonant = false;
      i++;
      continue;
    }

    // 1-char consonant
    if (CONSONANT_MAP_1[char]) {
      result += CONSONANT_MAP_1[char];
      lastWasConsonant = true;
      i++;
      continue;
    }

    // Any other character (punctuations, spaces, etc.)
    result += char;
    lastWasConsonant = false;
    i++;
  }

  return result;
}

/**
 * Transliterates an entire string containing spaces, sentences, or numbers.
 */
export function transliterateBengaliPhonetic(text: string): string {
  if (!text) return '';
  const tokens = text.split(/([\s\n\r\t.,!?;:()[\]{}'"]+)/);
  return tokens.map(token => {
    if (/^[a-zA-Z0-9`^:]+$/.test(token)) {
      return transliterateWord(token);
    }
    return token;
  }).join('');
}
