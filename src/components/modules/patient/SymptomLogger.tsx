'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { logSymptom } from '@/actions/patient-portal'
import { toast } from 'sonner'
import { Activity, Stethoscope } from 'lucide-react'

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
                toast.success('Symptom logged successfully')
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

    // Get severity color based on level
    const getSeverityColor = (level: number) => {
        if (level <= 3) return 'text-emerald-500'
        if (level <= 6) return 'text-amber-500'
        return 'text-red-500'
    }

    const getSeverityLabel = (level: number) => {
        if (level <= 3) return 'Mild'
        if (level <= 6) return 'Moderate'
        return 'Severe'
    }

    return (
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2.5 text-foreground">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Stethoscope className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <span className="text-base font-semibold">Symptom Check</span>
                        <p className="text-xs font-normal text-muted-foreground mt-0.5">Track how you&apos;re feeling</p>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">How are you feeling?</Label>
                    <Input
                        placeholder="e.g. Headache, Nausea, Fatigue..."
                        value={symptom}
                        onChange={(e) => setSymptom(e.target.value)}
                        className="bg-background border-input focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-foreground">Severity Level</Label>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${getSeverityColor(severity[0])}`}>
                                {getSeverityLabel(severity[0])}
                            </span>
                            <span className={`text-lg font-bold ${getSeverityColor(severity[0])}`}>
                                {severity[0]}/10
                            </span>
                        </div>
                    </div>
                    <div className="pt-1">
                        <Slider
                            value={severity}
                            onValueChange={setSeverity}
                            max={10}
                            min={1}
                            step={1}
                            className="cursor-pointer"
                        />
                        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                            <span>Mild</span>
                            <span>Moderate</span>
                            <span>Severe</span>
                        </div>
                    </div>
                </div>

                <Button 
                    className="w-full font-medium" 
                    onClick={handleLog} 
                    disabled={loading || !symptom.trim()}
                >
                    {loading ? (
                        <>
                            <Activity className="h-4 w-4 mr-2 animate-pulse" />
                            Logging...
                        </>
                    ) : (
                        <>
                            <Activity className="h-4 w-4 mr-2" />
                            Log Symptom
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}
