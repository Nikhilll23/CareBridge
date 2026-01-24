import { HeroHeader } from "@/components/hero-section-5"
import { Footer } from "@/components/footer-section"

export default function ChangelogPage() {
    return (
        <>
            <HeroHeader />
            <main className="pt-32 min-h-screen container mx-auto px-6">
                <div className="max-w-3xl mx-auto py-12">
                    <h1 className="text-4xl font-bold mb-12 text-center">Changelog</h1>

                    <div className="relative border-l border-muted pl-8 space-y-12">
                        <div className="relative">
                            <div className="absolute -left-[39px] h-5 w-5 rounded-full bg-primary border-4 border-background"></div>
                            <div className="text-sm text-muted-foreground mb-1">v2.0.0 - January 25, 2026</div>
                            <h3 className="text-2xl font-bold mb-4">Major UI Overhaul</h3>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                <li>Complete redesign of the dashboard interface.</li>
                                <li>New fast-action command menu (Ctrl+K).</li>
                                <li>Improved dark mode support.</li>
                            </ul>
                        </div>

                        <div className="relative">
                            <div className="absolute -left-[39px] h-5 w-5 rounded-full bg-muted border-4 border-background"></div>
                            <div className="text-sm text-muted-foreground mb-1">v1.5.0 - December 10, 2025</div>
                            <h3 className="text-2xl font-bold mb-4">Pharmacy Module</h3>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                <li>Added inventory tracking for pharmacy.</li>
                                <li>Integration with billing for automatic charge capture.</li>
                            </ul>
                        </div>
                        <div className="relative">
                            <div className="absolute -left-[39px] h-5 w-5 rounded-full bg-muted border-4 border-background"></div>
                            <div className="text-sm text-muted-foreground mb-1">v1.0.0 - August 1, 2025</div>
                            <h3 className="text-2xl font-bold mb-4">Initial Release</h3>
                            <p className="text-muted-foreground">Public launch of HIS Core.</p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
