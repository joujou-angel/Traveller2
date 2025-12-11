import { Plus, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { TravellerLogo } from '../components/TravellerLogo';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useState } from 'react';
import type { Trip } from '../features/trips/types';
import { TripCard } from '../features/trips/components/TripCard';
import { CreateTripModal } from '../features/trips/components/CreateTripModal';
import { EditTripModal } from '../features/trips/components/EditTripModal';
import { LanguageSwitcher } from '../features/settings/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const TripListPage = () => {
    const { t } = useTranslation();
    const { user, signOut } = useAuth();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Fetch Trips from Supabase
    const { data: trips, isLoading } = useQuery({
        queryKey: ['trips'],
        queryFn: async () => {
            // RLS policies now handle access control (Owners + Members)
            // Just select * from trips and let Supabase filter it for us.
            const { data, error } = await supabase
                .from('trips')
                .select('*, trip_config(companions)')
                .order('start_date', { ascending: true });

            if (error) throw error;
            return data as Trip[];
        },
        enabled: !!user?.id
    });

    const handleEditClick = (e: React.MouseEvent, trip: Trip) => {
        e.stopPropagation(); // Prevent navigating to trip details
        setEditingTrip(trip);
        setIsEditModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-page-bg pb-24">
            {/* Header */}
            <div className="bg-white px-6 pt-10 pb-6 shadow-sm sticky top-0 z-10 border-b border-gray-50">
                <div className="flex justify-between items-start">
                    {/* Brand Area */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 mb-1">
                            <TravellerLogo className="w-12 h-12" />
                            <h1 className="text-2xl font-bold text-page-title tracking-tight">Traveller</h1>
                        </div>
                        <p className="text-[10px] text-sub-title font-medium tracking-widest pl-1">
                            {t('tripList.subtitle', 'PLAN YOUR NEXT ADVENTURE')}
                        </p>
                    </div>

                    {/* User Area */}
                    <div className="flex items-center gap-2 pt-1">
                        <LanguageSwitcher />
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('tripList.welcome', 'Welcome')}</p>
                            <p className="text-sm font-bold text-main-title">{user?.user_metadata?.name || user?.email?.split('@')[0] || 'Guest'}</p>
                        </div>
                        <button
                            onClick={signOut}
                            className="p-2.5 bg-gray-50 border border-gray-100 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Trip List */}
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-700">{t('tripList.myTrips', 'My Trips')}</h2>
                    <span className="text-sm text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">{trips?.length || 0} {t('tripList.plans', 'Plans')}</span>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-8 h-8 animate-spin text-sub-title" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {trips?.map(trip => (
                            <TripCard
                                key={trip.id}
                                trip={trip}
                                currentUserId={user?.id}
                                onEditClick={handleEditClick}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Empty State Arrow */}
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

            {/* FAB - Create Trip */}
            <button
                onClick={() => setIsCreateModalOpen(true)}
                className="fixed bottom-24 right-6 w-14 h-14 bg-btn text-white rounded-full shadow-lg shadow-gray-200 flex items-center justify-center active:scale-90 transition-all hover:scale-105 z-40"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Modals */}
            <CreateTripModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
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
