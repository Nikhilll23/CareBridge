import { Suspense } from 'react'
import { NursingNotesClient } from '@/components/modules/nurse/NursingNotesClient'

export default function NurseNotesPage() {
    return (
        <div className="p-6">
            <Suspense fallback={<div>Loading...</div>}>
                <NursingNotesClient />
            </Suspense>
        </div>
    )
}
