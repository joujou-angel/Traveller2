import { useState, useEffect } from 'react';
import { X, Save, Lock, Loader2 } from 'lucide-react';
import type { TripMemory, CreateMemoryDTO, UpdateMemoryDTO } from '../types';
import { useTranslation } from 'react-i18next';
import { MoodIcon, MOODS } from './MoodIcons';
import type { MoodType } from './MoodIcons';
// ... (skip unchanged lines)



interface MemoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    memory: TripMemory | null; // Existing memory or null
    itemId: number;
    onSubmit: (data: CreateMemoryDTO | { id: string, updates: UpdateMemoryDTO }) => void;
    isSubmitting: boolean;
}

export const MemoryModal = ({ isOpen, onClose, memory, itemId, onSubmit, isSubmitting }: MemoryModalProps) => {
    const { t } = useTranslation();
    const [content, setContent] = useState('');
    const [selectedMood, setSelectedMood] = useState<MoodType>('discovery');

    useEffect(() => {
        if (isOpen) {
            if (memory) {
                setContent(memory.content || '');
                // Cast memory.mood_emoji to MoodType if valid, else default to 'discovery'
                const mood = MOODS.find(m => m.id === memory.mood_emoji) ? (memory.mood_emoji as MoodType) : 'discovery';
                setSelectedMood(mood);
            } else {
                setContent('');
                setSelectedMood('discovery');
            }
        }
    }, [isOpen, memory]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            content,
            mood_emoji: selectedMood,
            is_private: true
        };

        if (memory) {
            onSubmit({ id: memory.id, updates: payload });
        } else {
            onSubmit({ trip_item_id: itemId, ...payload });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-gray-100 overflow-hidden transform transition-all scale-100">

                {/* Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-bold text-gray-700">{t('memory.private', 'Private Memory')}</span>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">

                    {/* Mood Selection */}
                    <div className="flex flex-col items-center gap-4">
                        {/* Selected Large Icon */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-28 h-28 flex items-center justify-center transition-all duration-300">
                                <MoodIcon mood={selectedMood} size={72} />
                            </div>
                            <div className="px-3 py-1 rounded-full bg-gray-50 border border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {MOODS.find(m => m.id === selectedMood)?.label}
                            </div>
                        </div>

                        {/* Presets Grid */}
                        <div className="flex items-center gap-3 p-4 rounded-3xl overflow-x-auto max-w-full justify-center">
                            {MOODS.map((mood) => (
                                <button
                                    key={mood.id}
                                    type="button"
                                    onClick={() => setSelectedMood(mood.id)}
                                    className={`relative flex-shrink-0 flex items-center justify-center transition-all duration-300
                                        ${selectedMood === mood.id
                                            ? 'scale-125 opacity-100 drop-shadow-sm'
                                            : 'opacity-40 hover:opacity-100 hover:scale-110 grayscale hover:grayscale-0'
                                        }`}
                                >
                                    <MoodIcon mood={mood.id} size={32} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            maxLength={500}
                            placeholder={t('memory.placeholder', 'I like this spot because...')}
                            className="w-full h-32 p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-100 resize-none placeholder:text-gray-300"
                        />
                        <div className="text-right text-[10px] text-gray-300">
                            {content.length}/500
                        </div>
                    </div>

                    {/* Actions */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors active:scale-95 shadow-lg shadow-orange-100"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
