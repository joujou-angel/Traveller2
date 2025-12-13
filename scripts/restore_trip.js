
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually read .env
try {
    const envPath = path.resolve(__dirname, '../.env');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.warn('Could not read .env file:', e.message);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

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
        return;
    }

    console.log('Trip 29 Unarchived:', trip);

    // 2. Check for missing data
    const { data: config } = await supabase
        .from('trip_config')
        .select('*')
        .eq('trip_id', 29)
        .single();

    console.log('Trip Config Status:', config);

    if (config) {
        const hasFlightDates = config.flight_info && config.flight_info.startDate;

        if (!hasFlightDates) {
            console.log('WARNING: Flight Info/Dates missing or empty.');

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
                            ...(config.flight_info || {}),
                            startDate: firstDate,
                            endDate: lastDate,
                            destination: trip.location
                        }
                    })
                    .eq('id', config.id);

                // Restore dates to trip table too
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
