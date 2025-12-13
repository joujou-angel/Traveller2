
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ovquzddkkgywvlqyhekc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92cXV6ZGRra2d5d3ZscXloZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDIyMDgsImV4cCI6MjA4MDc3ODIwOH0._cTWaiRGmbE31CbXKqQhO9rjZd_tIe__8ceQb1zuz_c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrip29() {
    console.log('--- Checking Trip 29 Status (Hardcoded) ---');

    // 1. Trip Meta
    const { data: trip } = await supabase.from('trips').select('*').eq('id', 29).single();
    console.log('Trip 29 Meta:', trip);

    if (!trip) {
        console.log('Trip 29 not found!');
        return;
    }

    // 2. Members (Source of Truth)
    const { data: members } = await supabase.from('trip_members').select('*').eq('trip_id', 29);
    console.log('Trip 29 Members Count:', members?.length);
    console.log('Trip 29 Member IDs:', members?.map(m => m.user_id));

    // 3. Config Companions (Display)
    const { data: config } = await supabase.from('trip_config').select('companions').eq('trip_id', 29).single();
    console.log('Trip 29 Config Companions:', config?.companions);

    // 4. Expenses (Potential Recovery Source)
    const { data: expenses } = await supabase.from('expenses').select('payer, split_details').eq('trip_id', 29);

    // Recovery Simulator
    const recoveredNames = new Set();
    expenses?.forEach(exp => {
        if (exp.payer) recoveredNames.add(exp.payer);
        if (exp.split_details) {
            Object.keys(exp.split_details).forEach(k => recoveredNames.add(k));
        }
    });
    console.log('Potential Recoverable Names from Expenses:', Array.from(recoveredNames));

    // Check if we can map Names -> User IDs (This is tricky without email)
    // We can only check if the OWNER is in the members list?
    const isOwnerInMembers = members?.some(m => m.user_id === trip.user_id);
    console.log('Is Owner in Members List?', isOwnerInMembers);
}

checkTrip29();
