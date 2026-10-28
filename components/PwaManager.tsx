'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, X, Share, PlusSquare, CheckCircle2, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [showDesktopGuide, setShowDesktopGuide] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      const isIosDevice = typeof window !== 'undefined' && /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
      if (isIosDevice) {
        setShowIosGuide(true);
      } else {
        setShowDesktopGuide(true);
      }
    }
  }, [deferredPrompt]);

  useEffect(() => {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    // 2. Listen for BeforeInstallPromptEvent (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setTimeout(() => setIsInstalled(false), 4000);
    };

    const handleTriggerInstall = () => {
      handleInstallClick();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('trigger-pwa-install', handleTriggerInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('trigger-pwa-install', handleTriggerInstall);
    };
  }, [handleInstallClick]);

  // If already running as standalone app, don't show prompt
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* 1. Success message after installation */}
      {isInstalled && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 font-bengali border border-emerald-500">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <div>
            <p className="font-bold text-sm">অ্যাপ সফলভাবে ইনস্টল হয়েছে!</p>
            <p className="text-xs text-emerald-100 font-medium">হোম স্ক্রিন বা ডেস্কটপ থেকে সরাসরি ব্যবহার করুন।</p>
          </div>
        </div>
      )}

      {/* 2. Floating Quick Install Button / Toast if prompt is available */}
      {deferredPrompt && !isDismissed && (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm w-[calc(100vw-2.5rem)] sm:w-auto bg-gradient-to-r from-amber-900 to-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-amber-500/30 font-bengali animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192x192.png" alt="App Icon" className="w-11 h-11 rounded-xl bg-white p-0.5 border border-white/20 shadow-md flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-amber-300">ইআরপি অ্যাপ ডাউনলোড করুন</h4>
                <p className="text-xs text-slate-300 font-medium">মোবাইল বা পিসিতে এক ক্লিকেই ইনস্টল করুন</p>
              </div>
            </div>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3.5 flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs py-2 px-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              ডাউনলোড / ইনস্টল করুন
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2 font-semibold"
            >
              পরে
            </button>
          </div>
        </div>
      )}

      {/* 3. iOS Add to Home Screen Instructions Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 font-bengali animate-in fade-in">
          <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon-192x192.png" alt="App Icon" className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-0.5" />
                <div>
                  <h3 className="font-black text-base text-slate-900">আইফোনে অ্যাপ ইনস্টল করুন</h3>
                  <p className="text-xs text-slate-500 font-semibold">Safari ব্রাউজার দিয়ে ইনস্টল করার নিয়ম</p>
                </div>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-amber-50/70 p-4 rounded-2xl border border-amber-200/60 text-xs text-slate-700 font-medium">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black flex-shrink-0">
                  ১
                </div>
                <p>Safari ব্রাউজারের নিচে থাকা <strong>Share আইকন</strong> (<Share className="w-3.5 h-3.5 inline text-blue-600" />) চাপুন।</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black flex-shrink-0">
                  ২
                </div>
                <p>নিচের দিকে স্ক্রোল করে <strong>&quot;Add to Home Screen&quot;</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-slate-700" />) অপশন সিলেক্ট করুন।</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black flex-shrink-0">
                  ৩
                </div>
                <p>উপরে ডানপাশে থাকা <strong>&quot;Add&quot;</strong> বাটনে ট্যাপ করলেই অ্যাপ হোম স্ক্রিনে চলে আসবে।</p>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors"
            >
              বুঝেছি
            </button>
          </div>
        </div>
      )}

      {/* 4. Desktop / General Browser Guide Modal */}
      {showDesktopGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-bengali animate-in fade-in">
          <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon-192x192.png" alt="App Icon" className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-0.5" />
                <div>
                  <h3 className="font-black text-base text-slate-900">ডেস্কটপ / পিসিতে ইনস্টল</h3>
                  <p className="text-xs text-slate-500 font-semibold">Chrome বা Edge ব্রাউজারে ইনস্টল নির্দেশিকা</p>
                </div>
              </div>
              <button
                onClick={() => setShowDesktopGuide(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 font-medium">
              <div className="flex items-start gap-3">
                <Monitor className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 mb-1">অ্যাড্রেস বার থেকে সরাসরি ইনস্টল করুন:</p>
                  <p>ব্রাউজারের ওপরের অ্যাড্রেস বারের (URL bar) একদম ডানপাশে থাকা <strong>ইনস্টল আইকন</strong> (বা <strong>App Available</strong> আইকন) এ ক্লিক করুন এবং <strong>&quot;Install&quot;</strong> চাপুন।</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDesktopGuide(false)}
              className="w-full py-2.5 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700 transition-colors shadow-md"
            >
              বুঝেছি
            </button>
          </div>
        </div>
      )}
    </>
  );
}
