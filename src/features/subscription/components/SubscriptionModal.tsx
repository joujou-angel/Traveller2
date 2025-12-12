import { X, Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../features/auth/AuthContext';
import { toast } from 'sonner';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SubscriptionModal = ({ isOpen, onClose }: SubscriptionModalProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isProcessing, setIsProcessing] = useState(false);

    // Mock Upgrade Mutation
    const upgradeMutation = useMutation({
        mutationFn: async () => {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            if (!user) throw new Error('No user');

            // Direct DB update for Mock/Test environment
            // Using upsert to handle cases where profile row might be missing for some reason
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    subscription_status: 'pro',
                    subscription_tier: 'pro_monthly'
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            toast.success('🎉 Upgrade Successful! Welcome to Pro.');
            onClose();
        },
        onError: (err) => {
            console.error(err);
            toast.error('Payment failed (Mock)');
        }
    });

    const handleMockPayment = () => {
        if (confirm('⚠️ TEST MODE: This will directly upgrade your account to PRO for free. Proceed?')) {
            upgradeMutation.mutate();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Decorative Background */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-yellow-50 to-orange-50 -z-10 rounded-t-3xl" />

                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">{t('subscription.title', 'Unlock Your Adventure')}</h3>
                        <p className="text-sm text-gray-500 mt-1">{t('subscription.subtitle', 'You reached the limit of free active trips.')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100/50 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="space-y-4 pt-2">
                    {/* Option 1: Trip Pass */}
                    <div className="border-2 border-gray-100 rounded-2xl p-4 hover:border-yellow-400 transition-all cursor-pointer group bg-white opacity-50 pointer-events-none relative">
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                            <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded">{t('subscription.comingSoon', 'Coming Soon')}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-gray-800 flex items-center gap-2">
                                🎫 {t('subscription.tripPass', 'Single Trip Pass')}
                            </span>
                            <span className="text-lg font-bold text-gray-900">$2.99</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            {t('subscription.tripPassDesc', 'Unlock 1 additional trip. Perfect for occasional travelers.')}
                        </p>
                        <button className="w-full mt-3 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm group-hover:bg-yellow-400 group-hover:text-black transition-colors">
                            {t('subscription.buyNow', 'Buy Now')}
                        </button>
                    </div>

                    {/* Option 2: Pro Subscription */}
                    <div
                        onClick={handleMockPayment}
                        className="border-2 border-gray-900 rounded-2xl p-4 bg-gray-900 text-white relative overflow-hidden cursor-pointer group shadow-lg hover:scale-[1.02] transition-transform"
                    >
                        <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[10px] items-center px-2 py-1 rounded-bl-xl font-bold">
                            {t('subscription.recommended', 'RECOMMENDED')}
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold flex items-center gap-2">
                                👑 {t('subscription.pro', 'Pro Membership')}
                            </span>
                            <span className="text-lg font-bold">$29<span className="text-xs font-normal text-gray-400">/yr</span></span>
                        </div>
                        <ul className="text-xs text-gray-300 space-y-1 my-3">
                            <li className="flex items-center gap-1"><Check className="w-3 h-3 text-yellow-400" /> {t('subscription.unlimitedTrips', 'Unlimited Trips')}</li>
                            <li className="flex items-center gap-1"><Check className="w-3 h-3 text-yellow-400" /> {t('subscription.smartExport', 'Smart Export')}</li>
                            <li className="flex items-center gap-1"><Check className="w-3 h-3 text-yellow-400" /> {t('subscription.premiumSupport', 'Premium Support')}</li>
                        </ul>
                        <button
                            disabled={upgradeMutation.isPending}
                            className="w-full mt-1 py-2 bg-white text-black rounded-xl font-bold text-sm hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
                        >
                            {upgradeMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                t('subscription.upgrade', 'Upgrade to Pro')
                            )}
                        </button>
                    </div>
                </div>

                <p className="text-xs text-center text-gray-400">
                    Secure payment via Lemon Squeezy. <br /> Can cancel anytime.
                    <span className="block mt-1 text-orange-400 font-mono text-[10px]">{t('subscription.mockPaymentActive', '(Mock Payment Mode Active)')}</span>
                </p>
            </div>
        </div>
    );
};
