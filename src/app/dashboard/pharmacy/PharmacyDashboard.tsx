'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package,
  AlertTriangle,
  DollarSign,
  TrendingDown,
  Search,
  Plus,
  Calendar,
  Pill,
  PackageX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DispenseDialog, FDASearchPanel } from '@/components/modules/pharmacy'
import type { InventoryItem } from '@/actions/inventory'
import { format } from 'date-fns'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import { deleteInventoryItem } from '@/actions/inventory'
import { toast } from 'sonner' // Ensure toast is imported if not already

interface PharmacyDashboardProps {
  inventory: InventoryItem[]
  lowStock: InventoryItem[]
  expiring: InventoryItem[]
  patients: any[]
  userRole: string
  stats: {
    totalItems: number
    totalValue: number
    lowStockCount: number
    outOfStock: number
    expiringCount: number
  }
}

export function PharmacyDashboard({
  inventory,
  lowStock,
  expiring,
  patients,
  userRole,
  stats,
}: PharmacyDashboardProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [dispenseDialogOpen, setDispenseDialogOpen] = useState(false)
  const [fdaPanelOpen, setFdaPanelOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ndc_code?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // ... (categories and getCategoryBadgeColor helper are same)

  const categories = ['ALL', ...Array.from(new Set(inventory.map(item => item.category)))]

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      ANTIBIOTICS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      ANALGESICS: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      ANTIPYRETICS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      CARDIOVASCULAR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      DIABETES: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      VITAMINS: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    }
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }

  const handleDelete = async () => {
    if (!itemToDelete) return

    toast.loading('Deleting item...')
    const result = await deleteInventoryItem(itemToDelete)

    toast.dismiss()
    if (result.success) {
      toast.success('Item deleted from inventory')
      router.refresh()
    } else {
      toast.error(result.error)
    }
    setDeleteDialogOpen(false)
    setItemToDelete(null)
  }

  return (
    <>
      <div className="flex items-center justify-between">
        {/* ... Header ... */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pharmacy & Inventory</h1>
          <p className="text-muted-foreground">
            Manage hospital stock and search FDA drug database
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setFdaPanelOpen(true)} variant="outline">
            <Search className="mr-2 h-4 w-4" />
            FDA Database
          </Button>
          <Button onClick={() => setDispenseDialogOpen(true)}>
            <Pill className="mr-2 h-4 w-4" />
            Dispense Medication
          </Button>
        </div>
      </div>

      {/* Stats Cards ... (Keep existing) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {stats.outOfStock} out of stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Inventory valuation
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Below threshold
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {stats.expiringCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Within 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <PackageX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.outOfStock}</div>
            <p className="text-xs text-muted-foreground">
              Need restocking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts & Expiring Items ... (Keep existing) */}
      {lowStock.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>
              These items are below their minimum stock threshold
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lowStock.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.strength} • {item.dosage_form}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-destructive">
                      {item.stock_quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Min: {item.low_stock_threshold}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {expiring.length > 0 && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              Expiring Soon
            </CardTitle>
            <CardDescription>
              Items expiring within the next 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiring.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-orange-500/20 bg-orange-500/5 p-3"
                >
                  <div>
                    <p className="font-medium text-sm">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {item.stock_quantity} • NDC: {item.ndc_code || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-orange-500">
                      {item.expiry_date ? format(new Date(item.expiry_date), 'MMM dd, yyyy') : 'No date'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expires in {Math.ceil((new Date(item.expiry_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>
                Complete list of all medications and supplies
              </CardDescription>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, category, or NDC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mt-3">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>NDC</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No items found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.item_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.strength} • {item.dosage_form}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryBadgeColor(item.category)}>
                        {item.category.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className={`font-medium ${item.stock_quantity === 0
                          ? 'text-destructive'
                          : item.stock_quantity <= item.low_stock_threshold
                            ? 'text-orange-500'
                            : ''
                          }`}>
                          {item.stock_quantity}
                        </p>
                        {item.stock_quantity <= item.low_stock_threshold && (
                          <p className="text-xs text-muted-foreground">
                            Min: {item.low_stock_threshold}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>₹{item.unit_price.toFixed(2)}</TableCell>
                    <TableCell>
                      {item.expiry_date ? (
                        <div>
                          <p>{format(new Date(item.expiry_date), 'MMM dd, yyyy')}</p>
                          {new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                            <p className="text-xs text-orange-500">Expiring soon</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.ndc_code ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {item.ndc_code}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setItemToDelete(item.id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DispenseDialog
        open={dispenseDialogOpen}
        onOpenChange={setDispenseDialogOpen}
        inventory={inventory.filter(item => item.stock_quantity > 0)}
        patients={patients}
        onSuccess={() => router.refresh()}
      />

      <FDASearchPanel
        isOpen={fdaPanelOpen}
        onClose={() => setFdaPanelOpen(false)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
