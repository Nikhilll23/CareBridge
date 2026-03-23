import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #4a5568 0%, #2d3748 50%, #1a2e1a 100%)'}}>
      <div className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            CareBridge
          </h1>
          <p className="text-gray-300">
            Sign in to access the medical portal
          </p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              formButtonPrimary: 
                'bg-primary hover:bg-primary/90 text-sm normal-case',
              card: 'shadow-xl',
            },
          }}
        />
      </div>
    </div>
  )
}
