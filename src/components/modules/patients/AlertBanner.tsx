'use client'

import { useEffect, useState } from 'react'
import { getPatientAlerts, resolveAlert, addPatientAlert } from '@/actions/alerts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { AlertTriangle, ShieldAlert, Info, XCircle, Plus, Megaphone } from 'lucide-react'
import { toast } from 'sonner'

interface AlertBannerProps {
    patientId: string
    currentUserId: string // For logging who added/resolved
}

export function AlertBanner({ patientId, currentUserId }: AlertBannerProps) {
    const [alerts, setAlerts] = useState<any[]>([])
    const [open, setOpen] = useState(false)
    const [newAlert, setNewAlert] = useState({ type: 'MEDICAL', severity: 'WARNING', message: '' })

    const refresh = () => getPatientAlerts(patientId).then(setAlerts)
    useEffect(() => { refresh() }, [patientId])

    const handleResolve = async (id: string) => {
        await resolveAlert(id, currentUserId)
        toast.success('Alert Resolved')
        refresh()
    }

    const handleAdd = async () => {
        if (!newAlert.message) return
        await addPatientAlert(patientId, newAlert.type, newAlert.severity, newAlert.message, currentUserId)
        setOpen(false)
        setNewAlert({ type: 'MEDICAL', severity: 'WARNING', message: '' })
        refresh()
    }

    // Sort: Critical first
    const sortedAlerts = [...alerts].sort((a, b) => (a.severity === 'CRITICAL' ? -1 : 1))

    return (
        <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                    <Megaphone className="h-4 w-4" /> Clinical Alerts
                </h3>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                            <Plus className="mr-1 h-3 w-3" /> Add Alert
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Patient Alert</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 py-4">
                            <Select value={newAlert.type} onValueChange={v => setNewAlert({ ...newAlert, type: v })}>
                                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALLERGY">Allergy</SelectItem>
                                    <SelectItem value="MEDICAL">Medical Condition</SelectItem>
                                    <SelectItem value="BEHAVIORAL">Behavioral Risk</SelectItem>
                                    <SelectItem value="FINANCIAL">Financial/Billing</SelectItem>
                                    <SelectItem value="ISOLATION">Isolation Precautions</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={newAlert.severity} onValueChange={v => setNewAlert({ ...newAlert, severity: v })}>
                                <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CRITICAL">CRITICAL (Red)</SelectItem>
                                    <SelectItem value="WARNING">WARNING (Yellow)</SelectItem>
                                    <SelectItem value="INFO">INFO (Blue)</SelectItem>
                                </SelectContent>
                            </Select>

                            <Input
                                placeholder="Alert Message (e.g. Fall Risk, Penicillin Allergy)"
                                value={newAlert.message}
                                onChange={e => setNewAlert({ ...newAlert, message: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAdd}>Save Alert</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {sortedAlerts.length === 0 && (
                <div className="text-xs text-muted-foreground italic border border-dashed p-2 rounded text-center">
                    No active alerts for this patient.
                </div>
            )}

            {sortedAlerts.map(alert => (
                <Alert key={alert.id} className={`
                    flex items-center justify-between
                    ${alert.severity === 'CRITICAL' ? 'border-red-500 bg-red-50 text-red-900' : ''}
                    ${alert.severity === 'WARNING' ? 'border-yellow-500 bg-yellow-50 text-yellow-900' : ''}
                    ${alert.severity === 'INFO' ? 'border-blue-500 bg-blue-50 text-blue-900' : ''}
                `}>
                    <div className="flex items-center gap-3">
                        {alert.severity === 'CRITICAL' && <ShieldAlert className="h-5 w-5 text-red-600 animate-pulse" />}
                        {alert.severity === 'WARNING' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                        {alert.severity === 'INFO' && <Info className="h-5 w-5 text-blue-600" />}

                        <div>
                            <AlertTitle className="font-bold flex items-center gap-2">
                                {alert.type}
                                {alert.severity === 'CRITICAL' && <span className="text-[10px] bg-red-200 px-1 rounded text-red-800">CRITICAL</span>}
                            </AlertTitle>
                            <AlertDescription className="text-sm font-medium">
                                {alert.message}
                            </AlertDescription>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-50 hover:opacity-100 hover:bg-white/20"
                        onClick={() => handleResolve(alert.id)}
                    >
                        <XCircle className="h-5 w-5" />
                    </Button>
                </Alert>
            ))}
        </div>
    )
}
