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
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: '100vh', background: '#111827', color: 'white', flexDirection: 'column', gap: 24,
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <div style={{ fontSize: 32, fontWeight: 'bold', color: '#3b82f6' }}>CareBridge</div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: '500', marginBottom: 8 }}>Something went wrong</div>
                        <div style={{ color: '#9ca3af', fontSize: 14 }}>The dashboard encountered a client-side error.</div>
                    </div>
                    <button 
                        onClick={() => this.setState({ hasError: false })}
                        style={{
                            padding: '10px 24px', background: '#3b82f6', color: 'white', 
                            border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: '600'
                        }}
                    >
                        Try Again
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}
