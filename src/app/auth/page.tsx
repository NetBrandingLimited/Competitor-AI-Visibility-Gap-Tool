import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Auth'
};

export default function AuthRedirectPage() {
  redirect('/login');
}
