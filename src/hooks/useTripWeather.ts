import { useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import type { Trip } from '../features/trips/types';
import { supabase } from '../lib/supabase';
import { addDays, format, isAfter, subYears, parseISO } from 'date-fns';

const CITY_MAPPINGS: Record<string, string> = {
    // International
    '首爾': 'Seoul',
    '東京': 'Tokyo',
    '大阪': 'Osaka',
    '京都': 'Kyoto',
    '沖繩': 'Okinawa',
    '曼谷': 'Bangkok',
    '清邁': 'Chiang Mai',
    '巴黎': 'Paris',
    '倫敦': 'London',
    '紐約': 'New York',

    // Taiwan
    '台北': 'Taipei',
    '臺北': 'Taipei',
    '新北': 'New Taipei',
    '桃園': 'Taoyuan',
    '台中': 'Taichung',
    '臺中': 'Taichung',
    '台南': 'Tainan',
    '臺南': 'Tainan',
    '高雄': 'Kaohsiung',
    '基隆': 'Keelung',
    '新竹': 'Hsinchu',
    '苗栗': 'Miaoli',
    '彰化': 'Changhua',
    '南投': 'Nantou',
    '雲林': 'Yunlin',
    '嘉義': 'Chiayi',
    '屏東': 'Pingtung',
    '宜蘭': 'Yilan',
    '花蓮': 'Hualien',
    '台東': 'Taitung',
    '臺東': 'Taitung',
    '澎湖': 'Penghu',
    '金門': 'Kinmen',
    '馬祖': 'Matsu'
};

export const fetchTripConfig = async (tripId: string) => {
    const { data, error } = await supabase
        .from('trip_config')
        .select('*')
        .eq('trip_id', tripId)
        .single();

    if (error) throw error;
    if (!data?.flight_info?.destination) {
        throw new Error("尚未設定目的地");
    }
    return data.flight_info;
};

export const fetchCoordinates = async (destination: string, language: string = 'en') => {
    const searchName = CITY_MAPPINGS[destination.trim()] || destination;

    // Map common languages to OpenMeteo supported codes if necessary
    // 'zh-TW' -> 'zh'
    const apiLang = language.startsWith('zh') ? 'zh' : 'en';

    let response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchName)}&count=1&language=${apiLang}&format=json`);
    let data = await response.json();

    if (data.results && data.results.length > 0) {
        return data.results[0];
    }

    console.log(`Weather: Retrying search for ${searchName} without language param...`);
    response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchName)}&count=1&format=json`);
    data = await response.json();

    if (data.results && data.results.length > 0) {
        return data.results[0];
    }

    throw new Error("找不到該地點，請確認名稱");
};

// Define structure for unified weather data
export type WeatherSegment = {
    date: string;
    weatherCode: number;
    maxTemp: number;
    minTemp: number;
    isHistorical: boolean;
};

export const fetchHybridWeather = async (lat: number, long: number, startDateStr: string, endDateStr: string): Promise<WeatherSegment[]> => {
    const today = new Date();
    const tripStart = parseISO(startDateStr);
    const tripEnd = parseISO(endDateStr);

    const FORECAST_DAYS = 14;
    const forecastLimit = addDays(today, FORECAST_DAYS);

    const segments: WeatherSegment[] = [];

    // 1. Determine ranges
    let forecastStart = tripStart;
    let forecastEnd = isAfter(tripEnd, forecastLimit) ? forecastLimit : tripEnd;

    let historicalStart = isAfter(tripEnd, forecastLimit) ? addDays(forecastLimit, 1) : null;
    // If trip starts completely in the future (after forecast limit)
    if (isAfter(tripStart, forecastLimit)) {
        forecastStart = null as any; // No forecast
        forecastEnd = null as any;
        historicalStart = tripStart;
    }
    const historicalEnd = tripEnd;

    // 2. Fetch Forecast (If applicable)
    if (forecastStart && (!isAfter(forecastStart, forecastEnd))) {
        const s = format(forecastStart, 'yyyy-MM-dd');
        const e = format(forecastEnd, 'yyyy-MM-dd');

        // Only fetch if date ranges are valid (OpenMeteo requires start <= end)
        // Also ensure start is not in the past beyond simple history (OpenMeteo Forecast includes some past days, but let's stick to valid ranges)

        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${s}&end_date=${e}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.daily) {
                data.daily.time.forEach((t: string, i: number) => {
                    segments.push({
                        date: t,
                        weatherCode: data.daily.weather_code[i],
                        maxTemp: data.daily.temperature_2m_max[i],
                        minTemp: data.daily.temperature_2m_min[i],
                        isHistorical: false
                    });
                });
            }
        } catch (err) {
            console.error("Forecast fetch error", err);
        }
    }

    // 3. Fetch Historical (If applicable)
    if (historicalStart && (!isAfter(historicalStart, historicalEnd))) {
        // Shift dates back by 1 year
        const sRef = subYears(historicalStart, 1);
        const eRef = subYears(historicalEnd, 1);

        const s = format(sRef, 'yyyy-MM-dd');
        const e = format(eRef, 'yyyy-MM-dd');

        try {
            const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${long}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${s}&end_date=${e}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.daily) {
                data.daily.time.forEach((_t: string, i: number) => {
                    // Map date back to trip year for display
                    // Better: just use index to map to the requested range.
                    // Actually, simpler: we asked for X days, we get X days. mapping them to historicalStart + index.

                    const displayDate = addDays(historicalStart!, i);

                    segments.push({
                        date: format(displayDate, 'yyyy-MM-dd'),
                        weatherCode: data.daily.weather_code[i],
                        maxTemp: data.daily.temperature_2m_max[i],
                        minTemp: data.daily.temperature_2m_min[i],
                        isHistorical: true
                    });
                });
            }
        } catch (err) {
            console.error("Archive fetch error", err);
        }
    }

    // Sort by date just in case
    return segments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const prefetchTripWeather = async (queryClient: QueryClient, trip: Trip, language: string = 'en') => {
    // 1. Prefetch Coordinates
    const geoData = await queryClient.fetchQuery({
        queryKey: ['coordinates', trip.location, language],
        queryFn: () => fetchCoordinates(trip.location, language),
        staleTime: Infinity
    });

    if (geoData) {
        // 2. Prefetch Weather (The slow part)
        // We use the trip dates directly, skipping the tripConfig fetch waterfall
        queryClient.prefetchQuery({
            queryKey: ['weather', geoData.latitude, geoData.longitude, trip.start_date, trip.end_date],
            queryFn: () => fetchHybridWeather(geoData.latitude, geoData.longitude, trip.start_date, trip.end_date),
            staleTime: 1000 * 60 * 60
        });
    }

    // 3. Prefetch Trip Config (Parallel)
    // This is for other pages like Info, etc.
    queryClient.prefetchQuery({
        queryKey: ['tripConfig', trip.id],
        queryFn: () => fetchTripConfig(trip.id),
        staleTime: 1000 * 60 * 30
    });
};

export function useTripWeather(tripId?: string, language: string = 'en') {
    const { data: tripData, isLoading: isTripLoading, error: tripError } = useQuery({
        queryKey: ['tripConfig', tripId],
        queryFn: () => fetchTripConfig(tripId!),
        enabled: !!tripId,
        staleTime: 1000 * 60 * 30,
    });

    const { data: geoData, isLoading: isGeoLoading, error: geoError } = useQuery({
        queryKey: ['coordinates', tripData?.destination, language],
        queryFn: () => fetchCoordinates(tripData!.destination, language),
        enabled: !!tripData?.destination,
        staleTime: Infinity,
    });

    const {
        data: weatherSegments,
        isLoading: isWeatherLoading,
        error: weatherError,
        refetch,
        isRefetching
    } = useQuery({
        queryKey: ['weather', geoData?.latitude, geoData?.longitude, tripData?.startDate, tripData?.endDate],
        queryFn: (() => {
            if (!geoData || !tripData) return Promise.resolve([]);
            return fetchHybridWeather(geoData.latitude, geoData.longitude, tripData.startDate, tripData.endDate);
        }) as () => Promise<WeatherSegment[]>,
        enabled: !!geoData?.latitude && !!tripData?.startDate && !!tripData?.endDate,
        staleTime: 1000 * 60 * 60, // 1 hour for hybrid data
    });

    const isLoading = isTripLoading || isGeoLoading || isWeatherLoading;
    const error = tripError || geoError || weatherError;

    const useQueryClientRef = useQueryClient();

    const handleRefresh = async () => {
        await useQueryClientRef.invalidateQueries({ queryKey: ['tripConfig', tripId] });
        await useQueryClientRef.invalidateQueries({ queryKey: ['coordinates'] });
        await useQueryClientRef.invalidateQueries({ queryKey: ['weather'] });
    };

    return {
        weatherSegments,
        tripData,
        geoData,
        isLoading,
        error,
        refetch: handleRefresh,
        isRefetching: isTripLoading || isGeoLoading || isRefetching
    };
}
