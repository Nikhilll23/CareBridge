'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'
import { Loader2 } from 'lucide-react'

// Dynamically import Leaflet components with SSR disabled
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
)

export interface AmbulanceLocation {
  id: string
  name: string
  lat: number
  lng: number
  status: 'available' | 'busy' | 'offline'
  distance?: number // in km
}

interface PatientMapProps {
  patientLat: number
  patientLng: number
  patientName: string
  ambulances: AmbulanceLocation[]
}

export function PatientMap({
  patientLat,
  patientLng,
  patientName,
  ambulances,
}: PatientMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [leafletReady, setLeafletReady] = useState(false)
  const [currentPos, setCurrentPos] = useState({ lat: patientLat, lng: patientLng })
  const [patientIcon, setPatientIcon] = useState<any>(null)
  const [ambulanceIcon, setAmbulanceIcon] = useState<any>(null)

  // Ensure we're on the client side and get location
  useEffect(() => {
    setIsClient(true)
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentPos({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          })
        },
        (err) => console.warn('Geolocation denied, using default', err)
      )
    }
  }, [])

  // Load Leaflet and create custom icons
  useEffect(() => {
    if (isClient) {
      import('leaflet').then((L) => {
        // Fix for default marker icons in webpack
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: '/leaflet/marker-icon-2x.png',
          iconUrl: '/leaflet/marker-icon.png',
          shadowUrl: '/leaflet/marker-shadow.png',
        })

        // Create custom patient icon (red)
        const patientMarker = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              background-color: #ef4444;
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">
              <div style="
                transform: rotate(45deg);
                margin-top: 3px;
                margin-left: 6px;
                color: white;
                font-size: 16px;
                font-weight: bold;
              ">🏥</div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        })

        // Create custom ambulance icon (blue)
        const ambulanceMarker = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              background-color: #3b82f6;
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">
              <div style="
                transform: rotate(45deg);
                margin-top: 3px;
                margin-left: 6px;
                color: white;
                font-size: 16px;
                font-weight: bold;
              ">🚑</div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        })

        setPatientIcon(patientMarker)
        setAmbulanceIcon(ambulanceMarker)
        setLeafletReady(true)
      })
    }
  }, [isClient])

  // Find nearest ambulance
  const nearestAmbulance = ambulances.length > 0
    ? ambulances.reduce((nearest, current) => {
      const nearestDist = nearest.distance || Infinity
      const currentDist = current.distance || Infinity
      return currentDist < nearestDist ? current : nearest
    })
    : null

  if (!isClient || !leafletReady) {
    return (
      <div className="flex items-center justify-center h-125 bg-muted rounded-lg">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[500px] rounded-lg overflow-hidden border border-border shadow-lg">

      {/* Name Overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-background/95 backdrop-blur px-4 py-2 rounded-full shadow-md border border-border font-semibold text-sm flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        {patientName}&apos;s Location
      </div>

      <MapContainer
        key="patient-live-map"
        center={[currentPos.lat || 28.6139, currentPos.lng || 77.2090]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Patient Marker */}
        <Marker position={[currentPos.lat, currentPos.lng]} icon={patientIcon}>
          <Popup>
            <div className="text-center">
              <strong className="text-red-600">Patient Location</strong>
              <p className="text-sm mt-1">{patientName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {currentPos.lat.toFixed(4)}, {currentPos.lng.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Ambulance Markers */}
        {ambulances.map((ambulance) => (
          <Marker
            key={ambulance.id}
            position={[ambulance.lat, ambulance.lng]}
            icon={ambulanceIcon}
          >
            <Popup>
              <div className="text-center">
                <strong className="text-blue-600">{ambulance.name}</strong>
                <p className="text-xs mt-1">
                  Status:{' '}
                  <span
                    className={`font-semibold ${ambulance.status === 'available'
                      ? 'text-green-600 dark:text-green-400'
                      : ambulance.status === 'busy'
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-muted-foreground'
                      }`}
                  >
                    {ambulance.status.toUpperCase()}
                  </span>
                </p>
                {ambulance.distance && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Distance: {ambulance.distance.toFixed(2)} km
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route line to nearest ambulance */}
        {nearestAmbulance && (
          <Polyline
            positions={[
              [currentPos.lat, currentPos.lng],
              [nearestAmbulance.lat, nearestAmbulance.lng],
            ]}
            color="#3b82f6"
            weight={3}
            opacity={0.7}
            dashArray="10, 10"
          />
        )}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-1000 border border-border">
        <div className="text-xs font-semibold mb-2">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Patient</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Ambulance</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-blue-500"></div>
            <span>Route</span>
          </div>
        </div>
      </div>
    </div>
  )
}
