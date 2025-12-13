
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env manually
const envPath = path.resolve(__dirname, '../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey!);

async function checkTrip29() {
    console.log('--- Checking Trip 29 Status ---');

    // 1. Trip Meta
    const { data: trip } = await supabase.from('trips').select('*').eq('id', 29).single();
    console.log('Trip 29 Meta:', trip);

    // 2. Members (Source of Truth)
    const { data: members } = await supabase.from('trip_members').select('*').eq('trip_id', 29);
    console.log('Trip 29 Members (Table):', members);

    // 3. Config Companions (Display)
    const { data: config } = await supabase.from('trip_config').select('companions, flight_info').eq('trip_id', 29).single();
    console.log('Trip 29 Config Companions:', config?.companions);

    // 4. Expenses (Potential Recovery Source)
    const { data: expenses } = await supabase.from('expenses').select('payer, split_details').eq('trip_id', 29);
    console.log('Expenses Count:', expenses?.length);

    // Recovery Simulator
    const recoveredCompanions = new Set<string>();
    expenses?.forEach(exp => {
        if (exp.payer) recoveredCompanions.add(exp.payer);
        if (exp.split_details) {
            Object.keys(exp.split_details).forEach(k => recoveredCompanions.add(k));
        }
    });
    console.log('Potential Recoverable Names from Expenses:', Array.from(recoveredCompanions));
}

checkTrip29();
