'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { getWardStatus, markBedClean, dischargePatientFromBed } from '@/actions/beds'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bed, UserMinus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export function LiveBedBoard() {
    const [wards, setWards] = useState<any[]>([])
    const supabase = createSupabaseBrowserClient()

    const fetchStatus = () => getWardStatus().then(setWards)

    useEffect(() => {
        fetchStatus()

        // Realtime Subscription
        const channel = supabase
            .channel('bed_tracking')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, () => {
                fetchStatus() // Refresh on any bed change
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase])

    const handleDischarge = async (bedId: string) => {
        toast.promise(dischargePatientFromBed(bedId), {
            loading: 'Processing Discharge...',
            success: 'Bed marked for CLEANING',
            error: 'Failed'
        })
    }

    const handleClean = async (bedId: string) => {
        toast.promise(markBedClean(bedId), {
            loading: 'Marking as Clean...',
            success: 'Bed is now AVAILABLE',
            error: 'Failed'
        })
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                    Live Bed Tracking
                </h2>
                <div className="flex gap-2 text-sm">
                    <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">Available</Badge>
                    <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">Occupied</Badge>
                    <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700">Cleaning</Badge>
                </div>
            </div>

            {wards.map(ward => (
                <Card key={ward.id} className="overflow-hidden">
                    <div className="bg-muted/30 px-6 py-4 border-b flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{ward.name}</h3>
                            <p className="text-xs text-muted-foreground">
                                Floor {ward.floor_number || 'G'} • Stations: {ward.nurse_station_phone || 'N/A'}
                            </p>
                        </div>
                        <Badge>{ward.type}</Badge>
                    </div>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {ward.beds?.map((bed: any) => (
                                <BedCard
                                    key={bed.id}
                                    bed={bed}
                                    onDischarge={() => handleDischarge(bed.id)}
                                    onClean={() => handleClean(bed.id)}
                                />
                            ))}
                            {(!ward.beds || ward.beds.length === 0) && (
                                <p className="text-sm text-muted-foreground col-span-full">No beds configured.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function BedCard({ bed, onDischarge, onClean }: any) {
    const statusColor =
        bed.status === 'AVAILABLE' ? 'border-green-300 bg-green-50' :
            bed.status === 'OCCUPIED' ? 'border-red-300 bg-red-50' :
                bed.status === 'CLEANING' ? 'border-yellow-300 bg-yellow-50' :
                    'border-gray-300 bg-gray-50'

    return (
        <div className={`
            relative p-4 rounded-xl border-2 flex flex-col items-center justify-between min-h-[140px] text-center transition-all
            ${statusColor}
        `}>
            <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-white/50 backdrop-blur-sm">
                    {bed.status.substring(0, 4)}
                </Badge>
            </div>

            <Bed className={`h-8 w-8 mb-2 
                ${bed.status === 'AVAILABLE' ? 'text-green-600' : ''}
                ${bed.status === 'OCCUPIED' ? 'text-red-600' : ''}
                ${bed.status === 'CLEANING' ? 'text-yellow-600' : ''}
            `} />

            <div>
                <div className="font-bold text-lg leading-none">{bed.bed_number}</div>
                <div className="text-[10px] uppercase opacity-60 font-semibold mt-1">{bed.type}</div>
            </div>

            <div className="mt-3 w-full">
                {bed.status === 'OCCUPIED' && (
                    <Button
                        size="sm"
                        variant="destructive"
                        className="w-full h-7 text-[10px] bg-red-500 hover:bg-red-600"
                        onClick={onDischarge}
                    >
                        <UserMinus className="h-3 w-3 mr-1" /> Discharge
                    </Button>
                )}
                {bed.status === 'CLEANING' && (
                    <Button
                        size="sm"
                        className="w-full h-7 text-[10px] bg-yellow-500 hover:bg-yellow-600 text-black"
                        onClick={onClean}
                    >
                        <Sparkles className="h-3 w-3 mr-1" /> Ready
                    </Button>
                )}
                {bed.status === 'AVAILABLE' && (
                    <div className="text-xs text-green-700 font-medium py-1">Ready</div>
                )}
            </div>
        </div>
    )
}
