"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Interview } from "@/types";
import { cn, formatDate, getShareUrl, isExpired, copyToClipboard, getInterviewUrl } from "@/lib/utils";
import { Logo } from "@/components/logo";
import {
  Plus,
  LogOut,
  Search,
  Clock,
  CheckCircle2,
  Users,
  BarChart3,
  ExternalLink,
  Loader2,
  ChevronRight,
  Share2,
  Eye,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center`}>
          <Icon className={`w-4.5 h-4.5 text-${color}-400`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-white/40 text-sm">{title}</p>
    </div>
  );
}

function getInterviewStatus(interview: Interview): "pending" | "completed" | "expired" {
  if (interview.status === "completed") return "completed";
  if (isExpired(interview.expires_at)) return "expired";
  return "pending";
}

export default function DashboardPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const fetchInterviews = useCallback(async () => {
    try {
      const res = await fetch("/api/interviews");
      const { data } = await res.json();
      setInterviews(data || []);
    } catch (err) {
      console.error("Failed to fetch interviews", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);



  const copyLink = async (e: React.MouseEvent, type: "interview" | "share", interview: Interview) => {
    e.preventDefault();
    e.stopPropagation();
    
    const url = type === "interview" 
      ? getInterviewUrl(interview.id)
      : getShareUrl(interview.share_token);

    copyToClipboard(url);
    setCopied(`${type}-${interview.id}`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this interview? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/interviews/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setInterviews((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete interview", err);
    }
  };

  const filtered = interviews.filter(
    (i) =>
      i.candidate_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.candidate_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.sub_department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: interviews.length,
    completed: interviews.filter((i) => i.status === "completed").length,
    pending: interviews.filter((i) => i.status === "pending" && !isExpired(i.expires_at)).length,
    expired: interviews.filter((i) => i.status === "pending" && isExpired(i.expires_at)).length,
  };

  return (
    <div className="min-h-screen bg-[#050810]">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-[220px] border-r border-white/[0.06] bg-[#080c14] flex flex-col p-4">
        <div className="flex items-center gap-2.5 mb-8 px-2">
          <Logo href="/admin/dashboard" size="sm" theme="dark" />
        </div>

        <nav className="flex-1 space-y-1">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.06] text-white text-sm font-medium"
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/admin/dashboard/new"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.04] text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            New Interview
          </Link>
        </nav>


      </div>

      {/* Main content */}
      <div className="ml-[220px] p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
              <p className="text-white/40 text-sm mt-0.5">Manage and review candidate interviews</p>
            </div>
            <Link href="/admin/dashboard/new">
              <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20">
                <Plus className="w-4 h-4 mr-2" />
                New Interview
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <StatCard title="Total Interviews" value={stats.total} icon={Users} color="blue" />
            <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="emerald" />
            <StatCard title="Pending" value={stats.pending} icon={Clock} color="amber" />
            <StatCard title="Expired" value={stats.expired} icon={BarChart3} color="red" />
          </div>

          {/* Interview List */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between gap-4">
              <h2 className="text-white font-semibold text-sm">All Interviews</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                <Input
                  placeholder="Search candidates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20 focus-visible:border-white/30 focus-visible:ring-white/10"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white/20" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">
                  {searchQuery ? "No candidates match your search" : "No interviews yet"}
                </p>
                {!searchQuery && (
                  <Link href="/admin/dashboard/new">
                    <Button variant="ghost" className="mt-4 text-blue-400 hover:text-blue-300 text-sm">
                      Create your first interview
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {filtered.map((interview) => {
                  const status = getInterviewStatus(interview);
                  return (
                    <div
                      key={interview.id}
                      className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {interview.candidate_name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{interview.candidate_name}</p>
                        <p className="text-white/40 text-xs mt-0.5">
                          {interview.sub_department} · {interview.candidate_email}
                        </p>
                      </div>

                      {/* Status badge */}
                      <Badge variant={status}>
                        {status === "completed" && <CheckCircle2 className="w-3 h-3" />}
                        {status === "pending" && <Clock className="w-3 h-3" />}
                        {status === "completed" ? "Screening Completed" : status === "failed" ? "Screening Failed" : status === "expired" ? "Link Expired" : "Screening Pending"}
                      </Badge>

                      {/* Date */}
                      <p className="text-white/30 text-xs w-24 text-right flex-shrink-0">
                        {formatDate(interview.created_at)}
                      </p>

                      {/* Actions */}
                      <div className={cn(
                        "flex items-center gap-1 transition-opacity",
                        "opacity-0 group-hover:opacity-100"
                      )}>
                        {status === "completed" && (
                          <>
                            <button
                              onClick={(e) => copyLink(e, "share", interview)}
                              className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
                              title="Copy share link"
                            >
                              {copied === `share-${interview.id}` ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Share2 className="w-4 h-4" />
                              )}
                            </button>
                            <Link
                              href={`/video-bot-admin/dashboard/interviews/${interview.id}`}
                              className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
                              title="Review interview"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </>
                        )}
                        <Link
                          href={`/video-bot-admin/dashboard/interviews/${interview.id}`}
                          className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(interview.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all"
                          title="Delete interview"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
