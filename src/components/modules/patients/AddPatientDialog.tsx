'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { registerPatient } from '@/actions/patients'
import { IDScanner } from '@/components/shared/IDScanner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2 } from 'lucide-react'
import type { PatientFormValues } from '@/types'

const patientFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  gender: z.enum(['Male', 'Female', 'Other']),
  contactNumber: z.string().min(10, 'Valid phone number required'),
  address: z.string().min(5, 'Address is required'),
  govtIdType: z.string().optional(),
  govtIdNumber: z.string().optional(),
})

interface AddPatientDialogProps {
  children: React.ReactNode
}

export function AddPatientDialog({ children }: AddPatientDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'Male',
      contactNumber: '',
      address: '',
      govtIdType: '',
      govtIdNumber: '',
    },
  })

  // Auto-fill form when ID is scanned
  const handleIDVerified = (result: { type: 'PAN' | 'AADHAAR' | null, number: string | null }) => {
    if (result.type && result.number) {
      form.setValue('govtIdType', result.type)
      form.setValue('govtIdNumber', result.number)
      // Visual feedback could be added here
    }
  }

  const onSubmit = async (data: PatientFormValues) => {
    setIsSubmitting(true)
    setSubmitSuccess(false)

    try {
      const result = await registerPatient(data)

      if (result.success) {
        setSubmitSuccess(true)
        form.reset()

        // Close dialog after showing success
        setTimeout(() => {
          setOpen(false)
          setSubmitSuccess(false)
        }, 2000)
      } else {
        // Show error in form
        form.setError('root', {
          message: result.error || 'Failed to register patient',
        })
      }
    } catch (error) {
      form.setError('root', {
        message: 'An unexpected error occurred',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register New Patient</DialogTitle>
          <DialogDescription>
            Add a new patient to the registry. Data will be synced with the health exchange.
          </DialogDescription>
        </DialogHeader>

        {submitSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Patient Registered Successfully!
            </h3>
            <p className="text-sm text-muted-foreground">
              The patient has been added and synced with the health exchange.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* ID Verification Scanner */}
              <div className="space-y-2">
                <FormLabel className="font-semibold text-primary">Step 1: ID Verification (Automated)</FormLabel>
                <IDScanner onVerified={handleIDVerified} />
                <p className="text-xs text-muted-foreground">
                  Upload a clear image of PAN or Aadhaar card to auto-fill details.
                </p>
              </div>

              {/* ID Details (Auto-filled) */}
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border border-dashed">
                <FormField
                  control={form.control}
                  name="govtIdType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">ID Type (Auto-Detected)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. PAN" {...field} readOnly className="bg-background font-mono h-8" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="govtIdNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">ID Number (Verified)</FormLabel>
                      <FormControl>
                        <Input placeholder="XXXX-XXXX-XXXX" {...field} readOnly className="bg-background font-mono h-8" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or Enter Manually</span></div>
              </div>

              <FormLabel className="font-semibold text-primary">Step 2: Personal Details</FormLabel>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* DOB and Gender */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Number */}
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Main St, City, State, ZIP"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Error Message */}
              {form.formState.errors.root && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {form.formState.errors.root.message}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    'Register Patient'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
