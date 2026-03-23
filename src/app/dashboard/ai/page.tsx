import { AIChat } from '@/components/modules/ai/AIChat'
import { syncUser } from '@/actions/auth'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Assistant - CareBridge',
  description: 'Your intelligent medical assistant'
}

export default async function AIPage() {
  const user = await syncUser()
  if (!user) redirect('/sign-in')

  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-muted-foreground">
          Get instant answers and helpers tailored to your role.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <AIChat userRole={user.role} userName={user.firstName} />
      </div>
    </div>
  )
}
