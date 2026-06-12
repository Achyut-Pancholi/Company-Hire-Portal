import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { MessageSquare, User, CheckCircle2, Play } from "lucide-react";
import { InterviewPlayerLayout } from "@/components/interview-player-layout";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("interviews")
    .select("candidate_name, sub_department")
    .eq("share_token", token)
    .single();

  if (!data) return { title: "Interview Review — Happy" };
  return {
    title: `${data.candidate_name} — ${data.sub_department} | Happy Interview`,
    description: `Review video interview for ${data.candidate_name} applying for ${data.sub_department}`,
    robots: "noindex, nofollow",
  };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createAdminClient();

  const { data: interview, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("share_token", token)
    .eq("status", "completed")
    .single();

  if (error || !interview) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800">
      {/* Nav */}
      <div className="border-b border-[#E2E8F0] bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Logo href="/" size="sm" theme="light" />
          <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
            Candidate Review
          </span>
        </div>
        <p className="text-slate-400 text-xs font-medium">Read-only view</p>
      </div>

      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Candidate header */}
        <div className="flex items-center gap-5 p-6 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xl shadow-sm">
            {interview.candidate_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-slate-900 font-bold text-xl">{interview.candidate_name}</h1>
            <p className="text-slate-500 text-sm mt-0.5">{interview.sub_department}</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            Completed
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs">Completed</p>
            <p className="text-slate-600 text-sm font-semibold mt-0.5">{formatDateTime(interview.completed_at)}</p>
          </div>
        </div>

        <InterviewPlayerLayout interview={interview} />

        {/* Notice */}
        <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          <p className="text-slate-500 text-xs leading-relaxed">
            This is a read-only shared view of this candidate&apos;s interview. 
            You do not have access to any other candidate or platform data.
          </p>
        </div>
      </div>
    </div>
  );
}
