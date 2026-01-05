'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Sparkles, Send, Bot, User, Database } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { chatWithAI, getBulkPatientContext, getPatientListForSelector, getPatientAIContext } from '@/actions/ai'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

interface AIChatProps {
    userRole: string
    userName?: string
}

export function AIChat({ userRole, userName }: AIChatProps) {
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
        { role: 'assistant', content: getWelcomeMessage(userRole) }
    ])
    const [loading, setLoading] = useState(false)
    const [aiContext, setAiContext] = useState<string>('')
    const [patientList, setPatientList] = useState<{ id: string, first_name: string, last_name: string }[]>([])
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Load patient list for Admins/Doctors
    useEffect(() => {
        if (['ADMIN', 'DOCTOR'].includes(userRole)) {
            getPatientListForSelector().then((res: any) => {
                if (res.success && res.patients) {
                    setPatientList(res.patients)
                }
            })
        }
    }, [userRole])

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    function getWelcomeMessage(role: string) {
        switch (role) {
            case 'DOCTOR': return "Hello Doctor. I can assist with diagnoses, drug info, and summarizing patient data."
            case 'PATIENT': return `Hi ${userName || 'there'}! I'm your specific health guide. Ask me about medical terms, wellness tips, or your upcoming appointments.`
            case 'ADMIN': return "Operations Assistant ready. Ask me about hospital revenue, detailed occupancy rates, or staffing logs."
            case 'NURSE': return "Hi! I can help you with patient vitals, medication schedules, and care plans."
            default: return "How can I assist you today?"
        }
    }

    function getSystemPrompt(role: string) {
        const contextInstruction = " IMPORTANT: You have access to patient data provided in the context. You MUST use this data to answer questions about specific patients, demographics, or medical history. Do not say you lack information if it is in the context."

        switch (role) {
            case 'DOCTOR': return "You are a clinical assistant. Help with differential diagnosis, drug dosages, and interactions. Be concise and professional." + contextInstruction
            case 'PATIENT': return "You are a compassionate health guide. Explain medical terms simply. Do NOT provide diagnoses. Always advise consulting a doctor. Be friendly and clear."
            case 'ADMIN': return "You are a hospital operations expert. Help analyze data trends, revenue, and efficiency. Be data-driven." + contextInstruction
            case 'NURSE': return "You are a nursing assistant. Help with care plans, medication schedules, and patient monitoring." + contextInstruction
            default: return "You are a helpful medical assistant." + contextInstruction
        }
    }

    const handlePatientSelect = async (value: string) => {
        setLoading(true)
        setSelectedPatientId(value)
        try {
            if (value === 'all_patients_summary') {
                const res = await getBulkPatientContext()
                if (res.success && res.context) {
                    setAiContext(res.context)
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `✅ Loaded database snapshot of ${res.count} patients.`
                    }])
                } else {
                    setMessages(prev => [...prev, { role: 'assistant', content: "Failed to load patient data." }])
                }
            } else {
                // Specific patient
                const context = await getPatientAIContext(value)
                setAiContext(context)
                const p = patientList.find(pt => pt.id === value)
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `✅ Loaded full medical context for **${p?.first_name} ${p?.last_name}**. Includes radiology, appointments, and history.`
                }])
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Error loading context." }])
        } finally {
            setLoading(false)
        }
    }

    const handleSend = async () => {
        if (!input.trim()) return

        const userMsg = input
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setLoading(true)

        try {
            const res = await chatWithAI(userMsg, aiContext || undefined, messages, getSystemPrompt(userRole))

            if (res.success && res.message) {
                setMessages(prev => [...prev, { role: 'assistant', content: res.message || '' }])
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again." }])
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong. Please check your connection." }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] w-full max-w-5xl mx-auto gap-4">
            <Card className="flex-1 flex flex-col shadow-md border-muted">
                <CardHeader className="border-b px-6 py-4 flex flex-row items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">AI Health Assistant</CardTitle>
                            <p className="text-xs text-muted-foreground font-medium">
                                Role: {userRole} Mode
                            </p>
                        </div>
                    </div>
                    {['ADMIN', 'DOCTOR'].includes(userRole) && mounted && (
                        <div className="w-[250px]">
                            <Select onValueChange={handlePatientSelect} disabled={loading}>
                                <SelectTrigger className="h-8 text-xs bg-background">
                                    <SelectValue placeholder="Select patient query scope..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_patients_summary">Full Database (Population Stats)</SelectItem>
                                    {patientList.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.first_name} {p.last_name} (Deep Dive)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="flex-1 p-0 overflow-hidden bg-muted/5 relative">
                    <ScrollArea className="h-full px-6 py-6">
                        <div className="space-y-6 pb-4">
                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex w-full gap-3",
                                        m.role === 'user' ? "justify-end" : "justify-start"
                                    )}
                                >
                                    {m.role === 'assistant' && (
                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                                            <Bot className="h-4 w-4 text-primary" />
                                        </div>
                                    )}

                                    <div
                                        className={cn(
                                            "flex flex-col gap-1 max-w-[80%] rounded-2xl px-5 py-3 text-sm shadow-sm",
                                            m.role === 'user'
                                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                : "bg-background border rounded-tl-sm"
                                        )}
                                    >
                                        <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                                    </div>

                                    {m.role === 'user' && (
                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center mt-1 border">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {loading && (
                                <div className="flex w-full gap-3 justify-start">
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                                        <Bot className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="bg-background border w-max rounded-2xl rounded-tl-sm px-5 py-3 text-sm text-muted-foreground shadow-sm">
                                        <div className="flex gap-1 items-center h-5">
                                            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef} />
                        </div>
                    </ScrollArea>
                </CardContent>

                <div className="p-4 border-t bg-background rounded-b-xl">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        className="flex w-full items-end gap-2 max-w-4xl mx-auto"
                    >
                        <Input
                            placeholder={`Message the ${userRole.toLowerCase()} assistant...`}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 min-h-[50px] py-3 px-4 resize-none"
                            autoFocus
                        />
                        <Button type="submit" size="icon" className="h-[50px] w-[50px] shrink-0" disabled={loading || !input.trim()}>
                            <Send className="h-5 w-5" />
                        </Button>
                    </form>
                    <p className="text-center text-xs text-muted-foreground mt-2">
                        AI can make mistakes. Please verify important information.
                    </p>
                </div>
            </Card>
        </div>
    )
}
