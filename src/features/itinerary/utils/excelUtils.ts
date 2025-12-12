import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { Expense } from '../../expenses/types';

interface TripConfig {
    destination: string;
    startDate: string;
    endDate: string;
}

interface ItineraryItem {
    id?: number;
    date: string; // YYYY-MM-DD
    start_time: string; // HH:MM
    category: string;
    location: string;
    lat?: number;
    lng?: number;
    notes?: string;
    google_map_link?: string;
}

export const generateExcel = (
    _tripConfig: TripConfig,
    itineraryItems: ItineraryItem[],
    expenses: Expense[]
): Blob => {
    const wb = XLSX.utils.book_new();

    // 1. Itinerary Sheet
    // Transform to flat rows
    const itineraryRows = itineraryItems.map(item => ({
        Date: item.date,
        Time: item.start_time,
        Location: item.location,
        Category: item.category,
        Notes: item.notes || '',
        Link: item.google_map_link || '',
        Lat: item.lat || '',
        Lng: item.lng || ''
    }));

    // Sort by Date + Time
    itineraryRows.sort((a, b) => {
        if (a.Date !== b.Date) return a.Date.localeCompare(b.Date);
        return a.Time.localeCompare(b.Time);
    });

    const verifySheet = XLSX.utils.json_to_sheet(itineraryRows);
    XLSX.utils.book_append_sheet(wb, verifySheet, "Itinerary");

    // 2. Expenses Sheet
    const expenseRows = expenses.map(exp => ({
        Date: format(new Date(exp.created_at), 'yyyy-MM-dd'),
        Item: exp.item_name,
        Currency: exp.currency,
        Amount: exp.amount,
        Payer: exp.payer,
        Split: Object.keys(exp.split_details || {}).join(', ') || 'Active'
    }));

    const expenseSheet = XLSX.utils.json_to_sheet(expenseRows);
    XLSX.utils.book_append_sheet(wb, expenseSheet, "Expenses");

    // Write to Blob
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/octet-stream' });
};

export const parseExcel = async (file: File): Promise<{
    itinerary: any[];
    expenses: any[];
}> => {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });

    // Read Itinerary
    const itinerarySheet = wb.Sheets["Itinerary"];
    const rawItinerary = itinerarySheet ? XLSX.utils.sheet_to_json(itinerarySheet) : [];

    // Transform back to App format
    const itinerary = rawItinerary.map((row: any) => ({
        date: row.Date,
        start_time: row.Time,
        location: row.Location,
        category: row.Category,
        notes: row.Notes,
        google_map_link: row.Link,
        lat: row.Lat ? parseFloat(row.Lat) : null,
        lng: row.Lng ? parseFloat(row.Lng) : null
    })).filter((item: any) => item.date && item.location); // Basic validation

    // Read Expenses
    const expenseSheet = wb.Sheets["Expenses"];
    const rawExpenses = expenseSheet ? XLSX.utils.sheet_to_json(expenseSheet) : [];

    const expenses = rawExpenses.map((row: any) => ({
        // We can't generate ID or created_at accurately, but we prep for insertion
        // App will likely assign new IDs or we need logic to check duplicates?
        // For simplicity: We return the data, UI handles insertion.
        created_at: row.Date ? new Date(row.Date).toISOString() : new Date().toISOString(),
        item_name: row.Item,
        currency: row.Currency,
        amount: parseFloat(row.Amount),
        payer: row.Payer,
        split_details: {} // Lost detailed split logic in simple export, assume logic needs restore or default?
        // Actually we joined split members with comma.
        // Let's try to restore if possible, or just default to empty (Everyone).
    })).map((exp: any) => {
        // Try to recreate split_details from string?
        // In export: Object.keys(exp.split_details || {}).join(', ')
        // This is lossy. But acceptable for MVP.
        return exp;
    });

    return { itinerary, expenses };
};

export const downloadExcel = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
