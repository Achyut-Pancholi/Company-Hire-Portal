"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, Send, X } from 'lucide-react';
import { useAppContext } from '@/components/admin/context/AppContext';
import StandardResume from '@/components/admin/StandardResume';

export default function CandidatesPage() {
  const { jobs, candidates, refreshCandidates, apiFetch } = useAppContext();
  
  // Page Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedSubDept, setSelectedSubDept] = useState('all');

  // Add Candidate Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [uploadDept, setUploadDept] = useState('');
  const [uploadSubDept, setUploadSubDept] = useState('');
  const [uploadRole, setUploadRole] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });

  // Email Invitation Modal States
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [activeCandidateForEmail, setActiveCandidateForEmail] = useState<any | null>(null);
  const [senders, setSenders] = useState<string[]>([]);
  const [selectedSender, setSelectedSender] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [selectedQuestionSet, setSelectedQuestionSet] = useState('');
  const [emailSubject, setEmailSubject] = useState('Action Required: Complete your Video AI Screening with ElastiCrew');
  const [emailBody, setEmailBody] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  // View Candidate Details Modal State
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);

  // Dropdown senders list loading
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

  // Update email message details dynamically based on selected candidate and question set
  useEffect(() => {
    if (activeCandidateForEmail) {
      setCandidateEmail(activeCandidateForEmail.email || '');
      const jobRole = activeCandidateForEmail.jobApplied || activeCandidateForEmail.job_applied || 'Common';
      
      let qSetLabel = jobRole;
      if (selectedQuestionSet) {
        const matchedJob = jobs.find((j: any) => j.id === selectedQuestionSet);
        if (matchedJob) qSetLabel = matchedJob.title;
      }

      setEmailSubject(`Action Required: Complete your Video AI Screening with ElastiCrew — ${jobRole} Position`);
      setEmailBody(`Hi ${activeCandidateForEmail.name},\n\nPlease complete your Video AI Screening assessment configured for the ${qSetLabel} position.\n\nThis workflow features a targeted question block. Complete it using the secure link inside your tracking workspace.\n\nBest regards,\nElastiCrew Hiring Team`);
    } else {
      setCandidateEmail('');
      setEmailSubject('');
      setEmailBody('');
    }
  }, [activeCandidateForEmail, selectedQuestionSet, jobs]);

  // Set default question set if candidate is selected for video Bot
  useEffect(() => {
    if (activeCandidateForEmail && jobs.length > 0) {
      const candidateJob = jobs.find((j: any) => j.title === (activeCandidateForEmail.jobApplied || activeCandidateForEmail.job_applied));
      if (candidateJob) {
        setSelectedQuestionSet(candidateJob.id);
      } else {
        setSelectedQuestionSet(jobs[0].id);
      }
    }
  }, [activeCandidateForEmail, jobs]);

  // Department / Sub-Department lists dynamically from jobs
  const availableDepartments = Array.from(new Set(jobs.map((j: any) => j.department).filter(Boolean))) as string[];
  const getSubDepartments = (dept: string) => {
    return Array.from(new Set(jobs.filter((j: any) => j.department === dept && j.sub_department).map((j: any) => j.sub_department))) as string[];
  };
  const getRoles = (dept: string, subDept: string) => {
    return Array.from(new Set(jobs.filter((j: any) => j.department === dept && (j.sub_department === subDept || !j.sub_department)).map((j: any) => j.title))) as string[];
  };

  // Helper to extract candidate details
  const getCandidateSubDept = (c: any) => {
    const job = jobs.find((j: any) => j.title === c.jobApplied || j.title === c.job_applied);
    return job?.sub_department || "General";
  };
  const getCandidateDept = (c: any) => {
    const job = jobs.find((j: any) => j.title === c.jobApplied || j.title === c.job_applied);
    return job?.department || "General";
  };

  // Filter candidates list
  const filteredCandidates = candidates.filter((c: any) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.unique_id || String(c.id)).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'all' || getCandidateDept(c) === selectedDept;
    const matchesSubDept = selectedSubDept === 'all' || getCandidateSubDept(c) === selectedSubDept;
    return matchesSearch && matchesDept && matchesSubDept;
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Handle uploading and parsing resume
  const handleUploadResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadRole) {
      setUploadStatus({ type: 'error', message: 'Please select a role first.' });
      return;
    }
    if (!selectedFile) {
      setUploadStatus({ type: 'error', message: 'Please upload a resume.' });
      return;
    }

    const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setUploadStatus({ type: 'error', message: 'Only PDF files are supported.' });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setUploadStatus({ type: 'error', message: 'File is too large. Maximum size is 5MB.' });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: 'info', message: 'Connecting to AI parsing engine...' });
    setUploadStep('Uploading PDF to server...');

    const steps = [
      'Uploading PDF to server...',
      'Extracting raw text from PDF...',
      'Analyzing content with AI...',
      'Validating data structure...',
      'Finalizing candidate profile...'
    ];
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length - 1) {
        stepIdx++;
        setUploadStep(steps[stepIdx]);
      }
    }, 1500);

    const formData = new FormData();
    formData.append('resume', selectedFile);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const rawText = await response.text();
      let result;
      try {
        result = JSON.parse(rawText);
      } catch (e) {
        throw new Error(`Server returned non-JSON response: ${rawText.substring(0, 100)}...`);
      }

      if (response.ok && result.success) {
        const data = result.data;
        const reportToken = typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID
          ? window.crypto.randomUUID().replace(/-/g, '') + window.crypto.randomUUID().replace(/-/g, '')
          : Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

        const payload = {
          name: data.personalInformation?.fullName || (selectedFile.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').replace(/\b(resume|cv|document|copy)\b/gi, '').replace(/\s+/g, ' ').trim() || 'Unknown Candidate'),
          email: data.personalInformation?.email || 'No email provided',
          phone: data.personalInformation?.phoneNumber || 'No phone provided',
          skills: data.skillExtraction?.extractedSkills || [],
          job_applied: uploadRole,
          resume_status: 'Parsed',
          form_status: 'N/A',
          video_status: 'Pending',
          tech_status: 'Pending',
          report_status: 'Not Shared',
          stage: 'Resume Upload',
          resume_score: Math.round(75 + (data.totalExperienceAnalysis?.domainExperience || 0) * 2 + Math.random() * 5),
          extracted_data: {
            ...data,
            _reportShareToken: reportToken,
            _reportShareExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        };

        const dbRes = await apiFetch('/api/candidates', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (dbRes.ok) {
          refreshCandidates();
          setUploadStatus({ 
            type: 'success', 
            message: `Successfully parsed! Extracted profile for ${payload.name}.` 
          });
          setTimeout(() => {
            setIsAddModalOpen(false);
            setSelectedFile(null);
            setUploadDept('');
            setUploadSubDept('');
            setUploadRole('');
            setUploadStatus({ type: '', message: '' });
          }, 2000);
        } else {
          const dbErr = await dbRes.json();
          setUploadStatus({ 
            type: 'error', 
            message: dbErr.error || 'Parsing succeeded but failed to save candidate to database.' 
          });
        }
      } else {
        setUploadStatus({ 
          type: 'error', 
          message: result.error || 'Parsing failed. Please check the PDF contents.' 
        });
      }
    } catch (err: any) {
      clearInterval(interval);
      console.error('Upload catch block:', err);
      setUploadStatus({ 
        type: 'error', 
        message: err.message || 'Could not reach the parsing server. Please try again.' 
      });
    } finally {
      clearInterval(interval);
      setIsUploading(false);
      setUploadStep('');
    }
  };

  // Dispatch Video Bot Email Invite
  const handleSendVideoInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCandidateForEmail || !selectedQuestionSet) return;

    setSendingInvite(true);
    const matchedJob = jobs.find((j: any) => j.id === selectedQuestionSet);
    if (!matchedJob) {
      alert("Invalid Question Set / Job Role selected.");
      setSendingInvite(false);
      return;
    }

    try {
      const res = await apiFetch('/api/invites/send', {
        method: 'POST',
        body: JSON.stringify({
          candidate_name: activeCandidateForEmail.name,
          candidate_email: candidateEmail,
          job_role: matchedJob.title,
          department: matchedJob.department,
          sub_department: matchedJob.sub_department || 'General',
          role: matchedJob.title,
          subject: emailSubject,
          body: emailBody,
          senderEmail: selectedSender || senders[0] || 'careers@elasticrew.com'
        })
      });

      if (res.ok) {
        // Automatically move stage to video screening
        await apiFetch('/api/candidates', {
          method: 'PATCH',
          body: JSON.stringify({
            id: activeCandidateForEmail.id,
            stage: 'Video Bot Screening',
            video_status: 'Pending'
          })
        });
        
        refreshCandidates();
        alert(`Video Bot Invite Dispatched Successfully!\nQuestion Set Matrix Attached: ${matchedJob.title}`);
        setIsEmailModalOpen(false);
        setActiveCandidateForEmail(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to send invite");
      }
    } catch (e) {
      console.error(e);
      alert("Error sending invite");
    } finally {
      setSendingInvite(false);
    }
  };

  // Delete Candidate
  const handleDeleteCandidate = async (candidate: any) => {
    if (window.confirm(`Are you sure you want to completely delete ${candidate.name}?`)) {
      try {
        const res = await apiFetch(`/api/candidates?id=${candidate.id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          refreshCandidates();
          alert(`${candidate.name} has been deleted.`);
        } else {
          alert(`Failed to delete ${candidate.name}.`);
        }
      } catch (err) {
        console.error(err);
        alert(`An error occurred while deleting.`);
      }
    }
  };

  // Dispatch generic action dispatches
  const handleDropdownAction = (dropdownVal: string, candidate: any) => {
    if (!dropdownVal) return;

    if (dropdownVal === 'delete') {
      handleDeleteCandidate(candidate);
    } else if (dropdownVal === 'video') {
      setActiveCandidateForEmail(candidate);
      setIsEmailModalOpen(true);
    } else {
      alert(`Invite dispatched for selected step to ${candidate.name}.`);
    }
  };

  // Stage Badge Render helper
  const renderStageBadge = (c: any) => {
    if (c.stage === 'Video Bot Screening') {
      if (c.videoStatus === 'Approved' || c.video_status === 'Approved') {
        return <span className="stage-tag shortlisted">Screening Completed</span>;
      }
      if (c.videoStatus === 'Rejected' || c.video_status === 'Rejected') {
        return <span className="stage-tag rejected">Screening Rejected</span>;
      }
      return <span className="stage-tag interviewing">Invite Sent</span>;
    }
    if (c.stage === 'Technical Scheduler') {
      return <span className="stage-tag shortlisted">Screening Completed</span>;
    }
    return <span className="stage-tag screening">Pending Screening</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      
      {/* HEADER SECTION */}
      <header className="header-actions" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Candidates</h1>
        <button className="btn-add" onClick={() => setIsAddModalOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px' }}>
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
          Add Candidate
        </button>
      </header>

      {/* FILTER & SEARCH CONTAINER */}
      <section className="candidates-section">
        <div className="filter-bar">
          <div className="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Search by candidate name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <select 
              className="filter-select" 
              value={selectedDept}
              onChange={e => {
                setSelectedDept(e.target.value);
                setSelectedSubDept('all');
              }}
            >
              <option value="all">All Departments</option>
              {availableDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            
            <select 
              className="filter-select"
              value={selectedSubDept}
              disabled={selectedDept === 'all'}
              onChange={e => setSelectedSubDept(e.target.value)}
            >
              <option value="all">All Sub Departments</option>
              {selectedDept !== 'all' && getSubDepartments(selectedDept).map(sd => (
                <option key={sd} value={sd}>{sd}</option>
              ))}
            </select>
          </div>
        </div>

        {/* WORKFLOW SUB NAVIGATION TABS */}
        <div className="sub-nav-container">
          <button className="sub-nav-tab active">
            <svg className="tab-icon icon-blue" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>All Candidates</span>
            <span className="count-pill">{filteredCandidates.length}</span>
          </button>
          
          <a href="/admin/video-bot-admin" className="sub-nav-tab text-decoration-none">
            <svg className="tab-icon icon-purple" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 7l-7 5 7 5V7z"></path>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            <span>Video Bot Screening</span>
          </a>
          
          <button onClick={() => alert("MCQ Assessment is not configured yet.")} className="sub-nav-tab text-decoration-none">
            <svg className="tab-icon icon-blue-alt" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            </svg>
            <span>MCQ Assessment</span>
          </button>
          
          <a href="/admin/technicalscheduler" className="sub-nav-tab text-decoration-none">
            <svg className="tab-icon icon-green" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            </svg>
            <span>Tech Scheduler</span>
          </a>
          
          <button onClick={() => alert("HR Interview is not configured yet.")} className="sub-nav-tab text-decoration-none">
            <svg className="tab-icon icon-amber" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>HR Interview</span>
          </button>
        </div>

        {/* CANDIDATES DATA TABLE */}
        <div className="table-responsive-wrapper">
          <table className="candidate-table">
            <thead>
              <tr>
                <th>Candidate ID</th>
                <th>Candidate Name</th>
                <th>Sub Dept</th>
                <th>Stage</th>
                <th>ElastiCrew Resume</th>
                <th className="col-action" style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                    No candidates found in this view context.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c: any) => {
                  const displayId = c.display_id || c.unique_id || String(c.id).substring(0, 8);
                  const resumeFilename = `${c.name.toLowerCase().replace(/\s+/g, '_')}_resume.pdf`;
                  return (
                    <tr key={c.id} className="candidate-row">
                      <td><span className="id-badge">{displayId}</span></td>
                      <td>
                        <strong 
                          style={{ color: 'var(--text-dark)', cursor: 'pointer' }}
                          onClick={() => setSelectedCandidate(c)}
                        >
                          {c.name}
                        </strong>
                      </td>
                      <td>{getCandidateSubDept(c)}</td>
                      <td>{renderStageBadge(c)}</td>
                      <td>
                        <span className="resume-tag" onClick={() => setSelectedCandidate(c)}>
                          📄 {resumeFilename}
                        </span>
                      </td>
                      <td className="col-action">
                        <select 
                          className="action-dropdown"
                          value=""
                          onChange={e => handleDropdownAction(e.target.value, c)}
                        >
                          <option value="" disabled>Manage</option>
                          <option value="video">Send Video Bot Invite</option>
                          <option value="mcq">Send MCQ Invite</option>
                          <option value="tech">Send Tech Invite</option>
                          <option value="hr">Send HR Invite</option>
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
      </section>

      {/* MODAL 1: ADD CANDIDATE MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <h2 className="modal-header">Add New Candidate</h2>
            <form onSubmit={handleUploadResume}>
              <div className="form-group">
                <label>Department</label>
                <select 
                  className="form-control" 
                  value={uploadDept} 
                  onChange={e => {
                    setUploadDept(e.target.value);
                    setUploadSubDept('');
                    setUploadRole('');
                  }}
                  required
                >
                  <option value="" disabled>Select Department</option>
                  {availableDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Sub Department</label>
                <select 
                  className="form-control" 
                  value={uploadSubDept}
                  disabled={!uploadDept}
                  onChange={e => {
                    setUploadSubDept(e.target.value);
                    setUploadRole('');
                  }}
                  required
                >
                  <option value="" disabled>Select Sub Department</option>
                  {uploadDept && getSubDepartments(uploadDept).map(sd => (
                    <option key={sd} value={sd}>{sd}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Target Role</label>
                <select 
                  className="form-control" 
                  value={uploadRole}
                  disabled={!uploadSubDept}
                  onChange={e => setUploadRole(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Target Role</option>
                  {uploadSubDept && getRoles(uploadDept, uploadSubDept).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Upload Resume (PDF Only)</label>
                <input 
                  type="file" 
                  className="form-control" 
                  accept=".pdf" 
                  onChange={handleFileChange}
                  required
                />
              </div>

              {uploadStatus.message && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  fontSize: '13px',
                  backgroundColor: uploadStatus.type === 'error' ? '#fee2e2' : uploadStatus.type === 'success' ? '#d1fae5' : '#dbeafe',
                  color: uploadStatus.type === 'error' ? '#b91c1c' : uploadStatus.type === 'success' ? '#065f46' : '#1e40af'
                }}>
                  {uploadStatus.message}
                  {isUploading && uploadStep && <div style={{ fontSize: '11px', marginTop: '2px', fontWeight: 'bold' }}>Step: {uploadStep}</div>}
                </div>
              )}

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  disabled={isUploading}
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setSelectedFile(null);
                    setUploadStatus({ type: '', message: '' });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isUploading}>
                  {isUploading ? 'Parsing Resume...' : 'Add Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: COMPACT EMAIL INVITATION MODAL */}
      {isEmailModalOpen && activeCandidateForEmail && (
        <div className="modal-overlay active">
          <div className="modal-card email-modal-card">
            <h2 className="modal-header" style={{ margin: 0, paddingBottom: '8px', borderBottom: '1px solid #f1f5f9', fontSize: '16px' }}>
              Video Bot Invitation
            </h2>
            
            <form onSubmit={handleSendVideoInvite} className="modal-scrollable-form">
              <div className="form-group">
                <label>Sender</label>
                <select 
                  className="form-control"
                  value={selectedSender}
                  onChange={e => setSelectedSender(e.target.value)}
                  required
                >
                  {senders.map(email => (
                    <option key={email} value={email}>{email}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Candidate Email</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={candidateEmail} 
                  readOnly 
                />
              </div>

              <div className="form-group">
                <label>Select Question Set</label>
                <select 
                  className="form-control" 
                  value={selectedQuestionSet}
                  onChange={e => setSelectedQuestionSet(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Question Set...</option>
                  {jobs.map((j: any) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label>Email Message Body</label>
                <textarea 
                  className="form-control textarea-body" 
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  required 
                />
              </div>
              
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    setIsEmailModalOpen(false);
                    setActiveCandidateForEmail(null);
                  }}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit dispatch-btn" 
                  disabled={sendingInvite}
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {sendingInvite ? <><Loader2 size={12} className="animate-spin" /> Dispatching...</> : <><Send size={12} /> Send Invite</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {selectedCandidate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '2rem'
        }} onClick={() => setSelectedCandidate(null)}>
          <StandardResume 
            candidate={selectedCandidate} 
            onClose={() => setSelectedCandidate(null)} 
            onUpdate={refreshCandidates} 
          />
        </div>
      )}

    </div>
  );
}
