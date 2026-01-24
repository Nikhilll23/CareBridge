'use client'

import { PaymentButton } from '@/components/modules/billing/PaymentButton'
import { useRouter } from 'next/navigation'
import { verifyPaymentDemo } from '@/actions/billing'
import { toast } from 'sonner'
import { useState } from 'react'

export function PatientPaymentSection({ patientId, totalDue }: { patientId: string, totalDue: number }) {
    const router = useRouter()
    const [key, setKey] = useState(0) // Force re-render if needed

    const handleSuccess = async (razorpayOrderId?: string) => {
        // 1. Force update DB (Demo Mode)
        await verifyPaymentDemo(razorpayOrderId || 'demo_id')

        // 2. Refresh UI
        toast.success('Wallet Updated')
        router.refresh()
        setKey(prev => prev + 1)
    }

    return (
        <div key={key} className="flex flex-col items-end gap-2">
            <p className="text-sm font-bold text-muted-foreground">
                Wallet Balance: ₹{totalDue.toFixed(2)}
            </p>
            {totalDue > 0 ? (
                <PaymentButton
                    patientId={patientId}
                    amount={10}
                    description="Outstanding Balance Payment (Test)"
                    className="w-auto px-6 h-9 text-sm"
                    onSuccess={() => handleSuccess()}
                />
            ) : (
                <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded">No Dues</span>
            )}
        </div>
    )
}
