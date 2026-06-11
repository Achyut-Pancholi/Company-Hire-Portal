const { createClient } = require("@supabase/supabase-js");

async function seed() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log("Seeding Supabase Database...");

  // 1. Insert jobs
  const jobsData = [
    { title: "Senior Frontend Engineer", department: "Engineering", status: "Active" },
    { title: "Backend Developer (Node.js)", department: "Engineering", status: "Active" },
    { title: "Product Designer", department: "Design", status: "Active" }
  ];
  const { data: jobs, error: jobsErr } = await supabase.from("jobs").insert(jobsData).select();
  if (jobsErr) {
    console.error("Error inserting jobs:", jobsErr);
  } else {
    console.log("Successfully seeded jobs:", jobs.length);
  }

  // 2. Insert questions bank
  const questionsData = [
    { department: "Technology and Delivery", sub_department: "Frontend", question_text: "What is your approach to optimizing the performance of a large-scale React application?", is_mandatory: true },
    { department: "Technology and Delivery", sub_department: "Frontend", question_text: "How do you handle state management across deeply nested components in modern React?", is_mandatory: false },
    { department: "Technology and Delivery", sub_department: "Backend", question_text: "Explain how you handle massive concurrency and scaling in an Express application.", is_mandatory: true },
    { department: "Technology and Delivery", sub_department: "Backend", question_text: "What is your strategy for secure and highly available token authentication?", is_mandatory: false }
  ];
  const { data: qb, error: qbErr } = await supabase.from("questions_bank").insert(questionsData).select();
  if (qbErr) {
    console.error("Error inserting questions bank:", qbErr);
  } else {
    console.log("Successfully seeded questions bank:", qb.length);
  }

  // 3. Insert candidates
  const candidatesData = [
    {
      name: "Alice Smith",
      email: "alice.smith@example.com",
      phone: "+1 555-0199",
      skills: ["React", "TypeScript", "Next.js", "TailwindCSS"],
      job_applied: "Senior Frontend Engineer",
      resume_status: "Parsed",
      form_status: "Completed",
      video_status: "Completed",
      tech_status: "Scheduled",
      report_status: "Shared",
      stage: "Tech Schedule",
      resume_score: 92,
      video_score: 88,
      tech_score: 0,
      final_recommendation: "Strong Fit",
      extracted_data: {
        skills: ["React", "TypeScript", "Next.js", "TailwindCSS", "Redux", "Webpack"],
        experience: "5 years as Senior UI Developer at Tech Solutions Inc.",
        education: "B.S. in Computer Science, Stanford University",
        projects: "Developed an open-source design system with 10k+ stars."
      }
    },
    {
      name: "Bob Jones",
      email: "bob.jones@example.com",
      phone: "+1 555-0142",
      skills: ["Node.js", "Express", "PostgreSQL", "Docker"],
      job_applied: "Backend Developer (Node.js)",
      resume_status: "Parsed",
      form_status: "Completed",
      video_status: "Completed",
      tech_status: "Completed",
      report_status: "Shared",
      stage: "Report Gen",
      resume_score: 85,
      video_score: 90,
      tech_score: 95,
      final_recommendation: "Hire",
      extracted_data: {
        skills: ["Node.js", "Express", "PostgreSQL", "Docker", "AWS", "Redis"],
        experience: "4 years as Backend Engineer at CloudScale Ltd.",
        education: "M.S. in Software Engineering, MIT",
        projects: "Built real-time analytics pipeline processing 1M events/sec."
      }
    },
    {
      name: "Priya Sharma",
      email: "priya.sharma@example.com",
      phone: "+91 98765 43210",
      skills: ["Figma", "UI/UX Design", "Prototyping", "Design Systems"],
      job_applied: "Product Designer",
      resume_status: "Parsed",
      form_status: "Completed",
      video_status: "Pending",
      tech_status: "Pending",
      report_status: "Not Shared",
      stage: "Video Bot",
      resume_score: 88,
      video_score: 0,
      tech_score: 0,
      final_recommendation: "Under Review",
      extracted_data: {
        skills: ["Figma", "UI/UX Design", "Wireframing", "User Research", "Adobe XD"],
        experience: "3 years as UX Designer at CreativePixel agency.",
        education: "Bachelor of Design, IIT Bombay",
        projects: "Redesigned mobile banking application with 5M active users."
      }
    }
  ];
  const { data: candidates, error: candidatesErr } = await supabase.from("candidates").insert(candidatesData).select();
  if (candidatesErr) {
    console.error("Error inserting candidates:", candidatesErr);
  } else {
    console.log("Successfully seeded candidates:", candidates.length);
  }

  // 4. Insert completed interviews for the candidate alice
  if (candidates && candidates.length > 0) {
    const alice = candidates[0];
    const interviewData = {
      candidate_name: alice.name,
      candidate_email: alice.email,
      department: "Technology and Delivery",
      sub_department: "Frontend",
      questions: [
        { id: "q1", text: "What is your approach to optimizing the performance of a large-scale React application?", isMandatory: true }
      ],
      status: "completed",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      transcript: [
        { question: "What is your approach to optimizing the performance of a large-scale React application?", text: "I focus heavily on code-splitting, lazy loading of routes and heavy components, and using memoization techniques such as useMemo and useCallback where appropriate. I also audit bundles using Webpack Bundle Analyzer and ensure virtualization is implemented for extremely long lists." }
      ],
      summary: "• Demonstrates strong, industry-standard architectural knowledge of React.\n• Focuses on proactive performance profiling, code-splitting, and lazy loading.\n• Highly articulate communicator with clear, structured technical explanations."
    };
    const { data: interview, error: interviewErr } = await supabase.from("interviews").insert(interviewData).select();
    if (interviewErr) {
      console.error("Error inserting interviews:", interviewErr);
    } else {
      console.log("Successfully seeded interview:", interview.length);
    }
  }

  console.log("Seeding Completed Successfully!");
}

seed();
