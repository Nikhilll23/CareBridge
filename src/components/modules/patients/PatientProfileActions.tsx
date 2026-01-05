'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Phone, Activity, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { syncPatientHealthData } from '@/actions/patients'

interface PatientProfileActionsProps {
    patientId: string
    metriportId: string | null
}

export function PatientProfileActions({ patientId, metriportId }: PatientProfileActionsProps) {
    const [loading, setLoading] = useState(false)

    const handleContact = () => {
        toast.info('Contact feature coming soon', {
            description: 'Messaging system is under development.'
        })
    }

    const handleSync = async () => {
        if (!metriportId) {
            toast.error('Patient not linked to Metriport')
            return
        }

        setLoading(true)
        toast.info('Starting external health records sync...', {
            description: 'This may take a few minutes for data to appear.'
        })

        try {
            const result = await syncPatientHealthData(metriportId)
            if (result.success) {
                toast.success('Sync initiated successfully', {
                    description: 'Check back in a few minutes for new records.'
                })
            } else {
                toast.error('Failed to start sync', {
                    description: result.error
                })
            }
        } catch (error) {
            toast.error('An error occurred during sync')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
            {metriportId && (
                <Button variant="outline" onClick={handleSync} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Sync Records
                </Button>
            )}
            <Button variant="outline" onClick={handleContact}>
                <Phone className="h-4 w-4 mr-2" />
                Contact
            </Button>
            <Link href="/dashboard/emergency">
                <Button className="bg-red-600 hover:bg-red-700 text-white">
                    <Activity className="h-4 w-4 mr-2" />
                    Request Ambulance
                </Button>
            </Link>
        </div>
    )
}
