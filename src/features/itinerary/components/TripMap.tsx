import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix Leaflet default icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface TripMapProps {
    items: any[];
}

function MapUpdater({ items }: { items: any[] }) {
    const map = useMap();

    useEffect(() => {
        if (items.length > 0) {
            const bounds = L.latLngBounds(items.map(i => [i.lat, i.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [items, map]);

    return null;
}

export default function TripMap({ items }: TripMapProps) {
    // Filter items ensuring they have valid coordinates
    const validItems = items.filter(item => item.lat && item.lng);

    if (validItems.length === 0) {
        return (
            <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                No locations to display
            </div>
        );
    }

    // Default center (Tokyo) if no items, but bounds will override
    const center = [35.6762, 139.6503] as L.LatLngExpression;

    return (
        <MapContainer center={center} zoom={13} style={{ height: '300px', width: '100%', borderRadius: '1rem', zIndex: 0 }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {validItems.map((item) => (
                <Marker key={item.id} position={[item.lat, item.lng]}>
                    <Popup>
                        <div className="font-bold">{item.location}</div>
                        <div className="text-xs text-gray-600">{item.start_time} - {item.category}</div>
                    </Popup>
                </Marker>
            ))}
            <MapUpdater items={validItems} />
        </MapContainer>
    );
}
