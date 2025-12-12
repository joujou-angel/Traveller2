import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log("🔍 Verifying Database Schema...");

    // Check 1: Profiles Table
    const { error: profileError } = await supabase.from('profiles').select('id').limit(1);
    if (profileError && profileError.code === '42P01') {
        console.error("❌ 'profiles' table missing!");
    } else {
        console.log("✅ 'profiles' table exists.");
    }

    // Check 2: Trip Memories Table
    const { error: memoriesError } = await supabase.from('trip_memories').select('id').limit(1);
    if (memoriesError && memoriesError.code === '42P01') {
        console.error("❌ 'trip_memories' table missing!");
    } else {
        console.log("✅ 'trip_memories' table exists.");
    }

    console.log("🏁 Verification Complete.");
}

verify();
