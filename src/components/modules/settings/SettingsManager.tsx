'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Settings as SettingsIcon, User, Bell, Shield, Database, Save, Check, Loader2, Download } from 'lucide-react'
import { updateUserProfile, updateNotificationSettings } from '@/actions/settings'
import { toast } from 'sonner'

interface SettingsManagerProps {
    user: {
        id: string
        firstName: string
        lastName: string
        phone: string
        email: string
    }
}

export function SettingsManager({ user }: SettingsManagerProps) {
    const [loadingProfile, setLoadingProfile] = useState(false)
    const [loadingNotify, setLoadingNotify] = useState(false)

    const [profile, setProfile] = useState({
        first_name: user?.firstName || '',
        last_name: user?.lastName || '',
        phone: user?.phone || ''
    })

    const handleProfileSave = async () => {
        setLoadingProfile(true)
        try {
            // Note: This updates Supabase. Clerk update would need separate API call or webhook sync.
            // For this app we assume Supabase is the source of truth for app-data.
            const res = await updateUserProfile(user.id, profile)
            if (res.success) {
                toast.success('Profile updated')
            } else {
                toast.error('Failed update')
            }
        } catch (e) {
            toast.error('Error saving')
        } finally {
            setLoadingProfile(false)
        }
    }

    const handleNotifySave = async () => {
        setLoadingNotify(true)
        await updateNotificationSettings(user.id, {})
        toast.success('Preferences saved')
        setLoadingNotify(false)
    }

    const handleExport = () => {
        const data = {
            user: user,
            timestamp: new Date().toISOString(),
            system: 'Hospital Information System',
            version: '1.0.0'
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'system_data.json'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        toast.success('Data export started')
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-2">Manage your system preferences and configurations</p>
                </div>
            </div>

            {/* Profile Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Profile Settings
                    </CardTitle>
                    <CardDescription>Update your personal information and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                value={profile.first_name}
                                onChange={e => setProfile({ ...profile, first_name: e.target.value })}
                                placeholder="Enter first name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                value={profile.last_name}
                                onChange={e => setProfile({ ...profile, last_name: e.target.value })}
                                placeholder="Enter last name"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            value={user.email}
                            disabled
                            className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">Email cannot be changed here. Manage via Clerk.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={profile.phone}
                            onChange={e => setProfile({ ...profile, phone: e.target.value })}
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>

                    <Button onClick={handleProfileSave} disabled={loadingProfile} className="w-full md:w-auto">
                        {loadingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Profile Changes
                    </Button>
                </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Notification Preferences
                    </CardTitle>
                    <CardDescription>Configure how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {['Email Notifications', 'Appointment Reminders', 'Patient Updates', 'System Alerts'].map((item) => (
                        <div key={item} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label>{item}</Label>
                                <p className="text-sm text-muted-foreground">Receive updates for {item.toLowerCase()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                <span className="text-sm text-muted-foreground">Enabled</span>
                            </div>
                        </div>
                    ))}

                    <Button onClick={handleNotifySave} disabled={loadingNotify} className="w-full md:w-auto">
                        {loadingNotify ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Notification Settings
                    </Button>
                </CardContent>
            </Card>

            {/* System Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        System Configuration
                    </CardTitle>
                    <CardDescription>Advanced settings and integrations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label>Data Export</Label>
                            <p className="text-sm text-muted-foreground">Export your data as CSV/JSON</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Export Data
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
