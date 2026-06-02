export interface Interview {
  id: string;
  candidate_name: string;
  candidate_email: string;
  job_role: string;
  questions: string[];
  status: "pending" | "completed" | "expired";
  expires_at: string;
  created_at: string;
  completed_at: string | null;
  video_url: string | null;
  transcript: TranscriptEntry[] | null;
  summary?: string;
  scores?: Record<string, number>;
  share_token: string;
  sender_email?: string;
}

export interface TranscriptEntry {
  question: string;
  text: string;
  timestamp_start?: number;
  timestamp_end?: number;
  clip_url?: string; // URL for the individual question clip video
}

export interface CreateInterviewInput {
  candidate_name: string;
  candidate_email: string;
  job_role: string;
  questions: string[];
  expires_at: string;
}

export interface RecordingChunk {
  question: string;
  questionIndex: number;
  blob: Blob; // Actual video blob for this question's clip
  duration: number;
}

export interface InterviewStats {
  total: number;
  completed: number;
  pending: number;
  expired: number;
}
