import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const JoinTripPage = () => {
    const { tripId } = useParams();
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const [status, setStatus] = useState<'validating' | 'joining' | 'success' | 'error'>('validating');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const joinTrip = async () => {
            if (!tripId) {
                setStatus('error');
                setErrorMessage('Invalid Invite Link');
                return;
            }

            // 1. Wait for Auth to be ready
            if (loading) return;

            // 2. If not logged in, redirect to login with return URL
            if (!user) {
                // Store the full join URL to return to after login
                const returnUrl = `/join/${tripId}`;
                sessionStorage.setItem('returnUrl', returnUrl);
                navigate('/login?message=Please logic to join the trip');
                return;
            }

            setStatus('joining');

            try {
                // 3. Insert into trip_members
                // We use upsert or insert. Insert will fail if duplicate, which is fine (already joined).
                // Or we can check existence first. Let's try simple insert and catch duplicate error.

                // First, check if trip exists (optional, but good for UX)
                const { error: tripError } = await supabase
                    .from('trips')
                    .select('name')
                    .eq('id', tripId)
                    .single();

                if (tripError && tripError.code !== 'PGRST116') {
                    // If error is not "not found" (maybe RLS blocks viewing before joining?)
                    // Actually, RLS blocks viewing non-joined trips. So this check might fail for valid invites!
                    // We should skip this check rely on the insert policy.
                    console.log("Cannot view trip yet, proceeding to join...");
                }

                // Attempt to Join
                const { error: joinError } = await supabase
                    .from('trip_members')
                    .insert({
                        trip_id: parseInt(tripId), // Ensure ID type matches (bigint)
                        user_id: user.id
                    });

                if (joinError) {
                    // Unique violation code is 23505
                    if (joinError.code === '23505') {
                        toast.info('You are already a member of this trip!');
                        setStatus('success');
                        setTimeout(() => navigate(`/trips/${tripId}/itinerary`), 1000);
                        return;
                    }
                    throw joinError;
                }

                setStatus('success');
                toast.success('Successfully joined the trip!');
                setTimeout(() => navigate(`/trips/${tripId}/itinerary`), 1500);

            } catch (err: any) {
                console.error('Join Error:', err);
                setStatus('error');
                setErrorMessage(err.message || 'Failed to join trip');
            }
        };

        joinTrip();
    }, [tripId, user, loading, navigate]);

    return (
        <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full space-y-6">

                {/* Status Icons */}
                <div className="flex justify-center">
                    {(status === 'validating' || status === 'joining') && (
                        <div className="p-4 bg-blue-50 rounded-full animate-pulse">
                            <Loader2 className="w-8 h-8 text-sub-title animate-spin" />
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="p-4 bg-green-50 rounded-full animate-bounce">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="p-4 bg-red-50 rounded-full">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                    )}
                </div>

                {/* Status Text */}
                <div>
                    {(status === 'validating' || status === 'joining') && (
                        <>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">Joining Trip...</h2>
                            <p className="text-gray-500 text-sm">Please wait while we add you to the group.</p>
                        </>
                    )}
                    {status === 'success' && (
                        <>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">Welcome Aboard!</h2>
                            <p className="text-gray-500 text-sm">Redirecting to itinerary...</p>
                        </>
                    )}
                    {status === 'error' && (
                        <>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">Unable to Join</h2>
                            <p className="text-red-500 text-sm">{errorMessage}</p>
                            <button
                                onClick={() => navigate('/')}
                                className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
                            >
                                Go Home
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JoinTripPage;
