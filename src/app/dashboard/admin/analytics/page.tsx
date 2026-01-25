'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { getBedAnalytics, getDepartmentRevenue, seedDepartmentData } from '@/actions/analytics'
import { DepartmentRevenueManager } from '@/components/modules/admin/DepartmentRevenueManager'
import { Button } from '@/components/ui/button'
import { RefreshCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getKeyMetrics } from '@/actions/mis'

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true)
  const [bedData, setBedData] = useState<any[]>([])
  const [deptData, setDeptData] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>(null)

  const loadAllData = async () => {
    setLoading(true)
    try {
      // 1. Bed Data (Real from DB)
      const bedRes = await getBedAnalytics()
      if (bedRes.success) setBedData(bedRes.chartData || [])

      // 2. Department Data (Editable)
      const deptRes = await getDepartmentRevenue()
      // If empty, auto-seed for demo
      if (deptRes.data && deptRes.data.length === 0) {
        await seedDepartmentData()
        const finalRes = await getDepartmentRevenue()
        setDeptData(finalRes.data || [])
      } else {
        setDeptData(deptRes.data || [])
      }

      // 3. Key Metrics (Existing)
      const m = await getKeyMetrics('30d')
      setMetrics(m)

    } catch (error) {
      console.error(error)
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  if (loading && !metrics) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="space-y-8 p-2">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Real-time hospital performance insights</p>
        </div>
        <Button onClick={loadAllData} variant="outline" disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Bed Occupancy (Pie Chart) */}
        <Card>
          <CardHeader>
            <CardTitle>Bed Occupancy Rate</CardTitle>
            <CardDescription>Real-time status from {bedData.reduce((a, b) => a + b.value, 0)} total beds</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {bedData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bedData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {bedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Occupied' ? '#ef4444' : entry.name === 'Available' ? '#22c55e' : '#f59e0b'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [value, 'Beds']} />
                  <Legend verticalAlign="bottom" height={36} />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                    <tspan x="50%" dy="-1em" fontSize="24" fontWeight="bold" fill="#333">
                      {Math.round(((bedData.find(b => b.name === 'Occupied')?.value || 0) / (bedData.reduce((a, b) => a + b.value, 0) || 1)) * 100)}%
                    </tspan>
                    <tspan x="50%" dy="1.5em" fontSize="14" fill="#999">Occupied</tspan>
                  </text>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No bed data available</div>
            )}
          </CardContent>
        </Card>

        {/* Department Revenue (Bar Chart) */}
        <Card>
          <CardHeader>
            <CardTitle>Department Revenue</CardTitle>
            <CardDescription>Revenue distribution across specializations</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="department_name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {deptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No revenue data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Manager Table */}
      <DepartmentRevenueManager data={deptData} />
    </div>
  )
}
