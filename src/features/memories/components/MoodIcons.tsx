import type { HTMLAttributes } from 'react';

export type MoodType = 'awe' | 'exhausted' | 'ripoff' | 'crowded' | 'discovery' | 'delicious';

interface MoodIconProps extends HTMLAttributes<SVGElement> {
    mood: MoodType;
    size?: number;
}

export const MOODS: { id: MoodType; label: string; color: string; keywords: string }[] = [
    { id: 'awe', label: '震撼', color: '#673AB7', keywords: 'Mind-blown' },       // Deep Purple
    { id: 'discovery', label: '驚喜', color: '#FFD700', keywords: 'Hidden Gem' },  // Gold
    { id: 'delicious', label: '滿足', color: '#FF7043', keywords: 'Yummy' },       // Coral Orange
    { id: 'exhausted', label: '累癱', color: '#78909C', keywords: 'Burnout' },     // Blue Grey
    { id: 'crowded', label: '阿雜', color: '#8D6E63', keywords: 'Chaos' },         // Brown
    { id: 'ripoff', label: '盤子', color: '#E53935', keywords: 'Rip-off' },        // Red
];

export const MoodIcon = ({ mood, size = 24, className, ...props }: MoodIconProps) => {
    const commonProps = {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        className: className,
        ...props
    };

    switch (mood) {
        // 1. Awe (Mind-blown): Wide eyes, open mouth, radiant lines
        case 'awe':
            return (
                <svg {...commonProps}>
                    <circle cx="12" cy="12" r="10" fill="#EDE7F6" />
                    {/* Radiant lines (Impact) */}
                    <path d="M12 2V4M12 20V22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M2 12H4M20 12H22M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93" stroke="#673AB7" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                    {/* Face */}
                    <circle cx="9" cy="11" r="1.5" fill="#311B92" /> {/* Eye */}
                    <circle cx="15" cy="11" r="1.5" fill="#311B92" /> {/* Eye */}
                    <ellipse cx="12" cy="16" rx="2" ry="3" fill="#311B92" /> {/* Open Mouth */}
                </svg>
            );

        // 5. Discovery (Hidden Gem): Stars eyes + Magic wand trail
        case 'discovery':
            return (
                <svg {...commonProps}>
                    <circle cx="12" cy="12" r="10" fill="#FFF8E1" />
                    {/* Star Eyes */}
                    <path d="M9 9L9.5 10.5L11 11L9.5 11.5L9 13L8.5 11.5L7 11L8.5 10.5L9 9Z" fill="#FFC107" />
                    <path d="M15 9L15.5 10.5L17 11L15.5 11.5L15 13L14.5 11.5L13 11L14.5 10.5L15 9Z" fill="#FFC107" />
                    {/* Smile */}
                    <path d="M9 16C9 16 10.5 17 12 17C13.5 17 15 16 15 16" stroke="#FFA000" strokeWidth="2" strokeLinecap="round" />
                    {/* Sparkles/Magic */}
                    <path d="M18 6L19 4L20 6M4 16L3 14L2 16" stroke="#FFD700" strokeWidth="1.5" opacity="0.8" />
                </svg>
            );

        // 6. Culinary Bliss (Delicious): Tongue out savoring
        case 'delicious':
            return (
                <svg {...commonProps}>
                    <circle cx="12" cy="12" r="10" fill="#FBE9E7" />
                    {/* Happy Eyes */}
                    <path d="M7 10C7 10 8 9 10 9C12 9 12 10 12 10" stroke="#E64A19" strokeWidth="2" strokeLinecap="round" />
                    <path d="M12 10C12 10 13 9 15 9C17 9 17 10 17 10" stroke="#E64A19" strokeWidth="2" strokeLinecap="round" />
                    {/* Mouth & Tongue */}
                    <path d="M8 14C8 14 9.5 17 12 17C14.5 17 16 14 16 14" stroke="#E64A19" strokeWidth="2" strokeLinecap="round" />
                    <path d="M12 17C12 17 14 18 15 17" stroke="#FF7043" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="7" cy="15" r="1.5" fill="#FFCCBC" opacity="0.8" /> {/* Blush */}
                    <circle cx="17" cy="15" r="1.5" fill="#FFCCBC" opacity="0.8" /> {/* Blush */}
                </svg>
            );

        // 2. Exhaustion (Iron Legs/Melting): Melting face
        case 'exhausted':
            return (
                <svg {...commonProps}>
                    <circle cx="12" cy="12" r="10" fill="#ECEFF1" />
                    {/* Drooping Eyes */}
                    <path d="M7 11L9 12L7 13" stroke="#455A64" strokeWidth="2" strokeLinecap="round" />
                    <path d="M17 11L15 12L17 13" stroke="#455A64" strokeWidth="2" strokeLinecap="round" />
                    {/* Melting Mouth */}
                    <path d="M9 16C9 16 10 15 11 16C12 17 13 18 14 16C15 14 16 17 16 17" stroke="#455A64" strokeWidth="2" strokeLinecap="round" />
                    {/* Sweat/Drip */}
                    <path d="M18 8V11" stroke="#90A4AE" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            );

        // 4. Crowded (Chaos): Squeezed face
        case 'crowded':
            return (
                <svg {...commonProps}>
                    <circle cx="12" cy="12" r="10" fill="#EFEBE9" />
                    {/* Squeezing Hands/Blocks using path */}
                    <rect x="2" y="6" width="4" height="12" rx="1" fill="#8D6E63" opacity="0.2" />
                    <rect x="18" y="6" width="4" height="12" rx="1" fill="#8D6E63" opacity="0.2" />
                    {/* Squished Face */}
                    <path d="M9 9L8 11L9 13" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> {/* Squint Left */}
                    <path d="M15 9L16 11L15 13" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> {/* Squint Right */}
                    <path d="M10 16H14" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" /> {/* Flat Mouth */}
                    <path d="M12 7V9" stroke="#5D4037" strokeWidth="1.5" strokeLinecap="round" /> {/* Furrowed Brow */}
                </svg>
            );

        // 3. Rip-off (Low CP): Face reading a long receipt with shock
        case 'ripoff':
            return (
                <svg {...commonProps}>
                    <circle cx="12" cy="12" r="10" fill="#FFEBEE" />
                    {/* Face */}
                    <path d="M9 10L8 11L9 12" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> {/* Wincing Eye Left */}
                    <path d="M15 10L16 11L15 12" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> {/* Wincing Eye Right */}
                    <path d="M10 16C10 16 11 15 12 15C13 15 14 16 14 16" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" /> {/* Wincing Mouth */}
                    <path d="M17 7L16 6" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" /> {/* Stress mark */}

                    {/* Receipt Overlay */}
                    <rect x="14" y="14" width="6" height="8" rx="1" fill="white" stroke="#D32F2F" strokeWidth="1.5" transform="rotate(-10 14 14)" />
                    <path d="M15.5 16H18.5" stroke="#D32F2F" strokeWidth="1" transform="rotate(-10 14 14)" opacity="0.5" />
                    <path d="M15.5 18H18.5" stroke="#D32F2F" strokeWidth="1" transform="rotate(-10 14 14)" opacity="0.5" />
                    <path d="M15.5 20H17.5" stroke="#D32F2F" strokeWidth="1" transform="rotate(-10 14 14)" opacity="0.5" />
                </svg>
            );

        default:
            return null;
    }
};
