import { HeroHeader } from "@/components/hero-section-5"
import { Footer } from "@/components/footer-section"

export default function AboutPage() {
    return (
        <>
            <HeroHeader />
            <main className="pt-32 min-h-screen container mx-auto px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl font-bold mb-6">About CareBridge</h1>
                        <p className="text-xl text-muted-foreground">
                            Reimagining healthcare management for the digital age.
                        </p>
                    </div>

                    <div className="prose dark:prose-invert max-w-none">
                        <p className="text-lg leading-relaxed mb-6">
                            CareBridge was founded with a mission to simplify the complex operations of modern hospitals. We believe that technology should empower healthcare providers, not burden them. Our unified platform connects every department, from the reception desk to the operating theatre, ensuring seamless data flow and better patient care.
                        </p>
                        <p className="text-lg leading-relaxed mb-6">
                            With a team of dedicated engineers and healthcare experts, we are committed to building the most intuitive, secure, and scalable hospital information system in the world.
                        </p>

                        <h2 className="text-2xl font-bold mt-12 mb-6">Our Values</h2>
                        <div className="grid md:grid-cols-3 gap-6 not-prose">
                            <div className="p-6 bg-secondary/20 rounded-xl">
                                <h3 className="font-bold mb-2">Innovation</h3>
                                <p className="text-sm">Constantly pushing the boundaries of what's possible in health-tech.</p>
                            </div>
                            <div className="p-6 bg-secondary/20 rounded-xl">
                                <h3 className="font-bold mb-2">Security</h3>
                                <p className="text-sm">Protecting patient data with enterprise-grade security standards.</p>
                            </div>
                            <div className="p-6 bg-secondary/20 rounded-xl">
                                <h3 className="font-bold mb-2">Empathy</h3>
                                <p className="text-sm">Designing with the needs of both patients and providers in mind.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
