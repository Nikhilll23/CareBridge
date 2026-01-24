'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getLabQueue, collectSample, submitResult, verifyResult } from '@/actions/lab'
import { toast } from 'sonner'
import { TestTube, FileCheck, AlertTriangle } from 'lucide-react'

export function LabManager() {
    const [queue, setQueue] = useState<any[]>([])

    const refresh = () => getLabQueue().then(setQueue)

    useEffect(() => { refresh() }, [])

    const handleCollect = async (id: string) => {
        await collectSample(id)
        toast.success('Sample Collected')
        refresh()
    }

    return (
        <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending">Pending Collection</TabsTrigger>
                <TabsTrigger value="entry">Result Entry</TabsTrigger>
                <TabsTrigger value="verify">Verification</TabsTrigger>
            </TabsList>

            {/* PENDING */}
            <TabsContent value="pending" className="space-y-4">
                {queue.filter(x => x.status === 'PENDING' || x.status === 'ORDERED' || !x.status).map(item => (
                    <Card key={item.id}>
                        <CardContent className="flex justify-between items-center p-4">
                            <div>
                                <h4 className="font-bold">{item.test_name}</h4>
                                <p className="text-sm text-muted-foreground">{item.patient?.first_name} {item.patient?.last_name}</p>
                            </div>
                            <Button size="sm" onClick={() => handleCollect(item.id)}>
                                <TestTube className="mr-2 h-4 w-4" /> Collect
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </TabsContent>

            {/* ENTRY */}
            <TabsContent value="entry" className="space-y-4">
                {queue.filter(x => x.status === 'COLLECTED').map(item => (
                    <ResultEntryCard key={item.id} item={item} onRefresh={refresh} />
                ))}
            </TabsContent>

            {/* VERIFY */}
            <TabsContent value="verify" className="space-y-4">
                {queue.filter(x => x.status === 'ANALYZED').map(item => (
                    <Card key={item.id} className={item.is_critical ? 'border-red-500 bg-red-50' : ''}>
                        <CardContent className="flex justify-between items-center p-4">
                            <div>
                                <h4 className="font-bold flex items-center gap-2">
                                    {item.test_name}
                                    {item.is_critical && <Badge variant="destructive">CRITICAL</Badge>}
                                </h4>
                                <p className="text-sm">Result: <strong>{item.result_value}</strong></p>
                                <p className="text-xs text-muted-foreground">{item.patient?.first_name} {item.patient?.last_name}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={async () => {
                                await verifyResult(item.id, 'Dr. Current') // Mocked User
                                toast.success('Verified')
                                refresh()
                            }}>
                                <FileCheck className="mr-2 h-4 w-4" /> Verify
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </TabsContent>
        </Tabs>
    )
}

function ResultEntryCard({ item, onRefresh }: any) {
    const [val, setVal] = useState('')

    // Simple heuristic for demo
    const isCritical = (val: string) => {
        const num = parseFloat(val)
        if (isNaN(num)) return false
        // E.g. Hemoglobin < 7 or > 18
        if (item.test_name.includes('Hemoglobin') && (num < 7 || num > 18)) return true
        return false
    }

    return (
        <Card>
            <CardContent className="flex justify-between items-center p-4 gap-4">
                <div>
                    <h4 className="font-bold">{item.test_name}</h4>
                    <p className="text-sm text-muted-foreground">{item.patient?.first_name}</p>
                </div>
                <div className="flex gap-2 items-center">
                    <Input
                        placeholder="Value"
                        value={val}
                        onChange={e => setVal(e.target.value)}
                        className="w-[150px]"
                    />
                    <Button size="sm" onClick={async () => {
                        await submitResult(item.id, val, isCritical(val))
                        toast.success('Result Saved')
                        onRefresh()
                    }}>
                        Result
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
