'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createPaymentOrder, markInvoicePaid } from '@/actions/billing'
import { toast } from 'sonner'
import { CreditCard, Loader2 } from 'lucide-react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'

interface PaymentButtonProps {
    patientId: string
    amount: number
    invoiceId?: string
    description?: string
    onSuccess?: () => void
    className?: string
}

declare global {
    interface Window { Razorpay: any }
}

export function PaymentButton({ patientId, amount, invoiceId, description, onSuccess, className }: PaymentButtonProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handlePayment = async () => {
        if (amount <= 0) { toast.error('Invalid amount'); return }
        setLoading(true)

        const res = await createPaymentOrder(patientId, amount, description || 'Hospital Bill')

        if (!res.success || !res.orderId) {
            toast.error('Payment initialization failed', { description: res.error })
            setLoading(false)
            return
        }

        const options = {
            key: res.keyId,
            amount: res.amount,
            currency: res.currency || 'INR',
            name: 'CareBridge Hospital',
            description: description || 'Hospital Bill',
            order_id: res.orderId,
            handler: async function (response: any) {
                // Mark invoice as paid in DB
                if (invoiceId) {
                    await markInvoicePaid(invoiceId, response.razorpay_payment_id)
                } else {
                    // Mark all pending invoices for this patient as paid
                    await markInvoicePaid(null, response.razorpay_payment_id, patientId)
                }
                toast.success('Payment successful!', {
                    description: `Payment ID: ${response.razorpay_payment_id}`
                })
                router.refresh()
                if (onSuccess) onSuccess()
            },
            prefill: {},
            theme: { color: '#0ea5e9' },
            modal: {
                ondismiss: () => {
                    toast.info('Payment cancelled')
                    setLoading(false)
                }
            }
        }

        const rzp = new window.Razorpay(options)
        rzp.on('payment.failed', (response: any) => {
            toast.error('Payment failed', { description: response.error?.description })
            setLoading(false)
        })
        rzp.open()
        setLoading(false)
    }

    return (
        <>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
            <Button
                onClick={handlePayment}
                disabled={loading || amount <= 0}
                className={`bg-blue-600 hover:bg-blue-700 text-white ${className || 'w-full'}`}
            >
                {loading
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <CreditCard className="mr-2 h-4 w-4" />
                }
                Pay ₹{Number(amount).toFixed(2)}
            </Button>
        </>
    )
}
