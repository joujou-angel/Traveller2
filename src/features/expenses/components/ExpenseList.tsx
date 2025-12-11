import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, Trash2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import type { Expense } from '../types';

interface ExpenseListProps {
    expenses: Expense[];
}

export const ExpenseList = ({ expenses }: ExpenseListProps) => {
    const queryClient = useQueryClient();

    // Group expenses by date
    const groupedExpenses = expenses.reduce((groups: any, expense) => {
        const date = format(new Date(expense.created_at), 'yyyy-MM-dd');
        if (!groups[date]) groups[date] = [];
        groups[date].push(expense);
        return groups;
    }, {});

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            toast.success('刪除成功');
        },
        onError: (err: any) => {
            toast.error('刪除失敗: ' + err.message);
        }
    });

    return (
        <div className="space-y-6">
            {Object.keys(groupedExpenses).length > 0 ? (
                Object.entries(groupedExpenses).map(([date, items]: [string, any]) => (
                    <div key={date} className="space-y-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                            {format(new Date(date), 'MMM d, yyyy')}
                        </h3>
                        {items.map((expense: Expense) => (
                            <div key={expense.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-btn/10 flex items-center justify-center text-btn">
                                        <Receipt className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">{expense.item_name}</p>
                                        <p className="text-xs text-gray-400 font-medium">
                                            Paid by <span className="text-gray-600 font-bold">{expense.payer}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <span className="block font-bold text-gray-800">{Number(expense.amount).toLocaleString()}</span>
                                        <span className="text-[10px] font-bold text-gray-400">{expense.currency}</span>
                                    </div>
                                    <button
                                        onClick={() => deleteMutation.mutate(expense.id)}
                                        className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-full transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ))
            ) : (
                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No expenses yet</p>
                </div>
            )}
        </div>
    );
};
