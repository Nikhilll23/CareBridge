import { HeroHeader } from "@/components/hero-section-5"
import { Footer } from "@/components/footer-section"

export default function IntegrationPage() {
    return (
        <>
            <HeroHeader />
            <main className="pt-32 min-h-screen container mx-auto px-6">
                <div className="max-w-4xl mx-auto py-12 text-center">
                    <h1 className="text-4xl font-bold mb-8">Seamless Integrations</h1>
                    <p className="text-xl text-muted-foreground mb-12">
                        Connect HIS Core with your favorite tools and devices.
                    </p>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="p-8 border rounded-xl bg-card flex flex-col items-center">
                            <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4 flex items-center justify-center font-bold">L</div>
                            <h3 className="font-bold">LIS Systems</h3>
                        </div>
                        <div className="p-8 border rounded-xl bg-card flex flex-col items-center">
                            <div className="h-16 w-16 bg-green-100 dark:bg-green-900 rounded-full mb-4 flex items-center justify-center font-bold">P</div>
                            <h3 className="font-bold">PACS/RIS</h3>
                        </div>
                        <div className="p-8 border rounded-xl bg-card flex flex-col items-center">
                            <div className="h-16 w-16 bg-purple-100 dark:bg-purple-900 rounded-full mb-4 flex items-center justify-center font-bold">I</div>
                            <h3 className="font-bold">Insurance Portals</h3>
                        </div>
                        <div className="p-8 border rounded-xl bg-card flex flex-col items-center">
                            <div className="h-16 w-16 bg-yellow-100 dark:bg-yellow-900 rounded-full mb-4 flex items-center justify-center font-bold">A</div>
                            <h3 className="font-bold">Accounting Software</h3>
                        </div>
                        <div className="p-8 border rounded-xl bg-card flex flex-col items-center">
                            <div className="h-16 w-16 bg-red-100 dark:bg-red-900 rounded-full mb-4 flex items-center justify-center font-bold">H</div>
                            <h3 className="font-bold">HL7 Devices</h3>
                        </div>
                        <div className="p-8 border rounded-xl bg-card flex flex-col items-center">
                            <div className="h-16 w-16 bg-indigo-100 dark:bg-indigo-900 rounded-full mb-4 flex items-center justify-center font-bold">P</div>
                            <h3 className="font-bold">Payment Gateways</h3>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
