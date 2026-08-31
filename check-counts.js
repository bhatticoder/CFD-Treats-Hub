const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
let SUPABASE_URL = '';
let SUPABASE_KEY = '';

for (const line of env.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SUPABASE_KEY = line.split('=')[1].trim();
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const tablesToCheck = ['item_costs', 'manager_sessions', 'vouchers'];

async function checkCounts() {
  for (const table of tablesToCheck) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`Error fetching count for ${table}:`, error.message);
    } else {
      console.log(`Table ${table} has ${count} rows.`);
    }
  }
}

checkCounts();
