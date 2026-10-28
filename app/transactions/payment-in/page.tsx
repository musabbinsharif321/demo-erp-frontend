import { redirect } from 'next/navigation';

export default function PaymentInPage() {
  redirect('/transactions?type=income&action=create');
}
