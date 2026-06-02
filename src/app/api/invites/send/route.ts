import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { candidate_name, candidate_email, job_role, department, sub_department, role, expires_at, subject, body: customBody, senderEmail } = body;

    if (!candidate_name || !candidate_email || !department || !sub_department || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // 1. Fetch questions from the common question bank for this department and sub-department
    const { data: questions, error: qError } = await supabase
      .from("questions_bank")
      .select("*")
      .eq("department", department)
      .eq("sub_department", sub_department)
      .eq("role", role);

    if (qError) {
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: `No questions found for ${department} - ${sub_department} - ${role}` }, { status: 400 });
    }

    // Select all questions configured for this sub-department
    let selectedQuestions = questions.map(q => q.question_text);

    if (selectedQuestions.length === 0) {
      return NextResponse.json({ error: "Could not select any questions" }, { status: 400 });
    }

    // 4. Create the interview in Supabase
    const expiry = expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const { data: interview, error: insertError } = await supabase
      .from("interviews")
      .insert({
        candidate_name,
        candidate_email,
        job_role,
        questions: selectedQuestions,
        status: "pending",
        expires_at: expiry,
        sender_email: senderEmail || null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Failed to create interview" }, { status: 500 });
    }

    // 5. Send Email via internal API call
    const emailUrl = new URL("/api/emails/send", req.url).toString().replace("localhost", "127.0.0.1");
    const emailRes = await fetch(emailUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "invite",
        to: candidate_email,
        candidateName: candidate_name,
        jobRole: job_role,
        interviewId: interview.id,
        expiresAt: expiry,
        subject,
        bodyText: customBody,
        senderEmail,
      }),
    });

    // 6. Sync status in candidates table
    try {
      const { error: syncError } = await supabase
        .from("candidates")
        .update({
          video_status: "Pending",
          stage: "Video Interview"
        })
        .ilike("email", candidate_email.trim());
      if (syncError) {
        console.error("Failed to sync candidate invite status in candidates table:", syncError);
      } else {
        console.log(`Synced candidate ${candidate_email} status to Video Interview (Pending)`);
      }
    } catch (dbErr) {
      console.error("Failed to sync candidate invite status:", dbErr);
    }

    if (!emailRes.ok) {
      console.error("Failed to send email API");
      // We still return success but maybe warn in console
    }

    return NextResponse.json({ success: true, data: interview }, { status: 201 });
  } catch (error: any) {
    console.error("Invite send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
