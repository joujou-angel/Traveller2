import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Loader2, Plus } from 'lucide-react';
import DayView from '../features/itinerary/components/DayView';
import ItineraryForm from '../features/itinerary/components/ItineraryForm';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useTranslation } from 'react-i18next';

const fetchTripConfig = async (tripId: string) => {
    const { data, error } = await supabase
        .from('trip_config')
        .select('flight_info, trips(user_id)') // Fetch trip owner via join
        .eq('trip_id', tripId)
        .single();

    if (error) throw error;
    if (!data?.flight_info?.startDate) return null;
    const tripsData = data.trips as any; // Cast to bypass array check
    return { ...data.flight_info, ownerId: tripsData?.user_id || (Array.isArray(tripsData) ? tripsData[0]?.user_id : null) };
};

export default function ItineraryPage() {
    const { t } = useTranslation();
    const { tripId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    // State
    const [activeDayIndex, setActiveDayIndex] = useState(0);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null); // If null, it's Add mode

    // 1. Fetch Trip Dates
    const { data: tripInfo, isLoading, error } = useQuery({
        queryKey: ['tripConfig', tripId],
        queryFn: () => fetchTripConfig(tripId!),
        enabled: !!tripId,
        retry: false
    });

    const isOwner = tripInfo?.ownerId === user?.id; // Check ownership

    // 2. Calculate Day Tabs
    const days = useMemo(() => {
        if (!tripInfo) return [];

        const start = new Date(tripInfo.startDate);
        const end = new Date(tripInfo.endDate);
        const list = [];

        // Safety check loop limit
        let current = new Date(start);
        let count = 1;
        while (current <= end && count <= 30) {
            list.push({
                label: t('itinerary.day', { count }),
                date: current.toISOString().split('T')[0], // YYYY-MM-DD
                fullDate: new Date(current) // clone
            });
            current.setDate(current.getDate() + 1);
            count++;
        }
        return list;
    }, [tripInfo, t]);

    // Mutations
    const upsertMutation = useMutation({
        mutationFn: async (formData: any) => {
            const payload = {
                ...formData,
                trip_id: tripId, // Add trip_id
                // Ensure date is set to the currently active tab's date
                date: days[activeDayIndex].date
            };

            if (editingItem) {
                // Update
                const { error } = await supabase
                    .from('itineraries')
                    .update(payload)
                    .eq('id', editingItem.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('itineraries')
                    .insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['itineraries', tripId] }); // Scope by tripId
            setIsFormOpen(false);
            setEditingItem(null);
        },
        onError: (error) => {
            console.error('Mutation Error:', error);
            alert(`${t('common.error', 'Error')}: ${error.message}`);
        }
    });

    // Handlers
    const handleAdd = () => {
        setEditingItem(null);
        setIsFormOpen(true);
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleFormSubmit = (data: any) => {
        upsertMutation.mutate(data);
    };

    // Auto-scroll active tab into view
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollContainerRef.current) {
            const activeTab = scrollContainerRef.current.children[activeDayIndex] as HTMLElement;
            if (activeTab) {
                activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeDayIndex]);

    // Rendering
    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (error || days.length === 0) {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                <h2 className="text-xl font-bold text-gray-700 mb-2">{t('itinerary.noTripConfig', 'No trip configuration yet')}</h2>
                {isOwner ? (
                    <button
                        onClick={() => navigate(`/trips/${tripId}/setup`)}
                        className="bg-gray-900 text-white px-6 py-2 rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        {t('common.goToSetup', 'Go to Setup')}
                    </button>
                ) : (
                    <p className="text-gray-400 text-sm">{t('itinerary.waitCoordinates', 'Please wait for the organizer to set dates and location')}</p>
                )}
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-page-bg">

            {/* Sticky Header with Tabs */}
            <div className="sticky top-0 bg-page-bg/95 backdrop-blur-sm z-10 border-b border-gray-100 shadow-sm">
                <div
                    ref={scrollContainerRef}
                    className="px-4 py-3 pb-2 overflow-x-auto flex gap-2 snap-x scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                >
                    {days.map((day, idx) => (
                        <button
                            key={day.date}
                            onClick={() => setActiveDayIndex(idx)}
                            className={`
                            snap-start flex-shrink-0 px-4 py-3 rounded-t-2xl font-bold text-sm transition-all relative
                            ${activeDayIndex === idx ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}
                        `}
                        >
                            <span>{day.label}</span>
                            <div className="text-[10px] opacity-60 font-medium">
                                {day.fullDate.getMonth() + 1}/{day.fullDate.getDate()}
                            </div>

                            {/* Active Indicator Line */}
                            {activeDayIndex === idx && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-main-title"></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-4 bg-page-bg min-h-[calc(100vh-140px)]">
                <DayView
                    tripId={tripId!} // Pass tripId
                    date={days[activeDayIndex].date}
                    onEdit={handleEdit}
                    isReadOnly={!isOwner}
                />
            </div>

            {/* FAB - Only show for Owner */}
            {isOwner && (
                <button
                    onClick={handleAdd}
                    className="fixed bottom-24 right-6 w-14 h-14 bg-btn text-white rounded-full shadow-lg shadow-gray-200 flex items-center justify-center active:scale-90 transition-all hover:scale-105 z-40"
                >
                    <Plus className="w-6 h-6" />
                </button>
            )}

            {/* Form Modal */}
            {isFormOpen && (
                <ItineraryForm
                    initialData={editingItem}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setIsFormOpen(false)}
                />
            )}
        </div>
    );
}
