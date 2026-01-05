'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Loader2, AlertCircle, Package, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getDrugInfoFromFDA } from '@/actions/inventory'
import type { FDADrugLabel } from '@/lib/openfda'

interface FDASearchPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function FDASearchPanel({ isOpen, onClose }: FDASearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<FDADrugLabel[]>([])
  const [selectedDrug, setSelectedDrug] = useState<FDADrugLabel | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setResults([])
      setSelectedDrug(null)
      setError(null)
    }
  }, [isOpen])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setError('Please enter at least 2 characters')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const result = await getDrugInfoFromFDA(searchQuery)
      
      if (result.success && result.data) {
        setResults(result.data)
        if (result.data.length > 0) {
          setSelectedDrug(result.data[0])
        }
        setError(null)
      } else {
        setResults([])
        setSelectedDrug(null)
        setError(result.error || 'No results found')
      }
    } catch (err) {
      setError('Failed to search. Please try again.')
      setResults([])
      setSelectedDrug(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Slide-in Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-150 bg-background border-l shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">FDA Drug Database</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Search Form */}
            <div className="p-6 border-b">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Search drug name (e.g., Aspirin, Insulin)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </form>
              
              {error && (
                <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {results.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 p-6">
                  {/* Results List */}
                  {results.length > 1 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Found {results.length} results
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {results.map((drug, index) => (
                          <Button
                            key={index}
                            variant={selectedDrug === drug ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedDrug(drug)}
                          >
                            {drug.brand_name?.[0] || drug.generic_name?.[0] || 'Unknown'}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Drug Details */}
                  {selectedDrug && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      {/* Brand & Generic Name */}
                      <div>
                        <h3 className="text-2xl font-bold">
                          {selectedDrug.brand_name?.[0] || 'Unknown Brand'}
                        </h3>
                        <p className="text-muted-foreground">
                          {selectedDrug.generic_name?.[0] || selectedDrug.active_ingredient?.[0] || 'Unknown'}
                        </p>
                      </div>

                      {/* Manufacturer */}
                      <div>
                        <Label>Manufacturer</Label>
                        <p className="text-sm">
                          {selectedDrug.manufacturer_name?.[0] || 'Not specified'}
                        </p>
                      </div>

                      {/* NDC */}
                      {selectedDrug.product_ndc && selectedDrug.product_ndc[0] && (
                        <div>
                          <Label>NDC Code</Label>
                          <Badge variant="outline">{selectedDrug.product_ndc[0]}</Badge>
                        </div>
                      )}

                      {/* Route */}
                      {selectedDrug.route && selectedDrug.route[0] && (
                        <div>
                          <Label>Route of Administration</Label>
                          <p className="text-sm capitalize">{selectedDrug.route[0].toLowerCase()}</p>
                        </div>
                      )}

                      {/* Purpose */}
                      {selectedDrug.purpose && selectedDrug.purpose[0] && (
                        <div>
                          <Label>Purpose</Label>
                          <p className="text-sm">{selectedDrug.purpose[0]}</p>
                        </div>
                      )}

                      {/* Indications */}
                      {selectedDrug.indications_and_usage && selectedDrug.indications_and_usage[0] && (
                        <div>
                          <Label>Indications & Usage</Label>
                          <p className="text-sm text-muted-foreground max-h-40 overflow-y-auto">
                            {selectedDrug.indications_and_usage[0].slice(0, 500)}
                            {selectedDrug.indications_and_usage[0].length > 500 && '...'}
                          </p>
                        </div>
                      )}

                      {/* Warnings */}
                      {selectedDrug.warnings && selectedDrug.warnings[0] && (
                        <div>
                          <Label className="text-destructive">Warnings</Label>
                          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                            <p className="text-sm max-h-40 overflow-y-auto">
                              {selectedDrug.warnings[0].slice(0, 500)}
                              {selectedDrug.warnings[0].length > 500 && '...'}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Adverse Reactions */}
                      {selectedDrug.adverse_reactions && selectedDrug.adverse_reactions[0] && (
                        <div>
                          <Label>Adverse Reactions (Side Effects)</Label>
                          <p className="text-sm text-muted-foreground max-h-40 overflow-y-auto">
                            {selectedDrug.adverse_reactions[0].slice(0, 500)}
                            {selectedDrug.adverse_reactions[0].length > 500 && '...'}
                          </p>
                        </div>
                      )}

                      {/* Dosage */}
                      {selectedDrug.dosage_and_administration && selectedDrug.dosage_and_administration[0] && (
                        <div>
                          <Label>Dosage & Administration</Label>
                          <p className="text-sm text-muted-foreground max-h-40 overflow-y-auto">
                            {selectedDrug.dosage_and_administration[0].slice(0, 500)}
                            {selectedDrug.dosage_and_administration[0].length > 500 && '...'}
                          </p>
                        </div>
                      )}

                      {/* FDA Disclaimer */}
                      <div className="bg-muted p-4 rounded-md flex gap-2">
                        <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          This information is provided by the U.S. Food and Drug Administration (FDA). 
                          Always consult with a healthcare professional before prescribing or taking any medication.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                !loading && !error && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <Package className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Search FDA Drug Database</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Enter a drug name to search for detailed information including 
                      usage, warnings, side effects, and more from the FDA database.
                    </p>
                  </div>
                )
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h4 className={`text-sm font-semibold mb-1 ${className}`}>{children}</h4>
}
