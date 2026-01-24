'use client'

import { useState, useEffect } from 'react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Bell, Check, Trash2, Info, CheckCircle, AlertTriangle, XCircle, Calendar, User, Settings } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getNotifications, getUnreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '@/actions/notifications'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function NotificationPanel() {
    const [open, setOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [notifications, setNotifications] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const fetchNotifications = async () => {
        setLoading(true)
        const [notifs, count] = await Promise.all([
            getNotifications(),
            getUnreadNotificationCount()
        ])
        setNotifications(notifs)
        setUnreadCount(count || 0)
        setLoading(false)
    }

    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    const handleMarkRead = async (id: string) => {
        await markNotificationAsRead(id)
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const handleMarkAllRead = async () => {
        await markAllNotificationsAsRead()
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
        toast.success('All marked as read')
    }

    const handleDelete = async (id: string, e: any) => {
        e.stopPropagation()
        await deleteNotification(id)
        setNotifications(prev => prev.filter(n => n.id !== id))
        toast.success('Notification removed')
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'SUCCESS': return <CheckCircle className="h-4 w-4 text-green-500" />
            case 'WARNING': return <AlertTriangle className="h-4 w-4 text-amber-500" />
            case 'ERROR': return <XCircle className="h-4 w-4 text-red-500" />
            case 'APPOINTMENT': return <Calendar className="h-4 w-4 text-blue-500" />
            case 'PATIENT': return <User className="h-4 w-4 text-purple-500" />
            case 'SYSTEM': return <Settings className="h-4 w-4 text-gray-500" />
            default: return <Info className="h-4 w-4 text-sky-500" />
        }
    }

    return (
        <Popover open={open} onOpenChange={(val) => {
            setOpen(val)
            if (val) fetchNotifications()
        }}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h4 className="font-semibold">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-auto px-2 text-xs">
                            Mark all read
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
                            <Bell className="h-8 w-8 opacity-20" />
                            <p className="text-sm">No notifications</p>
                        </div>
                    ) : (
                        <div className="grid">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={cn(
                                        "relative flex gap-3 border-b p-4 text-sm transition-colors hover:bg-muted/50",
                                        !notif.is_read && "bg-muted/30"
                                    )}
                                    onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                                >
                                    <div className="mt-0.5">{getIcon(notif.type)}</div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={cn("font-medium leading-none", !notif.is_read && "font-semibold")}>
                                                {notif.title}
                                            </p>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground line-clamp-2">
                                            {notif.message}
                                        </p>
                                        {notif.link && (
                                            <Link href={notif.link} className="inline-block text-xs font-medium text-primary hover:underline" onClick={() => setOpen(false)}>
                                                View Details
                                            </Link>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 absolute right-2 bottom-2"
                                        onClick={(e) => handleDelete(notif.id, e)}
                                    >
                                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
