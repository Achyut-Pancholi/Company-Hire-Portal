"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  
  const getPageTitle = () => {
    if (pathname === '/admin') return 'Video Bot Screening';
    if (pathname?.startsWith('/admin/jobpostings')) return 'Departments';
    if (pathname?.startsWith('/admin/candidates')) return 'Candidates';
    if (pathname?.startsWith('/admin/assessments')) return 'Assessment Management Engine';
    if (pathname?.startsWith('/admin/video-bot-admin')) return 'Video Bot Screening';
    if (pathname?.startsWith('/admin/technicalscheduler')) return 'Technical Scheduler';
    if (pathname?.startsWith('/admin/reports')) return 'Reports & Evaluation';

    const segments = pathname?.split('/').filter(Boolean) || [];
    if (segments.length > 1) {
      const lastSegment = segments[segments.length - 1];
      const isId = /^[0-9a-fA-F-]+$/.test(lastSegment) || /^\d+$/.test(lastSegment);
      if (isId && segments.length > 2) {
        const preLast = segments[segments.length - 2];
        return preLast.charAt(0).toUpperCase() + preLast.slice(1).replace(/[-_]/g, ' ');
      }
      return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/[-_]/g, ' ');
    }

    return 'Dashboard Overview';
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Navbar title={getPageTitle()} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem', backgroundColor: 'var(--background)' }}>
          <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
