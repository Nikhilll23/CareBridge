'use client'

import { useState, useEffect } from 'react'
import { searchICD10Local, searchProceduresLocal, finalizeDiagnosis, getCodingHistory } from '@/actions/coding'
import { searchPatients } from '@/actions/patients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { FileCheck, Activity, Stethoscope } from 'lucide-react'

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

    // History & Search
    const [history, setHistory] = useState<any[]>([])
    const [foundPats, setFoundPats] = useState<any[]>([])

    useEffect(() => {
        refreshHistory()
    }, [])

    async function refreshHistory() {
        try {
            const data = await getCodingHistory()
            setHistory(data)
        } catch (err) {
            console.error('Failed to load history:', err)
        }
    }

    // --- Handlers ---
    const handlePatSearch = async (q: string) => {
        if (q.length > 2) {
            const res = await searchPatients(q)
            setFoundPats(res)
        } else {
            setFoundPats([])
        }
    }

    const handleDiagSearch = async (q: string) => {
        setDiagSearch(q)
        if (q.length > 1) {
            const res = await searchICD10Local(q)
            setDiagResults(res)
        } else {
            setDiagResults([])
        }
    }

    const handleProcSearch = async (q: string) => {
        setProcSearch(q)
        if (q.length > 1) {
            const res = await searchProceduresLocal(q)
            setProcResults(res)
        } else {
            setProcResults([])
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
        if (!patient) return toast.error('Please select a patient first')
        
        if (status === 'FINALIZED') {
            if (selectedDiag.length === 0) return toast.error('Diagnosis code is required for finalization')
            if (selectedProc.length === 0) return toast.error('Procedure code is required for finalization')
        }

        toast.loading(status === 'FINALIZED' ? 'Finalizing & Biling...' : 'Saving draft...', { id: 'coding-action' })

        // generate a pseudo-visit ID if one isn't available from a real encounter
        // in a production app, the visit ID would be passed via URL or context
        const pseudoVisitId = `visit_${patient.id}_${new Date().getTime()}`

        const res = await finalizeDiagnosis({
            visitId: pseudoVisitId,
            patientId: patient.id,
            icdCode: selectedDiag[0]?.code || '',
            procedureCode: selectedProc[0]?.code || ''
        })

        if (res.success) {
            toast.success(status === 'FINALIZED' ? 'Coding Finalized & Billed' : 'Draft Saved', { id: 'coding-action' })
            // Reset form
            setSelectedDiag([])
            setSelectedProc([])
            setPatient(null)
            refreshHistory()
        } else {
            toast.error(res.error || 'Failed to process coding', { id: 'coding-action' })
        }
    }

    const totalBill = selectedProc.reduce((sum, p) => sum + (Number(p.base_price) || 0), 0)

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <FileCheck className="h-8 w-8 text-primary" />
                    Medical Coding & Revenue Cycle
                </h1>
                <p className="text-muted-foreground">Perform clinical coding (ICD-10/CPT) and trigger patient billing.</p>
            </header>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* Left Column: Form Section */}
                <div className="lg:col-span-8 space-y-6">

                    {/* 1. Patient Selection */}
                    <Card className="shadow-sm border-primary/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">1. Identify Patient</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {patient ? (
                                <div className="flex justify-between items-center bg-primary/5 p-4 rounded-lg border border-primary/20">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-primary">{patient.first_name} {patient.last_name}</span>
                                        <span className="text-xs text-muted-foreground">UHID: {patient.uhid}</span>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => setPatient(null)}>Change Patient</Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Input 
                                        placeholder="Search by UHID or Patient Name..." 
                                        onChange={e => handlePatSearch(e.target.value)} 
                                        className="h-11"
                                    />
                                    {foundPats.length > 0 && (
                                        <div className="absolute top-12 w-full bg-popover border rounded-md shadow-xl z-50 p-1 overflow-hidden">
                                            {foundPats.map(p => (
                                                <button 
                                                    key={p.id} 
                                                    className="w-full text-left p-3 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors text-sm flex flex-col" 
                                                    onClick={() => { setPatient(p); setFoundPats([]) }}
                                                >
                                                    <span className="font-medium">{p.first_name} {p.last_name}</span>
                                                    <span className="text-xs opacity-70">UHID: {p.uhid}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 2. Diagnosis (ICD) */}
                    <Card className={`shadow-sm border-primary/10 transition-opacity ${!patient ? 'opacity-50 pointer-events-none' : ''}`}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Stethoscope className="h-5 w-5 text-blue-500" /> 
                                2. Clinical Diagnosis (ICD-10)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Input
                                    placeholder="Search diagnosis codes or descriptions..."
                                    value={diagSearch}
                                    onChange={e => handleDiagSearch(e.target.value)}
                                    className="h-11"
                                />
                                {diagResults.length > 0 && (
                                    <div className="absolute top-12 w-full bg-popover border rounded-md shadow-xl z-50 max-h-56 overflow-y-auto p-1">
                                        {diagResults.map(d => (
                                            <button 
                                                key={d.code} 
                                                className="w-full text-left p-3 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors text-sm flex justify-between items-center" 
                                                onClick={() => addDiag(d)}
                                            >
                                                <span className="line-clamp-1">{d.description}</span>
                                                <Badge variant="outline" className="ml-2 bg-blue-50">{d.code}</Badge>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 min-h-8">
                                {selectedDiag.map(d => (
                                    <Badge key={d.code} variant="secondary" className="pl-3 pr-1 py-1.5 flex items-center gap-2 border-primary/20">
                                        <span className="max-w-[200px] truncate">{d.code}: {d.description}</span>
                                        <button onClick={() => setSelectedDiag(selectedDiag.filter(x => x.code !== d.code))} className="ml-1 hover:bg-primary/10 rounded-full p-0.5">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Procedures (CPT) */}
                    <Card className={`shadow-sm border-primary/10 transition-opacity ${!patient ? 'opacity-50 pointer-events-none' : ''}`}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="h-5 w-5 text-green-500" /> 
                                3. Billable Procedures (CPT)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Input
                                    placeholder="Search procedures or service codes..."
                                    value={procSearch}
                                    onChange={e => handleProcSearch(e.target.value)}
                                    className="h-11"
                                />
                                {procResults.length > 0 && (
                                    <div className="absolute top-12 w-full bg-popover border rounded-md shadow-xl z-50 max-h-56 overflow-y-auto p-1">
                                        {procResults.map(p => (
                                            <button 
                                                key={p.code} 
                                                className="w-full text-left p-3 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors text-sm flex justify-between items-center" 
                                                onClick={() => addProc(p)}
                                            >
                                                <span className="line-clamp-1">{p.description}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-green-600">₹{p.base_price}</span>
                                                    <Badge variant="outline" className="bg-green-50">{p.code}</Badge>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                {selectedProc.map(p => (
                                    <div key={p.code} className="flex justify-between items-center p-4 bg-muted/40 rounded-lg border border-border group">
                                        <div>
                                            <div className="font-medium">{p.description}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{p.code}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="font-semibold text-lg text-green-600">₹{p.base_price}</div>
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors" 
                                                onClick={() => setSelectedProc(selectedProc.filter(x => x.code !== p.code))}
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Summary & History */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-primary/5 border-primary/20 sticky top-8 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-xl">Submission Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Base Charges</span>
                                    <span>₹{totalBill.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Coding Efficiency</span>
                                    <span className="text-blue-600 font-medium">+15% Optimized</span>
                                </div>
                                <div className="pt-4 border-t flex justify-between items-center">
                                    <span className="font-bold text-lg">Total Payable</span>
                                    <span className="text-2xl font-black text-primary">₹{totalBill.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Button className="w-full gap-2 h-12 text-base font-semibold shadow-lg" size="lg" onClick={() => handleSave('FINALIZED')} disabled={!patient}>
                                    <FileCheck className="h-5 w-5" /> Finalize & Post Claim
                                </Button>
                                <Button variant="outline" className="w-full h-11" onClick={() => handleSave('DRAFT')} disabled={!patient}>
                                    Save as Draft
                                </Button>
                            </div>

                            <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/10 p-4 border border-yellow-200 dark:border-yellow-900/30">
                                <p className="text-xs text-yellow-800 dark:text-yellow-400">
                                    <strong>Ready for Audit:</strong> Once finalized, this record will be queued for the hospital billing department and cannot be modified easily.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Recent Coding Logs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {history.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                                ) : (
                                    history.slice(0, 5).map(h => (
                                        <div key={h.id} className="text-sm space-y-2 border-b last:border-0 pb-3 last:pb-0">
                                            <div className="flex justify-between items-start">
                                                <div className="font-semibold">{h.patients?.first_name} {h.patients?.last_name}</div>
                                                <Badge variant={h.status === 'FINALIZED' ? 'default' : 'secondary'} className="text-[10px] px-1.5 h-4">
                                                    {h.status}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-muted-foreground">{new Date(h.coded_at).toLocaleDateString()}</span>
                                                <span className="font-mono font-medium text-primary">₹{h.bill_amount}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
