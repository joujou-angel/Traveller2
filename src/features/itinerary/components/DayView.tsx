import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import ItineraryItem from './ItineraryItem';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DayViewProps {
    tripId: string; // Add tripId
    date: string; // ISO date string YYYY-MM-DD
    onEdit: (item: any) => void;
    isReadOnly?: boolean;
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

export default function DayView({ tripId, date, onEdit, isReadOnly = false }: DayViewProps) {
    const { t } = useTranslation();
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
                            isReadOnly={isReadOnly}
                            onDelete={(id) => {
                                if (confirm(t('common.confirmDelete', 'Are you sure you want to delete this item?'))) {
                                    deleteMutation.mutate(id);
                                }
                            }}
                        />
                    ))
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50 relative overflow-hidden">
                        <p className="text-gray-400 mb-2">{t('itinerary.noItems', 'No items for this day')}</p>

                        {!isReadOnly && (
                            <div className="fixed bottom-40 right-8 z-30 pointer-events-none animate-bounce">
                                <div className="relative">
                                    <p className="absolute -top-8 -left-20 w-32 text-xl text-gray-500 rotate-[-12deg] text-center font-bold">
                                        {t('itinerary.emptyStateHint', 'Start planning!')}
                                    </p>
                                    <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400 transform rotate-12">
                                        <path d="M20 20 C 40 20, 60 40, 70 80" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        <path d="M50 70 L 70 80 L 85 60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        )}
                        {!isReadOnly && (
                            <div className="text-gray-300 text-xs mt-2">
                                {/* Visual cue only, no text button */}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
