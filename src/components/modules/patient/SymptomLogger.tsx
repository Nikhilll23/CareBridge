'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { logSymptom } from '@/actions/patient-portal'
import { toast } from 'sonner'
import { Activity } from 'lucide-react'

export function SymptomLogger() {
    const [symptom, setSymptom] = useState('')
    const [severity, setSeverity] = useState([5])
    const [loading, setLoading] = useState(false)

    const handleLog = async () => {
        if (!symptom) {
            toast.error('Please enter a symptom')
            return
        }

        setLoading(true)
        try {
            const res = await logSymptom({
                symptom,
                severity: severity[0]
            })

            if (res.success) {
                toast.success('Symptom logged')
                setSymptom('')
                setSeverity([5])
            } else {
                toast.error('Failed to log symptom')
            }
        } catch (err) {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="bg-gradient-to-br from-red-50 to-white border-red-100 dark:from-red-950/20 dark:border-red-900">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400 text-lg">
                    <Activity className="h-5 w-5" />
                    Symptom Check
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>How are you feeling?</Label>
                    <Input
                        placeholder="e.g. Headache, Nausea"
                        value={symptom}
                        onChange={(e) => setSymptom(e.target.value)}
                        className="bg-white/50"
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between">
                        <Label>Severity</Label>
                        <span className="text-sm font-bold text-red-600">{severity[0]}/10</span>
                    </div>
                    <Slider
                        value={severity}
                        onValueChange={setSeverity}
                        max={10}
                        min={1}
                        step={1}
                        className="py-2"
                    />
                </div>

                <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={handleLog} disabled={loading}>
                    {loading ? 'Logging...' : 'Log Entry'}
                </Button>
            </CardContent>
        </Card>
    )
}
