'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { transliterateWord } from '@/lib/banglaPhonetic';
import { BIJOY_KEY_MAP, BIJOY_G_VOWELS, IS_PRE_KAR, bijoyClassicToUnicode } from '@/lib/bijoyKeyboard';

export type BanglaTypingMode = 'bijoy' | 'avro';

interface BanglaInputContextType {
  isBanglaEnabled: boolean;
  typingMode: BanglaTypingMode;
  setTypingMode: (mode: BanglaTypingMode) => void;
  toggleTypingMode: () => void;
}

const BanglaInputContext = createContext<BanglaInputContextType>({
  isBanglaEnabled: true,
  typingMode: 'bijoy',
  setTypingMode: () => {},
  toggleTypingMode: () => {},
});

export const useBanglaInput = () => useContext(BanglaInputContext);

export function BanglaInputProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Always true: No English typing allowed in ERP (except login and explicit no-bangla fields)
  const isBanglaEnabled = true;

  // Typing mode: 'bijoy' (Default) or 'avro'
  const [typingMode, setTypingModeState] = useState<BanglaTypingMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('dokan_bangla_mode');
        if (saved === 'avro' || saved === 'bijoy') {
          return saved;
        }
      } catch {}
    }
    return 'bijoy'; // Bijoy 52 layout as primary default
  });

  const setTypingMode = useCallback((mode: BanglaTypingMode) => {
    setTypingModeState(mode);
    try {
      localStorage.setItem('dokan_bangla_mode', mode);
    } catch {}
    if (mode === 'bijoy') {
      toast.success('বিজয় কিবোর্ড মোড সক্রিয় (Ctrl+Alt+V)', { id: 'kb-mode-toast', duration: 2000 });
    } else {
      toast.success('অভ্র ফনেটিক মোড সক্রিয় (Ctrl+M)', { id: 'kb-mode-toast', duration: 2000 });
    }
  }, []);

  const toggleTypingMode = useCallback(() => {
    setTypingModeState((prev) => {
      const next = prev === 'bijoy' ? 'avro' : 'bijoy';
      try {
        localStorage.setItem('dokan_bangla_mode', next);
      } catch {}
      if (next === 'bijoy') {
        toast.success('বিজয় কিবোর্ড মোড সক্রিয় (Ctrl+Alt+V)', { id: 'kb-mode-toast', duration: 2000 });
      } else {
        toast.success('অভ্র ফনেটিক মোড সক্রিয় (Ctrl+M)', { id: 'kb-mode-toast', duration: 2000 });
      }
      return next;
    });
  }, []);

  // Bijoy state tracking for pre-kar and link key (g)
  const pendingPreKarRef = useRef<string | null>(null);
  const pendingGRef = useRef<boolean>(false);

  // Keyboard shortcut listeners (Ctrl+Alt+V for Bijoy, Ctrl+M / F12 to toggle mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bijoy 52 standard shortcut: Ctrl+Alt+V or Ctrl+Alt+B
      if (e.ctrlKey && e.altKey && (e.key === 'v' || e.key === 'V' || e.key === 'b' || e.key === 'B')) {
        setTypingMode('bijoy');
        return;
      }
      // Mode toggle: Ctrl+M or F12
      if ((e.ctrlKey && (e.key === 'm' || e.key === 'M')) || e.key === 'F12') {
        e.preventDefault();
        toggleTypingMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTypingMode, toggleTypingMode]);

  // Main input interceptor: ensures ONLY Bangla is typed
  useEffect(() => {
    const handleBeforeInput = (e: InputEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;

      // Bypass completely on login page and settings page
      if (pathname === '/login' || pathname?.startsWith('/settings')) {
        return;
      }

      // Skip non-text inputs (password, date, number, etc.) and auth/pin/username fields
      const inputType = target.getAttribute('type') || 'text';
      const inputName = (target.getAttribute('name') || '').toLowerCase();
      const inputAutoComplete = (target.getAttribute('autocomplete') || '').toLowerCase();
      const isPasswordOrPinOrAuth = 
        ['password', 'email', 'file', 'checkbox', 'radio', 'range', 'color', 'date', 'time', 'datetime-local', 'number'].includes(inputType) ||
        inputName.includes('password') || inputName.includes('pin') || inputName.includes('username') || inputName.includes('email') ||
        inputAutoComplete.includes('password') || inputAutoComplete.includes('username') || inputAutoComplete.includes('email');

      if (isPasswordOrPinOrAuth) {
        return;
      }

      if (
        target.dataset.noBangla === 'true' || 
        target.getAttribute('lang') === 'en' || 
        target.classList.contains('no-bangla') ||
        target.closest('[data-no-bangla="true"]')
      ) {
        return;
      }

      const data = e.data;
      if (!data) return;

      // 1. If incoming data is ALREADY Bengali Unicode (from Bijoy 52 Unicode mode, Avro, or mobile):
      // Allow it to pass through directly without interference
      if (/[\u0980-\u09FF]/.test(data)) {
        pendingPreKarRef.current = null;
        pendingGRef.current = false;
        return;
      }

      // Convert English digits 0-9 directly to Bengali digits ০-৯
      if (/^[0-9]$/.test(data)) {
        e.preventDefault();
        const bnDigit = '০১২৩৪৫৬৭৮৯'[parseInt(data, 10)];
        insertTextAtCursor(target, bnDigit);
        pendingPreKarRef.current = null;
        pendingGRef.current = false;
        return;
      }

      // 2. Only intercept printable ASCII characters to turn them into Bangla
      if (!/^[a-zA-Z`^:$;\\|]$/.test(data)) {
        pendingPreKarRef.current = null;
        pendingGRef.current = false;
        return;
      }

      e.preventDefault();

      // ==========================================
      // BIJOY KEYBOARD ENGINE
      // ==========================================
      if (typingMode === 'bijoy') {
        // Handle pre-kars: d (ি), c (ে), C (ৈ)
        if (IS_PRE_KAR[data]) {
          pendingPreKarRef.current = IS_PRE_KAR[data];
          return;
        }

        // Handle link key: g (্)
        if (data === 'g') {
          pendingGRef.current = true;
          return;
        }

        // If 'g' was pressed previously:
        if (pendingGRef.current) {
          pendingGRef.current = false;

          // Check if it's an independent vowel (g + f = আ, g + d = ই, etc.)
          if (BIJOY_G_VOWELS[data]) {
            const vowel = BIJOY_G_VOWELS[data];
            insertTextAtCursor(target, vowel);
            return;
          }

          // Otherwise, it was a link (্) followed by a consonant (e.g., j + g + j = ক্ক)
          const nextBn = BIJOY_KEY_MAP[data] || data;
          insertTextAtCursor(target, '্' + nextBn);
          return;
        }

        // Get base Bengali character for this key
        const bnChar = BIJOY_KEY_MAP[data] || data;

        // If there was a pending pre-kar (e.g. 'd' (ি) was pressed before 'j' (ক))
        if (pendingPreKarRef.current) {
          const kar = pendingPreKarRef.current;
          pendingPreKarRef.current = null;
          // In Bengali Unicode, consonant comes FIRST, then kar: 'ক' + 'ি' = 'কি'
          insertTextAtCursor(target, bnChar + kar);
          return;
        }

        // Normal Bijoy character insertion
        insertTextAtCursor(target, bnChar);
        return;
      }

      // ==========================================
      // AVRO PHONETIC ENGINE
      // ==========================================
      const selectionStart = target.selectionStart ?? target.value.length;
      const selectionEnd = target.selectionEnd ?? target.value.length;
      const val = target.value;

      let wordStart = selectionStart;
      while (wordStart > 0 && /^[a-zA-Z0-9`^:]$/.test(val[wordStart - 1])) {
        wordStart--;
      }

      const currentWordPrefix = val.substring(wordStart, selectionStart);
      const newWordRaw = currentWordPrefix + data;
      const transliteratedWord = transliterateWord(newWordRaw);

      const before = val.substring(0, wordStart);
      const after = val.substring(selectionEnd);
      const nextValue = before + transliteratedWord + after;
      const newCursorPos = before.length + transliteratedWord.length;

      const nativeSetter = Object.getOwnPropertyDescriptor(
        target instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        'value'
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(target, nextValue);
      } else {
        target.value = nextValue;
      }

      target.setSelectionRange(newCursorPos, newCursorPos);
      target.dispatchEvent(new Event('input', { bubbles: true }));
    };

    // Handle paste event: convert any Bijoy Classic (SutonnyMJ) or English numbers to Bengali
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
      if (pathname === '/login' || pathname?.startsWith('/settings')) return;

      const inputType = target.getAttribute('type') || 'text';
      const inputName = (target.getAttribute('name') || '').toLowerCase();
      const inputAutoComplete = (target.getAttribute('autocomplete') || '').toLowerCase();
      const isPasswordOrPinOrAuth = 
        ['password', 'email', 'file', 'checkbox', 'radio', 'range', 'color', 'date', 'time', 'datetime-local', 'number'].includes(inputType) ||
        inputName.includes('password') || inputName.includes('pin') || inputName.includes('username') || inputName.includes('email') ||
        inputAutoComplete.includes('password') || inputAutoComplete.includes('username') || inputAutoComplete.includes('email');

      if (isPasswordOrPinOrAuth) return;

      if (
        target.dataset.noBangla === 'true' || 
        target.getAttribute('lang') === 'en' || 
        target.classList.contains('no-bangla') ||
        target.closest('[data-no-bangla="true"]')
      ) return;

      const text = e.clipboardData?.getData('text');
      if (!text) return;

      // If text looks like Bijoy Classic (contains characters like Avwg, †, ‡, etc.)
      const isBijoyClassic = /[†‡‰Š]/.test(text) || (/\b(Av|ev|Avg|wb|wK)\b/.test(text));
      if (isBijoyClassic) {
        e.preventDefault();
        const converted = bijoyClassicToUnicode(text);
        insertTextAtCursor(target, converted);
        return;
      }

      // Convert English numbers 0-9 to Bengali ০-৯ on paste
      if (/[0-9]/.test(text)) {
        e.preventDefault();
        const bnNumbers = text.replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);
        insertTextAtCursor(target, bnNumbers);
      }
    };

    document.addEventListener('beforeinput', handleBeforeInput as any);
    document.addEventListener('paste', handlePaste as any);
    return () => {
      document.removeEventListener('beforeinput', handleBeforeInput as any);
      document.removeEventListener('paste', handlePaste as any);
    };
  }, [typingMode]);

  return (
    <BanglaInputContext.Provider value={{ isBanglaEnabled, typingMode, setTypingMode, toggleTypingMode }}>
      {children}
    </BanglaInputContext.Provider>
  );
}

/**
 * Helper to insert text at cursor position in input or textarea
 */
function insertTextAtCursor(target: HTMLInputElement | HTMLTextAreaElement, text: string) {
  let start = 0;
  let end = 0;
  try {
    start = target.selectionStart ?? (target.value ? target.value.length : 0);
    end = target.selectionEnd ?? (target.value ? target.value.length : 0);
  } catch {
    start = target.value ? target.value.length : 0;
    end = target.value ? target.value.length : 0;
  }
  const val = target.value || '';
  const nextValue = val.substring(0, start) + text + val.substring(end);
  const newCursorPos = start + text.length;

  const nativeSetter = Object.getOwnPropertyDescriptor(
    target instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
    'value'
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(target, nextValue);
  } else {
    target.value = nextValue;
  }

  try {
    target.setSelectionRange(newCursorPos, newCursorPos);
  } catch {}
  target.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Empty stub for backward compatibility so existing imports don't break.
 * Returns null so NO button is rendered anywhere in the UI.
 */
export function BanglaKeyboardToggle(_props: { className?: string }) {
  return null;
}
