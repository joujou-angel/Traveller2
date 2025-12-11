import { MapPin, Loader2, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { useTripWeather } from '../hooks/useTripWeather';
import { getWeatherDescription, getWeatherIcon } from '../lib/weatherHelpers';
import { useTranslation } from 'react-i18next';

const HistoricalIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 ml-1">
        <path d="M17.5 19C19.9853 19 22 16.9853 22 14.5C22 12.132 20.177 10.244 17.819 10.035C17.65 6.425 14.672 3.5 11 3.5C7.328 3.5 4.35 6.425 4.181 10.035C1.823 10.244 0 12.132 0 14.5C0 16.9853 2.01472 19 4.5 19H12" stroke="#a39992" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="19" r="5" fill="white" stroke="#9B8D74" strokeWidth="1.5" />
        <path d="M16 16.5V19L17.5 20.5" stroke="#554030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default function WeatherPage() {
    const { t } = useTranslation();
    const { tripId } = useParams();

    // Note: Use 'weatherSegments' now instead of raw weatherData
    const {
        weatherSegments,
        tripData,
        geoData,
        isLoading,
        error,
        refetch,
        isRefetching
    } = useTripWeather(tripId);

    // Initial Loading
    if (isLoading && !weatherSegments) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-sub-title" />
                <p>{t('common.loading', 'Loading...')}</p>
            </div>
        );
    }

    if (error) {
        // ... (Error UI same as before)
        return (
            <div className="p-6 flex flex-col items-center justify-center text-center h-[60vh]">
                <div className="bg-red-50 p-4 rounded-full mb-4">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">{t('weather.errorTitle', 'Unable to load weather')}</h2>
                <p className="text-gray-500 mb-6">{(error as Error).message}</p>
                {(error as Error).message === "尚未設定目的地" && (
                    <Link to={`/trips/${tripId}/info`} className="bg-gray-900 text-white px-6 py-2 rounded-xl font-medium">
                        {t('weather.goToSetup', 'Go to Setup')}
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className="p-6 pb-24 space-y-6">
            <header className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                    <MapPin className="w-6 h-6 text-sub-title" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{tripData?.destination}</h1>
                        <p className="text-sm text-gray-500">{geoData?.country} {geoData?.admin1}</p>
                    </div>
                </div>

                <button
                    onClick={() => refetch()}
                    disabled={isRefetching}
                    className="p-2 bg-white border border-gray-100 rounded-full shadow-sm active:scale-95 transition-all text-gray-500 hover:text-btn"
                >
                    <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
                </button>
            </header>

            <div className="space-y-4">
                {weatherSegments?.map((day: any) => {
                    const code = day.weatherCode;
                    const minTemp = day.minTemp;
                    const maxTemp = day.maxTemp;
                    const Icon = getWeatherIcon(code);
                    const desc = getWeatherDescription(code);
                    const currentDate = new Date(day.date);

                    // Simple date formatting (using i18n locale would be better, but keeping simple for now)
                    const dateStr = currentDate.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' });

                    return (
                        <div key={day.date} className={`relative p-5 rounded-3xl shadow-sm border flex items-center justify-between overflow-hidden ${day.isHistorical ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100'}`}>

                            <div className="flex items-center space-x-4">
                                <div className={`p-3 rounded-2xl ${day.isHistorical ? 'bg-gray-200 grayscale' : 'bg-blue-50'}`}>
                                    <Icon className={`w-6 h-6 ${day.isHistorical ? 'text-gray-500' : 'text-sub-title'}`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className={`font-bold ${day.isHistorical ? 'text-gray-600' : 'text-gray-900'}`}>{dateStr}</p>
                                        {day.isHistorical && (
                                            <div title={t('weather.historical', 'Historical Estimate')}>
                                                <HistoricalIcon />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500">{desc}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-xl font-bold ${day.isHistorical ? 'text-gray-600' : 'text-gray-800'}`}>{maxTemp}°</span>
                                <span className="text-sm text-gray-400 ml-1">/ {minTemp}°</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-blue-50 p-4 rounded-xl flex gap-3 text-sm text-blue-700/80">
                <Info className="w-5 h-5 shrink-0" />
                <p>{t('weather.disclaimer', 'Only near-term 14-day forecasts are accurate. Distant dates show "Historical Average" for reference.')}</p>
            </div>

            <p className="text-center text-xs text-gray-300 mt-8">Weather data by Open-Meteo.com</p>
        </div>
    );
}
