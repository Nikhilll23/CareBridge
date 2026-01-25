import { Suspense } from 'react'
import { NurseInvoicesClient } from '@/components/modules/nurse/NurseInvoicesClient'

export default function ReceptionistInvoicesPage() {
    return (
        <div className="p-6">
            <Suspense fallback={<div>Loading...</div>}>
                <NurseInvoicesClient />
            </Suspense>
        </div>
    )
}
