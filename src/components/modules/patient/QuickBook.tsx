'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { bookAppointment } from '@/actions/patient-portal'
import { toast } from 'sonner'
import { CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface QuickBookProps {
    doctors?: { id: string, first_name: string, last_name: string }[]
}

export function QuickBook({ doctors = [] }: QuickBookProps) {
    const [date, setDate] = useState<Date>()
    const [calendarOpen, setCalendarOpen] = useState(false)
    const [timeHour, setTimeHour] = useState('9')
    const [timeMin, setTimeMin] = useState('00')
    const [timeAmPm, setTimeAmPm] = useState('AM')
    const [reason, setReason] = useState('')
    const [doctorId, setDoctorId] = useState<string>()
    const [loading, setLoading] = useState(false)

    const handleBook = async () => {
        if (!date || !reason || !doctorId) {
            toast.error('Please select a date, doctor, and reason')
            return
        }

        // Convert 12h → 24h
        let hours = parseInt(timeHour)
        if (timeAmPm === 'AM' && hours === 12) hours = 0
        if (timeAmPm === 'PM' && hours !== 12) hours += 12
        const combined = new Date(date)
        combined.setHours(hours, parseInt(timeMin), 0, 0)

        setLoading(true)
        try {
            const res = await bookAppointment({
                date: combined.toISOString(),
                reason,
                doctorId
            })

            if (res.success) {
                toast.success('Appointment request sent!')
                setReason('')
                setDoctorId(undefined)
                setDate(undefined)
                setTimeHour('9')
                setTimeMin('00')
                setTimeAmPm('AM')
            } else {
                toast.error(res.error || 'Failed to book')
            }
        } catch (err) {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Book Appointment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Preferred Date</Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => { setDate(d); setCalendarOpen(false) }}
                                disabled={(day) => day < new Date(new Date().setHours(0, 0, 0, 0))}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2">
                    <Label>Preferred Time</Label>
                    <div className="flex items-center gap-2">
                        <Select
                            value={timeHour}
                            onValueChange={(v) => setTimeHour(v)}
                        >
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Hour" />
                            </SelectTrigger>
                            <SelectContent>
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                                    <SelectItem key={h} value={String(h)}>{h}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <span className="text-muted-foreground font-medium">:</span>

                        <Select
                            value={timeMin}
                            onValueChange={(v) => setTimeMin(v)}
                        >
                            <SelectTrigger className="w-20">
                                <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="00">00</SelectItem>
                                <SelectItem value="30">30</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={timeAmPm}
                            onValueChange={(v) => setTimeAmPm(v)}
                        >
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Select Doctor</Label>
                    <Select value={doctorId} onValueChange={setDoctorId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose a doctor" />
                        </SelectTrigger>
                        <SelectContent>
                            {doctors.map((doc) => (
                                <SelectItem key={doc.id} value={doc.id}>
                                    Dr. {doc.first_name} {doc.last_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Reason for Visit</Label>
                    <Textarea
                        placeholder="Briefly describe your symptoms..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>

                <Button className="w-full" onClick={handleBook} disabled={loading}>
                    {loading ? 'Booking...' : 'Request Appointment'}
                </Button>
            </CardContent>
        </Card>
    )
}
