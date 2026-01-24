'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Search, Plus, Trash2, Download, Send, Loader2 } from 'lucide-react'
import { searchPatients } from '@/actions/patients'
import { searchMedicinesFDA, createBillingInvoice, getPatientBalance } from '@/actions/receptionist'
import { toast } from 'sonner'
import jsPDF from 'jspdf'

export function BillingCounterClient() {
    const [patientQuery, setPatientQuery] = useState('')
    const [patients, setPatients] = useState<any[]>([])
    const [selectedPatient, setSelectedPatient] = useState<any>(null)
    const [patientBalance, setPatientBalance] = useState<any>(null)

    const [medicineQuery, setMedicineQuery] = useState('')
    const [medicines, setMedicines] = useState<any[]>([])
    const [searchingMedicines, setSearchingMedicines] = useState(false)

    const [billItems, setBillItems] = useState<any[]>([])
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'INSURANCE'>('CASH')
    const [notes, setNotes] = useState('')
    const [processing, setProcessing] = useState(false)

    const handleSearchPatients = async () => {
        if (!patientQuery.trim()) return
        const results = await searchPatients(patientQuery)
        setPatients(results)
    }

    const handleSelectPatient = async (patient: any) => {
        setSelectedPatient(patient)
        setPatients([])
        setPatientQuery('')

        // Load patient balance
        const balanceResult = await getPatientBalance(patient.id)
        if (balanceResult.success) {
            setPatientBalance(balanceResult.balance)
        }
    }

    const handleSearchMedicines = async () => {
        if (!medicineQuery.trim()) return
        setSearchingMedicines(true)
        const result = await searchMedicinesFDA(medicineQuery)
        setSearchingMedicines(false)

        if (result.success) {
            setMedicines(result.medicines || [])
            if (result.medicines?.length === 0) {
                toast.info('No medicines found in OpenFDA database')
            }
        } else {
            toast.error(result.error || 'Failed to search medicines')
        }
    }

    const handleAddMedicine = (medicine: any) => {
        const newItem = {
            name: medicine.name,
            type: 'MEDICINE',
            quantity: 1,
            price: 100, // Default price, can be edited
            ndc: medicine.ndc,
            manufacturer: medicine.manufacturer
        }
        setBillItems([...billItems, newItem])
        setMedicines([])
        setMedicineQuery('')
        toast.success('Medicine added to bill')
    }

    const handleAddManualItem = (type: string) => {
        const itemNames: any = {
            CONSULTATION: 'Consultation Fee',
            LAB: 'Lab Test',
            PROCEDURE: 'Medical Procedure'
        }

        const newItem = {
            name: itemNames[type] || 'Item',
            type,
            quantity: 1,
            price: type === 'CONSULTATION' ? 500 : 0
        }
        setBillItems([...billItems, newItem])
    }

    const handleUpdateItem = (index: number, field: string, value: any) => {
        const updated = [...billItems]
        updated[index] = { ...updated[index], [field]: value }
        setBillItems(updated)
    }

    const handleRemoveItem = (index: number) => {
        setBillItems(billItems.filter((_, i) => i !== index))
    }

    const calculateTotal = () => {
        const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        const tax = subtotal * 0.05
        return { subtotal, tax, total: subtotal + tax }
    }

    const handleGenerateInvoice = async () => {
        if (!selectedPatient) {
            toast.error('Please select a patient')
            return
        }
        if (billItems.length === 0) {
            toast.error('Please add at least one item')
            return
        }

        setProcessing(true)
        const result = await createBillingInvoice({
            patientId: selectedPatient.id,
            items: billItems,
            paymentMethod,
            notes
        })
        setProcessing(false)

        if (result.success) {
            toast.success('Invoice created successfully!')

            // Generate and download PDF
            generatePDF(result.payment)

            // Reset form
            setSelectedPatient(null)
            setBillItems([])
            setNotes('')
            setPatientBalance(null)
        } else {
            toast.error(result.error || 'Failed to create invoice')
        }
    }

    const generatePDF = (payment: any) => {
        const doc = new jsPDF()
        const { subtotal, tax, total } = calculateTotal()

        // Header
        doc.setFontSize(20)
        doc.text('HIS Core - Hospital Invoice', 20, 20)

        doc.setFontSize(12)
        doc.text(`Invoice #: ${payment.invoice_number}`, 20, 35)
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 42)

        doc.line(20, 46, 190, 46)

        // Patient Info
        doc.setFontSize(11)
        doc.text(`Patient: ${selectedPatient.first_name} ${selectedPatient.last_name}`, 20, 55)
        doc.text(`UHID: ${selectedPatient.uhid}`, 20, 62)

        doc.line(20, 66, 190, 66)

        // Items
        doc.setFontSize(12)
        doc.text('ITEMS', 20, 75)

        let yPos = 83
        billItems.forEach((item, index) => {
            const itemText = `${index + 1}. ${item.name} x${item.quantity}`
            const priceText = `₹${(item.price * item.quantity).toFixed(2)}`
            doc.setFontSize(10)
            doc.text(itemText, 20, yPos)
            doc.text(priceText, 160, yPos, { align: 'right' })
            yPos += 7
        })

        doc.line(20, yPos + 3, 190, yPos + 3)
        yPos += 10

        // Totals
        doc.setFontSize(11)
        doc.text('Subtotal:', 120, yPos)
        doc.text(`₹${subtotal.toFixed(2)}`, 160, yPos, { align: 'right' })
        yPos += 7

        doc.text('Tax (5%):', 120, yPos)
        doc.text(`₹${tax.toFixed(2)}`, 160, yPos, { align: 'right' })
        yPos += 7

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('TOTAL:', 120, yPos)
        doc.text(`₹${total.toFixed(2)}`, 160, yPos, { align: 'right' })
        yPos += 10

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.text(`Payment Method: ${paymentMethod}`, 20, yPos)
        yPos += 7
        doc.text('Status: PAID', 20, yPos)

        // Footer
        doc.setFontSize(9)
        doc.text('Thank you for choosing HIS Core', 105, 280, { align: 'center' })

        doc.save(`invoice_${payment.invoice_number}.pdf`)
    }

    const { subtotal, tax, total } = calculateTotal()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Billing Counter</h1>
                <p className="text-muted-foreground">Create invoices and process payments</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Patient Selection */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Patient Selection</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!selectedPatient ? (
                            <>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Search by name, UHID, or phone..."
                                        value={patientQuery}
                                        onChange={(e) => setPatientQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchPatients()}
                                    />
                                    <Button onClick={handleSearchPatients}>
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>

                                {patients.length > 0 && (
                                    <div className="space-y-2">
                                        {patients.map((patient) => (
                                            <div
                                                key={patient.id}
                                                className="p-3 border rounded cursor-pointer hover:bg-accent"
                                                onClick={() => handleSelectPatient(patient)}
                                            >
                                                <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                                                <p className="text-sm text-muted-foreground">UHID: {patient.uhid}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-4 bg-muted rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-lg">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                                        <p className="text-sm text-muted-foreground">UHID: {selectedPatient.uhid}</p>
                                        {patientBalance && (
                                            <p className="text-sm mt-2">
                                                Outstanding Balance: <span className="font-bold text-red-600">₹{patientBalance.outstanding.toFixed(2)}</span>
                                            </p>
                                        )}
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => {
                                        setSelectedPatient(null)
                                        setPatientBalance(null)
                                    }}>
                                        Change
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Add Items */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Add</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleAddManualItem('CONSULTATION')}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Consultation Fee
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleAddManualItem('LAB')}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Lab Test
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleAddManualItem('PROCEDURE')}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Procedure
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Medicine Search (OpenFDA) */}
            <Card>
                <CardHeader>
                    <CardTitle>Search Medicines (OpenFDA Database)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search medicine by brand name..."
                            value={medicineQuery}
                            onChange={(e) => setMedicineQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchMedicines()}
                        />
                        <Button onClick={handleSearchMedicines} disabled={searchingMedicines}>
                            {searchingMedicines ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Search className="h-4 w-4" />
                            )}
                        </Button>
                    </div>

                    {medicines.length > 0 && (
                        <div className="grid gap-2 max-h-64 overflow-y-auto">
                            {medicines.map((medicine, index) => (
                                <div
                                    key={index}
                                    className="p-3 border rounded flex justify-between items-start"
                                >
                                    <div>
                                        <p className="font-medium">{medicine.name}</p>
                                        <p className="text-sm text-muted-foreground">{medicine.genericName}</p>
                                        <p className="text-xs text-muted-foreground">{medicine.manufacturer}</p>
                                    </div>
                                    <Button size="sm" onClick={() => handleAddMedicine(medicine)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bill Items */}
            <Card>
                <CardHeader>
                    <CardTitle>Bill Items</CardTitle>
                </CardHeader>
                <CardContent>
                    {billItems.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No items added yet</p>
                    ) : (
                        <div className="space-y-3">
                            {billItems.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 border rounded">
                                    <div className="col-span-4">
                                        <Input
                                            value={item.name}
                                            onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                                            placeholder="Item name"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                            placeholder="Qty"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Input
                                            type="number"
                                            value={item.price}
                                            onChange={(e) => handleUpdateItem(index, 'price', parseFloat(e.target.value) || 0)}
                                            placeholder="Price"
                                        />
                                    </div>
                                    <div className="col-span-2 text-right font-medium">
                                        ₹{(item.price * item.quantity).toFixed(2)}
                                    </div>
                                    <div className="col-span-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveItem(index)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {/* Totals */}
                            <div className="border-t pt-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal:</span>
                                    <span>₹{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Tax (5%):</span>
                                    <span>₹{tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total:</span>
                                    <span>₹{total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Payment Details */}
            {billItems.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Payment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Payment Method</Label>
                            <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="CARD">Card</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="INSURANCE">Insurance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Notes (Optional)</Label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any notes..."
                                rows={3}
                            />
                        </div>

                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleGenerateInvoice}
                            disabled={processing || !selectedPatient}
                        >
                            {processing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            Generate Invoice & Download PDF
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
