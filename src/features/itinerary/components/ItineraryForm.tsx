import { useForm } from 'react-hook-form';
import { X, Save, Clock, Link as LinkIcon, AlignLeft, Bus, Utensils, Bed, Camera } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LocationPicker from './LocationPicker';

interface ItineraryFormProps {
    initialData?: any;
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export default function ItineraryForm({ initialData, onSubmit, onCancel }: ItineraryFormProps) {
    const { t } = useTranslation();
    const { register, handleSubmit, reset, setValue, watch } = useForm({
        defaultValues: {
            hour: '',
            minute: '',
            endHour: '',
            endMinute: '',
            category: 'activity',
            location: '',
            lat: null as number | null,
            lng: null as number | null,
            google_map_link: '',
            notes: '',
            initial_start_time: initialData?.start_time // temp storage
        }
    });

    // Reset if initialData changes
    useEffect(() => {
        if (initialData) {
            const [h, m] = (initialData.start_time || '09:00').split(':').map(Number);
            const duration = initialData.duration || 60;

            // Calculate End Time
            const startDate = new Date();
            startDate.setHours(h, m, 0, 0);
            const endDate = new Date(startDate.getTime() + duration * 60000);

            reset({
                ...initialData,
                hour: h.toString().padStart(2, '0'),
                minute: m.toString().padStart(2, '0'),
                endHour: endDate.getHours().toString().padStart(2, '0'),
                endMinute: endDate.getMinutes().toString().padStart(2, '0'),
            });
        } else {
            // Default: Start 09:00, End 10:00
            reset({
                hour: '09',
                minute: '00',
                endHour: '10',
                endMinute: '00',
                category: 'activity',
                location: '',
                lat: null, lng: null, google_map_link: '', notes: ''
            });
        }
    }, [initialData, reset]);

    const handleFormSubmit = (data: any) => {
        const startH = parseInt(data.hour);
        const startM = parseInt(data.minute);
        const endH = parseInt(data.endHour);
        const endM = parseInt(data.endMinute);

        const startTimeInMins = startH * 60 + startM;
        const endTimeInMins = endH * 60 + endM;

        let duration = endTimeInMins - startTimeInMins;

        // Handle overnight (e.g. 23:00 to 01:00) by adding 24 hours
        if (duration < 0) {
            duration += 24 * 60;
        }

        if (duration === 0) {
            alert(t('itinerary.errorZeroDuration', 'Duration cannot be zero'));
            return;
        }

        const finalData = {
            ...data,
            start_time: `${data.hour}:${data.minute}`,
            duration: duration,
            lat: data.lat,
            lng: data.lng
        };

        // Cleanup temp fields
        delete finalData.hour;
        delete finalData.minute;
        delete finalData.endHour;
        delete finalData.endMinute;
        delete finalData.initial_start_time;
        if ('endTime' in finalData) delete finalData.endTime; // Remove calculated display field

        onSubmit(finalData);
    };

    const categories = [
        { id: 'activity', label: t('categories.activity', 'Activity'), icon: Camera, activeClass: 'bg-positive/20 text-positive border-positive/30' },
        { id: 'food', label: t('categories.food', 'Food'), icon: Utensils, activeClass: 'bg-orange-50 text-orange-500 border-orange-100' },
        { id: 'transport', label: t('categories.transport', 'Transport'), icon: Bus, activeClass: 'bg-blue-50 text-blue-500 border-blue-100' },
        { id: 'stay', label: t('categories.stay', 'Stay'), icon: Bed, activeClass: 'bg-indigo-50 text-indigo-500 border-indigo-100' },
    ];

    const currentCategory = watch('category');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel}></div>

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-fade-in-up p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-[#342b14]">
                        {initialData ? t('itinerary.editItem', 'Edit Item') : t('itinerary.addItem', 'Add Item')}
                    </h2>
                    <button onClick={onCancel} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Start Time */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[#554030] ml-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{t('itinerary.startTime', 'Start Time')}</span>
                            </label>
                            <div className="flex gap-2 items-center">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        placeholder="09"
                                        min="0"
                                        max="23"
                                        {...register('hour', { required: true, min: 0, max: 23 })}
                                        className="w-full px-2 py-3 bg-gray-50 rounded-xl border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] text-center font-mono placeholder-[#667280] text-[#342b14]"
                                        onBlur={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val)) e.target.value = val.toString().padStart(2, '0');
                                        }}
                                    />
                                </div>
                                <span className="text-[#a39992] font-bold">:</span>
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        placeholder="00"
                                        min="0"
                                        max="59"
                                        {...register('minute', { required: true, min: 0, max: 59 })}
                                        className="w-full px-2 py-3 bg-gray-50 rounded-xl border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] text-center font-mono placeholder-[#667280] text-[#342b14]"
                                        onBlur={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val)) e.target.value = val.toString().padStart(2, '0');
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* End Time */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[#554030] ml-1 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-red-400" />
                                <span>{t('itinerary.endTime', 'End Time')}</span>
                            </label>
                            <div className="flex gap-2 items-center">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        placeholder="10"
                                        min="0"
                                        max="23"
                                        {...register('endHour', { required: true, min: 0, max: 23 })}
                                        className="w-full px-2 py-3 bg-gray-50 rounded-xl border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] text-center font-mono placeholder-[#667280] text-[#342b14]"
                                        onBlur={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val)) e.target.value = val.toString().padStart(2, '0');
                                        }}
                                    />
                                </div>
                                <span className="text-[#a39992] font-bold">:</span>
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        placeholder="00"
                                        min="0"
                                        max="59"
                                        {...register('endMinute', { required: true, min: 0, max: 59 })}
                                        className="w-full px-2 py-3 bg-gray-50 rounded-xl border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] text-center font-mono placeholder-[#667280] text-[#342b14]"
                                        onBlur={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val)) e.target.value = val.toString().padStart(2, '0');
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Category */}
                        <div className="space-y-1 col-span-1 sm:col-span-2">
                            <label className="text-xs font-bold text-[#554030] ml-1">{t('itinerary.category', 'Category')}</label>
                            <div className="grid grid-cols-4 gap-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setValue('category', cat.id)}
                                        className={`flex items-center justify-center p-3 rounded-xl transition-all border ${currentCategory === cat.id ? cat.activeClass + ' shadow-md scale-105' : 'bg-white text-[#a39992] border-[#e8e3de] hover:bg-gray-50'}`}
                                        title={cat.label}
                                    >
                                        <cat.icon className="w-5 h-5" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[#554030] ml-1">{t('itinerary.locationName', 'Location Name')}</label>
                        <LocationPicker
                            initialValue={watch('location')}
                            onChange={(val) => {
                                setValue('location', val);
                            }}
                            onSelect={(loc) => {
                                setValue('location', loc.name);
                                setValue('lat', loc.lat);
                                setValue('lng', loc.lng);
                                setValue('google_map_link', `https://www.google.com/maps?q=${loc.lat},${loc.lng}`);
                            }}
                        />
                    </div>

                    {/* Google Map Link */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[#554030] ml-1">{t('itinerary.googleMapLink', 'Google Maps Link')}</label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a39992]" />
                            <input
                                type="url"
                                placeholder={t('itinerary.googleMapPlaceholder', '(Auto-extracted)')}
                                {...register('google_map_link', {
                                    onChange: (e) => {
                                        const url = e.target.value;
                                        if (!url.includes('google.com/maps')) return;

                                        // 1. Extract Place Name
                                        // Pattern: /place/Place+Name/
                                        const nameMatch = url.match(/\/place\/([^/]+)\//);
                                        if (nameMatch && nameMatch[1]) {
                                            const rawName = nameMatch[1];
                                            // Decode: Tokyo+Tower -> Tokyo Tower, and URI decode for special chars
                                            const cleanName = decodeURIComponent(rawName.replace(/\+/g, ' '));
                                            setValue('location', cleanName);
                                        }

                                        // 2. Extract Coordinates
                                        // Pattern: @lat,lng,
                                        const coordsMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                                        if (coordsMatch) {
                                            setValue('lat', parseFloat(coordsMatch[1]));
                                            setValue('lng', parseFloat(coordsMatch[2]));
                                        }
                                    }
                                })}
                                className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] placeholder-[#667280] text-[#342b14]"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[#554030] ml-1">{t('common.notes', 'Notes')}</label>
                        <div className="relative">
                            <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-[#a39992]" />
                            <textarea
                                rows={3}
                                placeholder={t('itinerary.notesPlaceholder', 'What to eat? What to note?')}
                                {...register('notes')}
                                className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] resize-none placeholder-[#667280] text-[#342b14]"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-[#9B8D74] text-white rounded-xl font-bold shadow-lg shadow-[#9B8D74]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <Save className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
