'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 font-bold text-lg animate-pulse">
        DIU
      </div>
    </div>
  );
}
