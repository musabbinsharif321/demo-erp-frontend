'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { api, AuthUserData } from '@/lib/api';

export type UserRole = 'developer' | 'admin' | 'manager' | 'staff';

export interface AuthContextType {
  user: AuthUserData | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole;
  isDeveloper: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  isViewer: boolean;
  canEditInvoice: boolean;
  canDeleteInvoice: boolean;
  canCreateInvoice: boolean;
  canApproveInvoice: boolean;
  canModifyData: boolean;
  login: (usernameOrPhone: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'dokan_auth_token';
const USER_KEY = 'dokan_auth_user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUserData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Hydrate from localStorage on client side after initial mount and sync with backend
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);
        if (savedToken && savedUser) {
          // Verify with backend before confirming state
          try {
            const verifyPromise = api.auth.me();
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 5000)
            );

            const freshUser = await Promise.race([verifyPromise, timeoutPromise]);
            if (freshUser) {
              setToken(savedToken);
              setUser(freshUser);
              localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
            }
          } catch (e: any) {
            // If token invalid, clear state
            if (e?.message?.includes('Invalid token') || e?.message?.includes('401')) {
              setToken(null);
              setUser(null);
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
            } else {
              // Network timeout or temporary backend wake-up delay: fallback to cached user
              setToken(savedToken);
              try {
                setUser(JSON.parse(savedUser));
              } catch {
                setUser(null);
              }
            }
          }
        } else {
          setToken(null);
          setUser(null);
        }
      } catch (e) {
        console.error('Error reading auth from localStorage:', e);
        setToken(null);
        setUser(null);
      } finally {
        setIsInitialized(true);
      }
    };

    initAuth();
  }, []);

  // Listen for unauthorized 401 events dispatched from API calls
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (pathname !== '/login') {
        router.replace('/login');
      }
    };

    window.addEventListener('dokan:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('dokan:unauthorized', handleUnauthorized);
  }, [pathname, router]);

  // Route Protection: Redirect to /login if unauthenticated
  useEffect(() => {
    if (!isInitialized) return;

    if (!user && pathname !== '/login') {
      router.replace('/login');
    } else if (user && pathname === '/login') {
      router.replace('/');
    }
  }, [isInitialized, user, pathname, router]);

  const login = async (usernameOrPhone: string, password = ''): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(usernameOrPhone, password);
      if (res && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Login error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.auth.logout().catch(() => {});
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setIsLoading(false);
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await api.auth.me();
      if (userData) {
        setUser(userData);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
      }
    } catch (e) {
      console.warn('Failed to refresh user:', e);
    }
  };

  // Determine computed role
  const role: UserRole = (user?.role as UserRole) || (user?.is_superuser ? 'developer' : 'admin');
  const isDeveloper = role === 'developer' || !!user?.is_superuser;
  const isAdmin = role === 'admin' || isDeveloper;
  const isManager = role === 'manager';
  const isStaff = (role === 'staff' || (role as string) === 'viewer') && !isAdmin && !isDeveloper && !isManager;
  const isViewer = isStaff; // staff has view-only access

  // Specific Permission Rules:
  // 1. Developer (সর্বোচ্চ অ্যাক্সেস): Full access, can edit and delete invoices.
  // 2. Admin (অ্যাডমিন): Full control, can create invoices, manage customers/suppliers/products/expenses/settings, but CANNOT edit or delete invoices.
  // 3. Manager (ম্যানেজার): Can create invoices, record purchases, add transactions and payments, manage products, but CANNOT access Settings/User management.
  // 4. Staff (স্টাফ / ভিউয়ার): View-only across the system, cannot create, edit, or delete anything.
  const canEditInvoice = isDeveloper;
  const canDeleteInvoice = isDeveloper;
  const canCreateInvoice = isAdmin || isDeveloper || isManager;
  const canApproveInvoice = isAdmin || isDeveloper || isManager;
  const canModifyData = isAdmin || isDeveloper || isManager;

  const isProtected = pathname !== '/login';
  const shouldShowLoader = !isInitialized || (isProtected && !user);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading: isLoading || !isInitialized,
        role,
        isDeveloper,
        isAdmin,
        isManager,
        isStaff,
        isViewer,
        canEditInvoice,
        canDeleteInvoice,
        canCreateInvoice,
        canApproveInvoice,
        canModifyData,
        login,
        logout,
        refreshUser,
      }}
    >
      {shouldShowLoader && isProtected ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf8f5]">
          <div className="flex flex-col items-center gap-4 p-6 text-center animate-in fade-in duration-200">
            <div className="relative w-16 h-16 rounded-2xl bg-white shadow-sm border border-[#b88e2d]/25 flex items-center justify-center p-2.5">
              <Image src="/logo.png" alt="মেসার্স দেলোয়ার এন্ড ব্রাদার্স" width={48} height={48} className="object-contain" priority />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 border-2 border-[#b88e2d] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-semibold text-[#6b583e] font-bengali">
                লোড হচ্ছে...
              </span>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
