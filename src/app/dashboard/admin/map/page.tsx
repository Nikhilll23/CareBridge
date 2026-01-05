import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Navigation, Ambulance, Users } from 'lucide-react'
import { getEmergencyMapData } from '@/actions/emergency'
import { Badge } from '@/components/ui/badge'
import LiveMapWrapper from '@/components/modules/map/LiveMapClient'
import { AmbulanceManager } from '@/components/modules/map/AmbulanceManager'

export default async function EmergencyMapPage() {
  const { ambulances, patients } = await getEmergencyMapData()

  const availableAmbulances = ambulances.filter(a => a.status === 'AVAILABLE').length
  const totalFleet = ambulances.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emergency Map</h1>
          <p className="text-muted-foreground mt-2">Real-time ambulance and patient location tracking</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ambulances Available</CardTitle>
            <Ambulance className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableAmbulances} <span className="text-sm font-normal text-muted-foreground">/ {totalFleet}</span></div>
            <p className="text-xs text-muted-foreground">Fleet status</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patients Mapped</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <p className="text-xs text-muted-foreground">With geo-data</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* List View - Takes 1 column */}
        <AmbulanceManager ambulances={ambulances} />

        {/* Map View - Takes 2 columns */}
        <Card className="md:col-span-2 h-[600px] flex flex-col overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Live Fleet Map
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 relative">
            <LiveMapWrapper ambulances={ambulances} patients={patients} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
