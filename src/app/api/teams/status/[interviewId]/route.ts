import { NextRequest, NextResponse } from "next/server";
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

    const { data: interview, error } = await supabase
      .from("interviews")
      .select(`
        teams_meeting_id,
        teams_join_url,
        teams_start_time,
        teams_end_time,
        teams_recording_url,
        teams_recording_status,
        teams_transcript_id,
        teams_transcript_text,
        teams_transcript_fetched_at,
        teams_ai_summary,
        teams_ai_skills,
        teams_ai_communication,
        teams_ai_strengths,
        teams_ai_weaknesses,
        teams_ai_recommendation
      `)
      .eq("id", interviewId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(interview);
  } catch (error: any) {
    console.error("Failed to fetch Teams interview status:", error);
    return NextResponse.json(
      { error: "Failed to fetch Teams interview status: " + error.message },
      { status: 500 }
    );
  }
}
