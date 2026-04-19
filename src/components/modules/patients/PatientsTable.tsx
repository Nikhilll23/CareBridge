'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Patient } from '@/types'
import { format } from 'date-fns'
import { Eye, Search, UserCircle, Trash2, RefreshCw, Pencil, Ambulance } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { deletePatient, syncPatientToHIE, registerEmergencyPatient } from '@/actions/patients'
import { EditPatientDialog } from './EditPatientDialog'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface PatientsTableProps {
  patients: Patient[]
  userRole?: string
}

export function PatientsTable({ patients, userRole }: PatientsTableProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Safe Date Formatter
  const safeFormatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'N/A'
    return format(d, 'MMM dd, yyyy')
  }

  // Calculate age from date of birth
  const calculateAge = (dob: string | null | undefined) => {
    if (!dob) return 0
    const today = new Date()
    const birthDate = new Date(dob)
    if (isNaN(birthDate.getTime())) return 0
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  // Filter patients based on search query
  const filteredPatients = patients.filter(patient =>
    `${patient.first_name} ${patient.last_name}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
    patient.contact_number.includes(searchQuery)
  )

  const handleEmergencyReg = async () => {
    const toastId = toast.loading('Creating Emergency ID...')
    try {
      // Defaults to Male/30 for 1-click speed. 
      // In a real app, a mini-modal asking Gender is better, but user asked for "1-click" speed implies defaults.
      // Better: Randomize or cycle? No, just default.
      const res = await registerEmergencyPatient('Male', 30)
      if (res.success) {
        toast.success(`Created: ${res.data.uhid}`, { id: toastId })
      } else {
        toast.error(res.error, { id: toastId })
      }
    } catch (e) {
      toast.error('Failed', { id: toastId })
    }
  }

  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <UserCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Patients Registered
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          Get started by adding your first patient to the registry.
        </p>
        <Button variant="destructive" onClick={handleEmergencyReg}>
          <Ambulance className="mr-2 h-4 w-4" />
          Emergency Registration
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Search Bar & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patients by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {userRole !== 'DOCTOR' && (
          <Button variant="destructive" onClick={handleEmergencyReg} className="shadow-red-200 shadow-lg">
            <Ambulance className="mr-2 h-4 w-4" />
            Rapid Emergency Reg
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Patient Name
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Age
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Gender
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Registered
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                CB Status
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map((patient) => (
              <tr
                key={patient.id}
                className="border-b border-border transition-colors hover:bg-accent/50"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {patient.first_name[0]}{patient.last_name[0]}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {patient.first_name} {patient.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        DOB: {safeFormatDate(patient.date_of_birth)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-foreground">
                  {calculateAge(patient.date_of_birth)} years
                </td>
                <td className="px-4 py-4 text-sm text-foreground">
                  {patient.gender}
                </td>
                <td className="px-4 py-4 text-sm text-foreground">
                  {patient.contact_number}
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {safeFormatDate(patient.created_at)}
                </td>
                <td className="px-4 py-4">
                  {patient.metriport_id ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-600"></span>
                      Synced
                    </span>
                  ) : (
                    <button
                      suppressHydrationWarning
                      onClick={async () => {
                        const toastId = toast.loading('Syncing with CB...')
                        try {
                          const res = await syncPatientToHIE(patient.id)
                          if (res.success) {
                            toast.success('Synced successfully', { id: toastId })
                          } else {
                            toast.error(res.error || 'Sync failed', { id: toastId })
                          }
                        } catch (err) {
                          toast.error('Sync failed', { id: toastId })
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-200 transition-colors"
                    >
                      <RefreshCw className="h-3 w-3 animate-spin duration-3000" />
                      Sync Now
                    </button>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <EditPatientDialog patient={patient}>
                      <button suppressHydrationWarning className="inline-flex items-center gap-1 rounded-md bg-secondary/50 px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary">
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                    </EditPatientDialog>

                    <Link href={`/dashboard/patients/${patient.id}`}>
                      <button suppressHydrationWarning className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
                        <Eye className="h-3 w-3" />
                        View
                      </button>
                    </Link>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button suppressHydrationWarning className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Patient Record?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the record for
                            <span className="font-medium text-foreground"> {patient.first_name} {patient.last_name} </span>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              const res = await deletePatient(patient.id)
                              if (res.success) toast.success('Patient deleted')
                              else toast.error('Failed to delete patient')
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {
        filteredPatients.length === 0 && searchQuery && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No patients found matching &quot;{searchQuery}&quot;
          </div>
        )
      }
    </div >
  )
}
