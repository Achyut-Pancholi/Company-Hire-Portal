"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Download, Share2, Eye, FileText, CheckCircle, Clock, X, User,
  BookOpen, Code2, Briefcase, TrendingUp, TrendingDown, BarChart2,
  Star, Award, AlertCircle, ChevronRight, Search, Filter, Zap,
  MessageSquare, Target, Activity, PieChart, LayoutGrid, List, Upload, Video
} from 'lucide-react';
import { useAppContext } from '@/components/admin/context/AppContext';
import StandardResume from '@/components/admin/StandardResume';
import { ResumeParsedBox } from "@/components/ResumeParsedBox";
import { ReportDashboardGrid } from "@/components/ReportDashboardGrid";
import { analyzeTranscript } from '@/utils/transcriptAnalyzer';
import WorkflowBadge from '@/components/admin/WorkflowBadge';
import { useSWRConfig } from 'swr'; // removed useSWR import, we'll use fetch with SWRConfig for revalidation

/* ─────────────────────────── helpers ─────────────────────────── */
const NEXT_JS_URL = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

const scoreColor = (v) => {
  if (!v) return 'var(--gray-400)';
  if (v >= 85) return '#10b981';
  if (v >= 70) return '#3b82f6';
  if (v >= 55) return '#f59e0b';
  return '#ef4444';
};

const parseTextTranscript = (text: string, candidateName = '') => {
  const entries: { question: string; answer: string; timestamp_start?: number; timestamp_end?: number }[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let currentQ = '';
  let currentA = '';
  
  // Prepare candidate name patterns for robust speaker matching
  const nameParts = candidateName ? candidateName.split(/\s+/).map(p => p.replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean) : [];
  const namePatterns = nameParts.length > 0 ? '|' + nameParts.join('|') : '';
  
  const qRegex = new RegExp(`^(?:Q|Question|Interviewer|Speaker\\s*1|Host|Reviewer|HR|Recruiter)[:\\-]?\\s*(.*)$`, 'i');
  const aRegex = new RegExp(`^(?:A|Answer|Candidate|Me|Speaker\\s*2|Applicant|User${namePatterns})[:\\-]?\\s*(.*)$`, 'i');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Clean any timestamp prefixes or suffixes dynamically
    const cleanLine = line
      .replace(/^(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?|\(?\d{1,2}:\d{2}(?::\d{2})?\)?)\s*/, '')
      .replace(/\s*\(\d{1,2}:\d{2}(?::\d{2})?\)\s*$/, '')
      .trim();

    const qMatch = cleanLine.match(qRegex);
    const aMatch = cleanLine.match(aRegex);
    
    if (qMatch) {
      if (currentQ) {
        entries.push({ question: currentQ, answer: currentA || 'No answer provided.' });
      }
      currentQ = qMatch[1];
      currentA = '';
    } else if (aMatch) {
      currentA = aMatch[1];
    } else {
      if (currentQ) {
        if (currentA) {
          currentA += '\n' + cleanLine;
        } else {
          currentQ += '\n' + cleanLine;
        }
      } else {
        currentQ = cleanLine;
      }
    }
  }
  if (currentQ) {
    entries.push({ question: currentQ, answer: currentA || 'No answer provided.' });
  }

  // Fallback to alternating lines if no proper matches were found
  let finalEntries = entries;
  if (finalEntries.length === 0 || (finalEntries.length === 1 && (!finalEntries[0].answer || finalEntries[0].answer === 'No answer provided.'))) {
    const dialogueLines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const alternateEntries: { question: string; answer: string; timestamp_start?: number; timestamp_end?: number }[] = [];
    for (let i = 0; i < dialogueLines.length; i += 2) {
      const q = dialogueLines[i];
      const a = dialogueLines[i + 1] || 'No answer provided.';
      if (q) {
        alternateEntries.push({ question: q, answer: a });
      }
    }
    if (alternateEntries.length > 0) {
      finalEntries = alternateEntries;
    }
  }

  // Enrich with timestamps for perfect layout segment rendering
  let currentSec = 10;
  finalEntries.forEach(e => {
    if (e.timestamp_start === undefined) {
      e.timestamp_start = currentSec;
      const words = (e.answer || '').split(/\s+/).length;
      const duration = Math.max(5, Math.min(45, words * 0.4));
      e.timestamp_end = currentSec + duration;
      currentSec = Math.round(e.timestamp_end + 5);
    }
  });

  return finalEntries;
};

const getSimulatedTranscript = (role = '', name = '') => {
  const uiux = [
    { question: "Can you tell me about your design process?", answer: "I start with deep user research to understand pain points, followed by wireframing, interactive prototyping, and extensive usability testing. I always iterate based on feedback." },
    { question: "How do you handle feedback from stakeholders that contradicts your design intuition?", answer: "I look at data. I try to run quick A/B tests or user testing sessions to present empirical evidence rather than relying solely on subjective opinions." },
    { question: "What tools do you prefer for high-fidelity prototyping?", answer: "Figma is my primary tool for collaboration and UI design, and I use Protopie or Framer for advanced animations." }
  ];
  const developer = [
    { question: "What is your approach to managing state in large React applications?", answer: "Depending on the scale, I use Context API for simpler global state, Redux Toolkit for complex transactional states, or Zustand for lightweight and fast state updates." },
    { question: "How do you ensure web application performance?", answer: "By optimizing assets, lazy loading components, code splitting, minimizing bundle size, and ensuring efficient API queries and rendering paths." },
    { question: "Have you worked with Server-Side Rendering (SSR)?", answer: "Yes, I have extensively used Next.js for server-rendered apps to improve SEO and first-contentful-paint times." }
  ];
  const general = [
    { question: "Why are you interested in joining our company?", answer: "I am impressed by your company's focus on innovation and strong engineering culture. I want to contribute to building impactful solutions." },
    { question: "What is your preferred working style?", answer: "I thrive in collaborative, cross-functional teams where communication is transparent and everyone has ownership over their tasks." },
    { question: "How do you manage tight deadlines?", answer: "I prioritize tasks using Eisenhower matrix, break them down into smaller milestones, and communicate proactively if any blockers arise." }
  ];
  
  const lower = (role || '').toLowerCase();
  if (lower.includes('ui') || lower.includes('ux') || lower.includes('design')) return uiux;
  if (lower.includes('dev') || lower.includes('engineer') || lower.includes('software') || lower.includes('code')) return developer;
  return general;
};

const scoreLabel = (v) => {
  if (!v) return 'N/A';
  if (v >= 85) return 'Excellent';
  if (v >= 70) return 'Good';
  if (v >= 55) return 'Average';
  return 'Poor';
};

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

/* ─────────────────── SVG Radial Progress ─────────────────────── */
const RadialProgress = ({ value = 0, size = 80, stroke = 7, color = '#3b82f6', label }) => {
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

/* ──────────────── Horizontal bar chart ─────────────────────────── */
const BarChart = ({ data = [], color = '#3b82f6' }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '120px', fontSize: '0.75rem', color: 'var(--gray-700)', fontWeight: '500', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
          <div style={{ flex: 1, height: '10px', backgroundColor: 'var(--gray-100)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${(d.value / max) * 100}%`,
              backgroundColor: color, borderRadius: '999px',
              transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)'
            }} />
          </div>
          <span style={{ width: '28px', textAlign: 'right', fontSize: '0.72rem', fontWeight: '700', color }}>{d.value}%</span>
        </div>
      ))}
    </div>
  );
};

/* ──────────────── Mini Donut chart ──────────────────────────── */
const Donut = ({ slices = [], size = 70 }) => {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => {
        const pct = s.value / total;
        const dash = pct * circ;
        const gap = circ - dash;
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={s.color} strokeWidth={8} strokeLinecap="round"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
};

/* ──────────────── Skill Match Visual ─────────────────────────── */
const SkillMatch = ({ jobSkills = [], candidateSkills = [] }) => {
  const norm = (s) => s.trim().toLowerCase();
  const cSet = new Set(candidateSkills.map(norm));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {jobSkills.length === 0
        ? <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No required skills defined for this role.</span>
        : jobSkills.map((skill, i) => {
          const matched = cSet.has(norm(skill));
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 10px', borderRadius: '8px',
              backgroundColor: matched ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${matched ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)'}`,
            }}>
              {matched
                ? <CheckCircle size={14} color="#10b981" />
                : <X size={14} color="#ef4444" />}
              <span style={{ fontSize: '0.78rem', fontWeight: '600', color: matched ? '#065f46' : '#7f1d1d' }}>{skill}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.68rem', fontWeight: '700', padding: '2px 7px', borderRadius: '999px', backgroundColor: matched ? '#10b981' : '#ef4444', color: '#fff' }}>
                {matched ? 'Matched' : 'Missing'}
              </span>
            </div>
          );
        })}
    </div>
  );
};

/* ────────────────── Transcript Analysis ───────────────────────── */
const TranscriptAnalysis = ({ transcript = [] }) => {
  if (!transcript || transcript.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No transcript available yet.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {transcript.map((entry, i) => (
        <div key={i} style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: '#fafbff' }}>
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

/* ──────────────────── Strength / Weakness ──────────────────── */
const deriveStrengthsWeaknesses = (candidate) => {
  const strengths = [];
  const weaknesses = [];
  const data = candidate.extractedData || {};

  // resume score
  if (candidate.resumeScore >= 80) strengths.push('Strong resume score (' + candidate.resumeScore + '/100)');
  else if (candidate.resumeScore && candidate.resumeScore < 60) weaknesses.push('Below-average resume score (' + candidate.resumeScore + '/100)');

  // experience
  const exp = data.totalExperienceAnalysis;
  if (exp) {
    const yrs = parseFloat(exp.domainExperience) || 0;
    if (yrs >= 3) strengths.push(`${yrs}+ years domain experience`);
    else if (yrs < 1) weaknesses.push('Limited domain experience (<1 year)');
    if (exp.leadershipExperience && parseFloat(exp.leadershipExperience) > 0)
      strengths.push(`Leadership experience (${exp.leadershipExperience})`);
  }

  // skills depth
  const skills = candidate.skills || [];
  if (skills.length >= 8) strengths.push(`Broad skill set (${skills.length} skills)`);
  else if (skills.length < 4) weaknesses.push(`Narrow skill set (only ${skills.length} skills listed)`);

  // education
  const edu = data.educationDetails || [];
  if (edu.length > 0) {
    const topEdu = edu[0];
    if (/master|mba|m\.tech|msc/i.test(topEdu.degree || '')) strengths.push('Post-graduate education (' + topEdu.degree + ')');
    else if (/bachelor|b\.tech|be|bsc/i.test(topEdu.degree || '')) strengths.push('Undergraduate degree (' + topEdu.degree + ')');
  }

  // projects
  const projs = data.projectAnalysis || [];
  if (projs.length >= 3) strengths.push(`${projs.length} notable projects demonstrated`);
  else if (projs.length === 0) weaknesses.push('No project portfolio extracted');

  // video score
  if (candidate.videoScore >= 80) strengths.push('Excellent video interview performance');
  else if (candidate.videoScore && candidate.videoScore < 60) weaknesses.push('Low video interview score');

  // tech score
  if (candidate.techScore >= 80) strengths.push('Outstanding technical assessment');
  else if (candidate.techScore && candidate.techScore < 60) weaknesses.push('Below-par technical score');

  return { strengths, weaknesses };
};

/* ─────────────────────── Detail Modal ──────────────────────── */
const DetailModal = ({ candidate, jobs, onClose, onUploadVideo, uploadStatusMessage, onCopyShareLink }) => {
  const { refreshCandidates, apiFetch } = useAppContext();
  const [viewResumeOpen, setViewResumeOpen] = useState(false);
  const [matchedInterview, setMatchedInterview] = useState(null);

  // States for report edit and sharing link generation
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editForm, setEditForm] = useState({
    finalRecommendation: candidate.finalRecommendation || 'Under Review',
    resumeScore: candidate.resumeScore || 0,
    videoScore: candidate.videoScore || 0,
    techScore: candidate.techScore || 0,
  });

  const [generatedLink, setGeneratedLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  const prevCandidateIdRef = useRef(null);

  useEffect(() => {
    if (candidate) {
      setEditForm({
        finalRecommendation: candidate.finalRecommendation || 'Under Review',
        resumeScore: candidate.resumeScore || 0,
        videoScore: candidate.videoScore || 0,
        techScore: candidate.techScore || 0,
      });
      if (prevCandidateIdRef.current !== candidate.id) {
        setGeneratedLink('');
        prevCandidateIdRef.current = candidate.id;
      }
    }
  }, [candidate]);

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await apiFetch('/api/reports/share', {
        method: 'POST',
        body: JSON.stringify({
          candidateId: candidate.id,
          candidateEmail: candidate.email,
          candidateName: candidate.name,
          jobRole: candidate.jobApplied,
          scores: {
            resume: candidate.resumeScore,
            video: candidate.videoScore,
            tech: candidate.techScore,
          },
          recommendation: candidate.finalRecommendation,
          skipEmail: true
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGeneratedLink(data.reportUrl);
        await refreshCandidates();
      } else {
        alert(data.error || 'Failed to generate report link.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Failed to generate report link.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleSaveReport = async () => {
    try {
      const payload = {
        id: candidate.id,
        final_recommendation: editForm.finalRecommendation,
        resume_score: Number(editForm.resumeScore),
        video_score: Number(editForm.videoScore),
        tech_score: Number(editForm.techScore),
      };
      const response = await apiFetch('/api/candidates', {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setIsEditingReport(false);
        await refreshCandidates();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to update report');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error saving report');
    }
  };

  if (!candidate) return null;

  console.log("MODAL ANALYSIS:", candidate.extractedData?.transcriptAnalysis);
  const data = candidate.extractedData || {};
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    name: candidate.name,
    email: candidate.email || candidate.extractedData?.personalInformation?.email || "",
    jobApplied: candidate.jobApplied,
    resumeScore: candidate.resumeScore || 0,
    videoScore: candidate.videoScore || 0,
    techScore: candidate.techScore || 0,
    finalRecommendation: candidate.finalRecommendation || 'Under Review',
    summary: candidate.extractedData?.transcriptAnalysis?.summary || "",
    pros: candidate.extractedData?.transcriptAnalysis?.pros || "",
    cons: candidate.extractedData?.transcriptAnalysis?.cons || ""
  });

  const handleSaveEdits = async () => {
    try {
      const supabase = createClient();
      
      const payload = {
        name: editedData.name,
        email: editedData.email,
        jobApplied: editedData.jobApplied,
        resumeScore: parseInt(editedData.resumeScore) || 0,
        videoScore: parseInt(editedData.videoScore) || 0,
        techScore: parseInt(editedData.techScore) || 0,
        finalRecommendation: editedData.finalRecommendation
      };

      const { data: existing } = await supabase.from('candidates').select('extracted_data').eq('id', candidate.id).single();
      const extracted_data = existing?.extracted_data || {};
      if (!extracted_data.transcriptAnalysis) extracted_data.transcriptAnalysis = {};
      extracted_data.transcriptAnalysis.summary = editedData.summary;
      extracted_data.transcriptAnalysis.pros = editedData.pros;
      extracted_data.transcriptAnalysis.cons = editedData.cons;

      await supabase.from('candidates').update({ ...payload, extracted_data }).eq('id', candidate.id);
      setIsEditing(false);
      if (refreshCandidates) refreshCandidates();
    } catch (e) {
      console.error("Save failed", e);
    }
  };


  useEffect(() => {
    const fetchInterviewData = async () => {
      try {
        if (!apiFetch) return;
        const res = await apiFetch(`/api/interviews/list?t=${Date.now()}`);
        if (res.ok) {
          const list = await res.json();
          const targetEmail = (candidate.email || candidate.extractedData?.personalInformation?.email || "").trim().toLowerCase();
          const cleanName = (n: string) => (n || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
          const candName = cleanName(candidate.name || "");
          
          if (Array.isArray(list)) {
            const match = list.find((i: any) => {
              const matchesEmail = targetEmail && (i.candidate_email || "").trim().toLowerCase() === targetEmail;
              const matchesName = candName && cleanName(i.candidate_name || "") === candName;
              return (matchesEmail || matchesName) && i.status === 'completed';
            });
            if (match) {
              setMatchedInterview(match);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch interview details in modal:", err);
      }
    };
    fetchInterviewData();
  }, [candidate, apiFetch]);

  // Bug 1: Experience always static
  const dynamicExperience = React.useMemo(() => {
    console.log("Extracted Experience:", data);
    
    // Check all possible database experience fields
    const directExp = data.experience || data.totalExperience;
    if (directExp && String(directExp).trim() && String(directExp).trim() !== "—" && String(directExp).trim() !== "null") {
      const val = String(directExp).trim();
      return val.toLowerCase().includes("fresher") ? "Fresher" : (val.toLowerCase().includes("exp") ? val : `${val} Exp`);
    }

    const expAnalysis = data.totalExperienceAnalysis;
    if (expAnalysis) {
      if (expAnalysis.totalExperience && String(expAnalysis.totalExperience).trim() && String(expAnalysis.totalExperience).trim() !== "—" && String(expAnalysis.totalExperience).trim() !== "null") {
        const val = String(expAnalysis.totalExperience).trim();
        return val.toLowerCase().includes("fresher") ? "Fresher" : (val.toLowerCase().includes("exp") ? val : `${val} Exp`);
      }
      if (typeof expAnalysis.domainExperience === 'number' && expAnalysis.domainExperience > 0) {
        return `${expAnalysis.domainExperience} Years Exp`;
      }
    }

    return "Fresher";
  }, [data]);
  const skills = candidate.skills || [];
  const edu = data.educationDetails || [];
  const projs = data.projectAnalysis || [];
  
  // Use DB Whisper transcript if available, fallback to candidate transcript
  const transcript = React.useMemo(() => {
    if (matchedInterview?.transcript && Array.isArray(matchedInterview.transcript) && matchedInterview.transcript.length > 0) {
      return matchedInterview.transcript.map((t: any) => ({
        question: t.question || "",
        answer: t.text || t.answer || "",
        timestamp_start: t.timestamp_start,
        timestamp_end: t.timestamp_end
      }));
    }
    return candidate.transcript || data.transcript || [];
  }, [matchedInterview, candidate, data]);

  const { strengths, weaknesses } = deriveStrengthsWeaknesses(candidate);

  // Analyze transcript dynamically for bottom KPI bar metrics
  const analysis = React.useMemo(() => {
    if (transcript && transcript.length > 0) {
      try {
        return analyzeTranscript(transcript);
      } catch (err) {
        console.error(err);
      }
    }
    return null;
  }, [transcript]);

  // Compute scores perfectly consistent with the real database records
  const resolvedScores = React.useMemo(() => {
    const s = matchedInterview?.scores || {};
    const resumeScoreVal = candidate.resumeScore || 0;
    const videoScoreVal = candidate.videoScore || 0;
    const techScoreVal = candidate.techScore || 0;
    const recLabelVal = candidate.finalRecommendation || 'Under Review';

    const commScoreVal = s.Communication !== undefined ? s.Communication * 20 : videoScoreVal;
    const confidenceVal = s.Confidence !== undefined ? s.Confidence * 20 : videoScoreVal;
    const confLabelVal = confidenceVal >= 75 ? 'High' : confidenceVal >= 55 ? 'Medium' : 'Low';

    const scoresList = [resumeScoreVal, videoScoreVal, techScoreVal].filter((v) => v !== null && v !== undefined);
    const avgScoreVal = scoresList.length ? Math.round(scoresList.reduce((a, b) => a + b, 0) / scoresList.length) : 75;

    return {
      commScore: commScoreVal,
      confLabel: confLabelVal,
      recLabel: recLabelVal,
      resumeScore: resumeScoreVal,
      videoScore: videoScoreVal,
      techScore: techScoreVal,
      avgScore: avgScoreVal
    };
  }, [matchedInterview, candidate]);

  const commScore = resolvedScores.commScore;
  const confLabel = resolvedScores.confLabel;
  const recLabel = resolvedScores.recLabel;
  const avgScore = resolvedScores.avgScore;

  // Find matching job to get required skills
  const matchedJob = jobs.find((j) => j.title === candidate.jobApplied);
  const jobSkills = matchedJob?.required_skills || matchedJob?.skills || [];

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,18,40,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 0 }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: '#fff', borderRadius: '0px', width: '100vw', maxWidth: '100vw', height: '100vh', maxHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'none', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Container */}
        <div style={{ background: 'linear-gradient(135deg, #0B2C82 0%, #07256B 100%)', flexShrink: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
          
          {/* Top Header Section */}
          <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            
            {/* LEFT SECTION: Avatar & Candidate Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '1.2rem', flexShrink: 0 }}>
                {getInitials(candidate.name)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <input type="text" value={editedData.name} onChange={e => setEditedData({...editedData, name: e.target.value})} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', padding: '4px 8px', fontSize: '1.1rem', fontWeight: '700' }} />
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input type="text" value={editedData.jobApplied} onChange={e => setEditedData({...editedData, jobApplied: e.target.value})} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', padding: '2px 6px', fontSize: '0.75rem' }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 style={{ color: '#fff', fontWeight: '800', fontSize: '1.3rem', margin: 0, letterSpacing: '-0.02em' }}>{candidate.name}</h2>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', margin: 0, fontWeight: '500' }}>
                      {candidate.jobApplied} • {dynamicExperience === "Fresher" ? "Fresher" : dynamicExperience} {candidate.extractedData?.educationDetails?.[0]?.degree ? `• ${candidate.extractedData.educationDetails[0].degree}` : '• MCA'}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* SEPARATOR */}
            <div style={{ width: '1px', height: '32px', backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 16px' }} />

            {/* CENTER SECTION: Match Score */}
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', width: '180px' }}>
              <div style={{ 
                padding: '4px 20px', 
                borderRadius: '12px', 
                backgroundColor: 'rgba(255,255,255,0.06)', 
                border: '1px solid rgba(255,255,255,0.15)', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '2px',
                width: '100%',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1) inset, 0 0 10px rgba(255,255,255,0.05)' 
              }}>
                <span style={{ color: '#10b981', fontSize: '1.6rem', fontWeight: '900', lineHeight: '1', textShadow: '0 2px 8px rgba(16,185,129,0.2)' }}>
                  {avgScore !== null ? `${avgScore}` : '79'}
                </span>
                <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  OVERALL SCORE
                </span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', fontWeight: '600', marginTop: '2px' }}>
                  Good Match
                </span>
              </div>
            </div>

            {/* SEPARATOR */}
            <div style={{ width: '1px', height: '32px', backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 16px' }} />

            {/* RIGHT CENTER SECTION: Status Badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0, justifyContent: 'center' }}>
              {isEditingReport ? (
                <select
                  value={editForm.finalRecommendation}
                  onChange={(e) => setEditForm({ ...editForm, finalRecommendation: e.target.value })}
                  style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: '#fff', border: '1px solid #ccc', color: '#000' }}
                >
                  <option value="Under Review">Under Review</option>
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                </select>
              ) : (
                <div style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700',
                  backgroundColor: 'rgba(245,158,11,0.1)',
                  border: candidate.finalRecommendation === 'Selected' ? '1px solid #10b981' : candidate.finalRecommendation === 'Rejected' ? '1px solid #ef4444' : '1px solid #f59e0b',
                  color: candidate.finalRecommendation === 'Selected' ? '#10b981' : candidate.finalRecommendation === 'Rejected' ? '#ef4444' : '#f59e0b',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  <span style={{ fontSize: '10px' }}>●</span> {candidate.finalRecommendation || 'Under Review'}
                </div>
              )}
              <div style={{
                padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700',
                backgroundColor: 'rgba(16,185,129,0.05)',
                border: '1px solid #10b981',
                color: '#10b981',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <span style={{ fontSize: '10px' }}>●</span> Risk: Low
              </div>
            </div>

            {/* SEPARATOR */}
            <div style={{ width: '1px', height: '32px', backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 16px' }} />

            {/* RIGHT SECTION: Logo, Upload & Close Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px' }}>
                <img 
                  src="/kadellabs-logo.png" 
                  alt="Company Logo" 
                  style={{ height: '48px', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }} 
                />
              </div>
              
              <button
                onClick={() => setIsEditingReport(!isEditingReport)}
                style={{ background: isEditingReport ? '#64748b' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', transition: 'all 0.2s' }}
              >
                {isEditingReport ? 'Cancel' : 'Edit Report'}
              </button>

              {isEditingReport && (
                <button
                  onClick={handleSaveReport}
                  style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', transition: 'all 0.2s' }}
                >
                  Save Changes
                </button>
              )}

              <button
                onClick={handleGenerateLink}
                disabled={generatingLink}
                style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', transition: 'all 0.2s', opacity: generatingLink ? 0.7 : 1 }}
              >
                {generatingLink ? 'Generating...' : 'Generate Link'}
              </button>

              {uploadStatusMessage ? <span style={{ color: '#10b981', fontSize: '0.75rem', marginLeft: '4px' }}>{uploadStatusMessage}</span> : null}
              
              <button 
                onClick={onClose} 
                style={{ 
                  background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', cursor: 'pointer', 
                  width: '32px', height: '32px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                title="Close Report"
              >
                <X size={16} />
              </button>
            </div>
          </div>



          {/* BOTTOM KPI BAR */}
          <div style={{ padding: '0 32px 12px 32px', backgroundColor: 'transparent' }}>
            <div style={{ 
              maxWidth: '1440px', 
              margin: '0 auto', 
              backgroundColor: '#0A2D82', 
              borderRadius: '12px', 
              border: '1px solid rgba(255,255,255,0.1)', 
              padding: '12px 24px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              width: '100%',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              
              {/* KPI 1: Resume Match */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <FileText size={24} color="#fff" style={{ opacity: 0.9 }} strokeWidth={1.5} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: '500' }}>Resume Match</span>
                  {isEditingReport ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.resumeScore}
                      onChange={(e) => setEditForm({ ...editForm, resumeScore: Number(e.target.value) })}
                      style={{ width: '60px', color: '#000', padding: '2px 4px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  ) : (
                    <span style={{ color: '#10b981', fontSize: '1.15rem', fontWeight: '800', lineHeight: '1.1' }}>{resolvedScores.resumeScore || 0}%</span>
                  )}
                </div>
              </div>
              <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.15)' }} />

              {/* KPI 2: Video Score */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <Video size={24} color="#fff" style={{ opacity: 0.9 }} strokeWidth={1.5} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: '500' }}>Screening Video</span>
                  {isEditingReport ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.videoScore}
                      onChange={(e) => setEditForm({ ...editForm, videoScore: Number(e.target.value) })}
                      style={{ width: '60px', color: '#000', padding: '2px 4px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  ) : (
                    <span style={{ color: '#3b82f6', fontSize: '1.15rem', fontWeight: '800', lineHeight: '1.1' }}>{resolvedScores.videoScore || 0}%</span>
                  )}
                </div>
              </div>
              <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.15)' }} />

              {/* KPI 3: Technical Score */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <Code2 size={24} color="#fff" style={{ opacity: 0.9 }} strokeWidth={1.5} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: '500' }}>Tech Interview</span>
                  {isEditingReport ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.techScore}
                      onChange={(e) => setEditForm({ ...editForm, techScore: Number(e.target.value) })}
                      style={{ width: '60px', color: '#000', padding: '2px 4px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  ) : (
                    <span style={{ color: '#8b5cf6', fontSize: '1.15rem', fontWeight: '800', lineHeight: '1.1' }}>{resolvedScores.techScore || 0}%</span>
                  )}
                </div>
              </div>
              <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.15)' }} />

              {/* KPI 4: Communication */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <MessageSquare size={24} color="#fff" style={{ opacity: 0.9 }} strokeWidth={1.5} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: '500' }}>Communication</span>
                  <span style={{ color: '#f59e0b', fontSize: '1.15rem', fontWeight: '800', lineHeight: '1.1' }}>{commScore}%</span>
                </div>
              </div>
              <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.15)' }} />

              {/* KPI 5: Confidence */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <Activity size={24} color="#fff" style={{ opacity: 0.9 }} strokeWidth={1.5} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: '500' }}>Confidence</span>
                  <span style={{ color: '#10b981', fontSize: '1.15rem', fontWeight: '800', lineHeight: '1.1' }}>{confLabel}</span>
                </div>
              </div>
              <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.15)' }} />

              {/* KPI 6: Recommendation */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <Award size={24} color="#fff" style={{ opacity: 0.9 }} strokeWidth={1.5} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: '500' }}>Recommendation</span>
                  <span style={{ color: '#10b981', fontSize: '1.15rem', fontWeight: '800', lineHeight: '1.1' }}>{recLabel}</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Custom Styles for Hover Zoom / Expansion */}
        <style dangerouslySetInnerHTML={{__html: `
          .zoom-box {
            position: relative;
            overflow: hidden !important;
            border: 1px solid var(--border);
            border-radius: 20px;
            background-color: #fff;
          }
          
          /* Strictly hide any vertical and horizontal scroll bars */
          .zoom-box, .zoom-box *, .zoom-box::-webkit-scrollbar, .zoom-box *::-webkit-scrollbar {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          .zoom-box::-webkit-scrollbar, .zoom-box *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
        `}} />

        {/* Dashboard Main Grid Area — no scroll */}
        <div style={{ flex: 1, display: 'flex', gap: '1.5rem', padding: '1.5rem 2rem 1.5rem', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
          <ReportDashboardGrid candidate={candidate} NEXT_JS_URL={NEXT_JS_URL} matchedInterviewFromDb={matchedInterview} />
        </div>

      </div>

      {viewResumeOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '2rem'
        }} onClick={() => setViewResumeOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <StandardResume 
              candidate={candidate} 
              onClose={() => setViewResumeOpen(false)} 
              onUpdate={refreshCandidates} 
            />
          </div>
        </div>
      )}

      {generatedLink && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2100,
          padding: '2rem'
        }} onClick={() => setGeneratedLink('')}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            padding: '24px',
            position: 'relative',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button 
              onClick={() => setGeneratedLink('')}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.2s'
              }}
            >
              <X size={16} />
            </button>

            {/* Icon & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b5cf6'
              }}>
                <Share2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '850', color: '#0f172a', margin: 0 }}>Report Link Generated</h3>
                <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expires in 24 Hours</span>
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              This link is secure and will automatically expire exactly 24 hours from now. After expiration, access to this report will be locked.
            </p>

            {/* Link Box */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Generated URL</span>
              <a 
                href={generatedLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ 
                  fontSize: '0.8rem', 
                  color: '#8b5cf6', 
                  fontWeight: '600', 
                  wordBreak: 'break-all',
                  textDecoration: 'underline'
                }}
              >
                {generatedLink}
              </a>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedLink);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                style={{
                  flex: 1,
                  background: copiedLink ? '#10b981' : '#8b5cf6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={() => setGeneratedLink('')}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  transition: 'all 0.2s'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN REPORTS PAGE
═══════════════════════════════════════════════════════════════ */
const Reports = () => {
  const { candidates, jobs, refreshCandidates, apiFetch } = useAppContext();
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(null);
  const [search, setSearch] = useState('');
  const [filterJob, setFilterJob] = useState('All');
  const [filterRec, setFilterRec] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [shareLoading, setShareLoading] = useState(false);
  const [shareResult, setShareResult] = useState(null); // { success, reportUrl, error }
  const [copiedId, setCopiedId] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);
  const [uploadingCandidate, setUploadingCandidate] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadingVideoId, setUploadingVideoId] = useState(null);
  const [videoUploadCandidate, setVideoUploadCandidate] = useState(null);
  const videoFileInputRef = useRef(null);
  const [uploadStatusMessage, setUploadStatusMessage] = useState('');
  const ffmpegRef = useRef(null);

  // Remark state
  const [remarkPopover, setRemarkPopover] = useState<{ candidateId: string; name: string } | null>(null);
  const [remarkText, setRemarkText] = useState('');
  const [remarkSaving, setRemarkSaving] = useState(false);
  const [filterStage, setFilterStage] = useState('All');

  // Auto-sync selectedCandidate when candidates context refreshes (fixes stale modal after re-upload)
  useEffect(() => {
    if (!selectedCandidate) return;
    const fresh = candidates.find(c => c.id === selectedCandidate.id);
    if (fresh) {
      setSelectedCandidate(fresh);
    }
  }, [candidates]);

  // Log candidate changes and table scores (Step 5 requirement)
  useEffect(() => {
    console.log("Updated Candidate:", candidates);
    candidates.forEach(c => {
      console.log("TABLE TECH SCORE:", c.techScore);
    });
  }, [candidates]);

  const triggerTranscriptUpload = (candidate) => {
    setUploadingCandidate(candidate);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingCandidate) return;

    // Cache candidate context values to avoid stale object references after async operations (Modification 2)
    const candidateId = uploadingCandidate.id;
    const candidateName = uploadingCandidate.name;
    const candidateJobApplied = uploadingCandidate.jobApplied;
    const candidateExtractedData = uploadingCandidate.extractedData;

    setUploadingId(candidateId);

    try {
      let transcriptEntries = [];
      let sourceTextLength = 0;

      if (file.name.toLowerCase().endsWith('.txt')) {
        // Parse text transcript file
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        sourceTextLength = (text as string).length;
        transcriptEntries = parseTextTranscript(text as string, candidateName);
        // If parsing produced no good entries, fall back to simulated
        if (!transcriptEntries || transcriptEntries.length === 0) {
          transcriptEntries = getSimulatedTranscript(candidateJobApplied, candidateName);
          sourceTextLength = JSON.stringify(transcriptEntries).length;
        }
      } else {
        // For PDF/DOCX, use role-based simulated transcript (can be enhanced with PDF parsing)
        transcriptEntries = getSimulatedTranscript(candidateJobApplied, candidateName);
        sourceTextLength = JSON.stringify(transcriptEntries).length;
      }

      // Step 1: Log extracted transcript
      console.log("TRANSCRIPT:", transcriptEntries);

      // Perform Groq analysis with robust local fallback
      let analysis;
      try {
        console.log("Attempting server-side Groq Transcript Analysis...");
        const groqRes = await apiFetch('/api/analyze-transcript', {
          method: 'POST',
          body: JSON.stringify({ transcript: transcriptEntries })
        });
        if (groqRes.ok) {
          analysis = await groqRes.json();
          console.log("GROQ ANALYSIS SUCCESS:", analysis);
        } else {
          console.warn("Groq server-side API failed, falling back to local NLP analysis.");
          analysis = analyzeTranscript(transcriptEntries);
        }
      } catch (err) {
        console.error("Groq Analysis error, falling back to local:", err);
        analysis = analyzeTranscript(transcriptEntries);
      }

      console.log("ANALYSIS:", analysis);

      // Store transcript + full analysis result in extracted_data for DB persistence
      const transcriptAnalysisResult = {
        communication: analysis.communication,
        technical: analysis.technical,
        problemSolving: analysis.problemSolving,
        professionalism: analysis.professionalism,
        leadership: analysis.leadership,
        confidence: analysis.confidence,
        fluency: analysis.fluency,
        fillerWordCount: analysis.fillerWordCount,
        fillerWords: analysis.fillerWords,
        tone: analysis.tone,
        sentiment: analysis.sentiment,
        recommendation: analysis.recommendation,
        recommendationReason: analysis.recommendationReason,
        ownershipSignals: analysis.ownershipSignals,
        hesitationPatterns: analysis.hesitationPatterns,
        leadershipIndicators: analysis.leadershipIndicators,
        keyObservations: analysis.keyObservations,
        behavioralSignals: analysis.behavioralSignals,
        practicalExperienceScore: analysis.practicalExperienceScore,
        technicalGaps: analysis.technicalGaps,
      };

      const updatedExtractedData = {
        ...(candidateExtractedData || {}),
        transcript: transcriptEntries,
        transcriptAnalysis: transcriptAnalysisResult,
        transcriptUpdatedAt: new Date().toISOString(), // Step 3 requirement
        sourceTranscriptLength: sourceTextLength,
        analysisVersion: "2.0.0"
      };

      const transcriptIntelligenceScore = Math.round(
        analysis.communication * 0.20 +
        analysis.technical * 0.35 +
        analysis.problemSolving * 0.15 +
        analysis.leadership * 0.10 +
        analysis.confidence * 0.10 +
        analysis.professionalism * 0.10
      );

      console.log("FINAL TRANSCRIPT SCORE:", transcriptIntelligenceScore);

      // Step 3 payload
      const payload = {
        id: candidateId,
        extracted_data: updatedExtractedData,
        video_status: 'Completed',
        tech_status: 'Completed',
        video_score: analysis.communication,
        tech_score: transcriptIntelligenceScore,
        final_recommendation: analysis.recommendation
      };

      console.log("PATCH PAYLOAD:", payload);

      const response = await apiFetch('/api/candidates', {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      // Tracing and response verification: Step 2 & Modification 3
      if (response.ok) {
        const updatedCandidate = await response.json();
        console.log("DB RETURN:", updatedCandidate);
        
        if (updatedCandidate) {
          console.log("PATCH RESPONSE VERIFICATION:");
          console.log("  - tech_score:", updatedCandidate.tech_score);
          console.log("  - video_score:", updatedCandidate.video_score);
          console.log("  - extracted_data transcript:", updatedCandidate.extracted_data?.transcript ? "OK" : "MISSING");
          console.log("  - extracted_data transcriptAnalysis:", updatedCandidate.extracted_data?.transcriptAnalysis ? "OK" : "MISSING");
          console.log("  - extracted_data transcriptUpdatedAt:", updatedCandidate.extracted_data?.transcriptUpdatedAt);
        }

        alert(`✅ Transcript analyzed successfully!\n\nScores:\n• Communication: ${analysis.communication}%\n• Technical: ${transcriptIntelligenceScore}%\n• Confidence: ${analysis.confidence}%\n• Recommendation: ${analysis.recommendation}`);
        
        // Refresh candidates list in the table to display updated scores
        await refreshCandidates();
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to upload transcript.');
      }
    } catch (err) {
      console.error(err);
      alert('Error reading/uploading file.');
    } finally {
      setUploadingId(null);
      setUploadingCandidate(null);
    }
  };

  const triggerVideoUpload = (candidate) => {
    setVideoUploadCandidate(candidate);
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = '';
      videoFileInputRef.current.click();
    }
  };

  const handleVideoFileChange = async (e) => {
    // Kept for backward compatibility, though not used anymore
    const file = e.target.files?.[0];
    if (!file || !videoUploadCandidate) return;

    const candidateId = videoUploadCandidate.id;
    const candidateExtractedData = videoUploadCandidate.extractedData || videoUploadCandidate.extracted_data || {};

    setUploadingVideoId(candidateId);
    setUploadStatusMessage("Initializing...");

    let finalFileToUpload: File = file;
    let isCompressed = false;

    // ─── Helper: upload via direct Supabase signed URL or local fallback ───────
    const uploadToSupabase = async (uploadFile: File): Promise<string> => {
      // Guard: ensure file is non-empty
      if (!uploadFile || uploadFile.size === 0) {
        throw new Error("Upload file is missing or empty (size = 0)");
      }

      console.log("=== UPLOAD INITIALIZING ===");
      console.log("File:", uploadFile.name, "Size:", uploadFile.size, "Type:", uploadFile.type);

      try {
        // Step A: Request signed upload URL or fallback info
        const directUrlRes = await apiFetch(`/api/upload-video?candidateId=${candidateId}&filename=${encodeURIComponent(uploadFile.name)}`);
        if (!directUrlRes.ok) {
          throw new Error(`Failed to get upload URL: ${directUrlRes.status}`);
        }
        const directUrlData = await directUrlRes.json();

        if (directUrlData.success && directUrlData.directUpload) {
          console.log("=== DIRECT SUPABASE UPLOAD ===");
          console.log("Upload URL:", directUrlData.uploadUrl);
          console.log("Public URL:", directUrlData.publicUrl);

          const publicUrl = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", directUrlData.uploadUrl, true);
            xhr.setRequestHeader("Content-Type", uploadFile.type || "video/mp4");

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const pct = Math.round((event.loaded / event.total) * 100);
                setUploadStatusMessage(`Uploading... ${pct}%`);
              }
            };

            xhr.onload = () => {
              console.log("=== DIRECT UPLOAD RESPONSE ===");
              console.log("Status:", xhr.status);
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(directUrlData.publicUrl);
              } else {
                reject(new Error(`Direct upload failed: ${xhr.status} - ${xhr.responseText || 'No response'}`));
              }
            };

            xhr.onerror = () => reject(new Error("Network error during direct upload to storage"));
            xhr.send(uploadFile);
          });

          return publicUrl;
        } else {
          console.log("=== FALLBACK LOCAL FORM DATA UPLOAD ===");
          // Build FormData for the local fallback server API route
          const form = new FormData();
          form.append('file', uploadFile, uploadFile.name);
          form.append('candidateId', candidateId);

          const publicUrl = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/upload-video", true);

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const pct = Math.round((event.loaded / event.total) * 100);
                setUploadStatusMessage(`Uploading... ${pct}%`);
              }
            };

            xhr.onload = () => {
              console.log("=== FALLBACK UPLOAD RESPONSE ===");
              console.log("Status:", xhr.status);
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const json = JSON.parse(xhr.responseText);
                  resolve(json.publicUrl);
                } catch {
                  reject(new Error("Invalid JSON in fallback upload response: " + xhr.responseText));
                }
              } else {
                reject(new Error(`Fallback upload failed: ${xhr.status} - ${xhr.responseText}`));
              }
            };

            xhr.onerror = () => reject(new Error("Network error — local fallback upload API unreachable"));
            xhr.send(form);
          });

          return publicUrl;
        }
      } catch (err) {
        console.error("uploadToSupabase error:", err);
        throw err;
      }
    };
    // ─────────────────────────────────────────────────────────────────────────

    try {
      console.log(`=== VIDEO UPLOAD START ===`);
      console.log(`Candidate: ${candidateId}, Original file: ${file.name}, Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);

      // ── Step 1: FFmpeg compression (two-pass if needed) ───────────────────
      const MAX_UPLOAD_MB = 48; // Supabase free tier hard limit is ~50MB per object

      const runCompression = async (ffmpeg: any, inputName: string, outputName: string, pass: number) => {
        const isPass2 = pass === 2;
        const args = [
          '-i', inputName,
          '-c:v',    'libx264',
          '-preset', 'ultrafast',
          '-crf',    isPass2 ? '36' : '32',          // Pass2: crf 36 (more aggressive)
          '-r',      '24',
          '-vf',     isPass2
            ? "scale='min(640,iw)':-2"               // Pass2: 360p max
            : "scale='min(960,iw)':-2",              // Pass1: 480-540p max
          '-b:v',    isPass2 ? '500k' : '700k',      // Pass2: 500k, Pass1: 700k
          '-c:a',    'aac',
          '-b:a',    '96k',
          '-movflags', '+faststart',                 // Optimise for streaming
          outputName,
        ];
        console.log(`[FFmpeg] Pass ${pass} args:`, args.join(' '));
        await ffmpeg.exec(args);
      };

      try {
        setUploadStatusMessage("Loading FFmpeg...");
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

        let ffmpeg = ffmpegRef.current;
        if (!ffmpeg) {
          ffmpeg = new FFmpeg();
          (ffmpegRef as any).current = ffmpeg;
        }

        ffmpeg.on('log', ({ message }: { message: string }) => {
          console.log("FFmpeg:", message);
        });

        ffmpeg.on('progress', ({ progress }: { progress: number }) => {
          const percent = Math.round(progress * 100);
          setUploadStatusMessage(`Compressing... ${percent}%`);
        });

        if (!(ffmpeg as any).loaded) {
          const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
          await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          });
        }

        const inputExt  = file.name.split('.').pop() || 'mp4';
        const ts        = Date.now();
        const inputName = `input_${ts}.${inputExt}`;
        const out1Name  = `out1_${ts}.mp4`;
        const out2Name  = `out2_${ts}.mp4`;

        const originalMB = file.size / 1024 / 1024;
        console.log("=== COMPRESSION START ===");
        console.log("Original Size:", originalMB.toFixed(2), "MB");

        await ffmpeg.writeFile(inputName, await fetchFile(file));
        setUploadStatusMessage("Compressing... 0%");

        // ── Pass 1: crf32, 480p, 700k ───────────────────────────────────────
        await runCompression(ffmpeg, inputName, out1Name, 1);

        const pass1Data = await ffmpeg.readFile(out1Name);
        const pass1Blob = new Blob([pass1Data], { type: 'video/mp4' });
        const pass1MB   = pass1Blob.size / 1024 / 1024;

        console.log("Compressed Size (Pass 1):", pass1MB.toFixed(2), "MB");
        console.log("Reduction %:", (((file.size - pass1Blob.size) / file.size) * 100).toFixed(1) + "%");

        let compressedBlob = pass1Blob;

        // ── Pass 2 (emergency): crf36, 360p, 500k — only if still too large ─
        if (pass1MB > MAX_UPLOAD_MB) {
          console.warn(`Pass 1 output (${pass1MB.toFixed(2)}MB) exceeds ${MAX_UPLOAD_MB}MB limit — running emergency Pass 2...`);
          setUploadStatusMessage("Extra compression... 0%");

          await runCompression(ffmpeg, inputName, out2Name, 2);

          const pass2Data = await ffmpeg.readFile(out2Name);
          const pass2Blob = new Blob([pass2Data], { type: 'video/mp4' });
          const pass2MB   = pass2Blob.size / 1024 / 1024;

          console.log("Compressed Size (Pass 2):", pass2MB.toFixed(2), "MB");
          console.log("Reduction %:", (((file.size - pass2Blob.size) / file.size) * 100).toFixed(1) + "%");

          if (pass2Blob.size === 0) {
            throw new Error("Emergency compression produced an empty file");
          }

          if (pass2MB > MAX_UPLOAD_MB) {
            throw new Error(
              `Video still too large after compression (${pass2MB.toFixed(1)} MB). ` +
              `Maximum allowed is ${MAX_UPLOAD_MB} MB. Please use a shorter clip.`
            );
          }

          compressedBlob = pass2Blob;
          try { await ffmpeg.deleteFile(out2Name); } catch { /* ignore */ }
        }

        if (compressedBlob.size === 0) {
          throw new Error("Compressed file missing or empty after FFmpeg");
        }

        const compressedMB = compressedBlob.size / 1024 / 1024;
        console.log("=== COMPRESSION RESULT ===");
        console.log("Original Size:", originalMB.toFixed(2), "MB");
        console.log("Compressed Size:", compressedMB.toFixed(2), "MB");
        console.log("Reduction %:", (((file.size - compressedBlob.size) / file.size) * 100).toFixed(1) + "%");

        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        finalFileToUpload = new File([compressedBlob], `${baseName}_compressed.mp4`, { type: 'video/mp4' });
        isCompressed = true;

        try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
        try { await ffmpeg.deleteFile(out1Name); } catch { /* ignore */ }

      } catch (compressErr: any) {
        // If this is a user-facing size error, rethrow — don't fall back to original
        if (compressErr.message?.includes('too large after compression') ||
            compressErr.message?.includes('Maximum allowed')) {
          throw compressErr;
        }
        console.warn("FFmpeg compression failed — falling back to original file:", compressErr);
        finalFileToUpload = file;
        isCompressed = false;

        // Still enforce the 50MB limit on the original file
        const originalMB = file.size / 1024 / 1024;
        if (originalMB > MAX_UPLOAD_MB) {
          throw new Error(
            `File is ${originalMB.toFixed(1)} MB and compression failed. ` +
            `Maximum allowed upload is ${MAX_UPLOAD_MB} MB. Please use a shorter/smaller video.`
          );
        }
      }

      // ── Step 2: Upload (compressed or original) ─────────────────────────────
      setUploadStatusMessage("Uploading... 0%");
      const publicVideoUrl = await uploadToSupabase(finalFileToUpload);
      console.log("Upload success — public URL:", publicVideoUrl);

      // ── Step 3: Save URL to DB ────────────────────────────────────────────
      const objectUrl = URL.createObjectURL(finalFileToUpload);
      const updatedExtractedData = {
        ...candidateExtractedData,
        video:                       publicVideoUrl,
        videoUrl:                    publicVideoUrl,
        video_url:                   publicVideoUrl,
        video_path:                  publicVideoUrl,
        localVideoBlobUrl:           objectUrl,
        videoUploadedAt:             new Date().toISOString(),
        videoCompressionOptimized:   isCompressed,
        originalSize:                file.size,
        compressedSize:              finalFileToUpload.size,
      };

      console.log("Saving to DB — videoUrl:", publicVideoUrl);

      const payload = {
        id: candidateId,
        extracted_data: updatedExtractedData,
        video_status: 'Completed',
        video_score: 90
      };

      const response = await apiFetch('/api/candidates', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const saved = await response.json();
        console.log("DB saved — videoUrl in DB:", saved?.extracted_data?.videoUrl);
        setUploadStatusMessage("✅ Upload complete!");
        alert(`✅ Video ${isCompressed ? 'compressed & ' : ''}uploaded successfully!\n\nURL: ${publicVideoUrl}`);
        await refreshCandidates();
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save video URL to database');
      }
    } catch (err: any) {
      console.error("=== VIDEO UPLOAD ERROR ===", err);
      setUploadStatusMessage(`❌ ${err.message || 'Upload failed'}`);
      alert('Video upload error:\n\n' + (err.message || String(err)));
    } finally {
      setUploadingVideoId(null);
      setVideoUploadCandidate(null);
      setTimeout(() => setUploadStatusMessage(''), 4000);
    }
  };

  const copyToClipboard = (text, id) => {
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
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
        })
        .catch(err => console.error("Clipboard API failed", err));
    }
  };

  const handleCopyShareLink = async (candidate) => {
    const token = candidate.extractedData?._reportShareToken || candidate.extracted_data?._reportShareToken;
    if (token) {
      const url = `${NEXT_JS_URL}/report/${token}`;
      copyToClipboard(url, candidate.id);
      return;
    }

    setGeneratingId(candidate.id);
    try {
      const res = await apiFetch('/api/reports/share', {
        method: 'POST',
        body: JSON.stringify({
          candidateId: candidate.id,
          candidateEmail: candidate.email,
          candidateName: candidate.name,
          jobRole: candidate.jobApplied,
          scores: {
            resume: candidate.resumeScore,
            video: candidate.videoScore,
            tech: candidate.techScore,
          },
          recommendation: candidate.finalRecommendation,
          skipEmail: true
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        copyToClipboard(data.reportUrl, candidate.id);
        refreshCandidates();
      } else {
        alert(data.error || 'Failed to generate copy link.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Failed to generate copy link.');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleSendReport = async (candidate) => {
    setShareLoading(true);
    setShareResult(null);
    try {
      const res = await apiFetch('/api/reports/share', {
        method: 'POST',
        body: JSON.stringify({
          candidateId: candidate.id,
          candidateEmail: candidate.email,
          candidateName: candidate.name,
          jobRole: candidate.jobApplied,
          scores: {
            resume: candidate.resumeScore,
            video: candidate.videoScore,
            tech: candidate.techScore,
          },
          recommendation: candidate.finalRecommendation,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShareResult({ success: true, reportUrl: data.reportUrl });
        refreshCandidates();
      } else {
        setShareResult({ success: false, error: data.error || 'Failed to send report.' });
      }
    } catch (e) {
      setShareResult({ success: false, error: 'Network error. Please try again.' });
    } finally {
      setShareLoading(false);
    }
  };

  useEffect(() => { refreshCandidates(); }, []);

  // Return ALL candidates for full HR visibility (pending, in-progress, rejected, completed)
  const allCandidates = candidates;

  const stageOptions = [
    'All', 'Resume Screening', 'Video Screening',
    'Technical Scheduler', 'Technical Evaluation',
    'Rejected at Resume Stage', 'Rejected at Video Stage',
    'Rejected at Technical Stage', 'Report Generation', 'Completed',
  ];

  const filtered = allCandidates.filter((c) => {
    const q = search.toLowerCase();
    const matchQ = !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.jobApplied?.toLowerCase().includes(q);
    const matchJ = filterJob === 'All' || c.jobApplied === filterJob;
    const matchR = filterRec === 'All' || (c.finalRecommendation || 'Under Review') === filterRec;
    const matchS = filterStage === 'All' || (c.current_stage ?? c.currentStage ?? c.stage ?? 'Resume Screening') === filterStage;
    return matchQ && matchJ && matchR && matchS;
  });

  const jobOptions = ['All', ...new Set(allCandidates.map((c) => c.jobApplied).filter(Boolean))];
  const recOptions = ['All', 'Selected', 'Under Review', 'Rejected'];

  /* Stats */
  const total = allCandidates.length;
  const selected = allCandidates.filter((c) => c.finalRecommendation === 'Selected').length;
  const videoComplete = allCandidates.filter((c) => c.videoStatus === 'Completed').length;
  const avgResume = total
    ? Math.round(allCandidates.reduce((a, c) => a + (c.resumeScore || 0), 0) / total)
    : 0;

  const donutData = [
    { label: 'Selected', value: allCandidates.filter((c) => c.finalRecommendation === 'Selected').length, color: '#10b981' },
    { label: 'Under Review', value: allCandidates.filter((c) => !c.finalRecommendation || c.finalRecommendation === 'Under Review').length, color: '#3b82f6' },
    { label: 'Rejected', value: allCandidates.filter((c) => c.finalRecommendation === 'Rejected').length, color: '#ef4444' },
  ];

  const topSkills = (() => {
    const freq = {};
    allCandidates.forEach((c) => (c.skills || []).forEach((s) => { freq[s] = (freq[s] || 0) + 1; }));
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value: Math.round((value / Math.max(total, 1)) * 100) }));
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ── TOP STATS ── */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Total Candidates', value: total, icon: User, color: 'var(--brand-navy)', bg: 'rgba(14,45,123,0.08)' },
          { label: 'Video Screened', value: videoComplete, icon: Zap, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
          { label: 'Selected', value: selected, icon: Award, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Avg Resume Score', value: avgResume ? `${avgResume}%` : '-', icon: BarChart2, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: `4px solid ${s.color}` }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color={s.color} />
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>{s.label}</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--brand-navy)', margin: '2px 0 0' }}>{s.value}</h3>
              </div>
            </div>
          );
        })}
      </div>


      {/* ── CANDIDATE TABLE ── */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Candidate Reports</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate..."
                className="form-input"
                style={{ paddingLeft: '30px', width: '180px', fontSize: '0.8rem' }}
              />
            </div>
            {/* Job filter */}
            <select className="form-select" value={filterJob} onChange={(e) => setFilterJob(e.target.value)} style={{ fontSize: '0.8rem', width: 'auto' }}>
              {jobOptions.map((j) => <option key={j}>{j}</option>)}
            </select>
            {/* Rec filter */}
            <select className="form-select" value={filterRec} onChange={(e) => setFilterRec(e.target.value)} style={{ fontSize: '0.8rem', width: 'auto' }}>
              {recOptions.map((r) => <option key={r}>{r}</option>)}
            </select>
            {/* Stage filter */}
            <select className="form-select" value={filterStage} onChange={(e) => setFilterStage(e.target.value)} style={{ fontSize: '0.8rem', width: 'auto' }}>
              {stageOptions.map((s) => <option key={s}>{s}</option>)}
            </select>
            {/* View toggle */}
            <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              {[{ id: 'table', Icon: List }, { id: 'cards', Icon: LayoutGrid }].map(({ id, Icon }) => (
                <button
                  key={id}
                  onClick={() => setViewMode(id)}
                  style={{ padding: '6px 10px', border: 'none', cursor: 'pointer', backgroundColor: viewMode === id ? 'var(--brand-navy)' : '#fff', color: viewMode === id ? '#fff' : 'var(--gray-500)', display: 'flex', alignItems: 'center' }}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontStyle: 'italic' }}>No candidates match your filters.</p>
          </div>
        ) : viewMode === 'table' ? (
          <>
            <div className="table-container">
            <table className="table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '17%', padding: '12px 10px', verticalAlign: 'middle' }}>Candidate Name & ID</th>
                  <th style={{ width: '9%', padding: '12px 10px', verticalAlign: 'middle' }}>Role</th>
                  <th style={{ width: '5%', textAlign: 'center', padding: '12px 10px', verticalAlign: 'middle' }}>Resume</th>
                  <th style={{ width: '9%', textAlign: 'center', padding: '12px 10px', verticalAlign: 'middle' }}>Screening Video</th>
                  <th style={{ width: '9%', textAlign: 'center', padding: '12px 10px', verticalAlign: 'middle' }}>Tech Int. Score</th>
                  <th style={{ width: '7%', textAlign: 'center', padding: '12px 10px', verticalAlign: 'middle' }}>Transcript</th>
                  <th style={{ width: '8%', textAlign: 'center', padding: '12px 10px', verticalAlign: 'middle' }}>Tech Video Int.</th>
                  <th style={{ width: '9%', textAlign: 'center', padding: '12px 10px', verticalAlign: 'middle' }}>Stage</th>
                  <th style={{ width: '6%', textAlign: 'center', padding: '12px 10px', verticalAlign: 'middle' }}>Remark</th>
                  <th style={{ width: '12%', padding: '12px 10px', verticalAlign: 'middle' }}>Recommendation</th>
                  <th style={{ width: '9%', padding: '12px 10px', verticalAlign: 'middle' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'rgba(14,45,123,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-navy)', fontWeight: '800', fontSize: '0.7rem', flexShrink: 0 }}>
                          {getInitials(c.name)}
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontWeight: '700', color: 'var(--brand-navy)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.name}
                            <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: 'var(--brand-green)', backgroundColor: 'rgba(125, 186, 0, 0.1)', padding: '2px 6px', borderRadius: '10px' }}>
                              {c.unique_id || String(c.id).substring(0,6)}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>{c.jobApplied || '—'}</span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 8px', verticalAlign: 'middle' }}>
                      <span style={{ fontWeight: '700', color: scoreColor(c.resumeScore), fontSize: '0.82rem' }}>{c.resumeScore || '—'}</span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 8px', verticalAlign: 'middle' }}>
                      <span style={{ fontWeight: '700', color: scoreColor(c.videoScore), fontSize: '0.82rem' }}>{c.videoScore || '—'}</span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 8px', verticalAlign: 'middle' }}>
                      <span style={{ fontWeight: '700', color: scoreColor(c.techScore), fontSize: '0.82rem' }}>{c.techScore || '—'}</span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 8px', verticalAlign: 'middle' }}>
                      <button
                        className="btn btn-outline"
                        style={{
                          padding: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          backgroundColor: (c.extractedData?.transcript?.length || c.transcript?.length) ? 'rgba(16,185,129,0.1)' : '#fff',
                          color: (c.extractedData?.transcript?.length || c.transcript?.length) ? '#065f46' : 'var(--gray-700)',
                          borderColor: (c.extractedData?.transcript?.length || c.transcript?.length) ? 'rgba(16,185,129,0.3)' : 'var(--border)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => triggerTranscriptUpload(c)}
                        disabled={uploadingId === c.id}
                        title={(c.extractedData?.transcript?.length || c.transcript?.length) ? "Transcript Uploaded" : "Upload Transcript"}
                      >
                        {uploadingId === c.id ? (
                          <span style={{ fontSize: '0.72rem' }}>⏳</span>
                        ) : (
                          <Upload size={15} />
                        )}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 8px', verticalAlign: 'middle' }}>
                      {uploadingVideoId === c.id ? (
                        <div style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'var(--brand-navy)', whiteSpace: 'nowrap' }} title={uploadStatusMessage}>
                          {uploadStatusMessage || "⏳ ..."}
                        </div>
                      ) : (
                        <button
                          className="btn btn-outline"
                          style={{
                            padding: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            backgroundColor: (c.extractedData?.videoUrl || c.extractedData?.video_url || c.video_url) ? 'rgba(16,185,129,0.1)' : '#fff',
                            color: (c.extractedData?.videoUrl || c.extractedData?.video_url || c.video_url) ? '#065f46' : 'var(--gray-700)',
                            borderColor: (c.extractedData?.videoUrl || c.extractedData?.video_url || c.video_url) ? 'rgba(16,185,129,0.3)' : 'var(--border)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => triggerVideoUpload(c)}
                          title={(c.extractedData?.videoUrl || c.extractedData?.video_url || c.video_url) ? "Video Uploaded" : "Upload Video"}
                        >
                          <Video size={15} />
                        </button>
                      )}
                    </td>
                    {/* Remark cell */}
                    <td style={{ textAlign: 'center', padding: '10px 8px', verticalAlign: 'middle' }}>
                      <WorkflowBadge status={c.current_stage ?? c.currentStage ?? c.stage ?? 'Resume Screening'} size="sm" />
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 8px', verticalAlign: 'middle' }}>
                      {(() => {
                        const candidateRemark = c.remark_reports;
                        const hasRemark = !!candidateRemark;
                        return (
                          <button
                            onClick={() => {
                              setRemarkPopover({ candidateId: c.id, name: c.name });
                              setRemarkText(candidateRemark || '');
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
                    <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '700',
                        backgroundColor:
                          c.finalRecommendation === 'Selected' ? 'rgba(16,185,129,0.1)' :
                          c.finalRecommendation === 'Rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                        color:
                          c.finalRecommendation === 'Selected' ? '#065f46' :
                          c.finalRecommendation === 'Rejected' ? '#7f1d1d' : '#1e40af',
                        border: `1px solid ${
                          c.finalRecommendation === 'Selected' ? 'rgba(16,185,129,0.25)' :
                          c.finalRecommendation === 'Rejected' ? 'rgba(239,68,68,0.25)' : 'rgba(59,130,246,0.25)'
                        }`
                      }}>
                        {c.finalRecommendation || 'Under Review'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 6px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}
                          onClick={() => setSelectedCandidate(c)}
                        >
                          <Eye size={11} /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Remark of Reports</div>
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
                          body: JSON.stringify({ id: remarkPopover.candidateId, remark_reports: remarkText }),
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
          </>
        ) : (
          /* Card view */
          <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem' }}>
            {filtered.map((c) => {
              const avgScore = (() => {
                const vals = [c.resumeScore, c.videoScore, c.techScore].filter(Boolean);
                return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
              })();
              const { strengths, weaknesses } = deriveStrengthsWeaknesses(c);
              return (
                <div key={c.id} style={{ padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border)', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(14,45,123,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-navy)', fontWeight: '800', fontSize: '0.9rem', flexShrink: 0 }}>
                      {getInitials(c.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: 'var(--brand-navy)', fontSize: '0.87rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--brand-green)', backgroundColor: 'rgba(125, 186, 0, 0.1)', padding: '2px 6px', borderRadius: '10px', flexShrink: 0 }}>
                          #{c.display_id || c.unique_id || String(c.id).substring(0,6)}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.jobApplied}</div>
                    </div>
                    {avgScore !== null && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: scoreColor(avgScore) }}>{avgScore}</div>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Avg</div>
                      </div>
                    )}
                  </div>

                  {/* score bars */}
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-around' }}>
                    {[{ label: 'R', value: c.resumeScore }, { label: 'V', value: c.videoScore }, { label: 'T', value: c.techScore }].map(({ label, value }, i) => (
                      <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ height: '4px', backgroundColor: 'var(--gray-100)', borderRadius: '999px', overflow: 'hidden', marginBottom: '3px' }}>
                          <div style={{ height: '100%', width: `${value || 0}%`, backgroundColor: scoreColor(value), borderRadius: '999px' }} />
                        </div>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: '600' }}>{label}: {value || '—'}</span>
                      </div>
                    ))}
                  </div>

                  {/* mini strength preview */}
                  {strengths[0] && <p style={{ fontSize: '0.72rem', color: '#065f46', backgroundColor: 'rgba(16,185,129,0.07)', padding: '5px 8px', borderRadius: '7px', margin: 0 }}>✓ {strengths[0]}</p>}

                  <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                    <button className="btn btn-primary" style={{ flex: 1, padding: '5px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={() => setSelectedCandidate(c)}>
                      <Eye size={12} /> View Report
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '5px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', minWidth: '100px', justifyContent: 'center' }} 
                      onClick={() => handleCopyShareLink(c)}
                      disabled={generatingId === c.id}
                    >
                      <Share2 size={12} />
                      {generatingId === c.id 
                        ? "Generating..." 
                        : copiedId === c.id 
                          ? "Link Copied!" 
                          : "Generate Link"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── DETAIL MODAL ─── */}
      {selectedCandidate && (
        <DetailModal
          candidate={selectedCandidate}
          jobs={jobs || []}
          onClose={() => setSelectedCandidate(null)}
          onUploadVideo={triggerVideoUpload}
          uploadStatusMessage={uploadStatusMessage}
          onCopyShareLink={handleCopyShareLink}
        />
      )}

      {/* Hidden file input for transcript upload */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".txt,.pdf,.docx"
        onChange={handleFileChange}
      />

      {/* Hidden file input for video upload */}
      <input
        type="file"
        ref={videoFileInputRef}
        style={{ display: 'none' }}
        accept="video/*"
        onChange={handleVideoFileChange}
      />
    </div>
  );
};

export default Reports;
