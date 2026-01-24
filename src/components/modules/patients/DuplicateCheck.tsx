'use client'

import { useState } from 'react'
import { checkDuplicate } from '@/actions/duplicates'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, UserCheck } from 'lucide-react'

interface DuplicateCheckProps {
    firstName: string
    lastName: string
    phone: string
    onConfirmed: () => void // Called if user overrides or no duplicate
    onUseExisting?: (id: string) => void
}

export function DuplicateCheck({ firstName, lastName, phone, onConfirmed, onUseExisting }: DuplicateCheckProps) {
    const [checking, setChecking] = useState(false)
    const [match, setMatch] = useState<any>(null)
    const [checked, setChecked] = useState(false)

    const handleCheck = async () => {
        if (!firstName || !phone) return
        setChecking(true)
        const res = await checkDuplicate(firstName, lastName, phone)
        setChecking(false)
        setChecked(true)

        if (res.found) {
            setMatch(res.patient)
        } else {
            onConfirmed()
        }
    }

    if (match) {
        return (
            <Card className="border-orange-300 bg-orange-50 mb-4">
                <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-orange-600 h-5 w-5 mt-1" />
                        <div>
                            <h4 className="font-bold text-orange-800">Potential Duplicate Found</h4>
                            <p className="text-sm text-orange-700">
                                A patient matches these details:
                            </p>
                            <div className="mt-2 bg-white/50 p-2 rounded text-sm">
                                <strong>{match.first_name} {match.last_name}</strong><br />
                                <span className="text-xs">UHID: {match.uhid}</span><br />
                                <span className="text-xs">Phone: {match.contact_number}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => onConfirmed()}>
                            Create New Anyway
                        </Button>
                        <Button variant="default" size="sm" onClick={() => onUseExisting?.(match.id)}>
                            Use Existing
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="mb-4">
            {!checked && (
                <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCheck}
                    disabled={checking || !firstName || !phone}
                    className="w-full"
                >
                    {checking ? 'Checking...' : 'Check for Duplicates'}
                </Button>
            )}
            {checked && !match && (
                <div className="flex items-center gap-2 text-green-600 text-sm p-2 bg-green-50 rounded">
                    <UserCheck className="h-4 w-4" />
                    No Duplicates Found
                </div>
            )}
        </div>
    )
}
