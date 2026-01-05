'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Sparkles, X, Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { chatWithAI } from '@/actions/ai'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface GlobalAIProps {
    userRole: 'ADMIN' | 'DOCTOR' | 'PATIENT' | 'NURSE' | string
    trigger?: React.ReactNode
    onOpenChange?: (open: boolean) => void
    open?: boolean
}

export function GlobalAI({ userRole, trigger, onOpenChange, open: controlledOpen }: GlobalAIProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isOpen = controlledOpen ?? internalOpen

    const [input, setInput] = useState('')
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
        { role: 'assistant', content: getWelcomeMessage(userRole) }
    ])
    const [loading, setLoading] = useState(false)

    function getWelcomeMessage(role: string) {
        switch (role) {
            case 'DOCTOR': return "Hello Doctor. I can assist with diagnoses, drug info, and summarizing data."
            case 'PATIENT': return "Hi there! I'm your health guide. Ask me about medical terms or wellness tips."
            case 'ADMIN': return "Operations Assistant ready. Ask about revenue, occupancy, or staffing."
            default: return "How can I help you today?"
        }
    }

    function getSystemPrompt(role: string) {
        switch (role) {
            case 'DOCTOR': return "You are a clinical assistant. Help with differential diagnosis, drug dosages, and interactions. Be concise and professional. Use medical terminology."
            case 'PATIENT': return "You are a compassionate health guide. Explain medical terms simply. Do NOT provide diagnoses. Always advise consulting a doctor. Be friendly and clear."
            case 'ADMIN': return "You are a hospital operations expert. Help analyze data trends, revenue, and efficiency. Be data-driven."
            default: return "You are a helpful medical assistant."
        }
    }

    const handleSend = async () => {
        if (!input.trim()) return

        const userMsg = input
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setLoading(true)

        try {
            const res = await chatWithAI(userMsg, undefined, undefined, getSystemPrompt(userRole))

            if (res.success && res.message) {
                setMessages(prev => [...prev, { role: 'assistant', content: res.message || '' }])
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now." }])
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong." }])
        } finally {
            setLoading(false)
        }
    }

    // New Sidebar Sheet UI
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange || setInternalOpen}>
            {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
            <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0">
                <SheetHeader className="px-6 py-4 border-b">
                    <SheetTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        AI Assistant ({userRole})
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-hidden flex flex-col bg-muted/10">
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-4">
                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-4 py-3 text-sm shadow-sm",
                                        m.role === 'user'
                                            ? "ml-auto bg-blue-600 text-white"
                                            : "bg-background border"
                                    )}
                                >
                                    {m.content}
                                </div>
                            ))}
                            {loading && (
                                <div className="bg-background border w-max rounded-lg px-4 py-3 text-sm text-muted-foreground animate-pulse shadow-sm">
                                    Thinking...
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <div className="p-4 border-t bg-background">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        className="flex w-full items-center gap-2"
                    >
                        <Input
                            placeholder="Type a message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1"
                            autoFocus
                        />
                        <Button type="submit" size="icon" disabled={loading}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    )
}
