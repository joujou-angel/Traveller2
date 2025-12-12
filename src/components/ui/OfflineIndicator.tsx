import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const OfflineIndicator = () => {
    const { t } = useTranslation();
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-gray-900/95 text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 backdrop-blur-sm shadow-md animate-in slide-in-from-top duration-300">
            <WifiOff className="w-3.5 h-3.5" />
            <span>{t('common.offlineMode', 'You are currently offline. Changes may not be saved.')}</span>
        </div>
    );
};
