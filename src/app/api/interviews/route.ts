import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireInternalSecret } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const authError = await requireInternalSecret(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { candidate_name, candidate_email, department, sub_department, questions, expires_at } = body;

    if (!candidate_name || !candidate_email || !department || !sub_department || !questions?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (questions.length < 1 || questions.length > 5) {
      return NextResponse.json(
        { error: "Must have between 1 and 5 questions" },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("interviews")
      .insert({
        candidate_name,
        candidate_email,
        department,
        sub_department,
        questions,
        status: "pending",
        expires_at: expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Create interview error:", error);
    return NextResponse.json({ error: "Failed to create interview" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authError = await requireInternalSecret(req);
  if (authError) return authError;
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Get interviews error:", error);
    return NextResponse.json({ error: "Failed to fetch interviews" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:5173",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    },
  });
}

