"use client";

import React, { useState, useEffect } from 'react';
import { 
  Video, FileText, Brain, Award, AlertCircle, Play, 
  Download, Loader, CheckCircle, ChevronDown, ChevronUp, Link2
} from 'lucide-react';

interface TeamsInterviewPanelProps {
  interviewId: string;
  interview: any;
}

export function TeamsInterviewPanel({ interviewId, interview: initialInterview }: TeamsInterviewPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [status, setStatus] = useState<any>(initialInterview || {});
  const [loading, setLoading] = useState(false);
  const [recordingLoading, setRecordingLoading] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/teams/status/${interviewId}?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err: any) {
      console.error("Error fetching Teams status:", err);
    }
  };

  useEffect(() => {
    setStatus(initialInterview || {});
    if (interviewId) {
      fetchStatus();
    }
  }, [interviewId, initialInterview]);

  const handleFetchRecording = async () => {
    setRecordingLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/recording/${interviewId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch recording");
      }
      if (data.status === 'not_available') {
        setError(data.message);
      } else {
        await fetchStatus();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRecordingLoading(false);
    }
  };

  const handleFetchTranscript = async () => {
    setTranscriptLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/transcript/${interviewId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch transcript");
      }
      if (data.status === 'not_available') {
        setError(data.message);
      } else {
        await fetchStatus();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTranscriptLoading(false);
    }
  };

  const getRecBadgeStyles = (rec: string) => {
    const norm = (rec || "").toUpperCase();
    if (norm.includes("HIRE") || norm.includes("SELECTED") || norm.includes("RECOMMEND")) {
      return { bg: "rgba(16, 185, 129, 0.08)", border: "1px solid #10b981", color: "#10b981" };
    }
    if (norm.includes("HOLD") || norm.includes("CONSIDER")) {
      return { bg: "rgba(245, 158, 11, 0.08)", border: "1px solid #f59e0b", color: "#f59e0b" };
    }
    return { bg: "rgba(239, 68, 68, 0.08)", border: "1px solid #ef4444", color: "#ef4444" };
  };

  const hasTeams = !!status?.teams_meeting_id;

  if (!hasTeams) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: '12px', color: '#64748b', fontSize: '0.8rem', textAlign: 'center' }}>
        No Teams meeting linked to this interview.
      </div>
    );
  }

  const recStyles = getRecBadgeStyles(status.teams_ai_recommendation);

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)', marginTop: '1rem' }}>
      
      {/* Header collapsible bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '12px 16px', 
          backgroundColor: '#f8fafc', 
          borderBottom: isOpen ? '1px solid #e2e8f0' : 'none', 
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: '750', color: 'var(--brand-navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Video size={16} /> MICROSOFT TEAMS INTEGRATION
        </span>
        {isOpen ? <ChevronUp size={16} color="var(--gray-500)" /> : <ChevronDown size={16} color="var(--gray-500)" />}
      </div>

      {isOpen && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Error Banner */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: '0.74rem', color: '#b91c1c' }}>
              <AlertCircle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Teams Live Meeting URL */}
          <div style={{ paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '6px' }}>Meeting Details</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  const link = status.teams_join_url;
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
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.8rem', 
                  fontWeight: '700', 
                  color: '#6264A7', 
                  textDecoration: 'none',
                  backgroundColor: 'rgba(98, 100, 167, 0.08)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(98, 100, 167, 0.15)',
                  cursor: 'pointer'
                }}
              >
                <Link2 size={13} /> Join Live Teams Meeting ↗
              </a>
              <button
                onClick={() => {
                  if (status.teams_join_url) {
                    navigator.clipboard.writeText(status.teams_join_url);
                    alert("Meeting link copied successfully.");
                  }
                }}
                style={{
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.8rem', 
                  fontWeight: '700', 
                  color: '#475569', 
                  backgroundColor: '#f1f5f9',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Copy Link
              </button>
              {status.teams_start_time && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '500' }} suppressHydrationWarning>
                  Scheduled for: {new Date(status.teams_start_time).toLocaleString()}
                </span>
              )}
            </div>
          </div>


          {/* Meeting Recording Section */}
          <div style={{ paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '6px' }}>Meeting Recording</span>
            
            {status.teams_recording_url ? (
              <div style={{ marginTop: '6px' }}>
                <video 
                  src={status.teams_recording_url} 
                  controls 
                  preload="metadata"
                  style={{ width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#0f172a', maxHeight: '200px', objectFit: 'contain' }} 
                />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Recording is not loaded yet.</span>
                <button
                  onClick={handleFetchRecording}
                  disabled={recordingLoading}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: '#fff',
                    color: 'var(--brand-navy)',
                    cursor: recordingLoading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  {recordingLoading ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
                  {recordingLoading ? 'Fetching...' : 'Fetch Recording'}
                </button>
              </div>
            )}
          </div>

          {/* Transcript Log console Section */}
          <div style={{ paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Meeting Transcript</span>
              {status.teams_transcript_fetched_at && (
                <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }} suppressHydrationWarning>
                  Fetched at: {new Date(status.teams_transcript_fetched_at).toLocaleTimeString()}
                </span>
              )}
            </div>

            {status.teams_transcript_text ? (
              <div style={{ position: 'relative', marginTop: '6px' }}>
                <textarea 
                  readOnly 
                  value={status.teams_transcript_text} 
                  style={{ 
                    width: '100%', 
                    height: '140px', 
                    fontFamily: 'monospace', 
                    fontSize: '11px', 
                    padding: '10px', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0', 
                    backgroundColor: '#fafbff', 
                    color: '#334155',
                    resize: 'none',
                    lineHeight: '1.4'
                  }} 
                />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Transcript not available.</span>
                <button
                  onClick={handleFetchTranscript}
                  disabled={transcriptLoading}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: '#fff',
                    color: 'var(--brand-navy)',
                    cursor: transcriptLoading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  {transcriptLoading ? <Loader size={12} className="animate-spin" /> : <Brain size={12} />}
                  {transcriptLoading ? 'Processing AI...' : 'Fetch Transcript & Analyze'}
                </button>
              </div>
            )}
          </div>

          {/* Claude AI Summary Section */}
          {status.teams_ai_summary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'rgba(14,45,123,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(14,45,123,0.06)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', fontWeight: '800', color: 'var(--brand-navy)' }}>
                <Brain size={14} /> CLAUDE INTEL ANALYSIS
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
                <p style={{ margin: 0, lineHeight: 1.4, color: '#334155' }}>
                  <strong style={{ color: 'var(--brand-navy)' }}>Summary:</strong> {status.teams_ai_summary}
                </p>
                
                {status.teams_ai_skills && status.teams_ai_skills.length > 0 && (
                  <p style={{ margin: 0, color: '#334155' }}>
                    <strong style={{ color: 'var(--brand-navy)' }}>Skills Detected:</strong> {status.teams_ai_skills.join(', ')}
                  </p>
                )}

                <p style={{ margin: 0, lineHeight: 1.4, color: '#334155' }}>
                  <strong style={{ color: 'var(--brand-navy)' }}>Communication:</strong> {status.teams_ai_communication}
                </p>

                {status.teams_ai_strengths && status.teams_ai_strengths.length > 0 && (
                  <p style={{ margin: 0, color: '#334155' }}>
                    <strong style={{ color: 'var(--brand-navy)' }}>Strengths:</strong> {status.teams_ai_strengths.join(', ')}
                  </p>
                )}

                {status.teams_ai_weaknesses && status.teams_ai_weaknesses.length > 0 && (
                  <p style={{ margin: 0, color: '#334155' }}>
                    <strong style={{ color: 'var(--brand-navy)' }}>Weaknesses:</strong> {status.teams_ai_weaknesses.join(', ')}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--brand-navy)' }}>Recommendation:</span>
                  <span 
                    style={{ 
                      padding: '3px 10px', 
                      borderRadius: '6px', 
                      fontSize: '0.7rem', 
                      fontWeight: '800', 
                      backgroundColor: recStyles.bg,
                      border: recStyles.border,
                      color: recStyles.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {status.teams_ai_recommendation}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
