import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from 'react-i18next';


const SUPPORTED_CURRENCIES = ['TWD', 'JPY', 'KRW', 'USD', 'CNY', 'THB', 'VND'];

interface AddExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    tripId: string;
    companions: string[];
}

export const AddExpenseModal = ({ isOpen, onClose, tripId, companions }: AddExpenseModalProps) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const [itemName, setItemName] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('TWD');
    const [payer, setPayer] = useState('');
    const [involved, setInvolved] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Reset form when opened
            setItemName('');
            setAmount('');
            setCurrency('TWD');
            setPayer(companions[0] || '');
            setInvolved([...companions]);
        }
    }, [isOpen, companions]);

    const addExpenseMutation = useMutation({
        mutationFn: async () => {
            if (!itemName || !amount || !payer) throw new Error("Missing required fields");

            const numAmount = parseFloat(amount);
            const splitAmount = numAmount / involved.length;
            const splitDetails = involved.reduce((acc: any, person) => {
                acc[person] = splitAmount;
                return acc;
            }, {});

            const { error } = await supabase.from('expenses').insert({
                item_name: itemName,
                amount: numAmount,
                payer: payer,
                split_details: splitDetails,
                currency: currency,
                trip_id: tripId,
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            toast.success(t('expenses.success', 'Expense added!'));
            onClose();
        },
        onError: (err: any) => {
            toast.error(t('expenses.error', 'Failed to add') + ': ' + err.message);
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full sm:max-w-md rounded-3xl p-6 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-800">{t('expenses.addExpenseTitle', 'Add Expense')}</h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto pb-4">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">{t('expenses.itemName', 'Item Name')}</label>
                        <input
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            placeholder={t('expenses.itemNamePlaceholder', 'Dinner, Taxi, etc.')}
                            className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:ring-inset"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">{t('expenses.currency', 'Currency')}</label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-black focus:ring-inset"
                            >
                                {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">{t('expenses.amount', 'Amount')}</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full p-4 pl-8 bg-gray-50 rounded-2xl font-bold text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:ring-inset [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">{t('expenses.paidBy', 'Paid By')}</label>
                            <select
                                value={payer}
                                onChange={(e) => setPayer(e.target.value)}
                                className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-black focus:ring-inset"
                            >
                                {companions.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">{t('expenses.splitWith', 'Split With')}</label>
                            <div className="p-2 bg-gray-50 rounded-2xl min-h-[58px] flex items-center">
                                <p className="text-sm font-bold text-gray-600 px-2">
                                    {involved.length === companions.length ? t('expenses.everyone', 'Everyone') : t('expenses.people', '{{count}} People', { count: involved.length })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-2">{t('expenses.splitDetails', 'Split Details')}</p>
                        <div className="flex flex-wrap gap-2">
                            {companions.map(c => (
                                <button
                                    key={c}
                                    onClick={() => {
                                        if (involved.includes(c)) {
                                            if (involved.length > 1) setInvolved(involved.filter(p => p !== c));
                                        } else {
                                            setInvolved([...involved, c]);
                                        }
                                    }}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${involved.includes(c)
                                        ? 'bg-btn text-white border-btn'
                                        : 'bg-white text-gray-400 border-gray-200'
                                        }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2 sticky bottom-0 bg-white pb-6 safe-area-bottom">
                        <button
                            onClick={() => addExpenseMutation.mutate()}
                            disabled={addExpenseMutation.isPending || !amount || !itemName}
                            className="w-full py-4 bg-btn text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
                        >
                            {addExpenseMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : <Save className="w-6 h-6 mx-auto" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
