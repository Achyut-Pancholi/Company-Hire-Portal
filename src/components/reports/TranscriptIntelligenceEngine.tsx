"use client";

import React, { useMemo, useState } from 'react';
import {
  Brain, MessageSquare, TrendingUp, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, Lightbulb, Target, Star, Zap, Award,
  Activity, Users, Shield, BarChart2
} from 'lucide-react';
import { analyzeTranscript, TranscriptEntry, TranscriptAnalysisResult } from '@/utils/transcriptAnalyzer';
import { StructuredAnalysisView } from '@/components/StructuredAnalysisView';

/* ─────────────────── SVG Radar Chart ─────────────────────────── */
const RadarChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const size = 380; // Increased size to make it clearly visible in View More
  const cx = size / 2;
  const cy = size / 2;
  const radius = 80;
  const n = data.length;

  const getPoint = (index: number, r: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];

  const polygonPoints = data
    .map((d, i) => {
      const r = (Math.max(0, Math.min(100, d.value)) / 100) * radius;
      const p = getPoint(i, r);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Grid rings */}
      {gridLevels.map((level, li) => {
        const pts = data.map((_, i) => {
          const p = getPoint(i, radius * level);
          return `${p.x},${p.y}`;
        }).join(' ');
        return (
          <polygon
            key={li}
            points={pts}
            fill="none"
            stroke="rgba(14,45,123,0.12)"
            strokeWidth={li === gridLevels.length - 1 ? 1.5 : 1}
          />
        );
      })}

      {/* Axis lines */}
      {data.map((_, i) => {
        const outer = getPoint(i, radius);
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={outer.x} y2={outer.y}
            stroke="rgba(14,45,123,0.12)"
            strokeWidth={1}
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={polygonPoints}
        fill="rgba(14,45,123,0.12)"
        stroke="var(--brand-navy)"
        strokeWidth={2.2}
        strokeLinejoin="round"
      />

      {/* Dots */}
      {data.map((d, i) => {
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

      {/* Invisible interactive hover targets */}
      {data.map((d, i) => {
        const r = (Math.max(0, Math.min(100, d.value)) / 100) * radius;
        const p = getPoint(i, r);
        return (
          <circle
            key={`hover-${i}`}
            cx={p.x}
            cy={p.y}
            r={16}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        );
      })}

      {/* Labels */}
      {data.map((d, i) => {
        const p = getPoint(i, radius + 20);
        const anchor = p.x < cx - 5 ? 'end' : p.x > cx + 5 ? 'start' : 'middle';
        let dy = 4;
        if (i === 0) dy = -5;
        if (i === 3) dy = 11;
        const isHovered = hoveredIndex === i;
        return (
          <text
            key={i}
            x={p.x}
            y={p.y + dy}
            textAnchor={anchor}
            fontSize="9"
            fontWeight={isHovered ? "800" : "700"}
            fill={isHovered ? d.color : "var(--brand-navy)"}
            fontFamily="'Inter', sans-serif"
            style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {d.label}
          </text>
        );
      })}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={3} fill="var(--brand-navy)" opacity={0.4} />

      {/* Floating Tooltip */}
      {hoveredIndex !== null && (
        (() => {
          const d = data[hoveredIndex];
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
  );
};

/* ─────────────── Score Progress Bar ─────────────────────────── */
const ScoreBar = ({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon?: any }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        {Icon && <Icon size={11} color={color} />}
        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--gray-700)' }}>{label}</span>
      </div>
      <span style={{ fontSize: '0.78rem', fontWeight: '800', color }}>{value}</span>
    </div>
    <div style={{ height: '6px', backgroundColor: 'var(--gray-100)', borderRadius: '999px', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${value}%`,
        background: `linear-gradient(90deg, ${color}99, ${color})`,
        borderRadius: '999px',
        transition: 'width 1s cubic-bezier(0.16,1,0.3,1)'
      }} />
    </div>
  </div>
);

/* ─────────────── Badge pill ──────────────────────────────────── */
const Pill = ({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '10px 16px', borderRadius: '14px', backgroundColor: bg,
    border: `1.5px solid ${color}33`, gap: '3px', flex: 1, minWidth: '80px'
  }}>
    <span style={{ fontSize: '0.6rem', fontWeight: '700', color: color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: color, textAlign: 'center', lineHeight: 1.2 }}>{value}</span>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   TRANSCRIPT INTELLIGENCE ENGINE — Main Component
═══════════════════════════════════════════════════════════════ */

interface TranscriptIntelligenceEngineProps {
  transcript: TranscriptEntry[];
  storedAnalysis?: Partial<TranscriptAnalysisResult> | null;
}

export function TranscriptIntelligenceEngine({ transcript, storedAnalysis }: TranscriptIntelligenceEngineProps) {
  const [showMore, setShowMore] = useState(false);

  const liveAnalysis: TranscriptAnalysisResult = useMemo(
    () => analyzeTranscript(transcript),
    [transcript]
  );

  // Use stored analysis from DB if available (more accurate — computed at upload time)
  // Fall back to live computation if stored analysis is missing any critical fields
  const analysis: TranscriptAnalysisResult = useMemo(() => {
    if (storedAnalysis && storedAnalysis.recommendation) {
      const normalized = { ...storedAnalysis };

      // Map keyObservations from [{observation, evidence}] to ["Observation (Evidence: ...)"]
      if (Array.isArray(normalized.keyObservations)) {
        normalized.keyObservations = normalized.keyObservations.map((item: any) => {
          if (item && typeof item === 'object' && 'observation' in item) {
            return `${item.observation} [Evidence: ${item.evidence || 'N/A'}]`;
          }
          return String(item);
        });
      }

      // Map leadershipIndicators from [{indicator, evidence}] to ["Indicator (Evidence: ...)"]
      if (Array.isArray(normalized.leadershipIndicators)) {
        normalized.leadershipIndicators = normalized.leadershipIndicators.map((item: any) => {
          if (item && typeof item === 'object' && 'indicator' in item) {
            return `${item.indicator} [Evidence: ${item.evidence || 'N/A'}]`;
          }
          return String(item);
        });
      }

      // Map technicalGaps from [{gap, evidence}] to ["Gap (Evidence: ...)"]
      if (Array.isArray(normalized.technicalGaps)) {
        normalized.technicalGaps = normalized.technicalGaps.map((item: any) => {
          if (item && typeof item === 'object' && 'gap' in item) {
            return `${item.gap} [Evidence: ${item.evidence || 'N/A'}]`;
          }
          return String(item);
        });
      }

      // Map ownershipSignals from [{signal, evidence}] to ["Signal (Evidence: ...)"]
      if (Array.isArray(normalized.ownershipSignals)) {
        normalized.ownershipSignals = normalized.ownershipSignals.map((item: any) => {
          if (item && typeof item === 'object' && 'signal' in item) {
            return `${item.signal} [Evidence: ${item.evidence || 'N/A'}]`;
          }
          return String(item);
        });
      }

      return { ...liveAnalysis, ...normalized } as TranscriptAnalysisResult;
    }
    return liveAnalysis;
  }, [liveAnalysis, storedAnalysis]);

  const hasTranscript = transcript && transcript.length > 0;

  if (!hasTranscript) {
    return (
      <div style={{
        marginTop: '1.5rem',
        padding: '2rem',
        borderRadius: '20px',
        border: '2px dashed rgba(14,45,123,0.2)',
        backgroundColor: '#f8fafc',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          backgroundColor: 'rgba(14,45,123,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Brain size={24} color="var(--brand-navy)" opacity={0.5} />
        </div>
        <div>
          <p style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--brand-navy)', margin: '0 0 4px' }}>
            Technical Interview Dashboard
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            Upload a transcript file to activate AI-powered intelligence analysis
          </p>
        </div>
      </div>
    );
  }

  const radarData = [
    { label: 'Communication', value: analysis.communication, color: '#3b82f6' },
    { label: 'Tech Interview', value: analysis.technical, color: '#8b5cf6' },
    { label: 'Problem Solving', value: analysis.problemSolving, color: '#f59e0b' },
    { label: 'Leadership', value: analysis.leadership, color: '#10b981' },
    { label: 'Confidence', value: analysis.confidence, color: '#ef4444' },
    { label: 'Professionalism', value: analysis.professionalism, color: '#0ea5e9' },
  ];

  const toneConfig: Record<string, { bg: string; color: string }> = {
    'Positive':     { bg: 'rgba(16,185,129,0.1)',  color: '#065f46' },
    'Professional': { bg: 'rgba(59,130,246,0.1)',   color: '#1e40af' },
    'Cautious':     { bg: 'rgba(245,158,11,0.1)',   color: '#92400e' },
  };
  const sentimentConfig: Record<string, { bg: string; color: string }> = {
    'Positive': { bg: 'rgba(16,185,129,0.1)',  color: '#065f46' },
    'Neutral':  { bg: 'rgba(107,114,128,0.1)', color: '#374151' },
    'Mixed':    { bg: 'rgba(245,158,11,0.1)',  color: '#92400e' },
  };
  const recConfig: Record<string, { bg: string; color: string }> = {
    'Strongly Recommend': { bg: 'rgba(16,185,129,0.12)',  color: '#065f46' },
    'Recommend':          { bg: 'rgba(59,130,246,0.12)',  color: '#1e40af' },
    'Consider':           { bg: 'rgba(245,158,11,0.12)', color: '#92400e' },
    'Not Recommended':    { bg: 'rgba(239,68,68,0.12)',  color: '#7f1d1d' },
  };

  const toneStyle   = toneConfig[analysis.tone]   || { bg: 'rgba(107,114,128,0.1)', color: '#374151' };
  const sentStyle   = sentimentConfig[analysis.sentiment] || { bg: 'rgba(107,114,128,0.1)', color: '#374151' };
  const recStyle    = recConfig[analysis.recommendation]  || { bg: 'rgba(107,114,128,0.1)', color: '#374151' };
  const fillerStyle = analysis.fillerWordCount > 8
    ? { bg: 'rgba(239,68,68,0.1)', color: '#7f1d1d' }
    : analysis.fillerWordCount > 3
    ? { bg: 'rgba(245,158,11,0.1)', color: '#92400e' }
    : { bg: 'rgba(16,185,129,0.1)', color: '#065f46' };

  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>


      {/* ── TOP 4 BADGE PILLS ── */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <Pill label="Tone"        value={analysis.tone}          color={toneStyle.color}   bg={toneStyle.bg}   />
        <Pill label="Sentiment"   value={analysis.sentiment}     color={sentStyle.color}   bg={sentStyle.bg}   />
        <Pill label="Filler Words" value={`${analysis.fillerWordCount} detected`}  color={fillerStyle.color} bg={fillerStyle.bg} />
        <Pill label="Recommendation" value={analysis.recommendation} color={recStyle.color} bg={recStyle.bg} />
      </div>

      {/* ── RADAR CHART + DETAILED SCORE BREAKDOWN ── */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'stretch' }}>

        {/* Radar Chart Box */}
        <div style={{
          flex: '0 0 auto',
          backgroundColor: '#fff', borderRadius: '20px',
          border: '1px solid var(--border)',
          padding: '1.25rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          minWidth: '380px',
          justifyContent: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '0.74rem', fontWeight: '700', color: 'var(--brand-navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Intelligence Radar
          </p>
          <RadarChart data={radarData} />
          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '4px' }}>
            {radarData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.62rem', color: 'var(--gray-600)', fontWeight: '600' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Score Breakdown */}
        <div style={{
          flex: 1,
          backgroundColor: '#fff', borderRadius: '20px',
          border: '1px solid var(--border)', padding: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '1rem',
          justifyContent: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '0.74rem', fontWeight: '700', color: 'var(--brand-navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Detailed Score Breakdown
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Communication',   value: analysis.communication,        color: '#3b82f6',  icon: MessageSquare },
              { label: 'Tech Interview',  value: analysis.technical,            color: '#8b5cf6',  icon: BarChart2 },
              { label: 'Problem Solving', value: analysis.problemSolving,       color: '#f59e0b',  icon: Target },
              { label: 'Leadership',      value: analysis.leadership,           color: '#10b981',  icon: Users },
              { label: 'Confidence',      value: analysis.confidence,           color: '#ef4444',  icon: Star },
              { label: 'Professionalism',  value: analysis.professionalism, color: '#0ea5e9',  icon: Award },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '12px', borderRadius: '14px',
                border: `1.5px solid ${s.color}22`,
                background: `linear-gradient(135deg, ${s.color}08, ${s.color}03)`,
                display: 'flex', flexDirection: 'column', gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <s.icon size={13} color={s.color} />
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ height: '4px', backgroundColor: 'var(--gray-100)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.value}%`, backgroundColor: s.color, borderRadius: '999px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TWO COLUMN: RECOMMENDATION + KEY OBSERVATIONS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* AI Recommendation */}
        <div style={{
          backgroundColor: '#fff', borderRadius: '20px',
          border: '1px solid var(--border)', padding: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lightbulb size={15} color="#f59e0b" />
            <p style={{ margin: 0, fontSize: '0.74rem', fontWeight: '700', color: 'var(--brand-navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AI Recommendation
            </p>
          </div>
          <div style={{
            padding: '12px 14px', borderRadius: '12px',
            backgroundColor: recStyle.bg,
            border: `1px solid ${recStyle.color}33`,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: '700', color: recStyle.color, marginBottom: '8px' }}>
              {analysis.recommendation}
            </p>
            <div style={{ margin: 0, fontSize: '0.74rem', color: 'var(--gray-700)', lineHeight: 1.6 }}>
              <StructuredAnalysisView text={analysis.recommendationReason} />
            </div>
          </div>
        </div>

        {/* Key Observations */}
        <div style={{
          backgroundColor: '#fff', borderRadius: '20px',
          border: '1px solid var(--border)', padding: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={15} color="#3b82f6" />
            <p style={{ margin: 0, fontSize: '0.74rem', fontWeight: '700', color: 'var(--brand-navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Key Observations
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'center' }}>
            {analysis.keyObservations.map((obs, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '6px',
                padding: '6px 10px', borderRadius: '10px',
                backgroundColor: 'rgba(59,130,246,0.05)',
                border: '1px solid rgba(59,130,246,0.12)'
              }}>
                <CheckCircle size={12} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: '600', lineHeight: 1.4 }}>{obs}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leadership Indicators */}
      <div style={{
        backgroundColor: '#fff', borderRadius: '20px',
        border: '1px solid var(--border)', padding: '1.25rem',
        display: 'flex', flexDirection: 'column', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={15} color="#10b981" />
          <p style={{ margin: 0, fontSize: '0.74rem', fontWeight: '700', color: 'var(--brand-navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Leadership Indicators
          </p>
        </div>
        {analysis.leadershipIndicators.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {analysis.leadershipIndicators.map((li, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                padding: '8px 12px', borderRadius: '10px',
                backgroundColor: 'rgba(16,185,129,0.05)',
                border: '1px solid rgba(16,185,129,0.15)'
              }}>
                <TrendingUp size={12} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.73rem', color: '#065f46', fontWeight: '600', lineHeight: 1.4, fontStyle: 'italic' }}>"{li}"</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '14px', borderRadius: '12px', textAlign: 'center',
            border: '1px dashed rgba(16,185,129,0.3)', color: 'var(--text-muted)',
            fontSize: '0.78rem', fontStyle: 'italic'
          }}>
            No specific leadership indicators observed in transcript
          </div>
        )}
      </div>

    </div>
  );
}
