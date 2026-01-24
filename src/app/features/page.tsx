import { HeroHeader } from "@/components/hero-section-5"
import { Footer } from "@/components/footer-section"

export default function FeaturesPage() {
    return (
        <>
            <HeroHeader />
            <main className="pt-32 min-h-screen container mx-auto px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl font-bold mb-6">Powerful Features for Modern Healthcare</h1>
                    <p className="text-xl text-muted-foreground mb-12">
                        Discover how HIS Core transforms hospital operations with our comprehensive suite of tools.
                    </p>
                    {/* Add more content here as needed */}
                    <div className="grid md:grid-cols-2 gap-8 text-left">
                        <div className="p-6 border rounded-xl bg-card">
                            <h3 className="text-xl font-semibold mb-2">Patient Management</h3>
                            <p className="text-muted-foreground">Streamline admissions, discharges, and transfers with real-time bed tracking.</p>
                        </div>
                        <div className="p-6 border rounded-xl bg-card">
                            <h3 className="text-xl font-semibold mb-2">Clinical Workstation</h3>
                            <p className="text-muted-foreground">Unified EMR, CPOE, and diagnostic reports in a single interface.</p>
                        </div>
                        <div className="p-6 border rounded-xl bg-card">
                            <h3 className="text-xl font-semibold mb-2">Billing & Revenue</h3>
                            <p className="text-muted-foreground">Automated charge capture, insurance processing, and integrated billing.</p>
                        </div>
                        <div className="p-6 border rounded-xl bg-card">
                            <h3 className="text-xl font-semibold mb-2">Pharmacy & Inventory</h3>
                            <p className="text-muted-foreground">Smart inventory management with medicine expiry alerts and stock tracking.</p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
