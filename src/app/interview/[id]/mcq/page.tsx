"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Logo } from "@/components/logo";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Send,
  Award,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Stage = "loading" | "welcome" | "assessment" | "submitting" | "completed" | "error" | "no-questions";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  points_value: number;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  job_applied: string;
  mcq_status?: string;
  mcq_score?: number;
  stage: string;
}

export default function MCQAssessmentPage() {
  const params = useParams();
  const id = params.id as string;

  const [stage, setStage] = useState<Stage>("loading");
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 minutes standard limit
  const [error, setError] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [totalPossiblePoints, setTotalPossiblePoints] = useState(0);

  // Fetch candidate details and questions
  useEffect(() => {
    const loadAssessment = async () => {
      try {
        // 1. Fetch candidate
        const candRes = await fetch(`/api/candidates?id=${id}`);
        if (!candRes.ok) {
          setStage("error");
          setError("Candidate profile not found.");
          return;
        }
        const candData: Candidate = await candRes.json();
        setCandidate(candData);

        // If candidate already completed, skip directly to complete
        if (candData.mcq_status === "Completed") {
          setScore(candData.mcq_score || 0);
          setStage("completed");
          return;
        }

        // 2. Fetch jobs list to determine department & sub_department
        const jobsRes = await fetch("/api/jobs");
        if (!jobsRes.ok) {
          setStage("error");
          setError("Failed to initialize assessment environment.");
          return;
        }
        const jobsData = await jobsRes.json();
        const matchedJob = jobsData.find(
          (j: any) => j.title === candData.job_applied || j.title === (candData as any).jobApplied
        );

        const department = matchedJob?.department || "Operations";
        const subDept = matchedJob?.sub_department || "General";

        // Map candidate experience to matrix level
        // Fallback to domainExperience or default to 0
        const domainExp = (candData as any).extracted_data?.totalExperienceAnalysis?.domainExperience || 0;
        let experienceLevel = "Fresher(0)";
        if (domainExp >= 10) {
          experienceLevel = "Lead(10+)";
        } else if (domainExp >= 5) {
          experienceLevel = "Senior(5+)";
        } else if (domainExp >= 3) {
          experienceLevel = "Mid Level(3-5)";
        } else if (domainExp >= 1) {
          experienceLevel = "Junior(1-3)";
        }

        // 3. Fetch questions
        const questionsRes = await fetch(
          `/api/mcq/questions?department=${encodeURIComponent(department)}&sub_department=${encodeURIComponent(subDept)}&experience_level=${encodeURIComponent(experienceLevel)}`
        );
        if (!questionsRes.ok) {
          setStage("error");
          setError("Failed to fetch assessment questions.");
          return;
        }
        const questionsData: Question[] = await questionsRes.json();

        if (questionsData.length === 0) {
          setStage("no-questions");
          return;
        }

        setQuestions(questionsData);
        // Calculate total points
        const totalPoints = questionsData.reduce((sum, q) => sum + (q.points_value || 5), 0);
        setTotalPossiblePoints(totalPoints);

        // Dynamically adjust timer: 60s per question, min 5 minutes, max 30 minutes
        const computedTime = Math.min(Math.max(questionsData.length * 60, 300), 1800);
        setTimeLeft(computedTime);

        setStage("welcome");
      } catch (err) {
        console.error("Error loading MCQ assessment:", err);
        setStage("error");
        setError("A network error occurred while setting up your test.");
      }
    };

    if (id) {
      loadAssessment();
    }
  }, [id]);

  // Countdown timer logic
  useEffect(() => {
    if (stage !== "assessment") return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto submit when time runs out
          handleSubmitAssessment(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stage, questions, answers]);

  const handleSelectOption = (option: "A" | "B" | "C" | "D") => {
    const currentQuestion = questions[currentIndex];
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: option
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmitAssessment = async (isAutoSubmit = false) => {
    if (!candidate) return;
    setStage("submitting");

    // Calculate score
    let finalScore = 0;
    questions.forEach((q) => {
      const selected = answers[q.id];
      if (selected === q.correct_answer) {
        finalScore += q.points_value || 5;
      }
    });

    try {
      const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_SECRET || "kl_internal_admin_secret_2026_secure";
      const patchRes = await fetch("/api/candidates", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({
          id: candidate.id,
          stage: "Technical Scheduler",
          mcq_status: "Completed",
          mcq_score: finalScore,
          remark_mcq: `Scored ${finalScore}/${totalPossiblePoints} points on ${new Date().toLocaleDateString()}. ${isAutoSubmit ? "Auto-submitted due to timeout." : "Submitted by candidate."}`
        })
      });

      if (!patchRes.ok) {
        throw new Error("Failed to save score");
      }

      setScore(finalScore);
      setStage("completed");
    } catch (err) {
      console.error("Error submitting MCQ score:", err);
      setStage("error");
      setError("Failed to transmit assessment answers. Please refresh or retry.");
    }
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  // ---- UI Renders ----

  if (stage === "loading") {
    return (
      <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400 mb-4" />
        <span className="text-white/60 text-sm tracking-wider">INITIALIZING ASSESSMENT SECURITY PORTAL...</span>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center p-6">
        <div className="text-center max-w-md bg-[#0b132b] p-8 rounded-3xl border border-red-500/20 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Assessment Error</h2>
          <p className="text-white/60 leading-relaxed mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-6 py-2">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "no-questions") {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center p-6">
        <div className="text-center max-w-md bg-[#0b132b] p-8 rounded-3xl border border-teal-500/20 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">No Questions Configured</h2>
          <p className="text-white/60 leading-relaxed">
            There are currently no MCQ questions configured for your applied position and experience level. 
            Please inform your recruiting officer or hiring team.
          </p>
        </div>
      </div>
    );
  }

  if (stage === "welcome" && candidate) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-[#0b132b] rounded-3xl border border-teal-500/10 shadow-2xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
            <Logo />
            <span className="text-xs font-bold text-teal-400 bg-teal-400/10 px-3 py-1 rounded-full tracking-widest uppercase">MCQ PORTAL</span>
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-2">Welcome, {candidate.name}</h1>
          <p className="text-white/60 mb-8">
            You have been invited to complete the MCQ Objective Assessment for the position of <strong className="text-teal-400">{candidate.job_applied}</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#121c36] p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
              <span className="text-white/40 text-xs font-semibold">Total Questions</span>
              <strong className="text-2xl text-white">{questions.length} Questions</strong>
            </div>
            <div className="bg-[#121c36] p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
              <span className="text-white/40 text-xs font-semibold">Allocated Time</span>
              <strong className="text-2xl text-white">{Math.round(timeLeft / 60)} Minutes</strong>
            </div>
            <div className="bg-[#121c36] p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
              <span className="text-white/40 text-xs font-semibold">Maximum Points</span>
              <strong className="text-2xl text-white">{totalPossiblePoints} Pts</strong>
            </div>
          </div>

          <div className="bg-teal-500/5 border border-teal-500/10 p-5 rounded-2xl mb-8">
            <h3 className="text-sm font-bold text-teal-400 mb-2 flex items-center gap-2">
              <AlertCircle size={16} /> Important Guidelines:
            </h3>
            <ul className="text-xs text-white/70 space-y-2 list-disc list-inside">
              <li>Each question in the assessment has a specific points value.</li>
              <li>Once you start, the timer will run continuously. Exiting the tab will not pause the timer.</li>
              <li>Ensure you have a stable network connection before starting.</li>
              <li>When the timer expires, your answers will be automatically submitted.</li>
            </ul>
          </div>

          <Button 
            onClick={() => setStage("assessment")}
            className="w-full py-6 bg-teal-500 hover:bg-teal-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-teal-500/20 transition-all duration-200"
          >
            Start Assessment
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "assessment" && candidate) {
    const currentQuestion = questions[currentIndex];
    const selectedAnswer = answers[currentQuestion.id];
    const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

    return (
      <div className="min-h-screen bg-[#050810] text-white flex flex-col">
        {/* Top Header */}
        <header className="border-b border-white/5 bg-[#080d1a] py-4 px-6 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="h-6 w-[1px] bg-white/10 hidden md:block" />
            <span className="text-sm text-white/60 hidden md:block">{candidate.job_applied}</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-teal-400 bg-teal-400/5 border border-teal-400/20 px-4 py-2 rounded-xl">
              <Clock size={16} className="animate-pulse" />
              <span className="font-mono font-bold text-sm tracking-wider">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Questions Grid Navigator */}
          <div className="lg:col-span-1 bg-[#0b132b] border border-white/5 rounded-3xl p-6 h-fit">
            <h3 className="text-xs font-bold text-white/40 tracking-widest uppercase mb-4">Questions Overview</h3>
            <div className="grid grid-cols-4 gap-3">
              {questions.map((q, idx) => {
                const isSelected = idx === currentIndex;
                const isAnswered = !!answers[q.id];
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`py-2 rounded-xl font-bold text-sm transition-all duration-150 ${
                      isSelected
                        ? "bg-teal-500 text-white shadow-lg shadow-teal-500/25 ring-2 ring-teal-400/50"
                        : isAnswered
                        ? "bg-teal-950/40 border border-teal-500/40 text-teal-400"
                        : "bg-[#121c36] border border-white/5 text-white/50 hover:bg-[#182647] hover:text-white"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Total Answered</span>
                <span className="font-bold text-white">{Object.keys(answers).length} / {questions.length}</span>
              </div>
              <div className="w-full bg-[#121c36] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-teal-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question display area */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="bg-[#0b132b] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold text-teal-400 bg-teal-400/10 px-3 py-1 rounded-full">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="text-xs text-white/40 font-semibold bg-[#121c36] px-3 py-1 rounded-full border border-white/5">
                  {currentQuestion.points_value || 5} Points
                </span>
              </div>

              <h2 className="text-xl font-semibold text-white leading-relaxed mb-8">
                {currentQuestion.question_text}
              </h2>

              {/* Options Stack */}
              <div className="flex flex-col gap-4">
                {[
                  { key: "A", text: currentQuestion.option_a },
                  { key: "B", text: currentQuestion.option_b },
                  { key: "C", text: currentQuestion.option_c },
                  { key: "D", text: currentQuestion.option_d }
                ].map((opt) => {
                  const isSelected = selectedAnswer === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleSelectOption(opt.key as any)}
                      className={`w-full p-5 rounded-2xl text-left border transition-all duration-150 flex items-center gap-4 group ${
                        isSelected
                          ? "bg-teal-500/10 border-teal-500 text-white shadow-inner"
                          : "bg-[#121c36] border-white/5 text-white/80 hover:bg-[#182647] hover:border-white/10 hover:text-white"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-150 ${
                        isSelected
                          ? "bg-teal-500 text-white"
                          : "bg-[#0b132b] border border-white/10 text-white/50 group-hover:border-white/20"
                      }`}>
                        {opt.key}
                      </div>
                      <span className="flex-1 font-medium text-sm md:text-base">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between">
              <Button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="bg-[#0b132b] hover:bg-[#121c36] border border-white/5 text-white/80 rounded-xl px-6 py-5 flex items-center gap-2 disabled:opacity-40"
              >
                <ArrowLeft size={16} /> Previous
              </Button>

              {currentIndex < questions.length - 1 ? (
                <Button
                  onClick={handleNext}
                  className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl px-8 py-5 flex items-center gap-2"
                >
                  Next <ArrowRight size={16} />
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to submit your assessment?")) {
                      handleSubmitAssessment(false);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 py-5 flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  Submit Assessment <Send size={14} />
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (stage === "submitting") {
    return (
      <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <span className="text-white/60 text-sm tracking-wider">SECURING ANSWERS AND CALCULATING RESULTS...</span>
      </div>
    );
  }

  if (stage === "completed" && candidate) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#0b132b] rounded-3xl border border-teal-500/10 shadow-2xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-20 h-20 rounded-3xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-6">
            <Award className="w-10 h-10 text-teal-400" />
          </div>

          <h2 className="text-3xl font-extrabold text-white mb-2">Assessment Completed</h2>
          <p className="text-teal-400 font-bold mb-6">Objective Evaluation Result Saved</p>

          <div className="bg-[#121c36] border border-white/5 rounded-2xl p-6 mb-8 flex flex-col items-center justify-center gap-2">
            <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">Final MCQ Score</span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">{score}</span>
              <span className="text-white/40 text-sm">/ {totalPossiblePoints} pts</span>
            </div>
          </div>

          <p className="text-sm text-white/50 leading-relaxed mb-6">
            Thank you, <strong>{candidate.name}</strong>. Your test answers have been securely synced with the ElastiCrew hiring dashboard. 
            Recruiters will review your submission and contact you for the next steps.
          </p>

          <div className="text-xs text-white/30 border-t border-white/5 pt-4">
            Security Token: {candidate.id.substring(0, 8)}-MCQ-COMPLETED
          </div>
        </div>
      </div>
    );
  }

  return null;
}
