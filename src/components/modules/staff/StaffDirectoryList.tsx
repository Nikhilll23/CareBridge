'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Mail, Phone, Calendar, Edit2, Trash2 } from 'lucide-react'
import { UpdateStaffScheduleDialog } from './UpdateStaffScheduleDialog'
import { deleteUser } from '@/actions/staff'
import { toast } from 'sonner'
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

interface StaffMember {
    id: string
    first_name: string
    last_name: string
    role: string
    email: string
    phone?: string
    shifts?: any[]
}

export function StaffDirectoryList({ staff }: { staff: StaffMember[] }) {
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleEdit = (member: StaffMember) => {
        setSelectedStaff(member)
        setIsDialogOpen(true)
    }

    const handleDelete = async (userId: string) => {
        const result = await deleteUser(userId)
        if (result.success) {
            toast.success('User deleted successfully')
        } else {
            toast.error('Failed to delete user')
        }
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Staff Directory</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Today's Schedule</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staff.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell className="font-medium">
                                        {member.first_name} {member.last_name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{member.role}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3 w-3 text-muted-foreground" />
                                                {member.email}
                                            </div>
                                            {member.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                                    {member.phone}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {member.shifts && member.shifts.length > 0 ? (
                                            member.shifts.map(shift => (
                                                <div key={shift.id} className="text-sm mb-1 last:mb-0">
                                                    <span className="font-medium text-blue-600">{shift.shift_type}</span>
                                                    <span className="text-muted-foreground mx-1">•</span>
                                                    <span>{shift.department}</span>
                                                    {shift.start_time && (
                                                        <span className="ml-2 text-xs text-muted-foreground block">
                                                            {shift.start_time.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
                                                        </span>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-muted-foreground text-sm italic">Off Duty</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(member)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete
                                                            <span className="font-medium text-foreground"> {member.first_name} {member.last_name} </span>
                                                            and remove them from the system.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(member.id)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <UpdateStaffScheduleDialog
                member={selectedStaff}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
            />
        </>
    )
}
