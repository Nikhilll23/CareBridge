'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateAmbulanceStatus, deleteAmbulance } from '@/actions/ambulance'
import { toast } from 'sonner'
import { useState } from 'react'
import type { Ambulance } from '@/types/admin'
import { Trash2 } from 'lucide-react'
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

    return (
        <Card className="h-[600px] overflow-hidden flex flex-col">
            <CardHeader>
                <CardTitle className="text-base">{userRole === 'PATIENT' ? 'Nearby Ambulances' : 'Ambulance Fleet'}</CardTitle>
                <CardDescription>{userRole === 'PATIENT' ? 'Live availability status' : 'Manage fleet status'}</CardDescription>
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
                                    amb.status === 'AVAILABLE' ? 'bg-green-600 dark:bg-green-700' :
                                        amb.status === 'BUSY' ? 'bg-red-600 dark:bg-red-700' : 'bg-muted text-muted-foreground'
                                }>
                                    {amb.status}
                                </Badge>
                            </div>

                            <div className="flex items-center gap-2">
                                {userRole === 'ADMIN' ? (
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
                                ) : (
                                    <span className="text-xs text-muted-foreground italic mr-2">
                                        View Only
                                    </span>
                                )}
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

                            {/* Patient view - read-only location info */}
                            {userRole === 'PATIENT' && amb.current_lat && amb.current_lng && (
                                <p className="text-xs text-muted-foreground">
                                    📍 Location: {amb.current_lat.toFixed(4)}, {amb.current_lng.toFixed(4)}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
