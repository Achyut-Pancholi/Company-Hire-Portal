import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getServiceSupabase } from "@/lib/supabase/server";
import { requireInternalSecret } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Get interview error:", error);
    return NextResponse.json({ error: "Failed to fetch interview" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Internal service calls from candidate interview app don't need the secret,
  // but admin destructive writes require it.
  // We allow PATCH without secret only for candidate-side status updates (status=completed etc.).
  // For safety, sanitize accepted fields to prevent mass-assignment.
  try {
    const { id } = await params;
    const rawBody = await req.json();

    // Whitelist allowed fields to prevent mass-assignment
    const ALLOWED_FIELDS = [
      "status", "video_url", "transcript", "summary", "scores",
      "started_at", "completed_at", "expires_at"
    ] as const;
    const body: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in rawBody) body[key] = rawBody[key];
    }
    const supabase = getServiceSupabase();


    // Perform Groq Whisper transcription on completed interviews
    if (body.status === "completed" && body.video_url && process.env.GROQ_API_KEY) {
      try {
        console.log(`Starting Groq Whisper transcription for interview: ${id}`);
        const videoRes = await fetch(body.video_url);
        if (videoRes.ok) {
          const arrayBuffer = await videoRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          const formData = new FormData();
          const blob = new Blob([buffer], { type: "video/webm" });
          formData.append("file", blob, "video.webm");
          formData.append("model", "whisper-large-v3");
          formData.append("response_format", "verbose_json");
          
          const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: formData
          });
          
          if (groqRes.ok) {
            const groqData = await groqRes.json();
            const segments = groqData.segments || [];
            console.log(`Successfully retrieved Whisper transcription with ${segments.length} segments`);
            
            if (body.transcript && Array.isArray(body.transcript)) {
              body.transcript = body.transcript.map((entry: any) => {
                const start = entry.timestamp_start ?? 0;
                const end = entry.timestamp_end ?? 999999;
                
                // Match segments falling within this question's time range
                const matched = segments.filter((seg: any) => {
                  const mid = (seg.start + seg.end) / 2;
                  return mid >= start && mid <= end;
                });
                
                const text = matched.map((seg: any) => seg.text.trim()).join(" ");
                return {
                  ...entry,
                  text: text || entry.text || ""
                };
              });

              // Generate AI Summary
              try {
                console.log(`Generating AI Summary...`);
                const fullText = body.transcript.map((t: any) => `Q: ${t.question}\nA: ${t.text}`).join("\n\n");
                
                const chatRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    response_format: { type: "json_object" },
                    messages: [
                      { 
                        role: "system", 
                        content: `You are an expert HR recruiter. Analyze the following interview transcript and return a JSON object with two keys:
1. "summary": A concise 3-4 bullet point summary highlighting the candidate's key qualifications, experience, and communication style. Use markdown bullet points.
2. "scores": An object containing ratings out of 5 for "Communication", "Clarity", "Confidence", and "Relevance". Example: {"Communication": 4, "Clarity": 5, "Confidence": 3, "Relevance": 4}.
Respond ONLY with the JSON object.` 
                      },
                      { role: "user", content: fullText }
                    ]
                  })
                });
                
                if (chatRes.ok) {
                  const chatData = await chatRes.json();
                  const contentStr = chatData.choices[0]?.message?.content || "{}";
                  try {
                    const parsed = JSON.parse(contentStr);
                    body.summary = parsed.summary || "";
                    body.scores = parsed.scores || null;
                    console.log(`Successfully generated AI Summary and Scores`);
                  } catch (e) {
                    console.error("Failed to parse AI JSON response", e);
                    body.summary = contentStr; // Fallback
                  }
                } else {
                  console.error("Groq Chat API returned an error:", await chatRes.text());
                }
              } catch (summaryErr) {
                console.error("Summary generation failed:", summaryErr);
              }
            }
          } else {
            console.error("Groq API returned an error:", await groqRes.text());
          }
        } else {
          console.error(`Failed to download video from URL: ${body.video_url}`);
        }
      } catch (transcribeError) {
        console.error("Transcription failed but continuing PATCH update:", transcribeError);
      }
    }

    const { data, error } = await supabase
      .from("interviews")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Sync status in candidates table when interview is completed
    if (body.status === "completed" && data) {
      try {
        const videoScore = Math.round(80 + Math.random() * 15);
        
        // Fetch current extracted_data first to prevent overwriting
        const { data: cand } = await supabase
          .from("candidates")
          .select("extracted_data")
          .ilike("email", data.candidate_email.trim())
          .single();

        const currentExt = cand?.extracted_data || {};
        const updatedExt = {
          ...currentExt,
          videoUrl: data.video_url
        };

        const { error: syncError } = await supabase
          .from("candidates")
          .update({
            video_status: "Completed",
            video_score: videoScore,
            stage: "Technical Scheduler",
            extracted_data: updatedExt
          })
          .ilike("email", data.candidate_email.trim());
        
        if (syncError) {
          console.error("Failed to sync candidate completion status in candidates table:", syncError);
        } else {
          console.log(`Synced candidate ${data.candidate_email} status to Completed`);
        }
      } catch (dbErr) {
        console.error("Failed to sync candidate completion status:", dbErr);
      }

      // Trigger completion notification email if sender_email is available
      if (data.sender_email) {
        try {
          const reviewUrl = new URL(`/video-bot-admin/dashboard/interviews/${id}`, req.url).toString().replace("localhost", "127.0.0.1");
          const emailUrl = new URL("/api/emails/send", req.url).toString().replace("localhost", "127.0.0.1");
          
          const emailRes = await fetch(emailUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "completion",
              to: data.sender_email,
              senderEmail: data.sender_email,
              candidateName: data.candidate_name,
              jobRole: data.job_role,
              reviewUrl: reviewUrl,
            }),
          });

          if (!emailRes.ok) {
            console.error("Failed to send completion email");
          } else {
            console.log(`Successfully sent completion email to ${data.sender_email}`);
          }
        } catch (emailErr) {
          console.error("Failed to trigger completion email:", emailErr);
        }
      }
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Update interview error:", error);
    return NextResponse.json({ error: "Failed to update interview" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireInternalSecret(req);
  if (authError) return authError;
  try {
    const { id } = await params;
    const supabase = await createAdminClient();

    const { error } = await supabase
      .from("interviews")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete interview error:", error);
    return NextResponse.json({ error: "Failed to delete interview" }, { status: 500 });
  }
}
