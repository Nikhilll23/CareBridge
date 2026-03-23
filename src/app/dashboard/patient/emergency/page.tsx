import { AmbulanceManager } from '@/components/modules/map/AmbulanceManager'
import { PatientMap } from '@/components/shared/PatientMap'
import { supabaseAdmin } from '@/lib/supabase'
import { syncUser } from '@/actions/auth'
import { redirect } from 'next/navigation'
import { Map, AlertTriangle } from 'lucide-react'

export const metadata = {
    title: 'Emergency - CareBridge',
    description: 'Emergency Services and Ambulance Booking'
}

export default async function PatientEmergencyPage() {
    const user = await syncUser()
    if (!user) redirect('/sign-in')

    // Fetch Ambulances
    const { data: ambulances } = await supabaseAdmin
        .from('ambulances')
        .select('*')
        .order('status', { ascending: true })

    return (
        <div className="flex flex-col gap-6 p-6 h-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                        Emergency Services
                    </h1>
                    <p className="text-muted-foreground">
                        Book an ambulance or contact emergency services immediately.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <AmbulanceManager ambulances={ambulances || []} userRole={user.role} />

                <div className="space-y-6">
                    <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800">
                        <h2 className="text-xl font-bold mb-2">Emergency Contacts</h2>
                        <ul className="space-y-2 font-medium">
                            <li className="flex justify-between">
                                <span>Emergency Hotline:</span>
                                <span>108 or 911</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Hospital Reception:</span>
                                <span>+1 (555) 123-4567</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Ambulance Direct:</span>
                                <span>+1 (555) 999-8888</span>
                            </li>
                        </ul>
                    </div>

                    <div className="rounded-lg overflow-hidden border shadow-sm min-h-[400px]">
                        <PatientMap
                            patientLat={28.6139}
                            patientLng={77.2090}
                            patientName={user.fullName}
                            ambulances={(ambulances || []).map((amb, i) => ({
                                id: amb.id,
                                name: amb.vehicle_number,
                                lat: amb.current_lat || (28.6139 + ((i + 1) * 0.01)),
                                lng: amb.current_lng || (77.2090 + ((i + 1) * 0.01)),
                                status: amb.status.toLowerCase() as any,
                                distance: 2.5 + i
                            }))}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
