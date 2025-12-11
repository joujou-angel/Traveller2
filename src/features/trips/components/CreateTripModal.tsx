import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { useTranslation } from 'react-i18next';

interface CreateTripModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateTripModal = ({ isOpen, onClose }: CreateTripModalProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

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
            toast.success(t('trip.createSuccess', 'Trip created successfully!'));
            onClose();
            setNewTripName('');
            setDestination('');
            setStartDate('');
            setEndDate('');
            navigate(`/trips/${data.id}/itinerary`); // Redirect to new trip
        },
        onError: (error: any) => {
            toast.error(t('trip.createError', 'Failed to create trip') + ': ' + (error.message || 'Unknown error'));
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">{t('trip.createTitle', 'New Trip')}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('trip.tripName', 'Trip Name')}</label>
                    <input
                        type="text"
                        placeholder={t('trip.tripNamePlaceholder', 'e.g. Kyoto Summer Trip')}
                        value={newTripName}
                        onChange={(e) => setNewTripName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-btn focus:ring-2 focus:ring-btn/20 outline-none transition-all font-medium text-gray-800 placeholder:text-gray-400"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('trip.destination', 'Destination')}</label>
                    <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('trip.destinationPlaceholder', 'e.g. Tokyo, Japan')}
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-btn focus:ring-2 focus:ring-btn/20 outline-none transition-all font-medium text-gray-800 placeholder:text-gray-400"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">{t('trip.startDate', 'Start Date')}</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-btn focus:ring-2 focus:ring-btn/20 outline-none transition-all font-medium text-gray-800 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">{t('trip.endDate', 'End Date')}</label>
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
    );
};
