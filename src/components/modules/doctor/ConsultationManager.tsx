'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateConsultation } from '@/actions/doctor'
import { saveHandwrittenNote, getAppointmentHandwrittenNotes } from '@/actions/handwriting'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HandwritingCanvas } from './HandwritingCanvas'
import { PenLine, FileText, Clock, Trash2, Mic, Plus, X, Search } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OCRReportUpload } from './OCRReportUpload'
import { VoiceRecorder } from './VoiceRecorder'
import { getInventory } from '@/actions/inventory'

interface ConsultationManagerProps {
    isOpen: boolean
    onClose: () => void
    appointment: any // Type this properly
}

export function ConsultationManager({ isOpen, onClose, appointment }: ConsultationManagerProps) {
    const [loading, setLoading] = useState(false)
    const [notes, setNotes] = useState(appointment?.reason || '')

    // Handwriting State
    const [activeInputMode, setActiveInputMode] = useState<'typed' | 'handwritten'>('typed')
    const [handwrittenNoteType, setHandwrittenNoteType] = useState<'prescription' | 'clinical_note' | 'diagram'>('prescription')
    const [existingHandwrittenNotes, setExistingHandwrittenNotes] = useState<any[]>([])
    const [handwritingData, setHandwritingData] = useState<{ imageData: string; strokeData: string } | null>(null)

    const [isFullscreenHandwriting, setIsFullscreenHandwriting] = useState(false)
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight
            })
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // OCR and Voice State
    const [showOCR, setShowOCR] = useState(false)
    const [showVoice, setShowVoice] = useState(false)

    // Prescription State — multi-medicine list
    const [medicines, setMedicines] = useState<Array<{
        drugName: string; dosage: string; frequency: string; duration: string; instructions: string
    }>>([])
    const [drugSearch, setDrugSearch] = useState('')
    const [inventory, setInventory] = useState<any[]>([])
    const [showDrugDropdown, setShowDrugDropdown] = useState(false)
    const [filteredDrugs, setFilteredDrugs] = useState<any[]>([])
    const [currentMed, setCurrentMed] = useState({ drugName: '', dosage: '', frequency: '', duration: '', instructions: '' })

    // Load inventory for drug search
    useEffect(() => {
        getInventory().then(res => {
            if (Array.isArray(res)) setInventory(res)
        })
    }, [])

    // Filter drugs as user types
    useEffect(() => {
        if (drugSearch.trim().length >= 1) {
            const filtered = inventory.filter(i =>
                i.item_name.toLowerCase().includes(drugSearch.toLowerCase())
            ).slice(0, 8)
            setFilteredDrugs(filtered)
            setShowDrugDropdown(filtered.length > 0)
        } else {
            setShowDrugDropdown(false)
        }
    }, [drugSearch, inventory])

    const selectDrug = (item: any) => {
        setCurrentMed(prev => ({ ...prev, drugName: item.item_name }))
        setDrugSearch(item.item_name)
        setShowDrugDropdown(false)
    }

    const addMedicine = () => {
        if (!currentMed.drugName) { toast.error('Select a medicine first'); return }
        setMedicines(prev => [...prev, { ...currentMed }])
        setCurrentMed({ drugName: '', dosage: '', frequency: '', duration: '', instructions: '' })
        setDrugSearch('')
    }

    const removeMedicine = (idx: number) => {
        setMedicines(prev => prev.filter((_, i) => i !== idx))
    }

    // Load existing handwritten notes
    useEffect(() => {
        if (appointment?.id) {
            getAppointmentHandwrittenNotes(appointment.id).then(res => {
                if (res.success) {
                    setExistingHandwrittenNotes(res.data)
                }
            })
        }
    }, [appointment?.id])

    const handleSaveHandwriting = async (data: { imageData: string; strokeData: string }) => {
        setHandwritingData(data)
    }

    const handleAutoSaveHandwriting = async (data: { imageData: string; strokeData: string }) => {
        setHandwritingData(data)
    }

    // Toggle fullscreen and ensure data sync
    const toggleFullscreenHandwriting = () => {
        setIsFullscreenHandwriting(!isFullscreenHandwriting)
    }



    const handleComplete = async () => {
        setLoading(true)
        try {
            // Save handwritten note if exists
            if (handwritingData) {
                const noteRes = await saveHandwrittenNote({
                    patientId: appointment.patients?.id || appointment.patient_id,
                    appointmentId: appointment.id,
                    noteType: handwrittenNoteType,
                    imageData: handwritingData.imageData,
                    strokeData: handwritingData.strokeData,
                    title: `${handwrittenNoteType === 'prescription' ? 'Prescription' : handwrittenNoteType === 'clinical_note' ? 'Clinical Note' : 'Diagram'} - ${appointment.patients?.first_name} ${appointment.patients?.last_name}`
                })
                if (!noteRes.success) toast.error('Failed to save handwritten note')
            }

            const res = await updateConsultation(
                appointment.id,
                notes,
                medicines.length > 0 ? medicines : undefined
            )

            if (res.success) {
                toast.success(`Consultation completed${medicines.length > 0 ? ` with ${medicines.length} medicine(s)` : ''}`)
                onClose()
            } else {
                toast.error('Failed to save consultation')
            }
        } catch (err) {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const patientName = appointment ? `${appointment.patients?.first_name} ${appointment.patients?.last_name}` : ''

    return (
        <>
            <Dialog open={isOpen && !!appointment} onOpenChange={onClose}>
                <DialogContent className="!max-w-[98vw] w-[98vw] !h-[95vh] flex flex-col p-6">
                    <DialogHeader>
                        <DialogTitle>Consultation: {appointment?.patients?.first_name} {appointment?.patients?.last_name}</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 overflow-y-auto p-1">
                        {/* Left Side: Patient Info */}
                        <div className="space-y-6">
                            <div className="rounded-lg border p-4 bg-muted/50">
                                <h3 className="font-semibold mb-2">Patient Details</h3>
                                <div className="text-sm space-y-1">
                                    <p><span className="text-muted-foreground">DOB:</span> {appointment?.patients?.date_of_birth}</p>
                                    <p><span className="text-muted-foreground">Gender:</span> {appointment?.patients?.gender}</p>
                                </div>
                            </div>

                            <Tabs defaultValue="history">
                                <TabsList className="w-full">
                                    <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
                                    <TabsTrigger value="vitals" className="flex-1">Vitals</TabsTrigger>
                                    <TabsTrigger value="allergies" className="flex-1">Allergies</TabsTrigger>
                                </TabsList>
                                <TabsContent value="history" className="border rounded-md p-4 mt-2">
                                    <p className="text-sm text-muted-foreground">No previous history recorded.</p>
                                </TabsContent>
                                <TabsContent value="vitals" className="border rounded-md p-4 mt-2">
                                    <p className="text-sm text-muted-foreground">BP: 120/80 (Last visit)</p>
                                </TabsContent>
                                <TabsContent value="allergies" className="border rounded-md p-4 mt-2">
                                    <p className="text-sm text-muted-foreground">N/A</p>
                                </TabsContent>
                            </Tabs>

                            {/* Quick Actions for OCR and Voice */}
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowOCR(true)}
                                        className="w-full"
                                    >
                                        <FileText className="h-4 w-4 mr-2" />
                                        OCR Report
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowVoice(true)}
                                        className="w-full"
                                    >
                                        <Mic className="h-4 w-4 mr-2" />
                                        Voice Notes
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Clinical Input */}
                        <div className="space-y-6">
                            {/* Input Mode Toggle */}
                            <div className="flex items-center gap-4 p-2 bg-muted/30 rounded-lg">
                                <span className="text-sm font-medium">Input Mode:</span>
                                <div className="flex gap-2">
                                    <Button
                                        variant={activeInputMode === 'typed' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setActiveInputMode('typed')}
                                    >
                                        <FileText className="h-4 w-4 mr-1" />
                                        Typed
                                    </Button>
                                    <Button
                                        variant={activeInputMode === 'handwritten' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setActiveInputMode('handwritten')}
                                    >
                                        <PenLine className="h-4 w-4 mr-1" />
                                        Handwritten
                                    </Button>
                                </div>
                            </div>

                            {activeInputMode === 'typed' ? (
                                <>
                                    <div className="space-y-2">
                                        <Label>Clinical Notes / Diagnosis</Label>
                                        <Textarea
                                            placeholder="Enter findings, diagnosis, and notes..."
                                            className="h-32"
                                            value={notes}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                                        />

                                        {/* Previous Handwritten Notes */}
                                        {existingHandwrittenNotes.length > 0 && (
                                            <div className="border rounded-lg p-3 space-y-2">
                                                <h4 className="text-sm font-medium flex items-center gap-2">
                                                    <Clock className="h-4 w-4" />
                                                    Previous Notes ({existingHandwrittenNotes.length})
                                                </h4>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {existingHandwrittenNotes.slice(0, 6).map((note: any) => (
                                                        <div key={note.id} className="relative group">
                                                            <img
                                                                src={note.image_data}
                                                                alt={note.title}
                                                                className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                                                onClick={() => window.open(note.image_data, '_blank')}
                                                            />
                                                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                                                                {note.note_type}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 border rounded-lg p-4">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            Prescription
                                            <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                                        </h3>

                                        {/* Added medicines list */}
                                        {medicines.length > 0 && (
                                            <div className="space-y-2">
                                                {medicines.map((med, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2 text-sm">
                                                        <div>
                                                            <span className="font-medium">{med.drugName}</span>
                                                            {med.dosage && <span className="text-muted-foreground ml-2">{med.dosage}</span>}
                                                            {med.frequency && <span className="text-muted-foreground ml-2">• {med.frequency}</span>}
                                                            {med.duration && <span className="text-muted-foreground ml-2">• {med.duration}</span>}
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeMedicine(idx)}>
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Drug search */}
                                        <div className="relative">
                                            <Label>Search Medicine (from Inventory)</Label>
                                            <div className="relative mt-1">
                                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    className="pl-9"
                                                    placeholder="Type medicine name..."
                                                    value={drugSearch}
                                                    onChange={e => { setDrugSearch(e.target.value); setCurrentMed(p => ({ ...p, drugName: e.target.value })) }}
                                                    onFocus={() => filteredDrugs.length > 0 && setShowDrugDropdown(true)}
                                                />
                                            </div>
                                            {showDrugDropdown && (
                                                <div className="absolute z-50 top-full left-0 right-0 bg-popover border rounded-md shadow-lg mt-1 max-h-[200px] overflow-y-auto">
                                                    {filteredDrugs.map(item => (
                                                        <div
                                                            key={item.id}
                                                            className="flex justify-between items-center px-3 py-2 hover:bg-accent cursor-pointer text-sm border-b last:border-0"
                                                            onMouseDown={() => selectDrug(item)}
                                                        >
                                                            <span className="font-medium">{item.item_name}</span>
                                                            <span className="text-xs text-muted-foreground">Stock: {item.stock_quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label>Dosage</Label>
                                                <Input placeholder="e.g. 500mg" value={currentMed.dosage} onChange={e => setCurrentMed(p => ({ ...p, dosage: e.target.value }))} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Frequency</Label>
                                                <Input placeholder="e.g. 1-0-1" value={currentMed.frequency} onChange={e => setCurrentMed(p => ({ ...p, frequency: e.target.value }))} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Duration</Label>
                                                <Input placeholder="e.g. 5 days" value={currentMed.duration} onChange={e => setCurrentMed(p => ({ ...p, duration: e.target.value }))} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Instructions</Label>
                                                <Input placeholder="e.g. After food" value={currentMed.instructions} onChange={e => setCurrentMed(p => ({ ...p, instructions: e.target.value }))} />
                                            </div>
                                        </div>

                                        <Button type="button" variant="outline" className="w-full" onClick={addMedicine}>
                                            <Plus className="h-4 w-4 mr-2" /> Add Medicine
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label>Handwritten Note Type</Label>
                                            <Select value={handwrittenNoteType} onValueChange={(v: any) => setHandwrittenNoteType(v)}>
                                                <SelectTrigger className="w-48">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="prescription">Prescription</SelectItem>
                                                    <SelectItem value="clinical_note">Clinical Note</SelectItem>
                                                    <SelectItem value="diagram">Diagram / Sketch</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {handwritingData && (
                                            <div className="text-xs text-green-600 flex items-center gap-1">
                                                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                                                Note captured
                                            </div>
                                        )}
                                    </div>

                                    <HandwritingCanvas
                                        onSave={handleSaveHandwriting}
                                        onAutoSave={handleAutoSaveHandwriting}
                                        width={700}
                                        height={500}
                                        initialData={handwritingData?.strokeData}
                                        onMaximize={toggleFullscreenHandwriting}
                                        className="w-full"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                        <Button onClick={handleComplete} disabled={loading}>
                            {loading ? 'Saving...' : 'Complete Consultation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Fullscreen Handwriting Modal */}
            <Dialog open={isFullscreenHandwriting} onOpenChange={setIsFullscreenHandwriting}>
                <DialogContent className="!max-w-[100vw] !w-[100vw] !h-[100vh] p-0 m-0 rounded-none border-none flex flex-col bg-background" showCloseButton={false}>
                     <div className="p-3 border-b flex items-center justify-between bg-white shrink-0">
                        <DialogTitle>Fullscreen Note: {handwrittenNoteType.replace('_', ' ')}</DialogTitle>
                        <div className="flex gap-2">
                             <Button variant="outline" onClick={() => setIsFullscreenHandwriting(false)}>
                                Close Fullscreen
                             </Button>
                        </div>
                    </div>
                    <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col p-2">
                         <HandwritingCanvas
                            onSave={handleSaveHandwriting}
                            onAutoSave={handleAutoSaveHandwriting}
                            width={windowSize.width > 0 ? windowSize.width - 20 : 1400} 
                            height={windowSize.height > 0 ? windowSize.height - 140 : 900}
                            initialData={handwritingData?.strokeData}
                            onMinimize={toggleFullscreenHandwriting}
                            className="bg-white shadow-lg flex-1 w-full h-full"
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* OCR Modal */}
            <OCRReportUpload
                open={showOCR}
                onClose={() => setShowOCR(false)}
                patientId={appointment?.patients?.id || appointment?.patient_id}
                patientName={patientName}
                appointmentId={appointment?.id}
            />

            {/* Voice Recorder Modal */}
            <VoiceRecorder
                open={showVoice}
                onClose={() => setShowVoice(false)}
                patientId={appointment?.patients?.id || appointment?.patient_id}
                patientName={patientName}
                appointmentId={appointment?.id}
            />
        </>
    )
}
