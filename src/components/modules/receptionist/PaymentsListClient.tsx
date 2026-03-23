'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Download } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import jsPDF from 'jspdf'
import { toast } from 'sonner'

interface PaymentsListClientProps {
    payments: any[]
}

export function PaymentsListClient({ payments }: PaymentsListClientProps) {
    const [searchQuery, setSearchQuery] = useState('')

    const filteredPayments = payments.filter(payment =>
        payment.patient?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.patient?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.patient?.uhid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const generatePDF = (payment: any) => {
        const doc = new jsPDF()

        // Header
        doc.setFontSize(20)
            doc.text('CareBridge - Payment Receipt', 20, 20)

        doc.setFontSize(12)
        doc.text(`Invoice #: ${payment.invoice_number}`, 20, 35)
        doc.text(`Date: ${format(new Date(payment.created_at), 'PPP')}`, 20, 42)

        doc.line(20, 46, 190, 46)

        // Patient Info
        doc.setFontSize(11)
        doc.text(`Patient: ${payment.patient?.first_name} ${payment.patient?.last_name}`, 20, 55)
        doc.text(`UHID: ${payment.patient?.uhid}`, 20, 62)

        doc.line(20, 66, 190, 66)

        // Items
        doc.setFontSize(12)
        doc.text('ITEMS', 20, 75)

        let yPos = 83
        const items = payment.items || []
        items.forEach((item: any, index: number) => {
            const itemText = `${index + 1}. ${item.name} x${item.quantity}`
            const priceText = `₹${item.total.toFixed(2)}`
            doc.setFontSize(10)
            doc.text(itemText, 20, yPos)
            doc.text(priceText, 160, yPos, { align: 'right' })
            yPos += 7
        })

        doc.line(20, yPos + 3, 190, yPos + 3)
        yPos += 10

        // Total
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('TOTAL:', 120, yPos)
        doc.text(`₹${parseFloat(payment.amount).toFixed(2)}`, 160, yPos, { align: 'right' })
        yPos += 10

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.text(`Payment Method: ${payment.payment_method}`, 20, yPos)
        yPos += 7
        doc.text(`Status: ${payment.status}`, 20, yPos)

        // Footer
        doc.setFontSize(9)
        doc.text('Thank you for choosing CareBridge', 105, 280, { align: 'center' })

        doc.save(`receipt_${payment.invoice_number}.pdf`)
        toast.success('PDF downloaded!')
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Payment History</h1>
                <p className="text-muted-foreground">View all payment transactions</p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by patient name, UHID, or invoice number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Payments List */}
            <div className="grid gap-4">
                {filteredPayments.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            {searchQuery ? 'No payments found matching your search.' : 'No payments recorded yet.'}
                        </CardContent>
                    </Card>
                ) : (
                    filteredPayments.map((payment) => (
                        <Card key={payment.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2">
                                            Invoice #{payment.invoice_number}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span>Patient: {payment.patient?.first_name} {payment.patient?.last_name}</span>
                                            <span>•</span>
                                            <span>UHID: {payment.patient?.uhid}</span>
                                            <span>•</span>
                                            <span>{format(new Date(payment.created_at), 'PPP')}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={payment.status === 'COMPLETED' ? 'default' : 'outline'}>
                                            {payment.status}
                                        </Badge>
                                        <Badge variant="outline">{payment.payment_method}</Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Amount</p>
                                        <p className="text-2xl font-bold">₹{parseFloat(payment.amount).toFixed(2)}</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => generatePDF(payment)}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Download Receipt
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
