'use client'

import * as React from "react"
import { Check, ChevronsUpDown, Stethoscope, Search, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { finalizeDiagnosis, searchProceduresLocal } from "@/actions/coding"
import { toast } from "sonner"

interface CodingWidgetProps {
    visitId: string // The medical_record ID
    patientId: string
    onCodingComplete?: () => void
}

export function CodingWidget({ visitId, patientId, onCodingComplete }: CodingWidgetProps) {
    // --- ICD-10 State ---
    const [icdOpen, setIcdOpen] = React.useState(false)
    const [icdTerm, setIcdTerm] = React.useState("")
    const [icdOptions, setIcdOptions] = React.useState<{ value: string, label: string }[]>([])
    const [selectedIcd, setSelectedIcd] = React.useState<string>("")
    const [selectedIcdDesc, setSelectedIcdDesc] = React.useState<string>("")

    // --- Procedure State ---
    const [procedures, setProcedures] = React.useState<any[]>([])
    const [selectedProc, setSelectedProc] = React.useState<string>("")
    const [loadingProc, setLoadingProc] = React.useState(false)

    // --- Billing State ---
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    // 1. Fetch Local Procedures on Mount
    React.useEffect(() => {
        searchProceduresLocal('').then(setProcedures)
    }, [])

    // 2. Fetch NIH ICD-10 API
    // Debounce this in a real app
    React.useEffect(() => {
        if (icdTerm.length < 2) return

        const fetchICD = async () => {
            try {
                // Using NIH NLM API
                const res = await fetch(`https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(icdTerm)}`)
                const data = await res.json()
                // API returns [count, codes[], null, [ [code, desc], ... ]]
                // We want the 4th element which is the array of [code, desc]
                if (data[3] && Array.isArray(data[3])) {
                    const options = data[3].map((item: string[]) => ({
                        value: item[0], // Code (e.g. E11.9)
                        label: `${item[0]} - ${item[1]}` // Code - Desc
                    }))
                    setIcdOptions(options)
                }
            } catch (e) {
                console.error("ICD API Error", e)
            }
        }

        const timer = setTimeout(fetchICD, 300)
        return () => clearTimeout(timer)
    }, [icdTerm])


    const handleFinalize = async () => {
        if (!selectedIcd || !selectedProc) {
            toast.error("Please select both Diagnosis and Procedure")
            return
        }

        setIsSubmitting(true)
        const res = await finalizeDiagnosis({
            visitId,
            patientId,
            icdCode: selectedIcd,
            procedureCode: selectedProc
        })
        setIsSubmitting(false)

        if (res.success) {
            toast.success(res.message)
            if (onCodingComplete) onCodingComplete()
        } else {
            toast.error(res.error)
        }
    }

    return (
        <Card className="w-full max-w-md border-2 border-primary/10">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    Clinical Coding (Billable)
                </CardTitle>
                <CardDescription>Mandatory for Discharge & Billing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

                {/* 1. ICD-10 Search (NIH API) */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Primary Diagnosis (ICD-10)</label>
                    <Popover open={icdOpen} onOpenChange={setIcdOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={icdOpen}
                                className="w-full justify-between"
                            >
                                {selectedIcd ? selectedIcdDesc : "Search Diagnosis (e.g. Diabetes)..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                            <Command shouldFilter={false}>
                                <CommandInput
                                    placeholder="Type to search NIH Database..."
                                    onValueChange={setIcdTerm}
                                    value={icdTerm}
                                />
                                <CommandList>
                                    <CommandEmpty>No codes found.</CommandEmpty>
                                    <CommandGroup heading="Suggestions">
                                        {icdOptions.map((option) => (
                                            <CommandItem
                                                key={option.value}
                                                value={option.value}
                                                onSelect={(currentValue) => {
                                                    setSelectedIcd(option.value)
                                                    setSelectedIcdDesc(option.label)
                                                    setIcdOpen(false)
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedIcd === option.value ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {option.label}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 2. Procedure Dropdown */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Billable Procedure</label>
                    <Select onValueChange={setSelectedProc} value={selectedProc}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Procedure" />
                        </SelectTrigger>
                        <SelectContent>
                            {procedures.map((p: any) => (
                                <SelectItem key={p.code} value={p.code}>
                                    <span className="font-semibold">{p.code}</span> - {p.description} (${p.base_price})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* 3. Action */}
                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleFinalize}
                    disabled={isSubmitting || !selectedIcd || !selectedProc}
                >
                    {isSubmitting ? "Processing..." : (
                        <span className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Code & Add to Bill
                        </span>
                    )}
                </Button>

            </CardContent>
        </Card>
    )
}
