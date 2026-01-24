'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { getWardStatus, markBedClean, dischargePatientFromBed, allocateBed, getPatientsForAllocation } from '@/actions/beds'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bed, UserMinus, Sparkles, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface LiveBedBoardProps {
    userRole: string
}

export function LiveBedBoard({ userRole }: LiveBedBoardProps) {
    const [wards, setWards] = useState<any[]>([])
    const [isAllocateOpen, setIsAllocateOpen] = useState(false)
    const [selectedBedId, setSelectedBedId] = useState<string | null>(null)
    const [selectedPatientId, setSelectedPatientId] = useState('')
    const [patients, setPatients] = useState<any[]>([])

    const isAdmin = userRole === 'ADMIN'

    const supabase = createSupabaseBrowserClient()

    const fetchStatus = () => getWardStatus().then(setWards)
    const fetchPatients = () => getPatientsForAllocation().then(setPatients)

    useEffect(() => {
        fetchStatus()
        fetchPatients()

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

    const openAllocateDialog = (bedId: string) => {
        setSelectedBedId(bedId)
        setSelectedPatientId('')
        setIsAllocateOpen(true)
    }

    const confirmAllocate = async () => {
        if (!selectedBedId || !selectedPatientId) return

        setIsAllocateOpen(false) // Close immediately to feel responsive
        toast.promise(allocateBed(selectedPatientId, selectedBedId), {
            loading: 'Allocating Bed...',
            success: 'Bed Allocated Successfully',
            error: (err: any) => err?.error || 'Failed to Allocate'
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
                                    isAdmin={isAdmin}
                                    onDischarge={() => handleDischarge(bed.id)}
                                    onClean={() => handleClean(bed.id)}
                                    onAllocate={() => openAllocateDialog(bed.id)}
                                />
                            ))}
                            {(!ward.beds || ward.beds.length === 0) && (
                                <p className="text-sm text-muted-foreground col-span-full">No beds configured.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}

            <Dialog open={isAllocateOpen} onOpenChange={setIsAllocateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Allocate Bed</DialogTitle>
                        <DialogDescription>
                            Select a patient to assign this bed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Select Patient</Label>
                            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a patient..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {patients.map((patient) => (
                                        <SelectItem key={patient.id} value={patient.id}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {patient.first_name} {patient.last_name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {patient.uhid || 'No UHID'} • {patient.contact_number}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAllocateOpen(false)}>Cancel</Button>
                        <Button onClick={confirmAllocate} disabled={!selectedPatientId}>Allocate Bed</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function BedCard({ bed, isAdmin, onDischarge, onClean, onAllocate }: any) {
    const statusColor =
        bed.status === 'AVAILABLE' ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/30' :
            bed.status === 'OCCUPIED' ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/30' :
                bed.status === 'CLEANING' ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/30' :
                    'border-border bg-muted'

    return (
        <div className={`
            relative p-4 rounded-xl border-2 flex flex-col items-center justify-between min-h-[140px] text-center transition-all
            ${statusColor}
        `}>
            <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-background/50 backdrop-blur-sm">
                    {bed.status.substring(0, 4)}
                </Badge>
            </div>

            <Bed className={`h-8 w-8 mb-2 
                ${bed.status === 'AVAILABLE' ? 'text-green-600 dark:text-green-400' : ''}
                ${bed.status === 'OCCUPIED' ? 'text-red-600 dark:text-red-400' : ''}
                ${bed.status === 'CLEANING' ? 'text-yellow-600 dark:text-yellow-400' : ''}
            `} />

            <div>
                <div className="font-bold text-lg leading-none">{bed.bed_number}</div>
                <div className="text-[10px] uppercase opacity-60 font-semibold mt-1">{bed.type}</div>
            </div>

            <div className="mt-3 w-full">
                {isAdmin && bed.status === 'OCCUPIED' && (
                    <Button
                        size="sm"
                        variant="destructive"
                        className="w-full h-7 text-[10px] bg-red-500 hover:bg-red-600"
                        onClick={onDischarge}
                    >
                        <UserMinus className="h-3 w-3 mr-1" /> Discharge
                    </Button>
                )}
                {isAdmin && bed.status === 'CLEANING' && (
                    <Button
                        size="sm"
                        className="w-full h-7 text-[10px] bg-yellow-500 hover:bg-yellow-600 text-black"
                        onClick={onClean}
                    >
                        <Sparkles className="h-3 w-3 mr-1" /> Ready
                    </Button>
                )}
                {isAdmin && bed.status === 'AVAILABLE' && (
                    <Button
                        size="sm"
                        className="w-full h-7 text-[10px] bg-green-600 hover:bg-green-700"
                        onClick={onAllocate}
                    >
                        <UserPlus className="h-3 w-3 mr-1" /> Allocate
                    </Button>
                )}
                {!isAdmin && (
                    <div className="text-[10px] text-center text-muted-foreground">
                        {bed.status}
                    </div>
                )}
            </div>
        </div>
    )
}
