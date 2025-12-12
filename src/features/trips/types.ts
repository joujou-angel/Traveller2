export type Trip = {
    id: string;
    name: string;
    dates: { start: string; end: string }; // Assuming JSONB or similar structure in DB, or handle as separate cols
    cover_image: string;
    location: string;
    start_date: string; // Real DB column
    end_date: string;   // Real DB column
    user_id: string;    // Owner ID
    trip_config?: { companions: string[] } | { companions: string[] }[]; // Handle potential array return
    status?: string; // 'active' | 'archived'
    is_unlocked?: boolean;
};
