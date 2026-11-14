import type { Metadata, Viewport } from 'next';
import { Inter, Hind_Siliguri } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/lib/authContext';
import { ShopSettingsProvider } from '@/lib/shopSettingsContext';
import { BanglaInputProvider } from '@/components/BanglaInputProvider';
import { PwaManager } from '@/components/PwaManager';
import { NumberInputWheelDisable } from '@/components/NumberInputWheelDisable';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const hindSiliguri = Hind_Siliguri({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['bengali'],
  variable: '--font-bengali',
});

export const viewport: Viewport = {
  themeColor: '#b88e2d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'ব্রাদার্স এন্টারপ্রাইজ - স্মার্ট বিজনেস ইআরপি',
  description: 'ব্রাদার্স এন্টারপ্রাইজ - সম্পূর্ণ ডিজিটাল ক্রয়-বিক্রয়, স্টক ও হিসাব পরিচালনা ব্যবস্থা',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ব্রাদার্স এন্টারপ্রাইজ',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={cn(inter.variable, hindSiliguri.variable, "font-bengali")} suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-[#faf8f5] text-[#2e2316] min-h-screen antialiased">
        <ShopSettingsProvider>
          <AuthProvider>
            <BanglaInputProvider>
              {children}
            <NumberInputWheelDisable />
            <PwaManager />
            <Toaster position="top-center" richColors />
          </BanglaInputProvider>
        </AuthProvider>
        </ShopSettingsProvider>
      </body>
    </html>
  );
}

