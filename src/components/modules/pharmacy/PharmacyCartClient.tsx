'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Trash2, DollarSign, ShoppingCart } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { createRazorpayOrder, verifyPayment } from '@/actions/payments'
import { toast } from 'sonner'
import Link from 'next/link'

declare global {
    interface Window {
        Razorpay: any;
    }
}

export function PharmacyCartClient() {
    const { cart, removeFromCart, updateQuantity, clearCart, totalAmount } = useCart()
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false)
    const [showPatientDialog, setShowPatientDialog] = useState(false)
    const [selectedPatient, setSelectedPatient] = useState<any>(null)
    const [patientResults, setPatientResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)

    // Dynamic import for action to avoid build issues if file not ready yet, 
    // but better to import at top. I'll stick to top level imports if possible, 
    // but for now let's use the content_replace correctly.

    const handleSearchPatient = async (query: string) => {
        if (query.length < 2) {
            setPatientResults([])
            return
        }
        setIsSearching(true)
        try {
            // We need to import the action. Since I cannot add import at top easily with this tool 
            // without reading whole file, I will assume I can update imports in a separate call 
            // OR use require/dynamic import. 
            // Let's assume I will add the import in a subsequent step or previous step.
            // Actually, I'll use a dynamic import here for safety or just assume I add the import line.
            // Wait, I can't add imports easily without risking breaking the file structure 
            // if I don't see the top. 
            // I'll use the 'replace_file_content' to adding the import at the top first.
            const { searchPatients } = await import('@/actions/patients')
            const results = await searchPatients(query)
            setPatientResults(results)
        } catch (error) {
            console.error(error)
        } finally {
            setIsSearching(false)
        }
    }

    // Helper to load Razorpay SDK script dynamically
    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script')
            script.src = 'https://checkout.razorpay.com/v1/checkout.js'
            script.onload = () => {
                resolve(true)
            }
            script.onerror = () => {
                resolve(false)
            }
            document.body.appendChild(script)
        })
    }

    const initiatePayment = () => {
        if (cart.length === 0) {
            toast.error('Cart is empty')
            return
        }
        setShowPatientDialog(true)
    }

    const processPayment = async () => {
        if (!selectedPatient) {
            toast.error('Please select a patient')
            return
        }

        setIsPaymentProcessing(true)

        try {
            // "Initiate Payment" for Receptionist means moving items from Local Cart to Patient DB Cart
            const { addToPatientCart } = await import('@/actions/pharmacy')

            // Loop through local cart items and add them to DB
            // (In production, batch insert is better)
            let successCount = 0

            for (const item of cart) {
                const res = await addToPatientCart({
                    patientId: selectedPatient.id,
                    medicineId: item.id,
                    medicineName: item.name,
                    price: item.price,
                    quantity: item.quantity
                })
                if (res.success) successCount++
            }

            if (successCount === cart.length) {
                toast.success(`Payment Initiated! Items sent to ${selectedPatient.name}`)
                clearCart() // Clear local cart
                setShowPatientDialog(false)
                setSelectedPatient(null)
            } else {
                toast.warning(`Partially assigned (${successCount}/${cart.length}). Some failed.`)
            }

        } catch (error) {
            console.error('Assignment Error:', error)
            toast.error('Failed to assign items to patient')
        } finally {
            setIsPaymentProcessing(false)
        }
    }

    if (cart.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
                <div className="bg-muted p-6 rounded-full">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold">Your Cart is Empty</h2>
                <p className="text-muted-foreground">Go to Pharmacy Billing to add medicines.</p>
                {/* We try to detect path or provide generic link options */}
                <div className="flex gap-4">
                    <Button asChild variant="outline">
                        <Link href="/dashboard/receptionist/pharmacy">Receptionist Pharmacy</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/nurse/pharmacy">Nurse Pharmacy</Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-8 w-8" />
                Shopping Cart
            </h1>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Items ({cart.length})</span>
                        <Badge variant="secondary" className="text-lg">
                            Total: ${totalAmount}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Medicine</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Subtotal</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cart.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            <div>{item.name}</div>
                                            {item.manufacturer && <div className="text-xs text-muted-foreground">{item.manufacturer}</div>}
                                        </TableCell>
                                        <TableCell>${item.price.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                                                className="w-20"
                                            />
                                        </TableCell>
                                        <TableCell>${(item.price * item.quantity).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => removeFromCart(item.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex justify-end p-4 bg-muted/20 rounded-lg">
                        <div className="text-right space-y-2">
                            <div className="text-sm text-muted-foreground">Payment Provider</div>
                            <div className="font-semibold text-lg flex items-center gap-2 justify-end">
                                <DollarSign className="h-4 w-4" />
                                City Hospital Pharmacy
                            </div>
                            <Button onClick={initiatePayment} size="lg" className="w-[200px] mt-4">
                                Initiate Payment
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showPatientDialog} onOpenChange={(open) => {
                setShowPatientDialog(open)
                if (!open) {
                    setPatientResults([])
                    setSelectedPatient(null)
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Select Patient for Payment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2 relative">
                            <Label>Patient Name, ID or Phone</Label>
                            <Input
                                placeholder="Type to search (min 2 chars)..."
                                onChange={(e) => handleSearchPatient(e.target.value)}
                            />
                            {/* Search Results Dropdown */}
                            {(patientResults.length > 0 || isSearching) && (
                                <div className="absolute top-full left-0 right-0 z-50 bg-popover text-popover-foreground border rounded-md shadow-md mt-1 max-h-[200px] overflow-y-auto">
                                    {isSearching && <div className="p-2 text-sm text-muted-foreground">Searching...</div>}
                                    {patientResults.map(patient => (
                                        <div
                                            key={patient.id}
                                            className="p-2 hover:bg-accent cursor-pointer text-sm"
                                            onClick={() => {
                                                setSelectedPatient(patient)
                                                setPatientResults([])
                                            }}
                                        >
                                            <div className="font-medium">{patient.name}</div>
                                            <div className="text-xs text-muted-foreground">ID: {patient.uhid || 'N/A'} | Ph: {patient.phone || 'N/A'}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedPatient && (
                            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                                <span className="text-xs font-semibold text-primary uppercase">Selected Patient</span>
                                <div className="font-bold">{selectedPatient.name}</div>
                                <div className="text-xs text-muted-foreground">ID: {selectedPatient.uhid}</div>
                            </div>
                        )}

                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm font-medium">Total Amount</p>
                            <p className="text-2xl font-bold">${totalAmount}</p>
                            <p className="text-xs text-muted-foreground mt-1">To: City Hospital Pharmacy</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPatientDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={processPayment} disabled={isPaymentProcessing || !selectedPatient}>
                            {isPaymentProcessing ? 'Assigning to Patient...' : 'Initiate Payment Request'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
