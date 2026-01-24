import { HeroHeader } from "@/components/hero-section-5"
import { Footer } from "@/components/footer-section"

export default function BrandPage() {
    return (
        <>
            <HeroHeader />
            <main className="pt-32 min-h-screen container mx-auto px-6">
                <div className="max-w-4xl mx-auto py-12 text-center">
                    <h1 className="text-4xl font-bold mb-8">Brand Assets</h1>
                    <p className="text-xl text-muted-foreground mb-12">Download official HIS Core logos and assets.</p>

                    <div className="p-12 border border-dashed rounded-xl bg-muted/20 mb-8">
                        <div className="text-6xl font-black mb-4 flex items-center justify-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
                                <span className="text-4xl font-bold text-primary-foreground">H</span>
                            </div>
                            HIS Core
                        </div>
                        <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium">Download Logo Pack</button>
                    </div>

                    <div className="text-left prose dark:prose-invert mx-auto">
                        <h3>Usage Guidelines</h3>
                        <ul>
                            <li>Do not stretch or distort the logo.</li>
                            <li>Ensure sufficient contrast with the background.</li>
                            <li>Use the official brand colors.</li>
                        </ul>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
