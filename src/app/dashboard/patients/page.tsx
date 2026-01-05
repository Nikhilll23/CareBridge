import { getPatients } from '@/actions/patients'
import { PatientsTable, AddPatientDialog } from '@/components/modules/patients'
import { UserPlus, Users } from 'lucide-react'

export default async function PatientsPage() {
  const patients = await getPatients()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Patient Registry
          </h1>
          <p className="text-muted-foreground">
            Manage patient records and demographics
          </p>
        </div>
        
        {/* Add New Patient Button */}
        <AddPatientDialog>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
            <UserPlus className="h-4 w-4" />
            Add New Patient
          </button>
        </AddPatientDialog>
      </div>

      {/* Patient Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Total Patients</div>
          <div className="mt-2 text-2xl font-bold text-foreground">{patients.length}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Synced with HIE</div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {patients.filter(p => p.metriport_id).length}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Registered Today</div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {patients.filter(p => {
              const today = new Date().toDateString()
              return new Date(p.created_at).toDateString() === today
            }).length}
          </div>
        </div>
      </div>

      {/* Patients Data Table */}
      <div className="rounded-lg border border-border bg-card">
        <PatientsTable patients={patients} />
      </div>
    </div>
  )
}
