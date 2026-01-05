'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Ambulance } from '@/types/admin'

// Fix for default marker icons in Leaflet with Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png'
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png'
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'

const customIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

interface LiveMapProps {
    ambulances: Ambulance[]
    patients: any[]
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap()
    useEffect(() => {
        map.flyTo(center, 13)
    }, [center, map])
    return null
}

export default function LiveMap({ ambulances, patients }: LiveMapProps) {
    const [mounted, setMounted] = useState(false)
    const defaultCenter: [number, number] = [19.0760, 72.8777] // Mumbai

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return <div className="h-full w-full bg-muted/20 animate-pulse" />

    return (
        <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {ambulances.map((amb) => (
                amb.current_lat && amb.current_lng && (
                    <Marker
                        key={amb.id}
                        position={[amb.current_lat, amb.current_lng]}
                        icon={customIcon}
                    >
                        <Popup>
                            <div className="font-sans">
                                <h3 className="font-bold">{amb.vehicle_number}</h3>
                                <p>{amb.driver_name}</p>
                                <span className={`text-xs px-2 py-1 rounded-full ${amb.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {amb.status}
                                </span>
                            </div>
                        </Popup>
                    </Marker>
                )
            ))}
            <MapUpdater center={defaultCenter} />
        </MapContainer>
    )
}
