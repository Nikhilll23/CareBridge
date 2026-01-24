import { HeroHeader } from "@/components/hero-section-5"
import { Footer } from "@/components/footer-section"

export default function BlogPage() {
    return (
        <>
            <HeroHeader />
            <main className="pt-32 min-h-screen container mx-auto px-6">
                <div className="max-w-5xl mx-auto py-12">
                    <h1 className="text-4xl font-bold mb-8 text-center">Latest from Our Blog</h1>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="border rounded-xl overflow-hidden bg-card">
                                <div className="h-48 bg-muted animate-pulse"></div>
                                <div className="p-6">
                                    <div className="text-sm text-muted-foreground mb-2">March {i}, 2026</div>
                                    <h3 className="text-xl font-semibold mb-2">The Future of Digital Health</h3>
                                    <p className="text-muted-foreground mb-4">How AI and cloud computing are revolutionizing hospital management.</p>
                                    <span className="text-primary font-medium cursor-pointer">Read more &rarr;</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
