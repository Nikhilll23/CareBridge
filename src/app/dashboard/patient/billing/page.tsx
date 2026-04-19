import { getPatientPortalData } from '@/actions/patient-portal'
import { safeCurrentUser } from '@/lib/auth-safe'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Download } from 'lucide-react'
import { PaymentButton } from '@/components/modules/billing/PaymentButton'

export default async function PatientBillingPage() {
    let user
    try {
        user = await safeCurrentUser()
    } catch (err) {
        console.warn('Clerk currentUser failed:', err)
        redirect('/sign-in')
    }
    if (!user) redirect('/sign-in')

    const data = await getPatientPortalData()
    if (!data) redirect('/dashboard/patient')

    const { patient, invoices, totalDue } = data as any

    // Fetch invoice line items for each invoice
    const { supabaseAdmin: adminClient } = await import('@/lib/supabase')
    const invoiceIds = invoices.map((inv: any) => inv.id)
    const { data: allItems } = invoiceIds.length > 0
        ? await adminClient.from('invoice_items').select('*').in('invoice_id', invoiceIds)
        : { data: [] }

    const itemsByInvoice = (allItems || []).reduce((acc: any, item: any) => {
        if (!acc[item.invoice_id]) acc[item.invoice_id] = []
        acc[item.invoice_id].push(item)
        return acc
    }, {})

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Billing & Payments</h1>
                <p className="text-muted-foreground">Manage your invoices and payment history</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-primary">Total Outstanding</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-primary">₹{Number(totalDue).toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Due immediately</p>
                        {totalDue > 0 ? (
                            <PaymentButton
                                patientId={patient.id}
                                amount={totalDue}
                                description="Outstanding dues - CareBridge Hospital"
                                className="w-full mt-4"
                            />
                        ) : (
                            <div className="mt-4 text-center text-sm text-green-600 font-medium py-2 bg-green-50 rounded-md">
                                ✓ No dues pending
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Invoice History</CardTitle>
                </CardHeader>
                <CardContent>
                    {invoices.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No invoices found.</p>
                    ) : (
                        <div className="space-y-4">
                            {invoices.map((inv: any) => {
                                const lineItems = itemsByInvoice[inv.id] || []
                                return (
                                <div key={inv.id} className="border rounded-lg overflow-hidden">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-muted/30">
                                        <div className="space-y-1">
                                            <p className="font-semibold">Invoice #{inv.id.slice(0, 8)}</p>
                                            <p className="text-sm text-muted-foreground">Issued: {format(new Date(inv.created_at || new Date()), 'MMM d, yyyy')}</p>
                                        </div>
                                        <div className="flex items-center gap-4 mt-3 md:mt-0">
                                            <div className="text-right">
                                                <p className="font-bold text-xl">₹{Number(inv.amount).toFixed(2)}</p>
                                                <Badge variant={inv.status === 'PAID' ? 'secondary' : 'destructive'}>{inv.status}</Badge>
                                            </div>
                                            {inv.status !== 'PAID' && Number(inv.amount) > 0 && (
                                                <PaymentButton
                                                    patientId={patient.id}
                                                    invoiceId={inv.id}
                                                    amount={Number(inv.amount)}
                                                    description={`Invoice #${inv.id.slice(0, 8)}`}
                                                    className="h-9 px-4"
                                                />
                                            )}
                                        </div>
                                    </div>
                                    {lineItems.length > 0 && (
                                        <div className="px-4 pb-4">
                                            <table className="w-full text-sm mt-3">
                                                <thead>
                                                    <tr className="text-muted-foreground border-b">
                                                        <th className="text-left py-1">Description</th>
                                                        <th className="text-center py-1">Qty</th>
                                                        <th className="text-right py-1">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {lineItems.map((item: any) => (
                                                        <tr key={item.id} className="border-b last:border-0">
                                                            <td className="py-2">{item.description}</td>
                                                            <td className="text-center py-2">{item.quantity}</td>
                                                            <td className="text-right py-2 font-medium">₹{Number(item.total_price).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
