
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ovquzddkkgywvlqyhekc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92cXV6ZGRra2d5d3ZscXloZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDIyMDgsImV4cCI6MjA4MDc3ODIwOH0._cTWaiRGmbE31CbXKqQhO9rjZd_tIe__8ceQb1zuz_c';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LOCATIONS_BY_CATEGORY = {
    activity: [
        'Central Park', 'Museum of Modern Art', 'City Viewpoint', 'Historic Temple', 'Botanical Garden'
    ],
    food: [
        'Local Market Food Stalls', 'Sunset Restaurant', 'Specialty Coffee Shop', 'Rooftop Bar', 'Traditional Noodle House'
    ],
    transport: [
        'Central Station Bus Terminal', 'Airport Express Train', 'Ferry Pier', 'City Tram', 'Taxi Stand'
    ],
    stay: [
        'Grand Hotel', 'Cozy Boutique Hostel', 'Seaside Resort', 'City Center Apartment', 'Mountain Lodge'
    ]
};

const CATEGORY_SEQUENCE = ['transport', 'activity', 'food', 'activity', 'stay'];
const TIME_SEQUENCE = ['09:00', '10:30', '12:30', '15:00', '19:00'];

const main = async () => {
    console.log('Fetching trip config...');
    const { data, error } = await supabase
        .from('trip_config')
        .select('flight_info')
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching trip config:', error);
        return;
    }

    if (!data?.flight_info?.startDate) {
        console.error('No trip dates found');
        return;
    }

    const { startDate, endDate } = data.flight_info;
    const days = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    let count = 1;

    console.log(`Generating data for dates: ${startDate} to ${endDate}`);

    while (current <= end && count <= 30) {
        days.push({
            date: current.toISOString().split('T')[0],
            label: `Day ${count}`
        });
        current.setDate(current.getDate() + 1);
        count++;
    }

    const allItems = [];

    for (const day of days) {
        for (let i = 0; i < 5; i++) {
            const category = CATEGORY_SEQUENCE[i];
            const locations = LOCATIONS_BY_CATEGORY[category];
            const randomLocation = locations[Math.floor(Math.random() * locations.length)];

            allItems.push({
                date: day.date,
                start_time: TIME_SEQUENCE[i],
                category: category,
                location: `${randomLocation} (${day.label})`,
                notes: '🤖 Pre-seeded Item'
            });
        }
    }

    console.log(`Inserting ${allItems.length} items...`);

    // Chunk inserts if too many
    // Supabase usually handles arrays well, but just in case
    const chunkSize = 20;
    for (let i = 0; i < allItems.length; i += chunkSize) {
        const chunk = allItems.slice(i, i + chunkSize);
        const { error: insertError } = await supabase
            .from('itineraries')
            .insert(chunk);

        if (insertError) {
            console.error('Insert error details:', JSON.stringify(insertError, null, 2));
            if (insertError.code === '42501') {
                console.error('This looks like an RLS (Row Level Security) error. Ensure the table allows anonymous inserts.');
            }
        } else {
            console.log(`Inserted chunk ${i / chunkSize + 1}`);
        }
    }

    console.log('Done!');
};

main();
