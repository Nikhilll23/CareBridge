'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { getLowStockItems, getInventory } from '@/actions/inventory'
import { AlertCircle, Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

interface PrescriptionPadProps {
    onPrescribe?: (drug: string, dosage: string) => void
}

export function PrescriptionPad({ onPrescribe }: PrescriptionPadProps) {
    const [open, setOpen] = useState(false)
    const [drugs, setDrugs] = useState<any[]>([])
    const [selectedDrug, setSelectedDrug] = useState<string>('')
    const [lowStockWarnings, setLowStockWarnings] = useState<string[]>([])
    const [dosage, setDosage] = useState('')

    useEffect(() => {
        // Load inventory for search
        const load = async () => {
            const res = await getInventory()
            if (res.success && res.data) {
                setDrugs(res.data)
                // Identify low stock
                const low = res.data.filter(d => d.stock_quantity <= d.low_stock_threshold).map(d => d.item_name)
                setLowStockWarnings(low)
            }
        }
        load()
    }, [])

    const handlePrescribe = () => {
        if (!selectedDrug || !dosage) return
        onPrescribe?.(selectedDrug, dosage)
        // Reset
        setSelectedDrug('')
        setDosage('')
        setOpen(false)
    }

    return (
        <div className="space-y-4 border rounded-lg p-4 bg-background">
            <h3 className="font-semibold flex items-center gap-2">
                Connected Rx Pad
            </h3>

            <div className="space-y-2">
                <Label>Medication Search</Label>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between"
                        >
                            {selectedDrug
                                ? selectedDrug
                                : "Search inventory..."}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput placeholder="Search drugs..." />
                            <CommandList>
                                <CommandEmpty>No drug found.</CommandEmpty>
                                <CommandGroup>
                                    {drugs.map((drug) => (
                                        <CommandItem
                                            key={drug.id}
                                            value={drug.item_name}
                                            onSelect={(currentValue: string) => {
                                                setSelectedDrug(currentValue)
                                                setOpen(false)
                                            }}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span>{drug.item_name}</span>
                                                {drug.stock_quantity <= drug.low_stock_threshold && (
                                                    <span className="text-xs text-destructive flex items-center">
                                                        <AlertCircle className="h-3 w-3 mr-1" />
                                                        Low Stock ({drug.stock_quantity})
                                                    </span>
                                                )}
                                            </div>
                                            <Check
                                                className={cn(
                                                    "ml-auto h-4 w-4",
                                                    selectedDrug === drug.item_name ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                {selectedDrug && lowStockWarnings.includes(selectedDrug) && (
                    <p className="text-xs text-destructive font-medium flex items-center mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Warning: This item is running low in pharmacy.
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Dosage & Frequency</Label>
                <Input
                    placeholder="e.g. 500mg, 1-0-1 for 5 days"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                />
            </div>

            {onPrescribe && (
                <Button className="w-full" onClick={handlePrescribe} disabled={!selectedDrug}>
                    Add to Consultation
                </Button>
            )}
        </div>
    )
}
