'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Settings as SettingsIcon, User, Bell, Shield, Database, Save, Check, Loader2, Download } from 'lucide-react'
import { updateUserProfile } from '@/actions/settings'
import { getNotificationSettings, updateNotificationSettings } from '@/actions/notifications'
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
    const [loadingSettings, setLoadingSettings] = useState(true)

    const [profile, setProfile] = useState({
        first_name: user?.firstName || '',
        last_name: user?.lastName || '',
        phone: user?.phone || ''
    })

    const [notificationPrefs, setNotificationPrefs] = useState({
        email_notifications: true,
        appointment_reminders: true,
        patient_updates: true,
        system_alerts: true
    })

    // Load notification settings on mount
    useEffect(() => {
        async function loadSettings() {
            const result = await getNotificationSettings()
            if (result.data) {
                setNotificationPrefs({
                    email_notifications: result.data.email_notifications,
                    appointment_reminders: result.data.appointment_reminders,
                    patient_updates: result.data.patient_updates,
                    system_alerts: result.data.system_alerts
                })
            }
            setLoadingSettings(false)
        }
        loadSettings()
    }, [])

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
        const result = await updateNotificationSettings(notificationPrefs)
        if (result.success) {
            toast.success('Notification preferences saved')
        } else {
            toast.error('Failed to save preferences')
        }
        setLoadingNotify(false)
    }

    const handleToggle = (key: keyof typeof notificationPrefs) => {
        setNotificationPrefs(prev => ({
            ...prev,
            [key]: !prev[key]
        }))
    }

    const handleExport = () => {
        const data = {
            user: user,
            timestamp: new Date().toISOString(),
            system: 'CareBridge',
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
                    {loadingSettings ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="space-y-0.5">
                                    <Label htmlFor="email_notifications">Email Notifications</Label>
                                    <p className="text-sm text-muted-foreground">Receive important updates via email</p>
                                </div>
                                <Switch
                                    id="email_notifications"
                                    checked={notificationPrefs.email_notifications}
                                    onCheckedChange={() => handleToggle('email_notifications')}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="space-y-0.5">
                                    <Label htmlFor="appointment_reminders">Appointment Reminders</Label>
                                    <p className="text-sm text-muted-foreground">Get notified about upcoming appointments</p>
                                </div>
                                <Switch
                                    id="appointment_reminders"
                                    checked={notificationPrefs.appointment_reminders}
                                    onCheckedChange={() => handleToggle('appointment_reminders')}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="space-y-0.5">
                                    <Label htmlFor="patient_updates">Patient Updates</Label>
                                    <p className="text-sm text-muted-foreground">Receive notifications about patient status changes</p>
                                </div>
                                <Switch
                                    id="patient_updates"
                                    checked={notificationPrefs.patient_updates}
                                    onCheckedChange={() => handleToggle('patient_updates')}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="space-y-0.5">
                                    <Label htmlFor="system_alerts">System Alerts</Label>
                                    <p className="text-sm text-muted-foreground">Important system notifications and updates</p>
                                </div>
                                <Switch
                                    id="system_alerts"
                                    checked={notificationPrefs.system_alerts}
                                    onCheckedChange={() => handleToggle('system_alerts')}
                                />
                            </div>

                            <Button onClick={handleNotifySave} disabled={loadingNotify} className="w-full md:w-auto">
                                {loadingNotify ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Save Notification Settings
                            </Button>
                        </>
                    )}
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
