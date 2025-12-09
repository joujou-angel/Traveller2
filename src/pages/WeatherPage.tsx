import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getWeatherDescription, getWeatherIcon } from '../lib/weatherHelpers';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';

const fetchTripConfig = async (tripId: string) => {
    const { data, error } = await supabase
        .from('trip_config')
        .select('*')
        .eq('trip_id', tripId)
        .single();

    if (error) throw error;
    // Handle case where trip_config exists but flight_info might be empty/partial
    if (!data?.flight_info?.destination) {
        throw new Error("尚未設定目的地");
    }
    return data.flight_info;
};

const fetchCoordinates = async (destination: string) => {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=zh&format=json`);
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
        throw new Error("找不到該地點");
    }
    return data.results[0];
};

const fetchWeather = async (lat: number, long: number) => {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
    return response.json();
};

export default function WeatherPage() {
    const { tripId } = useParams();
    // 1. Get Destination
    const { data: tripData, isLoading: isTripLoading, error: tripError } = useQuery({
        queryKey: ['tripConfig', tripId],
        queryFn: () => fetchTripConfig(tripId!),
        retry: false
    });

    // 2. Get Coordinates (Dependent on Trip)
    const { data: geoData, isLoading: isGeoLoading, error: geoError } = useQuery({
        queryKey: ['coordinates', tripData?.destination],
        queryFn: () => fetchCoordinates(tripData!.destination),
        enabled: !!tripData?.destination,
    });

    // 3. Get Weather (Dependent on Coordinates)
    const { data: weatherData, isLoading: isWeatherLoading } = useQuery({
        queryKey: ['weather', geoData?.latitude, geoData?.longitude],
        queryFn: () => fetchWeather(geoData.latitude, geoData.longitude),
        enabled: !!geoData?.latitude,
    });

    const isLoading = isTripLoading || isGeoLoading || isWeatherLoading;
    const error = tripError || geoError;

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-sub-title" />
                <p>正在載入天氣資訊...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 flex flex-col items-center justify-center text-center h-[60vh]">
                <div className="bg-red-50 p-4 rounded-full mb-4">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">無法取得天氣</h2>
                <p className="text-gray-500 mb-6">{(error as Error).message}</p>
                {(error as Error).message === "尚未設定目的地" && (
                    <Link to={`/trips/${tripId}/info`} className="bg-gray-900 text-white px-6 py-2 rounded-xl font-medium">
                        前往設定旅程
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className="p-6 pb-24 space-y-6">
            <header className="flex items-center space-x-2 mb-6">
                <MapPin className="w-6 h-6 text-sub-title" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{tripData?.destination}</h1>
                    <p className="text-sm text-gray-500">{geoData?.country} {geoData?.admin1}</p>
                </div>
            </header>

            <div className="space-y-4">
                {weatherData?.daily?.time.map((date: string, index: number) => {
                    const code = weatherData.daily.weather_code[index];
                    const minTemp = weatherData.daily.temperature_2m_min[index];
                    const maxTemp = weatherData.daily.temperature_2m_max[index];
                    const Icon = getWeatherIcon(code);
                    const desc = getWeatherDescription(code);

                    // Filter dates based on trip duration
                    const currentDate = new Date(date);
                    const startDate = new Date(tripData.startDate);
                    const endDate = new Date(tripData.endDate);

                    // Reset hours for accurate comparison
                    currentDate.setHours(0, 0, 0, 0);
                    startDate.setHours(0, 0, 0, 0);
                    endDate.setHours(0, 0, 0, 0);

                    if (currentDate < startDate || currentDate > endDate) {
                        return null;
                    }

                    // Simple date formatting
                    const dateStr = currentDate.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' });

                    return (
                        <div key={date} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="bg-blue-50 p-3 rounded-2xl">
                                    <Icon className="w-6 h-6 text-sub-title" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{dateStr}</p>
                                    <p className="text-sm text-gray-500">{desc}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xl font-bold text-gray-800">{maxTemp}°</span>
                                <span className="text-sm text-gray-400 ml-1">/ {minTemp}°</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="text-center text-xs text-gray-300 mt-8">Weather data by Open-Meteo.com</p>
        </div>
    );
}
