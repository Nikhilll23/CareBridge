'use client'

import { useState, useRef } from 'react'
import { generateFinalBill, searchTariff, addMiscCharge, applyDiscount, finalizeBill } from '@/actions/billing'
import { searchPatients } from '@/actions/patients'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PaymentButton } from '@/components/modules/billing/PaymentButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Search, Printer, Plus, ShieldAlert, Receipt, CreditCard } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { useUser } from '@clerk/nextjs' // Assuming Auth

export default function BillingDashboard() {
    const [patient, setPatient] = useState<any>(null)
    const [billData, setBillData] = useState<any>(null)

    // Search States
    const [patSearch, setPatSearch] = useState('')
    const [foundPats, setFoundPats] = useState<any[]>([])

    // Misc Charge State
    const [tariffSearch, setTariffSearch] = useState('')
    const [tariffResults, setTariffResults] = useState<any[]>([])

    // Discount State
    const [discountAmt, setDiscountAmt] = useState('')
    const [discountReason, setDiscountReason] = useState('')
    const [isDiscountOpen, setIsDiscountOpen] = useState(false)
    const [adminRoleMock, setAdminRoleMock] = useState('RECEPTIONIST') // Toggle for demo

    // --- Search Patient ---
    const handlePatSearch = async (q: string) => {
        setPatSearch(q)
        if (q.length > 2) {
            const res = await searchPatients(q)
            setFoundPats(res)
        }
    }

    const loadBill = async (pat: any) => {
        setPatient(pat)
        setFoundPats([])
        setPatSearch('')
        const res = await generateFinalBill(pat.id)
        if (res.success) {
            setBillData(res.data)
        } else {
            toast.error(res.error)
            setBillData(null)
        }
    }

    // --- Actions ---
    const handleTariffSearch = async (q: string) => {
        setTariffSearch(q)
        if (q.length > 1) {
            const res = await searchTariff(q)
            setTariffResults(res)
        }
    }

    const handleAddCharge = async (item: any) => {
<<<<<<< Updated upstream
        if (!billData?.invoice?.id) return
=======
        if (!billData) return
>>>>>>> Stashed changes
        await addMiscCharge(billData.invoice.id, item)
        toast.success('Charge Added')
        setTariffSearch('')
        setTariffResults([])
        loadBill(patient) // Refresh
    }

    const handleApplyDiscount = async () => {
<<<<<<< Updated upstream
        if (!billData?.invoice?.id) return
=======
        if (!billData) return
>>>>>>> Stashed changes
        const res = await applyDiscount(billData.invoice.id, parseFloat(discountAmt), discountReason, adminRoleMock)
        if (res.success) {
            toast.success('Discount Approved & Applied')
            setIsDiscountOpen(false)
            loadBill(patient)
        } else {
            toast.error(res.error)
        }
    }

    const handleFinalize = async () => {
        if (!billData) return
        await finalizeBill(billData.invoice.id)
        toast.success('Bill Finalized')
        loadBill(patient)
        setTimeout(() => window.print(), 500)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Receipt className="h-8 w-8 text-primary" />
                    Centralized Billing
                </h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Demo Role:</span>
                    <Button
                        variant={adminRoleMock === 'ADMIN' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAdminRoleMock('ADMIN')}
                    >Admin</Button>
                    <Button
                        variant={adminRoleMock === 'RECEPTIONIST' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAdminRoleMock('RECEPTIONIST')}
                    >Receptionist</Button>
                </div>
            </div>

            <div className="grid md:grid-cols-12 gap-6">
                {/* LEFT: Search & Controls (Hidden in Print) */}
                <div className="md:col-span-4 space-y-4 print:hidden">
                    <Card>
                        <CardHeader><CardTitle>1. Select Patient</CardTitle></CardHeader>
                        <CardContent>
                            <div className="relative">
                                <Input placeholder="Search Name/UHID..." onChange={e => handlePatSearch(e.target.value)} />
                                {foundPats.length > 0 && (
                                    <div className="absolute top-10 w-full bg-white border rounded shadow-lg z-10 p-2">
                                        {foundPats.map(p => (
                                            <div key={p.id} className="p-2 hover:bg-muted cursor-pointer" onClick={() => loadBill(p)}>
                                                {p.first_name} {p.last_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {billData && (
                        <Card>
                            <CardHeader><CardTitle>2. Add Charges</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="relative">
                                    <Label>Search Tariff</Label>
                                    <Input
                                        placeholder="e.g. Bed Charge, Gloves..."
                                        value={tariffSearch}
                                        onChange={e => handleTariffSearch(e.target.value)}
                                    />
                                    {tariffResults.length > 0 && (
                                        <div className="absolute top-16 w-full bg-white border rounded shadow-lg z-10 p-2">
                                            {tariffResults.map(t => (
                                                <div key={t.code} className="p-2 hover:bg-muted cursor-pointer flex justify-between" onClick={() => handleAddCharge(t)}>
                                                    <span>{t.name}</span>
                                                    <span className="font-bold">₹{t.unit_price}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* RIGHT: The Bill (A4) */}
                <div className="md:col-span-8">
                    {billData && billData.invoice ? (
                        <Card className="min-h-[800px] shadow-lg print:shadow-none print:border-none">
                            <CardContent className="p-8 space-y-8">
                                {/* Header */}
                                <div className="flex justify-between border-b pb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold">City General Hospital</h2>
                                        <p className="text-muted-foreground">123 Health Avenue, Med City</p>
                                        <p className="text-sm mt-2">GSTIN: 29AAAAA0000A1Z5</p>
                                    </div>
                                    <div className="text-right">
                                        <h3 className="text-xl font-bold uppercase text-primary">Invoice</h3>
                                        <p className="text-sm">#INV-{billData?.invoice?.id?.slice(0, 8)}</p>
                                        <Badge variant={billData?.invoice?.status === 'FINALIZED' ? 'default' : 'secondary'}>
                                            {billData?.invoice?.status}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Patient Info */}
                                <div className="grid grid-cols-2 text-sm">
                                    <div>
                                        <p className="font-bold">Bill To:</p>
                                        <p className="text-lg">{patient.first_name} {patient.last_name}</p>
                                        <p>UHID: {patient.uhid}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">Details:</p>
                                        <p>Admitted: {new Date().toLocaleDateString()}</p>
                                        <p>Bill Date: {new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <table className="w-full text-sm">
                                    <thead className="border-b">
                                        <tr className="text-left font-bold text-muted-foreground">
                                            <th className="py-2">Description</th>
                                            <th className="py-2">Source</th>
                                            <th className="py-2 text-center">Qty</th>
                                            <th className="py-2 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {billData.items.map((item: any) => (
                                            <tr key={item.id}>
                                                <td className="py-3">{item.description}</td>
                                                <td className="py-3"><Badge variant="outline" className="text-[10px]">{item.source_module || 'MANUAL'}</Badge></td>
                                                <td className="py-3 text-center">{item.quantity}</td>
                                                <td className="py-3 text-right">₹{(item.total_price || 0).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Totals */}
                                <div className="flex justify-end pt-6">
                                    <div className="w-64 space-y-2">
                                        <div className="flex justify-between">
                                            <span>Subtotal:</span>
                                            <span>₹{billData.totals.subtotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-red-600">
                                            <span>Discount:</span>
                                            <span>- ₹{billData.totals.discount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                                            <span>Total Due:</span>
                                            <span>₹{billData.totals.grandTotal.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions (Hidden in Print) */}
                                <div className="flex justify-end gap-2 mt-8 print:hidden">
                                    {billData.invoice.status !== 'FINALIZED' && (
                                        <>
                                            <Dialog open={isDiscountOpen} onOpenChange={setIsDiscountOpen}>
                                                <DialogTrigger asChild><Button variant="outline"><ShieldAlert className="h-4 w-4 mr-2" /> Apply Discount</Button></DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader><DialogTitle>Authorize Discount</DialogTitle></DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" onChange={e => setDiscountAmt(e.target.value)} /></div>
                                                        <div className="space-y-2"><Label>Reason</Label><Input onChange={e => setDiscountReason(e.target.value)} /></div>
                                                        <p className="text-xs text-muted-foreground">Note: Requires 'ADMIN' role.</p>
                                                    </div>
                                                    <DialogFooter><Button onClick={handleApplyDiscount}>Authorize</Button></DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                            <Button onClick={handleFinalize}><Printer className="h-4 w-4 mr-2" /> Finalize & Print</Button>
                                        </>
                                    )}
                                    {billData.invoice.status === 'FINALIZED' && (
                                        <div className="flex gap-2">
                                            <PaymentButton
                                                patientId={patient.id}
                                                amount={billData.totals.grandTotal}
                                                description={`Invoice #${billData.invoice.id.slice(0, 8)}`}
                                                onSuccess={() => loadBill(patient)}
                                            />
                                            <Button onClick={() => window.print()} variant="secondary"><Printer className="h-4 w-4 mr-2" /> Reprint</Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                            Select a patient to view bill
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
