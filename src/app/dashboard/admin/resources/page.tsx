'use client'

import { useState, useEffect } from 'react'
import { getAssets, assignAsset, requestMaintenance, getRoster, createRoster, getUtilizationStats } from '@/actions/resources'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Stethoscope, AlertTriangle, User, MapPin, Wrench, Search } from 'lucide-react'
import { FDASearchPanel } from '@/components/modules/pharmacy'

export default function ResourceDashboard() {
    const [assets, setAssets] = useState<any[]>([])
    const [roster, setRoster] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [search, setSearch] = useState('')
    const [isFdaOpen, setIsFdaOpen] = useState(false)

    // Roster Form
    const [staffName, setStaffName] = useState('')
    const [ward, setWard] = useState('')
    const [role, setRole] = useState('NURSE')
    const [isRosterOpen, setIsRosterOpen] = useState(false)

    // Assign Dialog
    const [isAssignOpen, setIsAssignOpen] = useState(false)
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
    const [locationInput, setLocationInput] = useState('')

    useEffect(() => {
        refresh()
    }, [])

    const refresh = async () => {
        getAssets(search).then(setAssets)
        getRoster().then(setRoster)
        getUtilizationStats().then(setStats)
    }

    const handleSearch = (v: string) => {
        setSearch(v)
        getAssets(v).then(setAssets)
    }

    const openAssignDialog = (id: string) => {
        setSelectedAssetId(id)
        setLocationInput('')
        setIsAssignOpen(true)
    }

    const confirmAssign = async () => {
        if (!selectedAssetId || !locationInput) return

        setIsAssignOpen(false)
        await assignAsset(selectedAssetId, locationInput, 'Admin')
        toast.success('Asset Moved')
        refresh()
    }

    const handleMaintain = async (id: string) => {
        await requestMaintenance(id, 'Admin')
        toast.info('Maintenance Requested')
        refresh()
    }

    const handleCreateRoster = async () => {
        const start = new Date().toISOString() // Demo: Starts Now
        const end = new Date(Date.now() + 8 * 3600 * 1000).toISOString() // +8 Hours

        const res = await createRoster({ staffName, role, ward, start, end })
        if (res.success) {
            toast.success('Staff Rostered')
            setIsRosterOpen(false)
            refresh()
        } else {
            toast.error(res.error)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Wrench className="h-8 w-8 text-primary" />
                    Resource Utilisation
                </h1>
                <Button variant="outline" onClick={() => setIsFdaOpen(true)} className="gap-2">
                    <Search className="h-4 w-4" /> FDA Drug Database
                </Button>
            </div>

            {/* Critical Alert Widget */}
            {stats?.ventilator.available < 2 && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded flex items-center justify-between shadow-sm animate-pulse">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6" />
                        <div>
                            <p className="font-bold">CRITICAL SHORTAGE: Ventilators</p>
                            <p className="text-sm">Only {stats.ventilator.available} Available. Please release unused units immediately.</p>
                        </div>
                    </div>
                    <Button variant="destructive" size="sm">Emergency Procurement</Button>
                </div>
            )}

            <Tabs defaultValue="assets" className="w-full">
                <TabsList>
                    <TabsTrigger value="assets">Equipment Tracker</TabsTrigger>
                    <TabsTrigger value="roster">Staff Roster</TabsTrigger>
                </TabsList>

                {/* ASSETS TAB */}
                <TabsContent value="assets" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <Input
                            placeholder="Find Equipment..."
                            className="max-w-sm"
                            onChange={e => handleSearch(e.target.value)}
                        />
                        <Button onClick={refresh}>Refresh</Button>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        {assets.map(a => (
                            <Card key={a.id} className={a.status === 'IN_USE' ? 'border-l-4 border-l-blue-500' : (a.status === 'MAINTENANCE' ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-green-500')}>
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg">{a.name}</h3>
                                        <Badge variant={a.status === 'AVAILABLE' ? 'default' : 'secondary'}>{a.status}</Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                        <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {a.current_location_id}</p>
                                        <p className="text-xs">Type: {a.type}</p>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        {a.status === 'AVAILABLE' && (
                                            <Button size="sm" className="w-full" onClick={() => openAssignDialog(a.id)}>Assign</Button>
                                        )}
                                        {a.status !== 'MAINTENANCE' && (
                                            <Button size="sm" variant="outline" className="w-full" onClick={() => handleMaintain(a.id)}>Maintenance</Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* ROSTER TAB */}
                <TabsContent value="roster">
                    <Card>
                        <CardHeader className="flex flex-row justify-between">
                            <CardTitle>Current Shifts</CardTitle>
                            <Dialog open={isRosterOpen} onOpenChange={setIsRosterOpen}>
                                <DialogTrigger asChild><Button><User className="h-4 w-4 mr-2" /> Add Shift</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Assign Staff</DialogTitle></DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2"><Label>Staff Name</Label><Input onChange={e => setStaffName(e.target.value)} /></div>
                                        <div className="space-y-2"><Label>Role</Label>
                                            <Select onValueChange={setRole} defaultValue="NURSE">
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="NURSE">Nurse</SelectItem>
                                                    <SelectItem value="RESIDENT_DOCTOR">Resident Doctor</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2"><Label>Ward</Label><Input placeholder="e.g. ICU-1" onChange={e => setWard(e.target.value)} /></div>
                                    </div>
                                    <DialogFooter><Button onClick={handleCreateRoster}>Confirm Shift</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {roster.map(r => (
                                    <div key={r.id} className="flex justify-between items-center bg-muted/20 p-3 rounded hover:bg-muted/40 border">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">
                                                {r.staff_name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-semibold">{r.staff_name}</div>
                                                <div className="text-xs text-muted-foreground">{r.role} • {r.ward_id}</div>
                                            </div>
                                        </div>
                                        <div className="text-right text-sm">
                                            <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                                {new Date(r.shift_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                {new Date(r.shift_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {roster.length === 0 && <div className="text-center py-8 text-muted-foreground">No active shifts.</div>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Asset</DialogTitle>
                        <DialogDescription>Select a new location for this equipment.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="loc" className="text-right">Location</Label>
                            <Input id="loc" value={locationInput} onChange={e => setLocationInput(e.target.value)} className="col-span-3" placeholder="e.g. OT-1, Ward-A" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
                        <Button onClick={confirmAssign}>Confirm Move</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <FDASearchPanel isOpen={isFdaOpen} onClose={() => setIsFdaOpen(false)} />
        </div>
    )
}
