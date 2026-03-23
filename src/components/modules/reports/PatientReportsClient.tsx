'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FileText, Download, Eye, Search } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import jsPDF from 'jspdf'

interface PatientReportsClientProps {
    reports: any[]
}

export function PatientReportsClient({ reports }: PatientReportsClientProps) {
    const [searchQuery, setSearchQuery] = useState('')

    const filteredReports = reports.filter(report =>
        report.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.doctor?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.doctor?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const generatePDF = (report: any) => {
        const doc = new jsPDF()

        // Header
        doc.setFontSize(18)
        doc.text('Medical Report', 20, 20)

        doc.setFontSize(12)
        doc.text(`Doctor: Dr. ${report.doctor?.first_name} ${report.doctor?.last_name}`, 20, 35)
        doc.text(`Date: ${format(new Date(report.created_at), 'PPP')}`, 20, 42)
        doc.text(`Type: ${report.report_type}`, 20, 49)

        // Divider
        doc.line(20, 53, 190, 53)

        // Title
        doc.setFontSize(14)
        doc.text(report.title, 20, 63)

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
        doc.text(splitText, 20, 73)

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
        const fileName = report.report_type === 'VOICE_NOTE'
            ? `meeting_report_${Date.now()}.pdf`
            : `${report.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`
        doc.save(fileName)
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
                <h1 className="text-3xl font-bold tracking-tight">My Medical Reports</h1>
                <p className="text-muted-foreground">View and download your medical reports</p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by report title or doctor name..."
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
                            {searchQuery ? 'No reports found matching your search.' : 'No reports available yet.'}
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
                                            <span>Dr. {report.doctor?.first_name} {report.doctor?.last_name}</span>
                                            <span>•</span>
                                            <span>{format(new Date(report.created_at), 'PPP')}</span>
                                        </div>
                                    </div>
                                    <Badge variant="outline">{report.report_type}</Badge>
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
                                        size="sm"
                                        onClick={() => handleDownload(report)}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Download PDF
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
