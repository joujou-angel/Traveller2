import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Edit2, Crown, Share2, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchTripWeather } from '../../../hooks/useTripWeather';
import type { Trip } from '../types';

interface TripCardProps {
    trip: Trip;
    currentUserId?: string;
    onEditClick: (e: React.MouseEvent, trip: Trip) => void;
    onArchiveClick?: (e: React.MouseEvent, trip: Trip) => void;
}

export const TripCard = ({ trip, currentUserId, onEditClick, onArchiveClick }: TripCardProps) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { i18n } = useTranslation();

    const handleCardClick = () => {
        // Prefetch weather data immediately based on list data (optimistic)
        prefetchTripWeather(queryClient, trip, i18n.language);
        navigate(`/trips/${trip.id}/itinerary`);
    };

    return (
        <div
            onClick={handleCardClick}
            className={`group bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-btn/30 active:scale-98 ${trip.status === 'archived' ? 'opacity-75 grayscale' : ''}`}
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
                        {trip.user_id === currentUserId && (
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
                        <div className="flex items-center gap-1">
                            {trip.user_id === currentUserId && onArchiveClick && (
                                <button
                                    onClick={(e) => onArchiveClick(e, trip)}
                                    className="p-2 text-gray-400 hover:text-btn hover:bg-orange-50 rounded-xl transition-colors"
                                    title={trip.status === 'archived' ? 'Unarchive' : 'Archive'}
                                >
                                    <Archive className="w-4 h-4" />
                                </button>
                            )}
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
                                onClick={(e) => onEditClick(e, trip)}
                                className="p-2 text-gray-400 hover:text-btn hover:bg-orange-50 rounded-xl transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
