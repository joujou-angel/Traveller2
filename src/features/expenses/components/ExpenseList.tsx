import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, Trash2, DollarSign, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';
import type { Expense } from '../types';

interface ExpenseListProps {
    expenses: Expense[];
    companions: string[];
}

export const ExpenseList = ({ expenses, companions }: ExpenseListProps) => {
    const { t } = useTranslation();
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
                            {format(new Date(date), 'MM/dd')}
                        </h3>
                        {items.map((expense: Expense) => (
                            <div key={expense.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-btn/10 flex items-center justify-center text-btn">
                                        <Receipt className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">{expense.item_name}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            {/* Payer Avatar */}
                                            <div className="w-6 h-6 rounded-full bg-btn text-white text-[10px] font-bold flex items-center justify-center border-2 border-white ring-1 ring-gray-50 uppercase shadow-sm shrink-0" title={`${t('expenses.paidBy')} ${expense.payer}`}>
                                                {expense.payer.charAt(0)}
                                            </div>

                                            <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />

                                            {/* Split Members */}
                                            {(() => {
                                                const splitMembers = Object.keys(expense.split_details || {});
                                                const isEveryone = companions.length > 0 && splitMembers.length >= companions.length;

                                                if (isEveryone) {
                                                    return <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{t('expenses.everyone', '所有人')}</span>;
                                                }
                                                return (
                                                    <div className="flex -space-x-1.5">
                                                        {splitMembers.map(m => (
                                                            <div key={m} className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-[9px] font-bold flex items-center justify-center border-2 border-white ring-1 ring-gray-50 uppercase shadow-sm" title={m}>
                                                                {m.charAt(0)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <span className="block font-bold text-gray-800">
                                            <span className="text-xs text-gray-500 font-bold mr-1">{expense.currency}</span>
                                            {Number(expense.amount).toLocaleString()}
                                        </span>
                                        <span className="text-[10px] font-medium text-gray-400">
                                            {/* Spacer to keep height consistent if needed, or just empty */}
                                        </span>
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
                    <p>{t('expenses.noExpenses', 'No expenses yet')}</p>
                </div>
            )}
        </div>
    );
};
