/**
 * TCIA (The Cancer Imaging Archive) Public API Client
 * Base URL: https://services.cancerimagingarchive.net/nbia-api/services/v1
 * Docs: https://wiki.cancerimagingarchive.net/display/Public/NBIA-REST+API+Guide
 */

const TCIA_BASE_URL = 'https://services.cancerimagingarchive.net/nbia-api/services/v1'

export interface TCIACollection {
    Collection: string
}

export interface TCIAPatient {
    PatientId: string
    PatientName: string
    PatientSex: string
    Collection: string
}

export interface TCIAStudy {
    StudyInstanceUID: string
    StudyDate: string
    StudyDescription: string
    AdmittingDiagnosesDescription?: string
    PatientAge?: string
    SeriesCount?: number
    Collection: string
    PatientID: string
}

export interface TCIASeries {
    SeriesInstanceUID: string
    Modality: string
    SeriesDescription: string
    BodyPartExamined: string
    SeriesNumber: number
    ImageCount: number
}

export interface TCIAImage {
    SOPInstanceUID: string
}

/**
 * Fetch helper for TCIA API with timeout and retries
 */
async function fetchTCIA(endpoint: string, retries = 3): Promise<any> {
    const url = `${TCIA_BASE_URL}${endpoint}`
    // console.log(`Fetching TCIA: ${url}`) // Reduced log spam

    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController()
            // 60s timeout for slow TCIA API
            const timeoutId = setTimeout(() => controller.abort(), 60000)

            const res = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'HIS-Core-Medical-System/1.0',
                    'Accept': 'application/json',
                    'Connection': 'keep-alive'
                }
            })

            clearTimeout(timeoutId)

            if (!res.ok) {
                // If 404, just return empty (not an error for lists)
                if (res.status === 404) return []
                throw new Error(`TCIA API Error: ${res.status} ${res.statusText}`)
            }

            // Verify content type is json
            const contentType = res.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
                return await res.json()
            }
            // Sometimes TCIA returns empty body for empty results
            const text = await res.text()
            return text ? JSON.parse(text) : []

        } catch (error: any) {
            console.warn(`TCIA Fetch Attempt ${i + 1} failed: ${error.message}`)
            if (i === retries - 1) {
                console.error('All TCIA fetch attempts failed.')
                // return [] // Return empty array to default to "no data" instead of crashing
                // better to return generic error to UI if all fail, but for list endpoints [] is safer
                return []
            }
            // Wait 1s before retry
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }
    return []
}

/**
 * Get all available collections
 * Method: getCollectionValues
 */
export async function getCollections(): Promise<TCIACollection[]> {
    return await fetchTCIA('/getCollectionValues?format=json')
}

/**
 * Get patients in a collection
 * Method: getPatient
 */
export async function getPatients(collection: string): Promise<TCIAPatient[]> {
    const encodedCollection = encodeURIComponent(collection)
    return await fetchTCIA(`/getPatient?Collection=${encodedCollection}&format=json`)
}

/**
 * Get studies for a patient (and optionally collection)
 * Method: getPatientStudy
 */
export async function getStudies(patientId: string, collection?: string): Promise<TCIAStudy[]> {
    let endpoint = `/getPatientStudy?PatientID=${encodeURIComponent(patientId)}&format=json`
    if (collection) {
        endpoint += `&Collection=${encodeURIComponent(collection)}`
    }
    return await fetchTCIA(endpoint)
}

/**
 * Get series for a study
 * Method: getSeries
 */
export async function getSeries(studyInstanceUid: string): Promise<TCIASeries[]> {
    return await fetchTCIA(`/getSeries?StudyInstanceUID=${encodeURIComponent(studyInstanceUid)}&format=json`)
}

/**
 * Get images for a series
 * Method: getSOPInstanceUIDs
 */
export async function getImages(seriesInstanceUid: string): Promise<TCIAImage[]> {
    return await fetchTCIA(`/getSOPInstanceUIDs?SeriesInstanceUID=${encodeURIComponent(seriesInstanceUid)}&format=json`)
}

/**
 * Helper to construct the Single Image URL (WADO-like)
 * Method: getSingleImage
 */
export function getDicomUrl(seriesUid: string, instanceUid: string): string {
    return `${TCIA_BASE_URL}/getSingleImage?SeriesInstanceUID=${seriesUid}&SOPInstanceUID=${instanceUid}`
}
