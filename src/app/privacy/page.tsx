import { HeroHeader } from "@/components/hero-section-5"
import { Footer } from "@/components/footer-section"

export default function PrivacyPage() {
    return (
        <>
            <HeroHeader />
            <main className="pt-32 min-h-screen container mx-auto px-6">
                <div className="max-w-4xl mx-auto py-12 prose dark:prose-invert">
                    <h1 className="text-4xl font-bold mb-8 text-center">Privacy Policy</h1>
                    <p>Last updated: January 2026</p>
                    <p>Your privacy is important to us. It is HIS Core's policy to respect your privacy regarding any information we may collect from you across our website and application.</p>
                    <h3>1. Information We Collect</h3>
                    <p>We may ask for personal information, such as your name, email, and phone number, when you register for an account or request a demo.</p>
                    <h3>2. Use of Data</h3>
                    <p>We use your data to provide and improve our services, process payments, and communicate with you about updates and offers.</p>
                    <h3>3. Security</h3>
                    <p>We take security warnings seriously and implement all industry-standard measures to protect your data.</p>
                </div>
            </main>
            <Footer />
        </>
    )
}
