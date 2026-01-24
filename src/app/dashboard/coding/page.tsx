'use client'

import { useState, useEffect } from 'react'
import { searchICD10Local, searchProceduresLocal, finalizeDiagnosis, getCodingHistory } from '@/actions/coding'
import { searchPatients } from '@/actions/patients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Search, FileCheck, DollarSign, Activity, Stethoscope } from 'lucide-react'

export default function CodingDashboard() {
    const [patient, setPatient] = useState<any>(null)

    // Search States
    const [diagSearch, setDiagSearch] = useState('')
    const [procSearch, setProcSearch] = useState('')
    const [diagResults, setDiagResults] = useState<any[]>([])
    const [procResults, setProcResults] = useState<any[]>([])

    // Selected Codes
    const [selectedDiag, setSelectedDiag] = useState<any[]>([])
    const [selectedProc, setSelectedProc] = useState<any[]>([])

    // History
    const [history, setHistory] = useState<any[]>([])
    const [patSearch, setPatSearch] = useState('')
    const [foundPats, setFoundPats] = useState<any[]>([])

    useEffect(() => {
        refreshHistory()
    }, [])

    const refreshHistory = () => {
        getCodingHistory().then(setHistory)
    }

    // --- Handlers ---
    const handlePatSearch = async (q: string) => {
        setPatSearch(q)
        if (q.length > 2) {
            const res = await searchPatients(q)
            setFoundPats(res)
        }
    }

    const handleDiagSearch = async (q: string) => {
        setDiagSearch(q)
        if (q.length > 1) {
            const res = await searchICD10Local(q)
            setDiagResults(res)
        }
    }

    const handleProcSearch = async (q: string) => {
        setProcSearch(q)
        if (q.length > 1) {
            const res = await searchProceduresLocal(q)
            setProcResults(res)
        }
    }

    const addDiag = (code: any) => {
        if (!selectedDiag.find(d => d.code === code.code)) {
            setSelectedDiag([...selectedDiag, code])
        }
        setDiagSearch('')
        setDiagResults([])
    }

    const addProc = (code: any) => {
        if (!selectedProc.find(p => p.code === code.code)) {
            setSelectedProc([...selectedProc, code])
        }
        setProcSearch('')
        setProcResults([])
    }

    const handleSave = async (status: 'DRAFT' | 'FINALIZED') => {
        if (!patient) return toast.error('Select a patient')
        if (status === 'FINALIZED' && (selectedDiag.length === 0 || selectedProc.length === 0)) {
            return toast.error('Cannot finalize without Diagnosis and Procedures')
        }

        const res = await finalizeDiagnosis({
            visitId: 'DUMMY_VISIT_ID', // Needs real visit handling
            patientId: patient.id,
            icdCode: selectedDiag[0]?.code,
            procedureCode: selectedProc[0]?.code
        })

        if (res.success) {
            toast.success(status === 'FINALIZED' ? 'Coding Finalized & Billed' : 'Draft Saved')
            // Reset
            setSelectedDiag([])
            setSelectedProc([])
            setPatient(null)
            refreshHistory()
        } else {
            toast.error(res.error)
        }
    }

    const totalBill = selectedProc.reduce((sum, p) => sum + (p.base_price || 0), 0)

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <FileCheck className="h-8 w-8 text-primary" />
                Clinical Coding & Billing
            </h1>

            <div className="grid md:grid-cols-12 gap-6">
                {/* Left: Input Area */}
                <div className="md:col-span-8 space-y-6">

                    {/* 1. Patient Selection */}
                    <Card>
                        <CardHeader><CardTitle>1. Select Patient</CardTitle></CardHeader>
                        <CardContent>
                            {patient ? (
                                <div className="flex justify-between items-center bg-muted p-2 rounded">
                                    <span className="font-bold">{patient.first_name} {patient.last_name} (UHID: {patient.uhid})</span>
                                    <Button size="sm" variant="ghost" onClick={() => setPatient(null)}>Change</Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Input placeholder="Search Patient Name/UHID..." onChange={e => handlePatSearch(e.target.value)} />
                                    {foundPats.length > 0 && (
                                        <div className="absolute top-10 w-full bg-white border rounded shadow-lg z-10 p-2">
                                            {foundPats.map(p => (
                                                <div key={p.id} className="p-2 hover:bg-muted cursor-pointer" onClick={() => { setPatient(p); setFoundPats([]) }}>
                                                    {p.first_name} {p.last_name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 2. Diagnosis (ICD) */}
                    <Card className={!patient ? 'opacity-50 pointer-events-none' : ''}>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5" /> 2. Diagnosis (ICD-10)</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Input
                                    placeholder="Search Diagnosis (e.g. Diabetes, Fever)..."
                                    value={diagSearch}
                                    onChange={e => handleDiagSearch(e.target.value)}
                                />
                                {diagResults.length > 0 && (
                                    <div className="absolute top-10 w-full bg-white border rounded shadow-lg z-10 max-h-40 overflow-y-auto">
                                        {diagResults.map(d => (
                                            <div key={d.code} className="p-2 hover:bg-muted cursor-pointer flex justify-between" onClick={() => addDiag(d)}>
                                                <span>{d.description}</span>
                                                <Badge variant="outline">{d.code}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedDiag.map(d => (
                                    <Badge key={d.code} className="pl-2 pr-1 py-1 flex items-center gap-2">
                                        {d.code} - {d.description}
                                        <button onClick={() => setSelectedDiag(selectedDiag.filter(x => x.code !== d.code))} className="hover:text-red-300">×</button>
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Procedures (CPT) */}
                    <Card className={!patient ? 'opacity-50 pointer-events-none' : ''}>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> 3. Procedures (CPT)</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Input
                                    placeholder="Search Procedure (e.g. Visit, X-Ray)..."
                                    value={procSearch}
                                    onChange={e => handleProcSearch(e.target.value)}
                                />
                                {procResults.length > 0 && (
                                    <div className="absolute top-10 w-full bg-white border rounded shadow-lg z-10 max-h-40 overflow-y-auto">
                                        {procResults.map(p => (
                                            <div key={p.code} className="p-2 hover:bg-muted cursor-pointer flex justify-between" onClick={() => addProc(p)}>
                                                <span>{p.description}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold">₹{p.base_price}</span>
                                                    <Badge variant="outline">{p.code}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                {selectedProc.map(p => (
                                    <div key={p.code} className="flex justify-between items-center p-2 bg-muted/20 rounded border">
                                        <div>
                                            <div className="font-semibold">{p.description}</div>
                                            <div className="text-xs text-muted-foreground">{p.code}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="font-mono">₹{p.base_price}</div>
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSelectedProc(selectedProc.filter(x => x.code !== p.code))}>×</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Summary & Action */}
                <div className="md:col-span-4 space-y-6">
                    <Card className="bg-primary/5 border-primary/20 sticky top-4">
                        <CardHeader><CardTitle>Coding Summary</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total Billable</span>
                                <span>₹{totalBill.toLocaleString()}</span>
                            </div>

                            <div className="space-y-2">
                                <Button className="w-full gap-2" size="lg" onClick={() => handleSave('FINALIZED')} disabled={!patient}>
                                    <FileCheck className="h-4 w-4" /> Finalize & Bill
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => handleSave('DRAFT')} disabled={!patient}>
                                    Save Draft
                                </Button>
                            </div>

                            <div className="text-xs text-muted-foreground mt-4">
                                <p>Warning: Finalizing locks the record and generates a claim.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {history.slice(0, 5).map(h => (
                                    <div key={h.id} className="text-sm border-b pb-2">
                                        <div className="font-semibold">{h.patients?.first_name} {h.patients?.last_name}</div>
                                        <div className="flex justify-between text-muted-foreground">
                                            <Badge variant={h.status === 'FINALIZED' ? 'default' : 'secondary'} className="text-[10px] h-5">{h.status}</Badge>
                                            <span>₹{h.bill_amount}</span>
                                        </div>
                                        <div className="text-[10px] mt-1 text-gray-400">
                                            {new Date(h.coded_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
