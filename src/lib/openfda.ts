/**
 * OpenFDA API Integration
 * https://open.fda.gov/apis/
 * 
 * Complete implementation of Drug and Device endpoints
 */

const FDA_API_KEY = process.env.FDA_API_KEY || ''
const FDA_DRUG_BASE_URL = 'https://api.fda.gov/drug'
const FDA_DEVICE_BASE_URL = 'https://api.fda.gov/device'

export interface FDADrugLabel {
  id: string
  brand_name?: string[]
  generic_name?: string[]
  manufacturer_name?: string[]
  purpose?: string[]
  indications_and_usage?: string[]
  warnings?: string[]
  dosage_and_administration?: string[]
  adverse_reactions?: string[]
  active_ingredient?: string[]
  inactive_ingredient?: string[]
  product_ndc?: string[]
  route?: string[]
  package_ndc?: string[]
}

export interface FDASearchResult {
  meta: {
    disclaimer: string
    terms: string
    license: string
    last_updated: string
    results: {
      skip: number
      limit: number
      total: number
    }
  }
  results: FDADrugLabel[]
}

/**
 * Search drug label information from OpenFDA
 * @param query - Search query (drug name, NDC, ingredient)
 * @param limit - Number of results to return (default: 5)
 */
export async function searchDrugLabel(
  query: string,
  limit: number = 5
): Promise<FDASearchResult | null> {
  try {
    if (!query || query.length < 2) {
      throw new Error('Query must be at least 2 characters')
    }

    // Encode the search query
    const encodedQuery = encodeURIComponent(query)
    
    // Build the API URL - search in brand name, generic name, and substance name
    const url = `${FDA_DRUG_BASE_URL}/label.json?api_key=${FDA_API_KEY}&search=openfda.brand_name:"${encodedQuery}"+openfda.generic_name:"${encodedQuery}"+openfda.substance_name:"${encodedQuery}"&limit=${limit}`

    console.log('🔍 Searching FDA API:', url.replace(FDA_API_KEY, 'API_KEY'))

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.log('ℹ️ No FDA results found for:', query)
        return null
      }
      throw new Error(`FDA API error: ${response.status} ${response.statusText}`)
    }

    const data: FDASearchResult = await response.json()
    console.log('✅ FDA search successful:', data.results.length, 'results found')
    
    return data
  } catch (error) {
    console.error('❌ Error fetching FDA drug data:', error)
    return null
  }
}

/**
 * Search drug by NDC (National Drug Code)
 * @param ndc - National Drug Code
 */
export async function searchDrugByNDC(ndc: string): Promise<FDASearchResult | null> {
  try {
    if (!ndc) {
      throw new Error('NDC code is required')
    }

    // Remove dashes and spaces from NDC
    const cleanNDC = ndc.replace(/[-\s]/g, '')
    
    const url = `${FDA_DRUG_BASE_URL}/ndc.json?api_key=${FDA_API_KEY}&search=product_ndc:"${cleanNDC}"&limit=1`

    console.log('🔍 Searching FDA API by NDC:', cleanNDC)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.log('ℹ️ No FDA results found for NDC:', ndc)
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data: FDASearchResult = await response.json()
    console.log('✅ FDA NDC search successful')
    
    return data
  } catch (error) {
    console.error('❌ Error fetching FDA drug by NDC:', error)
    return null
  }
}

/**
 * Get drug adverse events (side effects)
 * @param drugName - Drug brand or generic name
 */
export async function getDrugAdverseEvents(drugName: string, limit: number = 10) {
  try {
    const encodedDrug = encodeURIComponent(drugName)
    const url = `https://api.fda.gov/drug/event.json?api_key=${FDA_API_KEY}&search=patient.drug.medicinalproduct:"${encodedDrug}"&limit=${limit}`

    console.log('🔍 Fetching adverse events for:', drugName)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Adverse events fetched successfully')
    
    return data
  } catch (error) {
    console.error('❌ Error fetching adverse events:', error)
    return null
  }
}

/**
 * Format FDA drug label for display
 */
export function formatDrugLabel(label: FDADrugLabel) {
  return {
    brandName: label.brand_name?.[0] || 'Unknown',
    genericName: label.generic_name?.[0] || label.active_ingredient?.[0] || 'Unknown',
    manufacturer: label.manufacturer_name?.[0] || 'Unknown',
    purpose: label.purpose?.[0] || 'Not specified',
    usage: label.indications_and_usage?.[0] || 'Not specified',
    warnings: label.warnings?.[0] || 'Not specified',
    dosage: label.dosage_and_administration?.[0] || 'Not specified',
    adverseReactions: label.adverse_reactions?.[0] || 'Not specified',
    route: label.route?.[0] || 'Not specified',
    ndc: label.product_ndc?.[0] || 'Unknown',
  }
}

// ==========================================
// ADDITIONAL DRUG ENDPOINTS (6 total)
// ==========================================

/**
 * 1. Drug Event - Search adverse reactions by specific reaction
 * Example: Search for drugs that cause headaches
 */
export async function searchDrugEventByReaction(reaction: string, limit: number = 5) {
  try {
    const encodedReaction = encodeURIComponent(reaction)
    const url = `https://api.fda.gov/drug/event.json?api_key=${FDA_API_KEY}&search=patient.reaction.reactionmeddrapt:"${encodedReaction}"&limit=${limit}`

    console.log('🔍 Searching drug adverse events for reaction:', reaction)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Drug event data fetched successfully')
    return data
  } catch (error) {
    console.error('❌ Error fetching drug events:', error)
    return null
  }
}

/**
 * 2. Drug Label - Search drug interactions
 * Example: Find drugs that interact with caffeine
 */
export async function searchDrugInteractions(substance: string, limit: number = 5) {
  try {
    const encodedSubstance = encodeURIComponent(substance)
    const url = `${FDA_DRUG_BASE_URL}/label.json?api_key=${FDA_API_KEY}&search=drug_interactions:"${encodedSubstance}"&limit=${limit}`

    console.log('🔍 Searching drug interactions for:', substance)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Drug interactions fetched successfully')
    return data
  } catch (error) {
    console.error('❌ Error fetching drug interactions:', error)
    return null
  }
}

/**
 * 3. Drug NDC - Search by DEA Schedule (controlled substances)
 * Schedules: CI (highest control) to CV (lowest control)
 */
export async function searchDrugByDEASchedule(schedule: string, limit: number = 5) {
  try {
    const url = `${FDA_DRUG_BASE_URL}/ndc.json?api_key=${FDA_API_KEY}&search=dea_schedule:"${schedule}"&limit=${limit}`

    console.log('🔍 Searching drugs by DEA schedule:', schedule)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ DEA schedule drugs fetched successfully')
    return data
  } catch (error) {
    console.error('❌ Error fetching DEA schedule drugs:', error)
    return null
  }
}

/**
 * 4. Drug Enforcement - Search by classification (recall severity)
 * Class I: Most serious, Class II: Moderate, Class III: Least serious
 */
export async function searchDrugEnforcementByClass(classification: string, limit: number = 5) {
  try {
    const url = `${FDA_DRUG_BASE_URL}/enforcement.json?api_key=${FDA_API_KEY}&search=classification:"${classification}"&limit=${limit}`

    console.log('🔍 Searching drug enforcement actions:', classification)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Drug enforcement data fetched successfully')
    return data
  } catch (error) {
    console.error('❌ Error fetching drug enforcement:', error)
    return null
  }
}

/**
 * 5. Drugs@FDA - Search by marketing status
 * Status: "Prescription", "Over-the-counter", "Discontinued"
 */
export async function searchDrugsByMarketingStatus(status: string, limit: number = 5) {
  try {
    const encodedStatus = encodeURIComponent(status)
    const url = `${FDA_DRUG_BASE_URL}/drugsfda.json?api_key=${FDA_API_KEY}&search=products.marketing_status:"${encodedStatus}"&limit=${limit}`

    console.log('🔍 Searching drugs by marketing status:', status)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Marketing status drugs fetched successfully')
    return data
  } catch (error) {
    console.error('❌ Error fetching marketing status:', error)
    return null
  }
}

/**
 * 6. Drug Shortages - Search by dosage form
 * Forms: "Tablet", "Capsule", "Injection", "Solution"
 */
export async function searchDrugShortagesByForm(dosageForm: string, limit: number = 5) {
  try {
    const encodedForm = encodeURIComponent(dosageForm)
    const url = `${FDA_DRUG_BASE_URL}/shortages.json?api_key=${FDA_API_KEY}&search=dosage_form:"${encodedForm}"&limit=${limit}`

    console.log('🔍 Searching drug shortages for dosage form:', dosageForm)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Drug shortages fetched successfully')
    return data
  } catch (error) {
    console.error('❌ Error fetching drug shortages:', error)
    return null
  }
}

// ==========================================
// DEVICE ENDPOINTS (10 total)
// ==========================================

/**
 * 1. Device PMA - Search by decision code
 * APPR: Approved, APWD: Approved with conditions, DENY: Denied
 */
export async function searchDevicePMAByDecision(decisionCode: string, limit: number = 5) {
  try {
    const url = `${FDA_DEVICE_BASE_URL}/pma.json?api_key=${FDA_API_KEY}&search=decision_code:"${decisionCode}"&limit=${limit}`

    console.log('🔍 Searching device PMA by decision code:', decisionCode)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Device PMA data fetched successfully')
    return data
  } catch (error) {
    console.error('❌ Error fetching device PMA:', error)
    return null
  }
}

/**
 * 2. Device Recall - Search by root cause description (exact match)
 */
export async function searchDeviceRecallByRootCause(rootCause: string, limit: number = 5) {
  try {
    const encodedCause = encodeURIComponent(rootCause)
    const url = `${FDA_DEVICE_BASE_URL}/recall.json?api_key=${FDA_API_KEY}&search=root_cause_description.exact:"${encodedCause}"&limit=${limit}`

    console.log('🔍 Searching device recalls by root cause:', rootCause)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Device recall data fetched successfully')
    return data
  } catch (error) {
    console.error('❌ Error fetching device recalls:', error)
    return null
  }
}

/**
 * 3. Device Registration & Listing - Search by product code
 */
export async function searchDeviceRegistrationByProductCode(productCode: string, limit: number = 5) {
  try {
    const url = `${FDA_DEVICE_BASE_URL}/registrationlisting.json?api_key=${FDA_API_KEY}&search=products.product_code:"${productCode}"&limit=${limit}`

    console.log('🔍 Searching device registrations by product code:', productCode)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Device registration data fetched successfully')
    return data
  } catch (error) {
    console.error('❌ Error fetching device registrations:', error)
    return null
  }
}

/**
 * 4. Device COVID-19 Serology - Search by antibody agreement
 * TN: True Negative, TP: True Positive, FN: False Negative, FP: False Positive
 */
export async function searchCOVID19SerologyByAntibody(antibodyAgree: string, limit: number = 5) {
  try {
    const url = `${FDA_DEVICE_BASE_URL}/covid19serology.json?api_key=${FDA_API_KEY}&search=antibody_agree:"${antibodyAgree}"&limit=${limit}`

    console.log('🔍 Searching COVID-19 serology by antibody:', antibodyAgree)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ COVID-19 serology data fetched successfully')
    return data
  } catch (error) {
    console.error('❌ Error fetching COVID-19 serology:', error)
    return null
  }
}

/**
 * 5. Device UDI - Search by combination product status
 */
export async function searchDeviceUDIByCombination(isCombination: boolean, limit: number = 5) {
  try {
    const url = `${FDA_DEVICE_BASE_URL}/udi.json?api_key=${FDA_API_KEY}&search=is_combination_product:${isCombination}&limit=${limit}`

    console.log('🔍 Searching device UDI by combination status:', isCombination)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Device UDI data fetched successfully')
    return data
  } catch (error) {
    console.error('❌ Error fetching device UDI:', error)
    return null
  }
}

/**
 * 6. Device 510(k) - Search by advisory committee
 */
export async function searchDevice510kByCommittee(committee: string, limit: number = 5) {
  try {
    const url = `${FDA_DEVICE_BASE_URL}/510k.json?api_key=${FDA_API_KEY}&search=advisory_committee:"${committee}"&limit=${limit}`

    console.log('🔍 Searching device 510(k) by committee:', committee)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Device 510(k) data fetched successfully')
    return data
  } catch (error) {
    console.error('❌ Error fetching device 510(k):', error)
    return null
  }
}

/**
 * 7. Device Classification - Search by product code
 */
export async function searchDeviceClassificationByCode(productCode: string, limit: number = 5) {
  try {
    const url = `${FDA_DEVICE_BASE_URL}/classification.json?api_key=${FDA_API_KEY}&search=product_code:"${productCode}"&limit=${limit}`

    console.log('🔍 Searching device classification by code:', productCode)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Device classification data fetched successfully')
    return data
  } catch (error) {
    console.error('❌ Error fetching device classification:', error)
    return null
  }
}

/**
 * 8. Device Enforcement - Search by classification (recall severity)
 */
export async function searchDeviceEnforcementByClass(classification: string, limit: number = 5) {
  try {
    const url = `${FDA_DEVICE_BASE_URL}/enforcement.json?api_key=${FDA_API_KEY}&search=classification:"${classification}"&limit=${limit}`

    console.log('🔍 Searching device enforcement by class:', classification)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Device enforcement data fetched successfully')
    return data
  } catch (error) {
    console.error('❌ Error fetching device enforcement:', error)
    return null
  }
}

/**
 * 9. Device Event - Search by generic name
 */
export async function searchDeviceEventByGenericName(genericName: string, limit: number = 5) {
  try {
    const encodedName = encodeURIComponent(genericName)
    const url = `${FDA_DEVICE_BASE_URL}/event.json?api_key=${FDA_API_KEY}&search=device.generic_name:"${encodedName}"&limit=${limit}`

    console.log('🔍 Searching device events by generic name:', genericName)

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`FDA API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Device event data fetched successfully')
    return data
  } catch (error) {
    console.error('❌ Error fetching device events:', error)
    return null
  }
}
