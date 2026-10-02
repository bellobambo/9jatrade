import { redirect } from 'next/navigation';

export default function BuyerPageRedirect() {
  redirect('/dashboard');
}
