"use client";

/**
 * CandidateDrawer.jsx
 * Right-side slide-in drawer with full candidate profile, ATS scores,
 * interview history, and quick actions.
 */

import React, { useMemo } from 'react';
import { X, ExternalLink, Mail, Phone, Briefcase, Calendar, Clock, CheckCircle, Circle, AlertCircle, Star } from 'lucide-react';
import { useSchedulerContext, ACTIONS, selectInterviewById } from '../store/schedulerReducer.js';
import { useScheduler } from '../hooks/useScheduler.js';
import { useAppContext } from '@/components/admin/context/AppContext';
import { formatTime, formatDuration, formatDateLong } from '../utils/calendarUtils.js';
import { PLATFORM_OPTIONS } from '../services/calendarProviders/index.js';
import { TeamsInterviewPanel } from '@/components/TeamsInterviewPanel';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

const STAGE_ICONS = {
  done:    CheckCircle,
  active:  AlertCircle,
  pending: Circle,
};

const STAGE_COLORS = {
  done:    '#10b981',
  active:  '#0E2D7B',
  pending: '#94a3b8',
};

function ScoreCard({ label, score, max = 100, color }) {
  const pct = score != null ? Math.min(100, Math.round((score / max) * 100)) : 0;
  const strokeColor = color || (pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444');
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="drawer-score-card-gauge">
      <div className="drawer-score-gauge-wrapper">
        <svg width="48" height="48" viewBox="0 0 44 44" className="drawer-score-gauge-svg">
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="var(--gray-100)"
            strokeWidth="3.5"
            style={{ opacity: 0.15 }}
          />
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={score != null ? strokeDashoffset : circumference}
            strokeLinecap="round"
            transform="rotate(-90 22 22)"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        <div className="drawer-score-gauge-text" style={{ color: strokeColor }}>
          {score != null ? score : '—'}
        </div>
      </div>
      <div className="drawer-score-card__label" style={{ marginTop: '0.5rem', textAlign: 'center' }}>{label}</div>
    </div>
  );
}

function StageTimeline({ candidate, scheduledInterviews }) {
  const stages = [
    { label: 'Resume Parsed',       status: candidate?.resumeStatus === 'Parsed' ? 'done' : 'pending' },
    { label: 'Candidate Form',      status: candidate?.formStatus  === 'Submitted' ? 'done' : candidate?.formStatus === 'Pending' ? 'active' : 'pending' },
    { label: 'Video Screening',     status: candidate?.videoStatus === 'Completed' ? 'done' : candidate?.videoStatus === 'Pending' ? 'active' : 'pending' },
    { label: 'Technical Interview', status: candidate?.techStatus  === 'Scheduled' ? 'active' : candidate?.techStatus === 'Completed' ? 'done' : 'pending' },
    { label: 'Final Decision',      status: candidate?.stage === 'Offer' ? 'done' : 'pending' },
  ];

  return (
    <div className="drawer-timeline">
      {stages.map((s, i) => {
        const Icon  = STAGE_ICONS[s.status];
        const color = STAGE_COLORS[s.status];
        return (
          <div key={i} className={`drawer-timeline-item drawer-timeline-item--${s.status}`}>
            <div className="drawer-timeline-item__icon" style={{ color }}>
              <Icon size={14} />
              {i < stages.length - 1 && <div className="drawer-timeline-item__line" />}
            </div>
            <div className="drawer-timeline-item__content">
              <span className="drawer-timeline-item__label" style={{ color }}>
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CandidateDrawer() {
  const { state, dispatch } = useSchedulerContext();
  const { cancelScheduledInterview } = useScheduler();
  const { candidates } = useAppContext();
  const { drawer, panelists: allPanelists } = state;

  const interview = useMemo(
    () => selectInterviewById(state, drawer.interviewId),
    [state, drawer.interviewId]
  );

  const candidate = useMemo(
    () => candidates.find(c => c.id === interview?.candidate_id) || null,
    [candidates, interview]
  );

  const panelists = useMemo(
    () => (interview?.panelists || []).map(id => allPanelists.find(p => p.id === id)).filter(Boolean),
    [interview, allPanelists]
  );

  const platform = PLATFORM_OPTIONS.find(p => p.id === interview?.platform);

  const close = () => dispatch({ type: ACTIONS.CLOSE_DRAWER });

  // Escape to close
  React.useEffect(() => {
    if (!drawer.open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawer.open]);

  const hiringProbability = useMemo(() => {
    if (!candidate) return null;
    const scores = [
      candidate.resumeScore || candidate.resume_score,
      candidate.videoScore  || candidate.video_score,
    ].filter(s => s != null);
    if (!scores.length) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [candidate]);

  if (!drawer.open || !interview) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={close} />

      {/* Drawer */}
      <aside className={`candidate-drawer ${drawer.open ? 'candidate-drawer--open' : ''}`} role="complementary" aria-label="Candidate profile">
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-header__left">
            <div className="drawer-avatar" style={{ background: 'linear-gradient(135deg, var(--brand-navy), #1a42a3)' }}>
              {getInitials(interview.candidate_name)}
            </div>
            <div>
              <h3 className="drawer-name">{interview.candidate_name}</h3>
              <p className="drawer-role">{interview.job_role}</p>
              <span className={`badge ${interview.status === 'scheduled' ? 'badge-info' : interview.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>
                {interview.status}
              </span>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={close} aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Contact info */}
          <div className="drawer-section">
            {interview.candidate_email && (
              <a href={`mailto:${interview.candidate_email}`} className="drawer-contact-row">
                <Mail size={14} /> {interview.candidate_email}
              </a>
            )}
            {candidate?.phone && (
              <div className="drawer-contact-row">
                <Phone size={14} /> {candidate.phone}
              </div>
            )}
          </div>

          {/* Interview Info */}
          <div className="drawer-section drawer-section--card">
            <div className="drawer-section__title">Interview Details</div>
            <div className="drawer-info-grid">
              <div className="drawer-info-item">
                <Calendar size={13} />
                <span>{formatDateLong(interview.date)} · {formatTime(interview.time)}</span>
              </div>
              <div className="drawer-info-item">
                <Clock size={13} />
                <span>{formatDuration(interview.duration)}</span>
              </div>
              <div className="drawer-info-item">
                <Briefcase size={13} />
                <span>{interview.template} interview</span>
              </div>
              {(interview.meeting_link || interview.teams_join_url) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <a
                    href="#"
                    className="drawer-info-item drawer-join-link"
                    style={{ color: platform?.color, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.preventDefault();
                      const link = interview.meeting_link || interview.teams_join_url;
                      if (!link || link === '—' || link === 'null' || link === 'undefined' || String(link).trim() === '') {
                        alert("Teams meeting link unavailable.");
                        return;
                      }
                      const isMock = link.includes('mock-meeting-') || link.includes('mock-');
                      if (isMock) {
                        alert("Note: This is a simulated/mock Teams meeting link generated in mock mode.\n\nTo schedule and join real meetings, please link a real Microsoft account first! (Mock links cannot be opened in the Microsoft Teams application.)");
                        return;
                      }
                      window.open(link, '_blank');
                    }}
                  >
                    <ExternalLink size={13} />
                    Join on {platform?.label}
                  </a>
                  {interview.platform === 'teams' && (
                    <button
                      onClick={() => {
                        const link = interview.meeting_link || interview.teams_join_url;
                        if (link) {
                          navigator.clipboard.writeText(link);
                          alert("Meeting link copied successfully.");
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--brand-navy)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textDecoration: 'underline',
                        padding: '0 4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      Copy Link
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Panelists */}
            <div style={{ marginTop: '0.75rem' }}>
              <div className="drawer-label">Panelists</div>
              <div className="drawer-panelists">
                {panelists.map(p => (
                  <div key={p.id} className="drawer-panelist-chip" style={{ backgroundColor: p.color + '22', color: p.color }}>
                    <div className="drawer-panelist-avatar" style={{ backgroundColor: p.color }}>{p.avatar}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{p.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {interview.notes && (
              <div style={{ marginTop: '0.75rem' }}>
                <div className="drawer-label">Notes</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: '1.5' }}>{interview.notes}</p>
              </div>
            )}
          </div>

          {/* ATS Intelligence */}
          <div className="drawer-section drawer-section--card">
            <div className="drawer-section__title">ATS Intelligence</div>
            <div className="drawer-scores-grid">
              <ScoreCard label="Resume"  score={candidate?.resumeScore || candidate?.resume_score} />
              <ScoreCard label="Video"   score={candidate?.videoScore  || candidate?.video_score} />
              <ScoreCard label="Hiring %" score={hiringProbability} color="#0E2D7B" />
            </div>

            {candidate?.skills?.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div className="drawer-label">Skills</div>
                <div className="drawer-skills">
                  {candidate.skills.slice(0, 8).map(skill => (
                    <span key={skill} className="drawer-skill-tag">{skill}</span>
                  ))}
                  {candidate.skills.length > 8 && (
                    <span className="drawer-skill-tag drawer-skill-tag--more">+{candidate.skills.length - 8}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Teams Interview Status, Recording and Claude AI Analysis */}
          <TeamsInterviewPanel interviewId={interview.id} interview={interview} />

          {/* Stage Timeline */}
          <div className="drawer-section drawer-section--card">
            <div className="drawer-section__title">Hiring Journey</div>
            <StageTimeline candidate={candidate} scheduledInterviews={state.interviews} />
          </div>
        </div>

        {/* Footer actions */}
        <div className="drawer-footer">
          {interview.status === 'scheduled' && (
            <>
              <a
                href={`mailto:${interview.candidate_email}?subject=Interview Reminder`}
                className="btn btn-outline"
                style={{ flex: 1, textAlign: 'center' }}
              >
                <Mail size={14} /> Send Reminder
              </a>
              <button
                className="btn btn-outline"
                style={{ flex: 1, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={async () => {
                  if (window.confirm(`Cancel interview for ${interview.candidate_name}?`)) {
                    await cancelScheduledInterview(interview.id);
                    close();
                  }
                }}
              >
                Cancel Interview
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
