'use client';

import { use } from 'react';
import { PathwayBuilder } from '@/components/pathway-builder/PathwayBuilder';

interface Props {
  params: Promise<{ id: string }>;
}

export default function BuilderPage({ params }: Props) {
  const { id } = use(params);
  return <PathwayBuilder pathwayId={id} />;
}
