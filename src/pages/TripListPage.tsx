import { Plus, LogOut, Loader2, Info, Plane, Archive } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { TravellerLogo } from '../components/TravellerLogo';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useState } from 'react';
import type { Trip } from '../features/trips/types';
import { TripCard } from '../features/trips/components/TripCard';
import { CreateTripModal } from '../features/trips/components/CreateTripModal';
import { EditTripModal } from '../features/trips/components/EditTripModal';
import { SubscriptionModal } from '../features/subscription/components/SubscriptionModal';
import { LanguageSwitcher } from '../features/settings/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const TripListPage = () => {
    const { t } = useTranslation();
    const { user, signOut } = useAuth();
    const queryClient = useQueryClient();

    // Modals State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

    // Fetch Profile (Subscription Status)
    const { data: profile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();
            // Allow 406/Not Found for early dev, default to free
            if (error && error.code !== 'PGRST116') console.warn('Profile fetch error', error);
            return data || { subscription_status: 'free', lifetime_trip_count: 0 };
        },
        enabled: !!user?.id
    });

    // Fetch Trips from Supabase
    const { data: trips, isLoading } = useQuery({
        queryKey: ['trips'],
        queryFn: async () => {
            // RLS policies now handle access control (Owners + Members)
            const { data, error } = await supabase
                .from('trips')
                .select('*, trip_config(companions)')
                .order('start_date', { ascending: true }); // We sort manually later

            if (error) throw error;
            return data as Trip[];
        },
        enabled: !!user?.id
    });

    // Archive Mutation
    const updateTripStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase.from('trips').update({ status }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast.success(t('common.success', 'Success'));
        },
        onError: (err) => {
            toast.error('Failed to update status');
            console.error(err);
        }
    });

    const activeTrips = trips?.filter(t => t.status !== 'archived') || [];
    const archivedTrips = trips?.filter(t => t.status === 'archived') || [];
    // Owner-Only Quota Logic: Only count trips owned by the current user
    const myActiveTrips = activeTrips.filter(t => t.user_id === user?.id);

    const handleEditClick = (e: React.MouseEvent, trip: Trip) => {
        e.stopPropagation(); // Prevent navigating to trip details
        setEditingTrip(trip);
        setIsEditModalOpen(true);
    };

    const handleArchiveClick = (e: React.MouseEvent, trip: Trip) => {
        e.stopPropagation();
        if (trip.status === 'archived') {
            // Unarchive Logic
            // Check limits before unarchiving?
            // "Free users can only have 3 active trips (OWNED)"
            if (profile?.subscription_status === 'free' && trip.user_id === user?.id && myActiveTrips.length >= 3) {
                toast.error(t('subscription.limitActive', 'Free plan allows only 3 active trips. Please archive another trip first.'));
                return;
            }
            updateTripStatusMutation.mutate({ id: trip.id, status: 'active' });
        } else {
            // Archive Logic
            if (confirm(t('trip.confirmArchive', 'Archive this trip? It will become read-only until unarchived.'))) {
                updateTripStatusMutation.mutate({ id: trip.id, status: 'archived' });
            }
        }
    };

    const handleCreateClick = () => {
        // Enforce Limits
        const isFree = profile?.subscription_status === 'free';

        if (isFree) {
            // 1. Check Active Limit (Owner Only)
            if (myActiveTrips.length >= 3) {
                toast.warning(t('subscription.activeLimitWarning', 'You have reached the active trip limit (3). Please archive one to create new.'));
                return;
            }
        }

        setIsCreateModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-page-bg pb-24">
            {/* Header */}
            <div className="bg-white px-6 pt-10 pb-6 shadow-sm sticky top-0 z-10 border-b border-gray-50">
                <div className="flex justify-between items-center">
                    {/* Brand Area */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 mb-1">
                            <TravellerLogo className="w-12 h-12" />
                            <h1 className="text-2xl font-bold text-page-title tracking-tight">Traveller</h1>
                        </div>
                        <p className="text-[10px] text-sub-title font-medium tracking-widest pl-1">
                            {profile?.subscription_status === 'pro' ? 'PRO MEMBER' : t('tripList.subtitle', 'PLAN YOUR NEXT ADVENTURE')}
                        </p>
                    </div>

                    {/* User Area */}
                    <div className="flex items-center gap-2 pt-1">
                        {/* DEV: Reset Subscription */}
                        {profile?.subscription_status === 'pro' && (
                            <button
                                onClick={async () => {
                                    await supabase.from('profiles').update({ subscription_status: 'free' }).eq('id', user?.id);
                                    queryClient.invalidateQueries({ queryKey: ['profile'] });
                                    toast.success('Reset to Free Plan');
                                }}
                                className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded hover:bg-gray-200"
                            >
                                Dev: Reset
                            </button>
                        )}
                        {/* Emergency Restore Button for Trip 29 */}
                        <button
                            onClick={async () => {
                                const toastId = toast.loading('Restoring Trip 29...');
                                try {
                                    // 1. Unarchive
                                    const { error: updateError } = await supabase.from('trips').update({ status: 'active' }).eq('id', 29);
                                    if (updateError) throw updateError;

                                    // 2. Restore Dates from Itinerary if missing
                                    const { data: config } = await supabase.from('trip_config').select('*').eq('trip_id', 29).single();
                                    if (config && (!config.flight_info || !config.flight_info.startDate)) {
                                        const { data: itineraries } = await supabase.from('itineraries').select('date').eq('trip_id', 29).order('date', { ascending: true });
                                        if (itineraries && itineraries.length > 0) {
                                            const firstDate = itineraries[0].date;
                                            const lastDate = itineraries[itineraries.length - 1].date;

                                            await supabase.from('trip_config').update({
                                                flight_info: { ...(config.flight_info || {}), startDate: firstDate, endDate: lastDate }
                                            }).eq('id', config.id);
                                            await supabase.from('trips').update({ start_date: firstDate, end_date: lastDate }).eq('id', 29);
                                            toast.success(`Restored dates: ${firstDate} - ${lastDate}`);
                                        }
                                    }

                                    toast.success('Trip 29 Unarchived & Processed!', { id: toastId });
                                    queryClient.invalidateQueries({ queryKey: ['trips'] });
                                } catch (e: any) {
                                    console.error(e);
                                    toast.error('Restore Failed: ' + e.message, { id: toastId });
                                }
                            }}
                            className="text-[10px] bg-red-100 text-red-500 px-2 py-1 rounded hover:bg-red-200 font-bold"
                        >
                            FIX TRIP 29
                        </button>
                        <LanguageSwitcher />
                        <button
                            onClick={signOut}
                            className="p-2.5 bg-gray-50 border border-gray-100 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Trip Lists */}
            <div className="p-6 space-y-8 pb-20">

                {/* Active Trips */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                            <Plane className="w-5 h-5 text-sky-500" />
                            {t('tripList.activeTrips', 'Active Trips')}
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-mono bg-white px-2 py-1 rounded-md border" title="Occupied Owner Slots">
                                {myActiveTrips.length} / {profile?.subscription_status === 'pro' ? '∞' : '3'}
                            </span>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-sub-title" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeTrips.length > 0 ? (
                                activeTrips.map(trip => (
                                    <TripCard
                                        key={trip.id}
                                        trip={trip}
                                        currentUserId={user?.id}
                                        onEditClick={handleEditClick}
                                        onArchiveClick={handleArchiveClick}
                                    />
                                ))
                            ) : (
                                <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50/50 rounded-2xl border border-dashed">
                                    {t('tripList.noActive', 'No active trips.')}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Archived Trips */}
                {(archivedTrips.length > 0 || isLoading) && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-500 flex items-center gap-2 opacity-80">
                            <Archive className="w-5 h-5" />
                            {t('tripList.archivedTrips', 'Archived')}
                        </h2>
                        <div className="space-y-4 opacity-80 hover:opacity-100 transition-opacity">
                            {archivedTrips.map(trip => (
                                <TripCard
                                    key={trip.id}
                                    trip={trip}
                                    currentUserId={user?.id}
                                    onEditClick={handleEditClick}
                                    onArchiveClick={handleArchiveClick}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Empty State Arrow (Only if truly empty) */}
            {!isLoading && trips?.length === 0 && (
                <div className="fixed bottom-40 right-8 z-30 pointer-events-none animate-bounce">
                    <div className="relative">
                        <p className="absolute -top-8 -left-20 w-32 font-handwriting text-xl text-gray-500 rotate-[-12deg] text-center font-bold">
                            {t('tripList.emptyState', 'Plan your first trip here!')}
                        </p>
                        <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400 transform rotate-12">
                            <path d="M20 20 C 40 20, 60 40, 70 80" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                            <path d="M50 70 L 70 80 L 85 60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Fixed Bottom Banner Plan Info */}
            {profile?.subscription_status !== 'pro' && (
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-orange-50 px-6 py-3 border-t border-orange-100 flex items-center justify-between animate-fade-in-up shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2 text-xs font-bold text-orange-800">
                        <Info className="w-4 h-4 text-orange-500" />
                        <span>{t('subscription.banner', 'Free Plan: Max {{active}} owned active trips. Joined trips FREE!', { active: 3 })}</span>
                    </div>
                    <button
                        onClick={() => setIsSubscriptionModalOpen(true)}
                        className="text-[10px] font-bold bg-white border border-orange-200 text-orange-600 px-3 py-1.5 rounded-full shadow-sm active:scale-95 flex items-center gap-1"
                    >
                        {t('subscription.upgradeBtn', 'UPGRADE')}
                    </button>
                </div>
            )}

            {/* FAB - Create Trip */}
            <button
                onClick={handleCreateClick}
                className="fixed bottom-24 right-6 w-14 h-14 bg-btn text-white rounded-full shadow-lg shadow-gray-200 flex items-center justify-center active:scale-90 transition-all hover:scale-105 z-40"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Modals */}
            <CreateTripModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            <SubscriptionModal
                isOpen={isSubscriptionModalOpen}
                onClose={() => setIsSubscriptionModalOpen(false)}
            />

            {editingTrip && (
                <EditTripModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingTrip(null);
                    }}
                    trip={editingTrip}
                />
            )}
        </div >
    );
};

export default TripListPage;
