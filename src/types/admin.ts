export type AuditLog = {
    id: string
    user_id: string | null
    action: string
    entity: string
    entity_id: string | null
    details: Record<string, any>
    created_at: string
}

export type InsuranceClaim = {
    id: string
    patient_id: string
    provider_name: string
    policy_number: string
    diagnosis_code: string | null
    treatment_description: string | null
    amount_claimed: number
    approved_amount: number | null
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO_REQUIRED'
    submission_date: string
    last_updated: string
    notes: string | null
}

export type ShiftType = 'MORNING' | 'EVENING' | 'NIGHT' | 'ON_CALL'
export type RosterEntry = {
    id: string
    staff_id: string
    shift_date: string
    shift_type: ShiftType
    department: string
    status: string
    created_at: string
}

export type AmbulanceStatus = 'AVAILABLE' | 'BUSY' | 'MAINTENANCE' | 'OFFLINE'
export type Ambulance = {
    id: string
    vehicle_number: string
    driver_name: string | null
    driver_contact: string | null
    status: AmbulanceStatus
    current_lat: number | null
    current_lng: number | null
    last_updated: string
}
