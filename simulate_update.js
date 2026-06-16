const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function main() {
  // 1. Fetch candidate named "Divy Jain"
  const { data: candidates, error: fetchErr } = await supabase
    .from("candidates")
    .select("id, name, stage, video_status")
    .eq("name", "Divy Jain")
    .limit(1);

  if (fetchErr || !candidates || candidates.length === 0) {
    console.error("Candidate 'Divy Jain' not found in database, or database error:", fetchErr);
    return;
  }

  const target = candidates[0];
  const oldStage = target.stage;
  
  // Toggle:
  // If current stage is 'Video Bot Screening', revert to 'Resume Upload' (Pending Screening)
  // Otherwise, set to 'Video Bot Screening' and 'Pending' video status (Invite Sent)
  const newStage = oldStage === "Video Bot Screening" ? "Resume Upload" : "Video Bot Screening";
  const newVideoStatus = newStage === "Video Bot Screening" ? "Pending" : null;

  console.log(`Simulating real-time update...`);
  console.log(`Updating candidate '${target.name}' (ID: ${target.id}):`);
  console.log(`Stage: [${oldStage}] -> [${newStage}]`);
  console.log(`Video Status: [${target.video_status}] -> [${newVideoStatus}]`);

  const { error: updateErr } = await supabase
    .from("candidates")
    .update({ 
      stage: newStage,
      video_status: newVideoStatus
    })
    .eq("id", target.id);

  if (updateErr) {
    console.error("Failed to update candidate:", updateErr);
  } else {
    console.log("Database updated successfully! Watch your open admin page update automatically.");
  }
}

main();
