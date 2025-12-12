import { useState, useMemo } from 'react';
import { ExternalLink, Edit2, Trash2, Bus, Utensils, Bed, Camera, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import { useTripMemories } from '../../memories/hooks/useTripMemories';
import { MemoryModal } from '../../memories/components/MemoryModal';
import { MoodIcon, MOODS } from '../../memories/components/MoodIcons';
import type { MoodType } from '../../memories/components/MoodIcons';

interface ItineraryItemProps {
    item: any;
    onEdit: (item: any) => void;
    onDelete: (id: number) => void;
    isReadOnly?: boolean;
    tripId: string; // Required for fetching memories
}

const CategoryIcons: Record<string, any> = {
    transport: Bus,
    food: Utensils,
    stay: Bed,
    activity: Camera,
};

const CategoryColors: Record<string, string> = {
    transport: 'bg-blue-50 text-blue-500 border-blue-100',
    food: 'bg-orange-50 text-orange-500 border-orange-100',
    stay: 'bg-indigo-50 text-indigo-500 border-indigo-100',
    activity: 'bg-positive/20 text-positive border-positive/30',
};

export default function ItineraryItem({ item, onEdit, onDelete, isReadOnly = false, tripId }: ItineraryItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);

    // Trip Memories Hook
    const { memories, createMemory, updateMemory, isCreating, isUpdating } = useTripMemories(tripId);

    // Find my memory for this distinct item
    const myMemory = useMemo(() => {
        return memories?.find(m => m.trip_item_id === item.id) || null;
    }, [memories, item.id]);

    const handleMemorySubmit = (data: any) => {
        if ('id' in data) {
            updateMemory(data);
        } else {
            createMemory(data);
        }
    };

    const Icon = CategoryIcons[item.category] || Camera;
    const colorClass = CategoryColors[item.category] || 'bg-gray-50 text-gray-500';

    // Format time (HH:MM:SS -> HH:MM)
    const timeStr = item.start_time ? item.start_time.split(':').slice(0, 2).join(':') : '--:--';

    return (
        <div className="group relative pl-4 pb-8 border-l-2 border-gray-300 last:border-0 last:pb-0">
            {/* Timeline Dot */}
            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${item.category === 'transport' ? 'bg-btn' : 'bg-negative'}`}></div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
                {/* Header (Always Visible) */}
                <div
                    className="p-4 flex items-center gap-3 cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {/* Time */}
                    {/* Time - Vertical Stack for Space Saving */}
                    <div className="flex flex-col items-start justify-center min-w-[3.2rem]">
                        <span className="text-sm font-bold text-gray-700 font-mono leading-none">
                            {timeStr}
                        </span>
                        {item.endTime && (
                            <span className="text-[10px] text-gray-400 font-mono leading-none mt-1">
                                {item.endTime}
                            </span>
                        )}
                    </div>

                    {/* Icon */}
                    <div className={`p-2 rounded-xl border flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                    </div>

                    {/* Location (Main Content) */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                        <h3 className="font-bold text-gray-800 text-lg leading-tight truncate">{item.location}</h3>
                    </div>

                    {/* Memory Button (Visible in Header) */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMemoryModalOpen(true);
                        }}
                        className={`rounded-full transition-all flex items-center justify-center hover:scale-110
                            ${myMemory
                                ? 'p-0' // Remove padding for larger icon
                                : 'p-2 text-gray-300 hover:text-orange-400 hover:bg-orange-50'
                            }
                        `}
                    >
                        {myMemory ? (
                            <MoodIcon
                                mood={MOODS.find(m => m.id === myMemory.mood_emoji) ? (myMemory.mood_emoji as MoodType) : 'discovery'}
                                size={36} // Increased from 20 to 36
                            />
                        ) : (
                            <Heart className="w-5 h-5" />
                        )}
                    </button>

                    {/* Toggle Icon */}
                    <div className="text-gray-300 group-hover:text-gray-500 transition-colors">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                </div>

                {/* Expanded Content (Notes & Actions) */}
                {isExpanded && (
                    <div className="border-t border-gray-50 bg-gray-50/50 p-4 space-y-4 animate-fade-in">

                        {/* Notes Section */}
                        <div className="bg-white p-3 rounded-xl border border-gray-100 text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                            {item.notes || <span className="text-gray-400 italic">沒有備註</span>}
                        </div>

                        {/* Actions Bar */}
                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-3">
                                {/* External Link */}
                                {item.google_map_link ? (
                                    <a
                                        href={item.google_map_link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        <span>Google Maps</span>
                                    </a>
                                ) : (
                                    <span className="text-xs text-gray-400">No link</span>
                                )}
                            </div>

                            {/* Edit/Delete - Only show if not read only */}
                            {!isReadOnly && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                                        className="p-2 bg-white rounded-full text-gray-600 shadow-sm hover:text-blue-500 hover:shadow transition-all"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                                        className="p-2 bg-white rounded-full text-gray-600 shadow-sm hover:text-red-500 hover:shadow transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Memory Modal */}
            <MemoryModal
                isOpen={isMemoryModalOpen}
                onClose={() => setIsMemoryModalOpen(false)}
                memory={myMemory}
                itemId={item.id}
                onSubmit={handleMemorySubmit}
                isSubmitting={isCreating || isUpdating}
            />
        </div>
    );
}
