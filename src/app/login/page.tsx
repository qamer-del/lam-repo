import { LoginForm } from './login-form'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Automatically seed a default admin if none exists
async function ensureAdminExists() {
  const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10)
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        username: 'admin',
        password: hashedPassword,
        role: 'ADMIN',
      }
    })
  }
}

export default async function LoginPage() {
  await ensureAdminExists()

  return (
    <div className="min-h-screen flex w-full bg-white dark:bg-gray-950">
      {/* Left Side: Art & Branding */}
      <div className="hidden lg:flex w-1/2 relative bg-gray-900 overflow-hidden items-center justify-center">
        {/* The generated abstract art */}
        <div className="absolute inset-0 z-0">
          <img src="/login-bg.png" alt="Abstract Background" className="w-full h-full object-cover opacity-90 mix-blend-screen" />
        </div>
        
        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10"></div>
        
        <div className="relative z-20 flex flex-col justify-end h-full w-full p-16 pb-24 text-white">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4">Lamaha.</h1>
          <p className="text-xl font-light text-gray-300 max-w-md leading-relaxed">
            Financial Management Refined. Elevate your business intelligence with unparalleled clarity.
          </p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative overflow-hidden">
        {/* Subtle decorative blob for right side */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="w-full max-w-md z-10">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
