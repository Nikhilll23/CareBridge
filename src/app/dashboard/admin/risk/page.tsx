'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShieldCheck, Search, CheckCircle, Lock, Plus } from 'lucide-react'
import { getIncidents, closeIncident, reportIncident } from '@/actions/risk'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function AdminRiskPage() {
    const [incidents, setIncidents] = useState<any[]>([])
    const [selectedIncident, setSelectedIncident] = useState<any>(null)
    const [capa, setCapa] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // New Incident State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newIncident, setNewIncident] = useState({ type: 'Safety', description: '', severity: 'Low', reportedBy: 'Admin', location: '' })

    const refresh = () => getIncidents().then(setIncidents)
    useEffect(() => { refresh() }, [])

    const handleClose = async () => {
        if (!capa) return toast.error('CAPA Action description is required')

        const res = await closeIncident(selectedIncident.id, capa, 'Admin User')
        if (res.success) {
            toast.success('Incident Closed with CAPA')
            setIsDialogOpen(false)
            refresh()
        } else {
            toast.error('Failed to update')
        }
    }

    const handleCreate = async () => {
        if (!newIncident.description) return toast.error('Description required')

        const res = await reportIncident(newIncident)
        if (res.success) {
            toast.success('Incident Logged')
            setIsCreateOpen(false)
            setNewIncident({ type: 'Safety', description: '', severity: 'Low', reportedBy: 'Admin', location: '' })
            refresh()
        } else {
            toast.error('Failed to log')
        }
    }

    const openInvestigation = (inc: any) => {
        setSelectedIncident(inc)
        setCapa(inc.capa_action || '')
        setIsDialogOpen(true)
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Lock className="h-8 w-8 text-blue-600" />
                        Risk & Quality Control
                    </h1>
                    <p className="text-muted-foreground">Admin Dashboard for Incident Management & CAPA.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={refresh}>Refresh Data</Button>
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" /> Log Incident
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardHeader className="py-4"><CardTitle className="text-sm">Total Incidents</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{incidents.length}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-4"><CardTitle className="text-sm text-red-600">Open Critical</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {incidents.filter(i => i.status === 'OPEN' && i.severity === 'CRITICAL').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-4"><CardTitle className="text-sm text-green-600">Closed (CAPA Done)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {incidents.filter(i => i.status === 'CLOSED').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Incident Registry</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {incidents.map((inc) => (
                                <TableRow key={inc.id}>
                                    <TableCell className="text-xs">{format(new Date(inc.created_at), 'MMM dd')}</TableCell>
                                    <TableCell>{inc.type.replace('_', ' ')}</TableCell>
                                    <TableCell>
                                        <Badge variant={inc.severity === 'CRITICAL' ? 'destructive' : 'outline'}>
                                            {inc.severity}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{inc.location || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={inc.status === 'OPEN' ? 'secondary' : 'default'} className={inc.status === 'CLOSED' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}>
                                            {inc.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {inc.status === 'OPEN' ? (
                                            <Button size="sm" variant="outline" onClick={() => openInvestigation(inc)}>
                                                Investigate
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="ghost" onClick={() => openInvestigation(inc)}>
                                                View CAPA
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {incidents.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8">No incidents found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Incident Investigation</DialogTitle>
                        <DialogDescription>
                            Review details and document Corrective & Preventive Actions (CAPA).
                        </DialogDescription>
                    </DialogHeader>

                    {selectedIncident && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 bg-muted p-3 rounded-md text-sm">
                                <div><strong>Type:</strong> {selectedIncident.type}</div>
                                <div><strong>Reported By:</strong> {selectedIncident.reported_by}</div>
                                <div className="col-span-2"><strong>Description:</strong><br /> {selectedIncident.description}</div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold">Corrective Action (CAPA)</label>
                                <Textarea
                                    placeholder="Describe training, repair, or process change implemented..."
                                    value={capa}
                                    onChange={e => setCapa(e.target.value)}
                                    disabled={selectedIncident.status === 'CLOSED'}
                                    className={selectedIncident.status === 'CLOSED' ? 'bg-muted' : ''}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        {selectedIncident?.status === 'OPEN' && (
                            <Button onClick={handleClose} className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Close Incident
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Log New Incident</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Select onValueChange={v => setNewIncident({ ...newIncident, type: v })} defaultValue="Safety">
                                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Safety">Safety</SelectItem>
                                    <SelectItem value="Medical Error">Medical Error</SelectItem>
                                    <SelectItem value="Equipment">Equipment Failure</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select onValueChange={v => setNewIncident({ ...newIncident, severity: v })} defaultValue="Low">
                                <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="CRITICAL">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Input placeholder="Location (e.g. Ward A)" onChange={e => setNewIncident({ ...newIncident, location: e.target.value })} />
                        <Textarea placeholder="Description of event..." onChange={e => setNewIncident({ ...newIncident, description: e.target.value })} />
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreate}>Submit Report</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
