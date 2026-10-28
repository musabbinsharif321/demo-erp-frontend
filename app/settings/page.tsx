'use client';

import { Shell } from '@/components/Shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Building2, Phone, Settings as SettingsIcon, Users, UserPlus, 
  Shield, ShieldCheck, KeyRound, Edit2, Trash2, CheckCircle2, 
  Lock, Eye, EyeOff, User, Camera, Upload, Mail, Sparkles, Image as ImageIcon, ShieldAlert
} from 'lucide-react';
import { api, UserData } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/utils';
import { toEnglishDigits } from '@/lib/bengaliUtils';

export default function SettingsPage() {
  const { user: currentUser, token, isAdmin, refreshUser } = useAuth();

  // 1. Current User Profile State
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAvatar, setProfileAvatar] = useState<string>('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync profile state when currentUser updates
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.full_name || currentUser.first_name || '');
      setProfilePhone(currentUser.phone || '');
      setProfileEmail(currentUser.email || '');
      setProfileAvatar(currentUser.avatar || '');
    }
  }, [currentUser]);

  // Image upload and resize handler (Max 300x300, JPEG 85% for lightweight base64 storage)
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('অনুগ্রহ করে শুধুমাত্র ছবি ফাইল (JPG, PNG, WebP) নির্বাচন করুন');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('ছবির সাইজ সর্বোচ্চ ৫ মেগাবাইট হতে পারবে');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 300;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setProfileAvatar(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (profileNewPassword && profileNewPassword !== profileConfirmPassword) {
      toast.error('নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না!');
      return;
    }

    try {
      setIsUpdatingProfile(true);
      const payload: any = {
        full_name: profileName.trim(),
        phone: toEnglishDigits(profilePhone).trim(),
        email: profileEmail.trim(),
        avatar: profileAvatar || ''
      };
      if (profileNewPassword.trim()) {
        payload.password = profileNewPassword.trim();
      }

      await api.auth.updateProfile(payload);
      await refreshUser();
      setProfileNewPassword('');
      setProfileConfirmPassword('');
      toast.success('আপনার প্রোফাইল তথ্য ও ছবি সফলভাবে সংরক্ষিত হয়েছে!');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // 2. Commission Approval Password State (for Admin)
  const [commissionPin, setCommissionPin] = useState<string>('1234');
  const [showCommissionPin, setShowCommissionPin] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);

  // 2.1 Waive Approval Password State (for Admin)
  const [waivePin, setWaivePin] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('waive_pin') || '1234';
    }
    return '1234';
  });
  const [showWaivePin, setShowWaivePin] = useState(false);
  const [isSavingWaivePin, setIsSavingWaivePin] = useState(false);

  useEffect(() => {
    api.settings.get().then(data => {
      const localPin = typeof window !== 'undefined' ? localStorage.getItem('commission_pin') : null;
      setCommissionPin(data.commission_pin || localPin || '1234');
    }).catch(() => {
      const localPin = typeof window !== 'undefined' ? localStorage.getItem('commission_pin') : null;
      if (localPin) setCommissionPin(localPin);
    });
  }, []);

  const handleSaveWaivePin = () => {
    try {
      setIsSavingWaivePin(true);
      const pinVal = toEnglishDigits(waivePin || '1234').trim();
      if (typeof window !== 'undefined') {
        localStorage.setItem('waive_pin', pinVal);
        window.dispatchEvent(new CustomEvent('waivePinUpdated', { detail: pinVal }));
      }
      setWaivePin(pinVal);
      toast.success('বাকি মওকুফ সিকিউরিটি পাসওয়ার্ড সফলভাবে সংরক্ষিত হয়েছে!');
    } catch (err) {
      toast.error('মওকুফ পাসওয়ার্ড সংরক্ষণ করা সম্ভব হয়নি');
    } finally {
      setIsSavingWaivePin(false);
    }
  };

  const handleSaveCommissionPin = async () => {
    try {
      setIsSavingPin(true);
      const pinVal = toEnglishDigits(commissionPin || '1234').trim();
      if (typeof window !== 'undefined') {
        localStorage.setItem('commission_pin', pinVal);
        window.dispatchEvent(new CustomEvent('commissionPinUpdated', { detail: pinVal }));
      }
      await api.settings.update(1, { commission_pin: pinVal });
      setCommissionPin(pinVal);
      toast.success('কমিশন অনুমোদন পাসওয়ার্ড সফলভাবে সংরক্ষিত হয়েছে!');
    } catch (err) {
      toast.error('কমিশন পাসওয়ার্ড সংরক্ষণ করা সম্ভব হয়নি');
    } finally {
      setIsSavingPin(false);
    }
  };

  // 3. User Management State (for Admin)
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    phone: '',
    email: '',
    role: 'manager' as 'admin' | 'manager' | 'staff',
    avatar: '',
    is_active: true
  });
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);

  // Load Users if Admin and authenticated
  const fetchUsers = useCallback(async () => {
    if (!isAdmin || !token) return;
    try {
      setUsersLoading(true);
      const list = await api.auth.users.list();
      const raw = Array.isArray(list) ? list : [];
      // Filter out hidden developer user from UI list
      setUsersList(raw.filter(u => u.username !== 'developer' && u.role !== 'developer'));
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    let isMounted = true;
    if (isAdmin && token) {
      api.auth.users.list().then(list => {
        if (isMounted) {
          const raw = Array.isArray(list) ? list : [];
          setUsersList(raw.filter(u => u.username !== 'developer' && u.role !== 'developer'));
        }
      }).catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [isAdmin, token]);

  const handleToggleUserActive = async (u: UserData) => {
    if (currentUser?.id === u.id) {
      toast.error('আপনি নিজের একাউন্টের অ্যাক্সেস বন্ধ করতে পারবেন না');
      return;
    }
    const nextActive = u.is_active === false ? true : false;
    try {
      await api.auth.users.update(u.id, { is_active: nextActive });
      toast.success(`"${u.full_name || u.email || u.username}"-এর অ্যাক্সেস ${nextActive ? 'সক্রিয় (Active)' : 'বন্ধ (Inactive)'} করা হয়েছে`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'অ্যাক্সেস স্ট্যাটাস পরিবর্তন করা সম্ভব হয়নি');
    }
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setShowModalPassword(false);
    setFormData({
      username: '',
      password: '',
      full_name: '',
      phone: '',
      email: '',
      role: 'manager',
      avatar: '',
      is_active: true
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: UserData) => {
    setEditingUser(u);
    setShowModalPassword(false);
    setFormData({
      username: u.username || '',
      password: '',
      full_name: u.full_name || '',
      phone: u.phone || '',
      email: u.email || '',
      role: (u.role === 'admin' || (u.role as string) === 'developer') ? 'admin' : (u.role === 'manager' ? 'manager' : 'staff'),
      avatar: u.avatar || '',
      is_active: u.is_active !== false
    });
    setIsUserModalOpen(true);
  };

  const handleModalAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 300;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFormData(prev => ({ ...prev, avatar: dataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanUsername = formData.username.trim();

    if (!cleanEmail && !cleanUsername) {
      toast.error('অনুগ্রহ করে অনুমোদিত জিমেইল (Gmail) অথবা ইউজারনেম দিন');
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      toast.error('অনুগ্রহ করে পাসওয়ার্ড দিন');
      return;
    }

    try {
      setIsSubmittingUser(true);
      if (editingUser) {
        const payload: any = {
          username: cleanUsername || cleanEmail.split('@')[0],
          full_name: formData.full_name.trim(),
          phone: toEnglishDigits(formData.phone).trim(),
          email: cleanEmail,
          role: formData.role,
          avatar: formData.avatar,
          is_active: formData.is_active
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        await api.auth.users.update(editingUser.id, payload);
        toast.success(`ব্যবহারকারী "${formData.full_name || cleanEmail || cleanUsername}" সফলভাবে আপডেট হয়েছে`);
      } else {
        await api.auth.users.create({
          username: cleanUsername || cleanEmail.split('@')[0],
          password: formData.password.trim(),
          full_name: formData.full_name.trim(),
          phone: toEnglishDigits(formData.phone).trim(),
          email: cleanEmail,
          role: formData.role,
          avatar: formData.avatar,
          is_active: formData.is_active
        });
        toast.success(`নতুন জিমেইল "${cleanEmail || cleanUsername}" সফলভাবে অনুমোদিত হয়েছে`);
      }
      setIsUserModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'ব্যবহারকারী সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (currentUser?.id === userId) {
      toast.error('আপনি নিজের একাউন্ট ডিলিট করতে পারবেন না');
      return;
    }
    if (!confirm(`আপনি কি নিশ্চিতভাবে ব্যবহারকারী "${userName}" মুছে ফেলতে চান?`)) {
      return;
    }

    try {
      setDeletingUserId(userId);
      await api.auth.users.delete(userId);
      toast.success('ব্যবহারকারী সফলভাবে মুছে ফেলা হয়েছে');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'ব্যবহারকারী মুছে ফেলতে সমস্যা হয়েছে');
    } finally {
      setDeletingUserId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'developer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
            🛠️ ডেভেলপার
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
            👑 অ্যাডমিন (পূর্ণ ক্ষমতা)
          </span>
        );
      case 'manager':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
            💼 ম্যানেজার (লেনদেন ও বিক্রয়)
          </span>
        );
      case 'staff':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
            👔 স্টাফ (ভিউয়ার)
          </span>
        );
    }
  };

  return (
    <Shell>
      <div className="max-w-5xl mx-auto space-y-8 font-bengali pb-12" data-no-bangla="true">
        <div>
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <SettingsIcon className="w-7 h-7 text-indigo-600" />
            অ্যাকাউন্ট ও প্রোফাইল সেটিংস
          </h2>
          <p className="text-slate-500 text-sm font-semibold mt-1">
            ব্যক্তিগত প্রোফাইল তথ্য, ছবি এবং নিরাপত্তা নিয়ন্ত্রণ
          </p>
        </div>

        {/* 1. MY PROFILE SETTINGS CARD (ACCESSIBLE TO ADMIN, MANAGER, STAFF, DEVELOPER) */}
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-indigo-50/70 via-slate-50 to-purple-50/50 border-b border-slate-100 py-5 px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2.5 text-lg font-black text-slate-900">
                  <User className="w-5 h-5 text-indigo-600" />
                  আমার প্রোফাইল সেটিংস (My Profile)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 font-semibold mt-0.5">
                  আপনার ছবি (Avatar), নাম, যোগাযোগ তথ্য এবং লগইন পাসওয়ার্ড হালনাগাদ করুন
                </CardDescription>
              </div>

              {currentUser && (
                <div className="self-start sm:self-auto">
                  {getRoleBadge(currentUser.role)}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              
              {/* Profile Avatar / Image Section */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="relative group shrink-0 self-center sm:self-auto">
                  <div className="w-24 h-24 rounded-2xl border-2 border-indigo-200 overflow-hidden bg-white shadow-md flex items-center justify-center text-slate-300">
                    {profileAvatar ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={profileAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <User className="w-10 h-10 stroke-[1.5]" />
                        <span className="text-[10px] font-bold mt-1 text-slate-400">ছবি নেই</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                    title="ছবি পরিবর্তন করুন"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center justify-center sm:justify-start gap-2">
                      <span>{profileName || currentUser?.username || 'ইউজার প্রোফাইল'}</span>
                      {currentUser?.username && (
                        <span className="text-xs font-mono font-bold text-slate-500">@{currentUser.username}</span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      এখানে আপনার প্রোফাইল ছবি যুক্ত করুন যা সিস্টেমের উপরে ও কর্মীর তালিকায় প্রদর্শিত হবে।
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl text-xs font-bold gap-1.5 h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>ছবি আপলোড করুন</span>
                    </Button>

                    {profileAvatar && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setProfileAvatar('')}
                        className="rounded-xl text-xs font-bold gap-1.5 h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ছবি মুছে ফেলুন</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Information Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>পূর্ণ নাম (Full Name)</span>
                  </Label>
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="আপনার পূর্ণ নাম দিন"
                    data-no-bangla="true"
                    className="font-bold rounded-xl no-bangla"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>মোবাইল নম্বর</span>
                  </Label>
                  <Input
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="01712-XXXXXX"
                    data-no-bangla="true"
                    className="font-bold rounded-xl font-mono text-xs no-bangla"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>জিমেইল / ইমেইল ঠিকানা</span>
                  </Label>
                  <Input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    data-no-bangla="true"
                    name="email"
                    className="font-bold rounded-xl font-mono text-xs no-bangla"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span>ইউজারনেম (স্বয়ংক্রিয়)</span>
                  </Label>
                  <Input
                    value={currentUser?.username || ''}
                    disabled
                    data-no-bangla="true"
                    className="font-bold rounded-xl font-mono text-xs bg-slate-100 text-slate-600 cursor-not-allowed no-bangla"
                  />
                </div>
              </div>

              {/* Password Change Subsection */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-black text-xs text-amber-950 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    লগইন পাসওয়ার্ড পরিবর্তন (English Password)
                  </Label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    পাসওয়ার্ড না বদলালে খালি রাখুন
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs text-slate-700 flex items-center justify-between">
                      <span>নতুন পাসওয়ার্ড (New Password)</span>
                      <span className="text-[10px] text-slate-400 font-normal">English (EN)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showProfilePassword ? "text" : "password"}
                        value={profileNewPassword}
                        onChange={(e) => setProfileNewPassword(e.target.value)}
                        placeholder="নতুন পাসওয়ার্ড দিন..."
                        data-no-bangla="true"
                        name="password"
                        autoComplete="new-password"
                        className="font-mono font-bold rounded-xl pr-10 text-xs bg-white border-amber-300 no-bangla"
                      />
                      <button
                        type="button"
                        onClick={() => setShowProfilePassword(!showProfilePassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showProfilePassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                      >
                        {showProfilePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs text-slate-700 flex items-center justify-between">
                      <span>পাসওয়ার্ড নিশ্চিত করুন</span>
                      <span className="text-[10px] text-slate-400 font-normal">English (EN)</span>
                    </Label>
                    <Input
                      type={showProfilePassword ? "text" : "password"}
                      value={profileConfirmPassword}
                      onChange={(e) => setProfileConfirmPassword(e.target.value)}
                      placeholder="পাসওয়ার্ড পুনরায় লিখুন..."
                      data-no-bangla="true"
                      name="password"
                      autoComplete="new-password"
                      className="font-mono font-bold rounded-xl text-xs bg-white border-amber-300 no-bangla"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-7 h-10 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isUpdatingProfile ? 'সংরক্ষণ হচ্ছে...' : 'প্রোফাইল আপডেট করুন'}</span>
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

        {/* 2. COMMISSION APPROVAL PIN CARD (ADMIN ONLY) */}
        {isAdmin && (
          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-amber-50/60 border-b border-amber-100 py-4 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <CardTitle className="flex items-center gap-2 text-base font-black text-slate-900">
                  <Lock className="w-5 h-5 text-amber-600" />
                  কমিশন অনুমোদন পাসওয়ার্ড (Commission Approval Password)
                </CardTitle>
                <span className="text-[10px] font-mono font-bold bg-white text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300 self-start sm:self-auto">
                  পেন্ডিং কমিশন সিকিউরিটি
                </span>
              </div>
              <CardDescription className="text-xs text-slate-500 font-semibold mt-0.5">
                রিপোর্ট পেজ থেকে পেন্ডিং কমিশন কনফার্ম / অ্যাপ্রুভ করার সময় এই সিকিউরিটি পিনটি আবশ্যক হবে (ডিফল্ট: 1234)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="max-w-md space-y-2">
                <Label className="font-bold text-xs text-slate-700 flex items-center justify-between">
                  <span>সিকিউরিটি পাসওয়ার্ড / পিন কোড</span>
                  <span className="text-[10px] text-slate-400 font-normal">English (EN)</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showCommissionPin ? "text" : "password"}
                    value={commissionPin}
                    onChange={(e) => setCommissionPin(e.target.value)}
                    placeholder="পাসওয়ার্ড লিখুন (যেমন: 1234)"
                    data-no-bangla="true"
                    name="pin"
                    autoComplete="off"
                    className="font-mono font-bold rounded-xl bg-white border-amber-300 pr-10 text-xs no-bangla"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCommissionPin(!showCommissionPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showCommissionPin ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                  >
                    {showCommissionPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  পাসওয়ার্ড পরিবর্তন করার পর নিচের বাটনে চাপ দিয়ে সংরক্ষণ করুন।
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  type="button"
                  onClick={handleSaveCommissionPin} 
                  disabled={isSavingPin}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 h-10 rounded-xl shadow-xs cursor-pointer"
                >
                  {isSavingPin ? 'সংরক্ষণ হচ্ছে...' : 'কমিশন পাসওয়ার্ড সেভ করুন'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2.1 WAIVE APPROVAL PIN CARD (ADMIN ONLY) */}
        {isAdmin && (
          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-rose-50/60 border-b border-rose-100 py-4 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <CardTitle className="flex items-center gap-2 text-base font-black text-slate-900">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  বাকি মওকুফ অনুমোদন পাসওয়ার্ড (Dues Waive Password)
                </CardTitle>
                <span className="text-[10px] font-mono font-bold bg-white text-rose-900 px-2.5 py-0.5 rounded-full border border-rose-300 self-start sm:self-auto">
                  বাকি মওকুফ সিকিউরিটি
                </span>
              </div>
              <CardDescription className="text-xs text-slate-500 font-semibold mt-0.5">
                বাকি কাস্টমার তালিকা বা গ্রাহক প্রোফাইল থেকে বকেয়া মওকুফ / রাইট-অফ করার সময় এই সিকিউরিটি পিনটি আবশ্যক হবে (ডিফল্ট: 1234)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="max-w-md space-y-2">
                <Label className="font-bold text-xs text-slate-700 flex items-center justify-between">
                  <span>মওকুফ সিকিউরিটি পাসওয়ার্ড / পিন কোড</span>
                  <span className="text-[10px] text-slate-400 font-normal">English (EN)</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showWaivePin ? "text" : "password"}
                    value={waivePin}
                    onChange={(e) => setWaivePin(e.target.value)}
                    placeholder="পাসওয়ার্ড লিখুন (যেমন: 1234)"
                    data-no-bangla="true"
                    name="pin"
                    autoComplete="off"
                    className="font-mono font-bold rounded-xl bg-white border-rose-300 pr-10 text-xs no-bangla"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWaivePin(!showWaivePin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showWaivePin ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                  >
                    {showWaivePin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  পাসওয়ার্ড পরিবর্তন করার পর নিচের বাটনে চাপ দিয়ে সংরক্ষণ করুন।
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  type="button"
                  onClick={handleSaveWaivePin} 
                  disabled={isSavingWaivePin}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 h-10 rounded-xl shadow-xs cursor-pointer"
                >
                  {isSavingWaivePin ? 'সংরক্ষণ হচ্ছে...' : 'মওকুফ পাসওয়ার্ড সেভ করুন'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. USER & GMAIL ROLE MANAGEMENT CARD (ADMIN ONLY) */}
        {isAdmin && (
          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-black text-slate-800">
                  <Users className="w-5 h-5 text-blue-600" />
                  জিমেইল অ্যাক্সেস ও ব্যবহারকারী ব্যবস্থাপনা (Gmail Access & User Roles)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 font-semibold mt-0.5">
                  সিস্টেমে প্রবেশের জন্য কর্মীদের জিমেইল অ্যাড্রেসে অনুমতি (অ্যাক্সেস) দিন এবং কে কোন ক্ষমতায় কাজ করতে পারবে তা নির্ধারণ করুন
                </CardDescription>
              </div>

              <Button
                onClick={handleOpenAddUser}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ নতুন জিমেইলে অ্যাক্সেস দিন</span>
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-600 text-xs py-3 px-6">ব্যবহারকারী ও জিমেইল</TableHead>
                    <TableHead className="font-bold text-slate-600 text-xs py-3 px-4">প্রদত্ত অ্যাক্সেস (Role)</TableHead>
                    <TableHead className="font-bold text-slate-600 text-xs py-3 px-4 text-center">অ্যাক্সেস স্ট্যাটাস</TableHead>
                    <TableHead className="font-bold text-slate-600 text-xs py-3 px-4">মোবাইল নম্বর</TableHead>
                    <TableHead className="font-bold text-slate-600 text-xs py-3 px-6 text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 text-xs font-semibold">
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                        ব্যবহারকারীদের তালিকা লোড হচ্ছে...
                      </TableCell>
                    </TableRow>
                  ) : usersList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                        কোনো অনুমোদিত জিমেইল বা ব্যবহারকারী পাওয়া যায়নি
                      </TableCell>
                    </TableRow>
                  ) : (
                    usersList.map((u) => {
                      const isActive = u.is_active !== false;
                      return (
                        <TableRow key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <TableCell className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border overflow-hidden",
                                isActive ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-slate-100 border-slate-200 text-slate-400"
                              )}>
                                {u.avatar ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={u.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  (u.full_name || u.email || u.username)[0]?.toUpperCase()
                                )}
                              </div>
                              <div>
                                <p className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                                  <span>{u.full_name || u.username}</span>
                                  {currentUser?.id === u.id && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">আপনি</span>
                                  )}
                                </p>
                                {u.email ? (
                                  <p className="text-[11px] text-indigo-600 font-mono font-bold flex items-center gap-1 mt-0.5">
                                    <span>📧</span>
                                    <span>{u.email}</span>
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-slate-400 font-mono">@{u.username}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            {getRoleBadge(u.role)}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleUserActive(u)}
                              disabled={currentUser?.id === u.id}
                              title={currentUser?.id === u.id ? 'নিজের অ্যাকাউন্ট বন্ধ করা যাবে না' : (isActive ? 'ক্লিক করে অ্যাক্সেস বন্ধ করুন' : 'ক্লিক করে অ্যাক্সেস চালু করুন')}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer select-none",
                                isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 shadow-2xs"
                                  : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300"
                              )}
                            >
                              <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-rose-500")}></span>
                              <span>{isActive ? 'সক্রিয় (Active)' : 'বন্ধ (Inactive)'}</span>
                            </button>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 font-mono text-slate-600">
                            {u.phone || '—'}
                          </TableCell>

                          <TableCell className="py-3.5 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEditUser(u)}
                                className="h-8 w-8 p-0 rounded-lg hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                                title="তথ্য সম্পাদনা করুন"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>

                              {currentUser?.id !== u.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteUser(u.id, u.full_name || u.username)}
                                  disabled={deletingUserId === u.id}
                                  className="h-8 w-8 p-0 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="ব্যবহারকারী মুছে ফেলুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* USER ADD / EDIT MODAL */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white font-bengali" data-no-bangla="true">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              {editingUser ? <Edit2 className="w-5 h-5 text-blue-600" /> : <UserPlus className="w-5 h-5 text-blue-600" />}
              <span>{editingUser ? 'জিমেইল অ্যাক্সেস ও তথ্য আপডেট করুন' : 'নতুন জিমেইলে সিস্টেম অ্যাক্সেস দিন'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitUser} className="space-y-4 pt-2">
            
            {/* Modal Avatar upload */}
            <div className="flex items-center gap-3.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-14 h-14 rounded-xl border border-slate-300 overflow-hidden bg-white flex items-center justify-center shrink-0">
                {formData.avatar ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={formData.avatar} alt="User Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="space-y-1 flex-1">
                <span className="text-xs font-bold text-slate-700 block">প্রোফাইল ছবি (ঐচ্ছিক)</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="h-7 text-[11px] font-bold rounded-lg border-slate-200"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    ছবি দিন
                  </Button>
                  {formData.avatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                      className="h-7 text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                    >
                      মুছুন
                    </Button>
                  )}
                </div>
                <input
                  ref={modalFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleModalAvatarChange}
                  className="hidden"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>অনুমোদিত জিমেইল ঠিকানা (Gmail Address) *</span>
                <span className="text-[10px] text-slate-400 font-normal">English (EN)</span>
              </Label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="staff@gmail.com"
                data-no-bangla="true"
                name="email"
                className="font-mono font-bold text-xs rounded-xl no-bangla"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">কর্মীর পূর্ণ নাম (Full Name)</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="মোঃ আব্দুর রহিম / Rahim"
                data-no-bangla="true"
                className="font-bold text-xs rounded-xl no-bangla"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">প্রদত্ত অ্যাক্সেস ক্ষমতা / ভূমিকা (Role) *</Label>
              <Select
                value={formData.role}
                onValueChange={(val: any) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger className="font-bold text-xs rounded-xl h-10">
                  <SelectValue placeholder="ভূমিকা নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  <SelectItem value="admin">👑 অ্যাডমিন (Admin - পূর্ণ নিয়ন্ত্রণ ও সেটিংস)</SelectItem>
                  <SelectItem value="manager">💼 ম্যানেজার (Manager - বিক্রয়, ক্রয় ও লেনদেন এন্ট্রি)</SelectItem>
                  <SelectItem value="staff">👔 স্টাফ (Staff - শুধুমাত্র দেখার অনুমতি / View Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>{editingUser ? 'নতুন পাসওয়ার্ড (পরিবর্তন না করতে চাইলে খালি রাখুন)' : 'পাসওয়ার্ড (Password) *'}</span>
                <span className="text-[10px] text-slate-400 font-normal">English (EN)</span>
              </Label>
              <div className="relative">
                <Input
                  type={showModalPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'নতুন পাসওয়ার্ড দিন (ঐচ্ছিক)' : 'লগইন পাসওয়ার্ড দিন'}
                  required={!editingUser}
                  data-no-bangla="true"
                  name="password"
                  autoComplete="new-password"
                  className="font-mono font-bold text-xs rounded-xl pr-10 no-bangla"
                />
                <button
                  type="button"
                  onClick={() => setShowModalPassword(!showModalPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showModalPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                >
                  {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">মোবাইল নম্বর (ঐচ্ছিক)</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01712-XXXXXX"
                  data-no-bangla="true"
                  className="font-bold text-xs rounded-xl font-mono no-bangla"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>ইউজারনেম (Username)</span>
                  <span className="text-[10px] text-slate-400 font-normal">English (EN)</span>
                </Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="স্বয়ংক্রিয় তৈরি হবে অথবা username"
                  data-no-bangla="true"
                  name="username"
                  autoComplete="username"
                  className="font-mono font-bold text-xs rounded-xl text-slate-600 no-bangla"
                />
              </div>
            </div>

            {/* Active Status Checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer transition-colors hover:bg-slate-100/70">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">সিস্টেমে প্রবেশের অনুমতি চালু রাখুন (Active)</span>
                  <span className="text-[11px] text-slate-500 font-medium">টিক চিহ্ন না দিলে এই জিমেইল দিয়ে সিস্টেমে লগইন করা যাবে না</span>
                </div>
              </label>
            </div>

            <DialogFooter className="flex flex-row justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUserModalOpen(false)}
                className="rounded-xl font-bold text-xs cursor-pointer"
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingUser}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                {isSubmittingUser ? 'সংরক্ষণ হচ্ছে...' : editingUser ? 'আপডেট করুন' : 'অ্যাক্সেস প্রদান করুন'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
