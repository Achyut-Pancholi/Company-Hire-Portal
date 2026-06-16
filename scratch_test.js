const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function main() {
  console.log("--- Fetching all jobs ---");
  const { data: jobs, error: jobsErr } = await supabase
    .from("jobs")
    .select("*");
  if (jobsErr) {
    console.error("Error fetching jobs:", jobsErr);
    return;
  }
  console.log(`Found ${jobs.length} jobs:`, jobs);

  if (jobs.length > 0) {
    const firstJob = jobs[0];
    console.log(`--- Testing deletion of job ID: ${firstJob.id} ---`);
    const { data: delData, error: delErr } = await supabase
      .from("jobs")
      .delete()
      .eq("id", firstJob.id);
    if (delErr) {
      console.error("Error deleting job:", delErr);
    } else {
      console.log("Delete response:", delData);
    }
  }
}

main();
