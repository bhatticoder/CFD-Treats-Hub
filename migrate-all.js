const { createClient } = require('@supabase/supabase-js');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
let SUPABASE_URL = '';
let SUPABASE_KEY = '';
let FIREBASE_PROJECT_ID = '';
let FIREBASE_CLIENT_EMAIL = '';
let FIREBASE_PRIVATE_KEY = '';

for (const line of env.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SUPABASE_KEY = line.split('=')[1].trim();
  if (line.startsWith('FIREBASE_PROJECT_ID=')) FIREBASE_PROJECT_ID = line.split('=')[1].trim().replace(/"/g, '');
  if (line.startsWith('FIREBASE_CLIENT_EMAIL=')) FIREBASE_CLIENT_EMAIL = line.split('=')[1].trim().replace(/"/g, '');
  if (line.startsWith('FIREBASE_PRIVATE_KEY=')) {
    const keyStr = line.substring(line.indexOf('=')+1).trim().replace(/^"|"$/g, '');
    FIREBASE_PRIVATE_KEY = keyStr.replace(/\\n/g, '\n');
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY,
  }),
});
const db = getFirestore();

const tablesToMigrate = [
  { supabaseName: 'email_allowlist', firestoreName: 'email_allowlist' },
  { supabaseName: 'item_costs', firestoreName: 'item_costs' },
  { supabaseName: 'manager_sessions', firestoreName: 'manager_sessions' },
  { supabaseName: 'vouchers', firestoreName: 'vouchers' },
  { supabaseName: 'audit_log', firestoreName: 'audit_logs' },
  { supabaseName: 'notifications', firestoreName: 'app_notifications' },
  { supabaseName: 'campuses', firestoreName: 'campuses' },
  { supabaseName: 'item_categories', firestoreName: 'item_categories' },
  { supabaseName: 'items', firestoreName: 'items' },
  { supabaseName: 'order_items', firestoreName: 'order_items' },
  { supabaseName: 'orders', firestoreName: 'orders' },
  { supabaseName: 'profiles', firestoreName: 'profiles' },
  { supabaseName: 'restaurants', firestoreName: 'restaurants' }
];

async function migrate() {
  for (const table of tablesToMigrate) {
    console.log(`Migrating ${table.supabaseName} to ${table.firestoreName}...`);
    let page = 0;
    const pageSize = 500;
    let hasMore = true;
    let total = 0;

    while (hasMore) {
      const { data, error } = await supabase
        .from(table.supabaseName)
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error(`Error fetching ${table.supabaseName}:`, error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      const batch = db.batch();
      for (const row of data) {
        const id = row.id || row.uuid || row.email || String(Math.random());
        const docRef = db.collection(table.firestoreName).doc(String(id));
        
        batch.set(docRef, row, { merge: true });
      }

      await batch.commit();
      total += data.length;
      console.log(`  Migrated ${total} records...`);
      page++;
      
      if (data.length < pageSize) hasMore = false;
    }
    console.log(`Finished migrating ${total} records for ${table.supabaseName}.`);
  }
}

migrate().then(() => console.log('All migrations complete!')).catch(console.error);
