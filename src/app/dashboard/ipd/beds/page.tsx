import { getBedStats } from '@/actions/ipd'
import { BedBoard } from '@/components/modules/ipd/BedBoard'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function IPDPage() {
    const beds = await getBedStats()

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">In-Patient Department (IPD)</h1>
                    <p className="text-muted-foreground">Manage Wards, Beds, and Admissions</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Admission
                </Button>
            </div>

            <div className="bg-muted/10 p-6 rounded-xl border">
                <BedBoard beds={beds} />
            </div>
        </div>
    )
}
