const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function main() {
  console.log("Fetching interviews and candidates...");
  const { data: interviews, error: ie } = await supabase.from("interviews").select("*");
  const { data: candidates, error: ce } = await supabase.from("candidates").select("*");
  const { data: jobs, error: je } = await supabase.from("jobs").select("*");

  if (ie || ce) {
    console.error("Error fetching data:", ie, ce);
    return;
  }

  if (interviews && candidates) {
    for (const interview of interviews) {
      const email = interview.candidate_email.trim().toLowerCase();
      const exists = candidates.some(c => c.email.trim().toLowerCase() === email);

      if (!exists) {
        console.log(`Candidate missing for interview: ${interview.candidate_name} (${interview.candidate_email})`);
        
        // Find job matching department / sub_department
        const matchedJob = (jobs || []).find(j => 
          j.department === interview.department && 
          j.sub_department === interview.sub_department
        );
        const resolvedRole = matchedJob ? matchedJob.title : interview.sub_department;
        const jobId = matchedJob ? matchedJob.id : null;

        const payload = {
          name: interview.candidate_name,
          email: interview.candidate_email,
          job_applied: resolvedRole,
          job_id: jobId,
          resume_status: 'Parsed',
          form_status: 'N/A',
          video_status: 'Pending',
          tech_status: 'Pending',
          report_status: 'Not Shared',
          stage: 'Video Bot Screening',
          video_url: interview.video_url,
          created_at: interview.created_at
        };

        const { data: newCandidate, error: insertError } = await supabase
          .from("candidates")
          .insert(payload)
          .select()
          .single();

        if (insertError) {
          console.error(`Failed to insert candidate for ${interview.candidate_name}:`, insertError);
        } else {
          console.log(`Successfully created candidate record for ${interview.candidate_name} with ID ${newCandidate.id}`);
        }
      } else {
        // Candidate exists. Let's make sure their video_url is updated if the interview has it
        const candidate = candidates.find(c => c.email.trim().toLowerCase() === email);
        if (interview.video_url && candidate.video_url !== interview.video_url) {
          await supabase.from("candidates").update({ video_url: interview.video_url }).eq("id", candidate.id);
          console.log(`Updated video_url for candidate ${candidate.name}`);
        }
      }
    }
  }
}

main();
