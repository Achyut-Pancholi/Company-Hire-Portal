"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Interview, TranscriptEntry } from "@/types";
import { InterviewPlayerLayout } from "@/components/interview-player-layout";
import { formatDateTime, getShareUrl, timeAgo, copyToClipboard } from "@/lib/utils";
import { Logo } from "@/components/logo";
import {
  ArrowLeft,
  Video,
  Download,
  Share2,
  Copy,
  CheckCircle2,
  Clock,
  MessageSquare,
  Loader2,
  Play,
  User,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function InterviewReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);



  const fetchInterview = useCallback(async () => {
    try {
      const res = await fetch(`/api/interviews/${id}`);
      const { data } = await res.json();
      setInterview(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInterview();
  }, [fetchInterview]);

  const copyShareLink = async () => {
    if (!interview) return;
    copyToClipboard(getShareUrl(interview.share_token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!interview?.video_url) return;
    const a = document.createElement("a");
    a.href = interview.video_url;
    a.download = `${interview.candidate_name.replace(/\s+/g, "-")}-interview.webm`;
    a.click();
  };

  // Redirect to Admin Reports where all candidates are listed
  const PORTAL_URL = "/admin/reports";

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this interview? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/interviews/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        window.location.href = PORTAL_URL;
      }
    } catch (err) {
      console.error("Failed to delete interview", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-center">
        <div>
          <p className="text-slate-500 text-lg mb-4">Interview not found</p>
          <a href={PORTAL_URL}>
            <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50">
              Back to dashboard
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top nav */}
      <div className="border-b border-[#E2E8F0] bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href={PORTAL_URL} className="text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <Logo href={PORTAL_URL} size="md" />
          <span className="text-slate-300">/</span>
          <span className="text-slate-600 text-sm font-semibold">Interview Review</span>
        </div>

        <div className="flex items-center gap-2">
          {interview.status === "completed" && (
            <>
              <Button
                onClick={copyShareLink}
                variant="outline"
                size="sm"
                className="border-[#E2E8F0] bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 gap-2 shadow-sm"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Share review"}
              </Button>
              {interview.video_url && (
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  size="sm"
                  className="border-[#E2E8F0] bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 gap-2 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Candidate info card */}
        <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0 shadow-sm">
            {interview.candidate_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-slate-900 font-bold text-lg">{interview.candidate_name}</h1>
            <p className="text-slate-500 text-sm">{interview.candidate_email} · {interview.job_role}</p>
          </div>
          <Badge 
            className={
              interview.status === "completed"
                ? "bg-emerald-600 hover:bg-emerald-600 text-white border-none font-semibold flex items-center gap-1.5 px-3 py-1 rounded-full text-xs shadow-sm"
                : "bg-amber-100 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1.5 px-3 py-1 rounded-full text-xs shadow-sm"
            }
          >
            {interview.status === "completed" ? (
              <CheckCircle2 className="w-3 h-3 text-white" />
            ) : (
              <Clock className="w-3 h-3 text-amber-600" />
            )}
            {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
          </Badge>
        </div>

        <InterviewPlayerLayout interview={interview} />

        {/* Details section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-4">Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-slate-400 text-xs mb-1">Created</p>
                <p className="text-slate-700 text-sm font-medium">{formatDateTime(interview.created_at)}</p>
                <p className="text-slate-400 text-xs mt-0.5">{timeAgo(interview.created_at)}</p>
              </div>
              {interview.completed_at && (
                <div>
                  <p className="text-slate-400 text-xs mb-1">Completed</p>
                  <p className="text-slate-700 text-sm font-medium">{formatDateTime(interview.completed_at)}</p>
                </div>
              )}
              <div>
                <p className="text-slate-400 text-xs mb-1">Expires</p>
                <p className="text-slate-700 text-sm font-medium">{formatDateTime(interview.expires_at)}</p>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-4">
              Questions ({interview.questions.length})
            </h3>
            <div className="space-y-3">
              {interview.questions.map((q: string, i: number) => (
                <div key={i} className="flex gap-3">
                  <span className="text-slate-400 text-xs font-mono mt-0.5">Q{i + 1}</span>
                  <p className="text-slate-600 text-sm leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
          </div>

          {interview.status === "completed" && (
            <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
              <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-4">Share Link</h3>
              <p className="text-slate-400 text-xs mb-3">
                Share this link to give read-only access to this candidate&apos;s review
              </p>
              <button
                onClick={copyShareLink}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-[#E2E8F0] bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-50 text-sm font-medium transition-all shadow-sm"
              >
                {copied ? (
                  <><CheckCircle2 className="w-4 h-4 text-emerald-500" />Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" />Copy share link</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
