
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser since we can't rely on dotenv pkg presence/types in JS mode easily without node_modules mess
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        const content = fs.readFileSync(envPath, 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                env[key] = value;
            }
        });
        return env;
    } catch (e) {
        console.error('Error loading .env', e);
        return {};
    }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrip29() {
    console.log('--- Checking Trip 29 Status (JS) ---');

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

    // Recovery Simulator
    const recoveredCompanions = new Set();
    expenses?.forEach(exp => {
        if (exp.payer) recoveredCompanions.add(exp.payer);
        if (exp.split_details) {
            Object.keys(exp.split_details).forEach(k => recoveredCompanions.add(k));
        }
    });
    console.log('Potential Recoverable Names from Expenses:', Array.from(recoveredCompanions));
}

checkTrip29();
