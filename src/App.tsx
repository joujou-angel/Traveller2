import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import ItineraryPage from './pages/ItineraryPage'
import ExpensesPage from './pages/ExpensesPage'
import WeatherPage from './pages/WeatherPage'
import InfoPage from './pages/InfoPage'
import TripSetupPage from './pages/TripSetupPage'
import LoginPage from './pages/LoginPage'
import TripListPage from './pages/TripListPage'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Toaster } from 'sonner'
import { Loader2 } from 'lucide-react'
import JoinTripPage from './pages/JoinTripPage'

const queryClient = new QueryClient()

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-macaron-blue" />
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
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" richColors />
      <AuthProvider>
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
    </QueryClientProvider>
  )
}

export default App
