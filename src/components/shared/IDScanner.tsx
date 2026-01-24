'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Tesseract from 'tesseract.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Upload, CheckCircle2, AlertCircle, ScanLine } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface VerificationResult {
    type: 'PAN' | 'AADHAAR' | null
    number: string | null
    rawText: string
}

interface IDScannerProps {
    onVerified: (result: VerificationResult) => void
}

export function IDScanner({ onVerified }: IDScannerProps) {
    const [scanning, setScanning] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [preview, setPreview] = useState<string | null>(null)

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        setError(null)
        setPreview(URL.createObjectURL(file))
        setScanning(true)
        setProgress(0)

        try {
            // Tesseract OCR
            const result = await Tesseract.recognize(
                file,
                'eng',
                {
                    logger: (m) => {
                        if (m.status === 'recognizing text') {
                            setProgress(Math.round(m.progress * 100))
                        }
                    }
                }
            )

            const text = result.data.text
            console.log('OCR Result:', text)

            // Regex Verification Logic
            const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/
            const aadhaarRegex = /[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}/

            const panMatch = text.match(panRegex)
            const aadhaarMatch = text.match(aadhaarRegex)

            if (panMatch) {
                onVerified({ type: 'PAN', number: panMatch[0], rawText: text })
                setScanning(false)
                return
            }

            if (aadhaarMatch) {
                // Clean spaces for standard format if needed
                onVerified({ type: 'AADHAAR', number: aadhaarMatch[0].replace(/\s/g, ''), rawText: text })
                setScanning(false)
                return
            }

            // If no match found
            setError('Could not detect a valid PAN or Aadhaar number. Please upload a clearer image.')
            onVerified({ type: null, number: null, rawText: text })

        } catch (err) {
            console.error('OCR Error:', err)
            setError('Failed to scan image. Please try again.')
        } finally {
            setScanning(false)
        }
    }, [onVerified])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1
    })

    return (
        <Card className="border-dashed border-2">
            <CardContent className="p-6">
                <div
                    {...getRootProps()}
                    className={`flex flex-col items-center justify-center min-h-[150px] cursor-pointer transition-colors
            ${isDragActive ? 'bg-primary/5' : 'hover:bg-muted/50'}
          `}
                >
                    <input {...getInputProps()} />

                    {scanning ? (
                        <div className="w-full max-w-xs space-y-4 text-center">
                            <ScanLine className="h-10 w-10 text-primary animate-pulse mx-auto" />
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Scanning ID Card...</p>
                                <Progress value={progress} className="h-2" />
                                <p className="text-xs text-muted-foreground">{progress}%</p>
                            </div>
                        </div>
                    ) : preview ? (
                        <div className="text-center space-y-2">
                            <img src={preview} alt="ID Preview" className="h-32 object-contain mx-auto rounded-md shadow-sm" />
                            <p className="text-xs text-muted-foreground mt-2">Click to scan a different card</p>
                        </div>
                    ) : (
                        <div className="text-center space-y-2">
                            <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
                            <div className="text-sm font-medium">
                                Drag & drop ID card here, or click to select
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Supports PAN and Aadhaar Cards
                            </p>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mt-4 flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
