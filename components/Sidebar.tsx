'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut,
  TrendingUp, ChevronDown, ChevronRight, Truck, BarChart3,
  AlertTriangle, FileText, Receipt, RotateCcw, Building2,
  DollarSign, PieChart, Landmark, ArrowUpCircle, ArrowDownCircle, PlusCircle, BookOpen, ArrowRightLeft, Scale, PanelLeftClose, PanelLeftOpen, Wallet, Percent, HardHat, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

type MenuItem = {
  name: string;
  icon: any;
  href?: string;
  children?: { name: string; href: string; icon?: any }[];
};

const menuStructure: MenuItem[] = [
  {
    name: 'ড্যাশবোর্ড',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    name: 'পণ্য (স্টক)',
    icon: Package,
    href: '/inventory',
    children: [
      { name: 'সব পণ্য', href: '/inventory', icon: Package },
      { name: 'কম স্টক', href: '/inventory/low-stock', icon: AlertTriangle },
    ],
  },
  {
    name: 'বিক্রয়',
    icon: ShoppingCart,
    href: '/orders',
    children: [
      { name: 'গ্রাহক', href: '/customers', icon: Users },
      { name: 'বিক্রয় অর্ডার', href: '/orders', icon: ShoppingCart },
      { name: 'বিক্রয় চালান', href: '/invoices', icon: Receipt },
      { name: 'বিক্রয় রিটার্ন', href: '/sales/returns', icon: RotateCcw },
    ],
  },
  {
    name: 'ক্রয়',
    icon: Truck,
    href: '/purchases',
    children: [
      { name: 'সাপ্লায়ার', href: '/suppliers', icon: Building2 },
      { name: 'ক্রয় ইনভয়েস', href: '/purchases', icon: Truck },
    ],
  },
  {
    name: 'লেনদেন',
    icon: ArrowUpCircle,
    href: '/transactions',
    children: [
      { name: 'সব লেনদেন', href: '/transactions', icon: ArrowRightLeft },
      { name: 'পেমেন্ট দিন', href: '/transactions?type=expense&action=create', icon: ArrowDownCircle },
      { name: 'পেমেন্ট গ্রহণ', href: '/transactions?type=income&action=create', icon: ArrowUpCircle },
      { name: 'টাকা যোগ', href: '/transactions?type=contra', icon: PlusCircle },
    ],
  },
  {
    name: 'খরচ',
    icon: Wallet,
    href: '/expenses',
  },
  {
    name: 'রিপোর্ট',
    icon: BarChart3,
    href: '/reports',
    children: [
      { name: 'সব রিপোর্ট', href: '/reports?tab=hub', icon: BarChart3 },
      { name: 'স্টক শিট রিপোর্ট', href: '/reports/stock-sheet', icon: Package },
      { name: 'বাকি কাস্টমার তালিকা', href: '/customers/dues', icon: Receipt },
      { name: 'ব্যাংক এর তালিকা', href: '/reports?tab=bank_list', icon: Landmark },
      { name: 'ডেইলী টপসিট', href: '/reports?tab=daily_topsheet', icon: FileText },
      { name: 'ডেইলি রিপোর্ট', href: '/reports?tab=daily_sales', icon: FileText },
      { name: 'ইনকাম বিবরণী (Profit/Loss)', href: '/reports?tab=profit_loss', icon: TrendingUp },
      { name: 'ব্যালেন্স স্টেটমেন্ট', href: '/reports?tab=balance_sheet', icon: Scale },
      { name: 'রড সিমেন্ট ক্রয় বিক্রয় স্টেটমেন্ট', href: '/reports?tab=trade_register', icon: Truck },
      { name: 'পেন্ডিং কমিশন তালিকা', href: '/reports?tab=commissions', icon: Percent },
    ]
  },
  {
    name: 'ইঞ্জিনিয়ার',
    icon: HardHat,
    href: '/engineers',
  },
  {
    name: 'সেটিংস',
    icon: Settings,
    href: '/settings',
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

import { useAuth } from '@/lib/authContext';

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isAdmin, isDeveloper, logout } = useAuth();
  const searchParams = useSearchParams();
  const currentType = searchParams?.get('type');
  
  // State for hover-expand sidebar (Off/Collapsed by default, opens on mouse hover)
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false); // Option to pin sidebar if user clicks pin

  const isExpanded = isHovered || isPinned || mobileOpen;

  const [openMenus, setOpenMenus] = useState<string[]>(() => {
    const active = menuStructure.find(m =>
      m.children?.some(c => {
        const [baseHref] = c.href.split('?');
        return pathname === baseHref || pathname.startsWith(baseHref + '/');
      })
    );
    return active ? [active.name] : [];
  });

  const toggleMenu = (name: string) => {
    setOpenMenus(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleLogout = async () => {
    try { 
      await logout();
    } catch (e) { 
      console.error(e); 
      window.location.href = '/login';
    }
  };

  const handleNavClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const isChildActive = (children: { href: string }[]) =>
    children.some(c => {
      const [baseHref, query] = c.href.split('?');
      if (pathname === baseHref) {
        if (query) {
          const childParams = new URLSearchParams(query);
          let matches = true;
          childParams.forEach((val, key) => {
            if (searchParams?.get(key) !== val) matches = false;
          });
          return matches;
        }
        return true;
      }
      return !query && baseHref !== '/' && pathname.startsWith(baseHref + '/');
    });

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[65] md:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <div 
        className="relative z-[70] flex-shrink-0 print:hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Responsive spacer for desktop only */}
        <div 
          className={cn(
            "h-screen hidden md:block pointer-events-none transition-all duration-300",
            isPinned ? "w-[260px]" : "w-[72px]"
          )} 
        />

        {/* Animated Sidebar Wrapper */}
        <aside 
          className={cn(
            'fixed top-0 left-0 h-screen flex flex-col bg-white/95 backdrop-blur-xl border-r border-slate-200/80 shadow-[4px_0_24px_rgba(0,0,0,0.06)] transition-all duration-300 ease-in-out overflow-hidden z-[70] font-bengali',
            // Mobile: translate in/out as 280px drawer; Desktop: 72px or 260px width
            'w-[280px] max-w-[85vw] md:max-w-none',
            mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            !mobileOpen && (isExpanded ? 'md:w-[260px]' : 'md:w-[72px]')
          )}
        >
          {/* LOGO HEADER */}
          <div className="p-3.5 sm:p-4 border-b border-amber-800/30 bg-gradient-to-br from-[#8c6b1c] via-[#b88e2d] to-[#d4af37] relative overflow-hidden flex items-center justify-between min-h-[64px] flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-0.5 flex-shrink-0 shadow-md border border-white/40 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/logo.png" 
                  alt="মেসার্স দেলোয়ার এন্ড ব্রাদার্স" 
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              {(isExpanded || mobileOpen) && (
                <div className="overflow-hidden whitespace-nowrap transition-all duration-200">
                  <h1 className="text-sm font-black text-white leading-tight drop-shadow-xs">মেসার্স দেলোয়ার এন্ড ব্রাদার্স</h1>
                  <p className="text-[10px] text-amber-100 font-semibold drop-shadow-2xs">রড ও সিমেন্ট ব্যবসা</p>
                </div>
              )}
            </div>

            {/* Desktop Pin Toggle */}
            <div className="flex items-center gap-1">
              {isExpanded && !mobileOpen && (
                <button 
                  onClick={() => setIsPinned(!isPinned)}
                  title={isPinned ? 'সাইডবার পিন খুলুন' : 'সাইডবার পিন করুন'}
                  className="hidden md:flex text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {isPinned ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                </button>
              )}

              {/* Mobile Close Button */}
              {mobileOpen && (
                <button
                  onClick={onCloseMobile}
                  className="md:hidden text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="মেনু বন্ধ করুন"
                >
                  <PanelLeftClose className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* MENU SCROLL AREA */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2.5 py-3 custom-scrollbar">
            <nav className="space-y-1">
              {menuStructure.filter(m => m.href !== '/settings' || isAdmin || isDeveloper).map((item) => {
                const isOpen = openMenus.includes(item.name);
                const hasChildren = !!item.children && item.children.length > 0;
                const isParentActive = hasChildren
                    ? isChildActive(item.children!)
                    : pathname === item.href;

                if (!hasChildren && item.href) {
                  return (
                    <Link key={item.name} href={item.href} onClick={handleNavClick}>
                      <div 
                        title={!isExpanded && !mobileOpen ? item.name : undefined}
                        className={cn(
                          'flex items-center gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer text-sm font-medium relative group',
                          isParentActive
                            ? 'bg-gradient-to-r from-[#b88e2d] to-[#d4af37] text-white font-bold shadow-md shadow-amber-500/25'
                            : 'text-slate-600 hover:bg-amber-50/80 hover:text-amber-800'
                        )}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {(isExpanded || mobileOpen) && (
                          <span className="whitespace-nowrap overflow-hidden transition-all duration-200">
                            {item.name}
                          </span>
                        )}

                        {/* Tooltip hint when collapsed on desktop */}
                        {!isExpanded && !mobileOpen && (
                          <div className="hidden md:block absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
                            {item.name}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                }

                return (
                  <div key={item.name} className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isExpanded) setIsHovered(true);
                        toggleMenu(item.name);
                      }}
                      title={!isExpanded && !mobileOpen ? item.name : undefined}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all cursor-pointer text-sm font-medium group relative',
                        isParentActive
                          ? 'bg-amber-50/90 text-amber-900 font-bold border border-amber-200/60'
                          : 'text-slate-600 hover:bg-amber-50/80 hover:text-amber-800'
                      )}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <item.icon className={cn('w-5 h-5 flex-shrink-0 transition-colors', isParentActive ? 'text-amber-600' : 'text-slate-500 group-hover:text-amber-700')} />
                        {(isExpanded || mobileOpen) && (
                          <span className="flex-1 text-left whitespace-nowrap overflow-hidden">
                            {item.name}
                          </span>
                        )}
                      </div>

                      {(isExpanded || mobileOpen) && (
                        <div>
                          {isOpen
                            ? <ChevronDown className="w-4 h-4 text-slate-400" />
                            : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </div>
                      )}

                      {/* Tooltip hint when collapsed on desktop */}
                      {!isExpanded && !mobileOpen && (
                        <div className="hidden md:block absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
                          {item.name}
                        </div>
                      )}
                    </button>

                    {/* SUBMENU ITEMS */}
                    {(isExpanded || mobileOpen) && isOpen && item.children && (
                      <div className="ml-4 mt-1 mb-2 space-y-1 border-l-2 border-amber-200/80 pl-3 py-1">
                        {item.children.map(child => {
                          const [baseHref, query] = child.href.split('?');
                          let isActive = false;
                          if (pathname === baseHref) {
                            if (query) {
                              const childParams = new URLSearchParams(query);
                              let matches = true;
                              childParams.forEach((val, key) => {
                                if (searchParams?.get(key) !== val) matches = false;
                              });
                              isActive = matches;
                            } else {
                              const currentTab = searchParams?.get('tab');
                              const currentTypeParam = searchParams?.get('type');
                              isActive = !currentTab && !currentTypeParam;
                            }
                          } else if (!query && baseHref !== '/' && pathname.startsWith(baseHref + '/')) {
                            const hasCloserSibling = item.children?.some(other => {
                              const [otherBase] = other.href.split('?');
                              return otherBase !== baseHref && pathname.startsWith(otherBase);
                            });
                            if (!hasCloserSibling) {
                              isActive = true;
                            }
                          }
                          
                          return (
                            <Link key={child.name} href={child.href} onClick={handleNavClick}>
                              <div className={cn(
                                'flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-bold relative',
                                isActive
                                  ? 'bg-gradient-to-r from-[#b88e2d] to-[#d4af37] text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              )}>
                                {child.icon && <child.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-white" : "text-slate-400")} />}
                                <span className="whitespace-nowrap">{child.name}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* FOOTER USER INFO & LOGOUT */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2 flex-shrink-0">
            {(isExpanded || mobileOpen) && user && (
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white flex-shrink-0 shadow-2xs",
                  role === 'developer' ? "bg-purple-600 shadow-purple-600/20" : role === 'manager' ? "bg-emerald-600 shadow-emerald-600/20" : role === 'staff' ? "bg-blue-600 shadow-blue-600/20" : "bg-amber-600 shadow-amber-600/20"
                )}>
                  {role === 'developer' ? '🛠️' : role === 'manager' ? '💼' : role === 'staff' ? '👔' : '👑'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {user.full_name || user.email || user.username}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 truncate">
                    {role === 'developer' ? 'ডেভেলপার' : role === 'manager' ? 'ম্যানেজার' : role === 'staff' ? 'স্টাফ (ভিউয়ার)' : 'অ্যাডমিন'}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('trigger-pwa-install'));
                }
              }}
              title={!isExpanded && !mobileOpen ? 'অ্যাপ ডাউনলোড / ইনস্টল করুন' : undefined}
              className="w-full flex items-center justify-start gap-3 px-3 py-2 rounded-xl text-amber-700 hover:text-amber-800 bg-amber-50/80 hover:bg-amber-100/80 transition-colors text-xs font-bold relative group cursor-pointer border border-amber-200/60"
            >
              <Download className="w-4 h-4 flex-shrink-0 text-amber-600" />
              {(isExpanded || mobileOpen) && <span className="whitespace-nowrap">অ্যাপ ডাউনলোড করুন</span>}

              {!isExpanded && !mobileOpen && (
                <div className="hidden md:block absolute left-full ml-2 px-2.5 py-1 bg-amber-900 text-white text-xs font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
                  অ্যাপ ডাউনলোড করুন
                </div>
              )}
            </button>

            <button
              onClick={handleLogout}
              title={!isExpanded && !mobileOpen ? 'লগ আউট' : undefined}
              className="w-full flex items-center justify-start gap-3 px-3 py-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors text-xs font-bold relative group cursor-pointer"
            >
              <LogOut className="w-4 h-4 flex-shrink-0 text-rose-500" />
              {(isExpanded || mobileOpen) && <span className="whitespace-nowrap">লগ আউট করুন</span>}

              {!isExpanded && !mobileOpen && (
                <div className="hidden md:block absolute left-full ml-2 px-2.5 py-1 bg-rose-900 text-white text-xs font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
                  লগ আউট
                </div>
              )}
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
