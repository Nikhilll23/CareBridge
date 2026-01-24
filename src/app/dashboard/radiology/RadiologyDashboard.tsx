'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ActivitySquare,
  Plus,
  Search,
  Filter,
  FileText,
  Eye,
  ExternalLink,
  Scan,
  Brain,
  Heart,
  Bone,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
  Save,
  Image as ImageIcon
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getRadiologyReports,
  getRadiologyStats,
  type RadiologyReport,
  browsePublicCollections,
  searchTCIAStudies,
  saveStudyToLocal,
  getTCIAStudyDetails,
  getSavedTCIAStudies,
  deleteSavedStudy,
  deleteRadiologyReport
} from '@/actions/radiology'
import { CreateStudyDialog } from '@/components/modules/radiology'
import { ViewReportDialog } from '@/components/modules/radiology'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CornerstoneViewer } from '@/components/modules/radiology/CornerstoneViewer'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Internal component for Saved Studies
function SavedStudiesSection({ onView }: { onView: (study: any) => void }) {
  const [savedStudies, setSavedStudies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [studyToDelete, setStudyToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadSavedStudies()
  }, [])

  const loadSavedStudies = async () => {
    const data = await getSavedTCIAStudies()
    setSavedStudies(data)
    setLoading(false)
  }

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setStudyToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!studyToDelete) return

    toast.loading('Removing case...')
    const result = await deleteSavedStudy(studyToDelete)
    if (result.success) {
      toast.dismiss()
      toast.success('Case removed from library')
      loadSavedStudies()
    } else {
      toast.dismiss()
      toast.error('Failed to remove case')
    }
    setDeleteDialogOpen(false)
    setStudyToDelete(null)
  }

  if (loading) return <div className="py-4 text-center text-muted-foreground">Loading saved library...</div>

  if (savedStudies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Reference Cases</CardTitle>
          <CardDescription>Your personal bookmark library</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No studies saved yet
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Saved Reference Cases ({savedStudies.length})</CardTitle>
          <CardDescription>Your personal bookmark library</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {savedStudies.map((study) => (
              <Card key={study.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{study.modality}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(study.study_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium truncate" title={study.title}>
                      {study.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      UID: ...{study.series_uid.slice(-8)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => onView(study)}>
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="destructive" className="px-3" onClick={(e) => confirmDelete(study.id, e)} title="Remove from Library">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Saved Case</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this case from your library? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Case</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface RadiologyDashboardProps {
  isAdmin: boolean
  currentUserId: string
  userFullName: string
}

export function RadiologyDashboard({ isAdmin, currentUserId, userFullName }: RadiologyDashboardProps) {
  const [reports, setReports] = useState<RadiologyReport[]>([])
  const [filteredReports, setFilteredReports] = useState<RadiologyReport[]>([])
  const [stats, setStats] = useState<any>(null)

  // Workstation Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [modalityFilter, setModalityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewReportDialogOpen, setViewReportDialogOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<RadiologyReport | null>(null)
  const [loading, setLoading] = useState(true)

  // TCIA State
  const [collections, setCollections] = useState<string[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [tciaStudies, setTciaStudies] = useState<any[]>([])
  const [loadingTcia, setLoadingTcia] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImage, setViewerImage] = useState<string | null>(null)
  const [viewerTitle, setViewerTitle] = useState('')

  // Delete Report State
  const [deleteReportDialogOpen, setDeleteReportDialogOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<string | null>(null)

  // Fetch initial data
  useEffect(() => {
    loadData()
    loadCollections()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [reportsResult, statsResult] = await Promise.all([
      getRadiologyReports(),
      getRadiologyStats(),
    ])

    if (reportsResult.success) {
      setReports(reportsResult.data)
      setFilteredReports(reportsResult.data)
    }

    if (statsResult.success) {
      setStats(statsResult.data)
    }

    setLoading(false)
  }

  const loadCollections = async () => {
    const result = await browsePublicCollections()
    if (result.success && result.data) {
      setCollections(result.data)
    }
  }

  const handleCollectionSelect = async (collection: string) => {
    setSelectedCollection(collection)
    setLoadingTcia(true)
    const result = await searchTCIAStudies(collection)
    if (result.success && result.data) {
      setTciaStudies(result.data)
    } else {
      toast.error('Failed to load studies for this collection')
    }
    setLoadingTcia(false)
  }

  const handleSaveToLibrary = async (study: any) => {
    toast.promise(saveStudyToLocal(study), {
      loading: 'Saving to library...',
      success: 'Study saved successfully',
      error: 'Failed to save study'
    })
  }

  const handleViewTCIA = async (study: any) => {
    setLoadingTcia(true)
    const details = await getTCIAStudyDetails(study.StudyInstanceUID)
    setLoadingTcia(false)

    if (details.success && details.data?.previewUrl) {
      setViewerImage(details.data.previewUrl)
      setViewerTitle(study.StudyDescription || 'Unknown Study')
      setViewerOpen(true)
    } else {
      toast.error('Unable to load image for this study')
    }
  }

  // Filter reports
  useEffect(() => {
    let filtered = [...reports]
    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.study_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.patient?.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.patient?.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.modality.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    if (modalityFilter !== 'all') {
      filtered = filtered.filter((r) => r.modality === modalityFilter)
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter)
    }
    setFilteredReports(filtered)
  }, [searchQuery, modalityFilter, statusFilter, reports])

  const handleDeleteReport = async () => {
    if (!reportToDelete) return

    toast.loading('Deleting radiology report...')
    const result = await deleteRadiologyReport(reportToDelete)

    toast.dismiss()
    if (result.success) {
      toast.success('Report deleted successfully')
      loadData() // Refresh data
    } else {
      toast.error(result.error)
    }
    setDeleteReportDialogOpen(false)
    setReportToDelete(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
      case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'FINALIZED': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
      case 'CANCELLED': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case 'XRAY': return <Bone className="h-4 w-4" />
      case 'MRI': return <Brain className="h-4 w-4" />
      case 'CT': return <Scan className="h-4 w-4" />
      case 'ULTRASOUND': return <Heart className="h-4 w-4" />
      default: return <ActivitySquare className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <ActivitySquare className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading imaging workstation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <ActivitySquare className="h-8 w-8 text-primary" />
                Radiology & Imaging
              </h1>
              <p className="text-muted-foreground mt-1">
                Medical imaging workstation - {userFullName}
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Study
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Studies</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats?.pending || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats?.inProgress || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Finalized</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats?.finalized || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="reference" className="space-y-6">
          <TabsList>
            <TabsTrigger value="reference" className="gap-2">
              <Database className="h-4 w-4" />
              TCIA Reference Library
            </TabsTrigger>
            <TabsTrigger value="workstation" className="gap-2">
              <ActivitySquare className="h-4 w-4" />
              Clinical Workstation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workstation">
            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Studies Explorer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by patient name, study title, or modality..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={modalityFilter} onValueChange={setModalityFilter}>
                    <SelectTrigger className="w-45">
                      <SelectValue placeholder="Modality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modalities</SelectItem>
                      <SelectItem value="XRAY">X-Ray</SelectItem>
                      <SelectItem value="MRI">MRI</SelectItem>
                      <SelectItem value="CT">CT Scan</SelectItem>
                      <SelectItem value="ULTRASOUND">Ultrasound</SelectItem>
                      <SelectItem value="MAMMOGRAPHY">Mammography</SelectItem>
                      <SelectItem value="PET">PET Scan</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-45">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="FINALIZED">Finalized</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Studies Table */}
            <Card>
              <CardHeader>
                <CardTitle>Imaging Studies</CardTitle>
                <CardDescription>
                  {filteredReports.length} {filteredReports.length === 1 ? 'study' : 'studies'} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Modality</TableHead>
                        <TableHead>Study Title</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No imaging studies found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>
                              {new Date(report.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              {report.patient
                                ? `${report.patient.first_name} ${report.patient.last_name}`
                                : 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getModalityIcon(report.modality)}
                                <span>{report.modality}</span>
                              </div>
                            </TableCell>
                            <TableCell>{report.study_title}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {report.doctor?.full_name || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getStatusColor(report.status)}>
                                {report.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedReport(report)
                                    setViewReportDialogOpen(true)
                                  }}
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      setReportToDelete(report.id)
                                      setDeleteReportDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reference">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Collections Sidebar */}
              <Card className="md:col-span-1 h-[700px] flex flex-col">
                <CardHeader>
                  <CardTitle>Collections</CardTitle>
                  <CardDescription>Public Datasets</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full px-4">
                    <div className="space-y-2 pb-4">
                      {collections.map(collection => (
                        <Button
                          key={collection}
                          variant={selectedCollection === collection ? 'secondary' : 'ghost'}
                          className="w-full justify-start text-sm"
                          onClick={() => handleCollectionSelect(collection)}
                        >
                          <Database className="h-3 w-3 mr-2" />
                          {collection}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>


              {/* Results Grid */}
              <Card className="md:col-span-3 h-[700px] flex flex-col">
                <CardHeader>
                  <CardTitle>
                    {selectedCollection ? `${selectedCollection} Studies` : 'Select a Collection'}
                  </CardTitle>
                  <CardDescription>
                    {tciaStudies.length} studies available
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-4">
                  {loadingTcia ? (
                    <div className="flex h-full items-center justify-center">
                      <ActivitySquare className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : !selectedCollection ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground flex-col gap-2">
                      <Database className="h-12 w-12 opacity-20" />
                      <p>Select a collection to browse cases</p>
                    </div>
                  ) : tciaStudies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No studies found in this collection
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tciaStudies.map((study) => (
                        <Card key={study.StudyInstanceUID} className="overflow-hidden hover:shadow-md transition-shadow">
                          <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">{study.Modality || 'Unknown'}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {study.StudyDate ? new Date(study.StudyDate).toLocaleDateString() : 'No Date'}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-medium truncate" title={study.StudyDescription}>
                                {study.StudyDescription || 'Untitled Study'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Patient: {study.PatientId || study.PatientID}
                              </p>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button size="sm" variant="outline" className="flex-1" onClick={() => handleViewTCIA(study)}>
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleSaveToLibrary(study)}>
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-8">
              <SavedStudiesSection
                onView={(study) => handleViewTCIA({
                  StudyInstanceUID: study.series_uid,
                  StudyDescription: study.title,
                  Modality: study.modality
                })}
              />
            </div>
          </TabsContent>
        </Tabs>

      </div>

      {/* Dialogs */}
      <CreateStudyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadData}
        currentUserId={currentUserId}
      />

      {/* Viewer Modal */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>{viewerTitle}</DialogTitle>
            <DialogDescription>TCIA DICOM Viewer</DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-black overflow-hidden relative">
            {viewerImage ? (
              <CornerstoneViewer imageUrl={viewerImage} className="w-full h-full" />
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                No Image Available
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedReport && (
        <ViewReportDialog
          open={viewReportDialogOpen}
          onOpenChange={setViewReportDialogOpen}
          report={selectedReport}
          onUpdate={loadData}
          isAdmin={isAdmin}
        />
      )}

      <AlertDialog open={deleteReportDialogOpen} onOpenChange={setDeleteReportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Radiology Report?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This will permanently remove the study record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReport} className="bg-destructive hover:bg-destructive/90">
              Delete Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
