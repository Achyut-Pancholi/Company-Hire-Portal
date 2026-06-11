import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { requireInternalSecret } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Fetch MCQ questions filtered by department, sub_department, and experience_level
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const sub_department = searchParams.get("sub_department");
    const experience_level = searchParams.get("experience_level");

    if (!department || !sub_department || !experience_level) {
      return NextResponse.json(
        { error: "Missing required query parameters: department, sub_department, experience_level" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("mcq_questions_bank")
      .select("*")
      .eq("department", department)
      .eq("sub_department", sub_department)
      .eq("experience_level", experience_level)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching MCQ questions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("Internal Server Error in GET MCQ:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const sanitizeCorrectAnswer = (val: string, optA = '', optB = '', optC = '', optD = ''): 'A' | 'B' | 'C' | 'D' => {
  if (!val) return 'A';
  const cleanVal = String(val).trim();
  
  // 1. Exact letter check (A, B, C, D) case-insensitive
  const upper = cleanVal.toUpperCase();
  if (['A', 'B', 'C', 'D'].includes(upper)) {
    return upper as 'A' | 'B' | 'C' | 'D';
  }
  
  // 2. Starts with pattern: "Option A", "A.", "A)", "A - ..."
  const match = cleanVal.match(/^([A-D])\b/i) || cleanVal.match(/^option\s+([A-D])/i) || cleanVal.match(/^([A-D])[.\)-]/i);
  if (match && match[1]) {
    return match[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
  }
  
  // 3. Exact matching of option text (if options are provided)
  const normVal = cleanVal.toLowerCase();
  const cleanOptA = String(optA || '').trim().toLowerCase();
  const cleanOptB = String(optB || '').trim().toLowerCase();
  const cleanOptC = String(optC || '').trim().toLowerCase();
  const cleanOptD = String(optD || '').trim().toLowerCase();

  if (cleanOptA && normVal === cleanOptA) return 'A';
  if (cleanOptB && normVal === cleanOptB) return 'B';
  if (cleanOptC && normVal === cleanOptC) return 'C';
  if (cleanOptD && normVal === cleanOptD) return 'D';

  // 4. Default fallback
  return 'A';
};

// Add, update, or bulk replace MCQ questions
export async function POST(req: NextRequest) {
  const authError = await requireInternalSecret(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { department, sub_department, experience_level, questions, id, question_text, option_a, option_b, option_c, option_d, correct_answer, points_value } = body;

    if (!department || !sub_department || !experience_level) {
      return NextResponse.json(
        { error: "Missing required fields: department, sub_department, experience_level" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 1. Bulk upload / Replace flow
    if (questions && Array.isArray(questions)) {
      // First delete all existing questions matching this matrix
      const { error: deleteError } = await supabase
        .from("mcq_questions_bank")
        .delete()
        .eq("department", department)
        .eq("sub_department", sub_department)
        .eq("experience_level", experience_level);

      if (deleteError) {
        console.error("Error clearing old MCQ questions:", deleteError);
        return NextResponse.json({ error: "Failed to clear existing questions" }, { status: 500 });
      }

      // If empty questions array, just return success
      if (questions.length === 0) {
        return NextResponse.json({ success: true, count: 0 });
      }

      // Map questions array to DB rows
      const rows = questions.map((q: any) => {
        const oA = q.option_a || q.optionA || '';
        const oB = q.option_b || q.optionB || '';
        const oC = q.option_c || q.optionC || '';
        const oD = q.option_d || q.optionD || '';
        const rawAns = q.correct_answer || q.correctAnswer || 'A';
        return {
          department,
          sub_department,
          experience_level,
          question_text: q.question_text || q.questionText,
          option_a: oA,
          option_b: oB,
          option_c: oC,
          option_d: oD,
          correct_answer: sanitizeCorrectAnswer(rawAns, oA, oB, oC, oD),
          points_value: parseInt(q.points_value || q.pointsValue) || 5
        };
      });

      const { data, error: insertError } = await supabase
        .from("mcq_questions_bank")
        .insert(rows)
        .select();

      if (insertError) {
        console.error("Error bulk inserting MCQ questions:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, count: data?.length || 0, data });
    }

    // 2. Single insert or update flow
    if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_answer) {
      return NextResponse.json({ error: "Missing question details" }, { status: 400 });
    }

    const correctAns = sanitizeCorrectAnswer(correct_answer, option_a, option_b, option_c, option_d);

    const rowData = {
      department,
      sub_department,
      experience_level,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer: correctAns,
      points_value: parseInt(points_value) || 5
    };

    if (id) {
      // Update
      const { data, error } = await supabase
        .from("mcq_questions_bank")
        .update(rowData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating MCQ question:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    } else {
      // Insert
      const { data, error } = await supabase
        .from("mcq_questions_bank")
        .insert(rowData)
        .select()
        .single();

      if (error) {
        console.error("Error inserting MCQ question:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }
  } catch (error: any) {
    console.error("Internal Server Error in POST MCQ:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete an MCQ question by ID
export async function DELETE(req: NextRequest) {
  const authError = await requireInternalSecret(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id parameter is required for deletion" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from("mcq_questions_bank")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting MCQ question:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Internal Server Error in DELETE MCQ:", error);
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
