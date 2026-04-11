'use client';

import { PathwayBuilder } from '@/components/pathway-builder/PathwayBuilder';

interface Props {
  params: { id: string };
}

export default function BuilderPage({ params }: Props) {
  return <PathwayBuilder pathwayId={params.id} />;
}
