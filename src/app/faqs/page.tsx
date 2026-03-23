import { HeroHeader } from "@/components/hero-section-5"
import { Footer } from "@/components/footer-section"

export default function FAQsPage() {
    return (
        <>
            <HeroHeader />
            <main className="pt-32 min-h-screen container mx-auto px-6">
                <div className="max-w-4xl mx-auto py-12">
                    <h1 className="text-4xl font-bold mb-8 text-center">Frequently Asked Questions</h1>
                    <div className="space-y-6">
                        <div className="p-6 border rounded-lg bg-card">
                            <h3 className="text-lg font-semibold mb-2">How secure is CareBridge?</h3>
                            <p className="text-muted-foreground">We adhere to global standards like HIPAA and GDPR. Data is encrypted at rest and in transit.</p>
                        </div>
                        <div className="p-6 border rounded-lg bg-card">
                            <h3 className="text-lg font-semibold mb-2">Can it integrate with our existing lab machines?</h3>
                            <p className="text-muted-foreground">Yes, CareBridge supports HL7 and DICOM standards for seamless device integration.</p>
                        </div>
                        <div className="p-6 border rounded-lg bg-card">
                            <h3 className="text-lg font-semibold mb-2">Is training available?</h3>
                            <p className="text-muted-foreground">We provide comprehensive onsite and online training for all staff members.</p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
