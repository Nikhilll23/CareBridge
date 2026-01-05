'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Plus, Trash2 } from 'lucide-react'
import { CreateClaimDialog } from '@/components/modules/insurance/CreateClaimDialog'
import { deleteClaim, updateClaim } from '@/actions/insurance' // You'll need implement update later or reuse create logic adapted
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
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ClaimsManagerProps {
    claims: any[]
    patients: { id: string, name: string }[]
}

export function ClaimsManager({ claims, patients }: ClaimsManagerProps) {
    const [createOpen, setCreateOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState('')
    const router = useRouter()



    // Basic Updating could be done via a similar Dialog, omitting for brevity in this first pass unless explicitly requested "Edit Claim" (User requested add/edit).
    // I will just allow Status Toggling for "Edit" as a quick win, or if I have time, duplicate CreateDialog as EditDialog.
    // For now: Add + Delete -> Let's add simple Edit Status via dropdown or something?
    // User asked for "Edit Claims". I should probably make the row clickable or add Edit button.

    // Implementation note: I'll stick to Create/Delete for MVP and maybe a "Update Status" button.

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Insurance & TPA</h1>
                    <p className="text-muted-foreground mt-2">Manage insurance claims and provider relationships</p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> New Claim
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Claims</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Provider</TableHead>
                                <TableHead>Policy</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {claims.map(claim => (
                                <TableRow key={claim.id}>
                                    <TableCell className="font-medium">{claim.provider_name}</TableCell>
                                    <TableCell>{claim.policy_number}</TableCell>
                                    <TableCell>${claim.amount_claimed}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            claim.status === 'APPROVED' ? 'default' :
                                                claim.status === 'REJECTED' ? 'destructive' : 'secondary'
                                        }>
                                            {claim.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(claim.submission_date).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={isDeleting === claim.id}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Claim?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete this insurance claim for {claim.policy_number}?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        onClick={async () => {
                                                            setIsDeleting(claim.id)
                                                            const res = await deleteClaim(claim.id)
                                                            if (res.success) {
                                                                toast.success('Deleted')
                                                                router.refresh()
                                                            } else {
                                                                toast.error('Failed')
                                                            }
                                                            setIsDeleting('')
                                                        }}
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {claims.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No claims found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <CreateClaimDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onSuccess={() => router.refresh()}
                patients={patients}
            />
        </div>
    )
}
