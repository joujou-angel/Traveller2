import { format } from 'date-fns';
import type { Expense } from '../../expenses/types';

interface TripConfig {
    destination: string;
    startDate: string;
    endDate: string;
}

interface ItineraryItem {
    id: number;
    date: string;
    start_time: string;
    category: string;
    location: string;
    notes?: string;
    google_map_link?: string;
}

export const generateMarkdown = (
    tripConfig: TripConfig,
    itineraryItems: ItineraryItem[],
    expenses: Expense[]
): string => {
    let md = `# ${tripConfig.destination} Trip\n`;
    md += `> Date: ${tripConfig.startDate} - ${tripConfig.endDate}\n\n`;

    // --- Itinerary Section ---
    md += `## 🗓️ Itinerary\n\n`;

    // Group items by date
    const groupedItems: Record<string, ItineraryItem[]> = {};
    itineraryItems.forEach(item => {
        if (!groupedItems[item.date]) groupedItems[item.date] = [];
        groupedItems[item.date].push(item);
    });

    // Sort dates
    const sortedDates = Object.keys(groupedItems).sort();

    sortedDates.forEach((date, index) => {
        const dayNum = index + 1;
        const items = groupedItems[date].sort((a, b) => a.start_time.localeCompare(b.start_time));

        md += `### Day ${dayNum} (${format(new Date(date), 'MM/dd')})\n`;

        if (items.length === 0) {
            md += `- No activities planned\n`;
        } else {
            items.forEach(item => {
                const time = item.start_time.slice(0, 5); // HH:MM
                md += `- [${time}] **${item.location}** (${item.category})\n`;
                if (item.notes) {
                    md += `  - Note: ${item.notes}\n`;
                }
                if (item.google_map_link) {
                    md += `  - [Google Maps](${item.google_map_link})\n`;
                }
            });
        }
        md += `\n`;
    });

    // --- Expenses Section ---
    md += `\n---\n\n`;
    md += `## 💸 Expenses\n\n`;

    if (expenses.length === 0) {
        md += `No expenses recorded.\n`;
    } else {
        md += `| Date | Item | Category | Amount | Payer | Split |\n`;
        md += `|------|------|----------|--------|-------|-------|\n`;

        // Sort expenses by date
        const sortedExpenses = [...expenses].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        sortedExpenses.forEach(exp => {
            const date = format(new Date(exp.created_at), 'MM/dd');
            const splitCount = Object.keys(exp.split_details || {}).length;
            const splitText = splitCount > 0 ? `${splitCount} ppl` : 'Active';

            md += `| ${date} | ${exp.item_name} | - | ${exp.currency} ${exp.amount} | ${exp.payer} | ${splitText} |\n`;
        });
    }

    return md;
};

export const downloadMarkdown = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
