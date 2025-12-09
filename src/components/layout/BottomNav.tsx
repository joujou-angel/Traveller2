
import { Link, useLocation, useParams } from 'react-router-dom'
import { CalendarDays, Wallet, CloudSun, Info, Home } from 'lucide-react'
import { cn } from '../../lib/utils'

const BottomNav = () => {
    const location = useLocation()
    const { tripId } = useParams()

    const tabs = [
        { name: 'Trips', path: '/', icon: Home },
        { name: 'Itinerary', path: `/trips/${tripId}/itinerary`, icon: CalendarDays },
        { name: 'Expenses', path: `/trips/${tripId}/expenses`, icon: Wallet },
        { name: 'Weather', path: `/trips/${tripId}/weather`, icon: CloudSun },
        { name: 'Info', path: `/trips/${tripId}/info`, icon: Info },
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-50">
            <div className="flex justify-around items-center h-16">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = location.pathname.includes(tab.path) || (tab.name === 'Itinerary' && location.pathname === `/trips/${tripId}`)

                    return (
                        <Link
                            key={tab.name}
                            to={tab.path}
                            className="flex flex-col items-center justify-center w-full h-full space-y-1"
                        >
                            <div
                                className={cn(
                                    "p-1.5 rounded-xl transition-all duration-300",
                                    isActive
                                        ? "bg-macaron-blue/30 scale-110 -translate-y-1"
                                        : "bg-transparent"
                                )}
                            >
                                <Icon
                                    size={24}
                                    className={cn(
                                        "transition-colors",
                                        isActive ? "text-gray-900" : "text-gray-400"
                                    )}
                                />
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium transition-colors",
                                "text-gray-400"
                            )}>
                                {tab.name}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}

export default BottomNav
