"use client";

/**
 * PanelistSidebar.jsx
 * Panelist availability panel with workload bars, availability dots,
 * and click-to-highlight on calendar.
 */

import React, { memo, useState } from 'react';
import { Users, Clock, UserPlus, Trash2, X, Edit } from 'lucide-react';
import { useSchedulerContext, ACTIONS } from '../store/schedulerReducer.js';
import { useScheduler } from '../hooks/useScheduler.js';
import { useAvailability } from '../hooks/useAvailability.js';
import { getWeekDays, getDateKey, formatDateShort } from '../utils/calendarUtils.js';

const STATUS_COLORS = {
  free:    '#10b981',
  limited: '#f59e0b',
  busy:    '#ef4444',
  blocked: '#cbd5e1',
};

const STATUS_LABELS = {
  free:    'Available',
  limited: 'Limited',
  busy:    'Busy',
  blocked: 'Off',
};

// ─── Availability Dot ─────────────────────────────────────────────────────────

const AvailDot = memo(({ status }) => (
  <div
    className="panelist-avail-dot"
    style={{ backgroundColor: STATUS_COLORS[status] || STATUS_COLORS.free }}
    title={STATUS_LABELS[status]}
  />
));
AvailDot.displayName = 'AvailDot';

// ─── Weekly Dots Row (Mon-Fri) ─────────────────────────────────────────────────

const WeeklyDots = memo(({ panelistId, weekDays, getPanelistStatus }) => (
  <div className="panelist-week-dots">
    {weekDays.slice(0, 5).map(day => {
      const status = getPanelistStatus(panelistId, day);
      return (
        <div key={getDateKey(day)} className="panelist-week-dot-item" title={formatDateShort(day)}>
          <AvailDot status={status} />
          <span className="panelist-week-dot-label">{['M','T','W','T','F'][day.getDay() - 1]}</span>
        </div>
      );
    })}
  </div>
));
WeeklyDots.displayName = 'WeeklyDots';

// ─── Workload Bar ─────────────────────────────────────────────────────────────

const WorkloadBar = memo(({ percent, scheduledMinutes }) => {
  const color = percent >= 70 ? '#ef4444' : percent >= 40 ? '#f59e0b' : '#10b981';
  const hours = Math.floor(scheduledMinutes / 60);
  const mins  = scheduledMinutes % 60;
  const label = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`;

  return (
    <div className="panelist-workload">
      <div className="panelist-workload__bar-track">
        <div
          className="panelist-workload__bar-fill"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <span className="panelist-workload__label" style={{ color }}>
        {label}
      </span>
    </div>
  );
});
WorkloadBar.displayName = 'WorkloadBar';

// ─── Panelist Row ──────────────────────────────────────────────────────────────

const PanelistRow = memo(({ panelist, workload, weekDays, getPanelistStatus, isSelected, onSelect, onEdit, onDelete }) => (
  <div
    className={`panelist-row ${isSelected ? 'panelist-row--selected' : ''}`}
    onClick={() => onSelect(panelist.id)}
    role="button"
    tabIndex={0}
    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem' }}
    aria-pressed={isSelected}
    title={`Click to highlight ${panelist.name}'s interviews`}
    onKeyDown={(e) => e.key === 'Enter' && onSelect(panelist.id)}
  >
    <div className="panelist-row__left" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
      <div
        className="panelist-avatar"
        style={{ backgroundColor: panelist.color, flexShrink: 0 }}
      >
        {panelist.avatar}
      </div>
      <div className="panelist-row__info" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span className="panelist-row__name" style={{ fontWeight: 600 }}>{panelist.name}</span>
        <span className="panelist-row__role" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{panelist.role}</span>
        <WorkloadBar
          percent={workload.busyPercent}
          scheduledMinutes={workload.scheduledMinutes}
        />
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
      <WeeklyDots panelistId={panelist.id} weekDays={weekDays} getPanelistStatus={getPanelistStatus} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--brand-navy)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            opacity: 0.6,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          className="hover:opacity-100 hover:bg-slate-100"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(panelist);
          }}
          title={`Edit ${panelist.name}`}
        >
          <Edit size={13} />
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            opacity: 0.6,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          className="hover:opacity-100 hover:bg-red-50"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(panelist.id, panelist.name);
          }}
          title={`Delete ${panelist.name}`}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  </div>
));
PanelistRow.displayName = 'PanelistRow';

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

export default function PanelistSidebar() {
  const { state, dispatch, addPanelist, editPanelist, removePanelist } = useScheduler();
  const { workloads, getPanelistStatus } = useAvailability();
  const { currentDate, selectedPanelistId, panelists } = state;

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPanelistId, setEditingPanelistId] = useState(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [daysAvailable, setDaysAvailable] = useState([1, 2, 3, 4, 5]);
  const [emailError, setEmailError] = useState('Panelist email is required to schedule and share interview meetings.');

  const weekDays = getWeekDays(currentDate);
  const totalScheduled = state.interviews.filter(iv => iv.status === 'scheduled').length;

  const validateEmail = (emailStr) => {
    if (!emailStr) return false;
    const trimmed = emailStr.trim();
    if (trimmed.length === 0) return false;
    if (/^\d+$/.test(trimmed)) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(trimmed);
  };

  const handleEditClick = (p) => {
    setEditingPanelistId(p.id);
    setName(p.name);
    setRole(p.role);
    setEmail(p.email || '');
    setDaysAvailable(p.daysAvailable || [1, 2, 3, 4, 5]);
    setEmailError('');
    setShowAddForm(true);
  };

  const resetForm = () => {
    setName('');
    setRole('');
    setEmail('');
    setDaysAvailable([1, 2, 3, 4, 5]);
    setEditingPanelistId(null);
    setEmailError('Panelist email is required to schedule and share interview meetings.');
    setShowAddForm(false);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !validateEmail(email)) {
      setEmailError("Panelist email is required to schedule and share interview meetings.");
      return;
    }

    if (editingPanelistId) {
      editPanelist(editingPanelistId, {
        name: name.trim(),
        role: role.trim(),
        email: email.trim(),
        daysAvailable,
      });
    } else {
      const initials = name
        .trim()
        .split(/\s+/)
        .map(p => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const colors = ['#0E2D7B', '#7DBA00', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      addPanelist({
        name: name.trim(),
        role: role.trim(),
        email: email.trim(),
        avatar: initials || '?',
        color: randomColor,
        daysAvailable,
      });
    }

    resetForm();
  };

  return (
    <aside className="panelist-sidebar">
      <div className="panelist-sidebar__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="panelist-sidebar__title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={15} />
          Panel Availability
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          style={{
            background: 'var(--brand-green)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s'
          }}
          className="hover:bg-opacity-90"
        >
          <UserPlus size={12} /> Add
        </button>
      </div>

      {showAddForm && (
        <div 
          className="modal-overlay" 
          role="dialog" 
          aria-modal="true" 
          aria-label={editingPanelistId ? 'Edit Panelist' : 'New Panelist'} 
          onClick={resetForm}
        >
          <div 
            className="modal-container" 
            style={{ width: '100%', maxWidth: '440px' }} 
            onClick={e => e.stopPropagation()}
          >
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {/* Header */}
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <h2 className="modal-title">{editingPanelistId ? 'Edit Panelist' : 'New Panelist'}</h2>
                  <p className="modal-subtitle">
                    {editingPanelistId ? 'Update panelist details and availability' : 'Add a new member to the panel'}
                  </p>
                </div>
                <button type="button" className="modal-close-btn" onClick={resetForm} aria-label="Close">
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>Full Name</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Full Name (e.g. Bob Martin)"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>Role</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Role (e.g. QA Automation)"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>Email Address</span>
                  <input
                    type="text"
                    className="form-input"
                    style={{ 
                      borderColor: emailError ? '#ef4444' : undefined,
                      outlineColor: emailError ? '#ef4444' : undefined
                    }}
                    placeholder="Email (e.g. bob@kadellabs.com)"
                    value={email}
                    onChange={e => {
                      const val = e.target.value;
                      setEmail(val);
                      if (!validateEmail(val)) {
                        setEmailError("Panelist email is required to schedule and share interview meetings.");
                      } else {
                        setEmailError("");
                      }
                    }}
                    required
                  />
                  {emailError && (
                    <span style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '2px', lineHeight: '1.3', display: 'block' }}>
                      {emailError}
                    </span>
                  )}
                </div>

                {/* Days Available Tag-Style Checkboxes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>Days Available</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {DAYS_OF_WEEK.map(d => {
                      const checked = daysAvailable.includes(d.value);
                      return (
                        <label 
                          key={d.value} 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '3px', 
                            fontSize: '0.72rem', 
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: checked ? 'rgba(14, 45, 123, 0.08)' : '#f1f5f9',
                            color: checked ? 'var(--brand-navy)' : '#475569',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: checked ? '1px solid var(--brand-navy)' : '1px solid #cbd5e1',
                            userSelect: 'none',
                            transition: 'all 0.15s'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            onChange={() => {
                              if (checked) {
                                setDaysAvailable(daysAvailable.filter(v => v !== d.value));
                              } else {
                                setDaysAvailable([...daysAvailable, d.value]);
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                          {d.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-outline" onClick={resetForm} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={!!emailError || !name.trim() || !role.trim()} 
                  style={{ 
                    padding: '0.5rem 1.25rem', 
                    fontSize: '0.85rem', 
                    opacity: (!!emailError || !name.trim() || !role.trim()) ? 0.5 : 1,
                    cursor: (!!emailError || !name.trim() || !role.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {editingPanelistId ? 'Update Panelist' : 'Save Panelist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="panelist-legend">
        {Object.entries(STATUS_COLORS).filter(([k]) => k !== 'blocked').map(([status, color]) => (
          <div key={status} className="panelist-legend-item">
            <div className="panelist-legend-dot" style={{ backgroundColor: color }} />
            <span>{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>

      {/* Panelist list */}
      <div className="panelist-list">
        {panelists.map(panelist => (
          <PanelistRow
            key={panelist.id}
            panelist={panelist}
            workload={workloads[panelist.id] || { busyPercent: 0, scheduledMinutes: 0 }}
            weekDays={weekDays}
            getPanelistStatus={getPanelistStatus}
            isSelected={selectedPanelistId === panelist.id}
            onSelect={(id) => dispatch({ type: ACTIONS.SET_SELECTED_PANELIST, payload: id })}
            onEdit={handleEditClick}
            onDelete={(id, name) => {
              if (window.confirm(`Are you sure you want to remove ${name} from the panel?`)) {
                removePanelist(id, name);
              }
            }}
          />
        ))}
      </div>

      {/* Summary footer */}
      <div className="panelist-sidebar__footer">
        <div className="panelist-sidebar__stat">
          <span className="panelist-sidebar__stat-num">{totalScheduled}</span>
          <span className="panelist-sidebar__stat-label">interviews this week</span>
        </div>
        <div className="panelist-sidebar__note">
          Working hours: 9 AM – 6 PM IST<br />
          Lunch: 1 – 2 PM · Buffer: 15 min
        </div>
      </div>
    </aside>
  );
}
