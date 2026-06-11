"use client";

/**
 * TechnicalScheduler.jsx
 * Thin page wrapper — mounts SchedulerProvider + SchedulerApp.
 * All logic lives inside the scheduler module.
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SchedulerProvider } from '../modules/scheduler/store/schedulerReducer.js';
import dynamic from 'next/dynamic';

const SchedulerApp = dynamic(
  () => import('../modules/scheduler/index').then((mod) => mod.SchedulerApp),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading scheduler component...
      </div>
    )
  }
);

export default function TechnicalScheduler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/admin/technicalscheduler') {
      router.replace('/admin/candidates?view=tech');
    }
  }, [router]);

  return (
    <SchedulerProvider>
      <SchedulerApp />
    </SchedulerProvider>
  );
}
