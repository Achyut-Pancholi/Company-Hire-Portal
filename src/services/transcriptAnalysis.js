import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function analyzeTranscript(interviewId) {
  // Fetch real transcript from Supabase
  const { data, error } = await supabase
    .from('interviews')
    .select('teams_transcript_text')
    .eq('id', interviewId)
    .single();

  if (error || !data?.teams_transcript_text) {
    return { error: 'No transcript available to analyze.' };
  }

  const transcript = data.teams_transcript_text;
  if (transcript.trim().length < 50) {
    return { error: 'Transcript too short or empty to analyze.' };
  }

  const secret = process.env.GROQ_API_KEY;
  if (!secret) {
    return { error: 'GROQ_API_KEY is not configured in env.' };
  }

  const model = "llama-3.3-70b-versatile";

  // Call Groq API with ONLY the real transcript as source
  const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secret}`,
    },
    body: JSON.stringify({
      model: model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: 'system',
          content: `You analyze real interview transcripts. Use ONLY information present in the transcript provided. 
Do not invent, assume, or hallucinate any information. 
If something cannot be determined from the transcript, say "Not determinable from transcript."
Respond with valid JSON only.`,
        },
        {
          role: 'user',
          content: `Analyze this interview transcript and return JSON with these exact keys:
{
  "summary": "2-3 sentence overview of the interview",
  "technicalSkills": ["skill1", "skill2"],
  "communicationAnalysis": "assessment of communication",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendation": "HIRE or HOLD or REJECT",
  "recommendationReason": "one sentence reason"
}

Transcript:
${transcript}`,
        }
      ],
      temperature: 0.1
    }),
  });

  if (!aiRes.ok) {
    const errBody = await aiRes.text();
    console.error("Groq API Error:", errBody);
    return { error: `Groq API call failed: ${aiRes.status}` };
  }

  const aiData = await aiRes.json();
  const rawText = aiData.choices?.[0]?.message?.content || '{}';

  let analysis;
  try {
    analysis = JSON.parse(rawText.trim());
  } catch (err) {
    console.error("AI parse failed for raw text:", rawText);
    return { error: 'AI analysis parsing failed.' };
  }

  // Save analysis to Supabase
  const { error: updateError } = await supabase
    .from('interviews')
    .update({
      teams_ai_summary: analysis.summary,
      teams_ai_skills: analysis.technicalSkills,
      teams_ai_communication: analysis.communicationAnalysis,
      teams_ai_strengths: analysis.strengths,
      teams_ai_weaknesses: analysis.weaknesses,
      teams_ai_recommendation: analysis.recommendation,
    })
    .eq('id', interviewId);

  if (updateError) {
    throw new Error('Failed to update AI analysis: ' + updateError.message);
  }

  return { success: true, analysis };
}
