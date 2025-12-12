import { X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SubscriptionModal = ({ isOpen, onClose }: SubscriptionModalProps) => {
    const { t } = useTranslation();

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
                    <div className="border-2 border-gray-100 rounded-2xl p-4 hover:border-yellow-400 transition-all cursor-pointer group bg-white">
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
                    <div className="border-2 border-gray-900 rounded-2xl p-4 bg-gray-900 text-white relative overflow-hidden cursor-pointer group shadow-lg">
                        <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[10px] items-center px-2 py-1 rounded-bl-xl font-bold">
                            RECOMMENDED
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold flex items-center gap-2">
                                👑 {t('subscription.pro', 'Pro Membership')}
                            </span>
                            <span className="text-lg font-bold">$29<span className="text-xs font-normal text-gray-400">/yr</span></span>
                        </div>
                        <ul className="text-xs text-gray-300 space-y-1 my-3">
                            <li className="flex items-center gap-1"><Check className="w-3 h-3 text-yellow-400" /> Unlimited Trips</li>
                            <li className="flex items-center gap-1"><Check className="w-3 h-3 text-yellow-400" /> Smart Export (Notion/Excel)</li>
                            <li className="flex items-center gap-1"><Check className="w-3 h-3 text-yellow-400" /> Premium Support</li>
                        </ul>
                        <button className="w-full mt-1 py-2 bg-white text-black rounded-xl font-bold text-sm hover:bg-yellow-400 transition-colors">
                            {t('subscription.upgrade', 'Upgrade to Pro')}
                        </button>
                    </div>
                </div>

                <p className="text-xs text-center text-gray-400">
                    Secure payment via Lemon Squeezy. <br /> Can cancel anytime.
                </p>
            </div>
        </div>
    );
};
