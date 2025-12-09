import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { Plane, MapPin, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

// Validation Schema
const schema = z.object({
    destination: z.string().min(1, "請輸入目的地"),
    startDate: z.string().min(1, "請選擇開始日期"),
    endDate: z.string().min(1, "請選擇結束日期"),
}).refine((data) => {
    if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
}, {
    message: "結束日期不能早於開始日期",
    path: ["endDate"],
});

type TripFormValues = z.infer<typeof schema>;

export default function TripSetupPage() {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<TripFormValues>({
        resolver: zodResolver(schema),
    });

    // Load existing data
    useState(() => {
        const loadData = async () => {
            const { data } = await supabase
                .from('trip_config')
                .select('flight_info')
                .limit(1)
                .single();

            if (data?.flight_info) {
                // @ts-ignore
                reset(data.flight_info);
            }
        };
        loadData();
    });

    const onSubmit = async (data: TripFormValues) => {
        setIsSubmitting(true);
        setError(null);

        try {
            // Get current user (optional, depending on RLS, but usually good practice)
            // const { data: { user } } = await supabase.auth.getUser();

            // Construct flight_info JSON
            const flightInfo = {
                destination: data.destination,
                startDate: data.startDate,
                endDate: data.endDate
            };

            // Upsert trip_config
            // Note: In a real app we might query by user_id. 
            // For this shared trip app, we effectively restart the trip config.
            // We will check if a record exists to update it, or insert a new one.
            // Since we don't have a specific ID, let's just fetch the first one or create new.

            const { data: existingConfig } = await supabase
                .from('trip_config')
                .select('id')
                .limit(1)
                .single();

            let result;

            if (existingConfig) {
                result = await supabase
                    .from('trip_config')
                    .update({
                        flight_info: flightInfo,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingConfig.id);
            } else {
                result = await supabase
                    .from('trip_config')
                    .insert({
                        flight_info: flightInfo,
                        // If you have user_id column and it's required:
                        // user_id: user?.id 
                    });
            }

            if (result.error) throw result.error;

            // Navigate home on success
            navigate('/');

        } catch (err: any) {
            console.error('Error saving trip:', err);
            setError(err.message || "儲存失敗，請稍後再試。");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream flex flex-col justify-center items-center p-6 text-gray-800">
            <div className="max-w-md w-full animate-fade-in-up">
                <header className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-white rounded-full shadow-sm mb-4">
                        <Plane className="w-10 h-10 text-macaron-blue" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2 tracking-tight">開始新旅程</h1>
                    <p className="text-text-muted">設定你的航班與時間，自動生成行程表</p>
                </header>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {/* Destination */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold ml-1 text-gray-600">目的地</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                {...register("destination")}
                                type="text"
                                placeholder="例如：東京, 大阪"
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-macaron-blue focus:bg-white transition-all font-medium"
                            />
                        </div>
                        {errors.destination && <p className="text-red-400 text-xs ml-1">{errors.destination.message}</p>}
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold ml-1 text-gray-600">去程</label>
                            <div className="relative">
                                <input
                                    {...register("startDate")}
                                    type="date"
                                    className="w-full pl-4 pr-2 py-3 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-macaron-blue focus:bg-white transition-all text-sm font-medium"
                                />
                            </div>
                            {errors.startDate && <p className="text-red-400 text-xs ml-1">{errors.startDate.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold ml-1 text-gray-600">回程</label>
                            <div className="relative">
                                <input
                                    {...register("endDate")}
                                    type="date"
                                    className="w-full pl-4 pr-2 py-3 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-macaron-blue focus:bg-white transition-all text-sm font-medium"
                                />
                            </div>
                            {errors.endDate && <p className="text-red-400 text-xs ml-1">{errors.endDate.message}</p>}
                        </div>
                    </div>

                    <button
                        disabled={isSubmitting}
                        type="submit"
                        className="w-full py-4 mt-4 bg-gray-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200"
                    >
                        <span>{isSubmitting ? '設定中...' : 'Start Adventure'}</span>
                        {!isSubmitting && <ArrowRight className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div>
    );
}
