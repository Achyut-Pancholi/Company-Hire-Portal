"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, BookOpen, Award, Code2, TrendingUp, TrendingDown, 
  CheckCircle, AlertCircle, MessageSquare, Eye, X, Brain
} from 'lucide-react';
import { ResumeViewButton } from '@/components/ResumeViewButton';
import { TranscriptIntelligenceEngine } from '@/components/reports/TranscriptIntelligenceEngine';
import { useAppContext } from '@/components/admin/context/AppContext';
import { analyzeTranscript } from '@/utils/transcriptAnalyzer';

// CONTROL_BAR_PX: Google Drive /preview renders its controls ~52px below the video frame.
// We over-size the iframe height by this amount so the bar is fully visible.
const GDRIVE_CTRL_BAR = 52;

export const EmbeddableVideo = ({ url, ...props }: any) => {
  if (!url) return null;
  const trimmedUrl = url.trim();

  // Google Drive Link
  if (trimmedUrl.includes('drive.google.com/file/d/')) {
    const match = trimmedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
      // Wrapper clips left/right/top flush; leaves bottom open for the controls bar.
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
          <iframe
            src={embedUrl}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              // Taller than the container so the control bar is included
              height: `calc(100% + ${GDRIVE_CTRL_BAR}px)`,
              border: 'none',
            }}
          />
        </div>
      );
    }
  }
  // YouTube Link
  if (trimmedUrl.includes('youtube.com/watch') || trimmedUrl.includes('youtu.be/')) {
    const match = trimmedUrl.match(/(?:v=|youtu\.be\/)([^&]+)/);
    if (match && match[1]) {
      const embedUrl = `https://www.youtube.com/embed/${match[1]}`;
      return <iframe src={embedUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen></iframe>;
    }
  }

  // SharePoint auto-conversion to embed view
  let embedUrl = trimmedUrl;
  if (trimmedUrl.includes('sharepoint.com') && !trimmedUrl.includes('action=') && !trimmedUrl.includes('Action=')) {
    try {
      const urlObj = new URL(trimmedUrl);
      urlObj.searchParams.set('action', 'embedview');
      embedUrl = urlObj.toString();
    } catch (e) {
      // Keep original
    }
  }

  // If it's a web link and does NOT end with a direct video extension, render in an iframe
  const isDirectVideo = /\.(mp4|webm|ogg|mov|m4v|avi|mkv)(?:\?|$)/i.test(trimmedUrl);
  if (trimmedUrl.startsWith('http') && !isDirectVideo) {
    return <iframe src={embedUrl} allow="autoplay; encrypted-media; fullscreen" style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen></iframe>;
  }
  
  // Standard video fallback
  return <video src={trimmedUrl} {...props} />;
};

/* ─────────────────── SVG Radial Progress ─────────────────────── */
const RadialProgress = ({ value = 0, size = 80, stroke = 7, color = '#3b82f6', label }: any) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--gray-100)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>
          {value ?? 'N/A'}
        </text>
      </svg>
      {label && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>}
    </div>
  );
};

/* ────────────────── Transcript Analysis ───────────────────────── */
const TranscriptAnalysis = ({ transcript = [] }: any) => {
  if (!transcript || transcript.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No transcript available yet.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {transcript.map((entry: any, i: number) => (
        <div key={i} style={{ padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--border)', backgroundColor: '#fafbff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--brand-navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '700', flexShrink: 0 }}>Q{i + 1}</span>
            <p style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0 }}>{entry.question}</p>
          </div>
          {entry.answer && (
            <p style={{ fontSize: '0.78rem', color: 'var(--gray-700)', margin: '0 0 0 26px', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--brand-green)', fontWeight: '700' }}>A: </span>{entry.answer}
            </p>
          )}
          {(entry.timestamp_start !== undefined) && (
            <span style={{ marginLeft: '26px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {Math.round(entry.timestamp_start)}s – {Math.round(entry.timestamp_end)}s
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

const scoreColor = (v: any) => {
  if (!v) return 'var(--gray-400)';
  if (v >= 85) return '#10b981';
  if (v >= 70) return '#3b82f6';
  if (v >= 55) return '#f59e0b';
  return '#ef4444';
};

interface ReportDashboardGridProps {
  candidate: any;
  NEXT_JS_URL: string;
  matchedInterviewFromDb?: any;
}

export function ReportDashboardGrid({ candidate, NEXT_JS_URL, matchedInterviewFromDb }: ReportDashboardGridProps) {
  const [activeModal, setActiveModal] = useState<'scores' | 'resume' | 'strengths' | 'transcript' | 'videoTranscript' | null>(null);
  const [scoresViewMode, setScoresViewMode] = useState<'radial' | 'bar'>('radial');
  const [mounted, setMounted] = useState(false);
  const [matchedInterview, setMatchedInterview] = useState<any>(matchedInterviewFromDb || null);
  
  const screeningVideoRef = React.useRef<HTMLVideoElement>(null);
  const [activeClipIndex, setActiveClipIndex] = useState<number | null>(null);

  // Always call hook unconditionally at top level (Rules of Hooks)
  const contextValue = useAppContext();
  // Safely use context — it may be null if AppContext is not in the tree
  const context: any = contextValue ?? null;

  // Tech Video (Admin Uploaded) - Transcript Intelligence
  const transcriptVideoUrl = useMemo(() => {
    const ext = candidate.extractedData || candidate.extracted_data || {};
    const url = ext.videoUrl || ext.video_url || candidate.videoUrl || candidate.video_url;
    
    if (!url || typeof url !== 'string') return null;
    const clean = url.trim();
    if (
      clean === "" || 
      clean === "—" || 
      clean === "null" || 
      clean === "undefined" || 
      clean.includes("mixkit.co") ||
      clean.includes("drive.google.com") ||
      clean.includes("youtube.com") ||
      clean.includes("youtu.be") ||
      clean.includes("sharepoint.com") ||
      clean.includes("w3schools.com")
    ) {
      return null;
    }
    return clean;
  }, [candidate]);

  useEffect(() => {
    if (matchedInterviewFromDb) {
      setMatchedInterview(matchedInterviewFromDb);
    }
  }, [matchedInterviewFromDb]);

  useEffect(() => {
    if (matchedInterviewFromDb) return;

    // Dynamic fetch by matching email or name (only if inside Admin dashboard context)
    const fetchInterviewData = async () => {
      try {
        if (!context?.apiFetch) return;
        const res = await context.apiFetch(`/api/interviews/list?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          const candidateEmail = (candidate.email || candidate.extractedData?.personalInformation?.email || "").trim().toLowerCase();
          const cleanName = (n: string) => (n || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
          const candName = cleanName(candidate.name || "");
          
          if (Array.isArray(data)) {
            const match = data.find((i: any) => {
              const matchesEmail = candidateEmail && (i.candidate_email || "").trim().toLowerCase() === candidateEmail;
              const matchesName = candName && cleanName(i.candidate_name || "") === candName;
              return (matchesEmail || matchesName) && i.status === 'completed';
            });
            if (match) {
              setMatchedInterview(match);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch interview details:", err);
      }
    };

    const targetEmail = (candidate.email || candidate.extractedData?.personalInformation?.email || "").trim();
    if ((targetEmail || candidate.name) && context?.apiFetch) {
      fetchInterviewData();
    }
  }, [candidate, context, matchedInterviewFromDb]);

  const screeningVideoUrl = useMemo(() => {
    let rawUrl = "";
    const directScreeningUrl = candidate.screeningVideoUrl || candidate.screening_video_url;
    if (directScreeningUrl && typeof directScreeningUrl === 'string' && directScreeningUrl.trim() !== "" && directScreeningUrl.trim() !== "—" && directScreeningUrl.trim() !== "null") {
      rawUrl = directScreeningUrl.trim();
    } else if (matchedInterview?.video_url) {
      rawUrl = String(matchedInterview.video_url).trim();
    }
    
    if (
      rawUrl && 
      rawUrl !== "" && 
      rawUrl !== "—" && 
      rawUrl !== "null" && 
      rawUrl !== "undefined" && 
      !rawUrl.includes("mixkit.co") &&
      !rawUrl.includes("drive.google.com") &&
      !rawUrl.includes("youtube.com") &&
      !rawUrl.includes("youtu.be") &&
      !rawUrl.includes("sharepoint.com") &&
      !rawUrl.includes("w3schools.com")
    ) {
      return rawUrl;
    }
    return null;
  }, [matchedInterview, candidate]);

  const technicalVideoUrl = useMemo(() => {
    const ext = candidate?.extractedData || {};
    let rawUrl = String(ext.videoUrl || ext.video_url || ext.video || candidate?.videoUrl || candidate?.video_url || "").trim();
    
    if (
      rawUrl && 
      rawUrl !== "" && 
      rawUrl !== "—" && 
      rawUrl !== "null" && 
      rawUrl !== "undefined" && 
      !rawUrl.includes("mixkit.co") &&
      !rawUrl.includes("drive.google.com") &&
      !rawUrl.includes("youtube.com") &&
      !rawUrl.includes("youtu.be") &&
      !rawUrl.includes("sharepoint.com") &&
      !rawUrl.includes("w3schools.com")
    ) {
      return rawUrl;
    }
    
    // Fallback to screening video if no technical video is uploaded
    return screeningVideoUrl;
  }, [candidate, screeningVideoUrl]);

  const videoUrl = screeningVideoUrl;

  useEffect(() => {
    console.log("Candidate Object:", candidate);
    console.log("Candidate Screening Video URL fields:", candidate.screeningVideoUrl, candidate.screening_video_url);
    console.log("Resolved Screening Video URL:", screeningVideoUrl);
    console.log("Resolved Transcript Video URL (transcriptVideoUrl):", transcriptVideoUrl);
    console.log("Technical Video URL (technicalVideoUrl):", technicalVideoUrl);
  }, [candidate, screeningVideoUrl, transcriptVideoUrl, technicalVideoUrl]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const edu = candidate.extractedData?.educationDetails || [];
  const skills = candidate.skills || [];

  const transcript = useMemo(() => {
    if (matchedInterview?.transcript && Array.isArray(matchedInterview.transcript) && matchedInterview.transcript.length > 0) {
      return matchedInterview.transcript.map((t: any) => ({
        question: t.question || "",
        answer: t.text || t.answer || "",
        timestamp_start: t.timestamp_start,
        timestamp_end: t.timestamp_end
      }));
    }
    return candidate.transcript || candidate.extractedData?.transcript || [];
  }, [matchedInterview, candidate]);

  const storedAnalysis = useMemo(() => {
    const baseAnalysis = candidate.extractedData?.transcriptAnalysis || {};
    if (matchedInterview?.summary && matchedInterview?.scores) {
      const s = matchedInterview.scores;
      return {
        ...baseAnalysis,
        communication: s.Communication ? s.Communication * 20 : (candidate.videoScore || undefined),
        technical: s.Clarity ? s.Clarity * 20 : (candidate.techScore || undefined),
        problemSolving: s.Relevance ? s.Relevance * 20 : undefined,
        confidence: s.Confidence ? s.Confidence * 20 : undefined,
        recommendation: candidate.finalRecommendation || candidate.final_recommendation || matchedInterview.final_recommendation || (matchedInterview.status === 'completed' ? 'Recommend' : 'Under Review'),
        recommendationReason: matchedInterview.summary || baseAnalysis.recommendationReason || ""
      };
    }
    return candidate.extractedData?.transcriptAnalysis || null;
  }, [matchedInterview, candidate]);

  // Format seconds to MM:SS helper
  const formatTime = (seconds: number | undefined) => {
    if (seconds === undefined || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Parsed highlights from matchedInterview summary
  const parsedHighlights = useMemo(() => {
    if (matchedInterview?.summary) {
      try {
        // Try to parse as JSON first
        const data = typeof matchedInterview.summary === 'string' ? JSON.parse(matchedInterview.summary) : matchedInterview.summary;
        let highlights: string[] = [];
        if (data.pros && Array.isArray(data.pros)) highlights.push(...data.pros);
        if (data.cons && Array.isArray(data.cons)) highlights.push(...data.cons);
        if (data.okok && Array.isArray(data.okok)) highlights.push(...data.okok);
        
        if (highlights.length > 0) {
          return highlights.slice(0, 4);
        }
      } catch(e) {
        // Fallback to string splitting if not JSON
        const str = typeof matchedInterview.summary === 'string' ? matchedInterview.summary : JSON.stringify(matchedInterview.summary);
        const lines = str.split('\n')
          .map((l: string) => l.trim().replace(/^[-*•\d.]+\s*/, ''))
          .filter((l: string) => l.length > 5 && !l.toLowerCase().includes("overall match") && !l.toLowerCase().includes("recommendation") && !l.startsWith('{') && !l.startsWith('}') && !l.includes('":'));
        if (lines.length > 0) {
          return lines.slice(0, 4);
        }
      }
    }
    // Dynamic NLP-based observations from transcript if no summary
    if (transcript && transcript.length > 0) {
      const analysis = analyzeTranscript(transcript);
      return analysis.keyObservations.slice(0, 4);
    }
    return [
      'No screening analysis available yet.'
    ];
  }, [matchedInterview, transcript]);

  // Sliced real transcript entries
  const transcriptPreview = useMemo(() => {
    if (transcript && transcript.length > 0) {
      return transcript.map((t: any) => ({
        time: formatTime(t.timestamp_start),
        text: t.answer || t.question || ""
      })).slice(0, 4);
    }
    return [
      { time: '—', text: 'No transcript recorded yet.' }
    ];
  }, [transcript]);

  // Video Analysis metrics mapping
  const analysisMetrics = useMemo(() => {
    const s = matchedInterview?.scores || {};
    const confidence = s.Confidence !== undefined ? s.Confidence * 20 : (candidate.videoScore || 0);
    const clarity = s.Clarity !== undefined ? s.Clarity * 20 : (candidate.techScore || candidate.videoScore || 0);
    const communication = s.Communication !== undefined ? s.Communication * 20 : (candidate.videoScore || 0);
    const engagement = s.Relevance !== undefined ? s.Relevance * 20 : (candidate.techScore || candidate.videoScore || 0);

    return [
      { label: 'Confidence', value: Math.round(confidence) },
      { label: 'Clarity', value: Math.round(clarity) },
      { label: 'Communication', value: Math.round(communication) },
      { label: 'Engagement', value: Math.round(engagement) }
    ];
  }, [matchedInterview, candidate]);
  
  // Derive strengths and weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const data = candidate.extractedData || {};

  if (candidate.resumeScore >= 80) strengths.push('Strong resume score (' + candidate.resumeScore + '/100)');
  else if (candidate.resumeScore && candidate.resumeScore < 60) weaknesses.push('Below-average resume score (' + candidate.resumeScore + '/100)');

  const exp = data.totalExperienceAnalysis;
  if (exp) {
    const yrs = parseFloat(exp.domainExperience) || 0;
    if (yrs >= 3) strengths.push(`${yrs}+ years domain experience`);
    else if (yrs < 1) weaknesses.push('Limited domain experience (<1 year)');
    if (exp.leadershipExperience && parseFloat(exp.leadershipExperience) > 0)
      strengths.push(`Leadership experience (${exp.leadershipExperience})`);
  }

  if (skills.length >= 8) strengths.push(`Broad skill set (${skills.length} skills)`);
  else if (skills.length < 4) weaknesses.push(`Narrow skill set (only ${skills.length} skills listed)`);

  const eduDetails = data.educationDetails || [];
  if (eduDetails.length > 0) {
    const topEdu = eduDetails[0];
    if (/master|mba|m\.tech|msc/i.test(topEdu.degree || '')) strengths.push('Post-graduate education (' + topEdu.degree + ')');
    else if (/bachelor|b\.tech|be|bsc/i.test(topEdu.degree || '')) strengths.push('Undergraduate degree (' + topEdu.degree + ')');
  }

  const projs = data.projectAnalysis || [];
  if (projs.length >= 3) strengths.push(`${projs.length} notable projects demonstrated`);
  else if (projs.length === 0) weaknesses.push('No project portfolio extracted');

  if (candidate.videoScore >= 80) strengths.push('Excellent video interview performance');
  else if (candidate.videoScore && candidate.videoScore < 60) weaknesses.push('Low video interview score');

  if (candidate.techScore >= 80) strengths.push('Outstanding technical assessment');
  else if (candidate.techScore && candidate.techScore < 60) weaknesses.push('Below-par technical score');

  const handleClose = () => setActiveModal(null);

  // Modal Renderings
  const renderModalContent = () => {
    if (!activeModal) return null;

    switch (activeModal) {
      case 'scores':
        return (
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid var(--border)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--brand-navy)' }}>ASSESSMENT SCORES BREAKDOWN</h3>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '2rem 0', gap: '20px' }}>
              <RadialProgress value={candidate.resumeScore || 0} color={scoreColor(candidate.resumeScore)} label="Resume Evaluation" size={120} stroke={9} />
              <RadialProgress value={candidate.videoScore || 0} color={scoreColor(candidate.videoScore)} label="Screening Video" size={120} stroke={9} />
              <RadialProgress value={candidate.techScore || 0} color={scoreColor(candidate.techScore)} label="Tech Interview" size={120} stroke={9} />
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '14px', fontSize: '0.82rem', lineHeight: '1.5', color: 'var(--gray-700)' }}>
              <strong>Scores Overview:</strong> These radial progress meters capture standard assessment dimensions. Each score is normalized on a 100-point scale based on skills extraction, response clarity, and automated test suite evaluations.
            </div>
          </div>
        );
      case 'resume':
        return (
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--brand-navy)', display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={18} /> PARSED RESUME DETAILS</h3>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}><X size={20} /></button>
            </div>
            
            {/* Education History in Modal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={16} /> Education History
              </p>
              {edu.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {edu.map((e: any, i: number) => (
                    <div key={i} style={{ padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--gray-50)' }}>
                      <p style={{ fontWeight: '700', color: 'var(--brand-navy)', fontSize: '0.85rem', margin: 0 }}>{e.degree || 'N/A'}</p>
                      <p style={{ color: 'var(--gray-600)', fontSize: '0.78rem', margin: '4px 0' }}>{e.college || e.institution || 'Institution N/A'}</p>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {e.passingYear && <span>Class of {e.passingYear}</span>}
                        {e.cgpaOrPercentage && <span>📊 {e.cgpaOrPercentage}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No education records available.</p>
              )}
            </div>

            {/* Extracted Skills in Modal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code2 size={16} /> Extracted Skills
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {skills.length > 0 ? skills.map((s: string, i: number) => (
                  <span key={i} style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: '600', backgroundColor: 'rgba(14,45,123,0.06)', color: 'var(--brand-navy)', border: '1px solid rgba(14,45,123,0.12)' }}>{s}</span>
                )) : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No skills extracted.</span>}
              </div>
            </div>
          </div>
        );
      case 'strengths':
        return (
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '750px', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--brand-navy)' }}>STRENGTHS & IMPROVEMENTS IN-DEPTH</h3>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#065f46', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={16} color="#10b981" /> Strengths
                </p>
                {strengths.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {strengths.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 12px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <CheckCircle size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '0.78rem', color: '#065f46', fontWeight: '600', lineHeight: 1.4 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No strengths detected.</p>
                )}
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#7f1d1d', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingDown size={16} color="#ef4444" /> Areas of Improvement
                </p>
                {weaknesses.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {weaknesses.map((w, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 12px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '0.78rem', color: '#7f1d1d', fontWeight: '600', lineHeight: 1.4 }}>{w}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No weaknesses detected.</p>
                )}
              </div>
            </div>
          </div>
        );
      case 'transcript':
        return (
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '1050px', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--brand-navy)', display: 'flex', alignItems: 'center', gap: '6px' }}><Brain size={18} /> TECHNICAL INTERVIEW</h3>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              <TranscriptIntelligenceEngine transcript={transcript} storedAnalysis={storedAnalysis} />
            </div>
          </div>
        );
      case 'videoTranscript':
        return (
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '850px', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--brand-navy)', display: 'flex', alignItems: 'center', gap: '6px' }}>🎥 VIDEO SCREENING & TRANSCRIPT</h3>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              <TranscriptAnalysis transcript={transcript} />
            </div>
          </div>
        );
    }
  };

  const renderViewMoreButton = (modalType: 'scores' | 'resume' | 'strengths' | 'transcript' | 'videoTranscript') => (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'auto', paddingTop: '10px' }}>
      <button
        style={{ 
          padding: '4px 14px', 
          fontSize: '0.72rem', 
          height: '26px', 
          display: 'flex', 
          alignItems: 'center', 
          cursor: 'pointer',
          backgroundColor: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          color: 'var(--brand-navy)',
          fontWeight: '700',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          transition: 'all 0.2s'
        }}
        onClick={() => setActiveModal(modalType)}
      >
        View More
      </button>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', gap: '1.5rem', width: '100%', height: '100%', overflow: 'hidden' }}>
      
      {/* COLUMN 1: Scores & Skill Match (width: 32%) */}
      <div style={{ width: '32%', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflow: 'hidden' }}>
        
        {/* Overview / Score Radial Circles with Toggle Options */}
        <div className="zoom-box" style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '750', color: 'var(--brand-navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assessment Scores</p>
            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--gray-100)', padding: '2px', borderRadius: '8px' }}>
              <button 
                onClick={() => setScoresViewMode('radial')}
                style={{
                  padding: '3px 8px', fontSize: '0.64rem', fontWeight: '700', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  backgroundColor: scoresViewMode === 'radial' ? '#fff' : 'transparent',
                  color: scoresViewMode === 'radial' ? 'var(--brand-navy)' : 'var(--gray-500)',
                  boxShadow: scoresViewMode === 'radial' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                Radial
              </button>
              <button 
                onClick={() => setScoresViewMode('bar')}
                style={{
                  padding: '3px 8px', fontSize: '0.64rem', fontWeight: '700', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  backgroundColor: scoresViewMode === 'bar' ? '#fff' : 'transparent',
                  color: scoresViewMode === 'bar' ? 'var(--brand-navy)' : 'var(--gray-500)',
                  boxShadow: scoresViewMode === 'bar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                Bar
              </button>
            </div>
          </div>
          {scoresViewMode === 'radial' ? (
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
              <RadialProgress value={candidate.resumeScore || 0} color="#3b82f6" label="Resume" size={76} />
              <RadialProgress value={candidate.videoScore || 0} color="#10b981" label="Screening Video" size={76} />
              <RadialProgress value={candidate.techScore || 0} color="#8b5cf6" label="Tech Interview" size={76} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
              {[
                { label: 'Resume', value: candidate.resumeScore || 0, color: '#3b82f6' },
                { label: 'Screening Video', value: candidate.videoScore || 0, color: '#10b981' },
                { label: 'Tech Interview', value: candidate.techScore || 0, color: '#8b5cf6' },
              ].map((b, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--gray-700)' }}>{b.label}</span>
                    <span style={{ fontSize: '0.74rem', fontWeight: '800', color: b.color }}>{b.value}%</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'var(--gray-100)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${b.value}%`, backgroundColor: b.color, borderRadius: '999px', transition: 'width 0.5s ease-in-out' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resume Parsed Box */}
        <div className="zoom-box" style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 'none', height: 'fit-content', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px', gap: '6px' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: '750', color: 'var(--brand-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} /> Resume Parsed
            </p>
            <ResumeViewButton candidate={candidate} />
          </div>

          {/* Education History preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={14} /> Education History
            </p>
            {edu.length > 0 ? (
              <div style={{ padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'linear-gradient(135deg,rgba(14,45,123,0.03) 0%,rgba(125,186,0,0.03) 100%)', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Award size={14} color="var(--brand-navy)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <p style={{ fontWeight: '700', color: 'var(--brand-navy)', fontSize: '0.76rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{edu[0].degree || 'N/A'}</p>
                    <p style={{ color: 'var(--gray-600)', fontSize: '0.7rem', margin: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{edu[0].college || edu[0].institution || 'Institution N/A'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', fontStyle: 'italic', border: '1px dashed var(--border)', borderRadius: '10px' }}>No education records.</div>
            )}
          </div>

          {/* Extracted Skills preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflow: 'hidden' }}>
            <p style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Code2 size={14} /> Extracted Skills
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', overflow: 'hidden', maxHeight: '56px', marginBottom: '4px' }}>
              {skills.length > 0 ? skills.slice(0, 4).map((s: string, i: number) => (
                <span key={i} style={{ padding: '2px 6px', borderRadius: '999px', fontSize: '0.64rem', fontWeight: '600', backgroundColor: 'rgba(14,45,123,0.06)', color: 'var(--brand-navy)', border: '1px solid rgba(14,45,123,0.12)' }}>{s}</span>
              )) : <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No skills extracted.</span>}
              {skills.length > 4 && <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: '4px', fontWeight: '700' }}>+{skills.length - 4} more</span>}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
            <button
              style={{ 
                padding: '4px 14px', 
                fontSize: '0.72rem', 
                height: '26px', 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                backgroundColor: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--brand-navy)',
                fontWeight: '700',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.2s'
              }}
              onClick={() => setActiveModal('resume')}
            >
              View More
            </button>
          </div>
        </div>

      </div>

      {/* COLUMN 2: Video Screening & Transcript (width: 38%) */}
      <div style={{ width: '38%', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflow: 'hidden' }}>
        
        {/* Video Screening Summary Card */}
        <div className="zoom-box" style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '6px', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '750', color: 'var(--brand-navy)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🎥 Video Screening & Transcript
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {/* Row 1: Video and Highlights */}
            <div style={{ display: 'flex', gap: '10px', height: '48%', minHeight: 0, alignItems: 'stretch', flexShrink: 0 }}>
              {/* Video Player */}
              <div style={{ flex: 1, height: '100%', position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column' }}>
                {screeningVideoUrl ? (
                  <>
                    <video 
                      key={screeningVideoUrl}
                      ref={screeningVideoRef}
                      controls
                      preload="metadata"
                      src={screeningVideoUrl}
                      style={{ width: '100%', flex: 1, minHeight: 0, objectFit: 'contain' }}
                      onTimeUpdate={() => {
                        if (activeClipIndex !== null && screeningVideoRef.current && transcript && transcript[activeClipIndex]) {
                          const endTime = transcript[activeClipIndex].timestamp_end;
                          if (endTime && screeningVideoRef.current.currentTime >= endTime) {
                            screeningVideoRef.current.pause();
                            setActiveClipIndex(null);
                          }
                        }
                      }}
                    />
                    {transcript && transcript.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', padding: '6px 8px', backgroundColor: '#1e293b', flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            if (activeClipIndex !== null && activeClipIndex > 0) {
                              const prevIndex = activeClipIndex - 1;
                              if (screeningVideoRef.current) {
                                screeningVideoRef.current.currentTime = transcript[prevIndex].timestamp_start || 0;
                                screeningVideoRef.current.play().catch(console.error);
                                setActiveClipIndex(prevIndex);
                              }
                            }
                          }}
                          disabled={activeClipIndex === null || activeClipIndex === 0}
                          style={{
                            padding: '4px 8px', fontSize: '0.65rem', fontWeight: '700', borderRadius: '4px', border: 'none', cursor: 'pointer',
                            backgroundColor: '#334155', color: '#fff', whiteSpace: 'nowrap', opacity: (activeClipIndex === null || activeClipIndex === 0) ? 0.5 : 1
                          }}
                        >
                          &larr; Prev
                        </button>
                        
                        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
                          {transcript.map((t: any, i: number) => (
                            <button
                              key={i}
                              onClick={() => {
                                if (screeningVideoRef.current) {
                                  screeningVideoRef.current.currentTime = t.timestamp_start || 0;
                                  screeningVideoRef.current.play().catch(console.error);
                                  setActiveClipIndex(i);
                                }
                              }}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.65rem',
                                fontWeight: '700',
                                borderRadius: '4px',
                                border: '1px solid',
                                borderColor: activeClipIndex === i ? '#10b981' : '#475569',
                                cursor: 'pointer',
                                backgroundColor: activeClipIndex === i ? '#10b981' : '#334155',
                                color: '#fff',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s'
                              }}
                            >
                              Q{i + 1}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => {
                            if (activeClipIndex !== null && activeClipIndex < transcript.length - 1) {
                              const nextIndex = activeClipIndex + 1;
                              if (screeningVideoRef.current) {
                                screeningVideoRef.current.currentTime = transcript[nextIndex].timestamp_start || 0;
                                screeningVideoRef.current.play().catch(console.error);
                                setActiveClipIndex(nextIndex);
                              }
                            }
                          }}
                          disabled={activeClipIndex === null || activeClipIndex === transcript.length - 1}
                          style={{
                            padding: '4px 8px', fontSize: '0.65rem', fontWeight: '700', borderRadius: '4px', border: 'none', cursor: 'pointer',
                            backgroundColor: '#334155', color: '#fff', whiteSpace: 'nowrap', opacity: (activeClipIndex === null || activeClipIndex === transcript.length - 1) ? 0.5 : 1
                          }}
                        >
                          Next &rarr;
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>
                    Screening video unavailable
                  </div>
                )}
              </div>
              
              {/* Highlights */}
              <div style={{ flex: 1.4, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.74rem', fontWeight: '700', color: '#0e2d7b' }}>Screening Analysis</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {parsedHighlights.map((hl, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#10b981', marginRight: '6px', marginTop: '5px', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.64rem', color: '#334155', lineHeight: 1.25 }}>{hl}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Transcript and Analysis */}
            <div style={{ display: 'flex', gap: '10px', height: '48%', minHeight: 0, alignItems: 'stretch' }}>
              {/* Transcript */}
              <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#fff', overflow: 'hidden' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.74rem', fontWeight: '700', color: '#0e2d7b' }}>Transcript</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {transcriptPreview.map((t, i) => (
                      <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.64rem', fontWeight: '700', color: '#64748b', flexShrink: 0, width: '28px' }}>{t.time}</span>
                        <span style={{ fontSize: '0.64rem', color: '#334155', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ alignSelf: 'flex-end', marginTop: '2px' }}>
                  {transcript.length > 0 && (
                    <span 
                      onClick={() => setActiveModal('videoTranscript')}
                      style={{ fontSize: '0.64rem', fontWeight: '700', color: '#3b82f6', cursor: 'pointer', textDecoration: 'none' }}
                    >
                      View Full Transcript
                    </span>
                  )}
                </div>
              </div>

              {/* Video Analysis */}
              <div style={{ flex: 1.4, border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 10px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.74rem', fontWeight: '700', color: '#0e2d7b' }}>Video Analysis</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {analysisMetrics.map((metric, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: '600', color: '#475569', width: '58px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{metric.label}</span>
                      <div style={{ flex: 1, height: '4px', backgroundColor: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${metric.value}%`, backgroundColor: '#10b981', borderRadius: '99px' }} />
                      </div>
                      <span style={{ fontSize: '0.62rem', fontWeight: '700', color: '#1e293b', width: '22px', textAlign: 'right', flexShrink: 0 }}>{metric.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* COLUMN 3: Transcript Intelligence (width: 30%) */}
      <div className="zoom-box" style={{ width: '30%', backgroundColor: '#fff', borderRadius: '20px', border: '1px solid var(--border)', padding: '0.65rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', height: '100%', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--brand-navy)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <Brain size={14} /> Technical Interview
          </p>
        </div>

        {/* Small Tech Video Player in Column 3 */}
        <div style={{ width: '240px', height: '135px', margin: '0 auto 4px', position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#0f172a', flexShrink: 0 }}>
          {transcriptVideoUrl ? (
            <EmbeddableVideo 
              key={transcriptVideoUrl}
              controls
              preload="metadata"
              url={transcriptVideoUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
              onClick={(e: any) => {
                const video = e.currentTarget;
                if (video && typeof video.play === 'function') {
                  if (video.paused) {
                    video.play().catch((err: any) => console.error("Video play failed:", err));
                  } else {
                    video.pause();
                  }
                }
              }}
              title="Click to Play / Pause"
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center', padding: '0 10px' }}>
              Technical interview video pending or not uploaded
            </div>
          )}
        </div>

        {transcript.length > 0 ? (
          <TranscriptCompactView transcript={transcript} storedAnalysis={storedAnalysis} onViewMore={() => setActiveModal('transcript')} />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '1rem' }}>
            <Brain size={28} color="var(--brand-navy)" opacity={0.25} />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0, fontStyle: 'italic' }}>No technical interview transcript uploaded or generated yet</p>
          </div>
        )}
      </div>

      {/* PORTAL FOR DETAILS VIEW MODAL OVERLAYS */}
      {mounted && activeModal && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '2rem'
          }} 
          onClick={handleClose}
        >
          <div onClick={(e) => e.stopPropagation()}>
            {renderModalContent()}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

/* ─────────────── Compact Transcript View for Column 3 ───────── */
function TranscriptCompactView({ transcript, storedAnalysis, onViewMore }: { transcript: any[]; storedAnalysis?: any; onViewMore: () => void }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const liveAnalysis = useMemo(() => analyzeTranscript(transcript), [transcript]);
  
  // Prefer stored analysis from DB (computed at upload time) over live recomputation
  const analysis = useMemo(() => {
    if (storedAnalysis && storedAnalysis.recommendation && 
        typeof storedAnalysis.communication === 'number') {
      return { ...liveAnalysis, ...storedAnalysis };
    }
    return liveAnalysis;
  }, [liveAnalysis, storedAnalysis]);

  // Full SVG Radar labels to make them fully visible and clear
  const radarData = [
    { label: 'Communication', value: analysis.communication, color: '#3b82f6' },
    { label: 'Technical', value: analysis.technical, color: '#8b5cf6' },
    { label: 'Problem Solving', value: analysis.problemSolving, color: '#f59e0b' },
    { label: 'Leadership', value: analysis.leadership, color: '#10b981' },
    { label: 'Confidence', value: analysis.confidence, color: '#ef4444' },
    { label: 'Professionalism', value: analysis.professionalism, color: '#0ea5e9' },
  ];
  const size = 210; // Reduced for compact layout
  const cx = size / 2;
  const cy = size / 2;
  const radius = 58; // Adjusted radius
  const n = radarData.length;

  const getPoint = (index: number, r: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const gridLevels = [0.33, 0.66, 1];
  const polygonPoints = radarData.map((d, i) => {
    const r = (Math.max(0, Math.min(100, d.value)) / 100) * radius;
    const p = getPoint(i, r);
    return `${p.x},${p.y}`;
  }).join(' ');

  const toneColor = analysis.tone === 'Positive' ? '#10b981' : analysis.tone === 'Cautious' ? '#f59e0b' : '#3b82f6';
  const sentColor = analysis.sentiment === 'Positive' ? '#10b981' : analysis.sentiment === 'Mixed' ? '#f59e0b' : '#6b7280';
  const fillerColor = analysis.fillerWordCount > 8 ? '#ef4444' : analysis.fillerWordCount > 3 ? '#f59e0b' : '#10b981';
  const recColor = analysis.recommendation === 'Strongly Recommend' || analysis.recommendation === 'Recommend'
    ? '#10b981' : analysis.recommendation === 'Consider' ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
      
      {/* 4 Colorful Badge Pills in one horizontal line above the radar chart */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '6px', flexShrink: 0 }}>
        {[
          { label: 'Tone',        value: analysis.tone,           color: toneColor },
          { label: 'Sentiment',   value: analysis.sentiment,      color: sentColor },
          { label: 'Fillers',     value: `${analysis.fillerWordCount}`,  color: fillerColor },
          { label: 'Recommend',   value: analysis.recommendation.split(' ')[0], color: recColor },
        ].map((b, i) => (
          <div key={i} style={{
            flex: 1,
            padding: '6px 4px',
            borderRadius: '16px',
            backgroundColor: `${b.color}12`,
            border: `1.5px solid ${b.color}25`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1px',
            minWidth: 0,
            cursor: 'default'
          }}>
            <span style={{ fontSize: '0.5rem', fontWeight: '750', color: b.color, textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
              {b.label}
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: b.color, textAlign: 'center', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
              {b.value}
            </span>
          </div>
        ))}
      </div>

      {/* Radar chart directly below badges */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', margin: '0' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
          {/* Grid lines */}
          {gridLevels.map((level, li) => {
            const pts = radarData.map((_, i) => {
              const p = getPoint(i, radius * level);
              return `${p.x},${p.y}`;
            }).join(' ');
            return <polygon key={li} points={pts} fill="none" stroke="rgba(14,45,123,0.15)" strokeWidth={1.2} />;
          })}
          {radarData.map((_, i) => {
            const outer = getPoint(i, radius);
            return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="rgba(14,45,123,0.15)" strokeWidth={1.2} />;
          })}

          {/* Area polygon */}
          <polygon points={polygonPoints} fill="rgba(14,45,123,0.12)" stroke="var(--brand-navy)" strokeWidth={2.2} strokeLinejoin="round" />
          
          {/* Central IQ Badge (Always stays clean and static) */}
          <circle cx={cx} cy={cy} r={12} fill="#f8fafc" stroke="rgba(14,45,123,0.08)" strokeWidth={1} />
          <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="var(--brand-navy)" opacity={0.3} fontFamily="'Inter',sans-serif">IQ</text>

          {/* Dots */}
          {radarData.map((d, i) => {
            const r = (Math.max(0, Math.min(100, d.value)) / 100) * radius;
            const p = getPoint(i, r);
            const isHovered = hoveredIndex === i;
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={isHovered ? 5.5 : 3.5}
                fill={d.color}
                stroke="#fff"
                strokeWidth={isHovered ? 2 : 1.5}
                style={{ transition: 'all 0.15s ease' }}
              />
            );
          })}

          {/* Invisible interactive hover targets over the dots */}
          {radarData.map((d, i) => {
            const r = (Math.max(0, Math.min(100, d.value)) / 100) * radius;
            const p = getPoint(i, r);
            return (
              <circle
                key={`hover-${i}`}
                cx={p.x}
                cy={p.y}
                r={18}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}

          {/* Outer text labels - programmatically placed around chart */}
          {radarData.map((d, i) => {
            const p = getPoint(i, radius + 15);
            const anchor = p.x < cx - 5 ? 'end' : p.x > cx + 5 ? 'start' : 'middle';
            let dy = 3;
            if (i === 0) dy = -5;
            if (i === 3) dy = 11;
            const isHovered = hoveredIndex === i;
            return (
              <text
                key={`label-${i}`}
                x={p.x}
                y={p.y + dy}
                textAnchor={anchor}
                fontSize="8.5"
                fontWeight={isHovered ? "800" : "750"}
                fill={isHovered ? d.color : "var(--brand-navy)"}
                fontFamily="'Inter',sans-serif"
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {d.label}
              </text>
            );
          })}

          {/* Elegant Floating Tooltip Pill showing percentage next to hovered dot */}
          {hoveredIndex !== null && (
            (() => {
              const d = radarData[hoveredIndex];
              const r = (Math.max(0, Math.min(100, d.value)) / 100) * radius;
              const p = getPoint(hoveredIndex, r);
              const tx = p.x;
              const ty = p.y - 14;
              return (
                <g style={{ pointerEvents: 'none' }}>
                  <rect
                    x={tx - 22}
                    y={ty - 14}
                    width={44}
                    height={18}
                    rx={6}
                    fill="var(--brand-navy)"
                    stroke="#fff"
                    strokeWidth={1}
                    filter="drop-shadow(0px 2px 4px rgba(15,23,42,0.2))"
                  />
                  <text
                    x={tx}
                    y={ty - 1.5}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="800"
                    fill="#fff"
                    fontFamily="'Inter',sans-serif"
                  >
                    {d.value}%
                  </text>
                  <polygon
                    points={`${tx - 4},${ty + 4} ${tx + 4},${ty + 4} ${tx},${ty + 8}`}
                    fill="var(--brand-navy)"
                  />
                </g>
              );
            })()
          )}
        </svg>
      </div>

      {/* View More Button moved upside */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '6px' }}>
        <button
          style={{ 
            padding: '4px 14px', 
            fontSize: '0.72rem', 
            height: '26px', 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            backgroundColor: '#fff',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--brand-navy)',
            fontWeight: '700',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            transition: 'all 0.2s'
          }}
          onClick={onViewMore}
        >
          View More
        </button>
      </div>
    </div>
  );
}
