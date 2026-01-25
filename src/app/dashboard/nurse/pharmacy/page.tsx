import { Suspense } from 'react'
import { NursePharmacyClient } from '@/components/modules/nurse/NursePharmacyClient'

export default function NursePharmacyPage() {
    return (
        <div className="p-6">
            <Suspense fallback={<div>Loading...</div>}>
                <NursePharmacyClient role="nurse" />
            </Suspense>
        </div>
    )
}
