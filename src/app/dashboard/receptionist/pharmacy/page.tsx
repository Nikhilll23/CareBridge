import { Suspense } from 'react'
import { NursePharmacyClient } from '@/components/modules/nurse/NursePharmacyClient'

export default function ReceptionistPharmacyPage() {
    return (
        <div className="p-6">
            <Suspense fallback={<div>Loading Pharmacy...</div>}>
                <NursePharmacyClient role="receptionist" />
            </Suspense>
        </div>
    )
}
