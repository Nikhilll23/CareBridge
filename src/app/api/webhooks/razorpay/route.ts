import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
// import { sendEmail } from '@/lib/email' (Assuming we have email util, or mock it)

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
    try {
        const body = await req.text()
        const signature = req.headers.get('x-razorpay-signature')

        if (!WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'Server Config Error' }, { status: 500 })
        }

        // 1. Verify Signature
        const expectedSignature = crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(body)
            .digest('hex')

        if (expectedSignature !== signature) {
            console.error('Invalid Signature')
            return NextResponse.json({ error: 'Invalid Signature' }, { status: 400 })
        }

        const event = JSON.parse(body)
        const payload = event.payload

        // 2. Handle Events
        // event.event === 'payment.captured'
        // event.event === 'payment.failed'

        if (event.event === 'payment.captured') {
            const payment = payload.payment.entity
            const orderId = payment.order_id

            // Update DB
            await supabaseAdmin.from('payments')
                .update({
                    status: 'PAID',
                    payment_id: payment.id,
                    method: payment.method,
                    updated_at: new Date().toISOString()
                })
                .eq('order_id', orderId)

            console.log(`Payment Captured: ${payment.id}`)
        }

        if (event.event === 'payment.failed') {
            const payment = payload.payment.entity
            const orderId = payment.order_id

            // Update DB
            await supabaseAdmin.from('payments')
                .update({
                    status: 'FAILED',
                    updated_at: new Date().toISOString()
                })
                .eq('order_id', orderId)

            // Alert Email (Mocked or Real if lib exists)
            console.log(`ALERT: Payment Failed for Order ${orderId}. Sending email to omarhashmi494@gmail.com`)
            // await sendEmail('omarhashmi494@gmail.com', 'Payment Failed', `Detail: ${payment.error_description}`)
        }

        return NextResponse.json({ status: 'ok' })

    } catch (e) {
        console.error('Webhook Error:', e)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
