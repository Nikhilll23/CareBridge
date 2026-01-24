'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { 
    Pen, 
    Eraser, 
    Undo2, 
    Redo2, 
    Trash2, 
    Download, 
    Save,
    ZoomIn,
    ZoomOut,
    Move,
    Highlighter,
    PenLine
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Point {
    x: number
    y: number
    pressure: number
    timestamp: number
}

interface Stroke {
    points: Point[]
    color: string
    width: number
    tool: 'pen' | 'highlighter' | 'eraser'
    opacity: number
}

interface HandwritingCanvasProps {
    initialData?: string // Base64 or JSON string of strokes
    onSave?: (data: { imageData: string; strokeData: string }) => void
    onAutoSave?: (data: { imageData: string; strokeData: string }) => void
    width?: number
    height?: number
    readOnly?: boolean
    className?: string
}

const COLORS = [
    '#000000', // Black
    '#1a365d', // Navy
    '#2563eb', // Blue
    '#059669', // Green
    '#dc2626', // Red
    '#7c3aed', // Purple
    '#ea580c', // Orange
]

export function HandwritingCanvas({ 
    initialData,
    onSave,
    onAutoSave,
    width = 800,
    height = 600,
    readOnly = false,
    className
}: HandwritingCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    
    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false)
    const [currentStroke, setCurrentStroke] = useState<Point[]>([])
    const [strokes, setStrokes] = useState<Stroke[]>([])
    const [redoStack, setRedoStack] = useState<Stroke[]>([])
    
    // Tool state
    const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser' | 'pan'>('pen')
    const [color, setColor] = useState('#000000')
    const [strokeWidth, setStrokeWidth] = useState(2)
    const [highlighterWidth, setHighlighterWidth] = useState(20)
    const [eraserWidth, setEraserWidth] = useState(20)
    
    // Pan/Zoom state
    const [scale, setScale] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [isPanning, setIsPanning] = useState(false)
    const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
    
    // Touch state for palm rejection
    const [lastTouchTime, setLastTouchTime] = useState(0)
    
    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        
        // Set canvas size
        canvas.width = width
        canvas.height = height
        
        // Load initial data if provided
        if (initialData) {
            try {
                const parsed = JSON.parse(initialData)
                if (parsed.strokes) {
                    setStrokes(parsed.strokes)
                }
            } catch {
                // If it's an image data URL, draw it
                if (initialData.startsWith('data:image')) {
                    const img = new Image()
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0)
                    }
                    img.src = initialData
                }
            }
        }
        
        // Initial render
        redrawCanvas()
    }, [initialData, width, height])
    
    // Redraw canvas whenever strokes change
    useEffect(() => {
        redrawCanvas()
    }, [strokes, scale, offset])
    
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        
        // Clear canvas with white background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Draw lined paper effect
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 1
        for (let y = 40; y < canvas.height; y += 30) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(canvas.width, y)
            ctx.stroke()
        }
        
        // Draw left margin
        ctx.strokeStyle = '#fca5a5'
        ctx.beginPath()
        ctx.moveTo(80, 0)
        ctx.lineTo(80, canvas.height)
        ctx.stroke()
        
        // Apply transformation
        ctx.save()
        ctx.translate(offset.x, offset.y)
        ctx.scale(scale, scale)
        
        // Draw all strokes
        strokes.forEach(stroke => {
            drawStroke(ctx, stroke)
        })
        
        ctx.restore()
    }, [strokes, scale, offset])
    
    const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
        if (stroke.points.length < 2) return
        
        ctx.globalAlpha = stroke.opacity
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        
        if (stroke.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out'
            ctx.strokeStyle = '#ffffff'
        } else if (stroke.tool === 'highlighter') {
            ctx.globalCompositeOperation = 'multiply'
            ctx.strokeStyle = stroke.color
        } else {
            ctx.globalCompositeOperation = 'source-over'
            ctx.strokeStyle = stroke.color
        }
        
        ctx.beginPath()
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
        
        // Use quadratic curves for smooth lines
        for (let i = 1; i < stroke.points.length - 1; i++) {
            const p0 = stroke.points[i]
            const p1 = stroke.points[i + 1]
            const midX = (p0.x + p1.x) / 2
            const midY = (p0.y + p1.y) / 2
            
            // Pressure-sensitive width
            const pressure = Math.max(0.1, p0.pressure)
            ctx.lineWidth = stroke.width * pressure
            
            ctx.quadraticCurveTo(p0.x, p0.y, midX, midY)
        }
        
        // Draw to the last point
        const lastPoint = stroke.points[stroke.points.length - 1]
        ctx.lineTo(lastPoint.x, lastPoint.y)
        ctx.stroke()
        
        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
    }
    
    const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0, pressure: 0.5, timestamp: Date.now() }
        
        const rect = canvas.getBoundingClientRect()
        const x = (e.clientX - rect.left - offset.x) / scale
        const y = (e.clientY - rect.top - offset.y) / scale
        
        // Get pressure from pointer event (stylus support)
        let pressure = e.pressure
        if (pressure === 0) pressure = 0.5 // Default for mouse
        
        return { x, y, pressure, timestamp: Date.now() }
    }
    
    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (readOnly) return
        
        const canvas = canvasRef.current
        if (!canvas) return
        
        // Palm rejection: ignore touch if we recently had stylus input
        if (e.pointerType === 'touch') {
            const now = Date.now()
            if (now - lastTouchTime < 100) return
        }
        
        if (e.pointerType === 'pen') {
            setLastTouchTime(Date.now())
        }
        
        // Capture pointer for better tracking
        canvas.setPointerCapture(e.pointerId)
        
        if (tool === 'pan') {
            setIsPanning(true)
            setLastPanPoint({ x: e.clientX, y: e.clientY })
            return
        }
        
        setIsDrawing(true)
        const point = getCanvasPoint(e)
        setCurrentStroke([point])
        
        // Clear redo stack when starting new stroke
        setRedoStack([])
    }
    
    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (readOnly) return
        
        // Palm rejection
        if (e.pointerType === 'touch') {
            const now = Date.now()
            if (now - lastTouchTime < 100) return
        }
        
        if (isPanning) {
            const dx = e.clientX - lastPanPoint.x
            const dy = e.clientY - lastPanPoint.y
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
            setLastPanPoint({ x: e.clientX, y: e.clientY })
            return
        }
        
        if (!isDrawing) return
        
        const point = getCanvasPoint(e)
        const newStroke = [...currentStroke, point]
        setCurrentStroke(newStroke)
        
        // Draw current stroke in real-time
        const canvas = canvasRef.current
        if (!canvas) return
        
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        
        // Only draw the new segment
        if (newStroke.length >= 2) {
            ctx.save()
            ctx.translate(offset.x, offset.y)
            ctx.scale(scale, scale)
            
            const currentWidth = tool === 'highlighter' 
                ? highlighterWidth 
                : tool === 'eraser' 
                    ? eraserWidth 
                    : strokeWidth
            
            const tempStroke: Stroke = {
                points: [newStroke[newStroke.length - 2], newStroke[newStroke.length - 1]],
                color: tool === 'eraser' ? '#ffffff' : color,
                width: currentWidth,
                tool: tool === 'pan' ? 'pen' : tool,
                opacity: tool === 'highlighter' ? 0.4 : 1
            }
            
            drawStroke(ctx, tempStroke)
            ctx.restore()
        }
    }
    
    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (readOnly) return
        
        const canvas = canvasRef.current
        if (canvas) {
            canvas.releasePointerCapture(e.pointerId)
        }
        
        if (isPanning) {
            setIsPanning(false)
            return
        }
        
        if (!isDrawing || currentStroke.length < 2) {
            setIsDrawing(false)
            setCurrentStroke([])
            return
        }
        
        const currentWidth = tool === 'highlighter' 
            ? highlighterWidth 
            : tool === 'eraser' 
                ? eraserWidth 
                : strokeWidth
        
        const newStroke: Stroke = {
            points: currentStroke,
            color: tool === 'eraser' ? '#ffffff' : color,
            width: currentWidth,
            tool: tool === 'pan' ? 'pen' : tool,
            opacity: tool === 'highlighter' ? 0.4 : 1
        }
        
        setStrokes(prev => [...prev, newStroke])
        setIsDrawing(false)
        setCurrentStroke([])
        
        // Trigger auto-save
        if (onAutoSave) {
            setTimeout(() => {
                const data = exportData()
                if (data) onAutoSave(data)
            }, 100)
        }
    }
    
    const handleUndo = () => {
        if (strokes.length === 0) return
        const lastStroke = strokes[strokes.length - 1]
        setStrokes(prev => prev.slice(0, -1))
        setRedoStack(prev => [...prev, lastStroke])
    }
    
    const handleRedo = () => {
        if (redoStack.length === 0) return
        const strokeToRedo = redoStack[redoStack.length - 1]
        setRedoStack(prev => prev.slice(0, -1))
        setStrokes(prev => [...prev, strokeToRedo])
    }
    
    const handleClear = () => {
        if (strokes.length === 0) return
        setRedoStack([...strokes])
        setStrokes([])
    }
    
    const handleZoomIn = () => {
        setScale(prev => Math.min(prev * 1.2, 3))
    }
    
    const handleZoomOut = () => {
        setScale(prev => Math.max(prev / 1.2, 0.5))
    }
    
    const handleResetView = () => {
        setScale(1)
        setOffset({ x: 0, y: 0 })
    }
    
    const exportData = () => {
        const canvas = canvasRef.current
        if (!canvas) return null
        
        // Get image data
        const imageData = canvas.toDataURL('image/png')
        
        // Get stroke data for reconstruction
        const strokeData = JSON.stringify({ strokes })
        
        return { imageData, strokeData }
    }
    
    const handleSave = () => {
        const data = exportData()
        if (data && onSave) {
            onSave(data)
        }
    }
    
    const handleDownload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        
        const link = document.createElement('a')
        link.download = `prescription-${new Date().toISOString().split('T')[0]}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
    }
    
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault()
                    handleUndo()
                } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
                    e.preventDefault()
                    handleRedo()
                } else if (e.key === 's') {
                    e.preventDefault()
                    handleSave()
                }
            }
        }
        
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [strokes, redoStack])
    
    return (
        <div className={cn("flex flex-col gap-4", className)} ref={containerRef}>
            {/* Toolbar */}
            {!readOnly && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                    {/* Drawing Tools */}
                    <div className="flex items-center gap-1 pr-3 border-r">
                        <Button
                            variant={tool === 'pen' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTool('pen')}
                            title="Pen (Fine writing)"
                        >
                            <PenLine className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={tool === 'highlighter' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTool('highlighter')}
                            title="Highlighter"
                            className={tool === 'highlighter' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                        >
                            <Highlighter className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={tool === 'eraser' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTool('eraser')}
                            title="Eraser"
                        >
                            <Eraser className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={tool === 'pan' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTool('pan')}
                            title="Pan"
                        >
                            <Move className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {/* Colors */}
                    <div className="flex items-center gap-1 pr-3 border-r">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                className={cn(
                                    "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                                    color === c ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-gray-300'
                                )}
                                style={{ backgroundColor: c }}
                                onClick={() => setColor(c)}
                                title={c}
                            />
                        ))}
                    </div>
                    
                    {/* Stroke Width */}
                    <div className="flex items-center gap-2 pr-3 border-r min-w-[150px]">
                        <Label className="text-xs whitespace-nowrap">Size:</Label>
                        <Slider
                            value={[tool === 'highlighter' ? highlighterWidth : tool === 'eraser' ? eraserWidth : strokeWidth]}
                            onValueChange={([value]) => {
                                if (tool === 'highlighter') setHighlighterWidth(value)
                                else if (tool === 'eraser') setEraserWidth(value)
                                else setStrokeWidth(value)
                            }}
                            min={1}
                            max={tool === 'pen' ? 10 : 50}
                            step={1}
                            className="w-20"
                        />
                        <span className="text-xs text-muted-foreground w-6">
                            {tool === 'highlighter' ? highlighterWidth : tool === 'eraser' ? eraserWidth : strokeWidth}
                        </span>
                    </div>
                    
                    {/* Undo/Redo */}
                    <div className="flex items-center gap-1 pr-3 border-r">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUndo}
                            disabled={strokes.length === 0}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo2 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRedo}
                            disabled={redoStack.length === 0}
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo2 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClear}
                            disabled={strokes.length === 0}
                            title="Clear All"
                            className="text-destructive hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {/* Zoom */}
                    <div className="flex items-center gap-1 pr-3 border-r">
                        <Button variant="outline" size="sm" onClick={handleZoomOut} title="Zoom Out">
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground w-12 text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <Button variant="outline" size="sm" onClick={handleZoomIn} title="Zoom In">
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleResetView} title="Reset View">
                            Reset
                        </Button>
                    </div>
                    
                    {/* Save/Export */}
                    <div className="flex items-center gap-1 ml-auto">
                        <Button variant="outline" size="sm" onClick={handleDownload} title="Download PNG">
                            <Download className="h-4 w-4 mr-1" />
                            Export
                        </Button>
                        {onSave && (
                            <Button size="sm" onClick={handleSave} title="Save (Ctrl+S)">
                                <Save className="h-4 w-4 mr-1" />
                                Save
                            </Button>
                        )}
                    </div>
                </div>
            )}
            
            {/* Canvas Container */}
            <div className="relative border rounded-lg overflow-hidden bg-white shadow-inner">
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    className={cn(
                        "touch-none",
                        tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair',
                        readOnly && 'pointer-events-none'
                    )}
                    style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '60vh'
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onContextMenu={(e) => e.preventDefault()}
                />
                
                {/* Stylus Detection Indicator */}
                {!readOnly && (
                    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                        <Pen className="h-3 w-3 inline mr-1" />
                        Stylus/Pencil Ready
                    </div>
                )}
            </div>
            
            {/* Instructions */}
            {!readOnly && (
                <p className="text-xs text-muted-foreground text-center">
                    Use your tablet stylus or Apple Pencil for best results. Palm rejection is enabled.
                    <span className="mx-2">•</span>
                    Keyboard: Ctrl+Z (Undo), Ctrl+Y (Redo), Ctrl+S (Save)
                </p>
            )}
        </div>
    )
}
