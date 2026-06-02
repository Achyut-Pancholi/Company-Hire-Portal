import { NextRequest, NextResponse } from "next/server";
import { fetchTranscript } from "@/services/teamsService";
import { analyzeTranscript } from "@/services/transcriptAnalysis";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const { interviewId } = await params;

    // 1. Get interview meeting ID
    const { data: interview, error } = await supabase
      .from("interviews")
      .select("teams_meeting_id")
      .eq("id", interviewId)
      .single();

    if (error || !interview?.teams_meeting_id) {
      return NextResponse.json(
        { error: "Teams meeting not found or not linked to this interview" },
        { status: 404 }
      );
    }

    // 2. Fetch transcript from Microsoft Graph
    const transcriptResult = await fetchTranscript(undefined, interviewId, interview.teams_meeting_id);
    if (transcriptResult.status === "not_available") {
      return NextResponse.json(transcriptResult); // returns { status: 'not_available', message: ... }
    }

    // 3. Analyze transcript text using Claude AI
    const analysisResult = await analyzeTranscript(interviewId);

    return NextResponse.json({
      status: "available",
      transcript: transcriptResult.transcript,
      analysis: analysisResult.analysis || null,
      error: analysisResult.error || null,
    });
  } catch (error: any) {
    console.error("Failed to fetch and analyze Teams transcript:", error);
    if (error.message === 'TOKEN_EXPIRED') {
      return NextResponse.json({ error: 'Microsoft session expired. Reconnect Teams.' }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch and analyze transcript: " + error.message },
      { status: 500 }
    );
  }
}
