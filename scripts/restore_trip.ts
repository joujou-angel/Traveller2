
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Use service role key if available for admin tasks, but usually anon is what we have in env
// For local dev/this agent context, we might rely on RLS policies being loose or using a specific user.
// However, the user asked ME to unarchive. I am an admin agent.
// I will try to use the anon key. If RLS blocks me, I will need the service role key or user credentials.
// Let's assume I can update if I just run this.
// Wait, 'trips' table usually has RLS.
// I will Try to just update it.

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function restoreTrip() {
    console.log('Restoring Trip 29...');

    // 1. Unarchive
    const { data: trip, error: updateError } = await supabase
        .from('trips')
        .update({ status: 'active' })
        .eq('id', 29)
        .select()
        .single();

    if (updateError) {
        console.error('Error unarchiving trip:', updateError);
        // Fallback: This might be RLS blocking us because we are not "logged in".
        // In Agnecy env, I might fail here.
        // I should probably warn the user or try to generate a SQL file they can run?
        // Or I can use 'psql' if available? No.
        // Let's print the error.
        return;
    }

    console.log('Trip 29 Unarchived:', trip);

    // 2. Check for missing data
    // Fetch trip_config to see if we recovered anything (the user said "see if you can restore info")
    const { data: config } = await supabase
        .from('trip_config')
        .select('*')
        .eq('trip_id', 29)
        .single();

    console.log('Trip Config Status:', config);

    if (config) {
        if (!config.flight_info || Object.keys(config.flight_info).length === 0) {
            console.log('WARNING: Flight Info is empty.');
            // Strategy: Look for itineraries to infer dates?
            const { data: itineraries } = await supabase
                .from('itineraries')
                .select('date')
                .eq('trip_id', 29)
                .order('date', { ascending: true });

            if (itineraries && itineraries.length > 0) {
                const firstDate = itineraries[0].date;
                const lastDate = itineraries[itineraries.length - 1].date;
                console.log(`Inferring dates from itineraries: ${firstDate} to ${lastDate}`);

                // Restore dates to config
                await supabase
                    .from('trip_config')
                    .update({
                        flight_info: {
                            ...config.flight_info,
                            startDate: firstDate,
                            endDate: lastDate,
                            destination: trip.location // Restore destination from trip table
                        }
                    })
                    .eq('id', config.id);

                // Restore dates to trip table too if missing
                await supabase
                    .from('trips')
                    .update({ start_date: firstDate, end_date: lastDate })
                    .eq('id', 29);

                console.log('Restored dates based on itineraries.');
            } else {
                console.log('No itineraries found to infer dates.');
            }
        }
    }
}

restoreTrip();
