'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LegacyPatientPathwayRoute() {
  const { id, enrollmentId } = useParams<{ id: string; enrollmentId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/patients/${id}?enrollmentId=${enrollmentId}`);
  }, [enrollmentId, id, router]);

  return (
    <div className="flex min-h-[360px] items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );
}
