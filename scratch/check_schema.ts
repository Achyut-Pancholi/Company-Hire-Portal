import { createClient } from '@supabase/supabase-js';

const url = 'https://iosyfjaeeogosrlolakt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc3lmamFlZW9nb3NybG9sYWt0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc2NTE0NSwiZXhwIjoyMDk1MzQxMTQ1fQ.VypqkM4JTRDVqDlhKcZ-jDZqdA3-3dsqtmy6Fq6LUNM';
const supabase = createClient(url, key);

async function checkSchema() {
  const tables = ['interviews', 'candidates', 'questions_bank', 'jobs'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    console.log(`\nTable: ${table}`);
    if (error) console.error(error);
    else if (data && data.length > 0) console.log(Object.keys(data[0]));
    else console.log('Empty table, cannot infer schema directly without Postgres introspection.');
  }
}

checkSchema();
