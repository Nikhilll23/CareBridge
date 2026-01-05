'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, AlertCircle } from 'lucide-react'
import { deleteAuditLog, clearAllAuditLogs } from '@/actions/audit'
import { toast } from 'sonner'
import { format } from 'date-fns'
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
import type { AuditLog } from '@/types/admin'

interface AuditListProps {
    initialLogs: AuditLog[]
}

export function AuditList({ initialLogs }: AuditListProps) {
    const [logs, setLogs] = useState<AuditLog[]>(initialLogs)

    const handleDelete = async (id: string) => {
        try {
            const result = await deleteAuditLog(id)
            if (result.success) {
                setLogs(logs.filter(log => log.id !== id))
                toast.success('Log entry deleted')
            } else {
                toast.error('Failed to delete log')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    const handleClearAll = async () => {
        try {
            const result = await clearAllAuditLogs()
            if (result.success) {
                setLogs([])
                toast.success('All audit logs cleared')
            } else {
                toast.error('Failed to clear logs')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>System Activity Log</CardTitle>
                    <CardDescription>
                        Comprehensive audit trail of all system activities and user actions
                    </CardDescription>
                </div>

                {logs.length > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Clear All Logs
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete all audit logs.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete All
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {logs && logs.length > 0 ? (
                        <div className="rounded-md border">
                            <div className="grid grid-cols-6 p-4 font-medium border-b bg-muted/50 text-sm">
                                <div className="col-span-1">Timestamp</div>
                                <div className="col-span-1">User</div>
                                <div className="col-span-1">Action</div>
                                <div className="col-span-1">Entity</div>
                                <div className="col-span-1">Details</div>
                                <div className="col-span-1 text-right">Actions</div>
                            </div>
                            {logs.map((log) => (
                                <div key={log.id} className="grid grid-cols-6 p-4 border-b last:border-0 text-sm hover:bg-muted/50 transition-colors items-center">
                                    <div className="text-muted-foreground text-xs col-span-1">
                                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                                    </div>
                                    <div className="font-medium truncate pr-2 col-span-1 text-xs" title={log.user_id || 'System'}>
                                        {log.user_id || 'System'}
                                    </div>
                                    <div className="col-span-1">
                                        <Badge variant="outline" className={
                                            log.action.includes('DELETE') ? 'border-red-500 text-red-500 text-[10px]' :
                                                log.action.includes('UPDATE') ? 'border-blue-500 text-blue-500 text-[10px]' :
                                                    'border-green-500 text-green-500 text-[10px]'
                                        }>
                                            {log.action}
                                        </Badge>
                                    </div>
                                    <div className="text-muted-foreground flex items-center gap-1 col-span-1 text-xs">
                                        {log.entity}
                                    </div>
                                    <div className="text-muted-foreground truncate col-span-1 text-xs" title={JSON.stringify(log.details)}>
                                        {JSON.stringify(log.details)}
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(log.id)}
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg bg-muted/50 text-muted-foreground">
                            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                            <p>No audit logs requested found</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
