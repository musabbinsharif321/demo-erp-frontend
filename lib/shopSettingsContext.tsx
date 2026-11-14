'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, ShopSettingsData } from './api';

const CACHE_KEY = 'dokan_shop_settings_cache';

export const DEFAULT_SHOP_NAME = 'ব্রাদার্স এন্টারপ্রাইজ';

const DEFAULT_SETTINGS: ShopSettingsData = {
  business_name: DEFAULT_SHOP_NAME,
  phone: '০১৭১২-০১৪২২৫',
  currency: '৳',
};

interface ShopSettingsContextType {
  settings: ShopSettingsData;
  shopName: string;
  isLoading: boolean;
  refreshSettings: () => Promise<ShopSettingsData>;
  updateSettings: (data: Partial<ShopSettingsData>) => Promise<ShopSettingsData>;
}

const ShopSettingsContext = createContext<ShopSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  shopName: DEFAULT_SHOP_NAME,
  isLoading: false,
  refreshSettings: async () => DEFAULT_SETTINGS,
  updateSettings: async () => DEFAULT_SETTINGS,
});

export function ShopSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ShopSettingsData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(cached) };
        }
      } catch {
        // Ignore malformed cache
      }
    }
    return DEFAULT_SETTINGS;
  });
  const [isLoading, setIsLoading] = useState(true);

  const persistAndSet = useCallback((data: ShopSettingsData) => {
    const merged = { ...DEFAULT_SETTINGS, ...data };
    setSettings(merged);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
      } catch {
        // Ignore storage quota errors
      }
      const name = merged.business_name?.trim() || DEFAULT_SHOP_NAME;
      document.title = `${name} - স্মার্ট বিজনেস ইআরপি`;
    }
    return merged;
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.settings.get();
      return persistAndSet(data);
    } catch {
      return settings;
    } finally {
      setIsLoading(false);
    }
  }, [persistAndSet]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Sync across browser tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CACHE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch {
          // Ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const updateSettings = useCallback(async (data: Partial<ShopSettingsData>) => {
    let targetId = settings.id;
    if (!targetId) {
      const fresh = await api.settings.get();
      targetId = fresh.id || 1;
    }
    const updated = await api.settings.update(targetId, data);
    return persistAndSet(updated);
  }, [settings.id, persistAndSet]);

  const shopName = settings.business_name?.trim() || DEFAULT_SHOP_NAME;

  return (
    <ShopSettingsContext.Provider
      value={{
        settings,
        shopName,
        isLoading,
        refreshSettings,
        updateSettings,
      }}
    >
      {children}
    </ShopSettingsContext.Provider>
  );
}

export function useShopSettings() {
  return useContext(ShopSettingsContext);
}
