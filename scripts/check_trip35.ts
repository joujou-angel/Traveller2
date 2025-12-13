
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env manually
const envPath = path.resolve(__dirname, '../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrip35() {
    console.log('Checking Trip 35...');

    // 1. Check Trip existence and owner
    const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', 35)
        .single();

    if (tripError) {
        console.error('Error fetching trip:', tripError);
    } else {
        console.log('Trip 35 found:', { id: trip.id, user_id: trip.user_id, status: trip.status });
    }

    // 2. Check Trip Config
    const { data: config, error: configError } = await supabase
        .from('trip_config')
        .select('*')
        .eq('trip_id', 35)
        .single();

    if (configError) {
        console.error('Error fetching config (Expected if missing):', configError.message);
    } else {
        console.log('Trip Config found:', { id: config.id, flight_info: config.flight_info });
    }
}

checkTrip35();
