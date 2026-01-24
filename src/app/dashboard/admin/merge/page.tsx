'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { mergePatients } from '@/actions/patients'
import { toast } from 'sonner'
import { ArrowRight, AlertTriangle, Check, Loader2, GitMerge } from 'lucide-react'

export default function AdminMergePage() {
    const [primaryId, setPrimaryId] = useState('')
    const [secondaryId, setSecondaryId] = useState('')
    const [isMerging, setIsMerging] = useState(false)

    const handleMerge = async () => {
        if (!primaryId || !secondaryId) {
            toast.error('Both Patient IDs are required')
            return
        }
        if (primaryId === secondaryId) {
            toast.error('Cannot merge a patient into themselves')
            return
        }

        if (!confirm('WARNING: This action cannot be undone. All data will be moved to the Primary ID, and the Secondary ID will be DELETED. Are you sure?')) {
            return
        }

        setIsMerging(true)
        try {
            const res = await mergePatients(primaryId, secondaryId)
            if (res.success) {
                toast.success('Merge Successful!')
                setSecondaryId('')
            } else {
                toast.error(res.error || 'Merge Failed')
            }
        } catch {
            toast.error('Unexpected error')
        } finally {
            setIsMerging(false)
        }
    }

    return (
        <div className="container mx-auto py-10 max-w-4xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Patient Records Merge Tool</h1>
                <p className="text-muted-foreground">
                    Administrative tool to resolve duplicate patient entries.
                    All clinical data (Appointments, Vitals, History) will be migrated to the
                    <strong> Target Keeper Record</strong>.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                {/* Source (Delete) */}
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Source Record
                        </CardTitle>
                        <CardDescription>This record will be <strong>DELETED</strong></CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Input
                            placeholder="Enter Duplicate Patient UUID"
                            value={secondaryId}
                            onChange={e => setSecondaryId(e.target.value)}
                            className="font-mono"
                        />
                    </CardContent>
                </Card>

                <div className="flex justify-center flex-col items-center gap-2">
                    <ArrowRight className="h-8 w-8 text-muted-foreground hidden md:block" />
                    <div className="md:hidden text-muted-foreground">Merge Into</div>
                </div>

                {/* Target (Keep) */}
                <Card className="border-green-500/50 bg-green-500/5">
                    <CardHeader>
                        <CardTitle className="text-green-700 flex items-center gap-2">
                            <Check className="h-5 w-5" />
                            Target Record
                        </CardTitle>
                        <CardDescription>This record will be <strong>KEPT</strong></CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Input
                            placeholder="Enter Primary Patient UUID"
                            value={primaryId}
                            onChange={e => setPrimaryId(e.target.value)}
                            className="font-mono bg-background"
                        />
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-center">
                <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleMerge}
                    disabled={isMerging}
                    className="w-full md:w-auto min-w-[200px]"
                >
                    {isMerging ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Merging Records...
                        </>
                    ) : (
                        <>
                            <GitMerge className="mr-2 h-4 w-4" />
                            Confirm Merge Operation
                        </>
                    )}
                </Button>
            </div>

            <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground">
                <h4 className="font-semibold mb-2">What happens during a merge?</h4>
                <ul className="list-disc list-inside space-y-1">
                    <li>Appointments are reassigned to the Target ID.</li>
                    <li>Invoices and Payments are moved to the Target ID.</li>
                    <li>Medical history and uploaded documents are linked to the Target ID.</li>
                    <li>The Source Patient record is permanently deleted.</li>
                    <li>An audit log entry is created for compliance.</li>
                </ul>
            </div>
        </div>
    )
}
