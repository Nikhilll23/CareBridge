'use client'

import { useState, useEffect, useRef } from 'react'
import { getKeyMetrics, getChartData } from '@/actions/mis'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Download, TrendingUp, Users, Clock, Activity } from 'lucide-react'

// Colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<any>(null)
  const [revData, setRevData] = useState<any[]>([])
  const [bedData, setBedData] = useState<any[]>([])
  const [erData, setErData] = useState<any[]>([]) // Use this for dept performance or wait times if we had trend
  const [deptData, setDeptData] = useState<any[]>([])

  const [range, setRange] = useState<'7d' | '30d'>('7d')
  const [role, setRole] = useState('ADMIN') // Mock role

  useEffect(() => {
    loadData()
  }, [range])

  const loadData = async () => {
    const m = await getKeyMetrics(range)
    setMetrics(m)

    const r = await getChartData('revenue')
    setRevData(r)

    const b = await getChartData('beds')
    setBedData(b)

    const d = await getChartData('dept')
    setDeptData(d)
  }

  const handleExport = () => {
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.text('Hospital Management Report', 14, 22)
    doc.setFontSize(11)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)

    // KPI Table
    if (metrics) {
      autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Value']],
        body: [
          ['Total Revenue', `Rs. ${metrics.totalRevenue.toLocaleString()}`],
          ['Bed Occupancy', `${metrics.occupancyRate}%`],
          ['Avg ER Wait', `${metrics.avgErWaitTime} mins`],
          ['Active Patients', `${metrics.activePatients}`]
        ]
      })
    }

    // Add more tables/charts summary if needed
    doc.save('MIS_Report.pdf')
  }

  if (!metrics) return <div className="p-8">Loading Analytics...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">MIS & Analytics Engine</h1>
        <div className="flex gap-2">
          <Select value={range} onValueChange={(v: any) => setRange(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bed Occupancy</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.occupancyRate}%</div>
            <div className="w-full bg-secondary h-2 mt-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full" style={{ width: `${metrics.occupancyRate}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg ER Wait</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgErWaitTime}m</div>
            <p className="text-xs text-muted-foreground">-2m from average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activePatients}</div>
            <p className="text-xs text-muted-foreground">Currently admitted</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue Chart (Admin Only) */}
        {role === 'ADMIN' && (
          <Card className="col-span-2 md:col-span-1">
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Daily income over period</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Department Performance */}
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>Department Load</CardTitle>
            <CardDescription>Appointments per Dept</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bed Status */}
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>Bed Occupancy Rate</CardTitle>
            <CardDescription>Real-time Ward Status</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bedData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {bedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-sm mt-4">
              {bedData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {entry.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
