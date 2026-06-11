"use client";

import React, { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, KeyRound, ShieldCheck, Loader2, Video } from 'lucide-react';
import { useAppContext } from '@/components/admin/context/AppContext';

export default function SettingsPage() {
  const { apiFetch } = useAppContext();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [provider, setProvider] = useState('gmail');
  
  const [mounted, setMounted] = useState(false);

  // Microsoft Teams integration state
  const [teamsConnected, setTeamsConnected] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);
  const [checkingTeams, setCheckingTeams] = useState(true);
  const [togglingTeams, setTogglingTeams] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchEmails();
    fetchTeamsStatus();

    // Check for oauth redirect query parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get('teams') === 'connected') {
      alert('Microsoft Teams live account connected successfully!');
      // Clear query parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchTeamsStatus = async () => {
    try {
      const res = await apiFetch('/api/teams/simulate');
      if (res.ok) {
        const data = await res.json();
        setTeamsConnected(data.connected);
        setIsSandbox(data.isSandbox || false);
      }
    } catch (e) {
      console.error("Error fetching Teams connection status:", e);
    } finally {
      setCheckingTeams(false);
    }
  };

  const handleConnectSandbox = async () => {
    setTogglingTeams(true);
    try {
      const res = await apiFetch('/api/teams/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect' })
      });
      if (res.ok) {
        const data = await res.json();
        setTeamsConnected(data.connected);
        setIsSandbox(data.isSandbox || false);
        alert('Demo Microsoft Sandbox connected successfully! You can now test Microsoft Teams scheduling and review high-fidelity mock interview video recordings and automated LLaMA 3.3 transcripts without needing live Azure account authorization.');
      } else {
        alert('Failed to connect sandbox mode.');
      }
    } catch (e) {
      alert('Error toggling sandbox mode.');
    } finally {
      setTogglingTeams(false);
    }
  };

  const handleDisconnectTeams = async () => {
    if (!window.confirm("Are you sure you want to disconnect Microsoft Teams?")) return;
    setTogglingTeams(true);
    try {
      const res = await apiFetch('/api/teams/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' })
      });
      if (res.ok) {
        const data = await res.json();
        setTeamsConnected(data.connected);
        setIsSandbox(data.isSandbox || false);
        alert('Microsoft Teams disconnected successfully.');
      } else {
        alert('Failed to disconnect Microsoft Teams.');
      }
    } catch (e) {
      alert('Error disconnecting Teams.');
    } finally {
      setTogglingTeams(false);
    }
  };

  const fetchEmails = async () => {
    try {
      const res = await apiFetch('/api/settings/emails');
      if (res.ok) {
        const data = await res.json();
        setEmails(data || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;

    const trimmedEmail = newEmail.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      alert('Please enter a valid email address (e.g., careers@elasticrew.com).');
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch('/api/settings/emails', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail, password: newPassword, provider })
      });
      if (res.ok) {
        setNewEmail('');
        setNewPassword('');
        fetchEmails();
        alert('Email credentials saved securely!');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save email credentials.');
      }
    } catch (e) {
      alert('Error saving credentials.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this email?")) return;
    try {
      const res = await apiFetch(`/api/settings/emails?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchEmails();
      } else {
        alert('Failed to delete email credentials.');
      }
    } catch (e) {
      alert('Error deleting credentials.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      
      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} color="var(--brand-navy)" />
            Email Sending Credentials
          </h3>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Configure the email accounts used to send automated Video Bot invitations to candidates.
            Passwords are mathematically encrypted in the database.
          </p>
        </div>
        
        <div className="card-body">
          <form onSubmit={handleAddEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--gray-50)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--brand-navy)' }}>Add New Email Account</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Provider</label>
                <select className="form-select" value={provider} onChange={e => setProvider(e.target.value)}>
                  <option value="gmail">Google Workspace / Gmail</option>
                  <option value="outlook">Microsoft Office 365 / Outlook</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input 
                    type="email" 
                    required
                    className="form-input" 
                    placeholder="careers@elasticrew.com"
                    style={{ paddingLeft: '2.5rem' }}
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">App Password</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input 
                    type="password" 
                    required
                    className="form-input" 
                    placeholder="Enter 16-character App Password"
                    style={{ paddingLeft: '2.5rem' }}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>
                {provider === 'gmail' ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>
                    For Gmail, you must enable 2-Step Verification and generate an "App Password" in your Google Account security settings.
                  </p>
                ) : (
                  <div style={{ backgroundColor: '#fff8e6', borderLeft: '3px solid #f59e0b', padding: '0.75rem', marginTop: '0.5rem', borderRadius: '4px' }}>
                    <p style={{ fontSize: '0.75rem', color: '#b45309', margin: 0 }}>
                      <strong>Note for Outlook / Office 365:</strong><br/>
                      Your IT department must explicitly enable "Authenticated SMTP" for this specific mailbox, and the account must have Multi-Factor Authentication (MFA) enabled to generate an App Password.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Save Securely
              </button>
            </div>
          </form>

          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--brand-navy)', marginBottom: '1rem' }}>Configured Accounts</h4>
            
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>Loading accounts...</div>
            ) : emails.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--gray-300)', color: 'var(--gray-500)' }}>
                No email accounts configured. Add one above.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Email Address</th>
                      <th>Provider</th>
                      <th>Added On</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.map(email => (
                      <tr key={email.id}>
                        <td style={{ fontWeight: '500' }}>{email.email}</td>
                        <td>
                          <span className={`badge ${email.provider === 'outlook' ? 'badge-info' : 'badge-warning'}`}>
                            {email.provider === 'outlook' ? 'Outlook' : 'Gmail'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                          {mounted ? new Date(email.created_at).toLocaleDateString() : ''}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="btn btn-ghost" 
                            style={{ color: 'var(--danger)', padding: '0.25rem' }}
                            onClick={() => handleDelete(email.id)}
                            title="Remove Credentials"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Video size={20} color="#6264A7" />
            Microsoft Teams & Video Bot Integration
          </h3>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Integrate Microsoft Teams to automatically generate live interview meeting links, capture high-fidelity video recordings, and invoke Groq LLaMA 3.3 AI transcription insights.
          </p>
        </div>

        <div className="card-body">
          {checkingTeams ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto', marginBottom: '0.5rem' }} />
              Verifying Microsoft integration status...
            </div>
          ) : teamsConnected ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.25rem', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-md)', 
              border: isSandbox ? '1px solid rgba(98, 100, 167, 0.2)' : '1px solid #10b981',
              backgroundColor: isSandbox ? 'rgba(98, 100, 167, 0.04)' : 'rgba(16, 185, 129, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  backgroundColor: isSandbox ? '#6264A7' : '#10b981', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                }}>
                  ✓
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0 }}>
                    {isSandbox ? 'Connected in Sandbox Demo Mode' : 'Connected to Microsoft Teams Live'}
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', margin: '4px 0 0 0' }}>
                    {isSandbox ? 'Bypassing live Azure AD authentication using static simulation.' : 'All system modules are linked with active Graph API access tokens.'}
                  </p>
                </div>
              </div>

              <div style={{ 
                fontSize: '0.85rem', 
                lineHeight: '1.5', 
                color: '#334155', 
                backgroundColor: '#fff', 
                padding: '1rem', 
                borderRadius: '8px', 
                border: '1px solid var(--gray-200)' 
              }}>
                {isSandbox ? (
                  <>
                    <strong style={{ color: 'var(--brand-navy)' }}>Sandbox Mode Features Enabled:</strong>
                    <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <li>Generates custom visual mock Teams join links instantly upon candidate assignment.</li>
                      <li>Returns active HTML5 video recording assets (e.g. BigBuckBunny MP4) inside the interview view dashboard.</li>
                      <li>Provides pre-loaded React/Next.js developer interview transcripts instantly.</li>
                      <li>Fully triggers LLaMA 3.3 AI analysis models to generate candidate skill reports using your active Groq API Key!</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <strong style={{ color: 'var(--brand-navy)' }}>Live Mode Features Enabled:</strong>
                    <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <li>Connects directly to Microsoft Graph to schedule corporate events.</li>
                      <li>Stores active Microsoft Teams meeting join details.</li>
                      <li>Automates recording retrievals and transcript downloads directly from Microsoft organizational tenants.</li>
                    </ul>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button 
                  onClick={handleDisconnectTeams} 
                  className="btn" 
                  disabled={togglingTeams}
                  style={{ 
                    backgroundColor: '#fff', 
                    color: 'var(--danger)', 
                    border: '1px solid var(--danger)',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    cursor: 'pointer',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: '600'
                  }}
                >
                  {togglingTeams ? <Loader2 size={16} className="animate-spin" /> : 'Disconnect Integration'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.25rem', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-md)', 
              border: '1px dashed var(--gray-300)',
              backgroundColor: 'var(--gray-50)',
              textAlign: 'center',
              alignItems: 'center'
            }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(98, 100, 167, 0.08)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#6264A7',
                marginBottom: '0.5rem'
              }}>
                <Video size={30} />
              </div>
              
              <div style={{ maxWidth: '500px' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--brand-navy)', marginBottom: '0.5rem' }}>
                  Choose Your Integration Mode
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', lineHeight: '1.4' }}>
                  If you have a corporate Azure account with tenant permissions to create OnlineMeetings and access transcripts, choose **Connect Real Account**. 
                  Otherwise, select **Connect Demo Sandbox** for an instant pre-configured simulation that tests the full AI analysis dashboard in one click.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => {
                    window.location.href = '/auth/microsoft';
                  }}
                  className="btn" 
                  style={{ 
                    backgroundColor: '#6264A7', 
                    color: '#fff', 
                    border: 'none',
                    fontWeight: '700',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(98, 100, 167, 0.15)'
                  }}
                >
                  Connect Real Account
                </button>
                <button 
                  onClick={handleConnectSandbox} 
                  disabled={togglingTeams}
                  className="btn" 
                  style={{ 
                    backgroundColor: '#fff', 
                    color: '#6264A7', 
                    border: '2px solid #6264A7',
                    fontWeight: '700',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {togglingTeams ? <Loader2 size={16} className="animate-spin" /> : 'Connect Demo Sandbox'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
