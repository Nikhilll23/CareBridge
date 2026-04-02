import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url')
    if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })

    try {
        const res = await fetch(decodeURIComponent(url), {
            headers: {
                'User-Agent': 'HIS-Core-Medical-System/1.0',
                'Accept': '*/*',
            },
        })

        if (!res.ok) {
            return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: res.status })
        }

        const contentType = res.headers.get('content-type') || 'application/octet-stream'
        const buffer = await res.arrayBuffer()

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
            },
        })
    } catch (err) {
        return NextResponse.json({ error: 'Proxy fetch failed' }, { status: 500 })
    }
}
