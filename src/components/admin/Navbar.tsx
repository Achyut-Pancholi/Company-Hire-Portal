"use client";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_DASHBOARD_EMAIL || 'careers@elasticrew.com';

const Navbar = ({ title }) => {
  return (
    <header style={{
      height: '73px',
      backgroundColor: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem'
    }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--brand-navy)' }}>{title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--brand-navy)' }}>Admin</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ADMIN_EMAIL}</div>
          </div>
          <div style={{
            width: '40px', height: '40px',
            background: 'linear-gradient(135deg, var(--brand-navy) 0%, #1a42a3 100%)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '600', color: 'white',
            boxShadow: '0 2px 5px rgba(14, 45, 123, 0.2)'
          }}>
            EC
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
