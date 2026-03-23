'use client'

import { useEffect, useRef, useState } from 'react'
import { Activity } from 'lucide-react'

// Note: Dynamic imports are tricky with Cornerstone libraries that expect 'window' to exist at import time.
// We will import them inside useEffect or use dynamic from next/dynamic if needed.
// For now, standard imports might break server-side rendering, so ensure this component is only rendered client-side.

interface CornerstoneViewerProps {
    imageUrl: string
    className?: string
}

export function CornerstoneViewer({ imageUrl, className }: CornerstoneViewerProps) {
    const elementRef = useRef<HTMLDivElement>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        const initCornerstone = async () => {
            if (typeof window === 'undefined') return

            try {
                setLoading(true)

                // Dynamically import libraries to ensure they run only on client
                let cornerstone: any, cornerstoneTools: any, cornerstoneWADOImageLoader: any, dicomParser: any, hammer: any

                try {
                    cornerstone = (await import('cornerstone-core')).default
                    const cornerstoneMath = (await import('cornerstone-math')).default
                    cornerstoneTools = (await import('cornerstone-tools')).default
                    cornerstoneWADOImageLoader = (await import('cornerstone-wado-image-loader')).default
                    dicomParser = await import('dicom-parser')
                    hammer = (await import('hammerjs')).default
                } catch (importErr) {
                    console.error('Cornerstone Load Error:', importErr)
                    if (mounted) setError('DICOM viewer libraries failed to load')
                    setLoading(false)
                    return
                }

                // Configure WADO Image Loader
                cornerstoneWADOImageLoader.external.cornerstone = cornerstone
                cornerstoneWADOImageLoader.external.dicomParser = dicomParser

                // Explicitly configure web workers (using local file served from public/dicom-worker.js)
                // This eliminates CORS and version mismatch issues
                const config = {
                    webWorkerPath: '/dicom-worker.js',
                    taskConfiguration: {
                        decodeTask: {
                            initializeCodecsOnStartup: true,
                        },
                    },
                }
                cornerstoneWADOImageLoader.webWorkerManager.initialize(config)

                // Setup Cornerstone Tools
                cornerstoneTools.external.cornerstone = cornerstone
                cornerstoneTools.external.Hammer = hammer
                cornerstoneTools.external.cornerstoneMath = cornerstoneMath

                cornerstoneTools.init()

                // Enable Element
                if (elementRef.current && mounted) {
                    cornerstone.enable(elementRef.current)

                    // Load Image
                    // Note: imageUrl must be prefixed with 'wadouri:' for the loader to recognize it
                    const imageId = `wadouri:${imageUrl}`

                    try {
                        const image = await cornerstone.loadImage(imageId)

                        if (mounted && elementRef.current) {
                            cornerstone.displayImage(elementRef.current, image)

                            // Enable Tools
                            // Wwwc (Window/Level) is the standard tool
                            const WwwcTool = cornerstoneTools.WwwcTool
                            const ZoomTool = cornerstoneTools.ZoomTool
                            const PanTool = cornerstoneTools.PanTool

                            cornerstoneTools.addTool(WwwcTool)
                            cornerstoneTools.addTool(ZoomTool)
                            cornerstoneTools.addTool(PanTool)

                            cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 }) // Left Click
                            cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 2 }) // Middle Click
                            cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 4 }) // Right Click

                            setLoading(false)
                        }
                    } catch (loadError) {
                        console.error('Cornerstone Load Error:', loadError)
                        if (mounted) setError('Failed to load DICOM image')
                        setLoading(false)
                    }
                }
            } catch (err) {
                console.error('Cornerstone Init Error:', err)
                if (mounted) setError('Failed to initialize viewer')
                setLoading(false)
            }
        }

        initCornerstone()

        // Cleanup
        return () => {
            mounted = false
            if (elementRef.current) {
                try {
                    const cornerstone = require('cornerstone-core').default
                    cornerstone.disable(elementRef.current)
                } catch (e) {
                    // ignore cleanup errors
                }
            }
        }
    }, [imageUrl])

    return (
        <div className={`relative bg-black ${className}`}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center text-white z-10">
                    <Activity className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading DICOM...</span>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
                    <p className="text-red-400 font-medium mb-2">{error}</p>
                    <p className="text-muted-foreground text-sm">
                        The DICOM viewer could not load. You can try opening the image directly:
                    </p>
                    {imageUrl && (
                        <a
                            href={imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 text-sm text-blue-400 underline"
                        >
                            Open image in new tab
                        </a>
                    )}
                </div>
            )}
            <div
                ref={elementRef}
                className="w-full h-full"
                style={{ minHeight: '400px' }}
                onContextMenu={(e) => e.preventDefault()} // Prevent context menu for right-click zoom
            />
        </div>
    )
}
