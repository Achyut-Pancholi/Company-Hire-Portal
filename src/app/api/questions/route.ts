import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { requireInternalSecret } from "@/lib/auth";

// Fetch all global questions
export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("questions_bank")
      .select("*")
      .order("department", { ascending: true })
      .order("sub_department", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching questions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Add a new question to a sub-department
export async function POST(request: NextRequest) {
  const authError = await requireInternalSecret(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const { question_text, is_mandatory, department, sub_department } = body;

    if (!question_text || !sub_department) {
      return NextResponse.json(
        { error: "question_text and sub_department are required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("questions_bank")
      .insert({
        question_text,
        is_mandatory: is_mandatory || false,
        department: department || 'General',
        sub_department,
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting question:", error);
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
      return NextResponse.json(
        { error: "question id is required for deletion" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from("questions_bank")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting question:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
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
    const { id, question_text, is_mandatory, department, sub_department } = body;

    if (!id) {
      return NextResponse.json({ error: "question id is required" }, { status: 400 });
    }

    const updates: any = {};
    if (question_text !== undefined) updates.question_text = question_text;
    if (is_mandatory !== undefined) updates.is_mandatory = is_mandatory;
    if (department !== undefined) updates.department = department;
    if (sub_department !== undefined) updates.sub_department = sub_department;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("questions_bank")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating question:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
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
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    },
  });
}
