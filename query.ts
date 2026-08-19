import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// read env manually
const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
let SUPABASE_URL = '';
let SUPABASE_KEY = '';
for (const line of env.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SUPABASE_KEY = line.split('=')[1].trim();
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  console.log('Orders data:', data, error);
}
run();
