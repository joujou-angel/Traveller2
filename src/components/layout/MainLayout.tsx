
import { Outlet, useParams } from 'react-router-dom'
import BottomNav from './BottomNav'
import { useTripWeather } from '../../hooks/useTripWeather'

const MainLayout = () => {
    const { tripId } = useParams();

    // Prefetch weather data in background when user enters a trip
    useTripWeather(tripId);

    return (
        <div className="min-h-screen bg-page-bg">
            {/* Content Area */}
            <main className="pb-24 pt-safe safe-x">
                <Outlet />
            </main>

            {/* Navigation */}
            <BottomNav />
        </div>
    )
}

export default MainLayout
