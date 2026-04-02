'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Pill, Search, Plus, ShoppingCart } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useCart } from '@/context/CartContext'
import Link from 'next/link'
import { getInventory } from '@/actions/inventory'

export function NursePharmacyClient({ role = 'nurse' }: { role?: 'nurse' | 'receptionist' }) {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [patientSearch, setPatientSearch] = useState('')
    const [selectedPatient, setSelectedPatient] = useState<any>(null)
    const [patientResults, setPatientResults] = useState<any[]>([])

    // Inventory dropdown state
    const [inventory, setInventory] = useState<any[]>([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [filteredInventory, setFilteredInventory] = useState<any[]>([])
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Load inventory on mount
    useEffect(() => {
        getInventory().then(res => {
            // getInventory returns a plain array
            if (Array.isArray(res)) setInventory(res)
        })
    }, [])

    // Filter inventory as user types
    useEffect(() => {
        if (searchQuery.trim().length >= 1) {
            const filtered = inventory.filter(item =>
                item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
            ).slice(0, 8)
            setFilteredInventory(filtered)
            setShowDropdown(filtered.length > 0)
        } else {
            setShowDropdown(false)
        }
    }, [searchQuery, inventory])

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const handleSelectFromInventory = (item: any) => {
        setSearchQuery(item.item_name)
        setShowDropdown(false)
        // Directly add to results from local inventory
        setSearchResults([{
            id: item.id,
            name: item.item_name,
            genericName: item.generic_name || item.strength || 'N/A',
            manufacturer: item.manufacturer || 'N/A',
            price: item.unit_price || 0,
            stock: item.stock_quantity,
            fromInventory: true
        }])
    }

    // We don't use the client context anymore for Receptionist add-to-cart in this new flow
    // const { addToCart, cart } = useCart() 

    const [showPatientModal, setShowPatientModal] = useState(false)
    const [pendingMedicine, setPendingMedicine] = useState<any>(null)

    const handlePatientSearch = (query: string) => {
        setPatientSearch(query)
        if (query.length >= 2) {
            import('@/actions/patients').then(mod => {
                mod.searchPatients(query).then(res => setPatientResults(res))
            })
        } else {
            setPatientResults([])
        }
    }

    // Continue flow after patient selection
    const continueAddToCart = async (patient: any) => {
        setSelectedPatient(patient)
        setShowPatientModal(false)

        if (pendingMedicine) {
            await processAddToCart(pendingMedicine, patient)
            setPendingMedicine(null)
        }
    }

    const processAddToCart = async (medicine: any, patient: any) => {
        const loadId = toast.loading('Adding to patient cart...')
        try {
            const { addToPatientCart } = await import('@/actions/pharmacy')
            const result = await addToPatientCart({
                patientId: patient.id,
                medicineId: medicine.id,
                medicineName: medicine.name,
                price: medicine.price,
                quantity: 1
            })

            if (result.success) {
                toast.success(`Added to ${patient.name}'s cart`, { id: loadId })
            } else {
                toast.error(result.error, { id: loadId })
            }
        } catch (error) {
            toast.error('Failed to add to cart', { id: loadId })
        }
    }

    const handleAddToCart = async (medicine: any) => {
        if (!selectedPatient) {
            setPendingMedicine(medicine)
            setShowPatientModal(true)
            return
        }

        await processAddToCart(medicine, selectedPatient)
    }

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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Pill className="h-8 w-8" />
                        Pharmacy - Medication Billing
                    </h1>
                    <p className="text-muted-foreground">Search and add medicines to specific patient cart</p>
                </div>

                {/* Patient Selector */}
                {role === 'receptionist' && (
                    <div className="w-[300px] relative">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Target Patient</label>
                            {selectedPatient ? (
                                <div className="flex items-center justify-between p-2 border rounded-md bg-accent/20">
                                    <div>
                                        <div className="font-medium text-sm">{selectedPatient.name}</div>
                                        <div className="text-xs text-muted-foreground">{selectedPatient.uhid}</div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)} className="h-6 w-6 p-0 rounded-full">
                                        x
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Input
                                        placeholder="Search Patient (Name/UHID)..."
                                        value={patientSearch}
                                        onChange={(e) => handlePatientSearch(e.target.value)}
                                        className="bg-background"
                                    />
                                    {patientResults.length > 0 && !showPatientModal && (
                                        <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-md shadow-md mt-1 max-h-[200px] overflow-y-auto">
                                            {patientResults.map(p => (
                                                <div
                                                    key={p.id}
                                                    className="p-2 hover:bg-accent cursor-pointer text-sm"
                                                    onClick={() => {
                                                        setSelectedPatient(p)
                                                        setPatientSearch('')
                                                        setPatientResults([])
                                                    }}
                                                >
                                                    <div className="font-medium">{p.name}</div>
                                                    <div className="text-xs text-muted-foreground">{p.uhid}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Medicine Search */}
            <Card>
                <CardHeader>
                    <CardTitle>Search Medicines (OpenFDA)</CardTitle>
                    <CardDescription>Search for medications from FDA database</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2" ref={dropdownRef}>
                        <div className="relative flex-1">
                            <Input
                                placeholder="Enter medicine name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && searchMedicines()}
                                onFocus={() => filteredInventory.length > 0 && setShowDropdown(true)}
                            />
                            {/* Local Inventory Dropdown */}
                            {showDropdown && (
                                <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-md shadow-lg mt-1 max-h-[250px] overflow-y-auto">
                                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/50">
                                        Available in Inventory
                                    </div>
                                    {filteredInventory.map(item => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm border-b last:border-0"
                                            onMouseDown={() => handleSelectFromInventory(item)}
                                        >
                                            <div>
                                                <div className="font-medium">{item.item_name}</div>
                                                <div className="text-xs text-muted-foreground">{item.strength} • {item.dosage_form}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-medium">₹{item.unit_price?.toFixed(2)}</div>
                                                <Badge variant={item.stock_quantity > item.low_stock_threshold ? 'secondary' : 'destructive'} className="text-[10px] h-4">
                                                    Stock: {item.stock_quantity}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Button onClick={searchMedicines} disabled={loading}>
                            <Search className="h-4 w-4 mr-2" />
                            {loading ? 'Searching...' : 'Search FDA'}
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
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {searchResults.map((medicine) => (
                                        <TableRow key={medicine.id}>
                                            <TableCell className="font-medium">{medicine.name}</TableCell>
                                            <TableCell>{medicine.genericName || 'N/A'}</TableCell>
                                            <TableCell className="text-sm">{medicine.manufacturer || 'N/A'}</TableCell>
                                            <TableCell>₹{medicine.price.toFixed(2)}</TableCell>
                                            <TableCell>
                                                {medicine.fromInventory ? (
                                                    <Badge variant={medicine.stock > 0 ? 'secondary' : 'destructive'}>
                                                        {medicine.stock > 0 ? `${medicine.stock} units` : 'Out of Stock'}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">FDA</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {role === 'receptionist' && (
                                                    <Button size="sm" onClick={() => handleAddToCart(medicine)} disabled={medicine.fromInventory && medicine.stock === 0}>
                                                        <Plus className="h-4 w-4 mr-1" />
                                                        Add to Cart
                                                    </Button>
                                                )}
                                                {role !== 'receptionist' && (
                                                    <Badge variant="outline">View Only</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Patient Selection Modal */}
            <Dialog open={showPatientModal} onOpenChange={setShowPatientModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select Patient</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <Input
                            placeholder="Search by Name or UHID..."
                            autoFocus
                            onChange={(e) => handlePatientSearch(e.target.value)}
                        />
                        <div className="max-h-[300px] overflow-y-auto border rounded-md">
                            {patientResults.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    Type to search patients...
                                </div>
                            ) : (
                                patientResults.map(p => (
                                    <div
                                        key={p.id}
                                        className="p-3 hover:bg-accent cursor-pointer border-b last:border-0 flex justify-between items-center"
                                        onClick={() => continueAddToCart(p)}
                                    >
                                        <div>
                                            <div className="font-medium">{p.name}</div>
                                            <div className="text-xs text-muted-foreground">{p.uhid}</div>
                                        </div>
                                        <Button size="sm" variant="ghost">Select</Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
