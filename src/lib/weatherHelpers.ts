import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning } from 'lucide-react';

// WMO Weather interpretation codes (https://open-meteo.com/en/docs)
export const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return Sun;
    if (code === 2 || code === 3) return Cloud;
    if (code >= 51 && code <= 67) return CloudRain;
    if (code >= 71 && code <= 77) return CloudSnow;
    if (code >= 80 && code <= 82) return CloudRain;
    if (code >= 95 && code <= 99) return CloudLightning;
    return Sun; // Default
};

export const getWeatherDescription = (code: number) => {
    switch (code) {
        case 0: return 'weather.codes.0';
        case 1: return 'weather.codes.1';
        case 2: return 'weather.codes.2';
        case 3: return 'weather.codes.3';
        case 45: case 48: return 'weather.codes.45';
        case 51: case 53: case 55: return 'weather.codes.51';
        case 61: case 63: case 65: return 'weather.codes.61';
        case 71: case 73: case 75: return 'weather.codes.71';
        case 80: case 81: case 82: return 'weather.codes.80';
        case 95: case 96: case 99: return 'weather.codes.95';
        default: return 'weather.codes.unknown';
    }
};
