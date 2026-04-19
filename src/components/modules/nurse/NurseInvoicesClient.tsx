'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Receipt, Search, Download, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function NurseInvoicesClient() {
    const [invoices, setInvoices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        loadInvoices()
    }, [])

    const loadInvoices = async () => {
        try {
            const supabase = createClient()

            const { data, error } = await supabase
                .from('payments')
                .select(`
                    *,
                    patient:patients(first_name, last_name)
                `)
                .order('created_at', { ascending: false })
                .limit(100)

            if (error) throw error

            setInvoices(data || [])
        } catch (error: any) {
            console.error('Error loading invoices:', error)
            toast.error('Failed to load invoices')
        } finally {
            setLoading(false)
        }
    }

    const filteredInvoices = invoices.filter(invoice => {
        const patientName = `${invoice.patient?.first_name} ${invoice.patient?.last_name}`.toLowerCase()
        return patientName.includes(searchQuery.toLowerCase())
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Receipt className="h-8 w-8" />
                    Patient Invoices
                </h1>
                <p className="text-muted-foreground">View patient billing and payment records</p>
            </div>

            {/* Search */}
            <Card>
                <CardHeader>
                    <CardTitle>Search Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search by patient name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Button variant="outline">
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Invoices Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Invoices ({filteredInvoices.length})</CardTitle>
                    <CardDescription>Patient billing records and invoices</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-2 text-muted-foreground">Loading invoices...</p>
                        </div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No invoices found
                        </div>
                    ) : (
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Patient</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Payment Method</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Processed By</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInvoices.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                            <TableCell>
                                                {new Date(invoice.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {invoice.patient?.first_name} {invoice.patient?.last_name}
                                            </TableCell>
                                            <TableCell className="font-semibold">
                                                ₹{invoice.amount?.toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {invoice.payment_method || 'N/A'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    Paid
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {invoice.receptionist_id ? invoice.receptionist_id.slice(0, 8) + '...' : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="outline">
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
