"use client";

import { RecordingChunk } from "@/types";

export async function mergeVideoChunks(chunks: RecordingChunk[]): Promise<Blob> {
  // Sort chunks by question index
  const sorted = [...chunks].sort((a, b) => a.questionIndex - b.questionIndex);

  // Simple browser-compatible concatenation using MediaSource
  // Since all chunks are recorded as WebM with the same settings,
  // we concatenate the blobs directly which works for WebM files
  const allBlobs = sorted.map((c) => c.blob);
  const merged = new Blob(allBlobs, { type: "video/webm" });
  return merged;
}

export async function uploadVideoToSupabase(
  blob: Blob,
  interviewId: string,
  supabaseUrl: string,
  anonKey: string
): Promise<string> {
  if (!supabaseUrl || supabaseUrl.includes("your_supabase_project_url")) {
    console.log("Mock Supabase connection: returning mock video url.");
    return "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  }

  try {
    const formData = new FormData();
    // Convert blob to File object so next.js request can parse it as a file
    const file = new File([blob], "final-interview.webm", { type: "video/webm" });
    formData.append("video", file);
    formData.append("interviewId", interviewId);

    const response = await fetch("/api/interviews/upload", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Upload failed");
    }

    const data = await response.json();
    return data.videoUrl;
  } catch (error: any) {
    console.error("Failed to upload video to API route:", error);
    // If it fails, fallback to direct upload just in case, or throw
    throw error;
  }
}

/**
 * Upload a single question clip. Returns the public URL.
 * Routes through server-side API to use service role key (avoids client auth issues).
 */
export async function uploadClipToSupabase(
  blob: Blob,
  interviewId: string,
  questionIndex: number,
  supabaseUrl: string,
  anonKey: string
): Promise<string> {
  if (!supabaseUrl || supabaseUrl.includes("your_supabase_project_url")) {
    return `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4#q${questionIndex + 1}`;
  }

  const formData = new FormData();
  const file = new File([blob], `clip-q${questionIndex + 1}.webm`, { type: "video/webm" });
  formData.append("video", file);
  formData.append("interviewId", interviewId);
  formData.append("questionIndex", String(questionIndex));

  const response = await fetch("/api/upload-video", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(`Clip upload failed (Q${questionIndex + 1}): ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  return data.videoUrl;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
