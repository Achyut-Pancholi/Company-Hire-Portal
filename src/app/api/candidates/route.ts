export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { requireInternalSecret } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  // GET all candidates requires auth; GET by id is public (candidate-form uses it)
  if (!id) {
    const authError = await requireInternalSecret(request);
    if (authError) return authError;
  }

  try {
    const supabase = getServiceSupabase();

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department");
    const sub_department = searchParams.get("sub_department");

    if (id) {
      const { data, error } = await supabase
        .from("candidates")
        .select("*, jobs(*)")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching candidate:", error);
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json(data);
    }

    let query = supabase
      .from("candidates")
      .select("*, jobs!inner(*)", { count: "exact" });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (department && department !== 'all') {
      query = query.eq('jobs.department', department);
    }
    
    if (sub_department && sub_department !== 'all') {
      query = query.eq('jobs.sub_department', sub_department);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching candidates:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count, page, limit });
  } catch (error: any) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireInternalSecret(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      skills,
      job_applied,
      job_id,
      resume_status,
      form_status,
      video_status,
      tech_status,
      report_status,
      stage,
      resume_score,
      video_score,
      tech_score,
      final_recommendation,
      extracted_data
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    
    let resolvedJobId = job_id;
    if (!resolvedJobId && job_applied) {
      const { data: jobMatch } = await supabase
        .from("jobs")
        .select("id")
        .eq("title", job_applied)
        .limit(1)
        .single();
      if (jobMatch) {
        resolvedJobId = jobMatch.id;
      }
    }

    const { data, error } = await supabase
      .from("candidates")
      .insert({
        name,
        email,
        phone,
        skills: skills || [],
        job_applied,
        job_id: resolvedJobId,
        resume_status: resume_status || "Pending",
        form_status: form_status || "Pending",
        video_status: video_status || "Pending",
        tech_status: tech_status || "Pending",
        report_status: report_status || "Not Shared",
        stage: stage || "Resume Upload",
        resume_score,
        video_score,
        tech_score,
        final_recommendation: final_recommendation || "Under Review",
        extracted_data
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting candidate:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/", "layout");
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireInternalSecret(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "candidate id is required for updates" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("candidates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating candidate:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/", "layout");
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireInternalSecret(request);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "candidate id is required for deletion" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from("candidates")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting candidate:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:5173",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    },
  });
}
