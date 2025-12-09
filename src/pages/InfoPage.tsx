import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Loader2, Calendar, MapPin, Edit, Plane, Hotel, Users, Plus, X, Save, ArrowLeft, Maximize2, Share2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// Type Definitions
type FlightSegment = {
    flightNo: string;
    pnr: string;
    depTime: string; // HH:MM
    arrTime: string; // HH:MM
    from: string;
    to: string;
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
    hotel_info: {
        name?: string;
        address?: string; // English/Display
        addressLocal?: string; // Local language for driver
        phone?: string;
        notes?: string;
    };
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

const InfoPage = () => {
    const { tripId } = useParams();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [showAddressZoom, setShowAddressZoom] = useState(false);

    // Form State
    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Flight State
    const [flights, setFlights] = useState<FlightSegment[]>([]);

    // Hotel State
    const [hotelName, setHotelName] = useState('');
    const [hotelAddress, setHotelAddress] = useState('');
    const [hotelAddressLocal, setHotelAddressLocal] = useState('');
    const [hotelPhone, setHotelPhone] = useState('');
    const [hotelNotes, setHotelNotes] = useState('');

    // Companion State
    const [companions, setCompanions] = useState<string[]>([]);
    const [newCompanion, setNewCompanion] = useState('');

    const { data: tripConfig, isLoading } = useQuery({
        queryKey: ['tripConfig', tripId],
        queryFn: () => fetchTripConfig(tripId!),
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

            setHotelName(tripConfig.hotel_info?.name || '');
            setHotelAddress(tripConfig.hotel_info?.address || '');
            setHotelAddressLocal(tripConfig.hotel_info?.addressLocal || '');
            setHotelPhone(tripConfig.hotel_info?.phone || '');
            setHotelNotes(tripConfig.hotel_info?.notes || '');
            setCompanions(tripConfig.companions || []);
        }
    }, [tripConfig]);

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
                    hotel_info: {
                        name: hotelName,
                        address: hotelAddress,
                        addressLocal: hotelAddressLocal,
                        phone: hotelPhone,
                        notes: hotelNotes
                    },
                    companions,
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
            setIsEditing(false);
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
        const newFlights = [...flights];
        newFlights[index] = { ...newFlights[index], [field]: value };
        setFlights(newFlights);
    };

    const handleAddCompanion = () => {
        const name = newCompanion.trim();
        if (!name) return;
        const forbidden = ['me', 'myself', '自分', '我'];
        if (forbidden.includes(name.toLowerCase())) {
            toast.error('請輸入具體名字，不要使用 "Me" 或 "我"');
            return;
        }
        if (companions.includes(name)) {
            toast.error('名字已存在');
            return;
        }
        setCompanions([...companions, name]);
        setNewCompanion('');
    };

    const removeCompanion = (index: number) => {
        setCompanions(companions.filter((_, i) => i !== index));
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-sub-title" />
            </div>
        );
    }

    // View Mode UI
    if (!isEditing) {
        return (
            <div className="p-6 space-y-8 pb-24 animate-fade-in relative">
                {/* Address Zoom Overlay */}
                {showAddressZoom && (
                    <div
                        className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 text-center animate-fade-in"
                        onClick={() => setShowAddressZoom(false)}
                    >
                        <h3 className="text-gray-400 mb-4 text-sm font-bold uppercase tracking-wider">Show to Driver</h3>
                        <p className="text-white text-4xl font-bold leading-relaxed max-w-lg break-words whitespace-pre-wrap">
                            {hotelAddressLocal || hotelAddress}
                        </p>
                        <p className="text-gray-500 mt-8 text-sm">(Tap anywhere to close)</p>
                    </div>
                )}

                <header className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">旅程資訊</h1>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 bg-white rounded-full shadow-sm hover:shadow-md text-gray-600 transition-all border border-gray-100"
                    >
                        <Edit className="w-5 h-5" />
                    </button>
                </header>

                <div className="space-y-6">
                    {/* Main Info Card */}
                    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-50/50 border border-blue-50 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full -mr-8 -mt-8 opacity-50 pointer-events-none" />

                        {/* Destination */}
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-50 rounded-2xl flex-shrink-0">
                                <MapPin className="w-6 h-6 text-sub-title" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">DESTINATION</p>
                                <p className="text-2xl font-bold text-gray-900">{destination || '未設定'}</p>
                            </div>
                        </div>

                        {/* Date */}
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-pink-50 rounded-2xl flex-shrink-0">
                                <Calendar className="w-6 h-6 text-sub-title" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">DATES</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {startDate} <span className="text-gray-300 mx-1">→</span> {endDate}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Flight Info */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-gray-50 rounded-xl">
                                <Plane className="w-5 h-5 text-gray-600" />
                            </div>
                            <h3 className="font-bold text-gray-800">航班資訊</h3>
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
                            <p className="text-gray-400 text-sm italic">未設定航班</p>
                        )}
                    </div>

                    {/* Hotel Info */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-gray-50 rounded-xl">
                                <Hotel className="w-5 h-5 text-gray-600" />
                            </div>
                            <h3 className="font-bold text-gray-800">住宿資訊</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-lg font-bold text-gray-800">{hotelName || '未設定住宿'}</p>
                                <p className="text-sm text-gray-500 mt-1">{hotelAddress}</p>
                            </div>
                            {hotelAddressLocal && (
                                <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100 flex items-center justify-between gap-3 cursor-pointer hover:bg-yellow-100 transition-colors"
                                    onClick={() => setShowAddressZoom(true)}
                                >
                                    <div className="flex-1">
                                        <p className="text-xs text-yellow-600/70 font-bold mb-1 uppercase">Local Address</p>
                                        <p className="text-base font-bold text-gray-800 leading-tight">{hotelAddressLocal}</p>
                                    </div>
                                    <Maximize2 className="w-5 h-5 text-yellow-600" />
                                </div>
                            )}

                            {(hotelPhone || hotelNotes) && (
                                <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                                    {hotelPhone && (
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Phone</p>
                                            <a href={`tel:${hotelPhone}`} className="text-gray-800 font-medium hover:text-blue-600 transition-colors">{hotelPhone}</a>
                                        </div>
                                    )}
                                    {hotelNotes && (
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Notes</p>
                                            <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{hotelNotes}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Companions */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-50 rounded-xl">
                                    <Users className="w-5 h-5 text-gray-600" />
                                </div>
                                <h3 className="font-bold text-gray-800">旅伴 ({companions.length})</h3>
                            </div>
                            <button
                                onClick={() => {
                                    const link = `${window.location.origin}/join/${tripId}`;
                                    navigator.clipboard.writeText(link);
                                    toast.success('Link copied! Share it with friends');
                                }}
                                className="bg-btn/10 text-btn px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-btn/20 transition-colors"
                            >
                                <Share2 className="w-3 h-3" />
                                Invite
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {companions.length > 0 ? (
                                companions.map((c, i) => (
                                    <span key={i} className="px-4 py-2 bg-gray-50 text-gray-700 font-medium rounded-xl text-sm border border-gray-100">
                                        {c}
                                    </span>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm">點擊編輯新增旅伴</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Edit Mode UI
    return (
        <div className="p-6 space-y-8 pb-32 bg-white min-h-screen">
            <header className="flex items-center gap-4">
                <button
                    onClick={() => setIsEditing(false)}
                    className="p-2 -ml-2 text-gray-500 hover:bg-gray-50 rounded-full"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800">編輯資訊</h1>
            </header>

            <div className="space-y-8">
                {/* Basic Section */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 tracking-wider uppercase">BASIC</h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-600">目的地</label>
                            <input
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                className="w-full p-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600">開始日期</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full p-3 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600">結束日期</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full p-3 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Flight Section */}
                <section className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-400 tracking-wider uppercase">FLIGHTS</h3>
                        <button onClick={handleAddFlight} className="bg-black text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Add
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
                                        <label className="text-xs font-semibold text-gray-500">Flight No.</label>
                                        <input
                                            value={flight.flightNo}
                                            onChange={(e) => handleFlightChange(idx, 'flightNo', e.target.value)}
                                            placeholder="BR198"
                                            className="w-full p-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500">PNR (訂位代號)</label>
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
                                        <label className="text-xs font-semibold text-gray-500">From</label>
                                        <input
                                            value={flight.from}
                                            onChange={(e) => handleFlightChange(idx, 'from', e.target.value)}
                                            placeholder="TPE"
                                            className="w-full p-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500">To</label>
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
                                        <label className="text-xs font-semibold text-gray-500">Departure (24H)</label>
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
                                        <label className="text-xs font-semibold text-gray-500">Arrival (24H)</label>
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

                {/* Hotel Section */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 tracking-wider uppercase">HOTEL</h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-600">飯店名稱</label>
                            <input
                                value={hotelName}
                                onChange={(e) => setHotelName(e.target.value)}
                                placeholder="Hotel Name"
                                className="w-full p-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-600">地址 (English/Display)</label>
                            <input
                                value={hotelAddress}
                                onChange={(e) => setHotelAddress(e.target.value)}
                                placeholder="Address for display"
                                className="w-full p-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-600">當地語言地址 (For Driver)</label>
                            <textarea
                                value={hotelAddressLocal}
                                onChange={(e) => setHotelAddressLocal(e.target.value)}
                                placeholder="例：東京都新宿区..."
                                rows={2}
                                className="w-full p-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black text-sm resize-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-600">電話 (Phone)</label>
                            <input
                                value={hotelPhone}
                                onChange={(e) => setHotelPhone(e.target.value)}
                                placeholder="+81 3-1234-5678"
                                className="w-full p-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-600">備註 (Notes)</label>
                            <textarea
                                value={hotelNotes}
                                onChange={(e) => setHotelNotes(e.target.value)}
                                placeholder="備註事項..."
                                rows={3}
                                className="w-full p-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black text-sm resize-none"
                            />
                        </div>
                    </div>
                </section>

                {/* Companions Section */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 tracking-wider uppercase">COMPANIONS</h3>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input
                                value={newCompanion}
                                onChange={(e) => setNewCompanion(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCompanion()}
                                placeholder="輸入名字..."
                                className="flex-1 p-3 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                            />
                            <button
                                onClick={handleAddCompanion}
                                className="p-3 bg-black text-white rounded-2xl active:scale-95 transition-transform"
                            >
                                <Plus className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {companions.map((c, i) => (
                                <span key={i} className="pl-3 pr-2 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 flex items-center gap-2">
                                    {c}
                                    <button onClick={() => removeCompanion(i)} className="text-gray-400 hover:text-red-500">
                                        <X className="w-4 h-4" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400">*請使用真實名字，請勿使用 "Me" 以避免分帳混淆</p>
                    </div>
                </section>
            </div>

            {/* Save Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 pb-8 safe-area-bottom">
                <button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                    className="w-full max-w-md mx-auto py-4 bg-gradient-to-r from-blue-300 to-purple-300 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-4"
                >
                    {updateMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            <span>Save Changes</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default InfoPage;
