"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Interview, RecordingChunk } from "@/types";
import { isExpired } from "@/lib/utils";
import { Logo } from "@/components/logo";
import {
  Video,
  Mic,
  Play,
  Square,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mergeVideoChunks, uploadVideoToSupabase, uploadClipToSupabase } from "@/lib/video/merge";

type Stage =
  | "loading"
  | "welcome"
  | "permissions"
  | "instructions"
  | "interview"
  | "processing"
  | "completed"
  | "error"
  | "expired"
  | "already-completed"
  | "in-progress-blocked";

export default function InterviewPage() {
  const params = useParams();
  const id = params.id as string;

  const [stage, setStage] = useState<Stage>("loading");
  const [interview, setInterview] = useState<Interview | null>(null);
  const [error, setError] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [allChunks, setAllChunks] = useState<RecordingChunk[]>([]);
  const [strikes, setStrikes] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const rawChunksRef = useRef<Blob[]>([]);
  const currentClipChunksRef = useRef<Blob[]>([]); // holds chunks for current question's recording
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isRecordingRef = useRef(false);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedCamera, setSelectedCamera] = useState<string>("");

  // Fetch interview
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/interviews/${id}`, { cache: "no-store" });
        if (!res.ok) { setStage("error"); setError("Interview not found."); return; }
        const { data } = await res.json();
        if (!data) { setStage("error"); setError("Interview not found."); return; }

        if (data.status === "completed") { setStage("already-completed"); return; }
        if (data.status === "in_progress") { setStage("in-progress-blocked"); return; }
        if (isExpired(data.expires_at)) { setStage("expired"); return; }

        setInterview(data);
        setStage("welcome");
      } catch {
        setStage("error");
        setError("Failed to load the interview. Please try again.");
      }
    };
    load();
  }, [id]);

  // Draw canvas loop
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !interview) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const question = interview.questions[currentQuestionIndex];

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    if (isRecordingRef.current) {
      // Overlay strip
      const overlayH = 68;
      const pad = 18;

      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(0, 0, canvas.width, overlayH);

      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(0, 0, 4, overlayH);

      ctx.font = "bold 11px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#93c5fd";
      ctx.fillText(`Q${currentQuestionIndex + 1}`, pad, 22);

      const maxW = canvas.width - pad * 2 - 40;
      ctx.font = "14px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      const words = question.split(" ");
      let line = "";
      let lineY = 42;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        if (ctx.measureText(testLine).width > maxW && i > 0) {
          ctx.fillText(line.trim(), pad + 32, lineY);
          line = words[i] + " ";
          lineY += 16;
          if (lineY > overlayH - 6) break;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), pad + 32, lineY);

      // REC dot
      const elapsed = Date.now() - startTimeRef.current;
      const opacity = 0.5 + 0.5 * Math.sin(elapsed / 300);
      ctx.beginPath();
      ctx.arc(canvas.width - 20, 20, 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239, 68, 68, ${opacity})`;
      ctx.fill();
    }

    animFrameRef.current = requestAnimationFrame(drawFrame);
  }, [currentQuestionIndex, interview]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      // Auto-submit: stop recording if active, then advance
      if (isRecordingRef.current) {
        handleSubmitAnswer();
      } else {
        // They never started — record a 0-duration clip and move on
        const autoChunk: RecordingChunk = {
          question: interview?.questions[currentQuestionIndex] || "",
          questionIndex: currentQuestionIndex,
          blob: new Blob([], { type: "video/webm" }),
          duration: 0,
        };
        setAllChunks((prev) => {
          const updated = [...prev, autoChunk];
          const nextIndex = currentQuestionIndex + 1;
          const isLast = !interview || nextIndex >= interview.questions.length;
          if (isLast) {
            processAndUpload(updated);
          } else {
            setCurrentQuestionIndex(nextIndex);
            speakQuestion(interview!.questions[nextIndex]);
          }
          return updated;
        });
      }
      return;
    }
    const timerId = setTimeout(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => clearTimeout(timerId);
  }, [timeLeft]);

  useEffect(() => {
    if (isCameraReady) {
      animFrameRef.current = requestAnimationFrame(drawFrame);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isCameraReady, drawFrame]);

  // Re-attach stream if video element unmounts/remounts between stages
  useEffect(() => {
    if (streamRef.current && videoRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
    if (canvasRef.current) {
      canvasRef.current.width = 1280;
      canvasRef.current.height = 720;
    }
  }, [stage]);

  // Auto-start recording + timer the moment AI finishes speaking a question
  useEffect(() => {
    if (stage === "interview" && !isSpeaking && isCameraReady) {
      // Small delay so UI settles after speech ends
      const t = setTimeout(() => {
        startRecording();
      }, 400);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking, currentQuestionIndex, stage]);

  const initCamera = async (micId?: string, camId?: string) => {
    try {
      const constraints: MediaStreamConstraints = {
        video: camId ? { deviceId: { exact: camId } } : true,
        audio: micId ? { deviceId: { exact: micId } } : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (canvasRef.current) {
        canvasRef.current.width = 1280;
        canvasRef.current.height = 720;
      }
      setIsCameraReady(true);
      
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(allDevices);
      
      if (!micId && !camId) {
        const audioInput = allDevices.find(d => d.kind === "audioinput");
        const videoInput = allDevices.find(d => d.kind === "videoinput");
        if (audioInput) setSelectedMic(audioInput.deviceId);
        if (videoInput) setSelectedCamera(videoInput.deviceId);
      }

      setStage("instructions");
    } catch (err: any) {
      console.error("Camera error:", err);
      setError(`Could not access camera or microphone: ${err.name || err.message}. Please allow permissions and try again.`);
    }
  };

  const handleDeviceChange = async (type: "audio" | "video", deviceId: string) => {
    if (type === "audio") setSelectedMic(deviceId);
    if (type === "video") setSelectedCamera(deviceId);
    
    const newMic = type === "audio" ? deviceId : selectedMic;
    const newCam = type === "video" ? deviceId : selectedCamera;
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    await initCamera(newMic, newCam);
  };

  const speakQuestion = (text: string) => {
    return new Promise<void>((resolve) => {
      if (!window.speechSynthesis) { resolve(); return; }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      setIsSpeaking(true);
      utterance.onend = () => { setIsSpeaking(false); resolve(); };
      utterance.onerror = () => { setIsSpeaking(false); resolve(); };
      window.speechSynthesis.speak(utterance);
    });
  };

  const startInterview = async () => {
    // 1. Request full screen synchronously inside the user gesture
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(e => {
        console.error("Fullscreen error:", e);
        alert("Warning: Could not enter full screen. Please ensure your browser allows full screen.");
      });
    }
    
    setStage("interview");

    // 2. Wait for backend to confirm the 'in_progress' status
    try {
      await fetch(`/api/interviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" })
      });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
    
    // 3. Start AI voice
    if (interview) {
      await speakQuestion(interview.questions[0]);
    }
  };

  const handleEarlyTermination = async () => {
    let chunk: RecordingChunk;
    if (isRecordingRef.current) {
       chunk = await stopRecording();
    } else {
       chunk = {
         question: interview!.questions[currentQuestionIndex],
         questionIndex: currentQuestionIndex,
         blob: new Blob(currentClipChunksRef.current, { type: "video/webm" }),
         duration: 0,
       };
    }

    await processAndUpload([...allChunks, chunk]);
  };

  useEffect(() => {
    if (stage !== "interview") return;

    const handleViolation = () => {
      if (stage !== "interview") return;
      
      setStrikes(s => {
        const newStrikes = s + 1;
        if (newStrikes >= 3) {
          handleEarlyTermination();
        } else {
          setShowWarning(true);
          if (isRecordingRef.current && recorderRef.current?.state === "recording") {
            recorderRef.current.pause();
          }
        }
        return newStrikes;
      });
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement && !showWarning) handleViolation();
    };

    const onVisibilityChange = () => {
      if (document.hidden && !showWarning) handleViolation();
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [stage, showWarning]);

  const startRecording = () => {
    if (!streamRef.current) return;
    // Prevent double-start if already recording
    if (isRecordingRef.current) return;

    // Fresh recorder for each question — gives us a clean individual clip
    currentClipChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";

    const recorder = new MediaRecorder(streamRef.current, { mimeType, videoBitsPerSecond: 1000000 });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) currentClipChunksRef.current.push(e.data);
    };
    recorderRef.current = recorder;
    recorder.start(250);

    startTimeRef.current = Date.now();
    isRecordingRef.current = true;
    setIsRecording(true);
    // Start the 60-second countdown (timer drives itself via the timeLeft useEffect)
    setTimeLeft(60);
  };

  const stopRecording = (): Promise<RecordingChunk> => {
    const duration = (Date.now() - startTimeRef.current) / 1000;
    isRecordingRef.current = false;
    setIsRecording(false);
    setTimeLeft(null);

    return new Promise<RecordingChunk>((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        const chunk: RecordingChunk = {
          question: interview!.questions[currentQuestionIndex],
          questionIndex: currentQuestionIndex,
          blob: new Blob(currentClipChunksRef.current, { type: "video/webm" }),
          duration,
        };
        resolve(chunk);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(currentClipChunksRef.current, { type: "video/webm" });
        const chunk: RecordingChunk = {
          question: interview!.questions[currentQuestionIndex],
          questionIndex: currentQuestionIndex,
          blob,
          duration,
        };
        resolve(chunk);
      };
      recorder.stop();
    });
  };

  const handleSubmitAnswer = async () => {
    const chunk = await stopRecording();
    setAllChunks((prev) => [...prev, chunk]);
    const nextIndex = currentQuestionIndex + 1;
    const isLast = !interview || nextIndex >= interview.questions.length;

    if (isLast) {
      await processAndUpload([...allChunks, chunk]);
    } else {
      setCurrentQuestionIndex(nextIndex);
      if (interview) {
        await speakQuestion(interview.questions[nextIndex]);
      }
    }
  };

  const processAndUpload = async (chunks: RecordingChunk[]) => {
    setStage("processing");
    try {
      setProcessingProgress(10);

      // Stop camera
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());

      // Sort by question index
      const sorted = [...chunks].sort((a, b) => a.questionIndex - b.questionIndex);

      // 1. Upload each individual clip
      const progressPerClip = 60 / sorted.length;
      const clipUrls: string[] = [];
      for (let i = 0; i < sorted.length; i++) {
        const clipUrl = await uploadClipToSupabase(
          sorted[i].blob,
          id,
          sorted[i].questionIndex,
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        clipUrls.push(clipUrl);
        setProcessingProgress(10 + Math.round((i + 1) * progressPerClip));
      }

      // 2. Upload merged/concatenated video for backward compatibility
      const mergedBlob = new Blob(sorted.map(c => c.blob), { type: "video/webm" });
      const videoUrl = await uploadVideoToSupabase(
        mergedBlob,
        id,
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      setProcessingProgress(80);

      // 3. Build transcript entries with clip_url + cumulative timestamps
      let currentOffset = 0;
      const questionTimestamps = sorted.map((c, i) => {
        const start = currentOffset;
        currentOffset += c.duration;
        return {
          question: c.question,
          text: "",
          timestamp_start: start,
          timestamp_end: currentOffset,
          clip_url: clipUrls[i],
        };
      });

      setProcessingProgress(90);

      // 4. Mark completed in DB
      await fetch(`/api/interviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          completed_at: new Date().toISOString(),
          video_url: videoUrl,
          transcript: questionTimestamps,
        }),
      });

      setProcessingProgress(100);

      // 5. Send completion email to admin (best effort)
      fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "completion",
          to: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@company.com",
          candidateName: interview?.candidate_name,
          jobRole: interview?.job_role,
          reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/video-bot-admin/dashboard/interviews/${id}`,
        }),
      }).catch(() => {}); // non-blocking

      setStage("completed");
    } catch (err) {
      console.error(err);
      setStage("error");
      setError("Failed to process your interview. Please contact support.");
    }
  };

  // ---- UI Renders ----

  // ---- UI Renders ----

  if (stage === "loading") {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (stage === "expired") {
    return (
      <FullScreenMessage
        icon={<AlertCircle className="w-10 h-10 text-amber-500" />}
        color="amber"
        title="Link Expired"
        message="This interview link has expired. Please contact your recruiter for a new link."
      />
    );
  }

  if (stage === "already-completed") {
    return (
      <FullScreenMessage
        icon={<CheckCircle2 className="w-10 h-10 text-emerald-500" />}
        color="emerald"
        title="Already Completed"
        message="This interview has already been completed. Thank you for your time!"
      />
    );
  }

  if (stage === "in-progress-blocked") {
    return (
      <FullScreenMessage
        icon={<AlertCircle className="w-10 h-10 text-red-500" />}
        color="red"
        title="Session Already Started"
        message="This interview session has already been started. To ensure fairness, refreshing or leaving the page during the interview is not permitted."
      />
    );
  }

  if (stage === "error") {
    return (
      <FullScreenMessage
        icon={<AlertCircle className="w-10 h-10 text-red-500" />}
        color="red"
        title="Something went wrong"
        message={error || "An unexpected error occurred."}
      />
    );
  }

  if (stage === "completed") {
    return (
      <FullScreenMessage
        icon={<CheckCircle2 className="w-14 h-14 text-emerald-500" />}
        color="emerald"
        title="Interview Complete! 🎉"
        message={`Thank you, ${interview?.candidate_name?.split(" ")[0]}! Your interview for ${interview?.job_role} has been submitted. We'll be in touch soon.`}
        subtitle="You can now close this tab."
      />
    );
  }

  if (stage === "processing") {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-800">
        <div className="text-center max-w-sm p-8 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Processing your interview</h2>
          <p className="text-slate-500 text-sm mb-6 font-medium">
            Merging your answers and uploading the final video...
          </p>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${processingProgress}%` }}
            />
          </div>
          <p className="text-slate-400 text-xs font-bold mt-3">{processingProgress}%</p>
        </div>
      </div>
    );
  }

  if (stage === "welcome" && interview) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-800">
        <div className="max-w-lg w-full text-center p-8 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
            <Video className="w-8 h-8 text-white" />
          </div>
          <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-3">Video Interview</p>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Hello, {interview.candidate_name.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-400 text-base mb-1">
            You&apos;re interviewing for
          </p>
          <p className="text-slate-800 font-bold text-lg mb-8">{interview.job_role}</p>

          <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-slate-50/50 text-left space-y-3 mb-8">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">What to expect</p>
            {[
              `${interview.questions.length} questions asked by our AI`,
              "You control when to start and stop recording each answer",
              "Your webcam and microphone will be used",
              "Ensure you're in a quiet, well-lit space",
              "This is a one-time link — do not refresh the page",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-slate-600 text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={() => setStage("permissions")}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20"
          >
            Continue to Setup
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "permissions") {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-800">
        <div className="max-w-lg w-full text-center p-8 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
          <div className="flex gap-4 justify-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-sm">
              <Video className="w-6 h-6 text-slate-500" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-sm">
              <Mic className="w-6 h-6 text-slate-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Camera & Microphone Access</h2>
          <p className="text-slate-500 text-sm mb-8">
            We need access to your camera and microphone to record your interview answers. When prompted, click &quot;Allow&quot;.
          </p>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm mb-5 font-medium shadow-sm">
              {error}
            </div>
          )}

          <Button
            onClick={() => initCamera()}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20"
          >
            Grant Access & Continue
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "instructions" && interview) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-800">
        <div className="max-w-3xl w-full p-8 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Webcam preview */}
            <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-200 aspect-video shadow-md">
              <canvas ref={canvasRef} className="w-full h-full object-cover hidden" />
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline style={{ transform: "scaleX(-1)" }} />
              {isCameraReady && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 rounded-full px-2.5 py-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white text-xs font-semibold">Camera ready</span>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to start?</h2>
              <div className="space-y-4 mb-6">
                {[
                  { step: "1", text: "AI reads the question aloud", icon: Volume2 },
                  { step: "2", text: 'Click "Start Answer" to begin recording', icon: Mic },
                  { step: "3", text: 'Click "Submit Answer" when done', icon: Square },
                  { step: "4", text: "Repeat for all questions", icon: ChevronRight },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.step} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Icon className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <p className="text-slate-600 text-sm font-medium leading-relaxed mt-0.5">{s.text}</p>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3 mb-6 bg-slate-50/50 p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
                <div>
                  <label className="text-xs text-slate-500 font-bold mb-1.5 block">Microphone</label>
                  <select 
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                    value={selectedMic}
                    onChange={(e) => handleDeviceChange("audio", e.target.value)}
                  >
                    {devices.filter(d => d.kind === "audioinput").map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 5)}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold mb-1.5 block">Camera</label>
                  <select 
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                    value={selectedCamera}
                    onChange={(e) => handleDeviceChange("video", e.target.value)}
                  >
                    {devices.filter(d => d.kind === "videoinput").map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                onClick={startInterview}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20"
              >
                <Play className="w-4 h-4 mr-2" />
                Begin Interview
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main interview stage
  if (stage === "interview" && interview) {
    const question = interview.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === interview.questions.length - 1;

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-800">
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
            style={{ width: `${((currentQuestionIndex + 1) / interview.questions.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-white flex items-center justify-between shadow-sm">
          <Logo href="/" size="sm" />
          <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold">
            <span>Question {currentQuestionIndex + 1} of {interview.questions.length}</span>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-4xl w-full p-8 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Webcam */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-200 aspect-video shadow-md">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  style={{ transform: "scaleX(-1)" }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {isRecording && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-500/90 rounded-full px-2.5 py-1">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span className="text-white text-xs font-semibold">REC</span>
                  </div>
                )}

                {isSpeaking && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 rounded-full px-2.5 py-1">
                    <Volume2 className="w-3 h-3 text-blue-400 animate-pulse" />
                    <span className="text-white/70 text-xs font-semibold">AI speaking...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col justify-center gap-5">

              {/* ── Countdown Timer Ring ── */}
              {timeLeft !== null && (
                <div className="flex flex-col items-center gap-2">
                  {/* SVG ring */}
                  <div className="relative">
                    <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="#e2e8f0" strokeWidth="7" />
                      <circle
                        cx="48" cy="48" r="40"
                        fill="none"
                        stroke={timeLeft <= 10 ? "#ef4444" : timeLeft <= 20 ? "#f59e0b" : "#6366f1"}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - timeLeft / 60)}`}
                        style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        className="font-mono font-black text-2xl leading-none"
                        style={{ color: timeLeft <= 10 ? "#ef4444" : timeLeft <= 20 ? "#f59e0b" : "#6366f1" }}
                      >
                        {timeLeft < 10 ? `0:0${timeLeft}` : `0:${timeLeft}`}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">left</span>
                    </div>
                  </div>
                  <p className={`text-xs font-semibold ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-slate-400"}`}>
                    {isRecording
                      ? timeLeft <= 10 ? "⚠ Wrapping up soon…" : "Recording your answer"
                      : "Recording starts automatically"}
                  </p>
                </div>
              )}

              {/* ── Speaking indicator (before timer appears) ── */}
              {isSpeaking && timeLeft === null && (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="flex gap-1 items-end h-8">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-blue-500 rounded-full"
                        style={{
                          height: `${20 + Math.sin(Date.now() / 200 + i) * 10}px`,
                          animation: `pulse ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-blue-600">AI is reading the question…</p>
                </div>
              )}

              {/* ── Question card ── */}
              <div className="p-5 rounded-2xl border border-blue-100 bg-blue-50/50 shadow-sm">
                <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-3">
                  Question {currentQuestionIndex + 1}
                </p>
                <p className="text-slate-800 text-lg leading-relaxed font-bold">{question}</p>
              </div>

              {/* ── Submit / status ── */}
              <div className="space-y-3">
                {isRecording && (
                  <Button
                    onClick={handleSubmitAnswer}
                    className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/20"
                    id="submit-answer-btn"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    {isLastQuestion ? "Submit Final Answer" : "Done — Submit Answer"}
                  </Button>
                )}

                <Button
                  onClick={() => speakQuestion(question)}
                  disabled={isSpeaking || isRecording}
                  variant="ghost"
                  className="w-full h-10 text-slate-400 hover:text-slate-700 text-sm disabled:opacity-30"
                >
                  <Volume2 className="w-3.5 h-3.5 mr-2" />
                  Replay question
                </Button>
              </div>
            </div>
          </div>
        </div>

        {showWarning && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
            <AlertCircle className="w-16 h-16 text-red-500 mb-6 animate-bounce" />
            <h2 className="text-3xl font-bold text-white mb-4">Warning: Do Not Exit Full Screen</h2>
            <p className="text-red-400 text-lg mb-8 max-w-lg text-center leading-relaxed">
              You have switched tabs or exited full screen. This is a violation of the test rules. 
              <br/><br/>
              <span className="font-bold text-white text-xl">Strike: {strikes} of 3.</span> 
              <br/>On your 3rd strike, your interview will be terminated automatically.
            </p>
            <Button onClick={() => {
              if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().then(() => {
                  setShowWarning(false);
                  if (isRecordingRef.current && recorderRef.current?.state === "paused") {
                    recorderRef.current.resume();
                  }
                }).catch(console.error);
              } else {
                setShowWarning(false);
              }
            }} className="h-14 px-8 bg-red-600 hover:bg-red-700 text-white text-lg rounded-xl shadow-lg shadow-red-600/20">
              Return to Full Screen & Resume
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function FullScreenMessage({
  icon,
  color,
  title,
  message,
  subtitle,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  message: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className={`w-20 h-20 rounded-3xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center mx-auto mb-6`}>
          {icon}
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
        <p className="text-white/40 leading-relaxed">{message}</p>
        {subtitle && <p className="text-white/20 text-sm mt-4">{subtitle}</p>}
      </div>
    </div>
  );
}
