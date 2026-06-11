"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, FileText, BarChart, LogOut, CheckSquare, Video, Settings } from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  const [mounted, setMounted] = useState(false);
  const [currentView, setCurrentView] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const currentParams = new URLSearchParams(window.location.search);
    setCurrentView(currentParams.get('view'));
  }, [pathname]);

  const navItems = [
    { name: 'Candidates', path: '/admin/candidates', icon: FileText },
    { name: 'Assessments', path: '/admin/assessments', icon: CheckSquare },
    { name: 'Reports', path: '/admin/reports', icon: BarChart },
    { name: 'Departments', path: '/admin/jobpostings', icon: Briefcase },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
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
        background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'flex-start',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '0 1.5rem',
        gap: '0.625rem'
      }}>
        {/* Brand icon dot */}
        <div style={{
          width: '32px', height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--brand-teal) 0%, #0b7a70 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(13,148,136,0.4)',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '0.875rem', fontWeight: '800', color: '#fff' }}>EC</span>
        </div>
        {/* Double-shade gradient brand name */}
        <span style={{
          fontSize: '1.35rem',
          fontWeight: '800',
          letterSpacing: '-0.5px',
          background: 'linear-gradient(135deg, #ffffff 0%, var(--brand-teal) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>ElastiCrew</span>
      </div>
      
      <nav style={{ flex: 1, padding: '1.5rem 1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {navItems.map((item) => {
          let isActive = false;
          
          if (mounted) {
            if (item.path.includes('?')) {
              const [basePath, searchStr] = item.path.split('?');
              const itemParams = new URLSearchParams(searchStr);
              const itemView = itemParams.get('view');
              isActive = pathname === basePath && currentView === itemView;
            } else if (item.path === '/admin/candidates') {
              isActive = pathname === '/admin/candidates' && (!currentView || currentView === 'candidates' || currentView === 'tech');
            } else {
              isActive = pathname === item.path || (item.path !== '/admin' && pathname?.startsWith(item.path));
            }
          } else {
            // Fallback for SSR
            isActive = pathname === item.path || (item.path !== '/admin' && pathname?.startsWith(item.path));
          }
          const isHovered = hoveredItem === item.name;
          return (
            <Link
              key={item.name}
              href={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.7rem 1rem',
                borderRadius: 'var(--radius-lg)',
                color: isActive ? 'white' : (isHovered ? 'white' : 'rgba(255,255,255,0.65)'),
                backgroundColor: isActive ? 'rgba(13, 148, 136, 0.18)' : (isHovered ? 'rgba(255,255,255,0.08)' : 'transparent'),
                borderLeft: isActive ? '3px solid var(--brand-teal)' : (isHovered ? '3px solid rgba(13,148,136,0.4)' : '3px solid transparent'),
                fontWeight: isActive ? '600' : '400',
                fontSize: '0.9rem',
                transition: 'all 0.18s ease',
                textDecoration: 'none',
                boxShadow: isActive ? '0 2px 8px rgba(13,148,136,0.15)' : 'none',
              }}
              onMouseEnter={() => setHoveredItem(item.name)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <item.icon size={18} color={isActive ? 'var(--brand-teal)' : (isHovered ? 'white' : 'rgba(255,255,255,0.55)')} />
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

