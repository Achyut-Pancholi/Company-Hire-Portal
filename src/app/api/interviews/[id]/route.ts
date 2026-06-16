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
    if (body.status === "completed" && body.transcript && Array.isArray(body.transcript) && process.env.GROQ_API_KEY) {
      try {
        console.log(`Starting Groq Whisper transcription for interview: ${id} clips...`);
        
        // Process each clip concurrently
        await Promise.all(body.transcript.map(async (entry: any) => {
          if (!entry.clip_url) return;
          try {
            const videoRes = await fetch(entry.clip_url);
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
                entry.text = segments.map((seg: any) => seg.text.trim()).join(" ") || entry.text || "";
              } else {
                console.error("Groq API returned an error for clip:", await groqRes.text());
              }
            } else {
              console.error(`Failed to download clip from URL: ${entry.clip_url}`);
            }
          } catch (e) {
            console.error(`Transcription error for clip ${entry.clip_url}:`, e);
          }
        }));

        // Generate AI Summary
        try {
          console.log(`Generating AI Summary...`);
          const fullText = body.transcript.map((t: any) => `Q: ${t.question}\nA: ${t.text}`).join("\n\n");
          
          if (fullText.trim().length > 0) {
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

CRITICAL INSTRUCTIONS:
- You MUST evaluate strictly based ONLY on the provided transcript text.
- If the transcript is mostly empty, shows only background noise (like 'you', 'um', 'thank you'), or the candidate is effectively silent, you MUST give a score of 1 out of 5 for all metrics.
- The summary must clearly state that the candidate was silent and did not provide substantive answers.
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
                // Robust JSON parser to handle unescaped newlines or code block wrappers
                let clean = contentStr.trim();
                if (clean.startsWith("```")) {
                  clean = clean.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
                }
                
                let parsed: any = null;
                try {
                  parsed = JSON.parse(clean);
                } catch (jsonErr) {
                  console.warn("Standard JSON.parse failed, attempting regex-based recovery of summary and scores...");
                  
                  // Extract scores object
                  let scores: any = null;
                  const scoresMatch = clean.match(/"scores"\s*:\s*(\{[^}]+\})/s);
                  if (scoresMatch) {
                    try {
                      scores = JSON.parse(scoresMatch[1].replace(/,\s*([\]}])/g, '$1'));
                    } catch (e) {
                      const scorePairs = scoresMatch[1].match(/"([^"]+)"\s*:\s*(\d)/g);
                      if (scorePairs) {
                        scores = {};
                        scorePairs.forEach(pair => {
                          const parts = pair.split(":");
                          const key = parts[0].replace(/"/g, "").trim();
                          const val = parseInt(parts[1].trim(), 10);
                          scores[key] = val;
                        });
                      }
                    }
                  }

                  // Extract summary string
                  let summary = "";
                  const summaryMatch = clean.match(/"summary"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"scores"|\s*\})/);
                  if (summaryMatch) {
                    summary = summaryMatch[1];
                  } else {
                    const fallbackMatch = clean.match(/"summary"\s*:\s*"([\s\S]*)/);
                    if (fallbackMatch) {
                      summary = fallbackMatch[1].replace(/"\s*,\s*"scores"[\s\S]*/, "").replace(/"\s*\}\s*$/, "").trim();
                    }
                  }

                  // Unescape newlines/quotes
                  summary = summary.replace(/\\n/g, "\n").replace(/\\"/g, '"');
                  
                  if (summary || scores) {
                    parsed = { summary, scores };
                  } else {
                    throw jsonErr;
                  }
                }

                body.summary = parsed.summary || "";
                body.scores = parsed.scores || null;
                console.log(`Successfully generated AI Summary and Scores`);
              } catch (e) {
                console.error("Failed to parse AI JSON response:", e);
                body.summary = contentStr; // Fallback
              }
            } else {
              console.error("Groq Chat API returned an error:", await chatRes.text());
            }
          }
        } catch (summaryErr) {
          console.error("Summary generation failed:", summaryErr);
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
        let videoScore = 20; // Default baseline if silent
        if (data && data.scores) {
          const s = data.scores as any;
          const comm = Number(s.Communication) || 1;
          const clar = Number(s.Clarity) || 1;
          const conf = Number(s.Confidence) || 1;
          const rel = Number(s.Relevance) || 1;
          const total = comm + clar + conf + rel;
          // Convert sum out of 20 to a percentage out of 100
          videoScore = Math.round((total / 20) * 100);
        } else if (body.status === "completed") {
          // If completion but no scores available for some reason
          videoScore = 10;
        }
        
        // Fetch matching candidates
        const { data: existingCandidates } = await supabase
          .from("candidates")
          .select("id, extracted_data")
          .ilike("email", data.candidate_email.trim());

        const candidateExists = existingCandidates && existingCandidates.length > 0;

        if (candidateExists) {
          const candidate = existingCandidates[0];
          const currentExt = candidate.extracted_data || {};
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
            .eq("id", candidate.id);

          if (syncError) {
            console.error("Failed to sync candidate completion status in candidates table:", syncError);
          } else {
            console.log(`Synced candidate ${data.candidate_email} status to Completed`);
          }
        } else {
          // If candidate does not exist, auto-create them in candidates table
          const { data: jobs } = await supabase
            .from("jobs")
            .select("*");
          const matchedJob = (jobs || []).find(j => 
            j.department === data.department && 
            j.sub_department === data.sub_department
          );
          const resolvedRole = matchedJob ? matchedJob.title : data.sub_department;
          const jobId = matchedJob ? matchedJob.id : null;

          const { error: insertError } = await supabase
            .from("candidates")
            .insert({
              name: data.candidate_name,
              email: data.candidate_email,
              job_applied: resolvedRole,
              job_id: jobId,
              resume_status: 'Parsed',
              form_status: 'N/A',
              video_status: 'Completed',
              video_score: videoScore,
              tech_status: 'Pending',
              report_status: 'Not Shared',
              stage: 'Technical Scheduler',
              extracted_data: { videoUrl: data.video_url }
            });

          if (insertError) {
            console.error("Failed to auto-create candidate record:", insertError);
          } else {
            console.log(`Auto-created missing candidate record for ${data.candidate_name}`);
          }
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
              jobRole: data.sub_department,
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
