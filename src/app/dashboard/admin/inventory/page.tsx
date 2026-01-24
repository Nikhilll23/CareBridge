'use client'

import { useState, useEffect } from 'react'
import { getInventory, getVendors, createPO, getPurchaseOrders, receiveGoods } from '@/actions/inventory'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Package, AlertOctagon, Truck, ClipboardList, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { getInventory as getStock } from '@/actions/pharmacy' // Reuse stock fetch

export default function InventoryDashboard() {
    const [stock, setStock] = useState<any[]>([])
    const [pos, setPOs] = useState<any[]>([])
    const [vendors, setVendors] = useState<any[]>([])

    // New PO State
    const [isPOOpen, setIsPOOpen] = useState(false)
    const [newPO, setNewPO] = useState({ vendorId: '', drugName: '', qty: 0 })

    // GRN State
    const [selectedPO, setSelectedPO] = useState<any>(null) // For receiving
    const [grnData, setGrnData] = useState({ batch: '', expiry: '', qty: 0, price: 0 })

    const refresh = () => {
        getStock().then(setStock)
        getPurchaseOrders().then(setPOs)
        getVendors().then(setVendors)
    }
    useEffect(() => { refresh() }, [])

    const handleCreatePO = async () => {
        if (!newPO.vendorId || !newPO.drugName) return
        await createPO(newPO.vendorId, [{ drugName: newPO.drugName, qty: newPO.qty }])
        setIsPOOpen(false)
        toast.success('Purchase Order Sent')
        refresh()
    }

    const handleReceiveGoods = async () => {
        if (!selectedPO) return
        // Assuming receiving first item for simplicity in this UI
        const drugName = selectedPO.po_items[0].drug_name

        await receiveGoods(selectedPO.id, [{
            drugName,
            batch: grnData.batch,
            expiry: grnData.expiry,
            qty: grnData.qty,
            price: grnData.price
        }])

        setSelectedPO(null)
        setGrnData({ batch: '', expiry: '', qty: 0, price: 0 })
        toast.success('Stock Received & Updated')
        refresh()
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <Truck className="h-8 w-8 text-primary" />
                Supply Chain & Inventory
            </h1>

            <Tabs defaultValue="stock" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="stock">Current Stock</TabsTrigger>
                    <TabsTrigger value="procurement">Despatch & Procurement</TabsTrigger>
                </TabsList>

                <TabsContent value="stock">
                    <div className="grid gap-4 md:grid-cols-4 mb-4">
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm">Total Items</CardTitle></CardHeader>
                            <CardContent className="text-2xl font-bold">{stock.length}</CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm">Low Stock Alerts</CardTitle></CardHeader>
                            <CardContent className="text-2xl font-bold text-red-600">
                                {stock.filter(s => s.quantity < 20).length}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Master Inventory</CardTitle>
                            <CardDescription>Live view of pharmacy stock levels</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Drug Name</TableHead>
                                        <TableHead>Batch #</TableHead>
                                        <TableHead>Expiry</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stock.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.drug_name}</TableCell>
                                            <TableCell>{item.batch_number}</TableCell>
                                            <TableCell>{item.expiry_date}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>
                                                {item.quantity < 20 ? (
                                                    <Badge variant="destructive" className="flex w-fit items-center gap-1">
                                                        <AlertOctagon className="h-3 w-3" /> Low Stock
                                                    </Badge>
                                                ) : <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">In Stock</Badge>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="procurement">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Purchase Orders</h2>
                        <Dialog open={isPOOpen} onOpenChange={setIsPOOpen}>
                            <DialogTrigger asChild>
                                <Button><Plus className="mr-2 h-4 w-4" /> New Purchase Order</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Create PO</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Vendor</label>
                                        <Select onValueChange={v => setNewPO({ ...newPO, vendorId: v })}>
                                            <SelectTrigger><SelectValue placeholder="Select Vendor" /></SelectTrigger>
                                            <SelectContent>
                                                {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Drug Name</label>
                                        <Input placeholder="e.g. Paracetamol" onChange={e => setNewPO({ ...newPO, drugName: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Quantity</label>
                                        <Input type="number" onChange={e => setNewPO({ ...newPO, qty: parseInt(e.target.value) })} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreatePO}>Send Order</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid gap-4">
                        {pos.map(po => (
                            <Card key={po.id}>
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg">PO #{po.id.slice(0, 6).toUpperCase()}</span>
                                            <Badge variant={po.status === 'CLOSED' ? 'secondary' : 'default'}>{po.status}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Vendor: {po.vendors?.name}</p>
                                        <div className="flex gap-2 mt-2">
                                            {po.po_items.map((item: any) => (
                                                <Badge key={item.id} variant="outline">{item.drug_name} x{item.requested_qty}</Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {po.status === 'SENT' && (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline" className="gap-2" onClick={() => setSelectedPO(po)}>
                                                    <ClipboardList className="h-4 w-4" /> Receive Goods (GRN)
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader><DialogTitle>Goods Receipt Note (GRN)</DialogTitle></DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <p className="text-sm text-muted-foreground">Enter specific batch details for the received stock.</p>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-sm">Batch Number</label>
                                                            <Input placeholder="Batch #" onChange={e => setGrnData({ ...grnData, batch: e.target.value })} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm">Expiry Date</label>
                                                            <Input type="date" onChange={e => setGrnData({ ...grnData, expiry: e.target.value })} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm">Received Qty</label>
                                                            <Input type="number" defaultValue={po.po_items[0].requested_qty} onChange={e => setGrnData({ ...grnData, qty: parseInt(e.target.value) })} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm">Price / Unit</label>
                                                            <Input type="number" onChange={e => setGrnData({ ...grnData, price: parseFloat(e.target.value) })} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={handleReceiveGoods} className="w-full">Confirm Stock In</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                        {pos.length === 0 && <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">No Purchase Orders found.</div>}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
