"use client";

/**
 * modules/scheduler/index.jsx
 * Main Scheduler App — thin orchestrator.
 * Wires all components together. No business logic here.
 */

import React from 'react';
import { useScheduler } from './hooks/useScheduler.js';
import { useCalendarDrag } from './hooks/useCalendarDrag.js';
import SchedulerHeader     from './components/SchedulerHeader';
import CalendarWeekView    from './components/CalendarWeekView';
import CalendarDayView     from './components/CalendarDayView';
import CalendarMonthView   from './components/CalendarMonthView';
import PanelistSidebar     from './components/PanelistSidebar';
import ScheduleModal       from './components/ScheduleModal';
import CandidateDrawer     from './components/CandidateDrawer';
import NotificationToast   from './components/NotificationToast';
import SchedulerAnalytics  from './components/SchedulerAnalytics';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { useSchedulerContext } from './store/schedulerReducer.js';

// ─── Upcoming Interviews List (below calendar) ────────────────────────────────

function UpcomingList({ onEventClick }) {
  const { state }  = useSchedulerContext();
  const { cancelScheduledInterview } = useScheduler();

  const upcoming = state.interviews
    .filter(iv => iv.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 8);

  const PLATFORM_COLORS = {
    teams: '#6264A7', google: '#1A73E8', zoom: '#2D8CFF', inperson: '#64748b'
  };

  if (!upcoming.length) {
    return (
      <div className="upcoming-empty">
        <div className="upcoming-empty__icon">📅</div>
        <div className="upcoming-empty__text">No upcoming interviews scheduled</div>
        <div className="upcoming-empty__sub">Click "Schedule Interview" or tap any calendar slot</div>
      </div>
    );
  }

  return (
    <div className="upcoming-list">
      <div className="upcoming-list__header">
        <span className="upcoming-list__title">Upcoming Interviews</span>
        <span className="badge badge-info">{upcoming.length}</span>
      </div>
      <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Candidate / Role</th>
              <th>Date & Time</th>
              <th>Duration</th>
              <th>Platform</th>
              <th>Panelists</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map(iv => {
              const color = PLATFORM_COLORS[iv.platform] || '#64748b';
              return (
                <tr key={iv.id} onClick={() => onEventClick(iv.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--brand-navy)' }}>{iv.candidate_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{iv.job_role}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem' }} suppressHydrationWarning>{new Date(iv.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {iv.time.split(':').map((p, i) => {
                        if (i === 0) { const h = parseInt(p); return (h % 12 || 12) + ':'; }
                        return p + (parseInt(iv.time.split(':')[0]) >= 12 ? ' PM' : ' AM');
                      }).join('')}
                    </div>
                  </td>
                  <td><span className="badge badge-gray">{iv.duration}m</span></td>
                  <td>
                    <span style={{ color, fontWeight: 600, fontSize: '0.8rem' }}>
                      {iv.platform === 'teams' ? 'Teams' : iv.platform === 'google' ? 'Meet' : iv.platform === 'zoom' ? 'Zoom' : 'In Person'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.875rem' }}>{(iv.panelists || []).length} panelist{(iv.panelists?.length || 0) !== 1 ? 's' : ''}</span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {iv.platform !== 'inperson' && (
                        <>
                          <a
                            href="#"
                            className="btn btn-primary"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer' }}
                           onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const meetingLink = iv.meeting_link || iv.teams_join_url;
                              if (!meetingLink || meetingLink === '—' || meetingLink === 'null' || meetingLink === 'undefined' || String(meetingLink).trim() === '') {
                                alert("Teams meeting link unavailable.");
                                return;
                              }
                              const isMock = meetingLink.includes('mock-meeting-') || meetingLink.includes('mock-');
                              if (isMock) {
                                alert("Note: This is a simulated/mock Teams meeting link generated in mock mode.\n\nTo schedule and join real meetings, please link a real Microsoft account first! (Mock links cannot be opened in the Microsoft Teams application.)");
                                return;
                              }
                              window.open(meetingLink, '_blank');
                            }}
                          >
                            Join
                          </a>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const meetingLink = iv.meeting_link || iv.teams_join_url;
                              if (!meetingLink || meetingLink === '—' || meetingLink === 'null' || meetingLink === 'undefined' || String(meetingLink).trim() === '') {
                                alert("Teams meeting link unavailable.");
                                return;
                              }
                              navigator.clipboard.writeText(meetingLink);
                              alert("Meeting link copied successfully.");
                            }}
                          >
                            Copy Link
                          </button>
                        </>
                      )}
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                        onClick={async () => {
                          if (window.confirm(`Cancel interview for ${iv.candidate_name}?`)) {
                            await cancelScheduledInterview(iv.id);
                          }
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export function SchedulerApp() {
  const { state, openDrawer, rescheduleInterview } = useScheduler();
  const { view, activeTab, loading, darkMode } = state;
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);

  const drag = useCalendarDrag({ onReschedule: rescheduleInterview });

  React.useEffect(() => {
    const handleHelpKey = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === '?') {
        setShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleHelpKey);
    return () => window.removeEventListener('keydown', handleHelpKey);
  }, []);

  const sharedCalendarProps = {
    onSlotClick:     drag.handleSlotClick,
    onSlotDragOver:  drag.handleSlotDragOver,
    onSlotDrop:      drag.handleSlotDrop,
    onEventDragStart:drag.handleDragStart,
    onEventDragEnd:  drag.handleDragEnd,
    onEventResize:   drag.handleResizeStart,
    onEventClick:    openDrawer,
    dragEventId:     drag.dragEventId,
    ghostDate:       drag.ghostDate,
    ghostTime:       drag.ghostTime,
    isDragging:      drag.isDragging,
    isResizing:      drag.isResizing,
    ghostDuration:   drag.ghostDuration,
  };

  const scheduledCount = state.interviews.filter(iv => iv.status === 'scheduled').length;

  return (
    <div className={`sched-app ${darkMode ? 'dark-theme' : ''}`}>
      {/* Toolbar */}
      <SchedulerHeader 
        scheduledCount={scheduledCount} 
        onHelpClick={() => setShortcutsOpen(true)}
      />

      {activeTab === 'calendar' ? (
        <div className="sched-body">
          {/* Main calendar area */}
          <div className="sched-main">
            {loading && (
              <div className="sched-loading">
                <div className="sched-loading__skeleton" />
                <div className="sched-loading__skeleton sched-loading__skeleton--short" />
              </div>
            )}

            {!loading && (
              <>
                {view === 'week'  && <CalendarWeekView  {...sharedCalendarProps} />}
                {view === 'day'   && <CalendarDayView   {...sharedCalendarProps} />}
                {view === 'month' && <CalendarMonthView  onEventClick={openDrawer} />}

                {/* Upcoming list below calendar */}
                {(view === 'week' || view === 'day') && (
                  <div className="card" style={{ marginTop: '1.5rem', overflow: 'hidden' }}>
                    <UpcomingList onEventClick={openDrawer} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right sidebar */}
          <PanelistSidebar />
        </div>
      ) : (
        <SchedulerAnalytics />
      )}

      {/* Overlays */}
      <ScheduleModal />
      <CandidateDrawer />
      <NotificationToast />
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

