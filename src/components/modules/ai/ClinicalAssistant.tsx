'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  FileText,
  Pill,
  Scan,
  User,
  AlertTriangle,
  X,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { AIMessage } from '@/types'
import {
  chatWithAI,
  summarizePatient,
  checkPatientDrugInteractions,
  analyzePatientRadiology,
  getPatientAIContext,
} from '@/actions/ai'

interface ClinicalAssistantProps {
  patientId: string
  patientName: string
  patientContext?: string
}

export function ClinicalAssistant({ patientId, patientName, patientContext }: ClinicalAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextLoaded, setContextLoaded] = useState(false)
  const [fullContext, setFullContext] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadPatientContext = async () => {
    setLoading(true)
    const context = await getPatientAIContext(patientId)
    setFullContext(context)
    setContextLoaded(true)
    toast.success('Patient data loaded into AI context')
    setLoading(false)
  }

  const sendMessage = async (customQuery?: string) => {
    const query = customQuery || input.trim()
    if (!query || loading) return

    const userMessage: AIMessage = {
      role: 'user',
      content: query,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    const result = await chatWithAI(query, fullContext, messages)

    if (result.success && result.message) {
      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: result.message,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } else {
      toast.error(result.error || 'Failed to get AI response')
      // Remove user message if failed
      setMessages((prev) => prev.slice(0, -1))
    }

    setLoading(false)
  }

  const handleQuickAction = async (action: string) => {
    setLoading(true)

    switch (action) {
      case 'summarize':
        const summaryResult = await summarizePatient(patientId)
        if (summaryResult.success && summaryResult.message) {
          setMessages([
            {
              role: 'user',
              content: 'Please provide a comprehensive summary of this patient.',
            },
            {
              role: 'assistant',
              content: summaryResult.message,
            },
          ])
          toast.success('Patient summary generated')
        } else {
          toast.error(summaryResult.error || 'Failed to generate summary')
        }
        break

      case 'interactions':
        // For demo, using placeholder medications
        const meds = ['Aspirin 81mg', 'Metformin 500mg', 'Lisinopril 10mg']
        const interactionResult = await checkPatientDrugInteractions(meds)
        if (interactionResult.success && interactionResult.message) {
          setMessages([
            {
              role: 'user',
              content: 'Check for drug interactions with current medications.',
            },
            {
              role: 'assistant',
              content: interactionResult.message,
            },
          ])
          toast.success('Drug interaction analysis complete')
        } else {
          toast.error(interactionResult.error || 'Failed to check interactions')
        }
        break

      case 'radiology':
        toast.info('Please select a specific radiology report to analyze')
        break
    }

    setLoading(false)
  }

  const clearChat = () => {
    setMessages([])
    setContextLoaded(false)
    setFullContext('')
    toast.info('Chat cleared')
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 h-fit">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Clinical AI Assistant
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Llama 3.3 70B
                </Badge>
              </CardTitle>
              <CardDescription>
                {contextLoaded ? `Analyzing ${patientName}` : 'Load patient data to begin'}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={clearChat} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-4">
          {!contextLoaded ? (
            <Button onClick={loadPatientContext} variant="default" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              Load Patient Data
            </Button>
          ) : (
            <>
              <Button
                onClick={() => handleQuickAction('summarize')}
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={loading}
              >
                <FileText className="h-4 w-4" />
                Summarize Patient
              </Button>
              <Button
                onClick={() => handleQuickAction('interactions')}
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={loading}
              >
                <Pill className="h-4 w-4" />
                Check Interactions
              </Button>
              <Button
                onClick={() => handleQuickAction('radiology')}
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={loading}
              >
                <Scan className="h-4 w-4" />
                Analyze Radiology
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 min-h-125">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="h-16 w-16 mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">AI Clinical Decision Support</h3>
            <p className="text-sm max-w-md mb-4">
              Load patient data and start asking questions. The AI can help with:
            </p>
            <ul className="text-sm space-y-1 text-left max-w-md">
              <li>• Analyzing medical histories and imaging reports</li>
              <li>• Identifying potential diagnoses</li>
              <li>• Checking drug interactions</li>
              <li>• Generating clinical summaries</li>
              <li>• Answering medical questions</li>
            </ul>
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-md max-w-md">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400 text-left">
                  This AI provides suggestions only. All recommendations must be reviewed and
                  validated by the treating physician.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="p-2 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 h-fit">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="p-2 rounded-lg bg-primary h-fit">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="p-2 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 h-fit">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input Area */}
      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              contextLoaded
                ? 'Ask about diagnoses, treatments, drug interactions...'
                : 'Load patient data first...'
            }
            disabled={!contextLoaded || loading}
            className="flex-1"
          />
          <Button type="submit" disabled={!contextLoaded || loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </Card>
  )
}
