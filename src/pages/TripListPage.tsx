import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, MapPin, ChevronRight, LogOut, Edit2, X, Loader2, Trash2, Check, Crown, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';

type Trip = {
    id: string;
    name: string;
    dates: { start: string; end: string }; // Assuming JSONB or similar structure in DB, or handle as separate cols
    cover_image: string;
    location: string;
    start_date: string; // Real DB column
    end_date: string;   // Real DB column
    user_id: string;    // Owner ID
};

const TripListPage = () => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const queryClient = useQueryClient();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

    // Fetch Trips from Supabase
    const { data: trips, isLoading } = useQuery({
        queryKey: ['trips'],
        queryFn: async () => {
            // RLS policies now handle access control (Owners + Members)
            // Just select * from trips and let Supabase filter it for us.
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .order('start_date', { ascending: true });

            if (error) throw error;
            return data as Trip[];
        },
        enabled: !!user?.id
    });

    const deleteTripMutation = useMutation({
        mutationFn: async (tripId: string) => {
            const { error } = await supabase
                .from('trips')
                .delete()
                .eq('id', tripId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast.success('Trip deleted successfully');
            setIsEditModalOpen(false);
        },
        onError: (error) => {
            toast.error('Failed to delete trip');
            console.error(error);
        }
    });

    const leaveTripMutation = useMutation({
        mutationFn: async (tripId: string) => {
            const { error } = await supabase
                .from('trip_members')
                .delete()
                .eq('trip_id', tripId)
                .eq('user_id', user?.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast.success('Left trip successfully');
            setIsEditModalOpen(false);
        },
        onError: (error) => {
            toast.error('Failed to leave trip');
            console.error(error);
        }
    });

    const updateTripMutation = useMutation({
        mutationFn: async (updatedTrip: { id: string; name: string; cover_image: string; location: string; start_date: string; end_date: string }) => {
            // 1. Update 'trips' table
            const { error: tripError } = await supabase
                .from('trips')
                .update({
                    name: updatedTrip.name,
                    cover_image: updatedTrip.cover_image,
                    location: updatedTrip.location,
                    start_date: updatedTrip.start_date,
                    end_date: updatedTrip.end_date
                })
                .eq('id', updatedTrip.id);
            if (tripError) throw tripError;

            // 2. Fetch current trip_config to preserve flights
            const { data: configData, error: fetchError } = await supabase
                .from('trip_config')
                .select('flight_info')
                .eq('trip_id', updatedTrip.id)
                .single();

            if (!fetchError && configData) {
                // 3. Update 'trip_config' with new dates/destination, preserving flights
                const currentFlightInfo = configData.flight_info || {};
                const newFlightInfo = {
                    ...currentFlightInfo,
                    destination: updatedTrip.location,
                    startDate: updatedTrip.start_date,
                    endDate: updatedTrip.end_date
                };

                const { error: configUpdateError } = await supabase
                    .from('trip_config')
                    .update({ flight_info: newFlightInfo })
                    .eq('trip_id', updatedTrip.id);

                if (configUpdateError) console.error('Failed to sync trip_config:', configUpdateError);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            // Also invalidate tripConfig in case user navigates immediately
            queryClient.invalidateQueries({ queryKey: ['tripConfig'] });
            toast.success('Trip updated successfully');
            setIsEditModalOpen(false);
        },
        onError: (error) => {
            toast.error('Failed to update trip');
            console.error(error);
        }
    });

    const handleEditClick = (e: React.MouseEvent, trip: Trip) => {
        e.stopPropagation(); // Prevent navigating to trip details
        setEditingTrip(trip);
        setIsEditModalOpen(true);
    };

    const handleSave = () => {
        if (!editingTrip) return;
        updateTripMutation.mutate({
            id: editingTrip.id,
            name: editingTrip.name,
            cover_image: editingTrip.cover_image,
            location: editingTrip.location,
            start_date: editingTrip.start_date,
            end_date: editingTrip.end_date
        });
    };

    const handleDelete = () => {
        if (!editingTrip) return;

        const isOwner = editingTrip.user_id === user?.id;

        if (isOwner) {
            if (window.confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
                deleteTripMutation.mutate(editingTrip.id);
            }
        } else {
            if (window.confirm('Are you sure you want to leave this trip? You will need an invite to join again.')) {
                leaveTripMutation.mutate(editingTrip.id);
            }
        }
    };

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newTripName, setNewTripName] = useState('');
    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const createTripMutation = useMutation({
        mutationFn: async (data: { name: string; destination: string; start: string; end: string }) => {
            const { data: tripData, error } = await supabase
                .from('trips')
                .insert({
                    name: data.name,
                    user_id: user?.id,
                    start_date: data.start,
                    end_date: data.end,
                    cover_image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
                    location: data.destination
                })
                .select()
                .single();
            if (error) throw error;

            // Also create a default trip_config so ItineraryPage doesn't think it's unconfigured
            await supabase.from('trip_config').insert({
                trip_id: tripData.id,
                flight_info: {
                    destination: data.destination,
                    startDate: data.start,
                    endDate: data.end
                }
            });

            return tripData;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast.success('Trip created successfully!');
            setIsCreateModalOpen(false);
            setNewTripName('');
            setDestination('');
            setStartDate('');
            setEndDate('');
            navigate(`/trips/${data.id}/itinerary`); // Redirect to new trip
        },
        onError: (error: any) => {
            toast.error('Failed to create trip: ' + (error.message || 'Unknown error'));
            console.error('Create Trip Error:', error);
        }
    });

    const handleCreateTrip = () => {
        if (!newTripName.trim() || !destination.trim() || !startDate || !endDate) return;
        createTripMutation.mutate({
            name: newTripName,
            destination: destination,
            start: startDate,
            end: endDate
        });
    };

    return (
        <div className="min-h-screen bg-page-bg pb-24">
            {/* Header */}
            <div className="bg-white px-6 pt-12 pb-6 shadow-sm sticky top-0 z-10">
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Welcome back</p>
                        <h1 className="text-2xl font-bold text-gray-800">{user?.user_metadata?.name || user?.email?.split('@')[0] || 'Traveller'}</h1>
                    </div>
                    <button
                        onClick={signOut}
                        className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Trip List */}
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-700">My Trips</h2>
                    <span className="text-sm text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">{trips?.length || 0} Plans</span>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-8 h-8 animate-spin text-sub-title" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {trips?.map(trip => (
                            <div
                                key={trip.id}
                                onClick={() => navigate(`/trips/${trip.id}/itinerary`)}
                                className="group bg-white rounded-3xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-btn/30 active:scale-98 relative"
                            >
                                {/* Edit Button */}
                                <button
                                    onClick={(e) => handleEditClick(e, trip)}
                                    className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-btn hover:text-white text-gray-400"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>

                                <div className="flex gap-4">
                                    <div className="w-24 h-24 rounded-2xl bg-gray-200 shrink-0 overflow-hidden relative">
                                        {trip.cover_image ? (
                                            <img src={trip.cover_image} alt={trip.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                                                <MapPin className="w-8 h-8" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center py-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-bold text-gray-800 leading-tight">{trip.name}</h3>
                                            {trip.user_id === user?.id ? (
                                                <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />
                                            ) : (
                                                <Users className="w-3 h-3 text-blue-500 fill-blue-500 shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium mb-2">
                                            <MapPin className="w-3 h-3" />
                                            {trip.location || 'No Location'}
                                        </div>
                                        {(trip.start_date && trip.end_date) && (
                                            <div className="flex items-center gap-1.5 text-date-selected-text text-xs font-bold bg-date-selected-bg w-fit px-2 py-1 rounded-lg">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(trip.start_date), 'MMM d')} - {format(new Date(trip.end_date), 'MMM d')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center text-gray-300">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        ))}

                    </div>
                )}
            </div>

            {/* FAB - Create Trip */}
            <button
                onClick={() => setIsCreateModalOpen(true)}
                className="fixed bottom-24 right-6 w-14 h-14 bg-btn text-white rounded-full shadow-lg shadow-gray-200 flex items-center justify-center active:scale-90 transition-all hover:scale-105 z-40"
            >
                <Plus className="w-6 h-6" />
            </button>


            {/* Create Trip Modal */}
            {
                isCreateModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)}>
                        <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-800">New Trip</h3>
                                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Trip Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Kyoto Summer Trip"
                                    value={newTripName}
                                    onChange={(e) => setNewTripName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-btn focus:ring-2 focus:ring-btn/20 outline-none transition-all font-medium text-gray-800 placeholder:text-gray-400"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Destination</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="e.g. Tokyo, Japan"
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-btn focus:ring-2 focus:ring-btn/20 outline-none transition-all font-medium text-gray-800 placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-btn focus:ring-2 focus:ring-btn/20 outline-none transition-all font-medium text-gray-800 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-btn focus:ring-2 focus:ring-btn/20 outline-none transition-all font-medium text-gray-800 text-sm"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleCreateTrip}
                                disabled={createTripMutation.isPending || !newTripName.trim() || !destination.trim() || !startDate || !endDate}
                                className="w-full py-3 px-4 bg-btn text-white rounded-xl font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-sm"
                            >
                                {createTripMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Edit Modal */}
            {
                isEditModalOpen && editingTrip && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}>
                        <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-800">Edit Trip</h3>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Trip Name</label>
                                    <input
                                        type="text"
                                        value={editingTrip.name}
                                        onChange={(e) => setEditingTrip({ ...editingTrip, name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-btn focus:ring-2 focus:ring-btn/20 outline-none transition-all font-medium text-gray-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Destination</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={editingTrip.location}
                                            onChange={(e) => setEditingTrip({ ...editingTrip, location: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-btn focus:ring-2 focus:ring-btn/20 outline-none transition-all font-medium text-gray-800 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={editingTrip.start_date}
                                            onChange={(e) => setEditingTrip({ ...editingTrip, start_date: e.target.value })}
                                            className="w-full px-3 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-btn focus:ring-2 focus:ring-btn/20 outline-none transition-all font-medium text-gray-800 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={editingTrip.end_date}
                                            onChange={(e) => setEditingTrip({ ...editingTrip, end_date: e.target.value })}
                                            className="w-full px-3 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-btn focus:ring-2 focus:ring-btn/20 outline-none transition-all font-medium text-gray-800 text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Cover Image URL</label>
                                    <input
                                        type="text"
                                        value={editingTrip.cover_image}
                                        onChange={(e) => setEditingTrip({ ...editingTrip, cover_image: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-btn focus:ring-2 focus:ring-btn/20 outline-none transition-all font-medium text-gray-800 text-sm"
                                    />
                                    {editingTrip.cover_image && (
                                        <div className="mt-2 h-32 rounded-xl overflow-hidden bg-gray-100">
                                            <img src={editingTrip.cover_image} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-center"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteTripMutation.isPending}
                                    className="flex-1 py-3 px-4 bg-red-50 text-red-500 rounded-xl font-bold hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center"
                                >
                                    {deleteTripMutation.isPending || leaveTripMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                        editingTrip.user_id === user?.id ? (
                                            <Trash2 className="w-6 h-6" />
                                        ) : (
                                            <LogOut className="w-6 h-6" />
                                        )
                                    )}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={updateTripMutation.isPending}
                                    className="flex-1 py-3 px-4 bg-btn text-white rounded-xl font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-sm"
                                >
                                    {updateTripMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default TripListPage;
