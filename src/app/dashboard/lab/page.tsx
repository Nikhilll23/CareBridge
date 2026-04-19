'use client'

import { useState, useEffect } from 'react'
import { createLabOrder, getLabOrders, getLabTests, collectSample, submitResult, verifyReport } from '@/actions/lab'
import { searchPatients } from '@/actions/patients'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { FlaskConical, Syringe, CheckCircle, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function LabDashboard() {
    const [orders, setOrders] = useState<any[]>([])
    const [view, setView] = useState('PHLEBOTOMY')
    const [tests, setTests] = useState<any[]>([])
    const [isOrderOpen, setIsOrderOpen] = useState(false)
    const [selectedTests, setSelectedTests] = useState<string[]>([])
    const [patientId, setPatientId] = useState('')
    const [patientName, setPatientName] = useState('')
    const [patientSearch, setPatientSearch] = useState('')
    const [patientResults, setPatientResults] = useState<any[]>([])

    useEffect(() => {
        refresh()
        getLabTests().then(setTests)
    }, [])

    async function refresh() {
        const all = await getLabOrders()
        setOrders(all)
    }

    const filteredOrders = (status: string) => orders.filter(o => o.status === status)

    const handlePatientSearch = async (q: string) => {
        setPatientSearch(q)
        setPatientName('')
        setPatientId('')
        if (q.length >= 2) {
            const res = await searchPatients(q)
            setPatientResults(res)
        } else {
            setPatientResults([])
        }
    }

    const selectPatient = (p: any) => {
        setPatientId(p.id)
        setPatientName(p.name)
        setPatientSearch(p.name)
        setPatientResults([])
    }

    const handleCreateOrder = async () => {
        if (!patientId) return toast.error('Please select a patient')
        if (selectedTests.length === 0) return toast.error('Select at least one test')
        await createLabOrder(patientId, selectedTests, 'Doctor-01')
        toast.success('Lab order created successfully')
        setIsOrderOpen(false)
        setPatientId('')
        setPatientName('')
        setPatientSearch('')
        setSelectedTests([])
        refresh()
    }

    const handleCollect = async (id: string) => {
        await collectSample(id, 'Phleb-01')
        toast.success('Sample Collected')
        refresh()
    }

    const handleResultSubmit = async (resId: string, valStr: string) => {
        const val = parseFloat(valStr)
        const res = await submitResult(resId, val, 'Tech-01')
        if (res.success) {
            if (res.isCritical) toast.error('CRITICAL VALUE DETECTED!')
            else toast.success('Result Saved')
            refresh()
        }
    }

    const handleVerify = async (id: string) => {
        await verifyReport(id, 'Path-01')
        toast.success('Report Verified')
        refresh()
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <FlaskConical className="h-8 w-8 text-primary" />
                    Diagnostic Lab
                </h1>
                <Dialog open={isOrderOpen} onOpenChange={setIsOrderOpen}>
                    <DialogTrigger asChild><Button>+ New Order (Sim)</Button></DialogTrigger>
                    <DialogContent className="max-w-md flex flex-col" style={{ maxHeight: '85vh' }}>
                        <DialogHeader><DialogTitle>New Lab Order</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
                            {/* Patient Search */}
                            <div className="space-y-1">
                                <Label>Search Patient</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        className="pl-9"
                                        placeholder="Type name or UHID..."
                                        value={patientSearch}
                                        onChange={e => handlePatientSearch(e.target.value)}
                                    />
                                </div>
                                {patientResults.length > 0 && (
                                    <div className="border rounded-md shadow-md bg-popover max-h-40 overflow-y-auto">
                                        {patientResults.map(p => (
                                            <div
                                                key={p.id}
                                                className="px-3 py-2 hover:bg-accent cursor-pointer text-sm border-b last:border-0"
                                                onClick={() => selectPatient(p)}
                                            >
                                                <div className="font-medium">{p.name}</div>
                                                <div className="text-xs text-muted-foreground">{p.uhid}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {patientName && (
                                    <p className="text-xs text-green-600 font-medium">✓ Selected: {patientName}</p>
                                )}
                            </div>

                            {/* Test Selection */}
                            <div className="space-y-2">
                                <Label>Select Tests ({selectedTests.length} selected)</Label>
                                <div className="border rounded-md p-3 space-y-2 max-h-64 overflow-y-auto">
                                    {tests.map(t => (
                                        <div key={t.id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={t.id}
                                                checked={selectedTests.includes(t.id)}
                                                onCheckedChange={(c) => {
                                                    c ? setSelectedTests([...selectedTests, t.id])
                                                      : setSelectedTests(selectedTests.filter(id => id !== t.id))
                                                }}
                                            />
                                            <label htmlFor={t.id} className="text-sm cursor-pointer flex-1">
                                                {t.test_name}
                                                <span className="text-muted-foreground ml-2">₹{t.price}</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="border-t pt-3 mt-2">
                            <Button variant="outline" onClick={() => setIsOrderOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateOrder}>Submit Order</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="PHLEBOTOMY" onValueChange={setView}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="PHLEBOTOMY">Phlebotomy (Collection)</TabsTrigger>
                    <TabsTrigger value="Tech">Technician (Processing)</TabsTrigger>
                    <TabsTrigger value="PATH">Pathologist (Verification)</TabsTrigger>
                </TabsList>

                {/* 1. PHLEBOTOMY QUEUE */}
                <TabsContent value="PHLEBOTOMY">
                    <div className="grid md:grid-cols-2 gap-4">
                        {filteredOrders('ORDERED').map(o => (
                            <Card key={o.id}>
                                <CardHeader className="flex flex-row justify-between items-center">
                                    <CardTitle>{o.patients?.first_name} {o.patients?.last_name}</CardTitle>
                                    <Button size="sm" onClick={() => handleCollect(o.id)}><Syringe className="mr-2 h-4 w-4" /> Collect Sample</Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground">
                                        Tests: {o.lab_results.map((r: any) => r.lab_test_master.test_name).join(', ')}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {filteredOrders('ORDERED').length === 0 && <div className="p-8 text-center text-muted-foreground">List Empty</div>}
                    </div>
                </TabsContent>

                {/* 2. TECHNICIAN WORKLIST */}
                <TabsContent value="Tech">
                    <div className="space-y-4">
                        {filteredOrders('PROCESSING').map(o => (
                            <Card key={o.id}>
                                <CardHeader>
                                    <CardTitle>{o.patients?.first_name} {o.patients?.last_name}</CardTitle>
                                    <CardDescription>UHID: {o.patients?.uhid}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {o.lab_results.map((res: any) => (
                                            <div key={res.id} className="flex items-center gap-4">
                                                <div className="w-1/3 font-medium">
                                                    {res.lab_test_master.test_name}
                                                    <span className="text-xs text-muted-foreground block">
                                                        Ref: {res.lab_test_master.ref_range_min}-{res.lab_test_master.ref_range_max} {res.lab_test_master.unit}
                                                    </span>
                                                </div>
                                                <Input
                                                    type="number"
                                                    className={res.is_abnormal ? 'border-red-500 bg-red-50' : ''}
                                                    placeholder="Enter Value"
                                                    defaultValue={res.result_value}
                                                    onBlur={(e) => handleResultSubmit(res.id, e.target.value)}
                                                />
                                                {res.is_critical && <Badge variant="destructive" className="animate-pulse">CRITICAL</Badge>}
                                                {res.is_abnormal && !res.is_critical && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Abnormal</Badge>}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {filteredOrders('PROCESSING').length === 0 && <div className="p-8 text-center text-muted-foreground">No Pending Tests</div>}
                    </div>
                </TabsContent>

                {/* 3. PATHOLOGIST VERIFICATION */}
                <TabsContent value="PATH">
                    <div className="space-y-4">
                        {filteredOrders('PROCESSING').map(o => {
                            // Only show if all results entered? For now show all processing to verify semi-complete
                            const hasResults = o.lab_results.some((r: any) => r.result_value !== null)
                            if (!hasResults) return null;

                            return (
                                <Card key={o.id} className="border-l-4 border-purple-500">
                                    <CardHeader className="flex flex-row justify-between">
                                        <CardTitle>{o.patients?.first_name} {o.patients?.last_name}</CardTitle>
                                        <Button onClick={() => handleVerify(o.id)}><CheckCircle className="mr-2 h-4 w-4" /> Verify & Sign</Button>
                                    </CardHeader>
                                    <CardContent>
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left font-bold text-muted-foreground">
                                                    <th>Test</th>
                                                    <th>Result</th>
                                                    <th>Unit</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {o.lab_results.map((res: any) => (
                                                    <tr key={res.id} className={res.is_critical ? 'bg-red-50 font-bold text-red-700' : ''}>
                                                        <td className="py-2">{res.lab_test_master.test_name}</td>
                                                        <td className="py-2">{res.result_value}</td>
                                                        <td className="py-2">{res.lab_test_master.unit}</td>
                                                        <td className="py-2">
                                                            {res.is_critical ? 'CRITICAL' : (res.is_abnormal ? 'Abnormal' : 'Normal')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
