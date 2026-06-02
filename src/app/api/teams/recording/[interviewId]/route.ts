import { NextRequest, NextResponse } from "next/server";
import { fetchRecording } from "@/services/teamsService";
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
      .select("teams_meeting_id")
      .eq("id", interviewId)
      .single();

    if (error || !interview?.teams_meeting_id) {
      return NextResponse.json(
        { error: "Teams meeting not found or not linked to this interview" },
        { status: 404 }
      );
    }

    const result = await fetchRecording(undefined, interviewId, interview.teams_meeting_id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to fetch Teams recording:", error);
    if (error.message === 'TOKEN_EXPIRED') {
      return NextResponse.json({ error: 'Microsoft session expired. Reconnect Teams.' }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch Teams recording: " + error.message },
      { status: 500 }
    );
  }
}
