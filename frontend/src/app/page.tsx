import { redirect } from 'next/navigation';

// Root → dashboard home
export default function Root() {
  redirect('/dashboard');
}
