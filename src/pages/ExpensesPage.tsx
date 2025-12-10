import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Wallet, Receipt, Trash2, X, DollarSign, Calculator, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type TripConfig = {
    companions: string[];
};

type Expense = {
    id: number;
    created_at: string;
    item_name: string;
    amount: number;
    currency: string;
    payer: string;
    split_details: any;
};

const SUPPORTED_CURRENCIES = ['TWD', 'JPY', 'KRW', 'USD', 'CNY', 'THB', 'VND'];

const fetchTripConfig = async (tripId: string): Promise<TripConfig | null> => {
    const { data, error } = await supabase
        .from('trip_config')
        .select('companions')
        .eq('trip_id', tripId)
        .single();
    if (error) return null;
    return data;
};

const fetchExpenses = async (tripId: string): Promise<Expense[]> => {
    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

const fetchTripMetadata = async (tripId: string) => {
    const { data } = await supabase.from('trips').select('user_id').eq('id', tripId).single();
    return data;
};

const ExpensesPage = () => {
    const { tripId } = useParams();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Add Expense Form State
    const [itemName, setItemName] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('TWD');
    const [payer, setPayer] = useState('');
    const [involved, setInvolved] = useState<string[]>([]);

    // Currency Converter State (Always Visible)
    const [convAmount, setConvAmount] = useState('');
    const [convRate, setConvRate] = useState('0.21');

    const calculatedTwd = convAmount ? Math.round(parseFloat(convAmount) * parseFloat(convRate)) : 0;

    const { data: tripConfig } = useQuery({
        queryKey: ['tripConfig', tripId],
        queryFn: () => fetchTripConfig(tripId!),
        enabled: !!tripId
    });

    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ['expenses', tripId],
        queryFn: () => fetchExpenses(tripId!),
        enabled: !!tripId
    });

    const { data: tripMetadata } = useQuery({
        queryKey: ['tripMetadata', tripId],
        queryFn: () => fetchTripMetadata(tripId!),
        enabled: !!tripId
    });

    let companions = tripConfig?.companions || [];
    // Default to owner if empty (Mirroring InfoPage logic)
    if (companions.length === 0 && tripMetadata?.user_id && user?.id && tripMetadata.user_id === user.id) {
        const ownerName = user.user_metadata?.name || user.email?.split('@')[0] || 'Owner';
        companions = [ownerName];
    }

    // Initialize/Reset Form
    const openModal = () => {
        setItemName('');
        setAmount('');
        setCurrency('TWD');
        setPayer(companions[0] || '');
        setInvolved([...companions]);
        setIsModalOpen(true);
    };

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
                trip_id: tripId, // Add trip_id
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setIsModalOpen(false);
            toast.success('記帳成功！');
        },
        onError: (err: any) => {
            toast.error('新增失敗: ' + err.message);
        }
    });

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

    // --- Calculation Logic (Multi-Currency) ---
    const calculateStats = () => {
        // Balances: { Person: { Currency: Amount } }
        // Positive = Owes money, Negative = Owes others (Wait, normally + means you paid so people owe you)
        // Let's stick to: Positive = People owe ME (I paid). Negative = I OWE others (I consumed).
        const balances: { [person: string]: { [curr: string]: number } } = {};
        const totals: { [curr: string]: number } = {};

        companions.forEach(c => balances[c] = {});

        expenses.forEach(exp => {
            const curr = exp.currency;
            const amt = Number(exp.amount);

            // Update Totals
            if (!totals[curr]) totals[curr] = 0;
            totals[curr] += amt;

            // Update Payer Balance (They paid, so they are +)
            if (balances[exp.payer]) {
                if (!balances[exp.payer][curr]) balances[exp.payer][curr] = 0;
                balances[exp.payer][curr] += amt;
            }

            // Update Consumers Balance (They consumed, so they are -)
            if (exp.split_details) {
                Object.entries(exp.split_details).forEach(([person, share]: [string, any]) => {
                    if (balances[person]) {
                        if (!balances[person][curr]) balances[person][curr] = 0;
                        balances[person][curr] -= Number(share);
                    }
                });
            }
        });

        return { balances, totals };
    };

    const { balances, totals } = calculateStats();

    // Group expenses by date
    const groupedExpenses = expenses.reduce((groups: any, expense) => {
        const date = format(new Date(expense.created_at), 'yyyy-MM-dd');
        if (!groups[date]) groups[date] = [];
        groups[date].push(expense);
        return groups;
    }, {});


    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-sub-title" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 pb-32 animate-fade-in">
            {/* Header & Converter */}
            <header className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">共用錢包</h1>
                        <p className="text-gray-400 text-sm mt-1">Shared Wallet</p>
                    </div>
                </div>

                {/* Always Visible Compact Converter */}
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-line space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="bg-date-selected-bg p-2 rounded-xl text-main-title flex-shrink-0">
                            <Calculator className="w-4 h-4" />
                        </div>
                        <input
                            type="number"
                            value={convAmount}
                            onChange={(e) => setConvAmount(e.target.value)}
                            placeholder="Amount"
                            className="flex-1 w-full min-w-[80px] p-2 bg-gray-50 rounded-lg font-bold text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-btn text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-gray-300 text-xs">x</span>
                        <input
                            type="number"
                            value={convRate}
                            onChange={(e) => setConvRate(e.target.value)}
                            placeholder="Rate"
                            className="w-20 p-2 bg-gray-50 rounded-lg font-bold text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-btn text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>

                    {/* Result Row */}
                    <div className="bg-date-selected-bg px-3 py-2 rounded-lg flex items-center">
                        <span className="text-xs font-bold text-main-title mr-2">TWD</span>
                        <span className="font-bold text-gray-800 text-lg">${calculatedTwd.toLocaleString()}</span>
                    </div>
                </div>


            </header>

            {/* Balances Card - Lightened Multi-Currency */}
            <div className="bg-white rounded-3xl p-6 shadow-sm text-gray-800 space-y-4 relative overflow-hidden transition-all hover:shadow-md border border-line">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full -mr-12 -mt-12 pointer-events-none blur-2xl" />
                <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-5 h-5 text-main-title" />
                    <h3 className="font-bold tracking-wide text-gray-700">NET BALANCES</h3>
                </div>
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-white/40 to-transparent rounded-full -mr-12 -mt-12 pointer-events-none blur-2xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {companions.length > 0 ? companions.map(person => {
                        const personBalances = balances[person] || {};
                        const currencies = Object.keys(personBalances).filter(c => Math.abs(personBalances[c]) > 1); // Filter out tiny rounded zero balances

                        return (
                            <div key={person} className="bg-white/60 rounded-2xl p-3 backdrop-blur-sm border border-white/50 shadow-sm">
                                <p className="text-xs text-gray-500 font-bold uppercase mb-2">{person}</p>
                                {currencies.length > 0 ? (
                                    currencies.map(curr => {
                                        const bal = Math.round(personBalances[curr]);
                                        const isOwed = bal > 0;
                                        const isDebt = bal < 0;
                                        return (
                                            <div key={curr} className="flex justify-between items-center mb-1 last:mb-0">
                                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{curr}</span>
                                                <div className="text-right">
                                                    <span className={`text-sm font-bold ${isOwed ? 'text-positive' : isDebt ? 'text-negative' : 'text-gray-400'}`}>
                                                        {bal > 0 ? '+' : ''}{bal.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <p className="text-xs text-gray-400 italic">Settled</p>
                                )}
                            </div>
                        );
                    }) : (
                        <p className="text-gray-500 text-sm col-span-2">No companions set. Add them in Info page.</p>
                    )}
                </div>
            </div>

            {/* Total Stats */}
            <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-right">TOTAL SPENT</p>
                <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
                    {Object.keys(totals).length > 0 ? (
                        Object.entries(totals).map(([curr, amt]) => (
                            <div key={curr} className="flex items-baseline">
                                <span className="text-sm text-gray-400 mr-1.5 font-bold">{curr}</span>
                                <span className="text-2xl font-bold text-gray-800">{amt.toLocaleString()}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-2xl font-bold text-gray-300">$0</p>
                    )}
                </div>
            </div>

            {/* Expenses List */}
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

            {/* FAB */}
            <button
                onClick={openModal}
                className="fixed bottom-24 right-6 w-14 h-14 bg-btn text-white rounded-full shadow-lg shadow-gray-200 flex items-center justify-center active:scale-90 transition-all hover:scale-105 z-40"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Add Expense Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                    <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto flex flex-col">
                        <div className="flex justify-between items-center mb-6 flex-shrink-0">
                            <h2 className="text-xl font-bold text-gray-800">Add Expense</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 flex-1 overflow-y-auto pb-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Item Name</label>
                                <input
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    placeholder="Dinner, Taxi, etc."
                                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Currency</label>
                                    <select
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value)}
                                        className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-black"
                                    >
                                        {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full p-4 pl-8 bg-gray-50 rounded-2xl font-bold text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Paid By</label>
                                    <select
                                        value={payer}
                                        onChange={(e) => setPayer(e.target.value)}
                                        className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-black"
                                    >
                                        {companions.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Split With</label>
                                    <div className="p-2 bg-gray-50 rounded-2xl min-h-[58px] flex items-center">
                                        <p className="text-sm font-bold text-gray-600 px-2">
                                            {involved.length === companions.length ? 'Everyone' : `${involved.length} People`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Split Details</p>
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
            )}
        </div>
    );
};

export default ExpensesPage;
