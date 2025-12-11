import { useAuth } from '../features/auth/AuthContext';
import { Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const LoginPage = () => {
    const { t } = useTranslation();
    const { signInWithGoogle, user, loading } = useAuth();

    const handleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (error: any) {
            console.error(error);
            toast.error(t('login.failed', 'Login Failed'), {
                description: error.message || t('login.googleError', 'Unable to sign in with Google.')
            });
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-sub-title" />
            </div>
        );
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('login.welcome', 'Welcome Back')}</h1>
                <p className="text-gray-500 mb-8 text-sm">{t('login.subtitle', 'Sign in to sync your travel plans')}</p>

                <button
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    {t('login.signInGoogle', 'Sign in with Google')}
                </button>
            </div>
        </div>
    );
};

export default LoginPage;
