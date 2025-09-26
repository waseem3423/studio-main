import { redirect } from 'next/navigation';

export default function RootPage() {
  // For now, we'll redirect to login. Later, we can check for an active session.
  redirect('/auth/login');
}
