import type { Metadata, Viewport } from 'next';
import { Inter, Hind_Siliguri } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/lib/authContext';
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
  title: 'মেসার্স দেলোয়ার এন্ড ব্রাদার্স - রড ও সিমেন্ট ইআরপি',
  description: 'মেসার্স দেলোয়ার এন্ড ব্রাদার্স - রড ও সিমেন্টের দোকানের সম্পূর্ণ ডিজিটাল ব্যবসা পরিচালনা ব্যবস্থা',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'দেলোয়ার ব্রাদার্স',
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
        <AuthProvider>
          <BanglaInputProvider>
            {children}
            <NumberInputWheelDisable />
            <PwaManager />
            <Toaster position="top-center" richColors />
          </BanglaInputProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

