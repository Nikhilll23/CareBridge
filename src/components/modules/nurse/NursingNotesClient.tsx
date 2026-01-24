'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { Plus, FileText } from 'lucide-react'
import { toast } from 'sonner'

export function NursingNotesClient() {
    const [notes, setNotes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadNotes()
    }, [])

    const loadNotes = async () => {
        try {
            const supabase = createClient()

            const { data, error } = await supabase
                .from('nursing_notes')
                .select(`
                    *,
                    patient:patients(first_name, last_name),
                    nurse:users!nursing_notes_nurse_id_fkey(first_name, last_name)
                `)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error

            setNotes(data || [])
        } catch (error: any) {
            console.error('Error loading notes:', error)
            toast.error('Failed to load nursing notes')
        } finally {
            setLoading(false)
        }
    }

    const getNoteTypeBadge = (type: string) => {
        const variants: any = {
            assessment: 'default',
            progress: 'secondary',
            incident: 'destructive',
            discharge: 'outline'
        }

        return <Badge variant={variants[type] || 'secondary'}>{type}</Badge>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Nursing Notes</h1>
                    <p className="text-muted-foreground">Patient care documentation</p>
                </div>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Note
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Notes</CardTitle>
                    <CardDescription>Latest nursing documentation</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-2 text-muted-foreground">Loading notes...</p>
                        </div>
                    ) : notes.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No nursing notes found</p>
                            <Button variant="outline" className="mt-4">
                                <Plus className="h-4 w-4 mr-2" />
                                Create First Note
                            </Button>
                        </div>
                    ) : (
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Patient</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Nurse</TableHead>
                                        <TableHead>Critical</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {notes.map((note) => (
                                        <TableRow key={note.id}>
                                            <TableCell>
                                                {new Date(note.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {note.patient?.first_name} {note.patient?.last_name}
                                            </TableCell>
                                            <TableCell>{getNoteTypeBadge(note.note_type)}</TableCell>
                                            <TableCell className="font-semibold">{note.title}</TableCell>
                                            <TableCell className="text-sm">
                                                {note.nurse?.first_name} {note.nurse?.last_name}
                                            </TableCell>
                                            <TableCell>
                                                {note.is_critical && (
                                                    <Badge variant="destructive">Critical</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="outline">
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
