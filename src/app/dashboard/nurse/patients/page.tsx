export default function NursePatientsPage() {
    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">My Patients</h1>
            <p className="text-muted-foreground">View and manage assigned patients</p>
            <div className="mt-8 p-8 border rounded-lg bg-muted/50">
                <p className="text-center text-lg">Patient List Component</p>
                <p className="text-center text-sm text-muted-foreground mt-2">
                    This feature shows the list of patients assigned to the nurse for care management.
                </p>
            </div>
        </div>
    )
}
