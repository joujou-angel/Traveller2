import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import ItineraryItem from './ItineraryItem';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DayViewProps {
    tripId: string; // Add tripId
    date: string; // ISO date string YYYY-MM-DD
    onEdit: (item: any) => void;
    isReadOnly?: boolean;
    items: any[];
    isLoading: boolean;
}

export default function DayView({ tripId, date, onEdit, isReadOnly = false, items, isLoading }: DayViewProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    // Fetch Items - Removed, lifted to parent


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
            <div className="space-y-0 relative">
                {items && items.length > 0 ? (
                    items.map((item: any, index: number) => {
                        // Calculate End Time
                        const [h, m] = item.start_time.split(':').map(Number);
                        const duration = item.duration || 60; // Default 60 if missing
                        const startDate = new Date();
                        startDate.setHours(h, m, 0, 0);
                        const endDate = new Date(startDate.getTime() + duration * 60000);
                        const endTimeStr = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

                        // Calculate Gap to Next
                        let gapElement = null;
                        if (index < items.length - 1) {
                            const nextItem = items[index + 1];
                            const [nh, nm] = nextItem.start_time.split(':').map(Number);
                            const nextDate = new Date();
                            nextDate.setHours(nh, nm, 0, 0);

                            // If next day? Assume same day sorting for now.
                            // Diff in minutes
                            const diffMs = nextDate.getTime() - endDate.getTime();
                            const diffMins = Math.floor(diffMs / 60000);

                            const isNegative = diffMins < 0;

                            gapElement = (
                                <div className="pl-4 border-l-2 border-dashed border-gray-300 h-12 flex items-center relative my-0">
                                    <div className={`absolute -left-[14px] bg-white border border-gray-200 text-[10px] font-bold text-gray-400 px-1.5 py-0.5 rounded-full shadow-sm z-10
                                         ${isNegative ? 'text-red-500 border-red-200 bg-red-50' : ''}`}>
                                        {isNegative ? '⚠️ ' : ''}{diffMins}m
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={item.id}>
                                <ItineraryItem
                                    item={{ ...item, endTime: endTimeStr }} // Pass calculated end time to item if needed, but Item might not accept it yet.
                                    onEdit={onEdit}
                                    isReadOnly={isReadOnly}
                                    onDelete={(id) => {
                                        if (confirm(t('common.confirmDelete', 'Are you sure you want to delete this item?'))) {
                                            deleteMutation.mutate(id);
                                        }
                                    }}
                                />
                                {gapElement}
                            </div>
                        );
                    })
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
