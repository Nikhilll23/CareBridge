'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getPatientHandwrittenNotes, deleteHandwrittenNote } from '@/actions/handwriting'
import { HandwritingCanvas } from './HandwritingCanvas'
import { toast } from 'sonner'
import { 
    PenLine, 
    FileText, 
    Stethoscope, 
    Image as ImageIcon,
    Trash2,
    Download,
    ZoomIn,
    Calendar,
    User
} from 'lucide-react'
import { format } from 'date-fns'

interface HandwrittenNotesViewerProps {
    patientId: string
    readonly?: boolean
}

const NOTE_TYPE_ICONS = {
    prescription: PenLine,
    clinical_note: Stethoscope,
    diagram: ImageIcon,
    other: FileText
}

const NOTE_TYPE_COLORS = {
    prescription: 'bg-blue-100 text-blue-800',
    clinical_note: 'bg-green-100 text-green-800',
    diagram: 'bg-purple-100 text-purple-800',
    other: 'bg-gray-100 text-gray-800'
}

export function HandwrittenNotesViewer({ patientId, readonly = false }: HandwrittenNotesViewerProps) {
    const [notes, setNotes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedNote, setSelectedNote] = useState<any>(null)
    const [viewerOpen, setViewerOpen] = useState(false)
    
    const loadNotes = async () => {
        setLoading(true)
        const res = await getPatientHandwrittenNotes(patientId)
        if (res.success) {
            setNotes(res.data)
        }
        setLoading(false)
    }
    
    useEffect(() => {
        if (patientId) {
            loadNotes()
        }
    }, [patientId])
    
    const handleDelete = async (noteId: string) => {
        if (!confirm('Are you sure you want to delete this note?')) return
        
        const res = await deleteHandwrittenNote(noteId)
        if (res.success) {
            toast.success('Note deleted')
            loadNotes()
        } else {
            toast.error('Failed to delete note')
        }
    }
    
    const handleDownload = (note: any) => {
        const link = document.createElement('a')
        link.download = `${note.title || 'note'}-${format(new Date(note.created_at), 'yyyy-MM-dd')}.png`
        link.href = note.image_data
        link.click()
    }
    
    const openViewer = (note: any) => {
        setSelectedNote(note)
        setViewerOpen(true)
    }
    
    if (loading) {
        return (
            <Card>
                <CardContent className="py-8">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                        <span className="ml-2 text-muted-foreground">Loading notes...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }
    
    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <PenLine className="h-5 w-5" />
                                Handwritten Notes & Prescriptions
                            </CardTitle>
                            <CardDescription>
                                Doctor's handwritten notes from consultations
                            </CardDescription>
                        </div>
                        <Badge variant="secondary">{notes.length} Notes</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {notes.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <PenLine className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>No handwritten notes found for this patient</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {notes.map((note) => {
                                const Icon = NOTE_TYPE_ICONS[note.note_type as keyof typeof NOTE_TYPE_ICONS] || FileText
                                const colorClass = NOTE_TYPE_COLORS[note.note_type as keyof typeof NOTE_TYPE_COLORS] || NOTE_TYPE_COLORS.other
                                
                                return (
                                    <div 
                                        key={note.id} 
                                        className="border rounded-lg overflow-hidden group hover:shadow-md transition-shadow"
                                    >
                                        {/* Preview Image */}
                                        <div 
                                            className="relative aspect-[4/3] bg-muted cursor-pointer"
                                            onClick={() => openViewer(note)}
                                        >
                                            <img 
                                                src={note.image_data} 
                                                alt={note.title || 'Handwritten note'}
                                                className="w-full h-full object-contain bg-white"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <Badge className={`absolute top-2 left-2 ${colorClass}`}>
                                                <Icon className="h-3 w-3 mr-1" />
                                                {note.note_type.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                        
                                        {/* Note Info */}
                                        <div className="p-3 space-y-2">
                                            <h4 className="font-medium truncate text-sm">
                                                {note.title || 'Untitled Note'}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                                            </div>
                                            {note.users && (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <User className="h-3 w-3" />
                                                    Dr. {note.users.first_name} {note.users.last_name}
                                                </div>
                                            )}
                                            
                                            {/* Actions */}
                                            <div className="flex items-center gap-2 pt-2 border-t">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="flex-1"
                                                    onClick={() => handleDownload(note)}
                                                >
                                                    <Download className="h-4 w-4 mr-1" />
                                                    Download
                                                </Button>
                                                {!readonly && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleDelete(note.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
            
            {/* Full View Dialog */}
            <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedNote && (
                                <>
                                    {(() => {
                                        const Icon = NOTE_TYPE_ICONS[selectedNote.note_type as keyof typeof NOTE_TYPE_ICONS] || FileText
                                        return <Icon className="h-5 w-5" />
                                    })()}
                                    {selectedNote.title || 'Handwritten Note'}
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedNote && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {format(new Date(selectedNote.created_at), 'MMMM d, yyyy h:mm a')}
                                </span>
                                {selectedNote.users && (
                                    <span className="flex items-center gap-1">
                                        <User className="h-4 w-4" />
                                        Dr. {selectedNote.users.first_name} {selectedNote.users.last_name}
                                    </span>
                                )}
                            </div>
                            
                            <ScrollArea className="max-h-[60vh]">
                                <img 
                                    src={selectedNote.image_data} 
                                    alt={selectedNote.title || 'Handwritten note'}
                                    className="w-full h-auto border rounded-lg bg-white"
                                />
                            </ScrollArea>
                            
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => handleDownload(selectedNote)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PNG
                                </Button>
                                <Button variant="outline" onClick={() => setViewerOpen(false)}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
