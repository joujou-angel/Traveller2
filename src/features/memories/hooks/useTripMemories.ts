import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import type { TripMemory, CreateMemoryDTO, UpdateMemoryDTO } from '../types';
import { toast } from 'sonner';

export const useTripMemories = (tripId: string) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch Memories for this Trip (My Memories Only)
    // Note: We fetch ALL memories for the trip's items to avoid N+1.
    // However, since memories are attached to trip_item_id, we just fetch by joining or filtering.
    // Because RLS enforces "view own only", we can just select all from trip_memories 
    // where trip_item_id belongs to this trip. 
    // A simpler approach for the frontend: fetch all memories for the user's active trip items.
    // BUT, complex join might be heavy. 
    // Alternative: Just fetch *all* memories for this user, and filter by tripId in client? 
    // No, performance.
    // Better: Fetch where trip_item_id IN (select id from itineraries where trip_id = X)

    const { data: memories, isLoading, error } = useQuery({
        queryKey: ['memories', tripId],
        queryFn: async () => {
            if (!user?.id) return [];

            // 1. Get Itinerary IDs for this trip first
            const { data: items, error: itemsError } = await supabase
                .from('itineraries')
                .select('id')
                .eq('trip_id', tripId);

            if (itemsError) throw itemsError;
            if (!items || items.length === 0) return [];

            const itemIds = items.map(i => i.id);

            // 2. Fetch Memories matching these items
            const { data, error } = await supabase
                .from('trip_memories')
                .select('*')
                .in('trip_item_id', itemIds);

            if (error) throw error;
            return data as TripMemory[];
        },
        enabled: !!user?.id && !!tripId
    });

    // Create Memory
    const createMemoryMutation = useMutation({
        mutationFn: async (newMemory: CreateMemoryDTO) => {
            if (!user?.id) throw new Error("Not authenticated");

            const { data, error } = await supabase
                .from('trip_memories')
                .insert({
                    ...newMemory,
                    user_id: user.id
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['memories', tripId] });
            toast.success('Memory saved!');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Failed to save memory');
        }
    });

    // Update Memory
    const updateMemoryMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: UpdateMemoryDTO }) => {
            const { data, error } = await supabase
                .from('trip_memories')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['memories', tripId] });
            toast.success('Memory updated');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Failed to update memory');
        }
    });

    // Delete Memory
    const deleteMemoryMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('trip_memories')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['memories', tripId] });
            toast.success('Memory deleted');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Failed to delete memory');
        }
    });

    return {
        memories,
        isLoading,
        error,
        createMemory: createMemoryMutation.mutate,
        updateMemory: updateMemoryMutation.mutate,
        deleteMemory: deleteMemoryMutation.mutate,
        isCreating: createMemoryMutation.isPending,
        isUpdating: updateMemoryMutation.isPending,
        isDeleting: deleteMemoryMutation.isPending
    };
};
