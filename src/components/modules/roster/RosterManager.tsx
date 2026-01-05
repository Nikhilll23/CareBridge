'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarClock, Clock, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EditRosterDialog } from '@/components/modules/roster/EditRosterDialog'
import { deleteFromRoster } from '@/actions/roster'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
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

interface RosterManagerProps {
    roster: any[]
    stats: { onDuty: number }
    staffList: any[]
    isAdmin: boolean
}

export function RosterManager({ roster, stats, staffList, isAdmin }: RosterManagerProps) {
    const [editOpen, setEditOpen] = useState(false)
    const router = useRouter()
    const [today, setToday] = useState(new Date())



    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Duty Roster</h1>
                    <p className="text-muted-foreground mt-2">Staff scheduling and shift management</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline"><ChevronLeft className="h-4 w-4" /></Button>
                    <div className="font-semibold">{today.toDateString()}</div>
                    <Button variant="outline"><ChevronRight className="h-4 w-4" /></Button>
                    {isAdmin && (
                        <Button onClick={() => setEditOpen(true)}>Edit Roster</Button>
                    )}
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Currently On Duty</CardTitle>
                        <Clock className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.onDuty}</div>
                        <p className="text-xs text-muted-foreground">Active personnel</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5" />
                        Shift Schedule
                    </CardTitle>
                    <CardDescription>
                        Staff distribution across departments
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {['MORNING', 'EVENING', 'NIGHT'].map(type => (
                            <div key={type} className="border-b last:border-0">
                                <div className="bg-muted/30 p-2 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                                    {type} Shift
                                </div>
                                <div className="divide-y">
                                    {roster.filter((r: any) => r.shift_type === type).length === 0 ? (
                                        <div className="p-4 text-sm text-muted-foreground italic">No staff scheduled</div>
                                    ) : (
                                        roster.filter((r: any) => r.shift_type === type).map((entry: any) => (
                                            <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs ring-2 ring-background">
                                                        {entry.staff?.first_name?.[0]}{entry.staff?.last_name?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{entry.staff?.first_name} {entry.staff?.last_name}</p>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span>{entry.staff?.role}</span>
                                                            <span>•</span>
                                                            <span>{entry.department}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={entry.status === 'COMPLETED' ? 'secondary' : 'default'} className="text-xs">
                                                        {entry.status}
                                                    </Badge>
                                                    {isAdmin && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <Trash2 className="h-3 w-3 text-red-500" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Remove Shift?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Are you sure you want to remove this shift assignment for
                                                                        <span className="font-semibold"> {entry.staff?.first_name} {entry.staff?.last_name}</span>?
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        onClick={async () => {
                                                                            const res = await deleteFromRoster(entry.id)
                                                                            if (res.success) {
                                                                                toast.success('Shift removed')
                                                                                router.refresh()
                                                                            } else {
                                                                                toast.error('Failed to remove shift')
                                                                            }
                                                                        }}
                                                                    >
                                                                        Delete
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <EditRosterDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                currentRoster={roster}
                staffList={staffList}
                onSuccess={() => router.refresh()}
            />
        </div>
    )
}
