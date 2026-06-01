import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { CheckCircle, Clock, X, BookOpen, Code2, Target, Briefcase, TrendingUp, TrendingDown, Award, AlertCircle, Lock, MessageSquare, Eye, FileText, Video, Activity } from "lucide-react";
import React from 'react';
import { ResumeViewButton } from "@/components/ResumeViewButton";
import { ResumeParsedBox } from "@/components/ResumeParsedBox";
import { ReportDashboardGrid } from "@/components/ReportDashboardGrid";
import { analyzeTranscript } from "@/utils/transcriptAnalyzer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getServiceSupabase();

  const { data: candidates } = await supabase
    .from("candidates")
    .select("name, job_applied, extracted_data");

  const candidate = candidates?.find(
    (c: any) => c.extracted_data?._reportShareToken === token
  );

  if (!candidate) return { title: "Interview Report — KadelLabs" };
  return {
    title: `${candidate.name} — ${candidate.job_applied} | KadelLabs Report`,
    description: `Interview evaluation report for ${candidate.name} applying for ${candidate.job_applied}`,
    robots: "noindex, nofollow",
  };
}

const scoreColor = (v: any) => {
  if (!v) return 'var(--gray-400)';
  if (v >= 85) return '#10b981';
  if (v >= 70) return '#3b82f6';
  if (v >= 55) return '#f59e0b';
  return '#ef4444';
};

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

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

/* ──────────────── Horizontal bar chart ─────────────────────────── */
const BarChart = ({ data = [], color = '#3b82f6' }: any) => {
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

/* ──────────────── Skill Match Visual ─────────────────────────── */
const SkillMatch = ({ jobSkills = [], candidateSkills = [] }: any) => {
  const norm = (s: string) => s.trim().toLowerCase();
  const cSet = new Set(candidateSkills.map(norm));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {jobSkills.length === 0
        ? <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No required skills defined for this role.</span>
        : jobSkills.map((skill: string, i: number) => {
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
const TranscriptAnalysis = ({ transcript = [] }: any) => {
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

export default async function CandidateReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getServiceSupabase();

  const { data: allCandidates, error } = await supabase
    .from("candidates")
    .select("*");

  const candidate = allCandidates?.find(
    (c: any) => c.extracted_data?._reportShareToken === token
  );

  if (error || !candidate) {
    notFound();
  }

  // Load completed interview matching by candidate email or name
  let matchedInterview = null;
  const candidateEmail = (candidate.email || candidate.extracted_data?.personalInformation?.email || "").trim().toLowerCase();
  const cleanName = (n: string) => (n || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  const candName = cleanName(candidate.name || "");
  
  const { data: interviews } = await supabase
    .from("interviews")
    .select("*")
    .eq("status", "completed");
    
  if (interviews && interviews.length > 0) {
    const match = interviews.find((i: any) => {
      const matchesEmail = candidateEmail && (i.candidate_email || "").trim().toLowerCase() === candidateEmail;
      const matchesName = candName && cleanName(i.candidate_name || "") === candName;
      return matchesEmail || matchesName;
    });
    if (match) {
      matchedInterview = match;
    }
  }

  // Check expiry stored inside extracted_data
  const expiresAt = candidate.extracted_data?._reportShareExpiresAt;
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F4F7F6" }}>
        <div style={{ textAlign: "center", padding: "3rem", maxWidth: "400px" }}>
          <Lock size={48} color="#94a3b8" style={{ margin: "0 auto 1rem" }} />
          <h2 style={{ color: "#0E2D7B", fontWeight: "800", marginBottom: "0.5rem" }}>Report Link Expired</h2>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>This report link has expired. Please contact the hiring team for a new link.</p>
        </div>
      </div>
    );
  }

  // Fetch jobs to get required skills
  const { data: rawJobs } = await supabase
    .from("jobs")
    .select("*");

  const jobs = (rawJobs || []).map((j: any) => ({
    ...j,
    required_skills: j.required_skills || j.skills || []
  }));

  const mappedCandidate = {
    ...candidate,
    jobApplied: candidate.job_applied,
    resumeStatus: candidate.resume_status,
    formStatus: candidate.form_status,
    videoStatus: candidate.video_status,
    techStatus: candidate.tech_status,
    reportStatus: candidate.report_status,
    resumeScore: candidate.resume_score,
    videoScore: candidate.video_score,
    techScore: candidate.tech_score,
    finalRecommendation: candidate.final_recommendation,
    extractedData: candidate.extracted_data
  };

  const data = mappedCandidate.extractedData || {};

  // Bug 1: Experience always static
  const dynamicExperience = (() => {
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
  })();
  const skills = mappedCandidate.skills || [];
  const edu = data.educationDetails || [];
  const projs = data.projectAnalysis || [];
  // Use DB Whisper transcript if available, fallback to candidate transcript
  const transcript = (matchedInterview?.transcript && Array.isArray(matchedInterview.transcript) && matchedInterview.transcript.length > 0)
    ? matchedInterview.transcript.map((t: any) => ({
        question: t.question || "",
        answer: t.text || t.answer || "",
        timestamp_start: t.timestamp_start,
        timestamp_end: t.timestamp_end
      }))
    : (mappedCandidate.transcript || data.transcript || []);

  const { strengths, weaknesses } = deriveStrengthsWeaknesses(mappedCandidate);

  // Use stored analysis from DB if available, fall back to live computation
  const storedAnalysis = data.transcriptAnalysis || null;
  const liveAnalysis = analyzeTranscript(transcript);
  const analysis = (storedAnalysis && storedAnalysis.recommendation && typeof storedAnalysis.communication === 'number')
    ? { ...liveAnalysis, ...storedAnalysis }
    : liveAnalysis;

  // Compute scores perfectly consistent with the real database records
  const resolvedScores = (() => {
    const s = matchedInterview?.scores || {};
    const resumeScoreVal = mappedCandidate.resumeScore || 0;
    const videoScoreVal = mappedCandidate.videoScore || 0;
    const techScoreVal = mappedCandidate.techScore || 0;
    const recLabelVal = mappedCandidate.finalRecommendation || 'Under Review';

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
  })();

  const commScore = resolvedScores.commScore;
  const confLabel = resolvedScores.confLabel;
  const recLabel = resolvedScores.recLabel;
  const avgScore = resolvedScores.avgScore;

  const matchedJob = jobs.find((j: any) => j.title === mappedCandidate.jobApplied);
  const jobSkills = matchedJob?.required_skills || matchedJob?.skills || [];

  const NEXT_JS_URL = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

  return (
    <div style={{ height: "100vh", overflow: "hidden", backgroundColor: "#f8fafc", fontFamily: "'Inter', -apple-system, sans-serif", display: 'flex', flexDirection: 'column' }}>
      
      {/* Modal Header Container */}
      <div style={{ background: 'linear-gradient(135deg, #0B2C82 0%, #07256B 100%)', flexShrink: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Top Header Section */}
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          
          {/* LEFT SECTION: Avatar & Candidate Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '1.2rem', flexShrink: 0 }}>
              {getInitials(mappedCandidate.name)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: '800', fontSize: '1.3rem', margin: 0, letterSpacing: '-0.02em' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--brand-green)', backgroundColor: 'rgba(125, 186, 0, 0.1)', padding: '4px 8px', borderRadius: '12px', border: '1px solid rgba(125, 186, 0, 0.2)' }}>
                  #{mappedCandidate.display_id || mappedCandidate.unique_id || String(mappedCandidate.id).substring(0,6)}
                </span>
                {mappedCandidate.name}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', margin: 0, fontWeight: '500' }}>
                {mappedCandidate.jobApplied} • {dynamicExperience === "Fresher" ? "Fresher" : dynamicExperience} {mappedCandidate.extractedData?.educationDetails?.[0]?.degree ? `• ${mappedCandidate.extractedData.educationDetails[0].degree}` : '• MCA'}
              </p>
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

          {/* RIGHT SECTION: Logo & Read-only Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src="/kadellabs-logo.png" 
                alt="Company Logo" 
                style={{ height: '48px', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }} 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: '600', background: 'rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: '8px' }}>
              <Lock size={12} />
              Read-only
            </div>
          </div>
        </div>

      </div>

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .zoom-box {
          position: relative;
          overflow: hidden !important;
          border: 1px solid var(--border);
          border-radius: 20px;
          background-color: #fff;
        }
        .zoom-box, .zoom-box *, .zoom-box::-webkit-scrollbar, .zoom-box *::-webkit-scrollbar {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .zoom-box::-webkit-scrollbar, .zoom-box *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .ti-scroll::-webkit-scrollbar { display: none; }
      `}} />

      {/* Body: fixed grid at top, intelligence scrollable below */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Main 3-column grid — no scroll */}
        <div style={{ flex: 1, display: 'flex', gap: '1.5rem', padding: '1.5rem 2rem 1.5rem', backgroundColor: '#f8fafc', maxWidth: '1440px', margin: '0 auto', width: '100%', overflow: 'hidden' }}>
          <ReportDashboardGrid candidate={mappedCandidate} NEXT_JS_URL={NEXT_JS_URL} matchedInterviewFromDb={matchedInterview} />
        </div>

      </div>

    </div>
  );
}
