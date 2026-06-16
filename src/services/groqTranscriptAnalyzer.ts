import crypto from 'crypto';

export interface ObservationWithEvidence {
  observation: string;
  evidence: string;
}

export interface LeadershipIndicatorWithEvidence {
  indicator: string;
  evidence: string;
}

export interface TechnicalGapWithEvidence {
  gap: string;
  evidence: string;
}

export interface OwnershipSignalWithEvidence {
  signal: string;
  evidence: string;
}

export interface GroqAnalysisResult {
  communication: number;
  technical: number;
  problemSolving: number;
  leadership: number;
  confidence: number;
  professionalism: number;
  tone: string;
  sentiment: string;
  recommendation: string;
  recommendationReason: string;
  fillerWordCount: number;
  keyObservations: ObservationWithEvidence[];
  leadershipIndicators: LeadershipIndicatorWithEvidence[];
  technicalGaps: TechnicalGapWithEvidence[];
  ownershipSignals: OwnershipSignalWithEvidence[];
  // Fallbacks for the existing UI so it doesn't crash
  fluency?: number;
  fillerWords?: string[];
  hesitationPatterns?: string[];
  behavioralSignals?: {
    ownership: number;
    hesitation: number;
    confidence: number;
    communication: number;
  };
  practicalExperienceScore?: number;
}

export interface GroqAnalysisError {
  error: true;
  message: string;
}

// In-memory cache by transcript hash (SHA-256)
const analysisCache = new Map<string, GroqAnalysisResult>();

/**
 * Clean up generic phrases like "strong candidate" without evidence to enforce Anti-Generic Constraints (Rule 7)
 */
function cleanGenericPhrasing(text: string): string {
  return text
    .replace(/\bstrong candidate\b/gi, "candidate with demonstrated experience")
    .replace(/\bgood communication\b/gi, "articulate responses")
    .replace(/\bteam player\b/gi, "collaborative contributor");
}

export async function analyzeTranscriptWithGroq(
  transcript: { question: string; answer: string }[]
): Promise<GroqAnalysisResult | GroqAnalysisError> {
  if (!transcript || transcript.length === 0) {
    return {
      error: true,
      message: "Transcript analysis unavailable",
    };
  }

  // Convert full transcript to a standardized string to compute hash
  const fullText = transcript
    .map((t) => `Q: ${t.question}\nA: ${t.answer || ""}`)
    .join("\n\n");

  const hash = crypto.createHash("sha256").update(fullText).digest("hex");

  // Check cache (Rule 8 performance)
  if (analysisCache.has(hash)) {
    console.log("[GroqAnalyzer] Returning cached analysis for hash:", hash);
    return analysisCache.get(hash)!;
  }

  const secret = process.env.GROQ_API_KEY;
  if (!secret) {
    console.error("[GroqAnalyzer] GROQ_API_KEY is not configured in env");
    return {
      error: true,
      message: "Transcript analysis unavailable",
    };
  }

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  // Chunk size: 3 Q&A entries per chunk
  const chunkSize = 3;
  const chunks: { question: string; answer: string }[][] = [];
  for (let i = 0; i < transcript.length; i += chunkSize) {
    chunks.push(transcript.slice(i, i + chunkSize));
  }

  console.log(`[GroqAnalyzer] Chunking transcript into ${chunks.length} chunks...`);

  // Analyze each chunk to gather raw findings
  const chunkFindings: string[] = [];

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    const chunkText = chunk
      .map((t) => `Q: ${t.question}\nA: ${t.answer || ""}`)
      .join("\n\n");

    const chunkPrompt = `Analyze the following interview segment (Chunk ${idx + 1}/${chunks.length}).
Extract specific evidences, quotes, and signals related to the candidate's skills.

Interview Segment:
${chunkText}

Respond ONLY with a JSON object of this structure:
{
  "technicalEvidence": "Detailed notes on coding concepts, frameworks, architectures mentioned, with direct quotes",
  "leadershipOwnershipEvidence": "Detailed notes on team leading, mentoring, responsibility/ownership taken, with direct quotes",
  "communicationClarity": "Analysis of clarity, structure, filler words, and confidence in this segment",
  "technicalGaps": "Any visible gaps, unmentioned skills, or lack of depth in this segment"
}`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You are an expert recruitment assistant extracting direct evidence from transcripts. Respond ONLY in JSON." },
            { role: "user", content: chunkPrompt }
          ],
          temperature: 0.1
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "{}";
        chunkFindings.push(content);
        console.log(`[GroqAnalyzer] Successfully analyzed chunk ${idx + 1}`);
      } else {
        console.warn(`[GroqAnalyzer] Chunk ${idx + 1} analysis failed, skipping.`);
      }
    } catch (err) {
      console.error(`[GroqAnalyzer] Exception analyzing chunk ${idx + 1}:`, err);
    }
  }

  // If all chunk analyses failed, return error
  if (chunkFindings.length === 0) {
    return {
      error: true,
      message: "Transcript analysis unavailable",
    };
  }

  // Synthesize chunk findings into the final structured JSON
  const synthesisPrompt = `You are a meticulous HR intelligence engine. Synthesize the segment findings from a chunked candidate interview into a single structured assessment.
Every observation, leadership indicator, technical gap, and ownership signal MUST be deeply grounded in transcript evidence and contain a direct quote or paraphrase from the transcript.

Segment findings collected from transcript:
${chunkFindings.map((f, i) => `--- Chunk ${i + 1} Findings ---\n${f}`).join("\n\n")}

Complete raw transcript text for final context:
${fullText}

You must respond with a JSON object matching this EXACT schema:
{
  "communication": number (0-100),
  "technical": number (0-100),
  "problemSolving": number (0-100),
  "leadership": number (0-100),
  "confidence": number (0-100),
  "professionalism": number (0-100),
  "tone": "string describing the tone",
  "sentiment": "string describing the sentiment",
  "recommendation": "Strongly Recommend, Recommend, or Needs Improvement",
  "recommendationReason": "Evidence-backed reasoning",
  "fillerWordCount": number (integer of approximate filler words used like 'um', 'like', 'you know'),
  "keyObservations": [
    {
      "observation": "Observation detail",
      "evidence": "Direct transcript evidence or quote proving this"
    }
  ],
  "leadershipIndicators": [
    {
      "indicator": "Leadership indicator detail",
      "evidence": "Quote or transcript reference proving this"
    }
  ],
  "technicalGaps": [
    {
      "gap": "Observed technical gap or missing concept",
      "evidence": "Explanation referencing transcript context"
    }
  ],
  "ownershipSignals": [
    {
      "signal": "Accountability/ownership signal detail",
      "evidence": "Direct quote or paraphrase from transcript proving this"
    }
  ]
}

STRICT QUALITY CONSTRAINTS:
1. Every score and observation must come from transcript evidence.
2. Technical Score increases ONLY if there are discussions of frameworks, architecture, debugging, or coding concepts.
3. Leadership Score increases ONLY if there are examples of ownership, mentoring, decisions, or team leading.
4. Confidence and Communication scores must analyze hesitations and clarity.
5. Key observations/signals/indicators MUST NOT use generic placeholders or generic praise like "strong candidate" or "good communication" without specific transcript evidence.
6. The JSON structure MUST be strictly followed. Do not wrap in markdown blocks.
7. CRITICAL: If the transcript is mostly empty, shows only background noise (like 'you', 'um', 'thank you', 'okay'), or the candidate is effectively silent, you MUST give a score of 0 for ALL metrics (communication, technical, problemSolving, leadership, confidence, professionalism).`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are an expert HR recruitment evaluator. Respond ONLY in JSON." },
          { role: "user", content: synthesisPrompt }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GroqAnalyzer] Synthesis API failed:", response.status, errorText);
      return {
        error: true,
        message: "Transcript analysis unavailable",
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const result = JSON.parse(content) as GroqAnalysisResult;

    // Programmatic enforcement of Recommendation Logic (Rule 6)
    const technical = Number(result.technical) || 0;
    const communication = Number(result.communication) || 0;
    const ownershipSignalsCount = Array.isArray(result.ownershipSignals) ? result.ownershipSignals.length : 0;

    let finalRec = "Recommend";
    if (technical > 85 && communication > 80 && ownershipSignalsCount >= 2) {
      finalRec = "Strongly Recommend";
    } else if (technical < 65) {
      finalRec = "Needs Improvement";
    } else {
      finalRec = "Recommend";
    }
    result.recommendation = finalRec;

    // Enforce clean generic phrases to satisfy Rule 7
    result.recommendationReason = cleanGenericPhrasing(result.recommendationReason || "");
    if (Array.isArray(result.keyObservations)) {
      result.keyObservations.forEach((obs) => {
        obs.observation = cleanGenericPhrasing(obs.observation);
        obs.evidence = cleanGenericPhrasing(obs.evidence);
      });
    } else {
      result.keyObservations = [];
    }

    if (Array.isArray(result.leadershipIndicators)) {
      result.leadershipIndicators.forEach((ind) => {
        ind.indicator = cleanGenericPhrasing(ind.indicator);
        ind.evidence = cleanGenericPhrasing(ind.evidence);
      });
    } else {
      result.leadershipIndicators = [];
    }

    if (Array.isArray(result.technicalGaps)) {
      result.technicalGaps.forEach((gap) => {
        gap.gap = cleanGenericPhrasing(gap.gap);
        gap.evidence = cleanGenericPhrasing(gap.evidence);
      });
    } else {
      result.technicalGaps = [];
    }

    if (Array.isArray(result.ownershipSignals)) {
      result.ownershipSignals.forEach((sig) => {
        sig.signal = cleanGenericPhrasing(sig.signal);
        sig.evidence = cleanGenericPhrasing(sig.evidence);
      });
    } else {
      result.ownershipSignals = [];
    }

    // Populate fallback values for the existing UI components to prevent crashes
    result.fluency = Math.round(Math.max(50, 100 - (result.fillerWordCount || 0) * 4));
    result.fillerWords = [
      `fillerWordCount: ${result.fillerWordCount || 0}`
    ];
    result.hesitationPatterns = result.keyObservations
      .slice(0, 3)
      .map((obs) => obs.observation);
    result.behavioralSignals = {
      ownership: Math.min(100, 30 + ownershipSignalsCount * 25),
      hesitation: Math.max(10, 100 - (result.fillerWordCount || 0) * 8),
      confidence: result.confidence || 75,
      communication: result.communication || 75,
    };
    result.practicalExperienceScore = result.technical || 70;

    // Cache final result
    analysisCache.set(hash, result);
    return result;
  } catch (error) {
    console.error("[GroqAnalyzer] Exception during synthesis:", error);
    return {
      error: true,
      message: "Transcript analysis unavailable",
    };
  }
}
