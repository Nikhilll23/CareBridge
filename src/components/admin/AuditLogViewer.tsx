'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getAuditLogs } from '@/actions/audit'
import { RefreshCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

export function AuditLogViewer() {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [searchId, setSearchId] = useState('')

    const fetchLogs = async () => {
        setLoading(true)
        const data = await getAuditLogs(undefined, searchId || undefined)
        setLogs(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    return (
        <Card className="h-[600px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Security & Audit Trail
                </CardTitle>
                <div className="flex gap-2">
                    <Input
                        placeholder="Filter by Record ID..."
                        className="w-[200px]"
                        value={searchId}
                        onChange={e => setSearchId(e.target.value)}
                    />
                    <Button variant="outline" size="icon" onClick={fetchLogs}>
                        <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Table</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Changes (JSON Diff)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="whitespace-nowrap font-mono text-xs">
                                        {format(new Date(log.timestamp), 'MMM dd HH:mm:ss')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            log.action === 'DELETE' ? 'destructive' :
                                                log.action === 'UPDATE' ? 'secondary' : 'default'
                                        }>
                                            {log.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-semibold">{log.table_name}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{log.performed_by}</TableCell>
                                    <TableCell className="font-mono text-xs max-w-[400px]">
                                        {log.action === 'UPDATE' ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-red-50 p-1 rounded text-red-700 overflow-hidden text-ellipsis">
                                                    {JSON.stringify(log.old_data).substring(0, 50)}...
                                                </div>
                                                <div className="bg-green-50 p-1 rounded text-green-700 overflow-hidden text-ellipsis">
                                                    {JSON.stringify(log.new_data).substring(0, 50)}...
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-muted-foreground">
                                                {JSON.stringify(log.new_data || log.old_data).substring(0, 60)}...
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
