'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bed, User } from 'lucide-react'

export interface BedData {
    id: string
    bedNumber: string
    status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'
    dailyCharge: number
    wardId: string
    wardName: string
    currentPatient?: {
        name: string
        uhid: string
    }
}

interface BedBoardProps {
    beds: BedData[]
}

export function BedBoard({ beds }: BedBoardProps) {
    const stats = {
        total: beds.length,
        occupied: beds.filter(b => b.status === 'OCCUPIED').length,
        available: beds.filter(b => b.status === 'AVAILABLE').length,
        maintenance: beds.filter(b => b.status === 'MAINTENANCE').length
    }

    // Group by Ward
    const wards = beds.reduce((acc, bed) => {
        if (!acc[bed.wardName]) acc[bed.wardName] = []
        acc[bed.wardName].push(bed)
        return acc
    }, {} as Record<string, BedData[]>)

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="py-4"><CardTitle className="text-sm font-medium">Total Beds</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-4"><CardTitle className="text-sm font-medium text-green-600">Available</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{stats.available}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-4"><CardTitle className="text-sm font-medium text-blue-600">Occupied</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-blue-600">{stats.occupied}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-4"><CardTitle className="text-sm font-medium text-orange-500">Maintenance</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-orange-500">{stats.maintenance}</div></CardContent>
                </Card>
            </div>

            {Object.entries(wards).map(([wardName, wardBeds]) => (
                <div key={wardName} className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <div className="h-4 w-1 bg-primary rounded-full"></div>
                        {wardName}
                        <span className="text-sm font-normal text-muted-foreground">({wardBeds.length} beds)</span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {wardBeds.map(bed => (
                            <Card key={bed.id} className={`
                                border-2 cursor-pointer hover:shadow-md transition-all
                                ${bed.status === 'AVAILABLE' ? 'border-green-200 bg-green-50/50' : ''}
                                ${bed.status === 'OCCUPIED' ? 'border-blue-200 bg-blue-50/50' : ''}
                                ${bed.status === 'MAINTENANCE' ? 'border-orange-200 bg-orange-50/50' : ''}
                            `}>
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
                                    <Bed className={`h-8 w-8 
                                        ${bed.status === 'AVAILABLE' ? 'text-green-500' : ''}
                                        ${bed.status === 'OCCUPIED' ? 'text-blue-500' : ''}
                                        ${bed.status === 'MAINTENANCE' ? 'text-orange-400' : ''}
                                `} />
                                    <div>
                                        <div className="font-bold">{bed.bedNumber}</div>
                                        <div className="text-xs text-muted-foreground">${bed.dailyCharge}/day</div>
                                    </div>
                                    <Badge variant={bed.status === 'AVAILABLE' ? 'outline' : 'secondary'} className="text-[10px] h-5">
                                        {bed.status}
                                    </Badge>
                                    {bed.currentPatient && (
                                        <div className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full w-full truncate">
                                            {bed.currentPatient.name}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
