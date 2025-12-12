import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LocationResult {
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
    name: string;
}

interface LocationPickerProps {
    onSelect: (location: { name: string; lat: number; lng: number }) => void;
    onChange?: (val: string) => void;
    initialValue?: string;
}

export default function LocationPicker({ onSelect, onChange, initialValue }: LocationPickerProps) {
    const { t } = useTranslation();
    const [query, setQuery] = useState(initialValue || '');
    const [results, setResults] = useState<LocationResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const skipSearchRef = useRef(false);

    useEffect(() => {
        setQuery(initialValue || '');
    }, [initialValue]);

    // Debounced Auto-Search
    useEffect(() => {
        // Skip if this update was triggered by selection
        if (skipSearchRef.current) {
            skipSearchRef.current = false;
            return;
        }

        const timer = setTimeout(() => {
            if (query.trim().length > 1) {
                handleSearch();
            }
        }, 600); // 600ms Delay

        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        // setIsOpen(true); // Don't force open immediately, maybe wait for results?
        // Actually fine to open to show loading?
        // Let's open only if we have results or are loading?
        // Let's keep existing behavior for now but safeguard against empty query.

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            setResults(data);
            setIsOpen(true); // Show results (or "No results")
        } catch (error) {
            console.error("Search failed:", error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    const handleSelect = (item: LocationResult) => {
        skipSearchRef.current = true; // Prevent auto-search triggered by this update
        const name = item.name || item.display_name.split(',')[0];
        setQuery(name);
        onSelect({
            name: name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
        });
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a39992]" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        const val = e.target.value;
                        setQuery(val);
                        onChange?.(val);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={t('itinerary.locationPlaceholder', 'e.g. Tokyo Tower')}
                    className="w-full pl-10 pr-10 py-3 bg-white rounded-xl border border-[#e8e3de] focus:outline-none focus:ring-2 focus:ring-[#9B8D74] placeholder-[#667280] text-[#342b14]"
                />

                {/* Status Indicator / Actions */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400 m-1.5" />
                    ) : query ? (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                setIsOpen(false);
                                onChange?.('');
                                // Optionally focus input?
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Dropdown Results */}
            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 max-h-60 overflow-y-auto">
                    {results.map((item) => (
                        <button
                            key={item.place_id}
                            type="button"
                            onClick={() => handleSelect(item)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                        >
                            <div className="text-sm font-medium text-gray-900 truncate">
                                {item.name || item.display_name.split(',')[0]}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                                {item.display_name}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {isOpen && !isLoading && results.length === 0 && query && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 p-4 text-center text-sm text-gray-500">
                    No results found
                </div>
            )}
        </div>
    );
}
