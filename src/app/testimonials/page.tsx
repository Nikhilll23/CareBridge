import { HeroHeader } from "@/components/hero-section-5"
import { Footer } from "@/components/footer-section"

export default function TestimonialsPage() {
    return (
        <>
            <HeroHeader />
            <main className="pt-32 min-h-screen container mx-auto px-6">
                <div className="max-w-4xl mx-auto py-12 text-center">
                    <h1 className="text-4xl font-bold mb-8">What Our Customers Say</h1>
                    <div className="grid md:grid-cols-2 gap-6 text-left">
                        <div className="p-6 border rounded-xl bg-card">
                            <p className="italic mb-4">"CareBridge transformed our hospital workflow overnight. The nurse station module is a game changer."</p>
                            <div className="font-bold">- Dr. Sarah, Chief of Medicine</div>
                        </div>
                        <div className="p-6 border rounded-xl bg-card">
                            <p className="italic mb-4">"Billing errors dropped by 90% after we switched to CareBridge. Highly recommended."</p>
                            <div className="font-bold">- Mark, Hospital Administrator</div>
                        </div>
                        <div className="p-6 border rounded-xl bg-card">
                            <p className="italic mb-4">"The interface is so intuitive, our staff needed very little training."</p>
                            <div className="font-bold">- Jennifer, Head Nurse</div>
                        </div>
                        <div className="p-6 border rounded-xl bg-card">
                            <p className="italic mb-4">"Support is fantastic. Any issues are resolved within minutes."</p>
                            <div className="font-bold">- David, IT Director</div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
