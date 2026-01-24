'use client'

import { useState, useEffect } from 'react'
import { getDueMeds, recordVitals, getPatientVitals, administerMed, addNursingNote, getNotes, getMarHistory } from '@/actions/nursing'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Activity, Syringe, Clipboard, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

export default function NursingDashboard() {
    // State
    const [view, setView] = useState<'WARD' | 'EXECUTION'>('WARD')
    const [selectedPatient, setSelectedPatient] = useState<any>(null)
    const [patients, setPatients] = useState<any[]>([]) // Derived from Meds list for demo

    // Execution Data
    const [vitalsHistory, setVitalsHistory] = useState<any[]>([])
    const [marHistory, setMarHistory] = useState<any[]>([])
    const [notes, setNotes] = useState<any[]>([])

    // Forms
    const [vitalsForm, setVitalsForm] = useState({ temp: 37, bpSys: 120, bpDia: 80, hr: 72, spo2: 98 })
    const [noteContent, setNoteContent] = useState('')

    useEffect(() => {
        loadWard()
    }, [])

    const loadWard = async () => {
        // Fetch "Active Patients" via Due Meds or simple patient list
        // For demo, getDueMeds returns prescriptions with patient data
        const meds = await getDueMeds('ICU-1')
        // Unique patients
        const uniquePats = Array.from(new Set(meds.map((m: any) => JSON.stringify(m.patients)))).map((s: any) => JSON.parse(s))
        // Enhance with IDs from Meds roughly or just use the first match
        // Correcting: getDueMeds returns prescriptions. We need to group by patient.

        // Let's simplified: View active prescriptions as "Patients to see"
        setPatients(meds)
    }

    const selectPatient = async (p: any, presId: string) => {
        // p is patient object, presId is prescription context
        setSelectedPatient({ ...p, currentPrescriptionId: presId })
        setView('EXECUTION')
        refreshPatientData(p.id)
    }

    const refreshPatientData = async (patId: string) => {
        getPatientVitals(patId).then(setVitalsHistory)
        getMarHistory(patId).then(setMarHistory)
        getNotes(patId).then(setNotes)
    }

    const handleVitalsSubmit = async () => {
        const res = await recordVitals({
            patientId: selectedPatient.id,
            ...vitalsForm,
            nurseId: 'Nurse-01'
        })
        if (res.success) {
            toast.success('Vitals Recorded')
            refreshPatientData(selectedPatient.id)
        } else {
            toast.error(res.error)
        }
    }

    const handleMedAdmin = async (status: 'GIVEN' | 'REFUSED') => {
        const res = await administerMed(
            selectedPatient.currentPrescriptionId,
            selectedPatient.id,
            status,
            ' routine load',
            'Nurse-01'
        )
        if (res.success) {
            toast.success(`Medication ${status}`)
            refreshPatientData(selectedPatient.id)
        }
    }

    const handleNoteSubmit = async () => {
        await addNursingNote({
            patient_id: selectedPatient.id,
            note_type: 'PROGRESS',
            content: noteContent,
            nurse_id: 'Nurse-01'
        })
        setNoteContent('')
        refreshPatientData(selectedPatient.id)
        toast.success('Note Added')
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Clipboard className="h-8 w-8 text-primary" />
                    Nursing Station
                </h1>
                {view === 'EXECUTION' && (
                    <Button variant="outline" onClick={() => setView('WARD')}>Back to Ward View</Button>
                )}
            </div>

            {view === 'WARD' ? (
                <div className="grid md:grid-cols-3 gap-6">
                    {patients.map((item: any) => (
                        <Card key={item.id} className="cursor-pointer hover:border-primary transition-all" onClick={() => selectPatient(item.patients, item.id)}>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex justify-between">
                                    {item.patients?.first_name} {item.patients?.last_name}
                                    <Badge>Bed 101</Badge> {/* Mock Bed */}
                                </CardTitle>
                                <CardDescription>UHID: {item.patients?.uhid}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Syringe className="h-4 w-4 text-orange-500" />
                                        Due Now: {item.drug_name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Last Vitals: 2h ago
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {patients.length === 0 && <div className="p-8 text-muted-foreground">No active tasks/meds found.</div>}
                </div>
            ) : (
                <div className="grid md:grid-cols-12 gap-6">
                    {/* Sidebar Info */}
                    <div className="md:col-span-3 space-y-4">
                        <Card className="bg-muted/30">
                            <CardHeader>
                                <CardTitle>{selectedPatient.first_name} {selectedPatient.last_name}</CardTitle>
                                <CardDescription>Age: 45 | Sex: M</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Badge variant="destructive" className="w-full justify-center">Fall Risk: High</Badge>
                                <Badge variant="outline" className="w-full justify-center">Allergy: Penicillin</Badge>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Tabs */}
                    <div className="md:col-span-9">
                        <Tabs defaultValue="vitals">
                            <TabsList className="w-full justify-start">
                                <TabsTrigger value="vitals">Vitals & Trends</TabsTrigger>
                                <TabsTrigger value="mar">MAR (Meds)</TabsTrigger>
                                <TabsTrigger value="notes">Nursing Notes</TabsTrigger>
                            </TabsList>

                            {/* VITALS TAB */}
                            <TabsContent value="vitals" className="space-y-6">
                                <Card>
                                    <CardHeader><CardTitle>Record New Vitals</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-5 gap-4 items-end">
                                            <div className="space-y-1"><Label>Temp (°C)</Label><Input type="number" value={vitalsForm.temp} onChange={e => setVitalsForm({ ...vitalsForm, temp: parseFloat(e.target.value) })} /></div>
                                            <div className="space-y-1"><Label>HR (bpm)</Label><Input type="number" value={vitalsForm.hr} onChange={e => setVitalsForm({ ...vitalsForm, hr: parseInt(e.target.value) })} /></div>
                                            <div className="space-y-1"><Label>SpO2 (%)</Label><Input type="number" value={vitalsForm.spo2} onChange={e => setVitalsForm({ ...vitalsForm, spo2: parseInt(e.target.value) })} /></div>
                                            <div className="space-y-1"><Label>BP (Sys)</Label><Input type="number" value={vitalsForm.bpSys} onChange={e => setVitalsForm({ ...vitalsForm, bpSys: parseInt(e.target.value) })} /></div>
                                            <div className="space-y-1"><Label>BP (Dia)</Label><Input type="number" value={vitalsForm.bpDia} onChange={e => setVitalsForm({ ...vitalsForm, bpDia: parseInt(e.target.value) })} /></div>
                                        </div>
                                        <Button className="mt-4 w-full" onClick={handleVitalsSubmit}>Save Vitals</Button>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle>24-Hour Trend (HR & SpO2)</CardTitle></CardHeader>
                                    <CardContent className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={vitalsHistory}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="recorded_at" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit' })} />
                                                <YAxis />
                                                <Tooltip labelFormatter={(t) => new Date(t).toLocaleString()} />
                                                <Line type="monotone" dataKey="heart_rate" stroke="#ef4444" name="Heart Rate" />
                                                <Line type="monotone" dataKey="spo2" stroke="#3b82f6" name="SpO2" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* MAR TAB */}
                            <TabsContent value="mar" className="space-y-4">
                                <Card className="border-l-4 border-l-blue-500">
                                    <CardHeader>
                                        <CardTitle>Due Now</CardTitle>
                                        <CardDescription>Scheduled Medication</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex justify-between items-center">
                                        <div>
                                            {/* In real app, we fetch the specific drug details from ID */}
                                            <div className="text-xl font-bold">Current Prescription</div>
                                            <div className="text-sm text-muted-foreground">Route: Oral • Frequency: BID</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleMedAdmin('REFUSED')}>
                                                <XCircle className="mr-2 h-4 w-4" /> Refused
                                            </Button>
                                            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleMedAdmin('GIVEN')}>
                                                <CheckCircle className="mr-2 h-4 w-4" /> Mark Given
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="space-y-2">
                                    <h3 className="font-semibold text-sm text-muted-foreground">Administration History</h3>
                                    {marHistory.map(m => (
                                        <div key={m.id} className="flex justify-between items-center p-3 bg-muted/20 rounded border">
                                            <div>
                                                <span className="font-bold">{new Date(m.administered_at).toLocaleTimeString()}</span>
                                                <span className="ml-2 text-sm">{m.medication_name || 'Rx Item'}</span>
                                            </div>
                                            <Badge variant={m.status === 'GIVEN' ? 'default' : 'destructive'}>{m.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            {/* NOTES TAB */}
                            <TabsContent value="notes" className="space-y-4">
                                <div className="space-y-2">
                                    <Textarea placeholder="Enter progress note..." value={noteContent} onChange={e => setNoteContent(e.target.value)} />
                                    <Button onClick={handleNoteSubmit}>Add Note</Button>
                                </div>
                                <div className="space-y-4 mt-4">
                                    {notes.map(n => (
                                        <Card key={n.id}>
                                            <CardContent className="pt-4">
                                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                    <span>{new Date(n.created_at).toLocaleString()}</span>
                                                    <span className="uppercase font-bold">{n.note_type}</span>
                                                </div>
                                                <p>{n.content}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            )}
        </div>
    )
}
