'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createPaymentOrder } from '@/actions/billing'
import { toast } from 'sonner'
import { CreditCard, Loader2 } from 'lucide-react'
import Script from 'next/script'

interface PaymentButtonProps {
    patientId: string
    amount: number
    description?: string
    onSuccess?: () => void
    className?: string
}

declare global {
    interface Window {
        Razorpay: any
    }
}

export function PaymentButton({ patientId, amount, description, onSuccess, className }: PaymentButtonProps) {
    const [loading, setLoading] = useState(false)

    const handlePayment = async () => {
        setLoading(true)

        // 1. Create Order
        const res = await createPaymentOrder(patientId, amount, description)

        if (!res.success || !res.orderId) {
            toast.error('Initialization Failed', { description: res.error })
            setLoading(false)
            return
        }

        // 2. Open Razorpay
        const options = {
            key: res.keyId, // Key ID from server
            amount: res.amount,
            currency: res.currency,
            name: 'CareBridge Hospital',
            description: description,
            order_id: res.orderId,
            handler: function (response: any) {
                // Success Callback from Razorpay (Client side)
                // Note: The real verification happens via Webhook backend, but we can show success UI here.
                toast.success('Payment Successful', { description: `Ref: ${response.razorpay_payment_id}` })
                if (onSuccess) onSuccess()
            },
            prefill: {
                // We could pre-fill user info if available
                // email: 'user@example.com' 
            },
            theme: {
                color: '#3399cc'
            },
            modal: {
                ondismiss: function () {
                    toast.info('Payment Cancelled')
                    setLoading(false)
                }
            }
        }

        const rzp1 = new window.Razorpay(options)

        rzp1.on('payment.failed', function (response: any) {
            toast.error('Payment Failed', { description: response.error.description })
        })

        rzp1.open()
        setLoading(false)
    }

    return (
        <>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

            <Button onClick={handlePayment} disabled={loading} className={`bg-blue-600 hover:bg-blue-700 ${className || 'w-full'}`}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Pay ₹{amount}
            </Button>
        </>
    )
}
