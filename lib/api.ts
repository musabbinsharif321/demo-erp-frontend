/**
 * Centralized Dokan ERP API Client Module.
 * Changing API_BASE_URL or configuration here instantly updates API routing across the entire web application.
 */

const rawUrl = process.env.NEXT_PUBLIC_API_URL || '';
export const API_BASE_URL = rawUrl ? (rawUrl.endsWith('/api') ? rawUrl : (rawUrl.endsWith('/') ? `${rawUrl}api` : `${rawUrl}/api`)) : '';

export interface ShopSettingsData {
  id?: number;
  business_name: string;
  phone: string;
  email?: string;
  address?: string;
  tax_number?: string;
  currency: string;
  logo_url?: string;
  receipt_footer?: string;
  commission_pin?: string;
}

export interface CustomerSiteData {
  id?: number | string;
  customer: number | string;
  customer_name?: string;
  name: string;
  address?: string;
  contact_person?: string;
  contact_phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PartyData {
  id?: string | number;
  party_type: 'customer' | 'supplier' | 'engineer' | 'both';
  name: string;
  business_name?: string;
  customer_type?: string;
  supply_type?: string;
  phone: string;
  alt_phone?: string;
  email?: string;
  country?: string;
  division?: string;
  district?: string;
  thana?: string;
  address?: string;
  postcode?: string;
  id_type?: string;
  nid?: string;
  tin_number?: string;
  opening_balance?: number;
  credit_limit?: number;
  credit_days?: number;
  discount_percent?: number;
  total_due?: number;
  advance_balance?: number;
  total_purchases?: number;
  total_sales?: number;
  joined_date?: string;
  note?: string;
  photo_url?: string;
  sites?: CustomerSiteData[];
}

export interface ProductData {
  id?: string | number;
  name: string;
  sku?: string;
  category?: number | null;
  category_name?: string;
  stock?: number;
  min_stock?: number;
  unit?: string;
  purchase_price: number;
  sell_price: number;
  brand?: string;
  description?: string;
  image_url?: string;
  needs_price_review?: boolean;
}

export interface ProductCostLogEntry {
  transaction_id: number;
  invoice_no: string;
  date: string;
  raw_date: string;
  is_edited?: boolean;
  edited_at?: string;
  recalculation_reason?: string;
  subsequent_purchases_recalculated?: number;
  subsequent_transactions_recalculated?: number;
  was_recomputed_due_to_prior_edit?: boolean;
  transaction_type: string;
  transaction_type_label: string;
  party_name: string;
  quantity: number;
  unit: string;
  rate: number;
  extra_per_unit: number;
  landed_cost: number;
  stock_before: number;
  stock_after: number;
  cost_before: number;
  cost_after: number;
  cost_change: number;
  formula: string;
}

export interface ProductCostLogData {
  product_id: number;
  product_name: string;
  unit: string;
  current_stock: number;
  current_purchase_price: number;
  has_recalculations?: boolean;
  latest_recalculation_date?: string;
  logs: ProductCostLogEntry[];
}

export interface TransactionItemData {
  id?: number;
  product?: number | null;
  product_name: string;
  quantity: number;
  price: number;
  unit?: string;
  total: number;
}

export interface TransactionData {
  id?: string | number;
  invoice_no?: string;
  party?: number | null;
  party_name?: string;
  party_phone?: string;
  party_type?: 'customer' | 'supplier' | 'engineer';
  customer_site?: number | string | null;
  site_name?: string | null;
  site_address?: string | null;
  site_contact?: string | null;
  transaction_type: 'sale' | 'purchase' | 'sale_return' | 'purchase_return' | 'payment_in' | 'payment_out' | 'loan_in';
  status?: string;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_method?: string;
  bank_account?: number | null;
  cheque_number?: string;
  cheque_bank?: string;
  cheque_due_date?: string;
  cheque_status?: 'pending' | 'cleared' | 'bounced';
  notes?: string;
  created_at?: string;
  items?: TransactionItemData[];
}

export interface ExpenseData {
  id?: string | number;
  category?: number | null;
  category_name?: string;
  title: string;
  amount: number;
  date?: string;
  payment_method?: string;
  bank_account?: number | null;
  reference_no?: string;
  notes?: string;
}

export interface HawlatData {
  id?: string | number;
  person_name: string;
  amount: number;
  note?: string;
  date?: string;
  is_settled?: boolean;
  settled_at?: string;
  created_at?: string;
}

export interface BankData {
  id?: number;
  name: string;
  bank_name?: string;
  account_number?: string;
  branch?: string;
  balance?: number;
  created_at?: string;
}

export interface WeeklyStatItem {
  name: string;
  বিক্রয়: number;
  ক্রয়: number;
}

export interface DashboardStats {
  totalSales: number;
  monthlySales: number;
  totalPurchases: number;
  monthlyPurchases: number;
  totalDues: number;
  totalExpenses: number;
  monthlyExpenses: number;
  totalCash: number;
  totalBank: number;
  lowStockCount: number;
  totalProductsCount: number;
  weeklyData?: WeeklyStatItem[];
  recentTransactions: TransactionData[];
}

export interface AuthUserData {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  role: 'developer' | 'admin' | 'manager' | 'staff' | 'viewer';
  role_display?: string;
  role_badge?: string;
  avatar?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  date_joined?: string;
}

export type UserData = AuthUserData;

export interface AuthLoginResponse {
  token: string;
  user: AuthUserData;
  message: string;
}

// Request Helper
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('dokan_auth_token') : null;
  const authHeaders: Record<string, string> = {};
  if (token && /^[a-f0-9]{30,}$/i.test(token.trim())) {
    authHeaders['Authorization'] = `Token ${token.trim()}`;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...authHeaders,
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson: any = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {}

      if (response.status === 401 && (errorJson?.detail === 'Invalid token.' || errorText.includes('Invalid token') || response.status === 401)) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('dokan_auth_token');
          localStorage.removeItem('dokan_auth_user');
          window.dispatchEvent(new Event('dokan:unauthorized'));
        }
      }

      if (errorJson) {
        if (errorJson.detail) throw new Error(errorJson.detail);
        if (errorJson.error) throw new Error(errorJson.error);
        if (typeof errorJson === 'object' && !Array.isArray(errorJson)) {
          for (const key of Object.keys(errorJson)) {
            const val = errorJson[key];
            if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
              throw new Error(val[0]);
            } else if (typeof val === 'string') {
              throw new Error(val);
            }
          }
        }
      }

      throw new Error(`API Error [${response.status} ${response.statusText}]: ${errorText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(`Django ব্যাকএন্ড সার্ভারের সাথে সংযোগ করা যায়নি (${API_BASE_URL})। অনুগ্রহ করে ব্যাকএন্ড সার্ভার চালু রাখুন: python backend/manage.py runserver 8000`);
    }
    throw err;
  }
}

// Export Centralized API Methods
export const api = {
  // Settings
  settings: {
    get: async (): Promise<ShopSettingsData> => {
      try {
        const list: any = await request<ShopSettingsData[]>('/settings/');
        const arr = Array.isArray(list) ? list : (list?.results || []);
        return arr.length > 0 ? arr[0] : {
          business_name: 'মেসার্স দেলোয়ার এন্ড ব্রাদার্স',
          phone: '০১৭১২-০১৪২২৫',
          currency: '৳'
        };
      } catch (e) {
        return {
          business_name: 'মেসার্স দেলোয়ার এন্ড ব্রাদার্স',
          phone: '০১৭১২-০১৪২২৫',
          currency: '৳'
        };
      }
    },
    update: async (id: number, data: Partial<ShopSettingsData>): Promise<ShopSettingsData> => {
      return request<ShopSettingsData>(`/settings/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }
  },

  // Parties (Customers, Suppliers & Engineers)
  parties: {
    list: async (params?: { party_type?: 'customer' | 'supplier' | 'engineer' | 'both'; search?: string }): Promise<PartyData[]> => {
      try {
        const query = new URLSearchParams();
        if (params?.party_type) query.append('party_type', params.party_type);
        if (params?.search) query.append('search', params.search);
        const queryStr = query.toString() ? `?${query.toString()}` : '';
        const res: any = await request<PartyData[]>(`/parties/${queryStr}`);
        const arr = Array.isArray(res) ? res : (res?.results || []);
        return arr.map((p: any) => ({
          ...p,
          opening_balance: Number(p.opening_balance || 0),
          credit_limit: Number(p.credit_limit || 0),
          credit_days: Number(p.credit_days || 30),
          discount_percent: Number(p.discount_percent || 0),
          total_due: Number(p.total_due || 0),
          advance_balance: Number(p.advance_balance || 0),
          total_purchases: Number(p.total_purchases || 0),
          total_sales: Number(p.total_sales || 0),
        }));
      } catch (e) {
        console.error('parties.list error:', e);
        return [];
      }
    },
    get: async (id: string | number): Promise<PartyData> => {
      const p: any = await request<PartyData>(`/parties/${id}/`);
      return {
        ...p,
        opening_balance: Number(p.opening_balance || 0),
        credit_limit: Number(p.credit_limit || 0),
        credit_days: Number(p.credit_days || 30),
        discount_percent: Number(p.discount_percent || 0),
        total_due: Number(p.total_due || 0),
        advance_balance: Number(p.advance_balance || 0),
        total_purchases: Number(p.total_purchases || 0),
        total_sales: Number(p.total_sales || 0),
      };
    },
    create: async (data: PartyData): Promise<PartyData> => {
      return request<PartyData>('/parties/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string | number, data: Partial<PartyData>): Promise<PartyData> => {
      return request<PartyData>(`/parties/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string | number): Promise<void> => {
      return request<void>(`/parties/${id}/`, { method: 'DELETE' });
    },
    bulkImport: async (parties: any[]): Promise<{ success: boolean; created_count: number; updated_count: number; errors: string[] }> => {
      return request('/parties/bulk-import/', {
        method: 'POST',
        body: JSON.stringify({ parties }),
      });
    },
    bulkImportLedger: async (data: { party_id?: string | number; clear_existing?: boolean; group_by_date?: boolean; entries: any[] }): Promise<{ success: boolean; created_count: number; affected_parties_count: number; errors: string[] }> => {
      return request('/parties/bulk-import-ledger/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },

  // Customer Sites (Multiple Delivery / Project Sites)
  customerSites: {
    list: async (params?: { customer?: string | number; search?: string }): Promise<CustomerSiteData[]> => {
      try {
        const query = new URLSearchParams();
        if (params?.customer) query.append('customer', String(params.customer));
        if (params?.search) query.append('search', params.search);
        const queryStr = query.toString() ? `?${query.toString()}` : '';
        const res: any = await request<CustomerSiteData[]>(`/customer-sites/${queryStr}`);
        return Array.isArray(res) ? res : (res?.results || []);
      } catch (e) {
        console.error('customerSites.list error:', e);
        return [];
      }
    },
    create: async (data: Partial<CustomerSiteData>): Promise<CustomerSiteData> => {
      return request<CustomerSiteData>('/customer-sites/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string | number, data: Partial<CustomerSiteData>): Promise<CustomerSiteData> => {
      return request<CustomerSiteData>(`/customer-sites/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string | number): Promise<void> => {
      return request<void>(`/customer-sites/${id}/`, { method: 'DELETE' });
    }
  },

  // Inventory / Products
  inventory: {
    list: async (params?: { low_stock?: boolean; category?: number; search?: string }): Promise<ProductData[]> => {
      try {
        const query = new URLSearchParams();
        if (params?.low_stock) query.append('low_stock', 'true');
        if (params?.category) query.append('category', String(params.category));
        if (params?.search) query.append('search', params.search);
        const queryStr = query.toString() ? `?${query.toString()}` : '';
        const res: any = await request<ProductData[]>(`/products/${queryStr}`);
        return Array.isArray(res) ? res : (res?.results || []);
      } catch (e) {
        console.error('inventory.list error:', e);
        return [];
      }
    },
    getLowStock: async (): Promise<ProductData[]> => {
      try {
        const res: any = await request<ProductData[]>('/products/?low_stock=true');
        return Array.isArray(res) ? res : (res?.results || []);
      } catch (e) {
        return [];
      }
    },
    create: async (data: ProductData): Promise<ProductData> => {
      return request<ProductData>('/products/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string | number, data: Partial<ProductData>): Promise<ProductData> => {
      return request<ProductData>(`/products/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string | number): Promise<void> => {
      return request<void>(`/products/${id}/`, { method: 'DELETE' });
    },
    getCostLogs: async (productId?: string | number): Promise<ProductCostLogData | ProductCostLogData[]> => {
      try {
        const query = productId ? `?product_id=${productId}` : '';
        return await request<any>(`/products/cost_logs/${query}`);
      } catch (e) {
        console.error('getCostLogs error:', e);
        return productId ? { product_id: Number(productId), product_name: '', unit: '', current_stock: 0, current_purchase_price: 0, logs: [] } : [];
      }
    },
    bulkImport: async (products: any[]): Promise<{ success: boolean; created_count: number; updated_count: number; errors: string[] }> => {
      return request('/products/bulk-import/', {
        method: 'POST',
        body: JSON.stringify({ products }),
      });
    }
  },

  // Categories
  categories: {
    list: async (): Promise<{ id: number; name: string; description?: string }[]> => {
      try {
        const res: any = await request<{ id: number; name: string; description?: string }[]>('/categories/');
        return Array.isArray(res) ? res : (res?.results || []);
      } catch (e) {
        return [];
      }
    },
    create: async (name: string, description?: string) => {
      return request('/categories/', {
        method: 'POST',
        body: JSON.stringify({ name, description })
      });
    }
  },

  // Transactions (Sales, Purchases, Returns, Invoices)
  transactions: {
    list: async (params?: { transaction_type?: string; party?: number; cheque_status?: string; search?: string; include_historical?: boolean | string }): Promise<TransactionData[]> => {
      try {
        const query = new URLSearchParams();
        if (params?.transaction_type) query.append('transaction_type', params.transaction_type);
        if (params?.party) query.append('party', String(params.party));
        if (params?.cheque_status) query.append('cheque_status', params.cheque_status);
        if (params?.search) query.append('search', params.search);
        if (params?.include_historical !== undefined) query.append('include_historical', String(params.include_historical));
        const queryStr = query.toString() ? `?${query.toString()}` : '';
        const res: any = await request<TransactionData[]>(`/transactions/${queryStr}`);
        const arr = Array.isArray(res) ? res : (res?.results || []);
        return arr.map((t: any) => ({
          ...t,
          subtotal: Number(t.subtotal || 0),
          discount: Number(t.discount || 0),
          tax: Number(t.tax || 0),
          total_amount: Number(t.total_amount || 0),
          paid_amount: Number(t.paid_amount || 0),
          due_amount: Number(t.due_amount || 0),
          items: (t.items || []).map((i: any) => ({
            ...i,
            quantity: Number(i.quantity || 0),
            price: Number(i.price || 0),
            total: Number(i.total || 0),
          }))
        }));
      } catch (e) {
        console.error('transactions.list error:', e);
        return [];
      }
    },
    get: async (id: string | number): Promise<TransactionData> => {
      const t: any = await request<TransactionData>(`/transactions/${id}/`);
      return {
        ...t,
        subtotal: Number(t.subtotal || 0),
        discount: Number(t.discount || 0),
        tax: Number(t.tax || 0),
        total_amount: Number(t.total_amount || 0),
        paid_amount: Number(t.paid_amount || 0),
        due_amount: Number(t.due_amount || 0),
        items: (t.items || []).map((i: any) => ({
          ...i,
          quantity: Number(i.quantity || 0),
          price: Number(i.price || 0),
          total: Number(i.total || 0),
        }))
      };
    },
    create: async (data: TransactionData): Promise<TransactionData> => {
      return request<TransactionData>('/transactions/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string | number, data: Partial<TransactionData>): Promise<TransactionData> => {
      return request<TransactionData>(`/transactions/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    approve: async (id: string | number): Promise<TransactionData> => {
      return request<TransactionData>(`/transactions/${id}/approve/`, {
        method: 'POST',
      });
    },
    delete: async (id: string | number): Promise<void> => {
      return request<void>(`/transactions/${id}/`, { method: 'DELETE' });
    }
  },

  // Expenses
  expenses: {
    list: async (params?: { category?: number; search?: string }): Promise<ExpenseData[]> => {
      try {
        const query = new URLSearchParams();
        if (params?.category) query.append('category', String(params.category));
        if (params?.search) query.append('search', params.search);
        const queryStr = query.toString() ? `?${query.toString()}` : '';
        const res: any = await request<ExpenseData[]>(`/expenses/${queryStr}`);
        return Array.isArray(res) ? res : (res?.results || []);
      } catch (e) {
        console.error('expenses.list error:', e);
        return [];
      }
    },
    create: async (data: ExpenseData): Promise<ExpenseData> => {
      return request<ExpenseData>('/expenses/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string | number, data: Partial<ExpenseData>): Promise<ExpenseData> => {
      return request<ExpenseData>(`/expenses/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string | number): Promise<void> => {
      return request<void>(`/expenses/${id}/`, { method: 'DELETE' });
    },
    bulkImport: async (expenses: any[]): Promise<{ success: boolean; created_count: number; errors: string[] }> => {
      return request('/expenses/bulk-import/', {
        method: 'POST',
        body: JSON.stringify({ expenses }),
      });
    }
  },

  // Expense Categories
  expenseCategories: {
    list: async (): Promise<{ id: number; name: string }[]> => {
      try {
        const res: any = await request<{ id: number; name: string }[]>('/expense-categories/');
        return Array.isArray(res) ? res : (res?.results || []);
      } catch (e) {
        return [];
      }
    },
    create: async (data: { name: string }): Promise<{ id: number; name: string }> => {
      return request<{ id: number; name: string }>('/expense-categories/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string | number): Promise<void> => {
      return request<void>(`/expense-categories/${id}/`, { method: 'DELETE' });
    }
  },

  // Banks
  banks: {
    list: async (): Promise<BankData[]> => {
      try {
        const res: any = await request<BankData[]>('/banks/');
        return Array.isArray(res) ? res : (res?.results || []);
      } catch (e) {
        console.error('banks.list error:', e);
        return [];
      }
    },
    create: async (data: Partial<BankData>): Promise<BankData> => {
      return request<BankData>('/banks/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string | number, data: Partial<BankData>): Promise<BankData> => {
      return request<BankData>(`/banks/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string | number): Promise<void> => {
      return request<void>(`/banks/${id}/`, { method: 'DELETE' });
    }
  },

  // Hawlats (Memo Notes)
  hawlats: {
    list: async (): Promise<HawlatData[]> => {
      try {
        const res: any = await request<HawlatData[]>('/hawlats/');
        const arr = Array.isArray(res) ? res : (res?.results || []);
        return arr.map((h: any) => ({
          ...h,
          amount: Number(h.amount || 0)
        }));
      } catch (e) {
        console.error('hawlats.list error:', e);
        return [];
      }
    },
    create: async (data: Partial<HawlatData>): Promise<HawlatData> => {
      return request<HawlatData>('/hawlats/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string | number, data: Partial<HawlatData>): Promise<HawlatData> => {
      return request<HawlatData>(`/hawlats/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string | number): Promise<void> => {
      return request<void>(`/hawlats/${id}/`, { method: 'DELETE' });
    }
  },

  // Dashboard Aggregated Stats
  dashboard: {
    getStats: async (): Promise<DashboardStats> => {
      return request<DashboardStats>('/dashboard/stats/');
    }
  },

  // Authentication & User Management
  auth: {
    login: async (identifierOrEmail: string, password?: string): Promise<AuthLoginResponse> => {
      const cleanIdentifier = (identifierOrEmail || '').trim();
      return request<AuthLoginResponse>('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ 
          email: cleanIdentifier,
          username: cleanIdentifier,
          identifier: cleanIdentifier,
          password 
        }),
      });
    },
    me: async (): Promise<AuthUserData> => {
      return request<AuthUserData>('/auth/me/');
    },
    updateProfile: async (data: { full_name?: string; phone?: string; email?: string; password?: string; avatar?: string }): Promise<AuthUserData> => {
      return request<AuthUserData>('/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    logout: async (): Promise<{ message: string }> => {
      return request<{ message: string }>('/auth/logout/', {
        method: 'POST',
      });
    },
    users: {
      list: async (): Promise<AuthUserData[]> => {
        try {
          const res: any = await request<AuthUserData[]>('/auth/users/');
          return Array.isArray(res) ? res : (res?.results || []);
        } catch (e: any) {
          // If unauthenticated or token expired, return empty list gracefully
          return [];
        }
      },
      create: async (data: { username?: string; password?: string; role: string; full_name?: string; phone?: string; email?: string; avatar?: string; is_active?: boolean }): Promise<AuthUserData> => {
        return request<AuthUserData>('/auth/users/', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
      update: async (id: number | string, data: Partial<{ username: string; password?: string; role: string; full_name?: string; phone?: string; email?: string; avatar?: string; is_active?: boolean }>): Promise<AuthUserData> => {
        return request<AuthUserData>(`/auth/users/${id}/`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },
      delete: async (id: number | string): Promise<void> => {
        return request<void>(`/auth/users/${id}/`, { method: 'DELETE' });
      }
    }
  }
};
