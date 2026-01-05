'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { dispenseMedication } from '@/actions/inventory'
import type { InventoryItem } from '@/actions/inventory'

interface Patient {
  id: string
  first_name: string
  last_name: string
}

interface DispenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventory: InventoryItem[]
  patients: Patient[]
  onSuccess?: () => void
}

export function DispenseDialog({
  open,
  onOpenChange,
  inventory,
  patients,
  onSuccess,
}: DispenseDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    inventoryId: '',
    patientId: '',
    quantity: 1,
    notes: '',
  })

  const selectedItem = inventory.find(item => item.id === formData.inventoryId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.inventoryId || !formData.patientId || formData.quantity < 1) {
      toast.error('Please fill all required fields')
      return
    }

    setLoading(true)

    try {
      const result = await dispenseMedication({
        inventoryId: formData.inventoryId,
        patientId: formData.patientId,
        quantity: formData.quantity,
        notes: formData.notes || undefined,
      })

      if (result.success) {
        toast.success(result.message || 'Medication dispensed successfully')
        setFormData({ inventoryId: '', patientId: '', quantity: 1, notes: '' })
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to dispense medication')
      }
    } catch (error) {
      toast.error('An error occurred')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Dispense Medication</DialogTitle>
          <DialogDescription>
            Record medication distribution to a patient
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Medication Selection */}
          <div className="space-y-2">
            <Label htmlFor="medication">Medication *</Label>
            <Select
              value={formData.inventoryId}
              onValueChange={(value) =>
                setFormData({ ...formData, inventoryId: value })
              }
            >
              <SelectTrigger id="medication">
                <SelectValue placeholder="Select medication" />
              </SelectTrigger>
              <SelectContent>
                {inventory
                  .filter(item => item.stock_quantity > 0)
                  .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.item_name} ({item.strength}) - Stock: {item.stock_quantity}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {selectedItem && (
              <p className="text-sm text-muted-foreground">
                Available: {selectedItem.stock_quantity} units @ ₹
                {selectedItem.unit_price} each
              </p>
            )}
          </div>

          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="patient">Patient *</Label>
            <Select
              value={formData.patientId}
              onValueChange={(value) =>
                setFormData({ ...formData, patientId: value })
              }
            >
              <SelectTrigger id="patient">
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={selectedItem?.stock_quantity || 999}
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
              }
            />
            {selectedItem && formData.quantity > 0 && (
              <p className="text-sm text-muted-foreground">
                Total: ₹{(selectedItem.unit_price * formData.quantity).toFixed(2)}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <textarea
              id="notes"
              className="w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Additional notes or instructions..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Dispense Medication
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
