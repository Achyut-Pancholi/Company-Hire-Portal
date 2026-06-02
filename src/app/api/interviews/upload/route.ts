import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("video") as File | null;
    const interviewId = formData.get("interviewId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No video file provided." }, { status: 400 });
    }
    if (!interviewId) {
      return NextResponse.json({ error: "No interview ID provided." }, { status: 400 });
    }

    console.log(`Uploading screening video for interview ${interviewId} via API route...`);
    const supabase = getServiceSupabase();
    
    // Check if the interview exists
    const { data: interview, error: fetchError } = await supabase
      .from("interviews")
      .select("id")
      .eq("id", interviewId)
      .single();

    if (fetchError || !interview) {
      console.error(`Interview ${interviewId} not found:`, fetchError);
      return NextResponse.json({ error: "Invalid interview ID." }, { status: 404 });
    }

    const filename = `interviews/${interviewId}/final-interview.webm`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage using service client (bypasses RLS)
    const { error: uploadError } = await supabase.storage
      .from("interview-recordings")
      .upload(filename, buffer, {
        contentType: file.type || "video/webm",
        upsert: true
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json({ error: `Supabase upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from("interview-recordings")
      .getPublicUrl(filename);

    const videoUrl = publicUrlData?.publicUrl || "";
    console.log(`Successfully uploaded screening video for ${interviewId}:`, videoUrl);

    return NextResponse.json({ success: true, videoUrl });
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload video." }, { status: 500 });
  }
}
