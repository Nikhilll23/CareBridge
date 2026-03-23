'use client'

import { HeroHeader } from "@/components/hero-section-5"
import { Footer } from "@/components/footer-section"
import { Button } from "@/components/ui/button"
import { Check, Loader2 } from "lucide-react"
import { createPaymentOrder } from '@/actions/billing'
import { toast } from 'sonner'
import Script from 'next/script'
import { useState } from 'react'

declare global {
    interface Window {
        Razorpay: any
    }
}

export default function PricingPage() {
    const [loading, setLoading] = useState(false)

    const handlePayment = async (amount: number, planName: string) => {
        setLoading(true)
        try {
            // For pricing page (public), we might not have a patientId logged in. 
            // We'll use a generic placeholder ID or try to get current user if possible.
            // In a real SaaS flow, this would be a "subscribe" action, not a "patient bill".
            // But for this project requirement, we will reuse the existing billing infrastructure.
            const demoPatientId = 'guest_user_pricing'

            // 1. Create Order
            const res = await createPaymentOrder(demoPatientId, amount, `Subscription: ${planName}`)

            if (!res.success || !res.orderId) {
                toast.error('Payment Initialization Failed', { description: res.error || 'Check server logs' })
                setLoading(false)
                return
            }

            // 2. Open Razorpay
            const options = {
                key: res.keyId,
                amount: res.amount,
                currency: res.currency,
                name: 'CareBridge Hospital',
                description: `Subscription: ${planName}`,
                order_id: res.orderId,
                handler: function (response: any) {
                    toast.success('Payment Successful', { description: `Ref: ${response.razorpay_payment_id}` })
                },
                theme: { color: '#3399cc' },
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

        } catch (error) {
            console.error(error)
            toast.error('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
            <HeroHeader />
            <main className="pt-32 min-h-screen container mx-auto px-6">
                <div className="max-w-5xl mx-auto text-center">
                    <h1 className="text-4xl font-bold mb-6">Simple, Transparent Pricing</h1>
                    <p className="text-xl text-muted-foreground mb-12">
                        Choose the plan that fits your facility size and needs.
                    </p>

                    <div className="grid md:grid-cols-3 gap-8 text-left">
                        {/* Starter Plan */}
                        <div className="p-8 border rounded-2xl bg-card flex flex-col">
                            <h3 className="text-xl font-bold mb-2">Starter</h3>
                            <div className="text-3xl font-bold mb-2">₹199<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                            <p className="text-sm text-muted-foreground mb-6">
                                + ₹9 GST (Total ₹208)
                            </p>
                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Up to 5 doctors</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Basic EMR</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Appointment Scheduling</li>
                            </ul>
                            <Button variant="outline" className="w-full" onClick={() => handlePayment(208, 'Starter')}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Get Started (₹208)
                            </Button>
                        </div>

                        {/* Growth Plan */}
                        <div className="p-8 border-2 border-primary rounded-2xl bg-card relative flex flex-col shadow-lg">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">Most Popular</div>
                            <h3 className="text-xl font-bold mb-2">Growth</h3>
                            <div className="text-3xl font-bold mb-2">₹399<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                            <p className="text-sm text-muted-foreground mb-6">
                                + ₹60 GST (Total ₹459)
                            </p>
                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Up to 20 doctors</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Advanced EMR & Billing</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Inpatient Management</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Pharmacy Module</li>
                            </ul>
                            <Button className="w-full" onClick={() => handlePayment(459, 'Growth')}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Start Free Trial (₹459)
                            </Button>
                        </div>

                        {/* Enterprise Plan */}
                        <div className="p-8 border rounded-2xl bg-card flex flex-col">
                            <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                            <div className="text-3xl font-bold mb-6">Custom</div>
                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Unlimited users</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Full Suite Access</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Dedicated Support</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Custom Integrations</li>
                            </ul>
                            <Button variant="outline" className="w-full">Contact Sales</Button>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}

