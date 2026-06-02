"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Briefcase, FileText, Video, Calendar, BarChart, LogOut, Settings2 } from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  
  const navItems = [
    { name: 'Resume Upload', path: '/admin/resumeupload', icon: FileText },
    { name: 'Video Bot Screening', path: '/admin/video-bot-admin', icon: Video },
    { name: 'Technical Scheduler', path: '/admin/technicalscheduler', icon: Calendar },
    { name: 'Reports', path: '/admin/reports', icon: BarChart },
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Department', path: '/admin/jobpostings', icon: Briefcase },
    { name: 'Email Settings', path: '/admin/settings', icon: Settings2 },
  ];

  return (
    <aside style={{ 
      width: '260px', 
      backgroundColor: 'var(--brand-navy)', 
      color: 'white',
      display: 'flex', 
      flexDirection: 'column',
      boxShadow: '4px 0 15px rgba(14,45,123,0.1)'
    }}>
      <div style={{ 
        height: '73px', 
        backgroundColor: '#ffffff', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem'
      }}>
        <img 
          src="https://kadellabs.com/wp-content/uploads/2024/08/KL-blue-1-1.svg" 
          alt="KadelLabs Logo" 
          style={{ height: '42px', objectFit: 'contain' }}
        />
      </div>
      
      <nav style={{ flex: 1, padding: '1.5rem 1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/admin' && pathname?.startsWith(item.path));
          return (
            <Link
              key={item.name}
              href={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                backgroundColor: isActive ? 'rgba(125, 186, 0, 0.2)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--brand-green)' : '3px solid transparent',
                fontWeight: isActive ? '600' : '500',
                transition: 'all 0.2s ease',
                textDecoration: 'none'
              }}
            >
              <item.icon size={20} color={isActive ? 'var(--brand-green)' : 'rgba(255,255,255,0.7)'} />
              {item.name}
            </Link>
          );
        })}
        {/* Spacer to push Logout to the bottom of the nav container */}
        <div style={{ flex: 1 }} />
        
        {/* Divider above Logout */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />

        <button 
          onMouseEnter={() => setIsLogoutHovered(true)}
          onMouseLeave={() => setIsLogoutHovered(false)}
          onClick={() => {
            document.cookie = 'kl_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            localStorage.removeItem('kl_admin_session');
            window.location.href = '/admin/login';
          }}
          style={{ 
            width: '100%', 
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            color: isLogoutHovered ? 'white' : 'rgba(255,255,255,0.7)', 
            backgroundColor: isLogoutHovered ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
            borderLeft: '3px solid transparent',
            border: 'none',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
        >
          <LogOut size={20} color={isLogoutHovered ? 'var(--danger)' : 'rgba(255,255,255,0.7)'} />
          Logout
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
