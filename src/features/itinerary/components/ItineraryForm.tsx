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
            const [h, m] = (initialData.start_time || '09:00').split(':');
            reset({
                ...initialData,
                hour: h,
                minute: m || '00'
            });
        }
    }, [initialData, reset]);

    const handleFormSubmit = (data: any) => {
        const finalData = {
            ...data,
            start_time: `${data.hour}:${data.minute}`,
            lat: data.lat,
            lng: data.lng
        };
        delete finalData.hour;
        delete finalData.minute;
        delete finalData.initial_start_time;

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
                        {/* Time */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[#554030] ml-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{t('itinerary.time', 'Time')}</span>
                            </label>
                            <div className="flex gap-2 items-center">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        placeholder="09"
                                        min="0"
                                        max="23"
                                        {...register('hour', { required: true, min: 0, max: 23 })}
                                        className="w-full px-2 py-3 bg-gray-50 rounded-xl border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] text-center font-mono placeholder-[#667280] text-[#342b14] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                        className="w-full px-2 py-3 bg-gray-50 rounded-xl border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] text-center font-mono placeholder-[#667280] text-[#342b14] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        onBlur={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val)) e.target.value = val.toString().padStart(2, '0');
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Category */}
                        <div className="space-y-1">
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
                                // Optional: Reset coords if they type manually?
                                // setValue('lat', null);
                                // setValue('lng', null);
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
                                placeholder="https://maps.app.goo.gl/..."
                                {...register('google_map_link')}
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
