'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useDebounce } from 'use-debounce'

export function useRiskControl(formId: string, formData: any) {
    const [isOffline, setIsOffline] = useState(false)
    const [debouncedData] = useDebounce(formData, 1000)

    // 1. Network Status Listener
    useEffect(() => {
        // Hydration check
        if (typeof window === 'undefined') return

        const handleOffline = () => {
            setIsOffline(true)
            toast.error('You are Offline', { description: 'Changes will be saved locally.' })
        }
        const handleOnline = () => {
            setIsOffline(false)
            toast.success('Back Online', { description: 'Syncing data...' })
        }

        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)

        return () => {
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
        }
    }, [])

    // 2. Auto-Save to LocalStorage
    useEffect(() => {
        if (debouncedData && Object.keys(debouncedData).length > 0) {
            localStorage.setItem(`draft_${formId}`, JSON.stringify(debouncedData))
            // Only show toast on significant updates or specific interval (skipped to avoid spam)
        }
    }, [debouncedData, formId])

    const loadDraft = () => {
        const saved = localStorage.getItem(`draft_${formId}`)
        return saved ? JSON.parse(saved) : null
    }

    const clearDraft = () => {
        localStorage.removeItem(`draft_${formId}`)
    }

    return {
        isOffline,
        loadDraft,
        clearDraft
    }
}
