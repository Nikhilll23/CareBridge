import { HeroHeader } from "@/components/hero-section-5"
import { Footer } from "@/components/footer-section"

export default function TermsPage() {
    return (
        <>
            <HeroHeader />
            <main className="pt-32 min-h-screen container mx-auto px-6">
                <div className="max-w-4xl mx-auto py-12 prose dark:prose-invert">
                    <h1 className="text-4xl font-bold mb-8 text-center">Terms of Service</h1>
                    <p>By accessing our website and using our services, you agree to these terms.</p>
                    <h3>1. License</h3>
                    <p>Permission is granted to temporarily download one copy of the materials (information or software) on CareBridge's website for personal, non-commercial transitory viewing only.</p>
                    <h3>2. Disclaimer</h3>
                    <p>The materials on CareBridge's website are provided on an 'as is' basis. CareBridge makes no warranties, expressed or implied.</p>
                    <h3>3. Limitations</h3>
                    <p>In no event shall CareBridge or its suppliers be liable for any damages arising out of the use or inability to use the materials on CareBridge's website.</p>
                </div>
            </main>
            <Footer />
        </>
    )
}
