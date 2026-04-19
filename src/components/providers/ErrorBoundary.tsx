'use client'

import React from 'react'

interface State { hasError: boolean }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
    constructor(props: any) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    componentDidCatch(error: any) {
        console.warn('ErrorBoundary caught:', error?.message)
        // Auto-recover after 100ms by resetting state
        setTimeout(() => this.setState({ hasError: false }), 100)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: '100vh', background: '#0f172a', color: 'white', flexDirection: 'column', gap: 16
                }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>CareBridge</div>
                    <div style={{ color: '#94a3b8', fontSize: 14 }}>Loading...</div>
                    <div style={{
                        width: 40, height: 40, border: '3px solid #0ea5e9',
                        borderTopColor: 'transparent', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </div>
            )
        }
        return this.props.children
    }
}
