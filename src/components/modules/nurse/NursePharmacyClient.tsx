'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Pill, Search, Plus, Trash2, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

interface Medicine {
    id: string
    name: string
    genericName?: string
    manufacturer?: string
    price: number
    quantity: number
}

export function NursePharmacyClient() {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [cart, setCart] = useState<Medicine[]>([])
    const [loading, setLoading] = useState(false)
    const [showPatientDialog, setShowPatientDialog] = useState(false)
    const [selectedPatient, setSelectedPatient] = useState<any>(null)

    const searchMedicines = async () => {
        if (!searchQuery.trim()) {
            toast.error('Please enter a medicine name')
            return
        }

        setLoading(true)
        try {
            const response = await fetch(
                `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${searchQuery}"&limit=10`
            )
            const data = await response.json()

            if (data.results) {
                setSearchResults(data.results.map((item: any, idx: number) => ({
                    id: `fda-${idx}`,
                    name: item.openfda?.brand_name?.[0] || 'Unknown',
                    genericName: item.openfda?.generic_name?.[0],
                    manufacturer: item.openfda?.manufacturer_name?.[0],
                    price: Math.random() * 100 + 10 // Mock price
                })))
            } else {
                toast.info('No medicines found')
                setSearchResults([])
            }
        } catch (error) {
            console.error('Error searching medicines:', error)
            toast.error('Failed to search medicines')
        } finally {
            setLoading(false)
        }
    }

    const addToCart = (medicine: any) => {
        const existing = cart.find(item => item.id === medicine.id)
        if (existing) {
            setCart(cart.map(item =>
                item.id === medicine.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ))
        } else {
            setCart([...cart, { ...medicine, quantity: 1 }])
        }
        toast.success(`Added ${medicine.name} to cart`)
    }

    const removeFromCart = (id: string) => {
        setCart(cart.filter(item => item.id !== id))
    }

    const updateQuantity = (id: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(id)
            return
        }
        setCart(cart.map(item =>
            item.id === id ? { ...item, quantity } : item
        ))
    }

    const getTotalAmount = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)
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

        // Here you would call your payment API
        toast.success(`Payment of $${getTotalAmount()} initiated for patient`)
        setCart([])
        setShowPatientDialog(false)
        setSelectedPatient(null)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Pill className="h-8 w-8" />
                    Pharmacy - Medication Billing
                </h1>
                <p className="text-muted-foreground">Search medicines and initiate patient payments</p>
            </div>

            {/* Medicine Search */}
            <Card>
                <CardHeader>
                    <CardTitle>Search Medicines (OpenFDA)</CardTitle>
                    <CardDescription>Search for medications from FDA database</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter medicine name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && searchMedicines()}
                        />
                        <Button onClick={searchMedicines} disabled={loading}>
                            <Search className="h-4 w-4 mr-2" />
                            {loading ? 'Searching...' : 'Search'}
                        </Button>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Medicine Name</TableHead>
                                        <TableHead>Generic Name</TableHead>
                                        <TableHead>Manufacturer</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {searchResults.map((medicine) => (
                                        <TableRow key={medicine.id}>
                                            <TableCell className="font-medium">{medicine.name}</TableCell>
                                            <TableCell>{medicine.genericName || 'N/A'}</TableCell>
                                            <TableCell className="text-sm">{medicine.manufacturer || 'N/A'}</TableCell>
                                            <TableCell>${medicine.price.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Button size="sm" onClick={() => addToCart(medicine)}>
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Add
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Cart */}
            {cart.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Cart ({cart.length} items)</span>
                            <Badge variant="secondary" className="text-lg">
                                Total: ${getTotalAmount()}
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
                                            <TableCell className="font-medium">{item.name}</TableCell>
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

                        <div className="flex justify-end">
                            <Button onClick={initiatePayment} size="lg">
                                <DollarSign className="h-5 w-5 mr-2" />
                                Initiate Patient Payment
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Patient Selection Dialog */}
            <Dialog open={showPatientDialog} onOpenChange={setShowPatientDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select Patient for Payment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Patient ID or Name</Label>
                            <Input
                                placeholder="Search patient..."
                                onChange={(e) => setSelectedPatient({ name: e.target.value })}
                            />
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm font-medium">Total Amount</p>
                            <p className="text-2xl font-bold">${getTotalAmount()}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPatientDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={processPayment}>
                            Process Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
