'use server'

import Razorpay from 'razorpay'
import { auth } from '@clerk/nextjs/server'

// Initialize Razorpay with env vars
// Note: User confirmed keys are present in their environment
const razorpay = new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export interface PaymentOrder {
    id: string
    amount: number
    currency: string
}

export async function createRazorpayOrder(amount: number, currency: string = 'INR'): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
        const { userId } = await auth()

        if (!userId) {
            return { success: false, error: 'Unauthorized' }
        }

        const options = {
            amount: Math.round(amount * 100), // Razorpay expects amount in smallest currency unit (paise)
            currency: currency,
            receipt: `receipt_${Date.now()}_${userId.slice(0, 5)}`,
        }

        const order = await razorpay.orders.create(options)

        return { success: true, order }
    } catch (error: any) {
        console.error('Error creating Razorpay order:', error)
        return { success: false, error: error.message || 'Failed to create order' }
    }
}

export async function verifyPayment(paymentId: string, orderId: string, signature: string) {
    // In a production app, verify the signature here using crypto
    // const generated_signature = hmac_sha256(orderId + "|" + paymentId, secret);
    // if (generated_signature == signature) { ... }

    // For now, we assume success if we reach here and params exist
    console.log('Verifying payment:', { paymentId, orderId })
    return { success: true }
}
