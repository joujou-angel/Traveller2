export type Expense = {
    id: number;
    created_at: string;
    item_name: string;
    amount: number;
    currency: string;
    payer: string;
    split_details: any;
    trip_id: string; // Ensure this is tracked
};
