'use client';

import { Suspense } from 'react';
import PartyManagementPage from '@/components/PartyManagementPage';

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold font-bengali">লোড হচ্ছে...</div>}>
      <PartyManagementPage type="customer" />
    </Suspense>
  );
}
