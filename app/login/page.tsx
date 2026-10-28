'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Lock, User as UserIcon, Mail, Phone, Eye, EyeOff, 
  ArrowRight, AlertCircle, Store, ShieldAlert, Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { toEnglishDigits } from '@/lib/bengaliUtils';

const SAVED_IDENTIFIER_KEY = 'dokan_saved_identifier';
const REMEMBER_ME_KEY = 'dokan_remember_me';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Restore remembered identifier on mount
  useEffect(() => {
    try {
      const isRemembered = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
      const savedIdentifier = localStorage.getItem(SAVED_IDENTIFIER_KEY);
      if (isRemembered && savedIdentifier) {
        setTimeout(() => {
          setIdentifier(savedIdentifier);
          setRememberMe(true);
        }, 0);
      }
    } catch (e) {}
  }, []);

  // Detect input type dynamically for clean icon rendering
  const isEmail = identifier.includes('@');
  const isPhone = /^(\+88)?01[3-9]\d{8}$/.test(identifier.trim());

  // Check caps lock status
  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = toEnglishDigits(identifier).trim();
    const cleanPass = password;

    if (!cleanId) {
      setErrorMessage('অনুগ্রহ করে আপনার ইমেইল, ইউজারনেম অথবা মোবাইল নম্বর দিন।');
      return;
    }

    if (!cleanPass) {
      setErrorMessage('অনুগ্রহ করে পাসওয়ার্ড দিন।');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const success = await login(cleanId, cleanPass);
      if (success) {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_ME_KEY, 'true');
          localStorage.setItem(SAVED_IDENTIFIER_KEY, cleanId);
        } else {
          localStorage.removeItem(REMEMBER_ME_KEY);
          localStorage.removeItem(SAVED_IDENTIFIER_KEY);
        }

        toast.success('স্বাগতম! সফলভাবে লগইন হয়েছে।');
        router.push('/');
      }
    } catch (err: any) {
      const msg = err.message || 'ভুল ইমেইল/ইউজারনেম অথবা পাসওয়ার্ড! সঠিক তথ্য দিন।';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center items-center p-4 font-bengali">
      <div className="w-full max-w-md">
        {/* Main Clean Login Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-900/5">
          {/* Header & Brand */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-slate-200/80 shadow-md mb-3 p-1.5 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/logo.png" 
                alt="মেসার্স দেলোয়ার এন্ড ব্রাদার্স" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              মেসার্স দেলোয়ার এন্ড ব্রাদার্স
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-semibold">
              অনুমোদিত জিমেইল (Gmail) ও পাসওয়ার্ড দিয়ে সিস্টেমে প্রবেশ করুন
            </p>
          </div>

          {/* Access Policy Notice */}
          <div className="mb-5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
            <span className="text-base leading-none">🔒</span>
            <div className="leading-snug text-[11.5px]">
              <strong className="font-bold">সিস্টেম অ্যাক্সেস পলিসি:</strong> শুধুমাত্র অ্যাডমিন কর্তৃক অনুমতিপ্রাপ্ত জিমেইল অ্যাকাউন্টে সিস্টেম ওপেন হবে।
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5 font-bold animate-in fade-in-0 duration-150">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier Input */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>অনুমোদিত জিমেইল (Gmail Address)</span>
                <span className="text-[10px] text-slate-400 font-normal">English (EN)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4 text-amber-600" />
                </div>
                <Input
                  type="text"
                  required
                  autoFocus
                  placeholder="example@gmail.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  data-no-bangla="true"
                  lang="en"
                  dir="ltr"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="no-bangla pl-10 bg-slate-50/70 border-slate-200 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 text-xs sm:text-sm h-11 rounded-xl transition-all font-sans font-medium"
                />
              </div>
              <p className="text-[10.5px] text-slate-400 font-medium pl-1">
                আপনার অনুমতিপ্রাপ্ত জিমেইল ঠিকানা বা অ্যাডমিন ইউজারনেম দিন
              </p>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>পাসওয়ার্ড</span>
                <span className="text-[10px] text-slate-400 font-normal">English (EN)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={handleKeyUp}
                  onKeyDown={handleKeyUp}
                  data-no-bangla="true"
                  lang="en"
                  dir="ltr"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="no-bangla pl-10 pr-11 bg-slate-50/70 border-slate-200 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 text-xs sm:text-sm h-11 rounded-xl transition-all font-sans font-medium"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Caps Lock Alert */}
              {capsLockOn && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in-0 duration-150">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>কিবোর্ডে Caps Lock অন রয়েছে</span>
                </div>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer accent-amber-600"
                />
                <span className="text-xs font-semibold text-slate-600">
                  আমাকে মনে রাখুন (Remember Me)
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-md shadow-amber-600/20 gap-2 cursor-pointer transition-all active:scale-[0.99] mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>লগইন করা হচ্ছে...</span>
                </span>
              ) : (
                <>
                  <span>লগইন করুন</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Minimal Clean Footer */}
        <p className="text-center text-[11px] text-slate-400 font-medium mt-6">
          © ২০২৬ মেসার্স দেলোয়ার এন্ড ব্রাদার্স &bull; সর্বস্বত্ব সংরক্ষিত
        </p>
      </div>
    </div>
  );
}
