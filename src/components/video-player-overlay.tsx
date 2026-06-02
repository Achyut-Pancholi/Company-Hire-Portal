"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Maximize, ChevronLeft, ChevronRight } from "lucide-react";

interface TranscriptEntry {
  question: string;
  text?: string;
  timestamp_start?: number;
  timestamp_end?: number;
  clip_url?: string;
}

interface VideoPlayerOverlayProps {
  videoUrl: string | null;
  status: string;
  transcript?: TranscriptEntry[] | null;
  onTimeUpdate?: (time: number) => void;
  videoRef?: any;
  onToggleFullScreen?: () => void;
  isFullscreen?: boolean;
  /** Current active clip index, controlled from outside (optional) */
  activeClipIndex?: number | null;
  /** Callback when clip changes */
  onClipChange?: (index: number) => void;
}

export function VideoPlayerOverlay({
  videoUrl,
  status,
  transcript,
  onTimeUpdate,
  videoRef: externalVideoRef,
  onToggleFullScreen,
  isFullscreen,
  activeClipIndex: externalActiveClip,
  onClipChange,
}: VideoPlayerOverlayProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [internalActiveClip, setInternalActiveClip] = useState<number | null>(null);

  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef ?? internalVideoRef;

  // Use external controlled active clip if provided
  const activeClipIndex = externalActiveClip !== undefined ? externalActiveClip : internalActiveClip;
  const setActiveClipIndex = (idx: number | null) => {
    setInternalActiveClip(idx);
    if (onClipChange && idx !== null) onClipChange(idx);
  };

  const hasClips = transcript && transcript.length > 0 && transcript.some(t => t.clip_url);

  const handleFullScreen = () => {
    if (onToggleFullScreen) {
      onToggleFullScreen();
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  /** Resolve the URL the <video> element should currently play */
  const resolvedVideoUrl = (() => {
    // If we have per-clip URLs and a selected clip, show that clip
    if (hasClips && activeClipIndex !== null && transcript![activeClipIndex]?.clip_url) {
      return transcript![activeClipIndex].clip_url!;
    }
    // Fallback: merged video
    if (!videoUrl) return "/sample-video.mp4";
    const clean = String(videoUrl).trim();
    if (clean === "" || clean === "—" || clean === "null" || clean === "undefined" || clean.includes("mixkit.co")) {
      return "/sample-video.mp4";
    }
    return clean;
  })();

  /** Navigate to a clip by index */
  const playClip = (idx: number) => {
    if (!transcript || idx < 0 || idx >= transcript.length) return;
    setActiveClipIndex(idx);

    const entry = transcript[idx];
    const vid = videoRef.current;
    if (!vid) return;

    if (entry.clip_url) {
      // Individual clip — change src and play from beginning
      vid.src = entry.clip_url;
      vid.load();
      vid.play().catch(console.error);
    } else {
      // Merged video — seek to timestamp
      const start = entry.timestamp_start ?? 0;
      vid.currentTime = start;
      vid.play().catch(console.error);
    }
  };

  const playPrev = () => {
    if (activeClipIndex === null || activeClipIndex <= 0) return;
    playClip(activeClipIndex - 1);
  };

  const playNext = () => {
    if (!transcript || activeClipIndex === null || activeClipIndex >= transcript.length - 1) return;
    playClip(activeClipIndex + 1);
  };

  // Auto-pause at clip end for timestamp-based navigation (non-clip mode)
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const time = e.currentTarget.currentTime;
    setCurrentTime(time);
    if (onTimeUpdate) onTimeUpdate(time);
    if (!videoDuration && !isNaN(e.currentTarget.duration)) {
      setVideoDuration(e.currentTarget.duration);
    }

    // In merged-video mode, auto-pause when clip timestamp ends
    if (!hasClips && activeClipIndex !== null && transcript && transcript[activeClipIndex]) {
      const endTime = transcript[activeClipIndex].timestamp_end;
      if (endTime && videoRef.current && videoRef.current.currentTime >= endTime) {
        videoRef.current.pause();
      }
    }
  };

  const hasTranscriptNav = transcript && transcript.length > 0;

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-[#E2E8F0] bg-black shadow-md flex flex-col items-center justify-center group h-full w-full ${
        isFullscreen ? "" : "aspect-video"
      }`}
    >
      {resolvedVideoUrl ? (
        <>
          <video
            ref={videoRef}
            src={resolvedVideoUrl}
            controls
            controlsList="nofullscreen"
            className="w-full flex-1 object-contain min-h-0"
            onTimeUpdate={handleTimeUpdate}
          />

          {/* Fullscreen toggle */}
          <button
            onClick={handleFullScreen}
            className="absolute bottom-16 right-4 z-50 p-2 bg-black/50 hover:bg-black/80 rounded-lg text-white transition-colors opacity-0 group-hover:opacity-100"
            title="Full Screen"
          >
            <Maximize className="w-4 h-4" />
          </button>

          {/* Q Navigation bar */}
          {hasTranscriptNav && (
            <div className="w-full flex gap-2 overflow-x-auto p-2 bg-[#1e293b] flex-shrink-0 z-50 items-center justify-center">
              {/* Prev */}
              <button
                onClick={playPrev}
                disabled={activeClipIndex === null || activeClipIndex === 0}
                className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3 h-3" /> Prev
              </button>

              {/* Q# buttons */}
              <div className="flex gap-2 overflow-x-auto">
                {transcript!.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => playClip(i)}
                    title={t.question}
                    className={`px-3 py-1.5 text-xs font-bold rounded shadow-sm border transition-all whitespace-nowrap ${
                      activeClipIndex === i
                        ? "bg-emerald-500 text-white border-emerald-400"
                        : "bg-slate-700 text-white hover:bg-slate-600 border-slate-600"
                    }`}
                  >
                    Q{i + 1}
                  </button>
                ))}
              </div>

              {/* Next */}
              <button
                onClick={playNext}
                disabled={
                  !transcript ||
                  activeClipIndex === null ||
                  activeClipIndex === transcript.length - 1
                }
                className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Floating question overlay (merged-video mode) */}
          {!hasClips && (() => {
            if (!transcript || !Array.isArray(transcript) || transcript.length === 0) return null;

            const isOldFormat = transcript.every((t) => !t.timestamp_start);
            let activeT: TranscriptEntry | undefined;

            if (isOldFormat && videoDuration > 0) {
              const segmentLength = videoDuration / transcript.length;
              const index = Math.min(Math.floor(currentTime / segmentLength), transcript.length - 1);
              activeT = transcript[Math.max(0, index)];
            } else {
              activeT = transcript.find(
                (t) =>
                  t.timestamp_start !== undefined &&
                  t.timestamp_end !== undefined &&
                  currentTime >= t.timestamp_start! &&
                  currentTime <= t.timestamp_end!
              );
            }

            if (!activeT) return null;

            return (
              <div className="absolute bottom-20 left-0 right-0 px-8 pointer-events-none transition-opacity duration-300 z-40">
                <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl max-w-2xl mx-auto">
                  <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Question
                  </p>
                  <p className="text-white text-lg font-medium">{activeT.question}</p>
                </div>
              </div>
            );
          })()}
        </>
      ) : (
        <div className="text-center py-20">
          <Play className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">
            {status === "pending" ? "Interview not yet completed" : "Video unavailable"}
          </p>
        </div>
      )}
    </div>
  );
}
