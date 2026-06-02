const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function main() {
  const { data: candidates, error } = await supabase
    .from("candidates")
    .select("*");
  
  if (error) {
    console.error("Error fetching candidates:", error);
    return;
  }
  
  console.log("Total candidates:", candidates.length);
  candidates.forEach(c => {
    console.log("-----------------------------------------");
    console.log("Name:", c.name);
    console.log("ID:", c.id);
    console.log(`Name: ${c.name} | Video: ${c.video_score} | Tech: ${c.tech_score} | Rec: ${c.final_recommendation}`);
  });
}

main();
