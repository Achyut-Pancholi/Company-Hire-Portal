"use client";

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface ConfirmActionModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
  danger?: boolean;
  requireReason?: boolean;
  reasonPlaceholder?: string;
  loading?: boolean;
}

export default function ConfirmActionModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger = false,
  requireReason = false,
  reasonPlaceholder = "Enter a reason...",
  loading = false,
}: ConfirmActionModalProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requireReason && !reason.trim()) return;
    onConfirm(requireReason ? reason : undefined);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1.5rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: danger ? '#fef2f2' : '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {danger ? (
                <AlertTriangle size={18} color="#ef4444" />
              ) : (
                <CheckCircle size={18} color="#22c55e" />
              )}
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
              borderRadius: '6px',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#475569';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ margin: 0 }}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p
              style={{
                margin: 0,
                fontSize: '0.875rem',
                color: '#475569',
                lineHeight: 1.6,
              }}
            >
              {message}
            </p>

            {requireReason && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Reason for Rejection <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={reasonPlaceholder}
                  required
                  rows={3}
                  disabled={loading}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = danger ? '#ef4444' : '#3b82f6')}
                  onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#475569',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (requireReason && !reason.trim())}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                background: danger ? '#ef4444' : '#22c55e',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: (loading || (requireReason && !reason.trim())) ? 'not-allowed' : 'pointer',
                opacity: (loading || (requireReason && !reason.trim())) ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: danger 
                  ? '0 4px 6px -1px rgba(239, 68, 68, 0.2)' 
                  : '0 4px 6px -1px rgba(34, 197, 94, 0.2)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!(loading || (requireReason && !reason.trim()))) {
                  e.currentTarget.style.backgroundColor = danger ? '#dc2626' : '#16a34a';
                }
              }}
              onMouseLeave={(e) => {
                if (!(loading || (requireReason && !reason.trim()))) {
                  e.currentTarget.style.backgroundColor = danger ? '#ef4444' : '#22c55e';
                }
              }}
            >
              {loading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: scale(0.95) translateY(10px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
          }
        `
      }} />
    </div>
  );
}
