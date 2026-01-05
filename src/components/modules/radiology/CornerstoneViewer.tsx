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
                const cornerstone = (await import('cornerstone-core')).default
                const cornerstoneMath = (await import('cornerstone-math')).default
                const cornerstoneTools = (await import('cornerstone-tools')).default
                const cornerstoneWADOImageLoader = (await import('cornerstone-wado-image-loader')).default
                const dicomParser = await import('dicom-parser')
                const hammer = (await import('hammerjs')).default

                // Setup Cornerstone WADO Image Loader
                cornerstoneWADOImageLoader.external.cornerstone = cornerstone
                cornerstoneWADOImageLoader.external.dicomParser = dicomParser

                // Configure WADO Image Loader
                cornerstoneWADOImageLoader.configure({
                    beforeSend: function (_xhr: XMLHttpRequest) {
                        // Add custom headers if needed (e.g. Auth) - TCIA is public so none needed
                    },
                })

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
                <div className="absolute inset-0 flex items-center justify-center text-red-500 z-10">
                    <p>{error}</p>
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
