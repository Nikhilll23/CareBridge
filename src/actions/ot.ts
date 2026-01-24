'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// --- Types ---
export interface SurgeryData {
    patientId: string
    theaterId: string
    procedureName: string
    startTime: string // ISO
    endTime: string // ISO
    surgeonName: string
    anaesthetistName: string
    nurseName: string
}

// --- Scheduling ---
export async function scheduleSurgery(data: SurgeryData) {
    // 1. Conflict Check (Overlap)
    const { data: conflicts } = await supabaseAdmin.from('surgeries')
        .select('id')
        .eq('theater_id', data.theaterId)
        .or(`and(scheduled_start.lte.${data.endTime},scheduled_end.gte.${data.startTime})`)
        .neq('status', 'CANCELLED')

    if (conflicts && conflicts.length > 0) {
        return { success: false, error: 'Theater is already booked for this time slot.' }
    }

    // 2. Create Surgery
    const { error } = await supabaseAdmin.from('surgeries').insert({
        patient_id: data.patientId,
        theater_id: data.theaterId,
        procedure_name: data.procedureName,
        scheduled_start: data.startTime,
        scheduled_end: data.endTime,
        team_mapping: {
            surgeon: data.surgeonName,
            anaesthetist: data.anaesthetistName,
            nurse: data.nurseName
        },
        status: 'SCHEDULED'
    })

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/ot')
    return { success: true }
}


import { currentUser } from '@clerk/nextjs/server'

export async function getSurgeries() {
    const user = await currentUser()
    if (!user) return []

    // 1. Get User Role & Details
    const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('role, first_name, last_name')
        .eq('id', user.id)
        .single()

    // 2. Base Query
    let query = supabaseAdmin
        .from('surgeries')
        .select(`
            *,
            patients (first_name, last_name),
            theaters (name)
        `)
        .order('scheduled_start', { ascending: true })

    // 3. Apply Filters
    if (dbUser?.role === 'PATIENT') {
        const userEmail = user.emailAddresses[0]?.emailAddress
        const { data: patient } = await supabaseAdmin.from('patients').select('id').eq('email', userEmail).single()
        if (patient) {
            query = query.eq('patient_id', patient.id)
        } else {
            return [] // Patient record not found
        }
    } else if (dbUser?.role === 'DOCTOR') {
        // Filter by name in team_mapping (JSONB)
        // team_mapping is { surgeon: "Name", anaesthetist: "Name" }
        const docName = `${dbUser.first_name} ${dbUser.last_name}`

        // Postgres JSONB containment or text search
        // We want OR logic: surgeon == name OR anaesthetist == name
        // This is tricky with simple Supabase filters.
        // We can use .or() with checking the raw JSON column
        // syntax: team_mapping->>surgeon.eq.Name
        query = query.or(`team_mapping->>surgeon.eq."${docName}",team_mapping->>anaesthetist.eq."${docName}"`)
    }
    // ADMIN and NURSE see all (no filter needed)

    const { data } = await query
    return data || []
}

export async function getTheaters() {
    const { data } = await supabaseAdmin.from('theaters').select('*')
    return data || []
}

export async function getOTSchedulingResources() {
    const user = await currentUser()
    let userRole = 'PATIENT' // Default safer

    if (user) {
        const { data: u } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
        if (u) userRole = u.role
    }

    // Fetch Doctors (surgeons/anaesthetists)
    const { data: doctors } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, role')
        .eq('role', 'DOCTOR')

    // Fetch Patients (for dropdown)
    const { data: patients } = await supabaseAdmin
        .from('patients')
        .select('id, first_name, last_name, uhid')
        .order('created_at', { ascending: false })
        .limit(50) // Limit to recent 50 for performance, searchable better via detailed query if needed

    return {
        doctors: doctors?.map(d => ({
            id: d.id,
            name: `${d.first_name} ${d.last_name}`
        })) || [],
        patients: patients || [],
        userRole
    }
}

// --- WHO Safety Checklist ---
export async function updateChecklist(surgeryId: string, stage: string, checks: any, user: string) {
    await supabaseAdmin.from('surgical_checklists').insert({
        surgery_id: surgeryId,
        stage,
        checks_passed: checks,
        verified_by: user
    })

    // Safety Gate: If SIGN_IN is done, we can move to IN-PROGRESS
    if (stage === 'SIGN_IN') {
        await supabaseAdmin.from('surgeries').update({ status: 'IN-PROGRESS' }).eq('id', surgeryId)
    }

    revalidatePath('/dashboard/ot')
    return { success: true }
}

export async function getChecklistStatus(surgeryId: string) {
    const { data } = await supabaseAdmin
        .from('surgical_checklists')
        .select('stage, checks_passed')
        .eq('surgery_id', surgeryId)
    return data || []
}

// --- Consumption & Billing ---
// --- Consumption & Billing ---
export async function logConsumption(surgeryId: string, item: { name: string, batch: string, qty: number, cost: number }) {
    try {
        // 1. Log Item (Inventory Tracking)
        await supabaseAdmin.from('ot_consumables').insert({
            surgery_id: surgeryId,
            item_name: item.name,
            batch_no: item.batch,
            quantity: item.qty,
            cost: item.cost
        })

        // 2. Add to Invoice (Real Billing Link)
        // Fetch patient ID from surgery
        const { data: surgery } = await supabaseAdmin.from('surgeries').select('patient_id').eq('id', surgeryId).single()

        if (surgery && surgery.patient_id) {
            // Find or Create Active Invoice
            let invoiceId
            const { data: activeInvoice } = await supabaseAdmin
                .from('invoices')
                .select('id')
                .eq('patient_id', surgery.patient_id)
                .eq('status', 'PENDING')
                .single()

            if (activeInvoice) {
                invoiceId = activeInvoice.id
            } else {
                // Create new invoice
                const { data: newInv } = await supabaseAdmin
                    .from('invoices')
                    .insert({
                        patient_id: surgery.patient_id,
                        status: 'PENDING',
                        amount: 0
                    })
                    .select()
                    .single()
                invoiceId = newInv.id
            }

            // Insert Invoice Item
            await supabaseAdmin.from('invoice_items').insert({
                invoice_id: invoiceId,
                description: `OT Consumable: ${item.name} (Batch: ${item.batch})`,
                quantity: item.qty,
                unit_price: item.cost
            })

            // RPC to update total if exists, or ignore
            const { error: rpcError } = await supabaseAdmin.rpc('increment_invoice_total', { inv_id: invoiceId, amount: item.cost * item.qty })
            if (rpcError) console.warn('RPC warning:', rpcError)
        }

        revalidatePath('/dashboard/ot')
        return { success: true }
    } catch (error: any) {
        console.error('Billing Error:', error)
        return { success: false, error: 'Failed to bill item' }
    }
}

export async function getConsumables(surgeryId: string) {
    const { data } = await supabaseAdmin.from('ot_consumables').select('*').eq('surgery_id', surgeryId)
    return data || []
}

// --- Clinical Notes ---
export async function saveClinicalNotes(surgeryId: string, field: 'pre_op' | 'intra_op' | 'post_op' | 'anaesthesia', content: string) {
    const map = {
        'pre_op': 'pre_op_assessment',
        'intra_op': 'intra_op_notes',
        'post_op': 'post_op_orders',
        'anaesthesia': 'anaesthesia_record'
    }

    await supabaseAdmin
        .from('surgeries')
        .update({ [map[field]]: content })
        .eq('id', surgeryId)

    revalidatePath('/dashboard/ot')
}
