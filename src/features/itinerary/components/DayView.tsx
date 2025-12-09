import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import ItineraryItem from './ItineraryItem';
import { Loader2 } from 'lucide-react';

interface DayViewProps {
    tripId: string; // Add tripId
    date: string; // ISO date string YYYY-MM-DD
    onAdd: () => void;
    onEdit: (item: any) => void;
}

const fetchItineraries = async (tripId: string, date: string) => {
    const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('trip_id', tripId) // Filter by tripId
        .eq('date', date)
        .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
};

export default function DayView({ tripId, date, onAdd, onEdit }: DayViewProps) {
    const queryClient = useQueryClient();

    // Fetch Items
    const { data: items, isLoading } = useQuery({
        queryKey: ['itineraries', tripId, date], // Scope by tripId
        queryFn: () => fetchItineraries(tripId, date),
        enabled: !!tripId // Ensure tripId exists
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from('itineraries').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['itineraries', tripId, date] });
        }
    });

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-24">
            {/* Header / Add Button */}
            <div className="flex justify-end">
                {/* Header / Add Button - Removed in favor of FAB */}
                <div className="h-4"></div>
            </div>

            {/* List */}
            <div className="space-y-0">
                {items && items.length > 0 ? (
                    items.map((item: any) => (
                        <ItineraryItem
                            key={item.id}
                            item={item}
                            onEdit={onEdit}
                            onDelete={(id) => {
                                if (confirm('確定要刪除這個行程嗎？')) {
                                    deleteMutation.mutate(id);
                                }
                            }}
                        />
                    ))
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                        <p className="text-gray-400 mb-2">這天還沒有行程</p>
                        <button onClick={onAdd} className="text-btn font-bold hover:underline">
                            點擊新增
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
