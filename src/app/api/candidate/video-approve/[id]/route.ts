export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { requireInternalSecret } from "@/lib/auth";
import { getCurrentAdminIdentifier } from "@/lib/adminIdentifier";
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
          error: "Cannot approve video screening: resume has not been approved yet.",
          code: "INVALID_STAGE_TRANSITION",
        },
        { status: 422 }
      );
    }

    // Guard: duplicate action check
    if (candidate.video_stage_status === "Approved" || candidate.video_stage_status === "Rejected") {
      return NextResponse.json(
        {
          error: `Video screening has already been ${candidate.video_stage_status.toLowerCase()}.`,
          code: "ALREADY_PROCESSED",
        },
        { status: 409 }
      );
    }

    const adminId = await getCurrentAdminIdentifier(request);

    // Approve video: pipeline continues — do NOT lock
    const { data: updated, error: updateError } = await supabase
      .from("candidates")
      .update({
        video_stage_status: "Approved",
        current_stage: "Technical Scheduler",
        stage_order: 3,
        workflow_locked: false, // pipeline continues
        approved_by: adminId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[video-approve] Update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    revalidatePath("/", "layout");
    return NextResponse.json({ success: true, candidate: updated });
  } catch (err: any) {
    console.error("[video-approve] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
