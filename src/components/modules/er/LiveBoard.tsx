'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getActiveERVisits, updateERStatus } from '@/actions/er'
import { Clock, AlertCircle } from 'lucide-react'
import { differenceInMinutes } from 'date-fns'

export function LiveBoard() {
    const [visits, setVisits] = useState<any[]>([])
    const supabase = createSupabaseBrowserClient()

    // 1. Initial Load
    useEffect(() => {
        getActiveERVisits().then(setVisits)
    }, [])

    // 2. Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel('er_live')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'er_visits' },
                () => {
                    // Simple strategy: Re-fetch all on any change
                    getActiveERVisits().then(setVisits)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    // Group by Category for Columns
    const categories = {
        RED: visits.filter(v => v.triage_category === 'RED'),
        YELLOW: visits.filter(v => v.triage_category === 'YELLOW'),
        GREEN: visits.filter(v => v.triage_category === 'GREEN'),
    }

    const handleMove = async (id: string, newStatus: string) => {
        await updateERStatus(id, newStatus)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
            {/* RED COLUMN */}
            <Column
                title="RED - Critical (Immediate)"
                color="bg-red-50 border-red-200"
                items={categories.RED}
                onMove={handleMove}
            />
            {/* YELLOW COLUMN */}
            <Column
                title="YELLOW - Urgent (30m)"
                color="bg-yellow-50 border-yellow-200"
                items={categories.YELLOW}
                onMove={handleMove}
            />
            {/* GREEN COLUMN */}
            <Column
                title="GREEN - Non-Urgent (2h)"
                color="bg-green-50 border-green-200"
                items={categories.GREEN}
                onMove={handleMove}
            />
        </div>
    )
}

function Column({ title, color, items, onMove }: any) {
    return (
        <div className={`rounded-xl border p-4 flex flex-col gap-4 ${color}`}>
            <h3 className="font-bold text-lg flex justify-between items-center">
                {title}
                <Badge variant="secondary" className="bg-white">{items.length}</Badge>
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3">
                {items.map((v: any) => (
                    <PatientCard key={v.id} visit={v} onMove={onMove} />
                ))}
            </div>
        </div>
    )
}

function PatientCard({ visit, onMove }: any) {
    const mins = differenceInMinutes(new Date(), new Date(visit.arrival_time))
    const isLate = mins > 10 && visit.triage_category === 'RED'

    return (
        <Card className={`
            shadow-sm hover:shadow-md transition-all
            ${isLate ? 'animate-pulse ring-2 ring-red-500' : ''}
        `}>
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-lg">
                        {visit.patient?.first_name} {visit.patient?.last_name}
                    </div>
                    <Badge variant={visit.status === 'WAITING' ? 'outline' : 'default'}>
                        {visit.status}
                    </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-3 font-medium">
                    {visit.chief_complaint}
                </p>

                <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{mins}m wait</span>
                    </div>
                    {visit.status === 'WAITING' && (
                        <Button size="sm" variant="secondary" className="h-6 text-xs"
                            onClick={() => onMove(visit.id, 'UNDER_TREATMENT')}
                        >
                            Start Tx
                        </Button>
                    )}
                    {visit.status === 'UNDER_TREATMENT' && (
                        <Button size="sm" variant="outline" className="h-6 text-xs"
                            onClick={() => onMove(visit.id, 'ADMITTED')}
                        >
                            Admit
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
