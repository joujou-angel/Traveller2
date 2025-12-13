import { supabase } from '../../../lib/supabase';

// Types
export interface ImportItem {
    time: string; // "HH:MM"
    location: string;
    category: 'transport' | 'food' | 'stay' | 'activity';
    notes?: string;
    link?: string;
}

export interface TripTemplate {
    trip_name: string;
    days: {
        day_number: number;
        date: string; // YYYY-MM-DD (Expected start date, adjustable)
        activities: ImportItem[];
    }[];
}

/**
 * Generates and downloads a JSON template for the current trip.
 */
export const exportTripTemplate = (tripName: string, tripDates: { date: string; label: string }[]) => {
    const template: TripTemplate = {
        trip_name: tripName || "My Trip",
        days: tripDates.map((d, index) => ({
            day_number: index + 1,
            date: d.date,
            activities: [
                {
                    time: "10:00",
                    location: "Example Location",
                    category: "activity",
                    notes: "Replace with your plan",
                    link: ""
                }
            ]
        }))
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tripName.replace(/\s+/g, '_')}_template.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Parses and saves the imported JSON content to Supabase.
 */
export const importItinerary = async (tripId: string, startDate: string, file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string) as TripTemplate;

                if (!json.days || !Array.isArray(json.days)) {
                    throw new Error("Invalid format: 'days' array is missing.");
                }

                const tripStart = new Date(startDate);
                const itemsToInsert: any[] = [];

                json.days.forEach((day) => {
                    // Calculate date based on day_number if date is missing or to align with current trip start
                    const targetDate = new Date(tripStart);
                    targetDate.setDate(tripStart.getDate() + (day.day_number - 1));
                    const dateStr = targetDate.toISOString().split('T')[0];

                    if (day.activities && Array.isArray(day.activities)) {
                        day.activities.forEach((activity) => {
                            // Basic validation
                            if (!activity.location) return;

                            itemsToInsert.push({
                                trip_id: tripId,
                                date: dateStr,
                                start_time: activity.time || "09:00",
                                location: activity.location,
                                category: activity.category || 'activity',
                                notes: activity.notes || '',
                                google_map_link: activity.link || '',
                                is_booked: false
                            });
                        });
                    }
                });

                if (itemsToInsert.length === 0) {
                    throw new Error("No valid activities found to import.");
                }

                // Supabase Insert
                const { error } = await supabase
                    .from('itineraries')
                    .insert(itemsToInsert);

                if (error) throw error;

                resolve();
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
    });
};
