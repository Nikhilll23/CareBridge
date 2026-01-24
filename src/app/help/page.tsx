import { HeroHeader } from "@/components/hero-section-5"
import { Footer } from "@/components/footer-section"

export default function HelpPage() {
    return (
        <>
            <HeroHeader />
            <main className="pt-32 min-h-screen container mx-auto px-6">
                <div className="max-w-4xl mx-auto py-12 text-center">
                    <h1 className="text-4xl font-bold mb-8">Help Center</h1>
                    <p className="text-xl text-muted-foreground mb-8">How can we help you today?</p>
                    <div className="max-w-xl mx-auto mb-12">
                        <input type="text" placeholder="Search for help articles..." className="w-full px-4 py-3 rounded-lg border bg-background" />
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 text-left">
                        <div className="p-6 border rounded-xl bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                            <h3 className="font-bold mb-2">Getting Started</h3>
                            <p className="text-sm text-muted-foreground">Setup your account and profile settings.</p>
                        </div>
                        <div className="p-6 border rounded-xl bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                            <h3 className="font-bold mb-2">Billing & Subscriptions</h3>
                            <p className="text-sm text-muted-foreground">Manage your plan and payment methods.</p>
                        </div>
                        <div className="p-6 border rounded-xl bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                            <h3 className="font-bold mb-2">Troubleshooting</h3>
                            <p className="text-sm text-muted-foreground">Common issues and error messages.</p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
