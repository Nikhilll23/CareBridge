import { HeroHeader } from "@/components/hero-section-5"
import { Footer } from "@/components/footer-section"

export default function SolutionPage() {
    return (
        <>
            <HeroHeader />
            <main className="pt-32 min-h-screen container mx-auto px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl font-bold mb-6">Complete Healthcare Solutions</h1>
                    <p className="text-xl text-muted-foreground mb-12">
                        Tailored solutions for hospitals, clinics, and multi-specialty centers.
                    </p>
                    <div className="grid md:grid-cols-3 gap-8 text-left">
                        <div className="p-8 border rounded-2xl bg-card">
                            <div className="h-12 w-12 bg-primary/10 rounded-lg mb-4 flex items-center justify-center text-primary font-bold">H</div>
                            <h3 className="text-xl font-semibold mb-2">Hospitals</h3>
                            <p className="text-muted-foreground">Enterprise-grade management for large scale medical facilities.</p>
                        </div>
                        <div className="p-8 border rounded-2xl bg-card">
                            <div className="h-12 w-12 bg-primary/10 rounded-lg mb-4 flex items-center justify-center text-primary font-bold">C</div>
                            <h3 className="text-xl font-semibold mb-2">Clinics</h3>
                            <p className="text-muted-foreground">Efficient practice management for OPD clinics and private practitioners.</p>
                        </div>
                        <div className="p-8 border rounded-2xl bg-card">
                            <div className="h-12 w-12 bg-primary/10 rounded-lg mb-4 flex items-center justify-center text-primary font-bold">L</div>
                            <h3 className="text-xl font-semibold mb-2">Labs</h3>
                            <p className="text-muted-foreground">Integrated LIS for pathology and diagnostic centers.</p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
