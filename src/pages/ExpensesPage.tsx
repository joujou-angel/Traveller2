import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Wallet, Calculator } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import type { Expense } from '../features/expenses/types';
import { ExpenseList } from '../features/expenses/components/ExpenseList';
import { AddExpenseModal } from '../features/expenses/components/AddExpenseModal';
import { useTranslation } from 'react-i18next';

type TripConfig = {
    id: number;
    companions: string[];
};

const fetchTripConfig = async (tripId: string): Promise<TripConfig | null> => {
    const { data, error } = await supabase
        .from('trip_config')
        .select('id, companions')
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
    const { t } = useTranslation();
    const { tripId } = useParams();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    // --- Self-Healing: Sync Current User to Companions ---
    const { mutate: updateCompanions } = useMutation({
        mutationFn: async (newCompanions: string[]) => {
            if (!tripConfig?.id) return;
            await supabase.from('trip_config').update({ companions: newCompanions }).eq('id', tripConfig.id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tripConfig', tripId] });
        }
    });

    useEffect(() => {
        if (user && companions.length > 0 && tripId) {
            const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Friend';
            const isListed = companions.some(c => c.toLowerCase() === userName.toLowerCase());

            if (!isListed && tripConfig?.id) {
                // Auto-fix: Add user to companions
                const newCompanions = [...companions, userName];
                updateCompanions(newCompanions);
            }
        }
    }, [user, companions, tripId, tripConfig?.id, updateCompanions]);

    // --- Calculation Logic (Multi-Currency) ---
    const calculateStats = () => {
        // Balances: { Person: { Currency: Amount } }
        const balances: { [person: string]: { [curr: string]: number } } = {};
        const totals: { [curr: string]: number } = {};

        companions.forEach(c => balances[c] = {});

        expenses.forEach((exp: Expense) => {
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


                {/* Always Visible Compact Converter */}
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-line space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">{t('expenses.currencyConverter', 'Currency Converter')}</p>
                    <div className="flex items-center gap-2">
                        <div className="bg-date-selected-bg p-2 rounded-xl text-main-title flex-shrink-0">
                            <Calculator className="w-4 h-4" />
                        </div>
                        <input
                            type="number"
                            value={convAmount}
                            onChange={(e) => setConvAmount(e.target.value)}
                            placeholder="$"
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

            {/* Balances Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm text-gray-800 space-y-4 relative overflow-hidden transition-all hover:shadow-md border border-line">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full -mr-12 -mt-12 pointer-events-none blur-2xl" />
                <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-5 h-5 text-main-title" />
                    <h3 className="font-bold tracking-wide text-gray-700">{t('expenses.netBalances', 'NET BALANCES')}</h3>
                </div>
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-white/40 to-transparent rounded-full -mr-12 -mt-12 pointer-events-none blur-2xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {companions.length > 0 ? companions.map(person => {
                        const personBalances = balances[person] || {};
                        const currencies = Object.keys(personBalances).filter(c => Math.abs(personBalances[c]) > 1);

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
                                    <p className="text-xs text-gray-400 italic">{t('expenses.settled', 'Settled')}</p>
                                )}
                            </div>
                        );
                    }) : (
                        <p className="text-gray-500 text-sm col-span-2">{t('expenses.noCompanions', 'No companions set. Add them in Info page.')}</p>
                    )}
                </div>
            </div>

            {/* Total Stats */}
            <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-right">{t('expenses.totalSpent', 'TOTAL SPENT')}</p>
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
            <ExpenseList expenses={expenses} companions={companions} />

            {/* FAB */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-24 right-6 w-14 h-14 bg-btn text-white rounded-full shadow-lg shadow-gray-200 flex items-center justify-center active:scale-90 transition-all hover:scale-105 z-40"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Add Expense Modal */}
            <AddExpenseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tripId={tripId!}
                companions={companions}
            />
        </div>
    );
};

export default ExpensesPage;
