import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { Plane, MapPin, ArrowRight, Calendar } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import 'react-day-picker/dist/style.css';
import { supabase } from '../lib/supabase';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function TripSetupPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Dynamic schema based on translations isn't ideal for 'message' but acceptable.
    // Better to use map/code in schema and translate in component, but for now simple approach:
    const schema = z.object({
        destination: z.string().min(1, t('setup.errorDestination', "Please enter destination")),
        startDate: z.string().min(1, t('setup.errorStartDate', "Please select start date")),
        endDate: z.string().min(1, t('setup.errorEndDate', "Please select end date")),
    }).refine((data) => {
        if (data.startDate && data.endDate) {
            return new Date(data.startDate) <= new Date(data.endDate);
        }
        return true;
    }, {
        message: t('setup.errorDateOrder', "End date cannot be earlier than start date"),
        path: ["endDate"],
    });

    type TripFormValues = z.infer<typeof schema>;

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TripFormValues>({
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
            const flightInfo = {
                destination: data.destination,
                startDate: data.startDate,
                endDate: data.endDate
            };

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
                    });
            }

            if (result.error) throw result.error;

            // Navigate home on success
            navigate('/');

        } catch (err: any) {
            console.error('Error saving trip:', err);
            setError(err.message || t('setup.saveError', "Save failed, please try again later."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-page-bg flex flex-col justify-center items-center p-6 text-gray-800">
            <div className="max-w-md w-full animate-fade-in-up">
                <header className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-white rounded-full shadow-sm mb-4">
                        <Plane className="w-10 h-10 text-btn" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2 tracking-tight">{t('setup.title', 'Start New Adventure')}</h1>
                    <p className="text-desc">{t('setup.subtitle', 'Set your flight and dates to auto-generate itinerary')}</p>
                </header>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {/* Destination */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold ml-1 text-gray-600">{t('setup.destination', 'Destination')}</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                {...register("destination")}
                                type="text"
                                placeholder={t('setup.destinationPlaceholder', 'e.g. Tokyo, Osaka')}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-btn focus:bg-white transition-all font-medium"
                            />
                        </div>
                        {errors.destination && <p className="text-red-400 text-xs ml-1">{errors.destination.message}</p>}
                    </div>

                    {/* Date Range Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold ml-1 text-gray-600">{t('setup.dates', 'Dates')}</label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-btn focus:bg-white transition-all font-medium text-left flex items-center"
                            >
                                <Calendar className="absolute left-4 text-gray-400 w-5 h-5" />
                                <span className={watch("startDate") ? "text-gray-900" : "text-gray-400"}>
                                    {watch("startDate") && watch("endDate")
                                        ? `${format(new Date(watch("startDate")), "yyyy/MM/dd")} - ${format(new Date(watch("endDate")), "yyyy/MM/dd")}`
                                        : t('setup.selectDateRange', 'Select Date Range')}
                                </span>
                            </button>

                            {isCalendarOpen && (
                                <div className="absolute z-10 bottom-full mb-2 left-0 w-full bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex justify-center animate-fade-in-up">
                                    <style>{`
                                        .rdp { --rdp-cell-size: 32px; --rdp-accent-color: #2D3748; --rdp-background-color: #EDF2F7; margin: 0; }
                                        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #EDF2F7; }
                                        .rdp-day_selected { background-color: #1a202c !important; color: white !important; }
                                        .rdp-day_selected:hover { background-color: #2d3748 !important; }
                                    `}</style>
                                    <DayPicker
                                        mode="range"
                                        selected={{
                                            from: watch("startDate") ? new Date(watch("startDate")) : undefined,
                                            to: watch("endDate") ? new Date(watch("endDate")) : undefined,
                                        }}
                                        onSelect={(range) => {
                                            if (range?.from) {
                                                setValue("startDate", format(range.from, "yyyy-MM-dd"), { shouldValidate: true });
                                            } else {
                                                setValue("startDate", "", { shouldValidate: true });
                                            }

                                            if (range?.to) {
                                                setValue("endDate", format(range.to, "yyyy-MM-dd"), { shouldValidate: true });
                                            } else {
                                                setValue("endDate", "", { shouldValidate: true });
                                            }

                                            if (range?.from && range?.to) {
                                                setIsCalendarOpen(false);
                                            }
                                        }}
                                        numberOfMonths={1}
                                        defaultMonth={new Date()}
                                        modifiersClassNames={{
                                            selected: "bg-gray-900 text-white",
                                            today: "font-bold text-btn"
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        {(errors.startDate || errors.endDate) && (
                            <p className="text-red-400 text-xs ml-1">
                                {errors.startDate?.message || errors.endDate?.message}
                            </p>
                        )}
                    </div>

                    <button
                        disabled={isSubmitting}
                        type="submit"
                        className="w-full py-4 mt-4 bg-gray-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200"
                    >
                        <span>{isSubmitting ? t('setup.submit', 'Start Adventure') : t('setup.submit', 'Start Adventure')}</span>
                        {!isSubmitting && <ArrowRight className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div>
    );
}
