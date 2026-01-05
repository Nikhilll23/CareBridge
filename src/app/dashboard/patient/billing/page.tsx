import { getPatientPortalData } from '@/actions/patient-portal'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function PatientBillingPage() {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    const data = await getPatientPortalData()
    if (!data) redirect('/dashboard/patient')

    const { invoices, totalDue } = data

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
                        <div className="text-4xl font-bold text-primary">${(totalDue / 100).toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Due immediately</p>
                        <Button className="w-full mt-4">Pay Now</Button>
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
                            {invoices.map((inv: any) => (
                                <div key={inv.id} className="flex flex-col md:flex-row justify-between items-center p-4 border rounded-lg">
                                    <div className="space-y-1">
                                        <p className="font-semibold">Invoice #{inv.id.slice(0, 8)}</p>
                                        <p className="text-sm text-muted-foreground">Issued: {format(new Date(inv.created_at || new Date()), 'MMM d, yyyy')}</p>
                                    </div>

                                    <div className="flex items-center gap-6 mt-4 md:mt-0">
                                        <div className="text-right">
                                            <p className="font-bold">${(inv.amount / 100).toFixed(2)}</p>
                                            <Badge variant={inv.status === 'PAID' ? 'secondary' : 'destructive'}>{inv.status}</Badge>
                                        </div>
                                        <Button variant="ghost" size="icon">
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
