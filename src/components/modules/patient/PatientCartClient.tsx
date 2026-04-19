'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, CreditCard, Trash2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import Script from 'next/script'
import { useRouter } from 'next/navigation'

interface CartItem {
    id: string
    medicine_name: string
    quantity: number
    price: number
    status: string
}

interface PatientCartClientProps {
    items: CartItem[]
    patientId: string
    patientName: string
}

export function PatientCartClient({ items, patientId, patientName }: PatientCartClientProps) {
    const [isProcessing, setIsProcessing] = useState(false)
    const router = useRouter()

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    const handlePayment = async () => {
        setIsProcessing(true)
        const toastId = toast.loading('Initializing payment...')

        try {
            // 1. Create Order (Mock or Real)
            // Ideally call a server action to create razorpay order
            // keeping it simple mock for now as requested "simulate"

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_1234567890',
                amount: totalAmount * 100, // into paise
                currency: 'INR',
                name: 'City Hospital',
                description: 'Pharmacy Bill Payment',
                handler: async function (response: any) {
                    toast.success('Payment Successful!', { id: toastId })

                    // 2. Mark items as PAID
                    const { markCartAsPaid } = await import('@/actions/pharmacy')
                    await markCartAsPaid(patientId)

                    // 3. Generate AI Invoice
                    toast.loading('Generating AI Invoice...', { id: toastId })
                    const { generateInvoiceHTML } = await import('@/actions/invoice')
                    const html = await generateInvoiceHTML(
                        patientName,
                        items,
                        totalAmount,
                        response.razorpay_payment_id
                    )

                    // 4. Open Invoice
                    const newWindow = window.open('', '_blank')
                    if (newWindow) {
                        newWindow.document.write(html)
                        newWindow.document.close()
                        newWindow.print()
                    }

                    router.refresh()
                    toast.dismiss(toastId)
                    setIsProcessing(false)
                },
                prefill: {
                    name: patientName,
                    email: 'patient@example.com',
                    contact: '9999999999'
                },
                theme: {
                    color: '#0ea5e9'
                },
                modal: {
                    ondismiss: function () {
                        toast.dismiss(toastId)
                        toast.error('Payment cancelled')
                        setIsProcessing(false)
                    }
                }
            }

            const rzp = new (window as any).Razorpay(options)
            rzp.open()

        } catch (error) {
            console.error(error)
            toast.error('Payment failed to initialize', { id: toastId })
            setIsProcessing(false)
        }
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold">Your Cart is Empty</h2>
                <p className="text-muted-foreground mt-2">Any medicines prescribed by the doctor or added by the pharmacy will appear here.</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ShoppingCart className="h-6 w-6" />
                        My Pharmacy Cart
                    </h1>
                    <p className="text-muted-foreground">Review and pay for your prescribed medicines</p>
                </div>
                <Badge variant="outline" className="px-3 py-1 text-base">
                    {items.length} Items
                </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-4">
                    {items.map(item => (
                        <Card key={item.id}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-lg">{item.medicine_name}</div>
                                    <div className="text-sm text-muted-foreground">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</div>
                                </div>
                                <div className="font-bold text-lg">
                                    ₹{(item.price * item.quantity).toFixed(2)}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="md:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>Payment Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>₹{totalAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Taxes</span>
                                <span>₹0.00</span>
                            </div>
                            <div className="border-t pt-4 flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>₹{totalAmount.toFixed(2)}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full gap-2"
                                size="lg"
                                onClick={handlePayment}
                                disabled={isProcessing}
                            >
                                <CreditCard className="h-4 w-4" />
                                {isProcessing ? 'Processing...' : 'Pay Now'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    )
}
