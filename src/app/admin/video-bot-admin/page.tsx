"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Video, PlayCircle, Eye, CheckCircle, XCircle, Send, Trash2, Loader2, Mail, CheckSquare, XSquare, MessageSquare } from 'lucide-react';
import { useAppContext } from '@/components/admin/context/AppContext';
import Pagination from '@/components/admin/Pagination';
import SearchableDropdown from '@/components/admin/SearchableDropdown';
import { useDebounce } from '@/hooks/useDebounce';

import WorkflowBadge from '@/components/admin/WorkflowBadge';
import ConfirmActionModal from '@/components/admin/ConfirmActionModal';

const NEXT_JS_URL = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

const VideoBot = () => {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/admin/video-bot-admin') {
      router.replace('/admin/candidates?view=videobot');
    }
  }, [router]);

  const { candidates, jobs, refreshCandidates, apiFetch } = useAppContext();
  // Dashboard state
  const [interviews, setInterviews] = useState<any[]>([]);
  const [interviewsCount, setInterviewsCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const pageSize = 20;
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
  const [inviteDepartment, setInviteDepartment] = useState('');
  const [inviteSubDepartment, setInviteSubDepartment] = useState('');

  const [sending, setSending] = useState(false);
  const [inviteSubject, setInviteSubject] = useState('');
  const [inviteBody, setInviteBody] = useState('');
  const [senders, setSenders] = useState([]);
  const [selectedSender, setSelectedSender] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  
  // Dynamic Departments from jobs
  const availableDepartments = Array.from(new Set(jobs.map((j: any) => j.department).filter(Boolean))) as string[];
  
  const getAvailableSubDepartments = (dept: string) => {
    const subDepts = Array.from(new Set(jobs.filter((j: any) => j.department === dept && j.sub_department).map((j: any) => j.sub_department))) as string[];
    return subDepts.length > 0 ? subDepts : ['General'];
  };
  
  // Copied indicator state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchInterviews(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

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
    // Disabled auto-selection to allow manual cascading
  }, [jobs]);

  useEffect(() => {
    if (inviteCandidateId) {
      const candidate = candidates.find((c: any) => c.id.toString() === inviteCandidateId);
      if (candidate) {
        const position = inviteSubDepartment || candidate.jobApplied || 'Common';
        setInviteSubject(`ElastiCrew Video Bot Screening Invitation — ${position} Position`);
        setInviteBody(`Hello ${candidate.name} 👋,\n\nYou've been invited to complete a video screening for the ${position} position. Our AI-powered platform will guide you through the process.\n\nInstructions & What to expect:\n• Questions: Asked by our AI. You have 90 seconds to answer each.\n• Recording: Starts automatically after a 10-second countdown following the question.\n• Control: Click "Submit Answer" when you are done (or wait for the timer to finish).\n• Hardware: Your webcam and microphone will be used.\n• Environment: Ensure you are in a quiet, well-lit space.\n• Strict Guidelines: This is a one-time link. Do not refresh, exit fullscreen, or switch tabs (doing so 3 times will automatically terminate your screening).`);
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

  const fetchInterviews = async (page = 1, search = '') => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search) queryParams.append('search', search);

      const res = await apiFetch(`/api/interviews/list?${queryParams.toString()}`);
      const data = await res.json();
      setInterviews(data.data || []);
      setInterviewsCount(data.count || 0);
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

  const handleWorkflowActionDirect = async (candidate: any, field: string, value: string) => {
    setActionLoading(candidate.id);
    try {
      const res = await apiFetch('/api/candidates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: candidate.id, [field]: value }),
      });
      if (res.ok) {
        refreshCandidates();
        fetchInterviews();
      } else {
        alert('Failed to update candidate status.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendInvite = async (candidate: any, targetEmail: any, department: any, subDepartment: any, subject: any, body: any, senderEmail: any) => {
    if (!candidate || !department || !subDepartment) return;

    setSending(true);
    try {
      const res = await apiFetch('/api/invites/send', {
        method: 'POST',
        body: JSON.stringify({
          candidate_name: candidate.name,
          candidate_email: targetEmail,
          department: department,
          sub_department: subDepartment,
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
    if (!inviteDepartment) return false;

    let candidateDept = c.department;
    let candidateSubDept = c.sub_department;

    if (c.job_id) {
      const job = jobs.find((j: any) => j.id === c.job_id);
      if (job) {
        candidateDept = job.department;
        candidateSubDept = job.sub_department;
      }
    } else {
      const jobApplied = (c.jobApplied || c.job_applied || '').toLowerCase();
      const exactJob = jobs.find((j: any) => j.title === (c.jobApplied || c.job_applied));
      const fallbackJob = jobs.find((j: any) => 
        (j.sub_department && jobApplied.includes(j.sub_department.toLowerCase())) ||
        (j.department && jobApplied.includes(j.department.toLowerCase()))
      );
      const matchedJob = exactJob || fallbackJob;
      candidateDept = matchedJob?.department || candidateDept;
      candidateSubDept = matchedJob?.sub_department || candidateSubDept;
    }

    // If candidate has no recognizable department, show them so they can be assigned
    if (!candidateDept) return true;

    if (candidateDept !== inviteDepartment) return false;
    
    if (inviteSubDepartment && candidateSubDept && candidateSubDept !== inviteSubDepartment) {
      return false;
    }
    
    return true;
  });

  const handleDeleteInterview = async (id: any) => {
    if (!window.confirm("Are you sure you want to delete this screening record?")) return;

    try {
      const res = await apiFetch(`/api/interviews/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert("Screening deleted successfully!");
        fetchInterviews();
      } else {
        alert("Failed to delete screening");
      }
    } catch (e) {
      alert("Error deleting screening");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      


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
          
          <div className="grid grid-cols-3 gap-4" style={{ marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <SearchableDropdown 
                options={availableDepartments}
                value={inviteDepartment}
                onChange={(newDept) => {
                  setInviteDepartment(newDept);
                  setInviteSubDepartment('');
                  setInviteCandidateId('');
                }}
                placeholder="Select Department..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sub-Department</label>
              <SearchableDropdown 
                options={inviteDepartment ? getAvailableSubDepartments(inviteDepartment) : []}
                value={inviteSubDepartment}
                onChange={(newSub) => {
                  setInviteSubDepartment(newSub);
                  setInviteCandidateId('');
                }}
                placeholder="Select Sub-Department..."
                disabled={!inviteDepartment}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem', display: 'block' }}>
                Candidate will be asked all questions for this sub-department.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Select Candidate</label>
              <SearchableDropdown 
                options={filteredCandidatesForDropdown.map((c: any) => ({
                  value: c.id.toString(),
                  label: `${c.name} (${c.jobApplied || 'No Sub-Department'})`
                }))}
                value={inviteCandidateId}
                onChange={(val) => setInviteCandidateId(val)}
                placeholder="Choose candidate..."
                disabled={!inviteSubDepartment}
              />
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
                  handleSendInvite(
                    candidate, 
                    targetEmail, 
                    inviteDepartment, 
                    inviteSubDepartment,
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
          <h3 className="card-title">Common Screening Questions</h3>
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
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading screenings...</td>
                </tr>
              ) : interviews.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>No screenings found. Send one!</td>
                </tr>
              ) : interviews.map(interview => {
                const isExpired = new Date(interview.expires_at) < new Date();
                const isFailed = interview.status === "failed" || (interview.status !== "completed" && interview.scores?.in_progress === true && isExpired);
                const status = interview.status === "completed" ? "completed" : (isFailed ? "failed" : (isExpired ? "expired" : "pending"));
                const matchedCandidate = candidates.find((c: any) => {
                  const cleanName = (n: string) => (n || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
                  const matchesEmail = c.email && interview.candidate_email && c.email.trim().toLowerCase() === interview.candidate_email.trim().toLowerCase();
                  const matchesName = c.name && interview.candidate_name && cleanName(c.name) === cleanName(interview.candidate_name);
                  return matchesEmail || matchesName;
                });
                const videoStageStatus = matchedCandidate?.videoStatus ?? matchedCandidate?.video_status ?? 'Pending';

                return (
                  <tr key={interview.id}>
                    <td>
                      <div style={{ fontWeight: '500' }}>{interview.candidate_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{interview.candidate_email}</div>
                    </td>
                    <td>
                      <span className="badge badge-gray">{interview.sub_department}</span>
                    </td>
                    <td>
                      {status === 'completed' ? (
                        <span className="badge badge-success">Screening Completed</span>
                      ) : status === 'failed' ? (
                        <span className="badge badge-error" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>Screening Failed</span>
                      ) : status === 'expired' ? (
                         <span className="badge badge-error" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>Link Expired</span>
                      ) : (
                        <span className="badge badge-warning">Screening Pending</span>
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
                              <Eye size={14}/> View Screening
                            </a>
                            
                            {/* Dropdown status select for video screening */}
                            {matchedCandidate && (
                              <select
                                value={(() => {
                                  const status = matchedCandidate.videoStatus || matchedCandidate.video_status || 'Pending';
                                  return (status === 'Pending' || status === 'Under Review') ? 'Pending' : status;
                                })()}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === 'Approved') {
                                    setConfirmModal({ type: 'approve', candidate: matchedCandidate });
                                  } else if (val === 'Rejected') {
                                    setConfirmModal({ type: 'reject', candidate: matchedCandidate });
                                  } else {
                                    handleWorkflowActionDirect(matchedCandidate, 'video_status', val);
                                  }
                                }}
                                disabled={actionLoading === matchedCandidate.id}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.75rem',
                                  borderRadius: '6px',
                                  border: '1px solid var(--gray-300)',
                                  background: '#fff',
                                  fontWeight: '600',
                                  color: 'var(--brand-navy)',
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="Pending">Under Review</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                              </select>
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
                          title="Delete Screening" 
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
        
        {/* Pagination Controls */}
        <div style={{ padding: '0 20px 20px 20px' }}>
          <Pagination 
            currentPage={currentPage}
            totalPages={Math.ceil((interviewsCount || 0) / pageSize)}
            onPageChange={(page) => setCurrentPage(page)}
            totalCount={interviewsCount}
            pageSize={pageSize}
          />
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

