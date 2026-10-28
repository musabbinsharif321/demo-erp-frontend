'use client';

import { useEffect } from 'react';

/**
 * Global component that disables mouse wheel value increment/decrement
 * on all number input fields across the entire application.
 * When scrolling the mouse over a focused number input, it blurs the field
 * so the page scrolls smoothly and the entered number remains untouched.
 */
export function NumberInputWheelDisable() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        activeEl.tagName === 'INPUT' &&
        (activeEl as HTMLInputElement).type === 'number'
      ) {
        (activeEl as HTMLInputElement).blur();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  return null;
}
