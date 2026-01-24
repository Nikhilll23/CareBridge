'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, ShieldAlert } from 'lucide-react'
import { validateOrder } from '@/actions/safety'
import { toast } from 'sonner'

interface PrescriptionSafetyProps {
    patientId: string
    drugName: string
    vitals?: any
    onConfirm: () => void
    children: React.ReactNode // The Trigger Button (e.g., "Prescribe")
}

export function PrescriptionSafety({ patientId, drugName, vitals, onConfirm, children }: PrescriptionSafetyProps) {
    const [open, setOpen] = useState(false)
    const [checking, setChecking] = useState(false)
    const [warnings, setWarnings] = useState<string[]>([])

    const handlePreCheck = async () => {
        if (!drugName) {
            toast.error('Please enter a drug name first.')
            return
        }

        setChecking(true)
        const result = await validateOrder(patientId, { drugName, vitals })
        setChecking(false)

        if (result.safe) {
            // No issues, proceed directly
            onConfirm()
        } else {
            // Issues found, open alert
            setWarnings(result.warnings)
            setOpen(true)
        }
    }

    return (
        <>
            <div onClick={handlePreCheck} className="inline-block">
                {children}
            </div>

            {/* Loading Indicator Overlay if checking takes time */}
            {checking && (
                <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
                    <div className="bg-card p-4 rounded-md shadow-lg flex items-center gap-2">
                        <Loader2 className="animate-spin text-primary" />
                        <span className="font-medium">Running Clinical Safety Checks...</span>
                    </div>
                </div>
            )}

            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent className="border-red-500 border-2">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <ShieldAlert className="h-6 w-6" />
                            Safety Warning: Clinical Alerts Detected
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2 pt-2">
                            <p className="font-semibold text-foreground">The following issues were found with this order:</p>
                            <ul className="list-disc pl-5 space-y-1 text-red-600 font-medium">
                                {warnings.map((w, i) => (
                                    <li key={i}>{w}</li>
                                ))}
                            </ul>
                            <div className="mt-4 p-3 bg-muted rounded-md text-xs text-muted-foreground">
                                Override these warnings only if you are aware of the risks and have a clinical justification.
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel Order</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setOpen(false)
                                onConfirm() // Execute the override
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Override & Prescribe
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
