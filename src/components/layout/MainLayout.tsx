
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

const MainLayout = () => {
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
