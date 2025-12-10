import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, MapPin, LogOut, Edit2, X, Loader2, Trash2, Crown, Save, Share2, ImageIcon, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TravellerLogo } from '../components/TravellerLogo';
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
    trip_config?: { companions: string[] } | { companions: string[] }[]; // Handle potential array return
};

const TripListPage = () => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const queryClient = useQueryClient();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
    const [editCompanions, setEditCompanions] = useState<string[]>([]);
    const [newCompanion, setNewCompanion] = useState('');
    const [showPhotoInput, setShowPhotoInput] = useState(false);

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
        mutationFn: async (updatedTrip: { id: string; name: string; cover_image: string; location: string; start_date: string; end_date: string; companions: string[] }) => {
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
                    .update({
                        flight_info: newFlightInfo,
                        companions: updatedTrip.companions
                    })
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
        // Safely extract companions
        let currentCompanions: string[] = [];
        if (trip.trip_config) {
            if (Array.isArray(trip.trip_config)) {
                if (trip.trip_config.length > 0) currentCompanions = trip.trip_config[0].companions || [];
            } else {
                currentCompanions = trip.trip_config.companions || [];
            }
        }
        // If empty and I am owner, maybe default to me? Logic exists in InfoPage but for editing let's just show what's there.
        setEditCompanions(currentCompanions);
        setShowPhotoInput(false);
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
            end_date: editingTrip.end_date,
            companions: editCompanions
        });
    };

    const handleAddCompanion = () => {
        const name = newCompanion.trim();
        if (!name) return;
        const forbidden = ['me', 'myself', '自分', '我'];
        if (forbidden.includes(name.toLowerCase())) {
            toast.error('Please use a specific name');
            return;
        }
        if (editCompanions.includes(name)) {
            toast.error('Name already exists');
            return;
        }
        setEditCompanions([...editCompanions, name]);
        setNewCompanion('');
    };

    const removeCompanion = (index: number) => {
        setEditCompanions(editCompanions.filter((_, i) => i !== index));
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
            const ownerName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Owner';
            await supabase.from('trip_config').insert({
                trip_id: tripData.id,
                flight_info: {
                    destination: data.destination,
                    startDate: data.start,
                    endDate: data.end
                },
                companions: [ownerName]
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
                            PLAN YOUR NEXT ADVENTURE
                        </p>
                    </div>

                    {/* User Area */}
                    <div className="flex items-center gap-4 pt-1">
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Welcome</p>
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
                                className="group bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-btn/30 active:scale-98"
                            >
                                <div className="flex gap-4">
                                    {/* Cover Image - Smaller size */}
                                    <div className="w-16 h-16 rounded-2xl bg-gray-200 shrink-0 overflow-hidden shadow-inner">
                                        {trip.cover_image ? (
                                            <img src={trip.cover_image} alt={trip.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                                <Calendar className="w-6 h-6 text-gray-300" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {/* Title Area */}
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-bold text-gray-800 text-lg truncate pr-2">{trip.name}</h3>
                                            {trip.user_id === user?.id && (
                                                <div className="bg-yellow-100 p-1.5 rounded-full shrink-0">
                                                    <Crown className="w-3 h-3 text-yellow-600 fill-yellow-600" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Dashed Separator */}
                                        <div className="border-b border-dashed border-gray-200 mb-2"></div>

                                        {/* Details */}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span className="text-sm font-medium">{trip.location}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-gray-400">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span className="text-xs font-mono">
                                                    {format(new Date(trip.start_date), 'MM/dd')} - {format(new Date(trip.end_date), 'MM/dd')}

                                                </span>
                                            </div>
                                        </div>

                                        {/* Bottom Row: Members & Actions */}
                                        <div className="flex justify-between items-end mt-2">
                                            {/* Members */}
                                            <div className="flex items-center">
                                                <div className="flex -space-x-2">
                                                    {(() => {
                                                        let comps: string[] = [];
                                                        if (trip.trip_config) {
                                                            if (Array.isArray(trip.trip_config)) comps = trip.trip_config[0]?.companions || [];
                                                            else comps = trip.trip_config.companions || [];
                                                        }
                                                        const displayComps = comps.slice(0, 3);
                                                        const remaining = comps.length - 3;
                                                        return (
                                                            <>
                                                                {displayComps.map((c, i) => (
                                                                    <div key={i} className="w-7 h-7 rounded-full bg-btn text-white text-[10px] font-bold flex items-center justify-center border-2 border-white ring-1 ring-gray-50 uppercase shadow-sm">
                                                                        {c.substring(0, 1)}
                                                                    </div>
                                                                ))}
                                                                {remaining > 0 && (
                                                                    <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center border-2 border-white ring-1 ring-gray-50 shadow-sm">
                                                                        +{remaining}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )
                                                    })()}
                                                </div>
                                                {(() => {
                                                    let count = 0;
                                                    if (trip.trip_config) {
                                                        if (Array.isArray(trip.trip_config)) count = trip.trip_config[0]?.companions?.length || 0;
                                                        else count = trip.trip_config.companions?.length || 0;
                                                    }
                                                    return count === 0 ? <span className="text-xs text-gray-300 ml-1 italic">No members</span> : null;
                                                })()}
                                            </div>

                                            {/* Actions Buttons */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const link = `${window.location.origin}/join/${trip.id}`;
                                                        navigator.clipboard.writeText(link);
                                                        toast.success('Link copied!');
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-btn hover:bg-orange-50 rounded-xl transition-colors"
                                                >
                                                    <Share2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleEditClick(e, trip)}
                                                    className="p-2 text-gray-400 hover:text-btn hover:bg-orange-50 rounded-xl transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
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

                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={handleCreateTrip}
                                    disabled={createTripMutation.isPending || !newTripName.trim() || !destination.trim() || !startDate || !endDate}
                                    className="w-full py-3 px-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {createTripMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                </button>
                            </div>
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
                                <h3 className="text-xl font-bold text-[#342b14]">Edit Trip</h3>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-[#554030] mb-1">Trip Name</label>
                                    <input
                                        type="text"
                                        value={editingTrip.name}
                                        onChange={(e) => setEditingTrip({ ...editingTrip, name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] transition-all font-medium text-[#342b14]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#554030] mb-1">Destination</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a39992]" />
                                        <input
                                            type="text"
                                            value={editingTrip.location}
                                            onChange={(e) => setEditingTrip({ ...editingTrip, location: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] transition-all font-medium text-[#342b14] text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-bold text-[#554030] mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={editingTrip.start_date}
                                            onChange={(e) => setEditingTrip({ ...editingTrip, start_date: e.target.value })}
                                            className="w-full px-3 py-3 rounded-xl bg-white border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] transition-all font-medium text-[#342b14] text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-[#554030] mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={editingTrip.end_date}
                                            onChange={(e) => setEditingTrip({ ...editingTrip, end_date: e.target.value })}
                                            className="w-full px-3 py-3 rounded-xl bg-white border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] transition-all font-medium text-[#342b14] text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[#554030] mb-1">Cover Image</label>
                                    {!showPhotoInput ? (
                                        <div
                                            className="relative h-32 rounded-xl overflow-hidden bg-gray-100 border border-[#e8e3de] group cursor-pointer"
                                            onClick={() => setShowPhotoInput(true)}
                                        >
                                            {editingTrip.cover_image ? (
                                                <img src={editingTrip.cover_image} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-400">
                                                    <ImageIcon className="w-8 h-8" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-white font-bold text-sm flex items-center gap-1">
                                                    <Edit2 className="w-4 h-4" /> Change Photo
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={editingTrip.cover_image}
                                                onChange={(e) => setEditingTrip({ ...editingTrip, cover_image: e.target.value })}
                                                placeholder="https://..."
                                                className="flex-1 px-4 py-3 rounded-xl bg-white border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] transition-all font-medium text-[#342b14] text-sm"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => setShowPhotoInput(false)}
                                                className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200"
                                            >
                                                <Check className="w-5 h-5 text-gray-600" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Companions Management */}
                                <div>
                                    <label className="block text-sm font-bold text-[#554030] mb-2">Companions</label>
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <input
                                                value={newCompanion}
                                                onChange={(e) => setNewCompanion(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddCompanion()}
                                                placeholder="Add name..."
                                                className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-btn focus:ring-2 focus:ring-btn/20 outline-none text-sm"
                                            />
                                            <button
                                                onClick={handleAddCompanion}
                                                type="button"
                                                className="p-2 bg-black text-white rounded-xl active:scale-95 transition-transform"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {editCompanions.map((c, i) => (
                                                <span key={i} className="pl-3 pr-2 py-1.5 bg-gray-50 text-gray-700 font-medium rounded-lg text-xs border border-gray-100 flex items-center gap-2">
                                                    {c}
                                                    <button onClick={() => removeCompanion(i)} className="text-gray-400 hover:text-red-500">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="w-14 h-14 rounded-2xl font-bold text-[#a39992] bg-white border border-[#e8e3de] hover:bg-gray-50 transition-colors flex items-center justify-center shadow-sm"
                                    title="Cancel"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteTripMutation.isPending || leaveTripMutation.isPending}
                                    className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl font-bold hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center shadow-sm"
                                    title="Delete Trip"
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
                                    className="w-14 h-14 bg-[#9B8D74] text-white rounded-2xl font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 flex justify-center items-center shadow-lg shadow-[#9B8D74]/20"
                                    title="Save Changes"
                                >
                                    {updateTripMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default TripListPage;
