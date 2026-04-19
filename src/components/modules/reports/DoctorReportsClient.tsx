'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FileText, Download, Send, Eye, Search } from 'lucide-react'
import { safeFormat } from '@/lib/date'
import { sendReportToPatient } from '@/actions/reports'
import { toast } from 'sonner'
import jsPDF from 'jspdf'

interface DoctorReportsClientProps {
    reports: any[]
}

export function DoctorReportsClient({ reports }: DoctorReportsClientProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [sending, setSending] = useState<string | null>(null)

    const filteredReports = reports.filter(report =>
        report.patient?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.patient?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.patient?.uhid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.title?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleSendToPatient = async (reportId: string) => {
        setSending(reportId)
        const result = await sendReportToPatient(reportId)
        if (result.success) {
            toast.success('Report sent to patient!')
            window.location.reload()
        } else {
            toast.error('Failed to send report')
        }
        setSending(null)
    }

    const generatePDF = (report: any) => {
        const doc = new jsPDF()

        // Header
        doc.setFontSize(18)
        doc.text('Medical Report', 20, 20)

        doc.setFontSize(12)
        doc.text(`Patient: ${report.patient?.first_name} ${report.patient?.last_name}`, 20, 35)
        doc.text(`UHID: ${report.patient?.uhid}`, 20, 42)
        doc.text(`Date: ${format(new Date(report.created_at), 'PPP')}`, 20, 49)
        doc.text(`Type: ${report.report_type}`, 20, 56)

        // Divider
        doc.line(20, 60, 190, 60)

        // Title
        doc.setFontSize(14)
        doc.text(report.title, 20, 70)

        // Content
        doc.setFontSize(11)

        // Clean text formatting
        let cleanContent = report.raw_text || 'No content'
        // Replace literal \n with actual newlines
        cleanContent = cleanContent.replace(/\\n/g, '\n')
        // Remove markdown bold markers
        cleanContent = cleanContent.replace(/\*\*/g, '')
        // Remove markdown headers #
        cleanContent = cleanContent.replace(/#/g, '')

        const splitText = doc.splitTextToSize(cleanContent, 170)
        doc.text(splitText, 20, 80)

        // Footer
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(10)
            doc.text(`Page ${i} of ${pageCount}`, 20, 285)
            doc.text('CareBridge', 130, 285)
        }

        return doc
    }

    const handleDownload = (report: any) => {
        const doc = generatePDF(report)
        doc.save(`${report.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`)
        toast.success('PDF downloaded!')
    }

    const handlePreview = (report: any) => {
        const doc = generatePDF(report)
        const pdfBlob = doc.output('blob')
        const url = URL.createObjectURL(pdfBlob)
        window.open(url, '_blank')
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Medical Reports</h1>
                <p className="text-muted-foreground">Manage and send reports to patients</p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by patient name, UHID, or report title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Reports List */}
            <div className="grid gap-4">
                {filteredReports.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            {searchQuery ? 'No reports found matching your search.' : 'No reports created yet.'}
                        </CardContent>
                    </Card>
                ) : (
                    filteredReports.map((report) => (
                        <Card key={report.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2">
                                            <FileText className="h-5 w-5" />
                                            {report.title}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span>Patient: {report.patient?.first_name} {report.patient?.last_name}</span>
                                            <span>•</span>
                                            <span>UHID: {report.patient?.uhid}</span>
                                            <span>•</span>
                                            <span>{safeFormat(report.created_at, 'MMM d, yyyy')}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={
                                            report.status === 'SENT' ? 'default' :
                                                report.status === 'FINALIZED' ? 'secondary' :
                                                    'outline'
                                        }>
                                            {report.status}
                                        </Badge>
                                        <Badge variant="outline">{report.report_type}</Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePreview(report)}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Preview
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownload(report)}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Download PDF
                                    </Button>
                                    {report.status !== 'SENT' && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleSendToPatient(report.id)}
                                            disabled={sending === report.id}
                                        >
                                            <Send className="h-4 w-4 mr-2" />
                                            {sending === report.id ? 'Sending...' : 'Send to Patient'}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
