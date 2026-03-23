'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Check, CheckCheck, Trash2, X, Calendar, User, AlertTriangle, Info, CheckCircle, XCircle, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    type Notification,
    type NotificationType
} from '@/actions/notifications'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const notificationIcons: Record<NotificationType, React.ReactNode> = {
    INFO: <Info className="h-4 w-4 text-blue-500" />,
    SUCCESS: <CheckCircle className="h-4 w-4 text-green-500" />,
    WARNING: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
    ERROR: <XCircle className="h-4 w-4 text-red-500" />,
    APPOINTMENT: <Calendar className="h-4 w-4 text-purple-500" />,
    PATIENT: <User className="h-4 w-4 text-teal-500" />,
    SYSTEM: <Settings className="h-4 w-4 text-gray-500" />,
}

const notificationColors: Record<NotificationType, string> = {
    INFO: 'bg-blue-500/10 border-blue-500/20',
    SUCCESS: 'bg-green-500/10 border-green-500/20',
    WARNING: 'bg-yellow-500/10 border-yellow-500/20',
    ERROR: 'bg-red-500/10 border-red-500/20',
    APPOINTMENT: 'bg-purple-500/10 border-purple-500/20',
    PATIENT: 'bg-teal-500/10 border-teal-500/20',
    SYSTEM: 'bg-gray-500/10 border-gray-500/20',
}

export function NotificationPanel() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)

    const fetchNotifications = useCallback(async () => {
        const [notifResult, countResult] = await Promise.all([
            getNotifications(30),
            getUnreadNotificationCount()
        ])

        if (notifResult.data) {
            setNotifications(notifResult.data)
        }
        setUnreadCount(countResult)
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchNotifications()

        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

    const handleMarkAsRead = async (id: string) => {
        const result = await markNotificationAsRead(id)
        if (result.success) {
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        }
    }

    const handleMarkAllAsRead = async () => {
        const result = await markAllNotificationsAsRead()
        if (result.success) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })))
            setUnreadCount(0)
            toast.success(`Marked ${result.count} notifications as read`)
        } else {
            toast.error('Failed to mark all as read')
        }
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()

        const notification = notifications.find(n => n.id === id)
        const result = await deleteNotification(id)

        if (result.success) {
            setNotifications(prev => prev.filter(n => n.id !== id))
            if (notification && !notification.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1))
            }
        } else {
            toast.error('Failed to delete notification')
        }
    }

    const handleClearAll = async () => {
        const result = await clearAllNotifications()
        if (result.success) {
            setNotifications([])
            setUnreadCount(0)
            toast.success('All notifications cleared')
        } else {
            toast.error('Failed to clear notifications')
        }
    }

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await handleMarkAsRead(notification.id)
        }
        if (notification.link) {
            setOpen(false)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button className="relative inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                    <span className="sr-only">Notifications ({unreadCount} unread)</span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Notifications</h3>
                        {unreadCount > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                {unreadCount} new
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={handleMarkAllAsRead}
                            >
                                <CheckCheck className="mr-1 h-3 w-3" />
                                Mark all read
                            </Button>
                        )}
                    </div>
                </div>

                {/* Notifications List */}
                <ScrollArea className="h-[400px]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-pulse text-muted-foreground">Loading...</div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">No notifications</p>
                            <p className="text-xs text-muted-foreground/70">You&apos;re all caught up!</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onClick={() => handleNotificationClick(notification)}
                                    onDelete={(e) => handleDelete(notification.id, e)}
                                    onMarkAsRead={() => handleMarkAsRead(notification.id)}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                {notifications.length > 0 && (
                    <>
                        <Separator />
                        <div className="flex items-center justify-between p-2">
                            <Link href="/dashboard/settings" onClick={() => setOpen(false)}>
                                <Button variant="ghost" size="sm" className="h-8 text-xs">
                                    <Settings className="mr-1 h-3 w-3" />
                                    Settings
                                </Button>
                            </Link>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-destructive hover:text-destructive"
                                onClick={handleClearAll}
                            >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Clear all
                            </Button>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    )
}

function NotificationItem({
    notification,
    onClick,
    onDelete,
    onMarkAsRead
}: {
    notification: Notification
    onClick: () => void
    onDelete: (e: React.MouseEvent) => void
    onMarkAsRead: () => void
}) {
    const content = (
        <div
            className={cn(
                'group relative flex gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors',
                !notification.is_read && 'bg-primary/5'
            )}
            onClick={onClick}
        >
            {/* Unread indicator */}
            {!notification.is_read && (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
            )}

            {/* Icon */}
            <div className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                notificationColors[notification.type]
            )}>
                {notificationIcons[notification.type]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={cn(
                    'text-sm line-clamp-1',
                    !notification.is_read && 'font-semibold'
                )}>
                    {notification.title}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {notification.message}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
            </div>

            {/* Actions */}
            <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notification.is_read && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            onMarkAsRead()
                        }}
                    >
                        <Check className="h-3.5 w-3.5" />
                        <span className="sr-only">Mark as read</span>
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={onDelete}
                >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Delete</span>
                </Button>
            </div>
        </div>
    )

    if (notification.link) {
        return (
            <Link href={notification.link} className="block">
                {content}
            </Link>
        )
    }

    return content
}
