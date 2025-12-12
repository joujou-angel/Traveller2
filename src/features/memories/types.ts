export interface TripMemory {
    id: string;
    trip_item_id: number; // Matches itineraries.id (bigint) which Supabase returns as number/string
    user_id: string;
    content: string | null;
    mood_emoji: string | null;
    external_link: string | null;
    is_private: boolean;
    created_at: string;
}

export interface CreateMemoryDTO {
    trip_item_id: number;
    content?: string;
    mood_emoji?: string;
    external_link?: string;
    is_private?: boolean;
}

export interface UpdateMemoryDTO {
    content?: string;
    mood_emoji?: string;
    external_link?: string;
    is_private?: boolean;
}
