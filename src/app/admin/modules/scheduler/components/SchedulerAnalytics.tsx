"use client";

/**
 * SchedulerAnalytics.jsx
/**
 * SchedulerAnalytics.jsx
 * Interview analytics: workload, funnel, efficiency metrics.
 * CSS-based charts â€” no external chart library.
 */

import React, { useMemo } from 'react';
import { TrendingUp, Users, Clock, Calendar, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useSchedulerContext } from '../store/schedulerReducer.js';
import { useAvailability } from '../hooks/useAvailability.js';
import { formatDuration } from '../utils/calendarUtils.js';

function MetricCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="analytics-metric-card">
      <div className="analytics-metric-card__icon" style={{ backgroundColor: color + '15', color }}>
        <Icon size={20} />
      </div>
      <div className="analytics-metric-card__body">
        <div className="analytics-metric-card__value">{value}</div>
        <div className="analytics-metric-card__label">{label}</div>
        {sub && <div className="analytics-metric-card__sub">{sub}</div>}
      </div>
    </div>
  );
}

function HorizontalBar({ label, value, max, color, subLabel }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="analytics-bar-row">
      <div className="analytics-bar-row__label">{label}</div>
      <div className="analytics-bar-row__track">
        <div
          className="analytics-bar-row__fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="analytics-bar-row__value">{subLabel || value}</div>
    </div>
  );
}

export default function SchedulerAnalytics() {
  const { state }   = useSchedulerContext();
  const { workloads } = useAvailability();
  const { interviews } = state;

  // â”€â”€ Metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const stats = useMemo(() => {
    const scheduled  = interviews.filter(iv => iv.status === 'scheduled').length;
    const completed  = interviews.filter(iv => iv.status === 'completed').length;
    const cancelled  = interviews.filter(iv => iv.status === 'cancelled').length;
    const total      = interviews.length;

    const totalDuration = interviews
      .filter(iv => iv.status !== 'cancelled')
      .reduce((s, iv) => s + (iv.duration || 60), 0);

    return { scheduled, completed, cancelled, total, totalDuration };
  }, [interviews]);

  // â”€â”€ Platform breakdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const platformStats = useMemo(() => {
    const counts = {};
    interviews.forEach(iv => {
      if (iv.status === 'cancelled') return;
      counts[iv.platform] = (counts[iv.platform] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts).map(([p, c]) => ({
      platform: p,
      count: c,
      pct: Math.round((c / total) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [interviews]);

  const PLATFORM_COLORS = {
    teams: '#6264A7', google: '#1A73E8', zoom: '#2D8CFF', inperson: '#64748b'
  };
  const PLATFORM_LABELS = {
    teams: 'Microsoft Teams', google: 'Google Meet', zoom: 'Zoom', inperson: 'In Person'
  };

  const maxWorkload = useMemo(
    () => Math.max(...Object.values(workloads).map(w => w.scheduledMinutes), 1),
    [workloads]
  );

  return (
    <div className="analytics-view">
      {/* Top metrics */}
      <div className="analytics-metrics-grid">
        <MetricCard icon={Calendar}     label="Total Scheduled" value={stats.scheduled}    color="#0E2D7B" />
        <MetricCard icon={CheckCircle}  label="Completed"        value={stats.completed}    color="#10b981" />
        <MetricCard icon={XCircle}      label="Cancelled"         value={stats.cancelled}    color="#ef4444" />
        <MetricCard icon={Clock}        label="Interview Hours"   value={`${Math.floor(stats.totalDuration / 60)}h ${stats.totalDuration % 60}m`} color="#0D9488" sub="this period" />
      </div>

      <div className="analytics-charts-row">
        {/* Panelist Workload */}
        <div className="card analytics-chart-card">
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: '1rem' }}>
              <Users size={15} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Panelist Workload
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>This week</span>
          </div>
          <div className="card-body">
            {state.panelists.map(p => {
              const w = workloads[p.id] || { scheduledMinutes: 0, busyPercent: 0, interviewCount: 0 };
              const color = w.busyPercent >= 70 ? '#ef4444' : w.busyPercent >= 40 ? '#f59e0b' : '#10b981';
              return (
                <HorizontalBar
                  key={p.id}
                  label={p.name}
                  value={w.scheduledMinutes}
                  max={maxWorkload}
                  color={color}
                  subLabel={w.scheduledMinutes > 0 ? formatDuration(w.scheduledMinutes) : 'â€”'}
                />
              );
            })}
            {!state.panelists.length && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No data</p>
            )}
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="card analytics-chart-card">
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: '1rem' }}>
              <TrendingUp size={15} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Platform Usage
            </h3>
          </div>
          <div className="card-body">
            {platformStats.length > 0 ? platformStats.map(p => (
              <div key={p.platform} className="analytics-platform-row">
                <div className="analytics-platform-dot" style={{ backgroundColor: PLATFORM_COLORS[p.platform] || '#64748b' }} />
                <span className="analytics-platform-label">{PLATFORM_LABELS[p.platform] || p.platform}</span>
                <div className="analytics-platform-bar-track">
                  <div
                    className="analytics-platform-bar-fill"
                    style={{ width: `${p.pct}%`, backgroundColor: PLATFORM_COLORS[p.platform] || '#64748b' }}
                  />
                </div>
                <span className="analytics-platform-pct">{p.count}</span>
              </div>
            )) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No interviews scheduled yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="analytics-summary-row">
        <div className="analytics-summary-item">
          <AlertTriangle size={14} color="#f59e0b" />
          <span>Completion rate: <strong>{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</strong></span>
        </div>
        <div className="analytics-summary-item">
          <Clock size={14} color="#0E2D7B" />
          <span>Avg duration: <strong>{stats.total > 0 ? formatDuration(Math.round(stats.totalDuration / Math.max(stats.total - stats.cancelled, 1))) : 'â€”'}</strong></span>
        </div>
        <div className="analytics-summary-item">
          <Users size={14} color="#0D9488" />
          <span>Active panelists: <strong>{state.panelists.filter(p => (workloads[p.id]?.interviewCount || 0) > 0).length} / {state.panelists.length}</strong></span>
        </div>
      </div>
    </div>
  );
}

