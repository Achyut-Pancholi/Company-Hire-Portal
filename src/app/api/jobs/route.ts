import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { requireInternalSecret } from "@/lib/auth";

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching jobs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
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
    const { title, department, sub_department } = body;

    // Allow creation of a department without a sub-department title
    if (!title && !department) {
      return NextResponse.json(
        { error: "title or department is required" },
        { status: 400 }
      );
    }
    // Determine insertion data
    const insertData = title ? { title, department, sub_department: sub_department || 'General' } : { title: department, department: null, sub_department: null };
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("jobs")
      .insert({ ...insertData, status: "Active" })
      .select()
      .single();

    if (error) {
      console.error("Error inserting job:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
    const { id, title, department, status, sub_department } = body;

    if (!id) {
      return NextResponse.json({ error: "job id is required" }, { status: 400 });
    }

    const updates: any = {};
    if (title) updates.title = title;
    if (department) updates.department = department;
    if (sub_department) updates.sub_department = sub_department;
    if (status) updates.status = status;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("jobs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating job:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
      return NextResponse.json({ error: "job id is required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase.from("jobs").delete().eq("id", id);

    if (error) {
      console.error("Error deleting job:", error);
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
