"use client";

import { useState, useRef, useEffect } from "react";
import { VideoPlayerOverlay } from "@/components/video-player-overlay";
import { MessageSquare, User, Sparkles, BarChart3, TrendingUp } from "lucide-react";
import type { TranscriptEntry } from "@/types";
import { StructuredAnalysisView } from "@/components/StructuredAnalysisView";

interface InterviewPlayerLayoutProps {
  interview: any;
}

// ─── Pure SVG Radar Chart ────────────────────────────────────────────────────
function RadarChart({ scores }: { scores: Record<string, number> }) {
  const entries = Object.entries(scores);
  const count = entries.length;
  if (count < 3) return null;

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 90;
  const levels = 5;

  const angleStep = (2 * Math.PI) / count;

  const getPoint = (angle: number, r: number) => ({
    x: cx + r * Math.sin(angle),
    y: cy - r * Math.cos(angle),
  });

  // Grid polygons
  const gridPolygons = Array.from({ length: levels }, (_, i) => {
    const r = (radius * (i + 1)) / levels;
    const pts = entries.map((_, j) => {
      const p = getPoint(j * angleStep, r);
      return `${p.x},${p.y}`;
    });
    return pts.join(" ");
  });

  // Score polygon
  const scorePoints = entries.map(([, score], j) => {
    const r = ((score as number) / 5) * radius;
    const p = getPoint(j * angleStep, r);
    return `${p.x},${p.y}`;
  });

  // Label positions — extra offset so long labels like "Communication" don't clip
  const labelPoints = entries.map(([label], j) => {
    const r = radius + 30;
    const p = getPoint(j * angleStep, r);
    return { label, ...p };
  });

  // Axis lines
  const axisLines = entries.map((_, j) => {
    const p = getPoint(j * angleStep, radius);
    return { x2: p.x, y2: p.y };
  });

  return (
    <svg width={size} height={size} className="mx-auto" overflow="visible">
      {/* Grid polygons */}
      {gridPolygons.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {axisLines.map((l, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={l.x2}
          y2={l.y2}
          stroke="#CBD5E1"
          strokeWidth="1"
        />
      ))}

      {/* Score polygon */}
      <polygon
        points={scorePoints.join(" ")}
        fill="rgba(99,102,241,0.15)"
        stroke="#6366F1"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Score dots */}
      {entries.map(([, score], j) => {
        const r = ((score as number) / 5) * radius;
        const p = getPoint(j * angleStep, r);
        return (
          <circle key={j} cx={p.x} cy={p.y} r={4} fill="#6366F1" />
        );
      })}

      {/* Labels */}
      {labelPoints.map(({ label, x, y }, i) => (
        <text
          key={i}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="10"
          fontWeight="600"
          fill="#64748B"
        >
          {label}
        </text>
      ))}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={3} fill="#6366F1" opacity={0.4} />
    </svg>
  );
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────
function BarChart({ scores }: { scores: Record<string, number> }) {
  const entries = Object.entries(scores);
  const barW = 36;
  const gap = 20;
  const maxH = 120;
  const chartW = entries.length * (barW + gap) + gap;
  const chartH = maxH + 80;

  const COLORS = ["#6366F1", "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];

  return (
    <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} className="overflow-visible">
      {/* Y-axis grid lines */}
      {[1, 2, 3, 4, 5].map((v) => {
        const y = maxH - (v / 5) * maxH;
        return (
          <g key={v}>
            <line x1={0} y1={y} x2={chartW} y2={y} stroke="#F1F5F9" strokeWidth="1" />
            <text x={-4} y={y} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="#CBD5E1">{v}</text>
          </g>
        );
      })}

      {/* Bars */}
      {entries.map(([label, score], i) => {
        const h = ((score as number) / 5) * maxH;
        const x = gap + i * (barW + gap);
        const y = maxH - h;
        const color = COLORS[i % COLORS.length];
        return (
          <g key={label}>
            {/* Shadow bar */}
            <rect x={x + 2} y={y + 2} width={barW} height={h} rx={6} fill={color} opacity={0.1} />
            {/* Main bar */}
            <rect x={x} y={y} width={barW} height={h} rx={6} fill={color} opacity={0.85} />
            {/* Score label on top */}
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
              {score}/5
            </text>
            {/* Category label below */}
            <text 
              x={x + barW / 2} 
              y={maxH + 20} 
              textAnchor="end" 
              transform={`rotate(-45, ${x + barW / 2}, ${maxH + 20})`}
              fontSize="9" 
              fontWeight="600" 
              fill="#94A3B8"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Baseline */}
      <line x1={0} y1={maxH} x2={chartW} y2={maxH} stroke="#E2E8F0" strokeWidth="1.5" />
    </svg>
  );
}

// ─── Overall Score Badge ──────────────────────────────────────────────────────
function OverallScore({ scores }: { scores: Record<string, number> }) {
  const values = Object.values(scores) as number[];
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const pct = Math.round((avg / 5) * 100);

  const color = pct >= 80 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";
  const label = pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : "Needs Work";

  const r = 38;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#F1F5F9" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>{pct}%</text>
        <text x="50" y="60" textAnchor="middle" fontSize="9" fill="#94A3B8">overall</text>
      </svg>
      <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: `${color}18`, color }}>
        {label}
      </span>
    </div>
  );
}

// ─── Main Layout ─────────────────────────────────────────────────────────────
export function InterviewPlayerLayout({ interview }: InterviewPlayerLayoutProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeClipIndex, setActiveClipIndex] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);

  const activeTranscriptRef = useRef<HTMLDivElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTranscriptRef.current && transcriptContainerRef.current) {
      const container = transcriptContainerRef.current;
      const activeEl = activeTranscriptRef.current;
      const containerHalfHeight = container.clientHeight / 2;
      const activeHalfHeight = activeEl.clientHeight / 2;
      container.scrollTo({
        top: activeEl.offsetTop - containerHalfHeight + activeHalfHeight,
        behavior: "smooth",
      });
    }
  }, [currentTime]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      layoutRef.current?.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const transcript = interview.transcript as TranscriptEntry[] | null;
  const scores = interview.scores as Record<string, number> | null;

  const hasClips = transcript && transcript.length > 0 && transcript.some((t) => t.clip_url);

  /** Play a clip from the list */
  const handleClipSelect = (idx: number) => {
    setActiveClipIndex(idx);
    const entry = transcript![idx];
    const vid = videoRef.current;
    if (!vid) return;

    if (entry.clip_url) {
      vid.src = entry.clip_url;
      vid.load();
      vid.play().catch(console.error);
    } else {
      const start = entry.timestamp_start ?? 0;
      vid.currentTime = start;
      vid.play().catch(console.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Video + Clip List + Transcript ── */}
      <div
        ref={layoutRef}
        className={`grid gap-4 ${
          isFullscreen
            ? "bg-[#F8FAFC] p-6 h-screen w-screen overflow-hidden grid-cols-1 md:grid-cols-3"
            : "grid-cols-1 lg:grid-cols-3"
        }`}
      >
        {/* VIDEO (takes up 2 columns) */}
        <div className={`col-span-2 ${isFullscreen ? "h-full flex flex-col justify-center" : "space-y-0"}`}>
          <VideoPlayerOverlay
            videoUrl={interview.video_url}
            status={interview.status}
            transcript={interview.transcript}
            onTimeUpdate={setCurrentTime}
            videoRef={videoRef}
            onToggleFullScreen={handleToggleFullScreen}
            isFullscreen={isFullscreen}
            activeClipIndex={activeClipIndex}
            onClipChange={setActiveClipIndex}
          />
        </div>

        {/* SIDEBAR: Clip List (if clips exist) OR Transcript */}
        <div className={`col-span-1 h-full ${isFullscreen ? "overflow-hidden" : ""}`}>
          {hasClips ? (
            /* ── Clip List Sidebar ── */
            <div
              className={`p-4 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm flex flex-col gap-3 ${
                isFullscreen ? "h-full overflow-hidden" : "h-full max-h-[60vh] lg:max-h-[80vh]"
              }`}
            >
              <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 flex-shrink-0">
                <span className="w-4 h-4 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-[9px] font-bold text-indigo-600">▶</span>
                Question Clips
              </h3>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {transcript!.map((entry, i) => {
                  const isActive = activeClipIndex === i;
                  return (
                    <div
                      key={i}
                      onClick={() => handleClipSelect(i)}
                      className={`group cursor-pointer rounded-xl border transition-all duration-200 ${
                        isActive
                          ? "bg-indigo-50 border-indigo-200 shadow-sm"
                          : "bg-slate-50/60 border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-start gap-3 p-3">
                        {/* Q# badge */}
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 transition-all ${
                            isActive
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-200 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700"
                          }`}
                        >
                          {i + 1}
                        </div>

                        {/* Question text */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-semibold leading-snug mb-1 ${
                              isActive ? "text-indigo-900" : "text-slate-700"
                            }`}
                          >
                            {entry.question}
                          </p>
                          {entry.text && (
                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                              {entry.text}
                            </p>
                          )}
                          {entry.timestamp_start !== undefined && !entry.clip_url && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {Math.floor((entry.timestamp_start ?? 0) / 60)}:
                              {Math.floor((entry.timestamp_start ?? 0) % 60)
                                .toString()
                                .padStart(2, "0")}
                            </span>
                          )}
                        </div>

                        {/* Play icon indicator */}
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                            isActive
                              ? "bg-indigo-600 text-white"
                              : "bg-transparent text-slate-300 group-hover:text-indigo-500"
                          }`}
                        >
                          ▶
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Fallback: Live Transcript sidebar ── */
            <div
              className={`p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm flex flex-col ${
                isFullscreen ? "h-full" : "h-full max-h-[60vh] lg:max-h-[80vh]"
              }`}
            >
              <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-400" />
                Live Transcript
              </h3>

              <div
                ref={transcriptContainerRef}
                className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
              >
                {transcript && transcript.length > 0 ? (
                  transcript.map((entry: TranscriptEntry, i: number) => {
                    const isActive =
                      entry.timestamp_start !== undefined &&
                      entry.timestamp_end !== undefined &&
                      currentTime >= entry.timestamp_start! &&
                      currentTime <= entry.timestamp_end!;
                    return (
                      <div
                        key={i}
                        ref={isActive ? activeTranscriptRef : null}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isActive
                            ? "bg-blue-50/80 border-blue-200 shadow-sm"
                            : "bg-slate-50/50 border-slate-100/70 hover:bg-slate-50/80"
                        }`}
                        onClick={() => {
                          if (videoRef.current && entry.timestamp_start !== undefined) {
                            videoRef.current.currentTime = entry.timestamp_start!;
                            videoRef.current.play().catch(() => {});
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isActive
                                  ? "bg-blue-100 border border-blue-200"
                                  : "bg-slate-100 border border-slate-200"
                              }`}
                            >
                              <span
                                className={`text-[10px] font-bold ${
                                  isActive ? "text-blue-600" : "text-slate-500"
                                }`}
                              >
                                Q
                              </span>
                            </div>
                            <p
                              className={`text-sm font-medium ${
                                isActive ? "text-blue-900 font-semibold" : "text-slate-800"
                              }`}
                            >
                              {entry.question}
                            </p>
                          </div>
                          <span className="text-xs font-mono text-slate-400 font-semibold">
                            {Math.floor((entry.timestamp_start ?? 0) / 60)}:
                            {Math.floor((entry.timestamp_start ?? 0) % 60)
                              .toString()
                              .padStart(2, "0")}
                          </span>
                        </div>
                        <div className="flex items-start gap-3 mt-3">
                          <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <User className="w-2.5 h-2.5 text-slate-500" />
                          </div>
                          <p
                            className={`text-sm leading-relaxed ${
                              isActive ? "text-slate-700 font-medium" : "text-slate-500"
                            }`}
                          >
                            {entry.text || (
                              <span className="italic opacity-50">Transcribing...</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <MessageSquare className="w-8 h-8 text-slate-300 mb-3" />
                    <p className="text-slate-400 text-sm">
                      Transcript will appear here once processed.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Clip List below video (when hasClips, show transcript as a list below) ── */}
      {hasClips && transcript && transcript.some(t => t.text) && (
        <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
          <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            Full Transcript
          </h3>
          <div className="space-y-3">
            {transcript.map((entry, i) => (
              <div key={i} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <p className="text-xs font-bold text-indigo-700 mb-1">Q{i + 1}: {entry.question}</p>
                {entry.text && <p className="text-sm text-slate-600 leading-relaxed">{entry.text}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Report Section ── */}
      {interview.summary || scores ? (
        <div className="space-y-5">
          <div className="p-6 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              AI Interview Report
            </h3>
            <div className="prose prose-slate prose-sm max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed">
              <StructuredAnalysisView text={interview.summary} />
            </div>
          </div>

          {scores && Object.keys(scores).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-6 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm flex flex-col items-center justify-center gap-3">
                <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Overall Rating
                </h3>
                <OverallScore scores={scores} />
                <div className="w-full space-y-2 mt-2">
                  {Object.entries(scores).map(([cat, val]) => (
                    <div key={cat} className="flex items-center gap-2 text-xs">
                      <span className="w-28 text-slate-500 font-medium truncate">{cat}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-indigo-500 transition-all duration-700"
                          style={{ width: `${((val as number) / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-400 font-mono w-6 text-right">{val}/5</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm flex flex-col">
                <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-5 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  Score Breakdown
                </h3>
                <div className="flex-1 flex items-end">
                  <BarChart scores={scores} />
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm flex flex-col">
                <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  Skill Radar
                </h3>
                <div className="flex-1 flex items-center justify-center">
                  <RadarChart scores={scores} />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : interview.status === "completed" ? (
        <div className="p-6 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm flex flex-col items-center justify-center text-center">
          <Sparkles className="w-8 h-8 text-slate-300 mb-3 animate-pulse" />
          <h3 className="text-slate-500 text-sm font-semibold mb-1">Generating AI Report</h3>
          <p className="text-slate-400 text-xs">
            The AI summary and scores are being generated. Please refresh in a moment.
          </p>
        </div>
      ) : null}
    </div>
  );
}
