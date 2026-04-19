'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, ExternalLink, Download, FileImage, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CornerstoneViewerProps {
    imageUrl: string
    className?: string
}

export function CornerstoneViewer({ imageUrl, className }: CornerstoneViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [status, setStatus] = useState<'loading' | 'ready' | 'compressed' | 'error'>('loading')
    const [errorMsg, setErrorMsg] = useState('')
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)

    const proxiedUrl = `/api/dicom-proxy?url=${encodeURIComponent(imageUrl)}`

    useEffect(() => {
        if (!imageUrl) { setStatus('error'); setErrorMsg('No image URL provided'); return }
        let cancelled = false

        const loadDicom = async () => {
            setStatus('loading')
            try {
                const dicomParser = (await import('dicom-parser')).default
                const res = await fetch(proxiedUrl)
                if (!res.ok) throw new Error(`HTTP ${res.status}`)

                const buffer = await res.arrayBuffer()
                const byteArray = new Uint8Array(buffer)

                let dataSet: any
                try {
                    dataSet = dicomParser.parseDicom(byteArray, { untilTag: 'x7fe00010' })
                } catch {
                    try { dataSet = dicomParser.parseDicom(byteArray) }
                    catch { throw new Error('Invalid DICOM format') }
                }

                const rows = dataSet.uint16('x00280010') || 0
                const cols = dataSet.uint16('x00280011') || 0

                if (!rows || !cols) {
                    // Compressed DICOM — show info panel instead of error
                    if (!cancelled) setStatus('compressed')
                    return
                }

                const bitsAllocated = dataSet.uint16('x00280100') || 16
                const pixelRepresentation = dataSet.uint16('x00280103') || 0
                const samplesPerPixel = dataSet.uint16('x00280002') || 1
                const pixelDataElement = dataSet.elements.x7fe00010

                if (!pixelDataElement) {
                    if (!cancelled) setStatus('compressed')
                    return
                }

                const canvas = canvasRef.current
                if (!canvas || cancelled) return
                canvas.width = cols
                canvas.height = rows
                const ctx = canvas.getContext('2d')
                if (!ctx) throw new Error('Canvas unavailable')

                const offset = pixelDataElement.dataOffset
                const length = pixelDataElement.length
                let pixelData: Int16Array | Uint16Array | Uint8Array

                if (bitsAllocated === 16) {
                    const aligned = new ArrayBuffer(length)
                    new Uint8Array(aligned).set(byteArray.slice(offset, offset + length))
                    pixelData = pixelRepresentation === 1 ? new Int16Array(aligned) : new Uint16Array(aligned)
                } else {
                    pixelData = byteArray.slice(offset, offset + length)
                }

                let min = Infinity, max = -Infinity
                const step = Math.max(1, Math.floor(pixelData.length / 10000))
                for (let i = 0; i < pixelData.length; i += step) {
                    if (pixelData[i] < min) min = pixelData[i]
                    if (pixelData[i] > max) max = pixelData[i]
                }
                const range = max - min || 1

                const imageData = ctx.createImageData(cols, rows)
                const total = rows * cols

                if (samplesPerPixel === 3) {
                    for (let i = 0; i < total; i++) {
                        imageData.data[i * 4] = pixelData[i * 3] as number
                        imageData.data[i * 4 + 1] = pixelData[i * 3 + 1] as number
                        imageData.data[i * 4 + 2] = pixelData[i * 3 + 2] as number
                        imageData.data[i * 4 + 3] = 255
                    }
                } else {
                    for (let i = 0; i < total; i++) {
                        const v = Math.max(0, Math.min(255, Math.round(((pixelData[i] - min) / range) * 255)))
                        imageData.data[i * 4] = v
                        imageData.data[i * 4 + 1] = v
                        imageData.data[i * 4 + 2] = v
                        imageData.data[i * 4 + 3] = 255
                    }
                }
                ctx.putImageData(imageData, 0, 0)
                if (!cancelled) setStatus('ready')

            } catch (err: any) {
                console.warn('DICOM load error:', err.message)
                if (!cancelled) {
                    setErrorMsg(err.message || 'Failed to load DICOM')
                    setStatus('error')
                }
            }
        }

        loadDicom()
        return () => { cancelled = true }
    }, [imageUrl])

    return (
        <div className={`relative bg-black flex flex-col ${className}`}>
            {/* Toolbar */}
            {status === 'ready' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/80 border-b border-gray-700 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-gray-700" onClick={() => setZoom(z => Math.min(z + 0.25, 4))}><ZoomIn className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-gray-700" onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}><ZoomOut className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-gray-700" onClick={() => setRotation(r => (r + 90) % 360)}><RotateCw className="h-4 w-4" /></Button>
                    <span className="text-xs text-gray-400 ml-1">{Math.round(zoom * 100)}%</span>
                    <Button size="sm" variant="ghost" className="ml-auto text-xs text-gray-400 h-7" onClick={() => { setZoom(1); setRotation(0) }}>Reset</Button>
                </div>
            )}

            <div className="flex-1 flex items-center justify-center overflow-auto relative min-h-[300px]">
                {status === 'loading' && (
                    <div className="flex flex-col items-center gap-3 text-white">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                        <span className="text-sm text-gray-300">Loading DICOM...</span>
                    </div>
                )}

                {status === 'compressed' && (
                    <div className="flex flex-col items-center text-center p-8 gap-4 max-w-sm">
                        <div className="h-16 w-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <FileImage className="h-8 w-8 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-white font-medium text-lg">DICOM Image</p>
                            <p className="text-gray-400 text-sm mt-1">This file uses compressed encoding (JPEG2000/JPEG Lossless) which requires a dedicated DICOM viewer.</p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-center">
                            <Button variant="outline" size="sm" className="text-blue-400 border-blue-400 hover:bg-blue-400/10" onClick={() => window.open(proxiedUrl, '_blank')}>
                                <Download className="h-4 w-4 mr-2" />
                                Download DICOM
                            </Button>
                            <Button variant="outline" size="sm" className="text-gray-400 border-gray-600 hover:bg-gray-700" onClick={() => window.open(`https://www.imaios.com/en/Imaios-Dicom-Viewer`, '_blank')}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open Online Viewer
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">Tip: Download the file and open it in RadiAnt, OsiriX, or 3D Slicer</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center text-center p-6 gap-3">
                        <p className="text-red-400 font-medium">Failed to load viewer</p>
                        <p className="text-gray-400 text-sm max-w-xs">{errorMsg}</p>
                        <Button variant="outline" size="sm" className="text-blue-400 border-blue-400 hover:bg-blue-400/10" onClick={() => window.open(proxiedUrl, '_blank')}>
                            <Download className="h-4 w-4 mr-2" />
                            Download DICOM file
                        </Button>
                    </div>
                )}

                <canvas
                    ref={canvasRef}
                    style={{
                        display: status === 'ready' ? 'block' : 'none',
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease',
                        imageRendering: 'pixelated',
                        maxWidth: '100%',
                        maxHeight: '100%',
                    }}
                />
            </div>
        </div>
    )
}
