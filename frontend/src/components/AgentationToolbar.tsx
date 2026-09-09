'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Agentation = dynamic(
  () => import('agentation').then((mod) => mod.Agentation),
  { ssr: false }
);

export function AgentationToolbar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // In production, avoid running or connecting to agentation unless explicitly requested
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ENABLE_AGENTATION !== 'true') {
    return null;
  }

  return (
    <Agentation
      endpoint={process.env.NEXT_PUBLIC_AGENTATION_ENDPOINT || 'http://localhost:4747'}
    />
  );
}
