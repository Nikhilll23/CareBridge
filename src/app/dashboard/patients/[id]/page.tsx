import { currentUser } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPatientById, getNearbyAmbulances, getPatientClinicalData, getPatientDocuments } from '@/actions/patients'
import { PatientMap } from '@/components/shared/PatientMap'
import { ClinicalHistory } from '@/components/modules/patients/ClinicalHistory'
import { MedicalDocuments } from '@/components/modules/patients/MedicalDocuments'
import { ClinicalAssistant } from '@/components/modules/ai'
import { PatientProfileActions } from '@/components/modules/patients/PatientProfileActions'
import { AlertBanner } from '@/components/modules/patients/AlertBanner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Calendar,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  Navigation,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PatientProfilePage({ params }: PageProps) {
  const { id } = await params
  const user = await currentUser()
  const patient = await getPatientById(id)

  if (!patient) {
    notFound()
  }

  // Calculate age
  const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()

  // Get nearby ambulances
  const ambulances = await getNearbyAmbulances(
    patient.coordinates.lat,
    patient.coordinates.lng
  )

  // Fetch clinical data from Metriport FHIR API
  const clinicalData = await getPatientClinicalData(patient.metriport_id)

  // Fetch medical documents from Metriport
  const FACILITY_ID = process.env.METRIPORT_FACILITY_ID || ''
  const documents = await getPatientDocuments(patient.metriport_id, FACILITY_ID)

  // Filter available ambulances
  const availableAmbulances = ambulances.filter((amb) => amb.status === 'available')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/patients">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {patient.first_name} {patient.last_name}
              </h1>
              {patient.metriport_id && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  HIE Synced
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {age} years • {patient.gender} • Patient ID: {patient.id.slice(0, 8)}
            </p>
          </div>
        </div>

        <PatientProfileActions
          patientId={patient.id}
          metriportId={patient.metriport_id}
        />
      </div>

      <AlertBanner patientId={patient.id} currentUserId={user?.id || 'sys'} />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clinical">Clinical History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="location">Location & Transport</TabsTrigger>
          <TabsTrigger value="ai">AI Assistant</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Vitals Cards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Heart Rate</CardTitle>
                <Heart className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{patient.vitals.heartRate} bpm</div>
                <p className="text-xs text-muted-foreground mt-1">Normal range</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Blood Pressure</CardTitle>
                <Activity className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{patient.vitals.bloodPressure}</div>
                <p className="text-xs text-muted-foreground mt-1">mmHg</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Temperature</CardTitle>
                <Thermometer className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{patient.vitals.temperature}°C</div>
                <p className="text-xs text-muted-foreground mt-1">Normal</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Respiratory Rate</CardTitle>
                <Wind className="h-4 w-4 text-teal-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{patient.vitals.respiratoryRate}/min</div>
                <p className="text-xs text-muted-foreground mt-1">Breaths per minute</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Oxygen Saturation</CardTitle>
                <Droplets className="h-4 w-4 text-cyan-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{patient.vitals.oxygenSaturation}%</div>
                <p className="text-xs text-muted-foreground mt-1">SpO2 level</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
                <Clock className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5 min</div>
                <p className="text-xs text-muted-foreground mt-1">ago</p>
              </CardContent>
            </Card>
          </div>

          {/* Patient Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
                <CardDescription>Basic demographic details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Date of Birth</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(patient.date_of_birth).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Contact Number</p>
                    <p className="text-sm text-muted-foreground">{patient.contact_number}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">{patient.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Allergies & Conditions</CardTitle>
                <CardDescription>Medical alerts and warnings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <Badge variant="destructive">Penicillin Allergy</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <Badge variant="secondary">Type 2 Diabetes</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <Badge variant="outline">Hypertension</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Last updated: {new Date(patient.updated_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Metriport Sync Status */}
          {patient.metriport_id && (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Health Information Exchange
                </CardTitle>
                <CardDescription>
                  This patient is synced with the Metriport Health Exchange Network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Metriport ID:</span>
                    <span className="font-mono text-xs">{patient.metriport_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="default" className="bg-green-600">
                      Active
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data Sources:</span>
                    <span>Connected</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Clinical History Tab */}
        <TabsContent value="clinical" className="space-y-4">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Clinical History</h2>
            <p className="text-muted-foreground mt-1">
              Medical data from Health Information Exchange Network (Metriport)
            </p>
          </div>

          {patient.metriport_id ? (
            <ClinicalHistory
              allergies={clinicalData.allergies}
              medications={clinicalData.medications}
              conditions={clinicalData.conditions}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Clinical History Not Available</CardTitle>
                <CardDescription>Patient not synced with Health Information Exchange</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">HIE Sync Required</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    This patient needs to be synced with the Health Information Exchange network
                    to access clinical history data.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Medical Documents</h2>
            <p className="text-muted-foreground mt-1">
              Documents from external health providers and networks
            </p>
          </div>

          {patient.metriport_id ? (
            <MedicalDocuments documents={documents} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Documents Not Available</CardTitle>
                <CardDescription>Patient not synced with Health Information Exchange</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">HIE Sync Required</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    This patient needs to be synced with the Health Information Exchange network
                    to access medical documents.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Location & Transport Tab */}
        <TabsContent value="location" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Ambulance List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-primary" />
                  Nearby Ambulances
                </CardTitle>
                <CardDescription>
                  {availableAmbulances.length} available out of {ambulances.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ambulances.slice(0, 5).map((ambulance) => (
                    <div
                      key={ambulance.id}
                      className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium">{ambulance.name}</p>
                          <Badge
                            variant={
                              ambulance.status === 'available'
                                ? 'default'
                                : ambulance.status === 'busy'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className={
                              ambulance.status === 'available'
                                ? 'bg-green-600'
                                : ambulance.status === 'busy'
                                  ? 'bg-orange-600'
                                  : ''
                            }
                          >
                            {ambulance.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Distance: {ambulance.distance} km
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ETA: ~{Math.ceil(ambulance.distance * 3)} min
                        </p>
                      </div>
                      {ambulance.status === 'available' && (
                        <Button size="sm" variant="outline" className="ml-2">
                          Request
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Map */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Live Location Map</CardTitle>
                  <CardDescription>
                    Real-time tracking of patient and nearby ambulances
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PatientMap
                    patientLat={patient.coordinates.lat}
                    patientLng={patient.coordinates.lng}
                    patientName={`${patient.first_name} ${patient.last_name}`}
                    ambulances={ambulances}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="ai" className="space-y-4">
          <div className="h-[calc(100vh-300px)]">
            <ClinicalAssistant
              patientId={patient.id}
              patientName={`${patient.first_name} ${patient.last_name}`}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
