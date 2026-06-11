import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_SUB_DEPARTMENTS = {
  'Technology and Delivery': ['PHP', 'QA', 'Frontend', 'Backend'],
  'Engineering': ['DevOps', 'Data Science', 'SRE'],
  'HR': ['Recruitment', 'Operations'],
  'Marketing': ['SEO', 'Content', 'Social Media']
};

async function seedJobs() {
  const { data: existingJobs } = await supabase.from('jobs').select('*');
  
  const toInsert = [];
  
  for (const [dept, subDepts] of Object.entries(DEFAULT_SUB_DEPARTMENTS)) {
    for (const subDept of subDepts) {
      // Check if job already exists (exact match on department + sub_department)
      const exists = existingJobs.find(j => j.department === dept && j.sub_department && j.sub_department.trim().toLowerCase() === subDept.toLowerCase());
      if (!exists) {
        toInsert.push({ title: subDept, department: dept, sub_department: subDept, status: 'Active' });
      }
    }
  }
  
  if (toInsert.length > 0) {
    console.log(`Inserting ${toInsert.length} default sub-departments...`);
    const { error } = await supabase.from('jobs').insert(toInsert);
    if (error) {
      console.error('Error inserting jobs:', error);
    } else {
      console.log('Successfully seeded default departments!');
    }
  } else {
    console.log('Default departments already exist in the database.');
  }
}

seedJobs();
