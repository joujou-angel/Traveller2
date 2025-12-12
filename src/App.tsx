import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import ItineraryPage from './pages/ItineraryPage'
import ExpensesPage from './pages/ExpensesPage'
import WeatherPage from './pages/WeatherPage'
import InfoPage from './pages/InfoPage'
import TripSetupPage from './pages/TripSetupPage'
import LoginPage from './pages/LoginPage'
import TripListPage from './pages/TripListPage'
import JoinTripPage from './pages/JoinTripPage'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import { Toaster } from 'sonner'
import { Loader2 } from 'lucide-react'
import { OfflineIndicator } from './components/ui/OfflineIndicator'

// 1. Configure QueryClient with Offline-friendly settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 Hours (Keep cache for offline usage)
      staleTime: 1000 * 60 * 5,    // 5 Minutes (Fetch less often)
      retry: 1,
    },
  },
})

// 2. Create Persister (localStorage)
const persister = createSyncStoragePersister({
  storage: window.localStorage,
})

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sub-title" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
      onSuccess={() => {
        // Optional: resumed from cache
        console.log("Restored from cache");
      }}
    >
      <Toaster position="top-center" richColors />
      <AuthProvider>
        <OfflineIndicator />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/join/:tripId" element={<JoinTripPage />} />

            <Route element={<ProtectedRoute />}>
              {/* Hub: Trip List */}
              <Route path="/" element={<TripListPage />} />

              {/* Spoke: Specific Trip Context */}
              <Route path="/trips/:tripId" element={<MainLayout />}>
                <Route index element={<Navigate to="itinerary" replace />} />
                <Route path="itinerary" element={<ItineraryPage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="weather" element={<WeatherPage />} />
                <Route path="info" element={<InfoPage />} />
              </Route>

              {/* Setup (Might need refactoring later to be created from Hub) */}
              <Route path="/setup" element={<TripSetupPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </PersistQueryClientProvider>
  )
}

export default App
