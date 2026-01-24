import { HeroHeader } from "@/components/hero-section-5"
import { Footer } from "@/components/footer-section"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

export default function PricingPage() {
    return (
        <>
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
                            <div className="text-3xl font-bold mb-6">$199<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Up to 5 doctors</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Basic EMR</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Appointment Scheduling</li>
                            </ul>
                            <Button variant="outline" className="w-full">Get Started</Button>
                        </div>

                        {/* Growth Plan */}
                        <div className="p-8 border-2 border-primary rounded-2xl bg-card relative flex flex-col shadow-lg">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">Most Popular</div>
                            <h3 className="text-xl font-bold mb-2">Growth</h3>
                            <div className="text-3xl font-bold mb-6">$499<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Up to 20 doctors</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Advanced EMR & Billing</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Inpatient Management</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Pharmacy Module</li>
                            </ul>
                            <Button className="w-full">Start Free Trial</Button>
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
