'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Zap, Activity, Brain, Truck } from 'lucide-react'
import { getOrderSets, applyOrderSet } from '@/actions/orders'
import { toast } from 'sonner'

interface EmergencyPanelProps {
    patientId: string
    doctorId: string
}

export function EmergencyPanel({ patientId, doctorId }: EmergencyPanelProps) {
    const [protocols, setProtocols] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        getOrderSets().then(setProtocols)
    }, [])

    const handleApply = async (protocol: any) => {
        if (!confirm(`Apply "${protocol.name}"?\n\nThis will instantly order:\n${protocol.items.length} Items (Labs + Meds)`)) return

        setLoading(true)
        const toastId = toast.loading('Initiating Protocol...')

        const res = await applyOrderSet(patientId, protocol.id, doctorId)

        if (res.success) {
            toast.success(res.message, { id: toastId })
        } else {
            toast.error(res.error, { id: toastId })
        }
        setLoading(false)
    }

    const getIcon = (name: string) => {
        if (name.includes('Chest')) return <Activity className="h-6 w-6" />
        if (name.includes('Stroke')) return <Brain className="h-6 w-6" />
        if (name.includes('Trauma')) return <Truck className="h-6 w-6" />
        return <Zap className="h-6 w-6" />
    }

    const getColor = (name: string) => {
        if (name.includes('Chest')) return 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300'
        if (name.includes('Stroke')) return 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300'
        if (name.includes('Trauma')) return 'bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300'
        return 'bg-blue-100 hover:bg-blue-200 text-blue-700'
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    Emergency Order Sets
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {protocols.map(p => (
                        <button
                            key={p.id}
                            onClick={() => handleApply(p)}
                            disabled={loading}
                            className={`
                                flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all transform active:scale-95
                                ${getColor(p.name)}
                                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <div className="mb-2 p-3 bg-white/50 rounded-full">
                                {getIcon(p.name)}
                            </div>
                            <span className="font-bold text-lg text-center">{p.name}</span>
                            <span className="text-xs opacity-75 mt-1">{p.items.length} Actions</span>
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
