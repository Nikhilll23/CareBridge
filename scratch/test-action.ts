
import { getPatientPortalData } from '../src/actions/patient-portal.js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function testAction() {
    console.log('Testing getPatientPortalData action...')
    try {
        const result = await getPatientPortalData()
        console.log('Result:', JSON.stringify(result, null, 2))
    } catch (e) {
        console.error('Action failed:', e)
    }
}

testAction()
