'use client'

import { AlertTriangle, Activity, Pill, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ClinicalHistoryProps {
  allergies: Array<{
    id: string
    substance: string
    criticality: string
    reaction: string
  }>
  medications: Array<{
    id: string
    medication: string
    status: string
    dosage: string
  }>
  conditions: Array<{
    id: string
    condition: string
    clinicalStatus: string
    onsetDate: string
  }>
}

export function ClinicalHistory({ allergies, medications, conditions }: ClinicalHistoryProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Allergies Section - Red Accent */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-lg">Allergies & Intolerances</CardTitle>
          </div>
          <CardDescription>Known allergic reactions</CardDescription>
        </CardHeader>
        <CardContent>
          {allergies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No records found in Health Network</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allergies.map((allergy) => (
                <div key={allergy.id} className="border-l-2 border-red-200 pl-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{allergy.substance}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {allergy.reaction}
                      </p>
                    </div>
                    <Badge
                      variant={
                        allergy.criticality === 'high'
                          ? 'destructive'
                          : allergy.criticality === 'low'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="text-xs shrink-0"
                    >
                      {allergy.criticality}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Conditions Section - Blue Accent */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Active Conditions</CardTitle>
          </div>
          <CardDescription>Current health conditions</CardDescription>
        </CardHeader>
        <CardContent>
          {conditions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No records found in Health Network</p>
            </div>
          ) : (
            <div className="space-y-4">
              {conditions.map((condition) => (
                <div key={condition.id} className="border-l-2 border-blue-200 pl-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{condition.condition}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Onset: {new Date(condition.onsetDate).toLocaleDateString() || 'Unknown'}
                      </p>
                    </div>
                    <Badge
                      variant={
                        condition.clinicalStatus === 'active'
                          ? 'default'
                          : condition.clinicalStatus === 'resolved'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="text-xs shrink-0"
                    >
                      {condition.clinicalStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medications Section - Green Accent */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg">Medications</CardTitle>
          </div>
          <CardDescription>Current prescriptions</CardDescription>
        </CardHeader>
        <CardContent>
          {medications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No records found in Health Network</p>
            </div>
          ) : (
            <div className="space-y-4">
              {medications.map((medication) => (
                <div key={medication.id} className="border-l-2 border-green-200 pl-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{medication.medication}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {medication.dosage}
                      </p>
                    </div>
                    <Badge
                      variant={
                        medication.status === 'active'
                          ? 'default'
                          : medication.status === 'completed'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="text-xs shrink-0"
                    >
                      {medication.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
