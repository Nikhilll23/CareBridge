'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateAmbulanceStatus, deleteAmbulance } from '@/actions/ambulance'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import type { Ambulance } from '@/types/admin'
import { Loader2, Trash2 } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface AmbulanceManagerProps {
    ambulances: Ambulance[]
    userRole?: string
}

export function AmbulanceManager({ ambulances, userRole }: AmbulanceManagerProps) {
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])


    const handleStatusChange = async (id: string, newStatus: 'AVAILABLE' | 'BUSY' | 'MAINTENANCE') => {
        setUpdatingId(id)
        try {
            const res = await updateAmbulanceStatus(id, newStatus)
            if (res.success) {
                toast.success(`Ambulance ${id} status updated`)
            } else {
                toast.error('Failed to update status')
            }
        } catch (e) {
            toast.error('An error occurred')
        } finally {
            setUpdatingId(null)
        }
    }

    if (!mounted) {
        return (
            <Card className="h-[600px] flex items-center justify-center text-muted-foreground bg-muted/5">
                <div className="flex flex-col items-center">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    <span>Loading fleet...</span>
                </div>
            </Card>
        )
    }

    return (
        <Card className="h-[600px] overflow-hidden flex flex-col">
            <CardHeader>
                <CardTitle className="text-base">Ambulance Fleet</CardTitle>
                <CardDescription>Live status updates</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
                <div className="divide-y">
                    {ambulances.map(amb => (
                        <div key={amb.id} className="p-4 flex flex-col gap-3 hover:bg-muted/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">{amb.vehicle_number}</p>
                                    <p className="text-xs text-muted-foreground">{amb.driver_name || 'No Data'}</p>
                                </div>
                                <Badge variant={amb.status === 'AVAILABLE' ? 'default' : 'secondary'} className={
                                    amb.status === 'AVAILABLE' ? 'bg-green-600' :
                                        amb.status === 'BUSY' ? 'bg-red-600' : 'bg-gray-600'
                                }>
                                    {amb.status}
                                </Badge>
                            </div>

                            <div className="flex items-center gap-2">
                                <Select
                                    disabled={updatingId === amb.id}
                                    onValueChange={(val) => handleStatusChange(amb.id, val as any)}
                                    defaultValue={amb.status}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Update Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AVAILABLE">Available</SelectItem>
                                        <SelectItem value="BUSY">Busy</SelectItem>
                                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                    </SelectContent>
                                </Select>
                                {updatingId === amb.id && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}

                                {userRole === 'ADMIN' && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Ambulance?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Permanently remove <span className="font-semibold">{amb.vehicle_number}</span> from the fleet.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={async () => {
                                                        const res = await deleteAmbulance(amb.id)
                                                        if (res.success) toast.success('Ambulance deleted')
                                                        else toast.error('Failed to delete')
                                                    }}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
