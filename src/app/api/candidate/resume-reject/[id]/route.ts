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
    // reason is optional — no body is fine
  }

  try {
    const supabase = getServiceSupabase();

    const { data: candidate, error: fetchError } = await supabase
      .from("candidates")
      .select("id, resume_status, workflow_locked")
      .eq("id", id)
      .single();

    if (fetchError || !candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    if (candidate.resume_status === "Approved" || candidate.resume_status === "Rejected") {
      return NextResponse.json(
        {
          error: `Candidate resume has already been ${candidate.resume_status.toLowerCase()}. No further action allowed.`,
          code: "ALREADY_PROCESSED",
        },
        { status: 409 }
      );
    }

    // Reject: TERMINAL — lock the workflow
    const { data: updated, error: updateError } = await supabase
      .from("candidates")
      .update({
        resume_status: "Rejected",
        current_stage: "Rejected at Resume Stage",
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
      console.error("[resume-reject] Update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    revalidatePath("/", "layout");
    return NextResponse.json({ success: true, candidate: updated });
  } catch (err: any) {
    console.error("[resume-reject] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
