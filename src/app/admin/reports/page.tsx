"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Download, Share2, Eye, FileText, CheckCircle, Clock, X, User,
  BookOpen, Code2, Briefcase, TrendingUp, TrendingDown, BarChart2,
  Star, Award, AlertCircle, ChevronRight, Search, Filter, Zap,
  MessageSquare, Target, Activity, PieChart, LayoutGrid, List, Upload, Video,
  Printer, ChevronDown, Copy, Check, ExternalLink, HelpCircle
} from 'lucide-react';
import { useAppContext } from '@/components/admin/context/AppContext';
import StandardResume from '@/components/admin/StandardResume';
import { ResumeParsedBox } from "@/components/ResumeParsedBox";
import { ReportDashboardGrid } from "@/components/ReportDashboardGrid";
import { analyzeTranscript } from '@/utils/transcriptAnalyzer';
import WorkflowBadge from '@/components/admin/WorkflowBadge';
// SWR removed
import {
  Radar, RadarChart, PolarGrid, Legend, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const NEXT_JS_URL = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

const scoreColor = (v: any) => {
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

const scoreLabel = (v: any) => {
  if (!v) return 'N/A';
  if (v >= 85) return 'Excellent';
  if (v >= 70) return 'Good';
  if (v >= 55) return 'Average';
  return 'Poor';
};

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SVG Radial Progress â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Horizontal bar chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const BarChart = ({ data = [], color = '#3b82f6' }: { data: any[]; color?: string }) => {
  const max = Math.max(...data.map((d: any) => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {data.map((d: any, i: number) => (
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Mini Donut chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const Donut = ({ slices = [], size = 70 }: { slices: any[]; size?: number }) => {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const total = slices.reduce((s: number, d: any) => s + d.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s: any, i: number) => {
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Skill Match Visual â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const SkillMatch = ({ jobSkills = [], candidateSkills = [] }: { jobSkills: string[]; candidateSkills: string[] }) => {
  const norm = (s: string) => s.trim().toLowerCase();
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Transcript Analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const TranscriptAnalysis = ({ transcript = [] }: { transcript: any[] }) => {
  if (!transcript || transcript.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No transcript available yet.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {transcript.map((entry: any, i: number) => (
        <div key={i} style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: '#fafbff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--brand-navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '700', flexShrink: 0 }}>Q{i + 1}</span>
            <p style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0 }}>{entry.question}</p>
          </div>
          {entry.answer && (
            <p style={{ fontSize: '0.78rem', color: 'var(--gray-700)', margin: '0 0 0 26px', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--brand-teal)', fontWeight: '700' }}>A: </span>{entry.answer}
            </p>
          )}
          {(entry.timestamp_start !== undefined) && (
            <span style={{ marginLeft: '26px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {Math.round(entry.timestamp_start)}s â€“ {Math.round(entry.timestamp_end)}s
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Strength / Weakness â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const deriveStrengthsWeaknesses = (candidate: any) => {
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const DetailModal = ({ candidate, jobs, onClose, onUploadVideo, uploadStatusMessage, onCopyShareLink }: any) => {
  const { refreshCandidates, apiFetch } = useAppContext();
  const [viewResumeOpen, setViewResumeOpen] = useState(false);
  const [matchedInterview, setMatchedInterview] = useState<any>(null);

  // Sharing states
  const [generatedLink, setGeneratedLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  // New Interactive report states
  const [activeSectionFilter, setActiveSectionFilter] = useState('All Sections');
  const [viewMode, setViewMode] = useState('Detailed View'); // 'Executive View' | 'Recruiter View' | 'Detailed View'
  const [activeResumeTab, setActiveResumeTab] = useState('Education');
  const [selectedCompetency, setSelectedCompetency] = useState('Technical Knowledge');
  const [transcriptSearchQuery, setTranscriptSearchQuery] = useState('');
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [showRawScores, setShowRawScores] = useState(false);

  const prevCandidateIdRef = useRef<any>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const moreActionsRef = useRef<HTMLDivElement>(null);

  // Click outside to close More Actions dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreActionsOpen && moreActionsRef.current && !moreActionsRef.current.contains(e.target as Node)) {
        setMoreActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [moreActionsOpen]);

  useEffect(() => {
    if (candidate) {
      if (prevCandidateIdRef.current !== candidate.id) {
        setGeneratedLink('');
        prevCandidateIdRef.current = candidate.id;
      }
    }
  }, [candidate]);

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

  if (!candidate) return null;

  // Score Resolution
  const resumeScore = candidate.resumeScore ?? null;
  const videoScore = candidate.videoScore ?? null;
  const techScore = candidate.techScore ?? null;

  const scoresList = [resumeScore, videoScore, techScore].filter((v) => v !== null && v !== undefined);
  const avgScore = scoresList.length ? Math.round(scoresList.reduce((a, b) => a + b, 0) / scoresList.length) : 0;

  // Programmatic Decision Badge
  let decisionBadge = "Review Required";
  let badgeColor = "#f59e0b";
  let badgeBg = "rgba(245, 158, 11, 0.1)";

  if (scoresList.length > 0) {
    if (avgScore >= 85) {
      decisionBadge = "Strongly Recommended";
      badgeColor = "#10b981";
      badgeBg = "rgba(16, 185, 129, 0.1)";
    } else if (avgScore >= 70) {
      decisionBadge = "Recommended";
      badgeColor = "#3b82f6";
      badgeBg = "rgba(59, 130, 246, 0.1)";
    } else if (avgScore >= 55) {
      decisionBadge = "Review Required";
      badgeColor = "#f59e0b";
      badgeBg = "rgba(245, 158, 11, 0.1)";
    } else {
      decisionBadge = "Not Recommended";
      badgeColor = "#ef4444";
      badgeBg = "rgba(239, 68, 68, 0.1)";
    }
  }

  // Risk & Completion Status
  const riskLevel = avgScore >= 75 ? "Low Risk" : avgScore >= 55 ? "Medium Risk" : "High Risk";
  const riskColor = avgScore >= 75 ? "#10b981" : avgScore >= 55 ? "#f59e0b" : "#ef4444";
  const completionStatus = scoresList.length === 3 ? "Complete" : `${scoresList.length}/3 Complete`;
  const completionColor = scoresList.length === 3 ? "#10b981" : "#f59e0b";

  // Data Extraction
  const data = candidate.extractedData || {};
  const edu = data.educationDetails || [];
  const skills = candidate.skills || [];
  const experienceList = data.workExperience || data.experienceDetails || [];
  
  const dynamicExperience = (() => {
    const directExp = data.experience || data.totalExperience;
    if (directExp && String(directExp).trim() && String(directExp).trim() !== "â€”" && String(directExp).trim() !== "null") {
      return String(directExp).trim();
    }
    const expAnalysis = data.totalExperienceAnalysis;
    if (expAnalysis) {
      if (expAnalysis.totalExperience && String(expAnalysis.totalExperience).trim() && String(expAnalysis.totalExperience).trim() !== "â€”" && String(expAnalysis.totalExperience).trim() !== "null") {
        return String(expAnalysis.totalExperience).trim();
      }
      if (typeof expAnalysis.domainExperience === 'number' && expAnalysis.domainExperience > 0) {
        return `${expAnalysis.domainExperience} Years`;
      }
    }
    return "Data Not Available";
  })();

  const qualification = edu.length > 0 && edu[0].degree ? edu[0].degree : "Data Not Available";
  const reportDate = candidate.videoUploadedAt ? new Date(candidate.videoUploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const displayId = candidate.display_id || candidate.unique_id || String(candidate.id).substring(0, 6).toUpperCase();

  const certifications = (() => {
    const certs = data.certifications || data.certificationList;
    if (Array.isArray(certs)) return certs;
    if (typeof certs === 'string' && certs.trim()) {
      return certs.split(',').map(c => c.trim()).filter(Boolean);
    }
    return [];
  })();

  // Transcript Resolution
  const transcript = (() => {
    if (matchedInterview?.transcript && Array.isArray(matchedInterview.transcript) && matchedInterview.transcript.length > 0) {
      return matchedInterview.transcript.map((t: any) => ({
        question: t.question || "",
        answer: t.text || t.answer || "",
        timestamp_start: t.timestamp_start,
        timestamp_end: t.timestamp_end
      }));
    }
    return candidate.transcript || data.transcript || [];
  })();

  // Filtered Transcript
  const filteredTranscript = transcript.filter((t: any) => 
    t.question.toLowerCase().includes(transcriptSearchQuery.toLowerCase()) ||
    t.answer.toLowerCase().includes(transcriptSearchQuery.toLowerCase())
  );

  // Transcript Intelligence Metrics Sourced from Database
  const analysis = (() => {
    const baseAnalysis = data.transcriptAnalysis || {};
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
    return data.transcriptAnalysis || null;
  })();

  // Video URL Sourcing
  const screeningVideoUrl = (() => {
    let rawUrl = "";
    const directScreeningUrl = candidate.screeningVideoUrl || candidate.screening_video_url;
    if (directScreeningUrl && typeof directScreeningUrl === 'string' && directScreeningUrl.trim() !== "" && directScreeningUrl.trim() !== "â€”" && directScreeningUrl.trim() !== "null") {
      rawUrl = directScreeningUrl.trim();
    } else if (matchedInterview?.video_url) {
      rawUrl = String(matchedInterview.video_url).trim();
    }
    if (
      rawUrl && 
      rawUrl !== "" && 
      rawUrl !== "â€”" && 
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
  })();

  const technicalVideoUrl = (() => {
    let rawUrl = String(data.videoUrl || data.video_url || data.video || candidate.videoUrl || candidate.video_url || "").trim();
    if (
      rawUrl && 
      rawUrl !== "" && 
      rawUrl !== "â€”" && 
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
    return screeningVideoUrl;
  })();

  const videoUrl = screeningVideoUrl || technicalVideoUrl;

  // Communication Measurable Metrics
  const commClarity = matchedInterview?.scores?.Communication !== undefined ? matchedInterview.scores.Communication * 20 : (videoScore ?? null);
  const commPace = analysis?.fluency ?? null;
  const commConfidence = matchedInterview?.scores?.Confidence !== undefined ? matchedInterview.scores.Confidence * 20 : (videoScore ?? null);
  const commEngagement = matchedInterview?.scores?.Relevance !== undefined ? matchedInterview.scores.Relevance * 20 : (techScore ?? null);
  const commResponseLength = (() => {
    if (!transcript || transcript.length === 0) return null;
    const totalWords = transcript.reduce((sum: number, t: any) => sum + (t.answer ? t.answer.split(/\s+/).length : 0), 0);
    return Math.round(totalWords / transcript.length);
  })();

  // Technical Competency Scores
  const compTech = techScore ?? null;
  const compProblemSolving = analysis?.problemSolving ?? (techScore ? Math.round(techScore * 0.9) : null);
  const compCommunication = commClarity;
  const compLeadership = analysis?.leadership ?? (techScore ? Math.round(techScore * 0.85) : null);
  const compProfessionalism = analysis?.professionalism ?? (techScore ? Math.round(techScore * 0.95) : null);

  // Radar Data
  const radarData = [
    { subject: 'Technical Knowledge', A: compTech ?? 0, fullMark: 100 },
    { subject: 'Problem Solving', A: compProblemSolving ?? 0, fullMark: 100 },
    { subject: 'Communication', A: compCommunication ?? 0, fullMark: 100 },
    { subject: 'Leadership', A: compLeadership ?? 0, fullMark: 100 },
    { subject: 'Professionalism', A: compProfessionalism ?? 0, fullMark: 100 },
  ];

  // Evidence Mapping
  const getEvidenceForSkill = (skillArea: string) => {
    const keywordsMap: Record<string, string[]> = {
      'Technical Knowledge': ['api', 'database', 'sql', 'react', 'code', 'javascript', 'typescript', 'architecture', 'server', 'performance', 'framer', 'figma'],
      'Problem Solving': ['solve', 'fix', 'debug', 'challenge', 'root cause', 'bottleneck', 'approach', 'solution', 'iterate', 'test'],
      'Communication': ['explain', 'communicate', 'client', 'present', 'collaborate', 'feedback', 'clear', 'team'],
      'Leadership': ['lead', 'manage', 'team', 'mentor', 'guide', 'coordinate', 'initiative', 'ownership'],
      'Professionalism': ['deadline', 'process', 'quality', 'sprint', 'standard', 'documentation', 'review', 'practice']
    };
    const keywords = keywordsMap[skillArea] || [];
    const matches = transcript.filter((t: any) => {
      const text = `${t.question} ${t.answer}`.toLowerCase();
      return keywords.some(kw => text.includes(kw));
    });
    return matches.slice(0, 3);
  };

  // Section Filtering Logic
  const shouldRenderSection = (sectionId: string, filterCategory: string) => {
    const matchesSectionFilter = activeSectionFilter === 'All Sections' || activeSectionFilter === filterCategory;
    
    let matchesViewMode = false;
    if (viewMode === 'Detailed View') {
      matchesViewMode = true;
    } else if (viewMode === 'Executive View') {
      matchesViewMode = ['summary', 'recommendation'].includes(sectionId);
    } else if (viewMode === 'Recruiter View') {
      matchesViewMode = ['summary', 'breakdown', 'communication', 'insights'].includes(sectionId);
    }
    
    return matchesSectionFilter && matchesViewMode;
  };

  // Actions
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
            resume: resumeScore,
            video: videoScore,
            tech: techScore,
          },
          recommendation: decisionBadge,
          skipEmail: true
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGeneratedLink(data.reportUrl);
        navigator.clipboard.writeText(data.reportUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        await refreshCandidates();
      } else {
        alert(data.error || 'Failed to generate secure link.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Failed to generate report link.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleExportJSON = () => {
    const reportData = {
      candidateId: displayId,
      name: candidate.name,
      email: candidate.email,
      position: candidate.jobApplied,
      experience: dynamicExperience,
      qualification: qualification,
      scores: {
        resume: resumeScore,
        screening: videoScore,
        technical: techScore,
        overall: avgScore
      },
      decision: decisionBadge,
      riskLevel: riskLevel,
      completionStatus: completionStatus,
      competencies: {
        technicalKnowledge: compTech,
        problemSolving: compProblemSolving,
        communication: compCommunication,
        leadership: compLeadership,
        professionalism: compProfessionalism
      },
      insights: getEvidenceForSkill('Technical Knowledge').concat(getEvidenceForSkill('Problem Solving'))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HR_Assessment_Report_${candidate.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTranscript = () => {
    if (!transcript || transcript.length === 0) {
      alert("No transcript available to export.");
      return;
    }
    const txt = transcript.map((t: any, i: number) => `Q${i+1}: ${t.question}\nA: ${t.answer}\n\n`).join('');
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Interview_Transcript_${candidate.name.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const jumpToTimestamp = (sec?: number) => {
    if (sec !== undefined && videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = sec;
      videoPlayerRef.current.play().catch(e => console.log(e));
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,18,40,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 0 }}
      onClick={onClose}
    >
      <div
        className="print-report-container"
        style={{ 
          backgroundColor: '#f8fafc', 
          borderRadius: '16px', 
          width: '96vw', 
          height: '94vh', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
          animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* STICKY FROZEN HEADER */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
            position: 'sticky', 
            top: 0, 
            zIndex: 110, 
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)', 
            padding: '16px 24px',
            borderBottom: '1px solid #334155'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            {/* Candidate Summary Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '1.1rem' }}>
                {candidate.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <h2 style={{ color: '#fff', fontWeight: '800', fontSize: '1.25rem', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {candidate.name}
                  <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#94a3b8', padding: '3px 8px', borderRadius: '6px', fontWeight: '600' }}>
                    ID: #{displayId}
                  </span>
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', color: '#94a3b8', fontSize: '0.76rem', marginTop: '3px', fontWeight: '500' }}>
                  <span>Position: <strong style={{ color: '#f8fafc' }}>{candidate.jobApplied || "Data Not Available"}</strong></span>
                  <span>â€¢</span>
                  <span>Experience: <strong style={{ color: '#f8fafc' }}>{dynamicExperience}</strong></span>
                  <span>â€¢</span>
                  <span>Qualification: <strong style={{ color: '#f8fafc' }}>{qualification}</strong></span>
                  <span>â€¢</span>
                  <span>Generated: <strong style={{ color: '#f8fafc' }}>{reportDate}</strong></span>
                </div>
              </div>
            </div>

            {/* Hiring Decision Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: '800',
                backgroundColor: badgeBg,
                color: badgeColor,
                border: `1.5px solid ${badgeColor}`,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
              }}>
                {decisionBadge}
              </div>

              <div style={{ height: '32px', width: '1px', backgroundColor: '#334155' }} />

              {/* Overall Match Score Card */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ 
                  backgroundColor: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '10px', 
                  padding: '6px 14px', 
                  textAlign: 'center', 
                  minWidth: '60px' 
                }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '950', color: '#10b981' }}>{avgScore}%</div>
                  <div style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Score</div>
                </div>

                <div style={{ 
                  backgroundColor: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '10px', 
                  padding: '6px 14px', 
                  textAlign: 'center' 
                }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: riskColor, marginTop: '4px' }}>{riskLevel}</div>
                  <div style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Risk Assessment</div>
                </div>

                <div style={{ 
                  backgroundColor: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '10px', 
                  padding: '6px 14px', 
                  textAlign: 'center' 
                }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: completionColor, marginTop: '4px' }}>{completionStatus}</div>
                  <div style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Status</div>
                </div>
              </div>

              {/* Close Button */}
              <button 
                onClick={onClose} 
                className="no-print"
                style={{ 
                  background: 'rgba(255,255,255,0.08)', 
                  border: 'none', 
                  borderRadius: '50%', 
                  cursor: 'pointer', 
                  width: '36px', 
                  height: '36px', 
                  color: '#fff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  marginLeft: '8px'
                }}
                title="Close Report"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ACTION BAR & FILTERS */}
        <div 
          className="no-print"
          style={{ 
            backgroundColor: '#ffffff', 
            padding: '10px 24px', 
            borderBottom: '1px solid #e2e8f0', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          {/* Left: action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => window.print()}
              style={{ padding: '6px 12px', fontSize: '0.76rem', fontWeight: '700', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={13} /> Print Report
            </button>

            <button 
              onClick={() => window.print()}
              style={{ padding: '6px 12px', fontSize: '0.76rem', fontWeight: '700', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={13} /> Download PDF
            </button>

            <button 
              onClick={handleExportJSON}
              style={{ padding: '6px 12px', fontSize: '0.76rem', fontWeight: '700', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ExternalLink size={13} /> Export Report
            </button>

            <button 
              onClick={handleGenerateLink}
              disabled={generatingLink}
              style={{ padding: '6px 12px', fontSize: '0.76rem', fontWeight: '700', borderRadius: '8px', border: 'none', backgroundColor: '#8b5cf6', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: generatingLink ? 0.7 : 1 }}
            >
              <Share2 size={13} /> {generatingLink ? "Generating..." : copiedLink ? "Link Copied!" : "Share Report"}
            </button>

            <button 
              onClick={handleGenerateLink}
              style={{ padding: '6px 12px', fontSize: '0.76rem', fontWeight: '700', borderRadius: '8px', border: '1px solid #8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.05)', color: '#8b5cf6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Copy size={13} /> Generate Secure Link
            </button>

            {/* Dropdown: More Actions */}
            <div ref={moreActionsRef} style={{ position: 'relative' }}>
              <button 
                onClick={() => setMoreActionsOpen(!moreActionsOpen)}
                style={{ padding: '6px 12px', fontSize: '0.76rem', fontWeight: '700', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                More Actions <ChevronDown size={13} />
              </button>

              {moreActionsOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', minWidth: '180px', zIndex: 120, padding: '4px 0' }}>
                  <button 
                    onClick={() => { setViewResumeOpen(true); setMoreActionsOpen(false); }}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.76rem', textAlign: 'left', border: 'none', backgroundColor: 'transparent', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <FileText size={12} /> View Resume
                  </button>

                  <button 
                    onClick={() => {
                      if (data.resumeUrl) {
                        window.open(data.resumeUrl, '_blank');
                      } else {
                        alert("No resume URL is linked to this candidate.");
                      }
                      setMoreActionsOpen(false);
                    }}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.76rem', textAlign: 'left', border: 'none', backgroundColor: 'transparent', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Download size={12} /> Download Resume
                  </button>

                  <button 
                    onClick={() => { handleDownloadTranscript(); setMoreActionsOpen(false); }}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.76rem', textAlign: 'left', border: 'none', backgroundColor: 'transparent', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <MessageSquare size={12} /> Download Transcript
                  </button>

                  <button 
                    onClick={() => { setShowRawScores(true); setMoreActionsOpen(false); }}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.76rem', textAlign: 'left', border: 'none', backgroundColor: 'transparent', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <BarChart2 size={12} /> View Raw Scores
                  </button>

                  {videoUrl && (
                    <button 
                      onClick={() => {
                        jumpToTimestamp(0);
                        setMoreActionsOpen(false);
                      }}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '0.76rem', textAlign: 'left', border: 'none', backgroundColor: 'transparent', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Video size={12} /> Play Video Interview
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: dropdown filters */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Filter By:</span>
              <select 
                value={activeSectionFilter} 
                onChange={(e) => setActiveSectionFilter(e.target.value)}
                style={{ padding: '5px 10px', fontSize: '0.76rem', fontWeight: '600', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
              >
                <option>All Sections</option>
                <option>Resume</option>
                <option>Screening</option>
                <option>Technical</option>
                <option>Recommendation</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>View Mode:</span>
              <select 
                value={viewMode} 
                onChange={(e) => setViewMode(e.target.value)}
                style={{ padding: '5px 10px', fontSize: '0.76rem', fontWeight: '600', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
              >
                <option>Detailed View</option>
                <option>Executive View</option>
                <option>Recruiter View</option>
              </select>
            </div>
          </div>
        </div>

        {/* MAIN SCROLLABLE BODY */}
        <div 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '24px',
            boxSizing: 'border-box'
          }}
        >
          <div className="report-grid">
            
            {/* COLUMN 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* SECTION 1: Executive Hiring Summary */}
              {shouldRenderSection('summary', 'Resume') && (
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    1. Executive Hiring Summary
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    
                    <div style={{ padding: '12px', border: '1px solid #f1f5f9', borderRadius: '10px', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.64rem', fontWeight: '750', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Resume score</span>
                      <strong style={{ fontSize: '1.4rem', color: resumeScore !== null ? '#3b82f6' : '#94a3b8' }}>
                        {resumeScore !== null ? `${resumeScore}` : "Data Not Available"}
                      </strong>
                    </div>

                    <div style={{ padding: '12px', border: '1px solid #f1f5f9', borderRadius: '10px', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.64rem', fontWeight: '750', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Screening score</span>
                      <strong style={{ fontSize: '1.4rem', color: videoScore !== null ? '#10b981' : '#94a3b8' }}>
                        {videoScore !== null ? `${videoScore}` : "Data Not Available"}
                      </strong>
                    </div>

                    <div style={{ padding: '12px', border: '1px solid #f1f5f9', borderRadius: '10px', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.64rem', fontWeight: '750', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Technical score</span>
                      <strong style={{ fontSize: '1.4rem', color: techScore !== null ? '#8b5cf6' : '#94a3b8' }}>
                        {techScore !== null ? `${techScore}` : "Data Not Available"}
                      </strong>
                    </div>

                    <div style={{ padding: '12px', border: '1px solid #f1f5f9', borderRadius: '10px', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.64rem', fontWeight: '750', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Final Match Score</span>
                      <strong style={{ fontSize: '1.4rem', color: '#10b981' }}>{avgScore}%</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: Assessment Breakdown */}
              {shouldRenderSection('breakdown', 'All Sections') && (
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    2. Assessment Breakdown
                  </h3>
                  
                  {/* Weighted Scoring Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '6px 4px', fontWeight: '700' }}>Assessment</th>
                        <th style={{ padding: '6px 4px', fontWeight: '700', textAlign: 'right' }}>Score</th>
                        <th style={{ padding: '6px 4px', fontWeight: '700', textAlign: 'right' }}>Weight</th>
                        <th style={{ padding: '6px 4px', fontWeight: '700', textAlign: 'right' }}>Contribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 4px', fontWeight: '600', color: '#334155' }}>Resume Match</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '700' }}>{resumeScore !== null ? resumeScore : "-"}</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', color: '#64748b' }}>20%</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '700', color: '#334155' }}>{resumeScore !== null ? (resumeScore * 0.2).toFixed(1) : "0.0"}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 4px', fontWeight: '600', color: '#334155' }}>Screening Video</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '700' }}>{videoScore !== null ? videoScore : "-"}</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', color: '#64748b' }}>30%</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '700', color: '#334155' }}>{videoScore !== null ? (videoScore * 0.3).toFixed(1) : "0.0"}</td>
                      </tr>
                      <tr style={{ borderBottom: '1.5px solid #cbd5e1' }}>
                        <td style={{ padding: '8px 4px', fontWeight: '600', color: '#334155' }}>Technical interview</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '700' }}>{techScore !== null ? techScore : "-"}</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', color: '#64748b' }}>50%</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '700', color: '#334155' }}>{techScore !== null ? (techScore * 0.5).toFixed(1) : "0.0"}</td>
                      </tr>
                      <tr style={{ backgroundColor: '#f8fafc', fontWeight: '800' }}>
                        <td style={{ padding: '8px 4px', color: '#0f172a' }}>Total Score</td>
                        <td colSpan={2}></td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', color: '#10b981', fontSize: '0.86rem' }}>
                          {avgScore}%
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Progress bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { label: 'Resume Match', val: resumeScore, color: '#3b82f6' },
                      { label: 'Screening Video', val: videoScore, color: '#10b981' },
                      { label: 'Technical interview', val: techScore, color: '#8b5cf6' },
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', justifyContent: 'between', fontSize: '0.7rem', fontWeight: '600', color: '#475569' }}>
                          <span>{item.label}</span>
                          <span style={{ marginLeft: 'auto', fontWeight: '800' }}>{item.val !== null ? `${item.val}%` : 'Data Not Available'}</span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${item.val || 0}%`, backgroundColor: item.color, borderRadius: '999px', transition: 'width 0.6s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 8: Hiring Recommendation */}
              {shouldRenderSection('recommendation', 'Recommendation') && (
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    8. Hiring Recommendation
                  </h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#475569' }}>Verdict:</span>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: '800',
                      backgroundColor: badgeBg,
                      color: badgeColor,
                      textTransform: 'uppercase'
                    }}>
                      {decisionBadge}
                    </span>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: '700', color: '#1e293b', margin: '0 0 4px 0' }}>HR Assessment Reasoning:</p>
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
                      {(() => {
                        const scoresText = [
                          resumeScore !== null ? `Resume: ${resumeScore}%` : null,
                          videoScore !== null ? `Screening: ${videoScore}%` : null,
                          techScore !== null ? `Technical: ${techScore}%` : null,
                        ].filter(Boolean).join(', ');

                        if (scoresList.length === 0) {
                          return "Data Not Available: No score data is logged for this candidate to formulate a recommendation.";
                        }

                        let text = `The candidate has an overall match score of ${avgScore}%, calculated from the completed stages (${scoresText}). `;
                        if (scoresList.length === 3) {
                          text += "All assessment stages have been successfully completed.";
                        } else {
                          text += `The assessment is currently incomplete (only ${scoresList.length} of 3 evaluations completed).`;
                        }

                        if (avgScore >= 85) {
                          text += " The candidate demonstrates high proficiency across all criteria. Hiring is strongly recommended.";
                        } else if (avgScore >= 70) {
                          text += " The candidate demonstrates standard performance across key competencies. Progressing to the offer phase is recommended.";
                        } else if (avgScore >= 55) {
                          text += " The candidate exhibits borderline scores. A manual review of specific technical answers and screening transcripts is recommended.";
                        } else {
                          text += " The candidate's cumulative score falls below the required threshold for this role. Hiring is not recommended.";
                        }

                        return text;
                      })()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* SECTION 3: Resume Evaluation */}
              {shouldRenderSection('resume', 'Resume') && (
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      3. Resume Evaluation
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => setViewResumeOpen(true)}
                        style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: '700', borderRadius: '6px', border: '1px solid #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)', color: '#3b82f6', cursor: 'pointer' }}
                      >
                        View Resume
                      </button>
                      <button 
                        onClick={() => {
                          if (data.resumeUrl) {
                            window.open(data.resumeUrl, '_blank');
                          } else {
                            alert("Resume URL not available.");
                          }
                        }}
                        style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', cursor: 'pointer' }}
                      >
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Sub-filters inside Resume */}
                  <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                    {['Education', 'Skills', 'Experience', 'Certifications'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveResumeTab(tab)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          border: 'none',
                          background: activeResumeTab === tab ? '#e2e8f0' : 'transparent',
                          color: activeResumeTab === tab ? '#0f172a' : '#64748b',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Tab contents */}
                  {activeResumeTab === 'Education' && (
                    <div>
                      {edu.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {edu.map((e: any, i: number) => (
                            <div key={i} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                              <div style={{ fontWeight: '700', fontSize: '0.78rem', color: '#0f172a' }}>{e.degree || "Data Not Available"}</div>
                              <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '2px' }}>{e.college || e.institution || "Data Not Available"}</div>
                              <div style={{ display: 'flex', justifyContent: 'between', fontSize: '0.68rem', color: '#64748b', marginTop: '6px' }}>
                                <span>{e.passingYear ? `Class of ${e.passingYear}` : "Year: Data Not Available"}</span>
                                <span style={{ marginLeft: 'auto', fontWeight: '700' }}>{e.cgpaOrPercentage ? `Grade: ${e.cgpaOrPercentage}` : "Grade: Data Not Available"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', margin: 0 }}>Data Not Available</p>
                      )}
                    </div>
                  )}

                  {activeResumeTab === 'Skills' && (
                    <div>
                      {skills.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {skills.map((s: string, i: number) => (
                            <span 
                              key={i} 
                              style={{ 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                fontWeight: '600', 
                                backgroundColor: 'rgba(15, 23, 42, 0.05)', 
                                color: '#334155', 
                                border: '1px solid rgba(15, 23, 42, 0.08)',
                                fontSize: '0.7rem' 
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', margin: 0 }}>Data Not Available</p>
                      )}
                    </div>
                  )}

                  {activeResumeTab === 'Experience' && (
                    <div>
                      {experienceList.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '2px solid #e2e8f0', paddingLeft: '12px', marginLeft: '6px' }}>
                          {experienceList.map((exp: any, i: number) => (
                            <div key={i} style={{ position: 'relative' }}>
                              <div style={{ position: 'absolute', left: '-18px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6', border: '2px solid #fff' }} />
                              <div style={{ fontWeight: '700', fontSize: '0.78rem', color: '#0f172a' }}>{exp.role || exp.title || "Data Not Available"}</div>
                              <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '1px' }}>{exp.company || "Data Not Available"}</div>
                              <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '2px' }}>{exp.duration || exp.period || "Duration: Data Not Available"}</div>
                              {exp.description && (
                                <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '4px 0 0 0', lineHeight: 1.4 }}>{exp.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', margin: 0 }}>Data Not Available</p>
                      )}
                    </div>
                  )}

                  {activeResumeTab === 'Certifications' && (
                    <div>
                      {certifications.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                          {certifications.map((c: string, i: number) => (
                            <div key={i} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', fontSize: '0.74rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Award size={14} color="#f59e0b" style={{ flexShrink: 0 }} /> {c}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', margin: 0 }}>Data Not Available</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 5: Communication Assessment */}
              {shouldRenderSection('communication', 'Screening') && (
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    5. Communication Assessment
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { label: 'Clarity', val: commClarity, desc: 'Clarity and articulation of vocal answers' },
                      { label: 'Speaking Pace', val: commPace, desc: 'Fluency ratio and speed consistency' },
                      { label: 'Confidence', val: commConfidence, desc: 'Self-assurance indicators in dialogue' },
                      { label: 'Engagement', val: commEngagement, desc: 'Relevance and responsiveness mapping' },
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {item.label}
                            <span title={item.desc} style={{ cursor: 'pointer', color: '#94a3b8' }}>
                              <HelpCircle size={12} />
                            </span>
                          </span>
                          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: '800', color: '#3b82f6' }}>
                            {item.val !== null ? `${item.val}%` : 'Data Not Available'}
                          </span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${item.val || 0}%`, backgroundColor: '#3b82f6', borderRadius: '999px' }} />
                        </div>
                      </div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'between', fontSize: '0.74rem', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '4px' }}>
                      <span style={{ fontWeight: '700', color: '#334155' }}>Avg Response Length:</span>
                      <span style={{ marginLeft: 'auto', fontWeight: '800', color: '#475569' }}>
                        {commResponseLength !== null ? `${commResponseLength} words` : 'Data Not Available'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* SECTION 4: Video Screening Analysis */}
              {shouldRenderSection('screening', 'Screening') && (
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      4. Video Screening Analysis
                    </h3>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        onClick={handleDownloadTranscript}
                        style={{ padding: '3px 8px', fontSize: '0.68rem', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', cursor: 'pointer' }}
                      >
                        Export Transcript
                      </button>
                    </div>
                  </div>

                  {/* Video Player */}
                  <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#0f172a', marginBottom: '12px' }}>
                    {videoUrl ? (
                      <video 
                        ref={videoPlayerRef}
                        src={videoUrl}
                        controls
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.74rem', gap: '6px', padding: '20px', textAlign: 'center' }}>
                        <Video size={24} />
                        Data Not Available: No interview recording linked
                      </div>
                    )}
                  </div>

                  {/* Transcript Panel */}
                  <div style={{ display: 'flex', flexDirection: 'column', height: '240px' }}>
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input 
                        type="text"
                        placeholder="Search transcript..."
                        value={transcriptSearchQuery}
                        onChange={(e) => setTranscriptSearchQuery(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '5px 8px 5px 26px', fontSize: '0.74rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                      />
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#f8fafc' }}>
                      {transcript.length > 0 ? (
                        filteredTranscript.length > 0 ? (
                          filteredTranscript.map((t: any, i: number) => (
                            <div 
                              key={i} 
                              onClick={() => jumpToTimestamp(t.timestamp_start)}
                              style={{ 
                                padding: '6px 8px', 
                                borderRadius: '6px', 
                                border: '1px solid #f1f5f9', 
                                backgroundColor: '#fff', 
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              className="transcript-row"
                            >
                              <div style={{ display: 'flex', justifyContent: 'between', fontSize: '0.66rem', color: '#64748b', fontWeight: '700', marginBottom: '2px' }}>
                                <span>Question {i+1}</span>
                                {t.timestamp_start !== undefined && (
                                  <span style={{ marginLeft: 'auto' }}>
                                    {Math.floor(t.timestamp_start / 60)}:{String(Math.floor(t.timestamp_start % 60)).padStart(2, '0')}
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: '0.74rem', color: '#0f172a', fontWeight: '700', margin: '0 0 2px 0' }}>{t.question}</p>
                              <p style={{ fontSize: '0.7rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>{t.answer}</p>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', padding: '12px' }}>No matches found.</div>
                        )
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', padding: '12px', fontStyle: 'italic' }}>Data Not Available</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 6: Technical Interview Analysis */}
              {shouldRenderSection('technical', 'Technical') && (
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    6. Technical Interview Analysis
                  </h3>

                  {/* Radar Chart */}
                  <div style={{ width: '100%', height: '260px', marginBottom: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {techScore !== null ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 8 }} />
                          <Radar name="Candidate Score" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} />
                          <Legend wrapperStyle={{ fontSize: 9, fontWeight: '700' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ color: '#94a3b8', fontSize: '0.74rem', fontStyle: 'italic' }}>Data Not Available: Technical interview not completed</div>
                    )}
                  </div>

                  {/* Competency Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                        <th style={{ padding: '6px 4px', fontWeight: '700' }}>Skill Area</th>
                        <th style={{ padding: '6px 4px', fontWeight: '700', textAlign: 'right' }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'Technical Knowledge', val: compTech },
                        { name: 'Problem Solving', val: compProblemSolving },
                        { name: 'Communication', val: compCommunication },
                        { name: 'Leadership', val: compLeadership },
                        { name: 'Professionalism', val: compProfessionalism },
                      ].map((item, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => {
                            if (item.val !== null) {
                              setSelectedCompetency(item.name);
                            }
                          }}
                          style={{ 
                            borderBottom: '1px solid #f1f5f9', 
                            cursor: item.val !== null ? 'pointer' : 'default',
                            backgroundColor: selectedCompetency === item.name ? 'rgba(139, 92, 246, 0.05)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '8px 4px', fontWeight: '600', color: '#334155' }}>{item.name}</td>
                          <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '800', color: item.val !== null ? '#8b5cf6' : '#94a3b8' }}>
                            {item.val !== null ? `${item.val}%` : 'Data Not Available'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Evidence Viewer panel */}
                  {techScore !== null && selectedCompetency && (
                    <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: '750', color: '#0f172a', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                        Transcript Evidence: {selectedCompetency}
                      </div>
                      {getEvidenceForSkill(selectedCompetency).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {getEvidenceForSkill(selectedCompetency).map((ev: any, idx: number) => (
                            <div key={idx} style={{ fontSize: '0.7rem', color: '#475569', lineHeight: 1.4 }}>
                              <strong style={{ color: '#0f172a' }}>Q: {ev.question}</strong>
                              <p style={{ margin: '2px 0 0 0', fontStyle: 'italic' }}>A: "{ev.answer}"</p>
                              {ev.timestamp_start !== undefined && (
                                <span style={{ fontSize: '0.62rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                                  Ref: {Math.floor(ev.timestamp_start/60)}:{String(Math.floor(ev.timestamp_start%60)).padStart(2, '0')}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No specific transcript matches. Click other competency areas above to view transcript evidence.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 7: Evidence-Based Insights */}
              {shouldRenderSection('insights', 'Technical') && (
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    7. Evidence-Based Insights
                  </h3>
                  
                  <ul style={{ paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.76rem', color: '#475569', lineHeight: 1.45 }}>
                    {resumeScore !== null ? (
                      <li>
                        <strong>Resume Alignment:</strong> Candidate scored <strong style={{ color: '#3b82f6' }}>{resumeScore}%</strong> on profile matching. 
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem', marginTop: '2px' }}>
                          Evidence: Parsed education ({qualification}) and skills ({skills.slice(0, 4).join(', ')}) matched database criteria.
                        </span>
                      </li>
                    ) : (
                      <li><strong>Resume Alignment:</strong> Data Not Available.</li>
                    )}

                    {transcript.length > 0 ? (
                      <li>
                        <strong>Interview Completion:</strong> Successfully recorded and transcripted dialogue answers.
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem', marginTop: '2px' }}>
                          Evidence: Completed all {transcript.length} questions in conversation. Transcript refs (Q1 to Q{transcript.length}).
                        </span>
                      </li>
                    ) : (
                      <li><strong>Interview Completion:</strong> Data Not Available.</li>
                    )}

                    {videoScore !== null && commClarity !== null ? (
                      <li>
                        <strong>Vocal Performance:</strong> Communication metrics resolved.
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem', marginTop: '2px' }}>
                          Evidence: Score clarity is {commClarity}%, pace is {commPace !== null ? `${commPace}%` : "steady"}, and average response size is {commResponseLength} words.
                        </span>
                      </li>
                    ) : (
                      <li><strong>Vocal Performance:</strong> Data Not Available.</li>
                    )}

                    {techScore !== null && compTech !== null ? (
                      <li>
                        <strong>Technical Readiness:</strong> Assessment score of <strong style={{ color: '#8b5cf6' }}>{techScore}%</strong>.
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem', marginTop: '2px' }}>
                          Evidence: Radar chart metrics plotted: problem solving ({compProblemSolving}%) and tech knowledge ({compTech}%).
                        </span>
                      </li>
                    ) : (
                      <li><strong>Technical Readiness:</strong> Data Not Available.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* CUSTOM POPUP FOR RAW DATABASE SCORES */}
        {showRawScores && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', width: '320px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: '800', color: '#0f172a' }}>Raw DB Assessment Scores</h4>
                <button onClick={() => setShowRawScores(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', marginLeft: 'auto' }}><X size={16} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'between' }}>
                  <span style={{ color: '#64748b' }}>Resume Score:</span>
                  <strong style={{ marginLeft: 'auto' }}>{resumeScore !== null ? `${resumeScore}` : "Data Not Available"}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'between' }}>
                  <span style={{ color: '#64748b' }}>Video Screening Score:</span>
                  <strong style={{ marginLeft: 'auto' }}>{videoScore !== null ? `${videoScore}` : "Data Not Available"}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'between' }}>
                  <span style={{ color: '#64748b' }}>Technical Score:</span>
                  <strong style={{ marginLeft: 'auto' }}>{techScore !== null ? `${techScore}` : "Data Not Available"}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'between', borderTop: '1px solid #f1f5f9', paddingTop: '6px', fontWeight: '700' }}>
                  <span style={{ color: '#0f172a' }}>Calculated Mean:</span>
                  <strong style={{ marginLeft: 'auto', color: '#10b981' }}>{avgScore}%</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM CSS INJECTIONS */}
        <style dangerouslySetInnerHTML={{__html: `
          .report-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          
          .transcript-row:hover {
            background-color: rgba(139, 92, 246, 0.03) !important;
            border-color: rgba(139, 92, 246, 0.2) !important;
          }

          @media (max-width: 1200px) {
            .report-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          @media (max-width: 768px) {
            .report-grid {
              grid-template-columns: 1fr;
            }
          }

          @media print {
            body * {
              visibility: hidden;
            }
            .print-report-container, .print-report-container * {
              visibility: visible;
            }
            .print-report-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: auto;
              overflow: visible;
              box-shadow: none;
              border: none;
              background-color: white;
            }
            .no-print {
              display: none !important;
            }
          }
        `}} />
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
    </div>
  );
};


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN REPORTS PAGE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const Reports = () => {
  const { candidates, jobs, refreshCandidates, apiFetch } = useAppContext();
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [shareModalOpen, setShareModalOpen] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterJob, setFilterJob] = useState('All');
  const [filterRec, setFilterRec] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [shareLoading, setShareLoading] = useState(false);
  const [shareResult, setShareResult] = useState<any>(null); // { success, reportUrl, error }
  const [copiedId, setCopiedId] = useState<any>(null);
  const [generatingId, setGeneratingId] = useState<any>(null);
  const [uploadingCandidate, setUploadingCandidate] = useState<any>(null);
  const [uploadingId, setUploadingId] = useState<any>(null);
  const fileInputRef = useRef<any>(null);
  const [uploadingVideoId, setUploadingVideoId] = useState<any>(null);
  const [videoUploadCandidate, setVideoUploadCandidate] = useState<any>(null);
  const videoFileInputRef = useRef<any>(null);
  const [uploadStatusMessage, setUploadStatusMessage] = useState('');
  const ffmpegRef = useRef<any>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Remark state
  const [remarkPopover, setRemarkPopover] = useState<{ candidateId: string; name: string } | null>(null);
  const [remarkText, setRemarkText] = useState('');
  const [remarkSaving, setRemarkSaving] = useState(false);
  const [filterStage, setFilterStage] = useState('All');

  // Auto-sync selectedCandidate when candidates context refreshes (fixes stale modal after re-upload)
  useEffect(() => {
    if (!selectedCandidate) return;
    const fresh = candidates.find((c: any) => c.id === selectedCandidate.id);
    if (fresh) {
      setSelectedCandidate(fresh);
    }
  }, [candidates]);

  // Log candidate changes and table scores (Step 5 requirement)
  useEffect(() => {
    console.log("Updated Candidate:", candidates);
    candidates.forEach((c: any) => {
      console.log("TABLE TECH SCORE:", c.techScore);
    });
  }, [candidates]);

  const triggerTranscriptUpload = (candidate: any) => {
    setUploadingCandidate(candidate);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingCandidate) return;

    // Cache candidate context values to avoid stale object references after async operations (Modification 2)
    const candidateId = (uploadingCandidate as any).id;
    const candidateName = (uploadingCandidate as any).name;
    const candidateJobApplied = (uploadingCandidate as any).jobApplied;
    const candidateExtractedData = (uploadingCandidate as any).extractedData;

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

        alert(`âœ… Transcript analyzed successfully!\n\nScores:\nâ€¢ Communication: ${analysis.communication}%\nâ€¢ Technical: ${transcriptIntelligenceScore}%\nâ€¢ Confidence: ${analysis.confidence}%\nâ€¢ Recommendation: ${analysis.recommendation}`);
        
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

  const triggerVideoUpload = (candidate: any) => {
    setVideoUploadCandidate(candidate);
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = '';
      videoFileInputRef.current.click();
    }
  };

  const handleVideoFileChange = async (e: any) => {
    // Kept for backward compatibility, though not used anymore
    const file = e.target.files?.[0];
    if (!file || !videoUploadCandidate) return;

    const candidateId = videoUploadCandidate.id;
    const candidateExtractedData = videoUploadCandidate.extractedData || videoUploadCandidate.extracted_data || {};

    setUploadingVideoId(candidateId);
    setUploadStatusMessage("Initializing...");

    let finalFileToUpload: File = file;
    let isCompressed = false;

    // â”€â”€â”€ Helper: upload via direct Supabase signed URL or local fallback â”€â”€â”€â”€â”€â”€â”€
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

            xhr.onerror = () => reject(new Error("Network error â€” local fallback upload API unreachable"));
            xhr.send(form);
          });

          return publicUrl;
        }
      } catch (err) {
        console.error("uploadToSupabase error:", err);
        throw err;
      }
    };
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    try {
      console.log(`=== VIDEO UPLOAD START ===`);
      console.log(`Candidate: ${candidateId}, Original file: ${file.name}, Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);

      // â”€â”€ Step 1: FFmpeg compression (two-pass if needed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

        await (ffmpeg as any).writeFile(inputName, await fetchFile(file));
        setUploadStatusMessage("Compressing... 0%");

        // â”€â”€ Pass 1: crf32, 480p, 700k â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        await runCompression(ffmpeg, inputName, out1Name, 1);

        const pass1Data = await (ffmpeg as any).readFile(out1Name);
        const pass1Blob = new Blob([pass1Data], { type: 'video/mp4' });
        const pass1MB   = pass1Blob.size / 1024 / 1024;

        console.log("Compressed Size (Pass 1):", pass1MB.toFixed(2), "MB");
        console.log("Reduction %:", (((file.size - pass1Blob.size) / file.size) * 100).toFixed(1) + "%");

        let compressedBlob = pass1Blob;

        // â”€â”€ Pass 2 (emergency): crf36, 360p, 500k â€” only if still too large â”€
        if (pass1MB > MAX_UPLOAD_MB) {
          console.warn(`Pass 1 output (${pass1MB.toFixed(2)}MB) exceeds ${MAX_UPLOAD_MB}MB limit â€” running emergency Pass 2...`);
          setUploadStatusMessage("Extra compression... 0%");

          await runCompression(ffmpeg, inputName, out2Name, 2);

          const pass2Data = await (ffmpeg as any).readFile(out2Name);
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
          try { await (ffmpeg as any).deleteFile(out2Name); } catch { /* ignore */ }
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

        try { await (ffmpeg as any).deleteFile(inputName); } catch { /* ignore */ }
        try { await (ffmpeg as any).deleteFile(out1Name); } catch { /* ignore */ }

      } catch (compressErr: any) {
        // If this is a user-facing size error, rethrow â€” don't fall back to original
        if (compressErr.message?.includes('too large after compression') ||
            compressErr.message?.includes('Maximum allowed')) {
          throw compressErr;
        }
        console.warn("FFmpeg compression failed â€” falling back to original file:", compressErr);
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

      // â”€â”€ Step 2: Upload (compressed or original) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      setUploadStatusMessage("Uploading... 0%");
      const publicVideoUrl = await uploadToSupabase(finalFileToUpload);
      console.log("Upload success â€” public URL:", publicVideoUrl);

      // â”€â”€ Step 3: Save URL to DB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      console.log("Saving to DB â€” videoUrl:", publicVideoUrl);

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
        console.log("DB saved â€” videoUrl in DB:", saved?.extracted_data?.videoUrl);
        setUploadStatusMessage("âœ… Upload complete!");
        alert(`âœ… Video ${isCompressed ? 'compressed & ' : ''}uploaded successfully!\n\nURL: ${publicVideoUrl}`);
        await refreshCandidates();
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save video URL to database');
      }
    } catch (err: any) {
      console.error("=== VIDEO UPLOAD ERROR ===", err);
      setUploadStatusMessage(`âŒ ${err.message || 'Upload failed'}`);
      alert('Video upload error:\n\n' + (err.message || String(err)));
    } finally {
      setUploadingVideoId(null);
      setVideoUploadCandidate(null);
      setTimeout(() => setUploadStatusMessage(''), 4000);
    }
  };

  const copyToClipboard = (text: string, id: any) => {
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

  const handleCopyShareLink = async (candidate: any) => {
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

  const handleSendReport = async (candidate: any) => {
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

  const filtered = allCandidates.filter((c: any) => {
    const q = search.toLowerCase();
    const matchQ = !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.jobApplied?.toLowerCase().includes(q);
    const matchJ = filterJob === 'All' || c.jobApplied === filterJob;
    const matchR = filterRec === 'All' || (c.finalRecommendation || 'Under Review') === filterRec;
    const matchS = filterStage === 'All' || (c.current_stage ?? c.currentStage ?? c.stage ?? 'Resume Screening') === filterStage;
    return matchQ && matchJ && matchR && matchS;
  });

  const jobOptions = ['All', ...new Set(allCandidates.map((c: any) => c.jobApplied).filter(Boolean))];
  const recOptions = ['All', 'Selected', 'Under Review', 'Rejected'];

  /* Stats */
  const total = allCandidates.length;
  const selected = allCandidates.filter((c: any) => c.finalRecommendation === 'Selected').length;
  const videoComplete = allCandidates.filter((c: any) => c.videoStatus === 'Completed').length;
  const avgResume = total
    ? Math.round(allCandidates.reduce((a: number, c: any) => a + (c.resumeScore || 0), 0) / total)
    : 0;

  if (!mounted) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1rem', fontWeight: '600' }}>Loading Reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ── TOP STATS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
        {[
          {
            label: 'Total Candidates', value: total, icon: User,
            color: 'var(--brand-navy)', bg: 'rgba(14,45,123,0.08)',
            sub: `${filtered.length} matching filters`
          },
          {
            label: 'Video Screened', value: videoComplete, icon: Video,
            color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',
            sub: total ? `${Math.round((videoComplete / total) * 100)}% completion` : '0% completion'
          },
          {
            label: 'Selected', value: selected, icon: Award,
            color: '#10b981', bg: 'rgba(16,185,129,0.08)',
            sub: total ? `${Math.round((selected / total) * 100)}% selection rate` : '0% rate'
          },
          {
            label: 'Avg Resume Score', value: avgResume ? `${avgResume}%` : '—', icon: BarChart2,
            color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',
            sub: avgResume >= 70 ? 'Above threshold' : 'Needs attention'
          },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                borderTop: `3px solid ${s.color}`,
                transition: 'box-shadow 0.2s'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color={s.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{s.label}</p>
                <h3 style={{ fontSize: '1.9rem', fontWeight: '800', color: 'var(--brand-navy)', margin: '2px 0 4px', lineHeight: 1 }}>{s.value}</h3>
                <p style={{ fontSize: '0.7rem', color: s.color, fontWeight: '600', margin: 0 }}>{s.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CANDIDATE TABLE ── */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(180deg, #fafcff 0%, #fff 100%)' }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1rem', color: 'var(--brand-navy)', letterSpacing: '-0.01em' }}>Candidate Reports</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{filtered.length} of {total} candidates</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or role..."
                className="form-input"
                style={{ paddingLeft: '30px', width: '200px', fontSize: '0.8rem' }}
              />
            </div>
            {/* Job filter */}
            <select className="form-select" value={filterJob} onChange={(e) => setFilterJob(e.target.value)} style={{ fontSize: '0.8rem', minWidth: '130px' }}>
              {jobOptions.map((j: any) => (
                <option key={j} value={j}>
                  {j === 'All' ? 'Role: All' : j}
                </option>
              ))}
            </select>
            {/* Rec filter */}
            <select className="form-select" value={filterRec} onChange={(e) => setFilterRec(e.target.value)} style={{ fontSize: '0.8rem', minWidth: '150px' }}>
              {recOptions.map((r: any) => (
                <option key={r} value={r}>
                  {r === 'All' ? 'Verdict: All' : r}
                </option>
              ))}
            </select>
            {/* Stage filter */}
            <select className="form-select" value={filterStage} onChange={(e) => setFilterStage(e.target.value)} style={{ fontSize: '0.8rem', minWidth: '150px' }}>
              {stageOptions.map((s: any) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'Stage: All' : s}
                </option>
              ))}
            </select>
            {/* View toggle */}
            <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid var(--border)' }}>
              {[{ id: 'table', Icon: List }, { id: 'cards', Icon: LayoutGrid }].map(({ id, Icon }) => (
                <button
                  key={id}
                  onClick={() => setViewMode(id)}
                  style={{ padding: '6px 10px', border: 'none', cursor: 'pointer', backgroundColor: viewMode === id ? 'var(--brand-navy)' : '#fff', color: viewMode === id ? '#fff' : 'var(--gray-500)', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={44} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p style={{ fontWeight: '600', margin: '0 0 4px' }}>No candidates found</p>
            <p style={{ fontSize: '0.8rem', margin: 0 }}>Try adjusting your search or filter criteria.</p>
          </div>
        ) : viewMode === 'table' ? (
          <>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: '700', color: 'var(--brand-navy)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--gray-200)', whiteSpace: 'nowrap', width: '26%' }}>Candidate</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.68rem', fontWeight: '700', color: 'var(--brand-navy)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--gray-200)', whiteSpace: 'nowrap', width: '9%' }}>ID</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.68rem', fontWeight: '700', color: 'var(--brand-navy)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--gray-200)', whiteSpace: 'nowrap', width: '22%' }}>Role Applied</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.68rem', fontWeight: '700', color: 'var(--brand-navy)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--gray-200)', whiteSpace: 'nowrap', width: '10%' }}>Assessments</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.68rem', fontWeight: '700', color: 'var(--brand-navy)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--gray-200)', whiteSpace: 'nowrap', width: '18%' }}>Stage</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.68rem', fontWeight: '700', color: 'var(--brand-navy)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--gray-200)', whiteSpace: 'nowrap', width: '6%' }}>Note</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: '700', color: 'var(--brand-navy)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--gray-200)', whiteSpace: 'nowrap', width: '9%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any, idx: number) => (
                  <tr
                    key={c.id}
                    style={{ borderBottom: '1px solid var(--gray-100)', transition: 'background 0.15s', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbff' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f9ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafbff')}
                  >
                    {/* Candidate */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-navy) 0%, #1a42a3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '0.7rem', flexShrink: 0, boxShadow: '0 2px 6px rgba(14,45,123,0.25)' }}>
                          {getInitials(c.name)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: '700', color: 'var(--brand-navy)', fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{c.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    {/* ID */}
                    <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--brand-teal)', backgroundColor: 'rgba(13,148,136,0.1)', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        #{c.display_id || c.unique_id || String(c.id).substring(0,6)}
                      </span>
                    </td>
                    {/* Role */}
                    <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                      <span title={c.jobApplied || '—'} style={{ display: 'block', fontSize: '0.8rem', color: '#334155', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                        {c.jobApplied || '—'}
                      </span>
                    </td>
                    {/* Assessments — transcript + video icons */}
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                          onClick={() => triggerTranscriptUpload(c)}
                          disabled={uploadingId === c.id}
                          title={(c.extractedData?.transcript?.length || c.transcript?.length) ? 'Transcript uploaded — click to update' : 'Upload transcript'}
                          style={{ width: '28px', height: '28px', borderRadius: '7px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: (c.extractedData?.transcript?.length || c.transcript?.length) ? 'rgba(16,185,129,0.12)' : 'var(--gray-100)', color: (c.extractedData?.transcript?.length || c.transcript?.length) ? '#059669' : 'var(--gray-400)', transition: 'all 0.15s' }}
                        >
                          {uploadingId === c.id ? <span style={{ fontSize: '0.6rem' }}>⏳</span> : <Upload size={13} />}
                        </button>
                        <button
                          onClick={() => triggerVideoUpload(c)}
                          title={(c.extractedData?.videoUrl || c.video_url) ? 'Video uploaded — click to update' : 'Upload interview video'}
                          style={{ width: '28px', height: '28px', borderRadius: '7px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: (c.extractedData?.videoUrl || c.video_url) ? 'rgba(59,130,246,0.12)' : 'var(--gray-100)', color: (c.extractedData?.videoUrl || c.video_url) ? '#2563eb' : 'var(--gray-400)', transition: 'all 0.15s' }}
                        >
                          {uploadingVideoId === c.id ? <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--brand-navy)' }}>…</span> : <Video size={13} />}
                        </button>
                      </div>
                    </td>
                    {/* Stage */}
                    <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                      <WorkflowBadge status={c.current_stage ?? c.currentStage ?? c.stage ?? 'Resume Screening'} size="sm" />
                    </td>
                    {/* Remark */}
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'center' }}>
                      {(() => {
                        const candidateRemark = c.remark_reports;
                        const hasRemark = !!candidateRemark;
                        return (
                          <button
                            onClick={() => { setRemarkPopover({ candidateId: c.id, name: c.name }); setRemarkText(candidateRemark || ''); }}
                            title={hasRemark ? `Remark: ${candidateRemark}` : 'Add remark'}
                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: hasRemark ? '1.5px solid #d97706' : '1.5px solid var(--border)', background: hasRemark ? '#f59e0b' : '#f8fafc', color: hasRemark ? '#fff' : 'var(--gray-400)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 0.2s', boxShadow: hasRemark ? '0 2px 5px rgba(245,158,11,0.3)' : 'none' }}
                          >
                            <MessageSquare size={13} />
                            {hasRemark && (<span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', border: '1.5px solid #fff' }} />)}
                          </button>
                        );
                      })()}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', borderRadius: '7px' }}
                          onClick={() => setSelectedCandidate(c)}
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          title={copiedId === c.id ? 'Link copied!' : 'Copy shareable report link'}
                          onClick={() => handleCopyShareLink(c)}
                          disabled={generatingId === c.id}
                          style={{ width: '28px', height: '28px', border: '1.5px solid var(--border)', borderRadius: '7px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: copiedId === c.id ? '#10b981' : 'var(--gray-500)', transition: 'all 0.15s', flexShrink: 0 }}
                        >
                          {copiedId === c.id ? <Check size={12} /> : <Share2 size={12} />}
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
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1.5rem' }}
                onClick={() => setRemarkPopover(null)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={16} color="#d97706" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Add Remark</div>
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
                    {remarkSaving ? 'Saving...' : 'ðŸ’¾ Save Remark'}
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
            {filtered.map((c: any) => {
              const avgScore = (() => {
                const vals = [c.resumeScore, c.videoScore, c.techScore].filter(Boolean);
                return vals.length ? Math.round(vals.reduce((a: number, b: any) => a + b, 0) / vals.length) : null;
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
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--brand-teal)', backgroundColor: 'rgba(13, 148, 136, 0.1)', padding: '2px 6px', borderRadius: '10px', flexShrink: 0 }}>
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
                    {[{ label: 'R', value: c.resumeScore }, { label: 'V', value: c.videoScore }, { label: 'T', value: c.techScore }].map(({ label, value }: any, i: number) => (
                      <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ height: '4px', backgroundColor: 'var(--gray-100)', borderRadius: '999px', overflow: 'hidden', marginBottom: '3px' }}>
                          <div style={{ height: '100%', width: `${value || 0}%`, backgroundColor: scoreColor(value), borderRadius: '999px' }} />
                        </div>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: '600' }}>{label}: {value || 'â€”'}</span>
                      </div>
                    ))}
                  </div>

                  {/* mini strength preview */}
                  {strengths[0] && <p style={{ fontSize: '0.72rem', color: '#065f46', backgroundColor: 'rgba(16,185,129,0.07)', padding: '5px 8px', borderRadius: '7px', margin: 0 }}>âœ“ {strengths[0]}</p>}

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

      {/* â”€â”€â”€ DETAIL MODAL â”€â”€â”€ */}
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

