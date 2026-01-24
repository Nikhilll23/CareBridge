import { Suspense } from 'react'
import { MedicationsClient } from '@/components/modules/nurse/MedicationsClient'

export default function NurseMedicationsPage() {
    return (
        <div className="p-6">
            <Suspense fallback={<div>Loading...</div>}>
                <MedicationsClient />
            </Suspense>
        </div>
    )
}
