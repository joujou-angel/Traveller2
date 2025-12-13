
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from parent dir
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrip35() {
    console.log('--- Checking Trip 35 Data ---');

    // 1. Check Trip Members (Real DB Users)
    const { data: members, error: membersError } = await supabase
        .from('trip_members')
        .select('*') // or select specific fields like user_id
        .eq('trip_id', 35);

    if (membersError) console.error('Members Error:', membersError);
    console.log(`Trip 35 Members (Count: ${members?.length || 0}):`, members);

    // 2. Check Trip Config (Visual Companions List)
    const { data: config, error: configError } = await supabase
        .from('trip_config')
        .select('*')
        .eq('trip_id', 35)
        .single();

    if (configError) console.error('Config Error:', configError);
    console.log('Trip 35 Config Companions:', config?.companions);

    // 3. Check Trip 29 Members (Real DB Users) just to compare
    const { data: members29, error: membersError29 } = await supabase
        .from('trip_members')
        .select('*')
        .eq('trip_id', 29);

    console.log(`Trip 29 Members (Count: ${members29?.length || 0}):`, members29);
    // 4. Check Trip 29 Config (Visual Companions List)
    const { data: config29 } = await supabase
        .from('trip_config')
        .select('*')
        .eq('trip_id', 29)
        .single();
    console.log('Trip 29 Config Companions:', config29?.companions);
}

checkTrip35();
