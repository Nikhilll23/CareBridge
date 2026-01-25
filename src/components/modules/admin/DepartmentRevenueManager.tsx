'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { addDepartmentRevenue, updateDepartmentRevenue, deleteDepartmentRevenue } from '@/actions/analytics'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react'

interface DepartmentData {
    id: string
    department_name: string
    revenue: number
    target_revenue: number
    color: string
}

export function DepartmentRevenueManager({ data }: { data: DepartmentData[] }) {
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Add Form State
    const [newDept, setNewDept] = useState({ name: '', revenue: '', target: '', color: '#3b82f6' })

    // Edit Form State
    const [editValues, setEditValues] = useState({ revenue: '', target: '', color: '' })

    const handleAdd = async () => {
        if (!newDept.name) return toast.error('Name required')
        setLoading(true)
        try {
            await addDepartmentRevenue(newDept.name, Number(newDept.revenue) || 0, Number(newDept.target) || 0, newDept.color)
            setIsAddOpen(false)
            setNewDept({ name: '', revenue: '', target: '', color: '#3b82f6' })
            toast.success('Department Added')
        } catch (e) {
            toast.error('Failed to add')
        } finally {
            setLoading(false)
        }
    }

    const startEdit = (dept: DepartmentData) => {
        setEditingId(dept.id)
        setEditValues({
            revenue: dept.revenue.toString(),
            target: dept.target_revenue.toString(),
            color: dept.color
        })
    }

    const handleSaveEdit = async (id: string) => {
        setLoading(true)
        try {
            await updateDepartmentRevenue(id, {
                revenue: Number(editValues.revenue),
                target: Number(editValues.target),
                color: editValues.color
            })
            setEditingId(null)
            toast.success('Updated')
        } catch (e) {
            toast.error('Update failed')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this department?')) return
        try {
            await deleteDepartmentRevenue(id)
            toast.success('Deleted')
        } catch (e) {
            toast.error('Failed to delete')
        }
    }

    return (
        <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Manage Department Revenue</CardTitle>
                    <CardDescription>Add or edit department revenue data manually</CardDescription>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Department</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Department</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Name</Label>
                                <Input value={newDept.name} onChange={e => setNewDept({ ...newDept, name: e.target.value })} className="col-span-3" placeholder="e.g. Neurology" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Revenue</Label>
                                <Input type="number" value={newDept.revenue} onChange={e => setNewDept({ ...newDept, revenue: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Target</Label>
                                <Input type="number" value={newDept.target} onChange={e => setNewDept({ ...newDept, target: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Color</Label>
                                <div className="flex gap-2 col-span-3">
                                    <Input type="color" value={newDept.color} onChange={e => setNewDept({ ...newDept, color: e.target.value })} className="w-12 h-10 p-1" />
                                    <Input value={newDept.color} onChange={e => setNewDept({ ...newDept, color: e.target.value })} placeholder="#hex" />
                                </div>
                            </div>
                            <Button onClick={handleAdd} disabled={loading}>Add Department</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Color</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Revenue</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No data. Add a department.</TableCell></TableRow>}
                        {data.map((dept) => (
                            <TableRow key={dept.id}>
                                <TableCell>
                                    {editingId === dept.id ? (
                                        <Input type="color" value={editValues.color} onChange={e => setEditValues({ ...editValues, color: e.target.value })} className="w-8 h-8 p-0 border-none" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: dept.color }} />
                                    )}
                                </TableCell>
                                <TableCell className="font-medium">{dept.department_name}</TableCell>
                                <TableCell>
                                    {editingId === dept.id ? (
                                        <Input type="number" value={editValues.revenue} onChange={e => setEditValues({ ...editValues, revenue: e.target.value })} className="h-8" />
                                    ) : (
                                        `₹${dept.revenue.toLocaleString()}`
                                    )}
                                </TableCell>
                                <TableCell>
                                    {editingId === dept.id ? (
                                        <Input type="number" value={editValues.target} onChange={e => setEditValues({ ...editValues, target: e.target.value })} className="h-8" />
                                    ) : (
                                        `₹${dept.target_revenue.toLocaleString()}`
                                    )}
                                </TableCell>
                                <TableCell className="text-right flex justify-end gap-2">
                                    {editingId === dept.id ? (
                                        <>
                                            <Button size="icon" variant="ghost" onClick={() => handleSaveEdit(dept.id)} disabled={loading}><Save className="h-4 w-4 text-green-600" /></Button>
                                            <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4 text-red-500" /></Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button size="icon" variant="ghost" onClick={() => startEdit(dept)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                                            <Button size="icon" variant="ghost" onClick={() => handleDelete(dept.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
