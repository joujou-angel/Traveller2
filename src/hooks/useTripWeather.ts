import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { addDays, format, isAfter, subYears, parseISO, differenceInDays } from 'date-fns';

const CITY_MAPPINGS: Record<string, string> = {
    '首爾': 'Seoul',
    '東京': 'Tokyo',
    '大阪': 'Osaka',
    '京都': 'Kyoto',
    '沖繩': 'Okinawa',
    '曼谷': 'Bangkok',
    '清邁': 'Chiang Mai',
    '巴黎': 'Paris',
    '倫敦': 'London',
    '紐約': 'New York'
};

const fetchTripConfig = async (tripId: string) => {
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

const fetchCoordinates = async (destination: string) => {
    const searchName = CITY_MAPPINGS[destination.trim()] || destination;

    let response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchName)}&count=1&language=zh&format=json`);
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

const fetchHybridWeather = async (lat: number, long: number, startDateStr: string, endDateStr: string): Promise<WeatherSegment[]> => {
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
                data.daily.time.forEach((t: string, i: number) => {
                    // Map date back to trip year for display
                    const originalDate = addDays(parseISO(t), 365 + (differenceInDays(parseISO(t), subYears(parseISO(t), 1)) > 365 ? 1 : 0)); // simple Approx: standard year + 1. 
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

export function useTripWeather(tripId?: string) {
    const { data: tripData, isLoading: isTripLoading, error: tripError } = useQuery({
        queryKey: ['tripConfig', tripId],
        queryFn: () => fetchTripConfig(tripId!),
        enabled: !!tripId,
        staleTime: 1000 * 60 * 30,
    });

    const { data: geoData, isLoading: isGeoLoading, error: geoError } = useQuery({
        queryKey: ['coordinates', tripData?.destination],
        queryFn: () => fetchCoordinates(tripData!.destination),
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
        queryFn: () => fetchHybridWeather(geoData.latitude, geoData.longitude, tripData.startDate, tripData.endDate),
        enabled: !!geoData?.latitude && !!tripData?.startDate && !!tripData?.endDate,
        staleTime: 1000 * 60 * 60, // 1 hour for hybrid data
    });

    const isLoading = isTripLoading || isGeoLoading || isWeatherLoading;
    const error = tripError || geoError || weatherError;

    return {
        weatherSegments, // Changed from weatherData (raw) to weatherSegments (processed)
        tripData,
        geoData,
        isLoading,
        error,
        refetch,
        isRefetching
    };
}
