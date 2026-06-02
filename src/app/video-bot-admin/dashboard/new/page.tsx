"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Plus, Trash2, ArrowLeft, Copy, Loader2, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getInterviewUrl, getShareUrl, copyToClipboard } from "@/lib/utils";

interface CreatedInterview {
  id: string;
  candidate_name: string;
  job_role: string;
  share_token: string;
}

export default function NewInterviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedInterview | null>(null);
  const [copied, setCopied] = useState<"interview" | "share" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Compute default expiry (7 days from now) — kept in a function so it
  // never runs during SSR, preventing server/client Date.now() mismatch.
  const getDefaultExpiry = () =>
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const [minDateTime, setMinDateTime] = useState("");
  const [form, setForm] = useState({
    candidate_name: "",
    candidate_email: "",
    job_role: "",
    expires_at: "",           // populated after mount to avoid SSR mismatch
    questions: ["", "", ""],
  });

  // Set date-dependent values only on the client after hydration
  useEffect(() => {
    const expiry = getDefaultExpiry();
    setForm((prev) => ({ ...prev, expires_at: expiry }));
    setMinDateTime(new Date().toISOString().slice(0, 16));
  }, []);

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const updateQuestion = (index: number, value: string) => {
    setForm((prev) => {
      const q = [...prev.questions];
      q[index] = value;
      return { ...prev, questions: q };
    });
    setErrors((prev) => ({ ...prev, [`q_${index}`]: "" }));
  };

  const addQuestion = () => {
    if (form.questions.length < 5) {
      setForm((prev) => ({ ...prev, questions: [...prev.questions, ""] }));
    }
  };

  const removeQuestion = (index: number) => {
    if (form.questions.length > 1) {
      setForm((prev) => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index),
      }));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.candidate_name.trim()) errs.candidate_name = "Candidate name is required";
    if (!form.candidate_email.trim()) errs.candidate_email = "Email is required";
    if (!form.job_role.trim()) errs.job_role = "Job role is required";
    if (!form.expires_at) errs.expires_at = "Expiration date is required";
    const validQuestions = form.questions.filter((q) => q.trim());
    if (validQuestions.length < 1) errs.questions = "At least 1 question is required";
    form.questions.forEach((q, i) => {
      if (!q.trim()) errs[`q_${i}`] = "Question cannot be empty";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        ...form,
        questions: form.questions.filter((q) => q.trim()),
        expires_at: new Date(form.expires_at).toISOString(),
      };

      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const { data, error } = await res.json();
      if (error) throw new Error(error);

      setCreated(data);

      // Send invite email
      await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "invite",
          to: form.candidate_email,
          candidateName: form.candidate_name,
          jobRole: form.job_role,
          interviewId: data.id,
          expiresAt: data.expires_at,
        }),
      });
    } catch (err) {
      console.error(err);
      setErrors({ submit: "Failed to create interview. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, type: "interview" | "share") => {
    copyToClipboard(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (created) {
    const interviewUrl = getInterviewUrl(created.id);
    const shareUrl = getShareUrl(created.share_token);
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Interview created!</h1>
            <p className="text-white/40 text-sm">
              An invitation email has been sent to{" "}
              <span className="text-white/60">{form.candidate_email}</span>
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-white/50 text-xs mb-2 font-medium">CANDIDATE INTERVIEW LINK</p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <p className="text-white/60 text-xs flex-1 truncate font-mono">{interviewUrl}</p>
                <button
                  onClick={() => handleCopy(interviewUrl, "interview")}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all flex-shrink-0"
                >
                  {copied === "interview" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <p className="text-white/50 text-xs mb-2 font-medium">REVIEW SHARE LINK (after completion)</p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <p className="text-white/60 text-xs flex-1 truncate font-mono">{shareUrl}</p>
                <button
                  onClick={() => handleCopy(shareUrl, "share")}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all flex-shrink-0"
                >
                  {copied === "share" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => router.push("/admin/dashboard")}
              variant="outline"
              className="flex-1 border-white/10 text-white/60 hover:text-white hover:bg-white/5"
            >
              Back to dashboard
            </Button>
            <Button
              onClick={() => { setCreated(null); setForm({ candidate_name: "", candidate_email: "", job_role: "", expires_at: getDefaultExpiry(), questions: ["", "", ""] }); }}
              className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold"
            >
              Create another
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050810]">
      {/* Top nav */}
      <div className="border-b border-white/[0.06] bg-[#080c14] px-6 py-4 flex items-center gap-4">
        <Link href="/admin/dashboard" className="text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <Logo href="/admin/dashboard" size="sm" />
        <span className="text-white/20">/</span>
        <span className="text-white/60 text-sm">New Interview</span>
      </div>

      <div className="max-w-2xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Create Interview</h1>
          <p className="text-white/40 text-sm">Fill in candidate details and set up interview questions</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Candidate Details */}
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] space-y-4">
            <h2 className="text-white font-semibold text-sm mb-2">Candidate Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/60 text-xs">Full name *</Label>
                <Input
                  id="name"
                  placeholder="Jane Smith"
                  value={form.candidate_name}
                  onChange={(e) => updateForm("candidate_name", e.target.value)}
                  error={errors.candidate_name}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-white/30 focus-visible:ring-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/60 text-xs">Email address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@example.com"
                  value={form.candidate_email}
                  onChange={(e) => updateForm("candidate_email", e.target.value)}
                  error={errors.candidate_email}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-white/30 focus-visible:ring-white/10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role" className="text-white/60 text-xs">Job role *</Label>
                <Input
                  id="role"
                  placeholder="Senior Frontend Engineer"
                  value={form.job_role}
                  onChange={(e) => updateForm("job_role", e.target.value)}
                  error={errors.job_role}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-white/30 focus-visible:ring-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires" className="text-white/60 text-xs">Link expires *</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => updateForm("expires_at", e.target.value)}
                  min={minDateTime || undefined}
                  error={errors.expires_at}
                  className="bg-white/5 border-white/10 text-white focus-visible:border-white/30 focus-visible:ring-white/10 [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Interview Questions */}
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white font-semibold text-sm">Interview Questions</h2>
              <span className="text-white/30 text-xs">{form.questions.length}/5</span>
            </div>
            {errors.questions && (
              <p className="text-red-400 text-xs">{errors.questions}</p>
            )}
            {form.questions.map((q, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-white/30 mt-2.5">
                  {i + 1}
                </div>
                <Input
                  placeholder={`Question ${i + 1}...`}
                  value={q}
                  onChange={(e) => updateQuestion(i, e.target.value)}
                  error={errors[`q_${i}`]}
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-white/30 focus-visible:ring-white/10"
                />
                {form.questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(i)}
                    className="mt-2.5 p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {form.questions.length < 5 && (
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors mt-1 px-1"
              >
                <Plus className="w-4 h-4" />
                Add question
              </button>
            )}
          </div>

          {errors.submit && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {errors.submit}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating interview...
              </>
            ) : (
              <>
                Create & Send Invite
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
