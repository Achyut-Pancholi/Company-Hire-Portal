import { NextRequest, NextResponse } from "next/server";
import { createTeamsMeeting } from "@/services/teamsService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { interviewId, startTime, endTime, attendeeEmails, subject } = body;

    if (!startTime || !endTime || !attendeeEmails || !subject) {
      return NextResponse.json({ error: "Missing required meeting parameters" }, { status: 400 });
    }

    const meeting = await createTeamsMeeting(undefined, interviewId || undefined, {
      subject,
      startTime,
      endTime,
      attendeeEmails,
    });

    return NextResponse.json({ success: true, joinUrl: meeting.joinUrl });
  } catch (error: any) {
    console.error("Failed to create Teams meeting:", error);
    if (error.message === 'PERMISSION_DENIED') {
      return NextResponse.json({ error: 'Missing Teams permissions. Contact your Azure admin.' }, { status: 403 });
    } else if (error.message === 'TOKEN_EXPIRED') {
      return NextResponse.json({ error: 'Microsoft session expired. Reconnect Teams.' }, { status: 401 });
    } else {
      return NextResponse.json({ error: 'Failed to create Teams meeting: ' + error.message }, { status: 500 });
    }
  }
}
