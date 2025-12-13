import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, MapPin, Edit2, ImageIcon, Check, Plus, Trash2, LogOut, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import type { Trip } from '../types';
import { useTranslation } from 'react-i18next';

interface EditTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    trip: Trip;
}

export const EditTripModal = ({ isOpen, onClose, trip }: EditTripModalProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [editingTrip, setEditingTrip] = useState<Trip>(trip);
    const [editCompanions, setEditCompanions] = useState<string[]>([]);
    const [newCompanion, setNewCompanion] = useState('');
    const [showPhotoInput, setShowPhotoInput] = useState(false);

    // Initialize state when trip changes
    useEffect(() => {
        if (trip) {
            setEditingTrip(trip);
            let currentCompanions: string[] = [];
            if (trip.trip_config) {
                if (Array.isArray(trip.trip_config)) {
                    if (trip.trip_config.length > 0) currentCompanions = trip.trip_config[0].companions || [];
                } else {
                    currentCompanions = trip.trip_config.companions || [];
                }
            }
            setEditCompanions(currentCompanions);
            setShowPhotoInput(false);
        }
    }, [trip, isOpen]);

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
            toast.success(t('trip.updateSuccess', 'Trip updated successfully'));
            onClose();
        },
        onError: (error) => {
            toast.error(t('trip.updateError', 'Failed to update trip'));
            console.error(error);
        }
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
            toast.success(t('trip.deleteSuccess', 'Trip deleted successfully'));
            onClose();
        },
        onError: (error) => {
            toast.error(t('trip.deleteError', 'Failed to delete trip'));
            console.error(error);
        }
    });

    const leaveTripMutation = useMutation({
        mutationFn: async (tripId: string) => {
            // 1. Remove name from trip_config.companions
            // We do this FIRST because if we remove the member row first, we might lose RLS write permission to trip_config.

            // A. Get User Name
            const userName = user?.user_metadata?.name || user?.email?.split('@')[0];

            if (userName) {
                // B. Fetch current companions
                const { data: configData, error: configError } = await supabase
                    .from('trip_config')
                    .select('id, companions')
                    .eq('trip_id', tripId)
                    .single();

                if (!configError && configData) {
                    const currentCompanions = configData.companions || [];
                    // C. Filter out user name (Case insensitive check)
                    const newCompanions = currentCompanions.filter((c: string) => c.toLowerCase() !== userName.toLowerCase());

                    // Only update if changes found
                    if (newCompanions.length !== currentCompanions.length) {
                        await supabase
                            .from('trip_config')
                            .update({ companions: newCompanions })
                            .eq('id', configData.id);
                        // We ignore update errors here to ensure we still proceed to leave the trip
                    }
                }
            }

            // 2. Remove from trip_members
            const { error: memberError } = await supabase
                .from('trip_members')
                .delete()
                .eq('trip_id', tripId)
                .eq('user_id', user?.id);
            if (memberError) throw memberError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast.success(t('trip.leaveSuccess', 'Left trip successfully'));
            onClose();
        },
        onError: (error) => {
            toast.error(t('trip.leaveError', 'Failed to leave trip'));
            console.error(error);
        }
    });

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
            toast.error(t('trip.companionInvalid', 'Please use a specific name'));
            return;
        }
        if (editCompanions.includes(name)) {
            toast.error(t('trip.companionExists', 'Name already exists'));
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
            if (window.confirm(t('trip.confirmDeleteTrip', 'Are you sure you want to delete this trip? This action cannot be undone.'))) {
                deleteTripMutation.mutate(editingTrip.id);
            }
        } else {
            if (window.confirm(t('trip.confirmLeaveTrip', 'Are you sure you want to leave this trip? You will need an invite to join again.'))) {
                leaveTripMutation.mutate(editingTrip.id);
            }
        }
    };

    if (!isOpen || !trip) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-[#342b14]">{t('trip.editTrip', 'Edit Trip')}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-[#554030] mb-1">{t('trip.tripName', 'Trip Name')}</label>
                        <input
                            type="text"
                            value={editingTrip.name}
                            onChange={(e) => setEditingTrip({ ...editingTrip, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-white border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] transition-all font-medium text-[#342b14]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-[#554030] mb-1">{t('trip.destination', 'Destination')}</label>
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
                            <label className="block text-sm font-bold text-[#554030] mb-1">{t('trip.startDate', 'Start Date')}</label>
                            <input
                                type="date"
                                value={editingTrip.start_date}
                                onChange={(e) => setEditingTrip({ ...editingTrip, start_date: e.target.value })}
                                className="w-full px-3 py-3 rounded-xl bg-white border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] transition-all font-medium text-[#342b14] text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-[#554030] mb-1">{t('trip.endDate', 'End Date')}</label>
                            <input
                                type="date"
                                value={editingTrip.end_date}
                                onChange={(e) => setEditingTrip({ ...editingTrip, end_date: e.target.value })}
                                className="w-full px-3 py-3 rounded-xl bg-white border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] transition-all font-medium text-[#342b14] text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[#554030] mb-1">{t('trip.cover_image', 'Cover Image')}</label>
                        {!showPhotoInput ? (
                            <div
                                className="relative h-32 rounded-xl overflow-hidden bg-gray-100 border border-[#e8e3de] group cursor-pointer"
                                onClick={() => setShowPhotoInput(true)}
                            >
                                {editingTrip.cover_image ? (
                                    <img
                                        src={editingTrip.cover_image}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            // Fallback on error (e.g. broken link)
                                            e.currentTarget.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=2000&q=80'; // Default Travel Image
                                            toast.error(t('trip.imageLoadError', '圖片無法讀取 (已顯示預設圖)'));
                                        }}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">
                                        <ImageIcon className="w-8 h-8" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-white font-bold text-sm flex items-center gap-1">
                                        <Edit2 className="w-4 h-4" /> {t('trip.changePhoto', 'Change Photo')}
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
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            // Trigger validation on Enter
                                            const url = editingTrip.cover_image;
                                            if (url && url.includes('drive.google.com') && !url.includes('export=view')) {
                                                toast.error(t('trip.googleDriveWarning', 'Google Drive 連結必須使用 "Direct Link" 格式 (export=view)'));
                                                // Allow them to proceed if they insist? Or create strict block?
                                                // User wants a check/message.
                                            }
                                            setShowPhotoInput(false);
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        const url = editingTrip.cover_image;
                                        if (url) {
                                            // 1. Google Drive Warning
                                            if (url.includes('drive.google.com') && !url.includes('export=view')) {
                                                toast.error(t('trip.googleDriveWarning', 'Google Drive 連結必須使用 "Direct Link" 格式，否則無法顯示'));
                                                // We don't block, just warn, because user might know what they are doing or want to try
                                            }

                                            // 2. Simple format check (optional warning)
                                            // const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
                                            // if (!validExts.some(ext => url.toLowerCase().includes(ext)) && !url.includes('googleusercontent')) {
                                            //    toast.warning(t('trip.imageFormatWarning', '網址似乎不是圖片檔 (.jpg/.png)，可能會無法顯示'));
                                            // }
                                        }
                                        setShowPhotoInput(false);
                                    }}
                                    className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200"
                                >
                                    <Check className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Companions Management */}
                    <div>
                        <label className="block text-sm font-bold text-[#554030] mb-2">{t('trip.companions', 'Companions')}</label>
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <input
                                    value={newCompanion}
                                    onChange={(e) => setNewCompanion(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCompanion()}
                                    placeholder={t('trip.addCompanionPlaceholder', 'Add name...')}
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
                        onClick={onClose}
                        className="w-14 h-14 rounded-2xl font-bold text-[#a39992] bg-white border border-[#e8e3de] hover:bg-gray-50 transition-colors flex items-center justify-center shadow-sm"
                        title={t('common.cancel', 'Cancel')}
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleteTripMutation.isPending || leaveTripMutation.isPending}
                        className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl font-bold hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center shadow-sm"
                        title={editingTrip.user_id === user?.id ? t('trip.deleteTrip', 'Delete Trip') : t('trip.leaveTrip', 'Leave Trip')}
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
                        title={t('trip.saveChanges', 'Save Changes')}
                    >
                        {updateTripMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                    </button>
                </div>
            </div>
        </div>
    );
};
