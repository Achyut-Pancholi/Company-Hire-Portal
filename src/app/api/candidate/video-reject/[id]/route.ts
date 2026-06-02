export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { requireInternalSecret } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireInternalSecret(request);
  if (authError) return authError;

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
  }

  let reason = "";
  try {
    const body = await request.json();
    reason = body?.reason?.trim() ?? "";
  } catch {
    // reason optional
  }

  try {
    const supabase = getServiceSupabase();

    const { data: candidate, error: fetchError } = await supabase
      .from("candidates")
      .select("id, resume_stage_status, video_stage_status, workflow_locked")
      .eq("id", id)
      .single();

    if (fetchError || !candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Guard: resume must be approved first
    if (candidate.resume_stage_status !== "Approved") {
      return NextResponse.json(
        {
          error: "Cannot reject video screening: resume has not been approved yet.",
          code: "INVALID_STAGE_TRANSITION",
        },
        { status: 422 }
      );
    }

    // Guard: duplicate action
    if (candidate.video_stage_status === "Approved" || candidate.video_stage_status === "Rejected") {
      return NextResponse.json(
        {
          error: `Video screening has already been ${candidate.video_stage_status.toLowerCase()}.`,
          code: "ALREADY_PROCESSED",
        },
        { status: 409 }
      );
    }

    // Reject video: TERMINAL — lock the workflow
    const { data: updated, error: updateError } = await supabase
      .from("candidates")
      .update({
        video_stage_status: "Rejected",
        current_stage: "Rejected at Video Stage",
        stage_order: 0,
        workflow_locked: true, // TERMINAL
        rejected_reason: reason || null,
        rejected_at: new Date().toISOString(),
        final_recommendation: "Rejected",
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[video-reject] Update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    revalidatePath("/", "layout");
    return NextResponse.json({ success: true, candidate: updated });
  } catch (err: any) {
    console.error("[video-reject] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
