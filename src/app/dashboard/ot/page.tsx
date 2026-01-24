'use client'

import { useState, useEffect } from 'react'
import { getSurgeries, getTheaters, scheduleSurgery, updateChecklist, getChecklistStatus, logConsumption, getConsumables, saveClinicalNotes } from '@/actions/ot'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Activity, Syringe, ClipboardCheck, Box, User, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { searchPatients } from '@/actions/patients' // Helper to find patient

export default function OTDashboard() {
    const [surgeries, setSurgeries] = useState<any[]>([])
    const [theaters, setTheaters] = useState<any[]>([])
    const [activeSurgery, setActiveSurgery] = useState<any>(null)

    // Scheduling State
    const [isBookOpen, setIsBookOpen] = useState(false)
    const [newBooking, setNewBooking] = useState({ patientId: '', theaterId: '', procedure: '', start: '', end: '', surgeon: '', anaesthetist: '', nurse: '' })
    const [patientSearch, setPatientSearch] = useState('')
    const [foundPatients, setFoundPatients] = useState<any[]>([])

    // Live Console State
    const [activeTab, setActiveTab] = useState('checklist')
    const [checklistStatus, setChecklistStatus] = useState<any[]>([])
    const [consumables, setConsumables] = useState<any[]>([])

    // Checklist State
    const [checklistChecks, setChecklistChecks] = useState<Record<string, boolean>>({})

    // Notes State
    const [notes, setNotes] = useState({ pre: '', intra: '', post: '', anaesthesia: '' })

    useEffect(() => {
        refresh()
        getTheaters().then(setTheaters)
    }, [])

    const refresh = () => {
        getSurgeries().then(data => {
            setSurgeries(data)
            if (activeSurgery) {
                // Keep active surgery updated
                const updated = data.find(s => s.id === activeSurgery.id)
                if (updated) setActiveSurgery(updated)
            }
        })
    }

    // --- Scheduling ---
    const handleSearchPatient = async (q: string) => {
        setPatientSearch(q)
        if (q.length > 2) {
            const res = await searchPatients(q)
            setFoundPatients(res)
        }
    }

    const handleBook = async () => {
        const res = await scheduleSurgery({
            patientId: newBooking.patientId,
            theaterId: newBooking.theaterId,
            procedureName: newBooking.procedure,
            startTime: newBooking.start,
            endTime: newBooking.end,
            surgeonName: newBooking.surgeon,
            anaesthetistName: newBooking.anaesthetist,
            nurseName: newBooking.nurse
        })
        if (res.success) {
            toast.success('Surgery Scheduled')
            setIsBookOpen(false)
            refresh()
        } else {
            toast.error(res.error)
        }
    }

    // --- Live Console ---
    const openConsole = async (surgery: any) => {
        setActiveSurgery(surgery)
        // Load Sub-data
        const checks = await getChecklistStatus(surgery.id)
        setChecklistStatus(checks)

        const items = await getConsumables(surgery.id)
        setConsumables(items)

        setNotes({
            pre: surgery.pre_op_assessment || '',
            intra: surgery.intra_op_notes || '',
            post: surgery.post_op_orders || '',
            anaesthesia: surgery.anaesthesia_record || ''
        })
    }

    const handleChecklistSubmit = async (stage: string) => {
        await updateChecklist(activeSurgery.id, stage, checklistChecks, 'Current User')
        toast.success(`${stage} Verified`)
        refresh()
        // Refresh checks
        const checks = await getChecklistStatus(activeSurgery.id)
        setChecklistStatus(checks)
    }

    const handleBillItem = async (e: any) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        await logConsumption(activeSurgery.id, {
            name: formData.get('name') as string,
            batch: formData.get('batch') as string,
            qty: parseInt(formData.get('qty') as string),
            cost: parseFloat(formData.get('cost') as string),
        })
        toast.success('Item Billed')
        const items = await getConsumables(activeSurgery.id)
        setConsumables(items)
        e.target.reset()
    }

    const handleSaveNote = async (field: any, content: string) => {
        await saveClinicalNotes(activeSurgery.id, field, content)
        toast.success('Notes Saved')
    }

    if (activeSurgery) {
        // --- LIVE CONSOLE VIEW ---
        return (
            <div className="h-full flex flex-col space-y-4">
                <div className="flex items-center justify-between bg-primary/10 p-4 rounded-lg border border-primary/20">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Activity className="h-6 w-6 text-red-500 animate-pulse" />
                            Live Surgery: {activeSurgery.procedure_name}
                        </h2>
                        <p className="text-muted-foreground text-sm mt-1">
                            Patient: <strong>{activeSurgery.patients.first_name} {activeSurgery.patients.last_name}</strong>
                            <span className="mx-2">|</span>
                            Surgeon: {activeSurgery.team_mapping?.surgeon}
                            <span className="mx-2">|</span>
                            Anaesthetist: {activeSurgery.team_mapping?.anaesthetist}
                            <span className="mx-2">|</span>
                            Nurse: {activeSurgery.team_mapping?.nurse}
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => setActiveSurgery(null)}>Exit Console</Button>
                </div>

                <div className="grid grid-cols-12 gap-4 h-full">
                    {/* Left: WHO Checklist */}
                    <Card className="col-span-3">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">WHO Safety Checklist</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Sign In */}
                            <div className={`p-3 rounded border ${checklistStatus.find(c => c.stage === 'SIGN_IN') ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                    <ClipboardCheck className="h-4 w-4" /> Sign In (Before Induction)
                                </h3>
                                {checklistStatus.find(c => c.stage === 'SIGN_IN') ? (
                                    <Badge className="bg-green-600">Completed</Badge>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2"><Checkbox onCheckedChange={(c: any) => setChecklistChecks({ ...checklistChecks, identity: !!c })} /> <label>Identity Confirmed</label></div>
                                        <div className="flex items-center gap-2"><Checkbox onCheckedChange={(c: any) => setChecklistChecks({ ...checklistChecks, site: !!c })} /> <label>Site Marked</label></div>
                                        <div className="flex items-center gap-2"><Checkbox onCheckedChange={(c: any) => setChecklistChecks({ ...checklistChecks, consent: !!c })} /> <label>Consent Verified</label></div>
                                        <Button size="sm" className="w-full mt-2" onClick={() => handleChecklistSubmit('SIGN_IN')}>Verify & Proceed</Button>
                                    </div>
                                )}
                            </div>

                            {/* Time Out */}
                            <div className={`p-3 rounded border ${checklistStatus.find(c => c.stage === 'TIME_OUT') ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                    <Clock className="h-4 w-4" /> Time Out (Before Cut)
                                </h3>
                                {checklistStatus.find(c => c.stage === 'TIME_OUT') ? (
                                    <Badge className="bg-green-600">Completed</Badge>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2"><Checkbox onCheckedChange={(c: any) => setChecklistChecks({ ...checklistChecks, team: !!c })} /> <label>Team Introduce</label></div>
                                        <div className="flex items-center gap-2"><Checkbox onCheckedChange={(c: any) => setChecklistChecks({ ...checklistChecks, image: !!c })} /> <label>Imaging Displayed</label></div>
                                        <div className="flex items-center gap-2 text-blue-800 bg-blue-50 p-1 rounded"><Checkbox onCheckedChange={(c: any) => setChecklistChecks({ ...checklistChecks, abx: !!c })} /> <label className="text-xs font-bold">Antibiotic Prophylaxis (Infection Control)</label></div>
                                        <Button size="sm" className="w-full mt-2" onClick={() => handleChecklistSubmit('TIME_OUT')}>Verify</Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Center: Notes & Records */}
                    <Card className="col-span-6">
                        <CardHeader><CardTitle>Clinical Documentation</CardTitle></CardHeader>
                        <CardContent>
                            <Tabs defaultValue="intra">
                                <TabsList className="w-full">
                                    <TabsTrigger value="pre">Pre-Op</TabsTrigger>
                                    <TabsTrigger value="anesthesia">Anaesthesia</TabsTrigger>
                                    <TabsTrigger value="intra">Intra-Op Notes</TabsTrigger>
                                    <TabsTrigger value="post">Post-Op</TabsTrigger>
                                </TabsList>
                                <TabsContent value="pre" className="space-y-2">
                                    <Textarea value={notes.pre} onChange={e => setNotes({ ...notes, pre: e.target.value })} placeholder="Pre-operative assessment..." className="h-64" />
                                    <Button onClick={() => handleSaveNote('pre_op', notes.pre)}>Save Pre-Op</Button>
                                </TabsContent>
                                <TabsContent value="anesthesia" className="space-y-2">
                                    <Textarea value={notes.anaesthesia} onChange={e => setNotes({ ...notes, anaesthesia: e.target.value })} placeholder="Vitals, Drugs, Fluids..." className="h-64" />
                                    <Button onClick={() => handleSaveNote('anaesthesia', notes.anaesthesia)}>Save Record</Button>
                                </TabsContent>
                                <TabsContent value="intra" className="space-y-2">
                                    <Textarea value={notes.intra} onChange={e => setNotes({ ...notes, intra: e.target.value })} placeholder="Surgical procedure details..." className="h-64" />
                                    <Button onClick={() => handleSaveNote('intra_op', notes.intra)}>Save Notes</Button>
                                </TabsContent>
                                <TabsContent value="post" className="space-y-2">
                                    <Textarea value={notes.post} onChange={e => setNotes({ ...notes, post: e.target.value })} placeholder="Recovery orders..." className="h-64" />
                                    <Button onClick={() => handleSaveNote('post_op', notes.post)}>Save Orders</Button>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Right: Billing & Consumables */}
                    <Card className="col-span-3">
                        <CardHeader><CardTitle>Implants & Consumables</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={handleBillItem} className="space-y-2 p-3 border rounded bg-muted/20">
                                <h4 className="text-sm font-semibold">Add Billable Item</h4>
                                <Input name="name" placeholder="Item Name (e.g. Mesh)" required />
                                <Input name="batch" placeholder="Batch/Lot Number" required />
                                <div className="flex gap-2">
                                    <Input name="qty" type="number" placeholder="Qty" defaultValue="1" className="w-20" />
                                    <Input name="cost" type="number" placeholder="Cost" className="flex-1" />
                                </div>
                                <Button type="submit" size="sm" className="w-full">Log & Bill</Button>
                            </form>

                            <div className="space-y-2">
                                {consumables.map(item => (
                                    <div key={item.id} className="text-sm border-b pb-2">
                                        <div className="font-medium">{item.item_name}</div>
                                        <div className="text-xs text-muted-foreground flex justify-between">
                                            <span>Batch: {item.batch_no}</span>
                                            <span>₹{item.cost * item.quantity}</span>
                                        </div>
                                    </div>
                                ))}
                                {consumables.length > 0 && (
                                    <div className="pt-2 border-t font-bold flex justify-between">
                                        <span>Total</span>
                                        <span>₹{consumables.reduce((a, b) => a + (b.cost * b.quantity), 0)}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // --- SCHEDULER VIEW ---
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Syringe className="h-8 w-8 text-primary" />
                    Operation Theatre Manager
                </h1>
                <Dialog open={isBookOpen} onOpenChange={setIsBookOpen}>
                    <DialogTrigger asChild><Button>Book Surgery</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Schedule Procedure</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Patient Search</Label>
                                <Input placeholder="Type Name..." onChange={e => handleSearchPatient(e.target.value)} />
                                {foundPatients.length > 0 && (
                                    <div className="border rounded p-2 max-h-32 overflow-y-auto">
                                        {foundPatients.map(p => (
                                            <div key={p.id} className="p-1 cursor-pointer hover:bg-accent" onClick={() => { setNewBooking({ ...newBooking, patientId: p.id }); setFoundPatients([]); setPatientSearch(p.first_name) }}>
                                                {p.first_name} {p.last_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Procedure Name</Label>
                                <Input onChange={e => setNewBooking({ ...newBooking, procedure: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Theater</Label>
                                <Select onValueChange={v => setNewBooking({ ...newBooking, theaterId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select OT" /></SelectTrigger>
                                    <SelectContent>
                                        {theaters.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Team Inputs */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Surgeon</Label>
                                    <Input onChange={e => setNewBooking({ ...newBooking, surgeon: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Anaesthetist</Label>
                                    <Input onChange={e => setNewBooking({ ...newBooking, anaesthetist: e.target.value })} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Scrub Nurse</Label>
                                    <Input onChange={e => setNewBooking({ ...newBooking, nurse: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Start</Label><Input type="datetime-local" onChange={e => setNewBooking({ ...newBooking, start: e.target.value })} /></div>
                                <div className="space-y-2"><Label>End</Label><Input type="datetime-local" onChange={e => setNewBooking({ ...newBooking, end: e.target.value })} /></div>
                            </div>
                        </div>
                        <DialogFooter><Button onClick={handleBook}>Schedule</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Schedule Board */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {theaters.map(theater => {
                    const theaterSurgeries = surgeries.filter(s => s.theater_id === theater.id)
                    return (
                        <Card key={theater.id} className="h-full">
                            <CardHeader className="bg-muted/50 pb-2">
                                <CardTitle className="flex justify-between items-center text-lg">
                                    {theater.name}
                                    <Badge variant={theater.status === 'AVAILABLE' ? 'outline' : 'secondary'}>{theater.status}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                {theaterSurgeries.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No surgeries scheduled.</p>
                                ) : (
                                    theaterSurgeries.map(surgery => (
                                        <div key={surgery.id} className="p-3 border rounded-lg bg-card hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-semibold text-primary">{surgery.procedure_name}</span>
                                                <Badge className={surgery.status === 'IN-PROGRESS' ? 'bg-green-600' : 'bg-blue-600'}>{surgery.status}</Badge>
                                            </div>
                                            <div className="text-sm space-y-1">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <User className="h-3 w-3" /> {surgery.patients.first_name} {surgery.patients.last_name}
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Clock className="h-3 w-3" /> {new Date(surgery.scheduled_start).toLocaleString()}
                                                </div>
                                            </div>
                                            <Button className="w-full mt-3" size="sm" variant="outline" onClick={() => openConsole(surgery)}>
                                                Open Console
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
