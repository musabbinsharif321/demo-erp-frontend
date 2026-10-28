'use client';

import { use } from 'react';
import PartyProfilePage from '@/components/PartyProfilePage';

export default function CustomerProfileRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PartyProfilePage id={id} type="customer" />;
}
