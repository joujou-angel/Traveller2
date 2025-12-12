import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Plane, Hotel as HotelIcon, Plus, X, Loader2, Save, Maximize2, Edit, ArrowLeft } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../features/auth/AuthContext';

// Type Definitions
type FlightSegment = {
    flightNo: string;
    pnr: string;
    depTime: string; // HH:MM
    arrTime: string; // HH:MM
    from: string;
    to: string;
};


type HotelInfo = {
    name: string;
    address: string;
    addressLocal: string;
    phone: string;
    notes: string;
};

type TripConfig = {
    id: number;
    flight_info: {
        destination?: string;
        startDate?: string;
        endDate?: string;
        flights?: FlightSegment[];
        // Legacy support
        outbound?: string;
        inbound?: string;
    };
    hotel_info: HotelInfo[] | HotelInfo; // Support legacy object or new array
    companions: string[];
};


const fetchTripConfig = async (tripId: string): Promise<TripConfig | null> => {
    const { data, error } = await supabase
        .from('trip_config')
        .select('*')
        .eq('trip_id', tripId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
    }
    return data;
};

const fetchTripMetadata = async (tripId: string) => {
    const { data } = await supabase.from('trips').select('user_id').eq('id', tripId).single();
    return data;
};

const InfoPage = () => {
    const { t } = useTranslation();
    const { tripId } = useParams();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [editMode, setEditMode] = useState<'none' | 'flights' | 'hotels'>('none');
    const [showAddressZoom, setShowAddressZoom] = useState(false);
    const [zoomAddress, setZoomAddress] = useState('');

    // Form State
    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Flight State
    const [flights, setFlights] = useState<FlightSegment[]>([]);

    // Hotel State
    const [hotels, setHotels] = useState<HotelInfo[]>([]);

    const { data: tripConfig, isLoading } = useQuery({
        queryKey: ['tripConfig', tripId],
        queryFn: () => fetchTripConfig(tripId!),
        enabled: !!tripId
    });

    const { data: tripMetadata } = useQuery({
        queryKey: ['tripMetadata', tripId],
        queryFn: () => fetchTripMetadata(tripId!),
        enabled: !!tripId
    });

    // Sync state when data is loaded
    useEffect(() => {
        if (tripConfig) {
            setDestination(tripConfig.flight_info?.destination || '');
            setStartDate(tripConfig.flight_info?.startDate || '');
            setEndDate(tripConfig.flight_info?.endDate || '');

            // Handle legacy or new flight data
            let loadedFlights = tripConfig.flight_info?.flights || [];
            if (loadedFlights.length === 0) {
                // Try to convert legacy format if exists
                if (tripConfig.flight_info?.outbound || tripConfig.flight_info?.inbound) {
                    if (tripConfig.flight_info.outbound) {
                        loadedFlights.push({ flightNo: tripConfig.flight_info.outbound, pnr: '', depTime: '', arrTime: '', from: '', to: '' });
                    }
                    if (tripConfig.flight_info.inbound) {
                        loadedFlights.push({ flightNo: tripConfig.flight_info.inbound, pnr: '', depTime: '', arrTime: '', from: '', to: '' });
                    }
                }
            }
            setFlights(loadedFlights);

            // Handle Hotel Data (Array or Single Object)
            let loadedHotels: HotelInfo[] = [];
            if (tripConfig.hotel_info) {
                if (Array.isArray(tripConfig.hotel_info)) {
                    loadedHotels = tripConfig.hotel_info;
                } else {
                    // Legacy single object
                    loadedHotels = [{
                        name: tripConfig.hotel_info.name || '',
                        address: tripConfig.hotel_info.address || '',
                        addressLocal: tripConfig.hotel_info.addressLocal || '',
                        phone: tripConfig.hotel_info.phone || '',
                        notes: tripConfig.hotel_info.notes || ''
                    }];
                }
            }
            setHotels(loadedHotels);
        }
    }, [tripConfig, tripMetadata, user]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            let configId = tripConfig?.id;
            if (!configId) {
                const { data: newRow, error: insertError } = await supabase
                    .from('trip_config')
                    .insert({ trip_id: tripId }) // Insert with trip_id
                    .select()
                    .single();
                if (insertError) throw insertError;
                configId = newRow.id;
            }

            // Update trip_config
            const { error } = await supabase
                .from('trip_config')
                .update({
                    flight_info: {
                        destination,
                        startDate,
                        endDate,
                        flights
                    },
                    hotel_info: hotels,
                    updated_at: new Date().toISOString()
                })
                .eq('id', configId);

            if (error) throw error;

            // Also update the trips table to sync dates
            if (startDate && endDate) {
                const { error: tripError } = await supabase
                    .from('trips')
                    .update({
                        start_date: startDate,
                        end_date: endDate,
                        location: destination || 'TBD'
                    })
                    .eq('id', tripId);

                if (tripError) throw tripError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tripConfig'] });
            queryClient.invalidateQueries({ queryKey: ['trips'] }); // Also invalidate trips query
            setEditMode('none');
            toast.success('儲存成功！');
        },
        onError: (err: any) => {
            console.error(err);
            toast.error('儲存失敗：' + err.message);
        }
    });

    const handleAddFlight = () => {
        setFlights([...flights, { flightNo: '', pnr: '', depTime: '', arrTime: '', from: '', to: '' }]);
    };

    const handleRemoveFlight = (index: number) => {
        setFlights(flights.filter((_, i) => i !== index));
    };

    const handleFlightChange = (index: number, field: keyof FlightSegment, value: string) => {
        let newValue = value;
        if (field === 'depTime' || field === 'arrTime') {
            const numbers = value.replace(/\D/g, '');
            if (numbers.length >= 3) {
                newValue = `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
            } else {
                newValue = numbers;
            }
        }

        const newFlights = [...flights];
        newFlights[index] = { ...newFlights[index], [field]: newValue };
        setFlights(newFlights);
    };

    const handleAddHotel = () => {
        setHotels([...hotels, { name: '', address: '', addressLocal: '', phone: '', notes: '' }]);
    };

    const handleRemoveHotel = (index: number) => {
        setHotels(hotels.filter((_, i) => i !== index));
    };

    const handleHotelChange = (index: number, field: keyof HotelInfo, value: string) => {
        const newHotels = [...hotels];
        newHotels[index] = { ...newHotels[index], [field]: value };
        setHotels(newHotels);
    };


    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-sub-title" />
            </div>
        );
    }

    // View Mode UI
    if (editMode === 'none') {
        return (
            <>
                {/* Address Zoom Overlay */}
                {/* Address Zoom Overlay */}
                {showAddressZoom && createPortal(
                    <div
                        className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-6 text-center animate-fade-in"
                        onClick={() => setShowAddressZoom(false)}
                    >
                        <button
                            onClick={() => setShowAddressZoom(false)}
                            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <p className="text-white text-4xl font-bold leading-relaxed max-w-lg break-words whitespace-pre-wrap">
                            {zoomAddress}
                        </p>
                    </div>,
                    document.body
                )}

                <div className="p-6 space-y-8 pb-24 animate-fade-in relative">
                    <div className="space-y-6">
                        {/* Main Info Card */}


                        {/* Flight Info */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-gray-50 rounded-xl">
                                    <Plane className="w-5 h-5 text-gray-600" />
                                </div>
                                <h3 className="font-bold text-gray-800 flex-1">{t('info.flights')}</h3>
                                <button
                                    onClick={() => setEditMode('flights')}
                                    className="p-2 bg-gray-50 rounded-full hover:bg-gray-100/50 text-gray-400 transition-all"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                            </div>
                            {flights.length > 0 ? (
                                <div className="space-y-4">
                                    {flights.map((flight, i) => (
                                        <div key={i} className="p-4 bg-gray-50 rounded-2xl space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-lg text-gray-800">{flight.flightNo || 'Flight No.'}</span>
                                                {flight.pnr && (
                                                    <span className="text-xs font-mono bg-white px-2 py-1 rounded border text-gray-500">
                                                        PNR: {flight.pnr}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <div>
                                                    <p className="font-bold text-gray-700 text-lg">{flight.depTime || '--:--'}</p>
                                                    <p className="text-gray-400 text-xs mt-1">{flight.from || 'Origin'}</p>
                                                </div>
                                                <div className="flex-1 px-4 flex flex-col items-center">
                                                    <div className="h-[2px] w-full bg-gray-300 relative">
                                                        <Plane className="w-3 h-3 text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" />
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-gray-700 text-lg">{flight.arrTime || '--:--'}</p>
                                                    <p className="text-gray-400 text-xs mt-1">{flight.to || 'Dest'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm italic">{t('common.noData')}</p>
                            )}
                        </div>

                        {/* Hotel Info */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-gray-50 rounded-xl">
                                    <HotelIcon className="w-5 h-5 text-gray-600" />
                                </div>
                                <h3 className="font-bold text-gray-800 flex-1">{t('info.hotels')}</h3>
                                <button
                                    onClick={() => setEditMode('hotels')}
                                    className="p-2 bg-gray-50 rounded-full hover:bg-gray-100/50 text-gray-400 transition-all"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                            </div>
                            {hotels.length > 0 ? (
                                <div className="space-y-8 divide-y divide-gray-100">
                                    {hotels.map((hotel, idx) => (
                                        <div key={idx} className={idx > 0 ? "pt-6" : ""}>
                                            <div className="space-y-4">
                                                {/* Bubble 1: Name, Address, Phone */}
                                                <div className="p-4 bg-gray-50 rounded-2xl space-y-4">
                                                    <div>
                                                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">{t('info.hotelName')}</p>
                                                        <p className={hotel.name ? "text-gray-800 font-medium" : "text-gray-400 text-sm italic"}>
                                                            {hotel.name || t('common.noData')}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">{t('info.address')}</p>
                                                        <p className={hotel.address ? "text-gray-800 font-medium" : "text-gray-400 text-sm italic"}>
                                                            {hotel.address || t('common.noData')}
                                                        </p>
                                                    </div>

                                                    {hotel.phone && (
                                                        <div>
                                                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">{t('info.phone')}</p>
                                                            <a href={`tel:${hotel.phone}`} className="text-gray-800 font-medium hover:text-blue-600 transition-colors block">
                                                                {hotel.phone}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Bubble 2: Local Address (Driver) */}
                                                {hotel.addressLocal && (
                                                    <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100 flex items-center justify-between gap-3 cursor-pointer hover:bg-yellow-100 transition-colors"
                                                        onClick={() => {
                                                            setZoomAddress(hotel.addressLocal || hotel.address);
                                                            setShowAddressZoom(true)
                                                        }}
                                                    >
                                                        <div className="flex-1">
                                                            <p className="text-xs text-yellow-600/70 font-bold mb-1 uppercase">{t('info.originalAddress')}</p>
                                                            <p className="text-base font-bold text-gray-800 leading-tight">{hotel.addressLocal}</p>
                                                        </div>
                                                        <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap">
                                                            {t('info.showDriver')}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Bubble 3: Notes */}
                                                {hotel.notes && (
                                                    <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                                                        <div>
                                                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">{t('info.notes')}</p>
                                                            <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{hotel.notes}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm italic">{t('common.noData')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Edit Mode UI
    return (
        <div className="p-6 space-y-8 bg-white min-h-screen">
            <header className="flex items-center gap-4">
                <button
                    onClick={() => setEditMode('none')}
                    className="p-2 -ml-2 text-gray-500 hover:bg-gray-50 rounded-full"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
            </header>

            <div className="space-y-8">


                {/* Flight Section */}
                {editMode === 'flights' && (
                    <section className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-400 tracking-wider uppercase">{t('info.flights')}</h3>
                            <button onClick={handleAddFlight} className="w-8 h-8 bg-btn text-white rounded-full shadow-md flex items-center justify-center active:scale-90 transition-transform">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {flights.map((flight, idx) => (
                                <div key={idx} className="p-4 rounded-2xl border border-gray-200 relative space-y-3">
                                    <button onClick={() => handleRemoveFlight(idx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500">
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500">{t('info.flightNo', 'Flight No.')}</label>
                                            <input
                                                value={flight.flightNo}
                                                onChange={(e) => handleFlightChange(idx, 'flightNo', e.target.value)}
                                                placeholder="BR198"
                                                className="w-full p-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500">{t('info.pnr', 'PNR')}</label>
                                            <input
                                                value={flight.pnr}
                                                onChange={(e) => handleFlightChange(idx, 'pnr', e.target.value)}
                                                placeholder="6ABCDE"
                                                className="w-full p-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500">{t('info.from', 'From')}</label>
                                            <input
                                                value={flight.from}
                                                onChange={(e) => handleFlightChange(idx, 'from', e.target.value)}
                                                placeholder="TPE"
                                                className="w-full p-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500">{t('info.to', 'To')}</label>
                                            <input
                                                value={flight.to}
                                                onChange={(e) => handleFlightChange(idx, 'to', e.target.value)}
                                                placeholder="NRT"
                                                className="w-full p-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500">{t('info.depTime', 'Departure (24H)')}</label>
                                            <input
                                                type="text"
                                                maxLength={5}
                                                value={flight.depTime}
                                                onChange={(e) => handleFlightChange(idx, 'depTime', e.target.value)}
                                                placeholder="14:30"
                                                className="w-full p-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500">{t('info.arrTime', 'Arrival (24H)')}</label>
                                            <input
                                                type="text"
                                                maxLength={5}
                                                value={flight.arrTime}
                                                onChange={(e) => handleFlightChange(idx, 'arrTime', e.target.value)}
                                                placeholder="18:45"
                                                className="w-full p-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Hotel Section */}
                {editMode === 'hotels' && (
                    <section className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-400 tracking-wider uppercase">{t('info.hotels')}</h3>
                            <button onClick={handleAddHotel} className="w-8 h-8 bg-btn text-white rounded-full shadow-md flex items-center justify-center active:scale-90 transition-transform">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-6">
                            {hotels.map((hotel, idx) => (
                                <div key={idx} className="p-4 rounded-2xl border border-gray-200 relative space-y-4">
                                    <button onClick={() => handleRemoveHotel(idx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500">
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-600">{t('info.hotelName', 'Hotel Name')}</label>
                                        <input
                                            value={hotel.name}
                                            onChange={(e) => handleHotelChange(idx, 'name', e.target.value)}
                                            placeholder={t('info.hotelNamePlaceholder', 'Hotel Name')}
                                            className="w-full p-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-600">{t('info.address', 'Address')}</label>
                                        <input
                                            value={hotel.address}
                                            onChange={(e) => handleHotelChange(idx, 'address', e.target.value)}
                                            placeholder={t('info.addressPlaceholder', 'Address for display')}
                                            className="w-full p-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-600">{t('info.addressLocal', 'Local Address')}</label>
                                        <textarea
                                            value={hotel.addressLocal}
                                            onChange={(e) => handleHotelChange(idx, 'addressLocal', e.target.value)}
                                            placeholder={t('info.addressLocalPlaceholder', '例：東京都新宿区...')}
                                            rows={2}
                                            className="w-full p-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black text-sm resize-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-600">{t('info.phone', 'Phone')}</label>
                                        <input
                                            value={hotel.phone}
                                            onChange={(e) => handleHotelChange(idx, 'phone', e.target.value)}
                                            placeholder={t('info.phonePlaceholder', '+81 3-1234-5678')}
                                            className="w-full p-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-600">{t('info.notes', 'Notes')}</label>
                                        <textarea
                                            value={hotel.notes}
                                            onChange={(e) => handleHotelChange(idx, 'notes', e.target.value)}
                                            placeholder={t('info.notesPlaceholder', 'Notes...')}
                                            rows={3}
                                            className="w-full p-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black text-sm resize-none"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

            </div>



            {/* Save Button */}
            <div className="mt-8">
                <button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                    className="w-full py-4 bg-btn text-white rounded-2xl font-bold text-lg shadow-lg active:scale-[0.98] hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
                >
                    {updateMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                </button>
            </div>
        </div >
    );
};

export default InfoPage;
