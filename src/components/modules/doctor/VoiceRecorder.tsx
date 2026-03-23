'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mic, Square, Loader2, Send, Save, Download } from 'lucide-react'
import { transcribeAudio, createMedicalReport, sendReportToPatient } from '@/actions/reports'
import { toast } from 'sonner'
import jsPDF from 'jspdf'

interface VoiceRecorderProps {
    open: boolean
    onClose: () => void
    patientId: string
    patientName: string
    appointmentId?: string
}

// All Indian languages supported by Web Speech API
const INDIAN_LANGUAGES = [
    { code: 'en-IN', name: 'English (India)' },
    { code: 'hi-IN', name: 'Hindi (हिन्दी)' },
    { code: 'bn-IN', name: 'Bengali (বাংলা)' },
    { code: 'te-IN', name: 'Telugu (తెలుగు)' },
    { code: 'mr-IN', name: 'Marathi (मराठी)' },
    { code: 'ta-IN', name: 'Tamil (தமிழ்)' },
    { code: 'gu-IN', name: 'Gujarati (ગુજરાતી)' },
    { code: 'kn-IN', name: 'Kannada (ಕನ್ನಡ)' },
    { code: 'ml-IN', name: 'Malayalam (മലയാളം)' },
    { code: 'pa-IN', name: 'Punjabi (ਪੰਜਾਬੀ)' },
    { code: 'or-IN', name: 'Odia (ଓଡ଼ିଆ)' },
    { code: 'as-IN', name: 'Assamese (অসমীয়া)' },
    { code: 'ur-IN', name: 'Urdu (اردو)' }
]

export function VoiceRecorder({ open, onClose, patientId, patientName, appointmentId }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [selectedLanguage, setSelectedLanguage] = useState('en-IN')
    const [processing, setProcessing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [reportTitle, setReportTitle] = useState(`Consultation Notes - ${patientName} - ${new Date().toLocaleDateString()}`)
    const [savedReportId, setSavedReportId] = useState<string | null>(null)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        // Initialize Web Speech API
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = true
            recognitionRef.current.interimResults = true

            recognitionRef.current.onresult = (event: any) => {
                let interimTranscript = ''
                let finalTranscript = ''

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcriptPiece = event.results[i][0].transcript
                    if (event.results[i].isFinal) {
                        finalTranscript += transcriptPiece + ' '
                    } else {
                        interimTranscript += transcriptPiece
                    }
                }

                setTranscript(prev => prev + finalTranscript)
            }

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error)
                if (event.error === 'no-speech') {
                    toast.info('No speech detected. Please speak clearly.')
                } else {
                    toast.error('Speech recognition error: ' + event.error)
                }
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
        }
    }, [])

    const startRecording = async () => {
        try {
            // Start audio recording for Gemini fallback
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.start()

            // Start Web Speech API
            if (recognitionRef.current) {
                recognitionRef.current.lang = selectedLanguage
                recognitionRef.current.start()
            }

            setIsRecording(true)
            toast.success('Recording started')
        } catch (error) {
            console.error('Error starting recording:', error)
            toast.error('Failed to start recording. Please check microphone permissions.')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
        }

        if (recognitionRef.current) {
            recognitionRef.current.stop()
        }

        setIsRecording(false)
        toast.success('Recording stopped')

        // If Web Speech API didn't capture anything, use Gemini
        if (!transcript.trim() && audioChunksRef.current.length > 0) {
            processWithGemini()
        }
    }

    const processWithGemini = async () => {
        setProcessing(true)
        toast.info('Processing audio with Gemini AI...')

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()

        reader.onload = async (e) => {
            const base64Audio = e.target?.result as string
            const result = await transcribeAudio(base64Audio, selectedLanguage)

            setProcessing(false)

            if (result.success) {
                setTranscript(result.transcript || '')
                toast.success('Transcription completed!')
            } else {
                toast.error(result.error || 'Failed to transcribe audio')
            }
        }

        reader.readAsDataURL(audioBlob)
    }

    const generatePDF = () => {
        const doc = new jsPDF()

        // Header
        doc.setFontSize(18)
        doc.text('Consultation Meeting Report', 20, 20)

        doc.setFontSize(12)
        doc.text(`Patient: ${patientName}`, 20, 35)
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 42)
        doc.text(`Time: ${new Date().toLocaleTimeString()}`, 20, 49)
        doc.text(`Language: ${INDIAN_LANGUAGES.find(l => l.code === selectedLanguage)?.name}`, 20, 56)

        // Divider
        doc.line(20, 60, 190, 60)

        // Content
        doc.setFontSize(11)
        const splitText = doc.splitTextToSize(transcript, 170)
        doc.text(splitText, 20, 70)

        // Footer
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(10)
            doc.text(`Page ${i} of ${pageCount}`, 20, 285)
            doc.text('CareBridge', 150, 285)
        }

        return doc
    }

    const handleDownloadPDF = () => {
        const doc = generatePDF()
        doc.save(`meeting_report_${patientName.replace(/\s+/g, '_')}_${Date.now()}.pdf`)
        toast.success('PDF downloaded!')
    }

    const handleSave = async (sendToPatient: boolean = false) => {
        if (!reportTitle.trim() || !transcript.trim()) {
            toast.error('Please provide a title and record some audio')
            return
        }

        setSaving(true)

        const result = await createMedicalReport({
            patientId,
            appointmentId,
            reportType: 'VOICE_NOTE',
            title: reportTitle,
            content: { transcript, language: selectedLanguage },
            rawText: transcript,
            language: selectedLanguage
        })

        if (result.success) {
            setSavedReportId(result.report.id)
            toast.success('Report saved successfully!')

            if (sendToPatient && result.report.id) {
                const sendResult = await sendReportToPatient(result.report.id)
                if (sendResult.success) {
                    toast.success('Report sent to patient!')
                    onClose()
                    resetForm()
                } else {
                    toast.error('Failed to send report')
                }
            } else if (!sendToPatient) {
                onClose()
                resetForm()
            }
        } else {
            toast.error(result.error || 'Failed to save report')
        }

        setSaving(false)
    }

    const handleSendToPatient = async () => {
        if (savedReportId) {
            const result = await sendReportToPatient(savedReportId)
            if (result.success) {
                toast.success('Report sent to patient!')
                onClose()
                resetForm()
            } else {
                toast.error('Failed to send report')
            }
        } else {
            await handleSave(true)
        }
    }

    const resetForm = () => {
        setTranscript('')
        setReportTitle(`Consultation Notes - ${patientName} - ${new Date().toLocaleDateString()}`)
        setSavedReportId(null)
        audioChunksRef.current = []
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Voice Consultation Notes - {patientName}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Language Selector */}
                    <div>
                        <Label>Select Language</Label>
                        <Select value={selectedLanguage} onValueChange={setSelectedLanguage} disabled={isRecording}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {INDIAN_LANGUAGES.map(lang => (
                                    <SelectItem key={lang.code} value={lang.code}>
                                        {lang.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Recording Controls */}
                    <div className="flex gap-2">
                        {!isRecording ? (
                            <Button onClick={startRecording} className="flex-1">
                                <Mic className="h-4 w-4 mr-2" />
                                Start Recording
                            </Button>
                        ) : (
                            <Button onClick={stopRecording} variant="destructive" className="flex-1">
                                <Square className="h-4 w-4 mr-2" />
                                Stop Recording
                            </Button>
                        )}
                    </div>

                    {isRecording && (
                        <div className="flex items-center justify-center py-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-red-600 dark:text-red-400 font-medium">Recording in progress...</span>
                            </div>
                        </div>
                    )}

                    {processing && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-2">Processing with Gemini AI...</span>
                        </div>
                    )}

                    {/* Report Title */}
                    <div>
                        <Label>Report Title</Label>
                        <Input
                            value={reportTitle}
                            onChange={(e) => setReportTitle(e.target.value)}
                            placeholder="Enter report title"
                        />
                    </div>

                    {/* Transcript */}
                    <div>
                        <Label>Transcript (Editable)</Label>
                        <Textarea
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            rows={12}
                            placeholder="Transcript will appear here... You can edit it after recording."
                            className="font-mono text-sm"
                        />
                    </div>

                    {/* Action Buttons */}
                    {transcript.trim() && (
                        <div className="flex flex-wrap gap-2">
                            <Button
                                onClick={handleDownloadPDF}
                                variant="outline"
                                className="flex-1"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                            </Button>
                            <Button
                                onClick={() => handleSave(false)}
                                disabled={saving}
                                variant="outline"
                                className="flex-1"
                            >
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                Save Draft
                            </Button>
                            <Button
                                onClick={handleSendToPatient}
                                disabled={saving}
                                className="flex-1"
                            >
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Send className="h-4 w-4 mr-2" />
                                )}
                                Save & Send to Patient
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
