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
    const [time, setTime] = useState('09:00')
    const [reason, setReason] = useState('')
    const [doctorId, setDoctorId] = useState<string>()
    const [loading, setLoading] = useState(false)

    const handleBook = async () => {
        if (!date || !reason || !doctorId) {
            toast.error('Please select a date, doctor, and reason')
            return
        }

        // Combine date + time into a single ISO string
        const [hours, minutes] = time.split(':').map(Number)
        const combined = new Date(date)
        combined.setHours(hours, minutes, 0, 0)

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
                setTime('09:00')
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
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
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
