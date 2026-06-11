export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { requireInternalSecret } from "@/lib/auth";
import { getCurrentAdminIdentifier } from "@/lib/adminIdentifier";
import { revalidatePath } from "next/cache";

type StageAction = "schedule" | "complete" | "select" | "reject";

interface StageTransition {
  tech_status: string;
  current_stage: string;
  stage_order: number;
  workflow_locked: boolean;
  final_recommendation?: string;
}

const TRANSITIONS: Record<StageAction, StageTransition> = {
  schedule: {
    tech_status: "Scheduled",
    current_stage: "Technical Scheduler",
    stage_order: 3,
    workflow_locked: false,
  },
  complete: {
    tech_status: "Completed",
    current_stage: "Technical Evaluation",
    stage_order: 4,
    workflow_locked: false,
  },
  select: {
    tech_status: "Selected",
    current_stage: "Report Generation",
    stage_order: 5,
    workflow_locked: true, // TERMINAL
    final_recommendation: "Selected",
  },
  reject: {
    tech_status: "Rejected",
    current_stage: "Rejected at Technical Stage",
    stage_order: 0,
    workflow_locked: true, // TERMINAL
    final_recommendation: "Rejected",
  },
};

// Pre-condition guard: what tech_status is required before this action
const PRECONDITIONS: Partial<Record<StageAction, string>> = {
  complete: "Scheduled",
  select: "Completed",
  reject: undefined, // allowed from any non-terminal tech state
};

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

  let action: StageAction;
  let reason = "";

  try {
    const body = await request.json();
    action = body?.action;
    reason = body?.reason?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!action || !(action in TRANSITIONS)) {
    return NextResponse.json(
      {
        error: `Invalid action '${action}'. Allowed: schedule, complete, select, reject.`,
        code: "INVALID_ACTION",
      },
      { status: 422 }
    );
  }

  try {
    const supabase = getServiceSupabase();

    const { data: candidate, error: fetchError } = await supabase
      .from("candidates")
      .select("id, video_status, tech_status, workflow_locked")
      .eq("id", id)
      .single();

    if (fetchError || !candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Guard: if already in terminal state
    if (candidate.workflow_locked) {
      return NextResponse.json(
        {
          error: "Candidate is in a terminal state and cannot be advanced further.",
          code: "ALREADY_PROCESSED",
        },
        { status: 409 }
      );
    }

    // Guard: video must be approved before technical actions
    if (candidate.video_status !== "Approved" && action === "schedule") {
      return NextResponse.json(
        {
          error: "Cannot schedule technical interview: video screening has not been approved yet.",
          code: "INVALID_STAGE_TRANSITION",
        },
        { status: 422 }
      );
    }

    // Guard: specific pre-conditions
    const requiredPrior = PRECONDITIONS[action];
    if (requiredPrior && candidate.tech_status !== requiredPrior) {
      return NextResponse.json(
        {
          error: `Cannot perform '${action}': current technical stage must be '${requiredPrior}' but is '${candidate.tech_status}'.`,
          code: "INVALID_STAGE_TRANSITION",
        },
        { status: 422 }
      );
    }

    const transition = TRANSITIONS[action];
    const adminId = await getCurrentAdminIdentifier(request);

    const updatePayload: Record<string, any> = {
      ...transition,
      approved_by: adminId,
      approved_at: new Date().toISOString(),
    };

    if (action === "reject") {
      updatePayload.rejected_reason = reason || null;
      updatePayload.rejected_at = new Date().toISOString();
      delete updatePayload.approved_by;
      delete updatePayload.approved_at;
    }

    const { data: updated, error: updateError } = await supabase
      .from("candidates")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[update-stage] Update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    revalidatePath("/", "layout");
    return NextResponse.json({ success: true, candidate: updated });
  } catch (err: any) {
    console.error("[update-stage] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
