'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ReferralRequestModal } from './ReferralRequestModal'
import { Plus, User, Stethoscope, ArrowRight, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Referral } from '@/types'
import { format } from 'date-fns'

interface ClientProps {
    initialReferrals: Referral[]
    patientId: string
}

export function PatientReferralsClient({ initialReferrals, patientId }: ClientProps) {
    const [referrals, setReferrals] = useState<Referral[]>(initialReferrals)
    const [showRequestModal, setShowRequestModal] = useState(false)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'REJECTED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            case 'COMPLETED': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        }
    }

    return (
        <>
            <div className="flex justify-end mb-6">
                <Button onClick={() => setShowRequestModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Request New Referral
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {referrals.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                        <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <h3 className="font-semibold text-lg text-muted-foreground">No referrals found</h3>
                        <p className="text-sm text-muted-foreground mb-4">You haven't requested any referrals yet.</p>
                        <Button variant="outline" onClick={() => setShowRequestModal(true)}>Request Now</Button>
                    </div>
                ) : (
                    referrals.map((referral) => (
                        <Card key={referral.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                                            <Stethoscope className="h-4 w-4 text-primary" />
                                            {referral.target_specialization}
                                        </CardTitle>
                                        <Badge variant="secondary" className={getStatusColor(referral.status)}>
                                            {referral.status}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(referral.created_at), 'MMM d, yyyy')}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Reason</span>
                                        <p className="font-medium line-clamp-2">{referral.reason}</p>
                                    </div>

                                    {referral.target_doctor && (
                                        <div className="bg-muted/50 p-2 rounded flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${referral.target_doctor.first_name}`} />
                                                <AvatarFallback>DR</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-xs">Referred To</p>
                                                <p className="font-semibold text-xs">Dr. {referral.target_doctor.first_name} {referral.target_doctor.last_name}</p>
                                            </div>
                                        </div>
                                    )}

                                    {referral.notes && (
                                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded text-xs border border-blue-100 dark:border-blue-900/20">
                                            <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">Doctor's Note:</p>
                                            <p className="text-muted-foreground">{referral.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <ReferralRequestModal
                open={showRequestModal}
                onOpenChange={setShowRequestModal}
                patientId={patientId}
            />
        </>
    )
}
