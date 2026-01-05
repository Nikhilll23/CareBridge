'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, ExternalLink, Edit, Save, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  updateRadiologyStatus,
  updateRadiologyFindings,
  type RadiologyReport,
} from '@/actions/radiology'

interface ViewReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: RadiologyReport
  onUpdate: () => void
  isAdmin: boolean
}

export function ViewReportDialog({
  open,
  onOpenChange,
  report,
  onUpdate,
  isAdmin,
}: ViewReportDialogProps) {
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    findings: report.findings || '',
    impression: report.impression || '',
    status: report.status,
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-500'
      case 'IN_PROGRESS':
        return 'bg-blue-500/10 text-blue-500'
      case 'FINALIZED':
        return 'bg-green-500/10 text-green-500'
      case 'CANCELLED':
        return 'bg-red-500/10 text-red-500'
      default:
        return 'bg-gray-500/10 text-gray-500'
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true)
    const result = await updateRadiologyStatus(report.id, newStatus as any)

    if (result.success) {
      toast.success('Status updated successfully')
      onUpdate()
      setFormData({ ...formData, status: newStatus as any })
    } else {
      toast.error(result.error || 'Failed to update status')
    }

    setLoading(false)
  }

  const handleSaveFindings = async () => {
    setLoading(true)
    const result = await updateRadiologyFindings(
      report.id,
      formData.findings,
      formData.impression
    )

    if (result.success) {
      toast.success('Findings updated successfully')
      onUpdate()
      setEditing(false)
    } else {
      toast.error(result.error || 'Failed to update findings')
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Imaging Study Report</span>
            <Badge className={getStatusColor(formData.status)}>{formData.status}</Badge>
          </DialogTitle>
          <DialogDescription>
            Study ID: {report.id.slice(0, 8)}...
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary">Patient Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium text-foreground">
                  {report.patient
                    ? `${report.patient.first_name} ${report.patient.last_name}`
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Gender</Label>
                <p className="font-medium text-foreground">{report.patient?.gender || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Date of Birth</Label>
                <p className="font-medium text-foreground">
                  {report.patient?.date_of_birth
                    ? new Date(report.patient.date_of_birth).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Study Date</Label>
                <p className="font-medium text-foreground">
                  {new Date(report.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Study Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary">Study Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Modality</Label>
                <p className="font-medium text-foreground">{report.modality}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Radiologist</Label>
                <p className="font-medium text-foreground">{report.doctor?.full_name || 'Unknown'}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">Study Title</Label>
                <p className="font-medium text-foreground">{report.study_title}</p>
              </div>
              {report.study_url && (
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Image Link</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 gap-2"
                    onClick={() => window.open(report.study_url!, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Image
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Status Control */}
          {!editing && (
            <div className="space-y-2">
              <Label>Report Status</Label>
              <Select
                value={formData.status}
                onValueChange={handleStatusChange}
                disabled={loading}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="FINALIZED">Finalized</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Findings Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-primary">Radiological Findings</h3>
              {!editing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>

            {editing ? (
              <>
                <div className="space-y-2">
                  <Label>Findings</Label>
                  <textarea
                    value={formData.findings}
                    onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                    className="w-full min-h-37.5 px-3 py-2 text-sm rounded-md border border-input bg-background resize-none text-foreground"
                    placeholder="Detailed radiological findings..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Impression</Label>
                  <textarea
                    value={formData.impression}
                    onChange={(e) => setFormData({ ...formData, impression: e.target.value })}
                    className="w-full min-h-25 px-3 py-2 text-sm rounded-md border border-input bg-background resize-none text-foreground"
                    placeholder="Clinical impression and conclusion..."
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(false)
                      setFormData({
                        findings: report.findings || '',
                        impression: report.impression || '',
                        status: report.status,
                      })
                    }}
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveFindings} disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Findings</Label>
                  <div className="p-4 rounded-md bg-muted/50 border border-border text-sm text-foreground">
                    {formData.findings || (
                      <span className="text-muted-foreground italic">
                        No findings recorded yet
                      </span>
                    )}
                  </div>
                </div>

                {formData.impression && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Impression</Label>
                    <div className="p-4 rounded-md bg-muted/50 border border-border text-sm text-foreground">
                      {formData.impression}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Radiopaedia Link */}
          {report.radiopaedia_case_id && (
            <div className="p-4 rounded-md bg-blue-500/10 border border-blue-500/20">
              <Label className="text-blue-400">Linked Radiopaedia Case</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Reference case for educational purposes
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  window.open(
                    `https://radiopaedia.org/cases/${report.radiopaedia_case_id}`,
                    '_blank'
                  )
                }
              >
                <ExternalLink className="h-4 w-4" />
                View on Radiopaedia
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
