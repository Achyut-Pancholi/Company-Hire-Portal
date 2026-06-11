"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function CandidateFormPage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [skills, setSkills] = useState("");
  const [jobApplied, setJobApplied] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchCandidate();
  }, [id]);

  const fetchCandidate = async () => {
    try {
      const res = await fetch(`/api/candidates?id=${id}`);
      if (!res.ok) {
        throw new Error("Candidate not found or invalid link.");
      }
      const data = await res.json();
      
      if (data.form_status === "Submitted") {
        setSuccess(true);
      } else {
        setName(data.name || "");
        setEmail(data.email || "");
        setSkills(Array.isArray(data.skills) ? data.skills.join(", ") : "");
        setJobApplied(data.job_applied || "");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load candidate form.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert("Name and Email are required");
      return;
    }

    setSubmitting(true);
    try {
      const parsedSkills = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          email,
          skills: parsedSkills,
          form_status: "Submitted",
          stage: "Video Interview", // automatically move candidate to video interview stage
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit form details.");
      }

      setSuccess(true);
    } catch (err: any) {
      alert(err.message || "Error submitting form");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050810] text-white flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white/60 text-sm font-medium">Loading candidate form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050810] text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white/[0.02] border border-red-500/20 rounded-2xl p-8 text-center backdrop-blur-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl font-bold">!</span>
          </div>
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-white/50 text-sm leading-relaxed mb-6">{error}</p>
          <p className="text-xs text-white/30">Please contact the hiring team if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#050810] text-white flex flex-col items-center justify-center p-6">
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-full max-w-md bg-white/[0.02] border border-white/10 rounded-3xl p-8 text-center backdrop-blur-xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-emerald-400 text-3xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Application Submitted!</h2>
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            Thank you for completing your candidate form for the <strong className="text-white">{jobApplied || "job"}</strong> position. 
            We have saved your details.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left">
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider block mb-1">What's Next?</span>
            <p className="text-white/70 text-xs leading-normal">
              Our team will review your details. You will receive an invitation email containing the link to complete your AI video interview shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050810] text-white flex flex-col items-center justify-center p-6 relative">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-lg bg-[#0d111b]/80 border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl relative">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold tracking-tight text-white mb-4">
            ElastiCrew
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Candidate Information Form</h2>
          <p className="text-white/50 text-sm">
            Please review, verify, and complete your details for the <strong className="text-blue-400">{jobApplied}</strong> role.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block">Full Name</label>
            <div className="relative">
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <input
                type="email"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block">Skills (Comma-separated)</label>
            <div className="relative">
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all h-28 resize-none"
                placeholder="e.g. React, Node.js, Python, CSS"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>
            <span className="text-[11px] text-white/30 block mt-1">
              Add or remove skills parsed from your resume to help us align your application.
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 text-sm shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}
