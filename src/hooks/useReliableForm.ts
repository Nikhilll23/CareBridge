'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useDebounce } from 'use-debounce'

export function useReliableForm(formId: string, formData: any, setFormData: (data: any) => void) {
    const [isOffline, setIsOffline] = useState(false)
    const [debouncedData] = useDebounce(formData, 3000) // 3s debounce as requested
    const [hasDraft, setHasDraft] = useState(false)

    // 1. Network Status
    useEffect(() => {
        if (typeof window === 'undefined') return
        const handleOffline = () => {
            setIsOffline(true)
            toast.error('Connection Lost', { description: 'Form is in offline mode. Changes saved locally.' })
        }
        const handleOnline = () => {
            setIsOffline(false)
            toast.success('Online', { description: 'Connection restored.' })
        }
        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)
        return () => {
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
        }
    }, [])

    // 2. Load Draft on Mount
    useEffect(() => {
        const saved = localStorage.getItem(`draft_${formId}`)
        if (saved) {
            const parsed = JSON.parse(saved)
            // Check if draft is different from initial Empty state (heuristic)
            if (Object.keys(parsed).length > 0) {
                setHasDraft(true)
                // We don't auto-restore, we expose restore function
            }
        }
    }, [formId])

    // 3. Auto-Save
    useEffect(() => {
        if (debouncedData && Object.keys(debouncedData).length > 0) {
            localStorage.setItem(`draft_${formId}`, JSON.stringify(debouncedData))
        }
    }, [debouncedData, formId])

    const restoreDraft = () => {
        const saved = localStorage.getItem(`draft_${formId}`)
        if (saved) {
            setFormData(JSON.parse(saved))
            toast.success('Draft Restored')
            setHasDraft(false) // Hide prompt
        }
    }

    const clearDraft = () => {
        localStorage.removeItem(`draft_${formId}`)
        setHasDraft(false)
    }

    return {
        isOffline,
        hasDraft,
        restoreDraft,
        clearDraft
    }
}
