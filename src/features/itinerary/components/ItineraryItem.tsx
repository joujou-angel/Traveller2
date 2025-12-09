import { useState } from 'react';
import { ExternalLink, Edit2, Trash2, Bus, Utensils, Bed, Camera, ChevronDown, ChevronUp } from 'lucide-react';

interface ItineraryItemProps {
    item: any;
    onEdit: (item: any) => void;
    onDelete: (id: number) => void;
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

export default function ItineraryItem({ item, onEdit, onDelete }: ItineraryItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const Icon = CategoryIcons[item.category] || Camera;
    const colorClass = CategoryColors[item.category] || 'bg-gray-50 text-gray-500';

    // Format time (HH:MM:SS -> HH:MM)
    const timeStr = item.start_time?.substring(0, 5) || '--:--';

    return (
        <div className="group relative pl-4 pb-8 border-l-2 border-gray-100 last:border-0 last:pb-0">
            {/* Timeline Dot */}
            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${item.category === 'transport' ? 'bg-btn' : 'bg-negative'}`}></div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
                {/* Header (Always Visible) */}
                <div
                    className="p-4 flex items-center gap-3 cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {/* Time */}
                    <span className="text-sm font-bold text-gray-600 font-mono whitespace-nowrap min-w-[2.5rem]">{timeStr}</span>

                    {/* Icon */}
                    <div className={`p-2 rounded-xl border flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                    </div>

                    {/* Location (Main Content) */}
                    <h3 className="flex-1 font-bold text-gray-800 text-lg leading-tight truncate">{item.location}</h3>

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
                                <span className="text-xs text-gray-400">No link provided</span>
                            )}

                            {/* Edit/Delete */}
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
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
