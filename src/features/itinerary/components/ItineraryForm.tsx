import { useForm } from 'react-hook-form';
import { X, Save, Clock, MapPin, Link as LinkIcon, AlignLeft } from 'lucide-react';
import { useEffect } from 'react';

interface ItineraryFormProps {
    initialData?: any;
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export default function ItineraryForm({ initialData, onSubmit, onCancel }: ItineraryFormProps) {
    const { register, handleSubmit, reset } = useForm({
        defaultValues: {
            hour: '09',
            minute: '00',
            category: 'activity',
            location: '',
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
        // Construct HH:MM string
        const finalData = {
            ...data,
            start_time: `${data.hour}:${data.minute}`
        };
        delete finalData.hour;
        delete finalData.minute;
        delete finalData.initial_start_time;

        onSubmit(finalData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel}></div>

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-fade-in-up p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800">
                        {initialData ? '編輯行程' : '新增行程'}
                    </h2>
                    <button onClick={onCancel} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                        {/* Time */}
                        {/* Time (Custom 24H Input) */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 ml-1">時間 (24小時制)</label>
                            <div className="flex gap-2 items-center">
                                <div className="relative flex-1">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="number"
                                        placeholder="HH"
                                        min="0"
                                        max="23"
                                        {...register('hour', { required: true, min: 0, max: 23 })}
                                        className="w-full pl-10 pr-2 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-btn text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        onBlur={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val)) e.target.value = val.toString().padStart(2, '0');
                                        }}
                                    />
                                </div>
                                <span className="text-gray-400 font-bold">:</span>
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        placeholder="MM"
                                        min="0"
                                        max="59"
                                        {...register('minute', { required: true, min: 0, max: 59 })}
                                        className="w-full px-2 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-btn text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                            <label className="text-xs font-bold text-gray-500 ml-1">類型</label>
                            <select
                                {...register('category')}
                                className="w-full h-[46px] px-3 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-btn appearance-none"
                            >
                                <option value="activity">景點 (Activity)</option>
                                <option value="food">美食 (Food)</option>
                                <option value="transport">交通 (Transport)</option>
                                <option value="stay">住宿 (Stay)</option>
                            </select>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 ml-1">地點名稱</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="e.g. 東京鐵塔"
                                {...register('location', { required: true })}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-btn"
                            />
                        </div>
                    </div>

                    {/* Google Map Link */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 ml-1">Google Maps 連結</label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="url"
                                placeholder="https://maps.app.goo.gl/..."
                                {...register('google_map_link')}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-btn"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 ml-1">備註</label>
                        <div className="relative">
                            <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <textarea
                                rows={3}
                                placeholder="想吃什麼？要注意什麼？"
                                {...register('notes')}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-btn resize-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold shadow-lg shadow-gray-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        <span>儲存行程</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
