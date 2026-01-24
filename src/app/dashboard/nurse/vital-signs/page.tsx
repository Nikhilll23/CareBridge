export default function NurseVitalSignsPage() {
    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Vital Signs</h1>
            <p className="text-muted-foreground">Record and monitor patient vital signs</p>
            <div className="mt-8 p-8 border rounded-lg bg-muted/50">
                <p className="text-center text-lg">Vital Signs Recorder Component</p>
                <p className="text-center text-sm text-muted-foreground mt-2">
                    This feature allows nurses to record patient vital signs including temperature, blood pressure, heart rate, respiratory rate, oxygen saturation, weight, height, and pain scale.
                </p>
            </div>
        </div>
    )
}
