'use client'

import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'

// This component wraps the actual LiveMap with client-side only loading logic.
// Accessing 'ssr: false' is only allowed in Client Components in strict app router setups sometimes,
// or at least it segregates the "window" requirement safely away from the Server Component page.

const LiveMap = dynamic(() => import('@/components/modules/map/LiveMap'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-muted/20 text-muted-foreground">
            <div className="text-center">
                <MapPin className="h-8 w-8 mx-auto mb-2 animate-bounce" />
                <p>Loading Map Interface...</p>
            </div>
        </div>
    )
})

export default function LiveMapWrapper(props: any) {
    return <LiveMap {...props} />
}
