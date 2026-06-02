"use client";

import React, { useState, useEffect } from 'react';
import { Video, Settings2, PlayCircle, Eye, CheckCircle, XCircle, Send, Trash2, Loader2, Mail, CheckSquare, XSquare, MessageSquare } from 'lucide-react';
import { useAppContext } from '@/components/admin/context/AppContext';
import QuestionBankModal from '@/components/admin/QuestionBankModal';
import WorkflowBadge from '@/components/admin/WorkflowBadge';
import ConfirmActionModal from '@/components/admin/ConfirmActionModal';

const NEXT_JS_URL = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

const VideoBot = () => {
  const { candidates, jobs, refreshCandidates, apiFetch } = useAppContext();
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  
  // Dashboard state
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Workflow states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: 'approve' | 'reject'; candidate: any } | null>(null);

  // Remark states
  const [remarkPopover, setRemarkPopover] = useState<{ candidateId: string; name: string } | null>(null);
  const [remarkText, setRemarkText] = useState('');
  const [remarkSaving, setRemarkSaving] = useState(false);

  // Invite Form state
  const [inviteCandidateId, setInviteCandidateId] = useState('');
  const [inviteJobRole, setInviteJobRole] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState('Technology and Delivery');
  const [inviteSubDepartment, setInviteSubDepartment] = useState('Development');
  const [inviteRole, setInviteRole] = useState('Senior Dev');
  const [sending, setSending] = useState(false);
  const [inviteSubject, setInviteSubject] = useState('');
  const [inviteBody, setInviteBody] = useState('');
  const [senders, setSenders] = useState([]);
  const [selectedSender, setSelectedSender] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  
  // Dynamic Departments from jobs
  const dynamicDepartments = Array.from(new Set(jobs.map((j: any) => j.department).filter(Boolean)));
  const availableDepartments = dynamicDepartments.length > 0 ? dynamicDepartments : ['Technology and Delivery', 'Engineering', 'HR', 'Marketing'];
  
  const getAvailableSubDepartments = (dept) => {
    const subDepts = Array.from(new Set(jobs.filter(j => j.department === dept && j.sub_department).map(j => j.sub_department)));
    if (subDepts.length > 0) return subDepts;
    
    const defaults = {
      'Technology and Delivery': ['Development', 'Testing'],
      'Operations': ['LnD'],
      'Engineering': ['DevOps', 'Data Science', 'SRE'],
      'HR': ['Recruitment', 'Operations'],
      'Marketing': ['SEO', 'Content', 'Social Media']
    };
    return defaults[dept] || ['General'];
  };
  
  const getAvailableRoles = (dept: any, subDept: any) => {
    const roles = Array.from(new Set(jobs.filter((j: any) => j.department === dept && (j.sub_department === subDept || !j.sub_department)).map((j: any) => j.title)));
    if (roles.length > 0) return roles;

    const defaults: any = {
      'Technology and Delivery': {
        'Development': ['Senior Dev', 'TSE Intern', 'PHP Developer', 'Frontend', 'Backend'],
        'Testing': ['Senior QA', 'QA Intern']
      },
      'Operations': {
        'LnD': ['Manager', 'Associate Manager']
      }
    };
    return (defaults[dept] && defaults[dept][subDept]) || ['General Role'];
  };
  
  // Copied indicator state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchInterviews();
  }, [showQuestionModal]); // refresh when modal closes

  useEffect(() => {
    const fetchSenders = async () => {
      try {
        const res = await apiFetch('/api/emails/senders');
        if (res.ok) {
          const data = await res.json();
          if (data.emails && data.emails.length > 0) {
            setSenders(data.emails);
            setSelectedSender(data.emails[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch senders:", err);
      }
    };
    fetchSenders();
  }, []);
  
  // Set default selected department/sub-department once jobs load
  useEffect(() => {
    if (jobs.length > 0) {
      if (!inviteDepartment || !dynamicDepartments.includes(inviteDepartment)) {
        const firstDept = availableDepartments[0] as string;
        setInviteDepartment(firstDept);
        const firstSubDept = getAvailableSubDepartments(firstDept)[0] as string;
        setInviteSubDepartment(firstSubDept);
        setInviteRole(getAvailableRoles(firstDept, firstSubDept)[0] as string);
      }
    }
  }, [jobs]);

  useEffect(() => {
    if (inviteCandidateId) {
      const candidate = candidates.find((c: any) => c.id.toString() === inviteCandidateId);
      if (candidate) {
        const jobRole = candidate.jobApplied || 'Common';
        setInviteSubject(`Your Interview Invitation — ${jobRole} Position`);
        setInviteBody(`Hello ${candidate.name} 👋,\n\nYou've been invited to complete a video interview for the ${jobRole} position. Our AI-powered platform will guide you through the process.\n\nWhat to expect:\n• The AI will ask you questions using voice\n• You control when to start and stop recording each answer\n• Your webcam will be on during the interview\n• Ensure you are in a quiet, well-lit space`);
        setTargetEmail(candidate.email || '');
      }
    } else {
      setInviteSubject('');
      setInviteBody('');
      setTargetEmail('');
    }
  }, [inviteCandidateId, candidates]);

  const copyToClipboard = (text: string, id: string) => {
    // Execute synchronous copy first to guarantee it runs inside the user gesture
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    textArea.style.top = "0";
    textArea.style.left = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    let successful = false;
    try {
      successful = document.execCommand('copy');
    } catch (err) {
      console.error("execCommand failed", err);
    }
    document.body.removeChild(textArea);

    if (successful) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      // Fallback to async clipboard API if execCommand is not supported
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
        })
        .catch(err => console.error("Clipboard API failed", err));
    }
  };

  const fetchInterviews = async () => {
    try {
      const res = await apiFetch('/api/interviews/list');
      const data = await res.json();
      setInterviews(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleWorkflowAction = async (candidate: any, type: 'approve' | 'reject', reason?: string) => {
    setActionLoading(candidate.id);
    setConfirmModal(null);
    try {
      const endpoint = type === 'approve'
        ? `/api/candidate/video-approve/${candidate.id}`
        : `/api/candidate/video-reject/${candidate.id}`;
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: type === 'reject' ? JSON.stringify({ reason }) : undefined,
      });
      if (res.ok) {
        refreshCandidates();
        fetchInterviews();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData?.error ?? `Failed to ${type} video screening.`);
      }
    } catch (err) {
      console.error('[handleWorkflowAction]', err);
      alert('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendInvite = async (candidate: any, targetEmail: any, jobRole: any, department: any, subDepartment: any, role: any, subject: any, body: any, senderEmail: any) => {
    if (!candidate || !department || !subDepartment || !role) return;

    setSending(true);
    try {
      const res = await apiFetch('/api/invites/send', {
        method: 'POST',
        body: JSON.stringify({
          candidate_name: candidate.name,
          candidate_email: targetEmail,
          job_role: jobRole,
          department: department,
          sub_department: subDepartment,
          role: role,
          subject: subject,
          body: body,
          senderEmail: senderEmail
        })
      });

      if (res.ok) {
        // Update the candidate's email in the backend if it was edited
        if (targetEmail !== candidate.email) {
          try {
            await apiFetch('/api/candidates', {
              method: 'PATCH',
              body: JSON.stringify({
                id: candidate.id,
                email: targetEmail
              })
            });
            refreshCandidates();
          } catch (patchErr) {
            console.error("Failed to update candidate email:", patchErr);
          }
        }
        
        alert("Invite sent successfully!");
        fetchInterviews();
        setInviteCandidateId('');
        setInviteSubject('');
        setInviteBody('');
      } else {
        const err = await res.json();
        alert(err.error || "Failed to send invite");
      }
    } catch (e) {
      alert("Error sending invite");
    }
    setSending(false);
  };

  const filteredCandidatesForDropdown = candidates.filter((c: any) => {
    // Only show candidates where resume_stage_status = 'Approved'
    const resumeApproved = (c.resume_stage_status === 'Approved' || c.resumeStageStatus === 'Approved');
    if (!resumeApproved) return false;

    const job = jobs.find((j: any) => j.title === c.jobApplied);
    if (!job) return false;
    
    // Strict Department check based on the selected Department
    if (job.department !== inviteDepartment) return false;
    
    // Strict Role check
    if (inviteRole && inviteRole !== 'General Role') {
       if (job.title !== inviteRole) {
          return false; 
       }
    }
    return true;
  });

  const handleDeleteInterview = async (id: any) => {
    if (!window.confirm("Are you sure you want to delete this interview record?")) return;

    try {
      const res = await apiFetch(`/api/interviews/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert("Interview deleted successfully!");
        fetchInterviews();
      } else {
        alert("Failed to delete interview");
      }
    } catch (e) {
      alert("Error deleting interview");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {showQuestionModal && (
        <QuestionBankModal onClose={() => setShowQuestionModal(false)} />
      )}

      {confirmModal && (
        <ConfirmActionModal
          title={confirmModal.type === 'approve' ? 'Approve Video Screening' : 'Reject Video Screening'}
          message={confirmModal.type === 'approve' 
            ? `Are you sure you want to approve ${confirmModal.candidate.name}'s video screening? This will move them to the Technical Scheduler stage.`
            : `Are you sure you want to reject ${confirmModal.candidate.name}'s video screening?`
          }
          confirmLabel={confirmModal.type === 'approve' ? 'Approve' : 'Reject'}
          onConfirm={(reason) => handleWorkflowAction(confirmModal.candidate, confirmModal.type, reason)}
          onCancel={() => setConfirmModal(null)}
          danger={confirmModal.type === 'reject'}
          requireReason={confirmModal.type === 'reject'}
          reasonPlaceholder="Enter rejection reason..."
          loading={actionLoading === confirmModal.candidate.id}
        />
      )}

      {/* Send Invite Panel (horizontal layout) */}
      <div className="card" style={{ backgroundColor: 'var(--gray-50)' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ fontSize: '1.125rem' }}>Send Video Invite</h3>
        </div>
        <div className="card-body">
          
          <div className="grid grid-cols-4 gap-4" style={{ marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select 
                className="form-select" 
                value={inviteDepartment}
                onChange={e => {
                  const newDept = e.target.value;
                  setInviteDepartment(newDept);
                  const subs = getAvailableSubDepartments(newDept);
                  const firstSub = subs[0];
                  setInviteSubDepartment(firstSub);
                  setInviteRole(getAvailableRoles(newDept, firstSub)[0]);
                  setInviteCandidateId('');
                }}
              >
                {availableDepartments.map((d: any) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Sub-Department</label>
              <select 
                className="form-select"
                value={inviteSubDepartment}
                onChange={e => {
                  const newSub = e.target.value;
                  setInviteSubDepartment(newSub);
                  setInviteRole(getAvailableRoles(inviteDepartment, newSub)[0]);
                  setInviteCandidateId('');
                }}
              >
                {(getAvailableSubDepartments(inviteDepartment)).map((sd: any) => (
                  <option key={sd} value={sd}>{sd}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select 
                className="form-select"
                value={inviteRole}
                onChange={e => {
                  setInviteRole(e.target.value);
                  setInviteCandidateId('');
                }}
              >
                {(getAvailableRoles(inviteDepartment, inviteSubDepartment)).map((r: any) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem', display: 'block' }}>
                Candidate will be asked all questions for this role.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Select Candidate</label>
              <select className="form-select" value={inviteCandidateId} onChange={e => setInviteCandidateId(e.target.value)}>
                <option value="">Choose candidate...</option>
                {filteredCandidatesForDropdown.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.jobApplied || 'No Sub-Department'})</option>
                ))}
              </select>
              {filteredCandidatesForDropdown.length === 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem', display: 'block' }}>
                  No candidates found for this department.
                </span>
              )}
            </div>
          </div>

          {inviteCandidateId && (
            <div className="grid grid-cols-2 gap-6" style={{ marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--brand-navy)' }}>Email Configuration</h4>
                
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Send From</label>
                  <select 
                    className="form-select" 
                    value={selectedSender}
                    onChange={e => setSelectedSender(e.target.value)}
                  >
                    {senders.map(email => (
                      <option key={`sender-${email}`} value={email}>{email}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Candidate Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--brand-navy)' }}>Message Content</h4>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Subject</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={inviteSubject}
                    onChange={(e) => setInviteSubject(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Email Body</label>
                  <textarea 
                    className="form-input" 
                    rows={14}
                    value={inviteBody}
                    onChange={(e) => setInviteBody(e.target.value)}
                    style={{ resize: 'vertical', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className="btn btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px', justifyContent: 'center' }}
              onClick={() => {
                const candidate = candidates.find((c: any) => c.id.toString() === inviteCandidateId);
                if (candidate) {
                  const jobRole = candidate.jobApplied || 'Common';
                  handleSendInvite(
                    candidate, 
                    targetEmail, 
                    jobRole, 
                    inviteDepartment, 
                    inviteSubDepartment,
                    inviteRole,
                    inviteSubject,
                    inviteBody,
                    selectedSender
                  );
                }
              }}
              disabled={sending || !inviteCandidateId || !inviteSubject || !inviteBody}
            >
              {sending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send Mail</>}
            </button>
          </div>
          
        </div>
      </div>

      {/* Unified Dashboard Table */}
      <div className="card">
        <div className="card-header flex justify-between items-center">
          <h3 className="card-title">Common Interview Questions</h3>
          <button className="btn btn-primary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }} onClick={() => setShowQuestionModal(true)}>
            <Settings2 size={16} /> Manage Question Bank
          </button>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: '0' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Sub-Department</th>
                <th>Status</th>
                <th>Approval Status</th>
                <th>Remark</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading interviews...</td>
                </tr>
              ) : interviews.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>No interviews found. Send one!</td>
                </tr>
              ) : interviews.map(interview => {
                const isExpired = new Date(interview.expires_at) < new Date();
                const status = interview.status === "completed" ? "completed" : (isExpired ? "expired" : "pending");
                const matchedCandidate = candidates.find((c: any) => {
                  const cleanName = (n: string) => (n || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
                  const matchesEmail = c.email && interview.candidate_email && c.email.trim().toLowerCase() === interview.candidate_email.trim().toLowerCase();
                  const matchesName = c.name && interview.candidate_name && cleanName(c.name) === cleanName(interview.candidate_name);
                  return matchesEmail || matchesName;
                });
                const videoStageStatus = matchedCandidate?.video_stage_status ?? matchedCandidate?.videoStageStatus ?? 'Pending';

                return (
                  <tr key={interview.id}>
                    <td>
                      <div style={{ fontWeight: '500' }}>{interview.candidate_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{interview.candidate_email}</div>
                    </td>
                    <td>
                      <span className="badge badge-gray">{interview.job_role}</span>
                    </td>
                    <td>
                      {status === 'completed' ? (
                        <span className="badge badge-success">Completed</span>
                      ) : status === 'expired' ? (
                         <span className="badge badge-error" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>Expired</span>
                      ) : (
                        <span className="badge badge-warning">Pending</span>
                      )}
                    </td>
                    <td>
                      <WorkflowBadge status={videoStageStatus} size="sm" />
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 8px', verticalAlign: 'middle' }}>
                      {(() => {
                        const candidateRemark = matchedCandidate?.remark_video;
                        const hasRemark = !!candidateRemark;
                        return (
                          <button
                            onClick={() => {
                              if (matchedCandidate) {
                                setRemarkPopover({ candidateId: matchedCandidate.id, name: matchedCandidate.name });
                                setRemarkText(candidateRemark || '');
                              } else {
                                alert("No matching candidate found to add remark.");
                              }
                            }}
                            title={hasRemark ? `Remark: ${candidateRemark}` : 'Add Remark'}
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '8px',
                              border: hasRemark ? '1.5px solid #d97706' : '1.5px solid #e2e8f0',
                              background: hasRemark ? '#f59e0b' : '#f8fafc',
                              color: hasRemark ? '#fff' : '#94a3b8',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              transition: 'all 0.2s',
                              boxShadow: hasRemark ? '0 2px 5px rgba(245,158,11,0.3)' : 'none',
                            }}
                          >
                            <MessageSquare size={13} />
                            {hasRemark && (
                              <span style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#10b981',
                                border: '1.5px solid #fff',
                              }} />
                            )}
                          </button>
                        );
                      })()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {status === 'completed' ? (
                          <>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', minWidth: '110px' }}
                              onClick={() => {
                                const url = `${NEXT_JS_URL}/share/${interview.share_token}`;
                                copyToClipboard(url, `share-${interview.id}`);
                              }}
                            >
                              {copiedId === `share-${interview.id}` ? "Copied!" : "Copy Share Link"}
                            </button>
                            <a 
                              href={`${NEXT_JS_URL}/video-bot-admin/dashboard/interviews/${interview.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-primary" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none' }}
                            >
                              <Eye size={14}/> View Interview
                            </a>
                            
                            {/* Approve / Reject buttons for video screening */}
                            {matchedCandidate && videoStageStatus === 'Pending' && (
                              <>
                                <button
                                  onClick={() => setConfirmModal({ type: 'approve', candidate: matchedCandidate })}
                                  disabled={actionLoading === matchedCandidate.id}
                                  title="Approve Video"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    borderRadius: '6px',
                                    background: '#10b981',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  <CheckSquare size={12} />
                                  Approve
                                </button>
                                <button
                                  onClick={() => setConfirmModal({ type: 'reject', candidate: matchedCandidate })}
                                  disabled={actionLoading === matchedCandidate.id}
                                  title="Reject Video"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    borderRadius: '6px',
                                    background: '#ef4444',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  <XSquare size={12} />
                                  Reject
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', minWidth: '110px' }}
                            onClick={() => {
                              const url = `${NEXT_JS_URL}/interview/${interview.id}`;
                              copyToClipboard(url, `invite-${interview.id}`);
                            }}
                          >
                            {copiedId === `invite-${interview.id}` ? "Copied!" : "Copy Invite Link"}
                          </button>
                        )}
                        <button 
                          className="btn btn-ghost" 
                          title="Delete Interview" 
                          style={{ padding: '0.25rem', color: 'var(--danger)' }}
                          onClick={() => handleDeleteInterview(interview.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Remark Popover Modal */}
      {remarkPopover && (
        <div
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(15,23,42,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1.5rem',
          }}
          onClick={() => setRemarkPopover(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px', padding: '24px 28px',
              width: '100%', maxWidth: '400px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              animation: 'slideInRemark 0.18s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={16} color="#d97706" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Remark of Video Bot Screening</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{remarkPopover.name}</div>
              </div>
            </div>

            <textarea
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder="Write your remark about this candidate..."
              rows={4}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1.5px solid #e2e8f0', borderRadius: '10px',
                padding: '10px 12px', fontSize: '0.85rem', color: '#1e293b',
                resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.2s', marginBottom: '16px',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#f59e0b')}
              onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setRemarkPopover(null)}
                disabled={remarkSaving}
                style={{
                  flex: 1, padding: '9px', border: '1.5px solid #e2e8f0',
                  borderRadius: '8px', background: '#f8fafc', color: '#475569',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setRemarkSaving(true);
                  try {
                    await apiFetch('/api/candidates', {
                      method: 'PATCH',
                      body: JSON.stringify({ id: remarkPopover.candidateId, remark_video: remarkText }),
                    });
                    await refreshCandidates();
                    setRemarkPopover(null);
                  } catch (e) {
                    console.error('Remark save error:', e);
                  } finally {
                    setRemarkSaving(false);
                  }
                }}
                disabled={remarkSaving}
                style={{
                  flex: 1, padding: '9px', border: 'none',
                  borderRadius: '8px',
                  background: remarkSaving ? '#fde68a' : '#f59e0b',
                  color: '#fff', fontSize: '0.85rem', fontWeight: 700,
                  cursor: remarkSaving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                {remarkSaving ? 'Saving...' : '💾 Save Remark'}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes slideInRemark {
              from { opacity: 0; transform: scale(0.95) translateY(-8px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}

    </div>
  );
};

export default VideoBot;

