'use client'

import { useState, useEffect } from 'react'
import { getPendingPrescriptions, checkSafety, processDispense, getInventory } from '@/actions/pharmacy'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pill, AlertTriangle, CheckCircle, CreditCard, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

export default function PharmacyDashboard() {
  const [queue, setQueue] = useState<any[]>([])
  const [selectedScript, setSelectedScript] = useState<any>(null)
  const [batches, setBatches] = useState<any[]>([])
  const [selectedBatch, setSelectedBatch] = useState<string>('')

  const [safetyAlerts, setSafetyAlerts] = useState<any[]>([])
  const [isDispensing, setIsDispensing] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)

  useEffect(() => {
    getPendingPrescriptions().then(setQueue)
  }, [])

  // When a script is selected, check safety & load batches
  useEffect(() => {
    if (!selectedScript) return

    // 1. Load Batches (FIFO)
    getInventory(selectedScript.medication).then(data => {
      setBatches(data)
      if (data.length > 0) setSelectedBatch(data[0].id) // Auto-select oldest
    })

    // 2. Check Safety
    checkSafety(selectedScript.patient_id, selectedScript.medication).then(result => {
      if (result.alert) {
        setSafetyAlerts(result.alerts || [])
      } else {
        setSafetyAlerts([])
      }
    })

  }, [selectedScript])

  const handleDispense = async () => {
    // Open Payment Modal first
    setShowPayModal(true)
  }

  const confirmPaymentAndDispense = async () => {
    if (!selectedBatch) return
    setIsDispensing(true)

    // Calculate qty (Assuming dose string "1 tab" -> we need logic. For now default 10)
    const qtyToDispense = 10

    const result = await processDispense({
      patientId: selectedScript.patient_id,
      drugName: selectedScript.medication,
      quantity: qtyToDispense,
      batchId: selectedBatch
    })

    if (result.success) {
      toast.success(`Dispensed ${selectedScript.medication}`)
      setShowPayModal(false)
      setSelectedScript(null)
      getPendingPrescriptions().then(setQueue)
    } else {
      toast.error(result.error)
    }
    setIsDispensing(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <ShoppingCart className="h-8 w-8 text-primary" />
        Pharmacy POS
      </h1>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Col: Queue */}
        <Card className="md:col-span-4 h-[calc(100vh-150px)] overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle>Prescription Queue</CardTitle>
            <CardDescription>{queue.length} pending orders</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            <div className="divide-y">
              {queue.map(script => (
                <div
                  key={script.id}
                  onClick={() => setSelectedScript(script)}
                  className={`p-4 cursor-pointer hover:bg-accent transition-colors ${selectedScript?.id === script.id ? 'bg-accent/50 border-l-4 border-l-primary' : ''}`}
                >
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">{script.patients.first_name} {script.patients.last_name}</span>
                    <Badge variant="outline">{new Date(script.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Pill className="h-4 w-4" /> {script.medication}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {script.dose} • {script.frequency} • {script.duration}
                  </div>
                </div>
              ))}
              {queue.length === 0 && <div className="p-8 text-center text-muted-foreground">No pending prescriptions.</div>}
            </div>
          </CardContent>
        </Card>

        {/* Right Col: Dispense View */}
        <Card className="md:col-span-8">
          <CardHeader>
            <CardTitle>Dispensing Console</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedScript ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                <Pill className="h-12 w-12 mb-4 opacity-50" />
                <p>Select a prescription from the queue to dispense</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Prescription Details */}
                <div className="bg-muted/40 p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold text-lg">{selectedScript.medication}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Dose:</span> {selectedScript.dose}</div>
                    <div><span className="text-muted-foreground">Route:</span> {selectedScript.route}</div>
                    <div><span className="text-muted-foreground">Freq:</span> {selectedScript.frequency}</div>
                    <div><span className="text-muted-foreground">Duration:</span> {selectedScript.duration}</div>
                  </div>
                </div>

                {/* 2. Safety Alerts (Red Box) */}
                {safetyAlerts.length > 0 && (
                  <Alert variant="destructive" className="border-red-500/50 bg-red-50 text-red-900">
                    <AlertTriangle className="h-5 w-5 animate-pulse" />
                    <AlertTitle className="font-bold">Safety Warning!</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 mt-2 space-y-1">
                        {safetyAlerts.map((alert, idx) => (
                          <li key={idx}>
                            <strong>{alert.type}:</strong> {alert.message}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" className="bg-white border-red-200 hover:bg-red-100 text-red-700">Override & Dispense</Button>
                        <Button variant="destructive" size="sm">Reject Order</Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* 3. Batch Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Batch (FIFO)</label>
                  <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map(batch => (
                        <SelectItem key={batch.id} value={batch.id}>
                          Batch: {batch.batch_number} | Exp: {batch.expiry_date} | Stock: {batch.quantity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {batches.length === 0 && <p className="text-xs text-red-500 font-medium">Out of Stock!</p>}
                </div>

                {/* 4. Action */}
                <div className="pt-4 flex justify-end">
                  <Button
                    size="lg"
                    className="gap-2"
                    disabled={batches.length === 0 || safetyAlerts.length > 0} // Safety blocks unless overridden (logic simplified here)
                    onClick={handleDispense}
                  >
                    <CreditCard className="h-4 w-4" /> Collect & Dispense
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Razorpay Mock Modal */}
      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Gateway (Razorpay Mode)</DialogTitle>
            <DialogDescription>
              Simulating payment collection for {selectedScript?.medication}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">₹ 150.00</p>
              <p className="text-sm text-muted-foreground">Total Bill</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayModal(false)}>Cancel</Button>
            <Button onClick={confirmPaymentAndDispense} disabled={isDispensing}>
              {isDispensing ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
