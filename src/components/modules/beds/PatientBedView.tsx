'use client'

import { useEffect, useState } from 'react'
import { getPatientBedAllocation } from '@/actions/beds'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bed, MapPin, Building, Calendar } from 'lucide-react'
import { safeFormat } from '@/lib/date'

interface PatientBedViewProps {
    userEmail: string
}

export function PatientBedView({ userEmail }: PatientBedViewProps) {
    const [bedAllocation, setBedAllocation] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getPatientBedAllocation(userEmail)
            .then(setBedAllocation)
            .catch(() => setBedAllocation(null))
            .finally(() => setLoading(false))
    }, [userEmail])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading your bed information...</p>
                </div>
            </div>
        )
    }

    if (!bedAllocation) {
        return (
            <Card className="max-w-2xl mx-auto">
                <CardContent className="pt-6">
                    <div className="text-center py-12">
                        <Bed className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Bed Allocated</h3>
                        <p className="text-muted-foreground">
                            You currently don't have a bed allocated. Please contact the hospital staff if you need assistance.
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const { bed, allocated_at } = bedAllocation

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold mb-2">Your Bed Allocation</h2>
                <p className="text-muted-foreground">View details about your assigned bed and ward</p>
            </div>

            <Card className="border-2 border-primary/20">
                <CardHeader className="bg-primary/5">
                    <CardTitle className="flex items-center gap-2">
                        <Bed className="h-5 w-5 text-primary" />
                        Bed Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Bed Details */}
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Ward</p>
                                    <p className="font-semibold text-lg">{bed.ward.name}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Bed className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Bed Number</p>
                                    <p className="font-semibold text-lg">{bed.bed_number}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Floor</p>
                                    <p className="font-semibold text-lg">
                                        {bed.ward.floor_number ? `Floor ${bed.ward.floor_number}` : 'Ground Floor'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Allocated On</p>
                                    <p className="font-semibold">
                                        <p className="font-medium">{safeFormat(bedAllocation.allocated_at, 'MMM d, yyyy h:mm a')}</p>
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Bed Type</p>
                                <Badge variant="secondary" className="text-sm px-3 py-1">
                                    {bed.type}
                                </Badge>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Status</p>
                                <Badge className="text-sm px-3 py-1 bg-green-500 hover:bg-green-600">
                                    Occupied
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Ward Location Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Ward Location</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground mb-2">Full Location</p>
                        <p className="font-medium">
                            {bed.ward.name} • {bed.bed_number} •
                            {bed.ward.floor_number ? ` Floor ${bed.ward.floor_number}` : ' Ground Floor'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Help Card */}
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <CardContent className="pt-6">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Need assistance?</strong> If you have any questions about your bed allocation or need to request a change,
                        please contact the nursing station or use the call button near your bed.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
