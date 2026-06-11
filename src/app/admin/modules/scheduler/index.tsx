"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useScheduler } from './hooks/useScheduler.js';
import { useSchedulerContext } from './store/schedulerReducer.js';
import { useAppContext } from '@/components/admin/context/AppContext';

export function SchedulerApp() {
  const { 
    state, 
    loadInterviews,
    scheduleInterview, 
    cancelScheduledInterview, 
    addPanelist, 
    removePanelist 
  } = useScheduler();
  const { panelists, interviews, loading } = state;
  const { candidates, refreshCandidates, apiFetch } = useAppContext();

  // Dialog state
  const [isPanelModalOpen, setIsPanelModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Panellist Form fields
  const [panelName, setPanelName] = useState('');
  const [panelDesignation, setPanelDesignation] = useState('');
  const [panelDepartment, setPanelDepartment] = useState('');
  const [panelEmail, setPanelEmail] = useState('');

  // Scheduler Form fields
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedPanelistIds, setSelectedPanelistIds] = useState<string[]>([]);
  const [selectDuration, setSelectDuration] = useState('60 mins');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');

  // Filter interviews to only scheduled technical rounds
  const scheduledInterviews = useMemo(() => {
    return interviews.filter(iv => iv.status === 'scheduled');
  }, [interviews]);

  // Handle register technical panellist submission
  const handleRegisterPanelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!panelName || !panelDesignation || !panelEmail || !panelDepartment) return;

    const data = {
      name: panelName.trim(),
      role: panelDesignation.trim(),
      department: panelDepartment.trim(),
      email: panelEmail.trim(),
      avatar: panelName.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      color: ['#0E2D7B', '#7DBA00', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 6)]
    };

    try {
      await addPanelist(data);
      setIsPanelModalOpen(false);
      setPanelName('');
      setPanelDesignation('');
      setPanelDepartment('');
      setPanelEmail('');
    } catch (err) {
      console.error("Failed to add panelist:", err);
    }
  };

  // Handle remove panelist chip
  const handleRemovePanelist = async (id: string, name: string) => {
    if (window.confirm(`Remove ${name} from active directory options?`)) {
      try {
        await removePanelist(id, name);
      } catch (err) {
        console.error("Failed to remove panelist:", err);
      }
    }
  };

  // Panellist checkbox toggle
  const togglePanelistCheckbox = (id: string) => {
    setSelectedPanelistIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Format date helper (e.g. "June 08, 2026 - 10:00 AM")
  const formatScheduleDetails = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return '';
    try {
      const formattedDate = new Date(dateStr).toLocaleDateString('en-US', { 
        month: 'long', 
        day: '2-digit', 
        year: 'numeric' 
      });
      const [hours, minutes] = timeStr.split(':');
      const hInt = parseInt(hours);
      const ampm = hInt >= 12 ? 'PM' : 'AM';
      const formattedTime = `${hInt % 12 || 12}:${minutes} ${ampm}`;
      return `${formattedDate} - ${formattedTime}`;
    } catch (e) {
      return `${dateStr} - ${timeStr}`;
    }
  };

  // Teams Assets API Sync alert
  const handleFetchTeamsAsset = (assetType: string, candidateName: string) => {
    alert(`Teams Asset API Sync: Compiling media secure data chunks... Locating ${candidateName}'s Technical Interview ${assetType} link data records successfully.`);
  };

  // Manage candidate action dropdown dispatches
  const handleSchedulerAction = async (val: string, iv: any) => {
    if (!val) return;

    const matchedCandidate = candidates.find((c: any) => 
      c.email === iv.candidate_email || 
      c.name.toLowerCase() === iv.candidate_name.toLowerCase()
    );

    if (val === 'cancel') {
      if (window.confirm(`Cancel interview for ${iv.candidate_name}?`)) {
        try {
          await cancelScheduledInterview(iv.id);
          if (matchedCandidate) {
            await apiFetch('/api/candidates', {
              method: 'PATCH',
              body: JSON.stringify({ id: matchedCandidate.id, stage: 'Video Bot Screening', tech_status: 'Pending' })
            });
            refreshCandidates();
          }
        } catch (e) {
          console.error(e);
        }
      }
    } else if (val === 'hr-invite') {
      alert(`Success: HR Round Invitation successfully configured and dispatched to ${iv.candidate_name}. Moving candidate down the pipeline.`);
      try {
        if (matchedCandidate) {
          await apiFetch('/api/candidates', {
            method: 'PATCH',
            body: JSON.stringify({ id: matchedCandidate.id, stage: 'HR Interview', tech_status: 'Approved' })
          });
          refreshCandidates();
        }
        // Mark interview as completed/closed
        await apiFetch('/api/candidates', {
          method: 'PATCH',
          body: JSON.stringify({ id: iv.candidate_id || matchedCandidate?.id, tech_status: 'Approved' })
        });
        // We can set status to completed in db
        await apiFetch(`/api/interviews`, {
          method: 'PATCH',
          body: JSON.stringify({ id: iv.id, status: 'completed' })
        });
        loadInterviews();
      } catch (e) {
        console.error(e);
      }
    } else if (val === 'delete') {
      if (window.confirm(`Are you sure you want to delete ${iv.candidate_name} from the scheduling queue?`)) {
        try {
          if (matchedCandidate) {
            await apiFetch(`/api/candidates?id=${matchedCandidate.id}`, { method: 'DELETE' });
            refreshCandidates();
          }
          await apiFetch(`/api/interviews/${iv.id}`, { method: 'DELETE' });
          loadInterviews();
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  // Schedule technical Panel form submit
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPanelistIds.length === 0) {
      alert("Please check off at least one panellist engineer to run this technical interview block session.");
      return;
    }

    const cand = candidates.find((c: any) => c.id.toString() === selectedCandidateId);
    if (!cand) {
      alert("Please select a target candidate profile.");
      return;
    }

    const durationVal = selectDuration === '30 mins' ? 30 : selectDuration === '45 mins' ? 45 : selectDuration === '1:30 mins' ? 90 : 60;

    const data = {
      candidateId: cand.id,
      candidateName: cand.name,
      candidateEmail: cand.email,
      jobRole: cand.jobApplied || cand.job_applied || 'General',
      panelistIds: selectedPanelistIds,
      date: interviewDate,
      time: interviewTime,
      duration: durationVal,
      notes: '',
    };

    try {
      await scheduleInterview(data);

      // Automatically move stage to Technical Scheduler
      await apiFetch('/api/candidates', {
        method: 'PATCH',
        body: JSON.stringify({
          id: cand.id,
          stage: 'Technical Scheduler',
          tech_status: 'Scheduled'
        })
      });

      refreshCandidates();
      loadInterviews();
      setIsScheduleModalOpen(false);
      setSelectedCandidateId('');
      setSelectedPanelistIds([]);
      setSelectDuration('60 mins');
      setInterviewDate('');
      setInterviewTime('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <style>{`
        /* --- STYLES ALIGNED WITH HTML SCREENSHOT --- */
        .grid-layout-th, .grid-layout-td {
          padding: 14px 16px;
          text-align: left;
          vertical-align: middle;
        }
        .col-cand { width: 25%; }
        .col-panel { width: 25%; }
        .col-time { width: 25%; }
        .col-assets { width: 15%; }
        .col-manage { width: 10%; text-align: right; }

        .panel-directory-card {
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px 20px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .directory-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .directory-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--brand-navy);
          margin: 0;
        }
        .chip-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .panellist-chip {
          display: inline-flex;
          align-items: center;
          background-color: #f1f5f9;
          color: #334155;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          border: 1px solid #e2e8f0;
        }
        .remove-chip-btn {
          background: none;
          border: none;
          color: #94a3b8;
          margin-left: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 700;
          line-height: 1;
        }
        .remove-chip-btn:hover { color: #b91c1c; }

        .checkbox-dropdown-panel {
          border: 1px solid var(--border);
          border-radius: 6px;
          max-height: 120px;
          overflow-y: auto;
          padding: 8px 12px;
          background-color: #ffffff;
        }
        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
          font-size: 0.875rem;
          color: var(--text-main);
          cursor: pointer;
        }

        .asset-link-active {
          color: #7c3aed;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .asset-link-active:hover { text-decoration: underline; }

        .stacked-panel-wrapper {
          margin-bottom: 6px;
        }
        .stacked-panel-wrapper:last-child {
          margin-bottom: 0;
        }
      `}</style>

      {/* HEADER SECTION */}
      <header className="header-actions" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Technical Interview Scheduler</h1>
        <button className="btn-add" onClick={() => setIsScheduleModalOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px' }}>
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
          Book Technical Session
        </button>
      </header>

      {/* ACTIVE PANEL DIRECTORY CARD */}
      <div className="panel-directory-card">
        <div className="directory-header">
          <h3 className="directory-title">Active Technical Interview Panel</h3>
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setIsPanelModalOpen(true)}>
            + Add Panellist
          </button>
        </div>
        <div className="chip-container">
          {panelists.map((p: any) => (
            <div key={p.id} className="panellist-chip">
              <span>{p.name} ({p.role})</span>
              <button className="remove-chip-btn" onClick={() => handleRemovePanelist(p.id, p.name)}>×</button>
            </div>
          ))}
          {panelists.length === 0 && (
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)', fontStyle: 'italic' }}>
              No active panelists registered.
            </span>
          )}
        </div>
      </div>

      {/* CANDIDATE SCHEDULER TABLE */}
      <div className="table-responsive-wrapper">
        <table className="candidate-table" style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr>
              <th className="grid-layout-th col-cand">Candidate Name</th>
              <th className="grid-layout-th col-panel">Assigned Panellists</th>
              <th className="grid-layout-th col-time">Schedule Details</th>
              <th className="grid-layout-th col-assets">Teams Assets</th>
              <th className="grid-layout-th col-manage" style={{ paddingRight: '24px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                  Loading technical interviews...
                </td>
              </tr>
            ) : scheduledInterviews.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                  No scheduled technical sessions match filters.
                </td>
              </tr>
            ) : (
              scheduledInterviews.map((iv: any) => {
                const assigned = (iv.panelists || []).map((id: string) => panelists.find((p: any) => p.id === id)).filter(Boolean);
                return (
                  <tr key={iv.id} className="candidate-row">
                    <td className="grid-layout-td col-cand">
                      <strong>{iv.candidate_name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{iv.job_role}</div>
                    </td>
                    <td className="grid-layout-td col-panel">
                      {assigned.map((p: any) => (
                        <div key={p.id} className="stacked-panel-wrapper">
                          <strong>{p.name}</strong> <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({p.role})</span>
                        </div>
                      ))}
                      {assigned.length === 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>No panellists assigned</span>
                      )}
                    </td>
                    <td className="grid-layout-td col-time">
                      {formatScheduleDetails(iv.date, iv.time)}
                      <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 500 }}>
                        Duration: {iv.duration} mins
                      </div>
                    </td>
                    <td className="grid-layout-td col-assets">
                      <span className="asset-link-active" onClick={() => handleFetchTeamsAsset('Recording', iv.candidate_name)}>
                        🎥 Recording
                      </span>
                      <br />
                      <span className="asset-link-active" style={{ marginTop: '4px' }} onClick={() => handleFetchTeamsAsset('Transcript', iv.candidate_name)}>
                        📄 Transcript
                      </span>
                    </td>
                    <td className="grid-layout-td col-manage">
                      <select 
                        className="action-dropdown" 
                        style={{ width: '100px' }} 
                        value="" 
                        onChange={e => handleSchedulerAction(e.target.value, iv)}
                      >
                        <option value="" disabled>Manage</option>
                        <option value="cancel">Cancel Interview</option>
                        <option value="hr-invite">Send HR Invite</option>
                        <option value="delete" className="danger-option">Delete Candidate</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: REGISTER TECHNICAL PANELLIST */}
      {isPanelModalOpen && (
        <div className="modal-overlay active" onClick={() => setIsPanelModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2 className="modal-header">Register Technical Panellist</h2>
            <form onSubmit={handleRegisterPanelist}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Enter Panellist's name"
                  value={panelName}
                  onChange={e => setPanelName(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Designation</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g., Tech Lead, SDE-3" 
                  value={panelDesignation}
                  onChange={e => setPanelDesignation(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g., Technology and Delivery" 
                  value={panelDepartment}
                  onChange={e => setPanelDepartment(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Email ID</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="username@company.com" 
                  value={panelEmail}
                  onChange={e => setPanelEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsPanelModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" style={{ backgroundColor: 'var(--primary-blue)' }}>
                  Add Panellist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SCHEDULE TECHNICAL PANEL SESSION */}
      {isScheduleModalOpen && (
        <div className="modal-overlay active" onClick={() => setIsScheduleModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2 className="modal-header">Schedule Technical Panel Session</h2>
            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group">
                <label>Organiser Address</label>
                <input type="email" className="form-control" value="hr@elasticrew.com" readOnly />
              </div>
              <div className="form-group">
                <label>Target Interview Candidate</label>
                <select 
                  className="form-control" 
                  value={selectedCandidateId}
                  onChange={e => setSelectedCandidateId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select candidate profile</option>
                  {candidates
                    .filter((c: any) => c.stage !== 'HR Interview' && c.stage !== 'Offered' && c.stage !== 'Rejected')
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.jobApplied || c.job_applied || 'General'})
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="form-group">
                <label>Select Interview Panellists (Multiple Allowed)</label>
                <div className="checkbox-dropdown-panel">
                  {panelists.map((p: any) => (
                    <label key={p.id} className="checkbox-item">
                      <input 
                        type="checkbox" 
                        checked={selectedPanelistIds.includes(p.id)}
                        onChange={() => togglePanelistCheckbox(p.id)}
                      />
                      <span>{p.name} ({p.role})</span>
                    </label>
                  ))}
                  {panelists.length === 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No active panel members registered yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Session Duration Frame</label>
                <select 
                  className="form-control" 
                  value={selectDuration}
                  onChange={e => setSelectDuration(e.target.value)}
                  required
                >
                  <option value="30 mins">30 mins</option>
                  <option value="45 mins">45 mins</option>
                  <option value="60 mins">60 mins</option>
                  <option value="1:30 mins">1:30 mins</option>
                </select>
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label>Target Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={interviewDate}
                    onChange={e => setInterviewDate(e.target.value)}
                    required 
                  />
                </div>
                <div>
                  <label>Start Time Slot</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    value={interviewTime}
                    onChange={e => setInterviewTime(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsScheduleModalOpen(false)}>
                  Cancel Assignment
                </button>
                <button type="submit" className="btn-submit" style={{ backgroundColor: '#10b981' }}>
                  Dispatch Teams Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
