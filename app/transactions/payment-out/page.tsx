import { redirect } from 'next/navigation';

export default function PaymentOutPage() {
  redirect('/transactions?type=expense&action=create');
}
