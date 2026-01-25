'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Referral, ReferralStatus } from '@/types'
import { format } from 'date-fns'
import { updateReferralStatus } from '@/actions/referrals'
import { toast } from 'sonner'
import { Check, X, User, ArrowRight, Video, FileText, Clock, Plus } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { DoctorCreateReferralModal } from './DoctorCreateReferralModal'

interface ClientProps {
    initialReferrals: Referral[]
    doctorId: string
}

export function DoctorReferralsClient({ initialReferrals, doctorId }: ClientProps) {
    const [referrals, setReferrals] = useState<Referral[]>(initialReferrals)
    const [activeTab, setActiveTab] = useState('received')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [actionModal, setActionModal] = useState<{ open: boolean, id: string | null, action: 'APPROVE' | 'REJECT' | null }>({
        open: false,
        id: null,
        action: null
    })
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    // Filter referrals
    const receivedReferrals = referrals.filter(r => r.target_doctor_id === doctorId || (!r.target_doctor_id && r.status === 'REQUESTED'))
    const sentReferrals = referrals.filter(r => r.referring_doctor_id === doctorId)

    const handleAction = (id: string, action: 'APPROVE' | 'REJECT') => {
        setActionModal({ open: true, id, action })
        setNotes('')
    }

    const confirmAction = async () => {
        if (!actionModal.id || !actionModal.action) return

        setLoading(true)
        const status: ReferralStatus = actionModal.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'

        try {
            const result = await updateReferralStatus(actionModal.id, status, notes)
            if (result.success) {
                toast.success(`Referral ${status.toLowerCase()} successfully`)
                setReferrals(prev => prev.map(r => r.id === actionModal.id ? { ...r, status, notes: notes || r.notes } : r))
                setActionModal({ open: false, id: null, action: null })
            } else {
                toast.error(result.error || 'Failed to update status')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

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
            <Tabs defaultValue="received" className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="received">Received Requests ({receivedReferrals.length})</TabsTrigger>
                        <TabsTrigger value="sent">Sent Referrals ({sentReferrals.length})</TabsTrigger>
                    </TabsList>
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Referral
                    </Button>
                </div>

                <TabsContent value="received" className="space-y-4">
                    {receivedReferrals.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">No incoming referral requests</div>
                    ) : (
                        receivedReferrals.map(referral => (
                            <Card key={referral.id}>
                                <CardHeader className="flex flex-row items-start justify-between pb-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${referral.patient?.first_name}`} />
                                                <AvatarFallback>PT</AvatarFallback>
                                            </Avatar>
                                            <CardTitle className="text-base font-semibold">
                                                {referral.patient?.first_name} {referral.patient?.last_name}
                                            </CardTitle>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Request for {referral.target_specialization}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className={getStatusColor(referral.status)}>
                                        {referral.status}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="pb-2">
                                    <div className="bg-muted/30 p-3 rounded-md text-sm">
                                        <span className="font-medium">Reason: </span>
                                        {referral.reason}
                                    </div>
                                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(referral.created_at), 'MMM d, yyyy h:mm a')}
                                    </div>
                                </CardContent>
                                {referral.status === 'REQUESTED' && (
                                    <CardFooter className="gap-2 pt-2">
                                        <Button
                                            size="sm"
                                            className="w-full bg-green-600 hover:bg-green-700"
                                            onClick={() => handleAction(referral.id, 'APPROVE')}
                                        >
                                            <Check className="mr-2 h-4 w-4" /> Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="w-full hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/40"
                                            onClick={() => handleAction(referral.id, 'REJECT')}
                                        >
                                            <X className="mr-2 h-4 w-4" /> Reject
                                        </Button>
                                    </CardFooter>
                                )}
                            </Card>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="sent" className="space-y-4">
                    {sentReferrals.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">You haven't sent any referrals</div>
                    ) : (
                        sentReferrals.map(referral => (
                            <Card key={referral.id}>
                                <CardHeader className="flex flex-row items-start justify-between pb-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${referral.target_doctor?.first_name}`} />
                                                <AvatarFallback>DR</AvatarFallback>
                                            </Avatar>
                                            <CardTitle className="text-base font-semibold">
                                                To: Dr. {referral.target_doctor?.first_name || 'Generic'} {referral.target_doctor?.last_name}
                                            </CardTitle>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Patient: {referral.patient?.first_name} {referral.patient?.last_name}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className={getStatusColor(referral.status)}>
                                        {referral.status}
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm">
                                        <span className="font-medium">Reason: </span>
                                        {referral.reason}
                                    </div>
                                    {referral.notes && (
                                        <div className="mt-2 text-sm text-muted-foreground border-l-2 pl-2">
                                            NOTE: {referral.notes}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>

            <Dialog open={actionModal.open} onOpenChange={(val) => !val && setActionModal({ open: false, id: null, action: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionModal.action === 'APPROVE' ? 'Approve Referral' : 'Reject Referral'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Notes (Optional)</Label>
                            <Textarea
                                placeholder={actionModal.action === 'APPROVE' ? "Add instructions for the patient..." : "Reason for rejection..."}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionModal({ open: false, id: null, action: null })}>Cancel</Button>
                        <Button
                            variant={actionModal.action === 'REJECT' ? "destructive" : "default"}
                            onClick={confirmAction}
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : 'Confirm'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DoctorCreateReferralModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                doctorId={doctorId}
            />

        </>
    )
}
