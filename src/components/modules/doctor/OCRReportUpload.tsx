'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Upload, Camera, Loader2, Send, Save, Eye } from 'lucide-react'
import { processImageOCR, createMedicalReport, sendReportToPatient } from '@/actions/reports'
import { toast } from 'sonner'

interface OCRReportUploadProps {
    open: boolean
    onClose: () => void
    patientId: string
    patientName: string
    appointmentId?: string
}

export function OCRReportUpload({ open, onClose, patientId, patientName, appointmentId }: OCRReportUploadProps) {
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [processing, setProcessing] = useState(false)
    const [ocrResult, setOcrResult] = useState<any>(null)
    const [reportTitle, setReportTitle] = useState('')
    const [editableContent, setEditableContent] = useState('')
    const [saving, setSaving] = useState(false)
    const [savedReportId, setSavedReportId] = useState<string | null>(null)

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (e) => {
            const base64 = e.target?.result as string
            setImagePreview(base64)

            // Process OCR
            setProcessing(true)
            toast.info('Processing image with AI...')

            const result = await processImageOCR(base64)
            setProcessing(false)

            if (result.success) {
                setOcrResult(result.data)
                setEditableContent(result.rawText || JSON.stringify(result.data, null, 2))
                setReportTitle(`Medical Report - ${patientName} - ${new Date().toLocaleDateString()}`)
                toast.success('Image processed successfully!')
            } else {
                toast.error(result.error || 'Failed to process image')
            }
        }
        reader.readAsDataURL(file)
    }, [patientName])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp']
        },
        maxFiles: 1
    })

    const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            onDrop([file])
        }
    }

    const handleSave = async (sendToPatient: boolean = false) => {
        if (!reportTitle.trim() || !editableContent.trim()) {
            toast.error('Please provide a title and content')
            return
        }

        setSaving(true)

        const result = await createMedicalReport({
            patientId,
            appointmentId,
            reportType: 'OCR_SCAN',
            title: reportTitle,
            content: ocrResult,
            rawText: editableContent,
            images: imagePreview ? [imagePreview] : []
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
        setImagePreview(null)
        setOcrResult(null)
        setReportTitle('')
        setEditableContent('')
        setSavedReportId(null)
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>OCR Medical Report - {patientName}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {!imagePreview ? (
                        <div className="space-y-4">
                            {/* Upload Area */}
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                <p className="text-lg font-medium">
                                    {isDragActive ? 'Drop the image here' : 'Drag & drop an image, or click to select'}
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Supports: PNG, JPG, JPEG, WEBP
                                </p>
                            </div>

                            {/* Camera Capture */}
                            <div className="text-center">
                                <Label htmlFor="camera-input" className="cursor-pointer">
                                    <Button type="button" variant="outline" className="w-full" asChild>
                                        <span>
                                            <Camera className="h-4 w-4 mr-2" />
                                            Capture from Camera
                                        </span>
                                    </Button>
                                </Label>
                                <input
                                    id="camera-input"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handleCameraCapture}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Image Preview */}
                            <Card className="p-4">
                                <img src={imagePreview} alt="Uploaded" className="max-h-64 mx-auto rounded" />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 w-full"
                                    onClick={() => {
                                        setImagePreview(null)
                                        setOcrResult(null)
                                    }}
                                >
                                    Upload Different Image
                                </Button>
                            </Card>

                            {processing && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <span className="ml-2">Processing with AI...</span>
                                </div>
                            )}

                            {ocrResult && !processing && (
                                <div className="space-y-4">
                                    {/* Report Title */}
                                    <div>
                                        <Label>Report Title</Label>
                                        <Input
                                            value={reportTitle}
                                            onChange={(e) => setReportTitle(e.target.value)}
                                            placeholder="Enter report title"
                                        />
                                    </div>

                                    {/* Editable Content */}
                                    <div>
                                        <Label>Report Content (Editable)</Label>
                                        <Textarea
                                            value={editableContent}
                                            onChange={(e) => setEditableContent(e.target.value)}
                                            rows={15}
                                            className="font-mono text-sm"
                                            placeholder="Edit the extracted content..."
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
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
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
