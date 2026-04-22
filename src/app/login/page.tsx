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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-white dark:bg-black">
      {/* Ambient glowing background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px] mix-blend-screen opacity-50 dark:opacity-40 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-400/20 rounded-full blur-[150px] mix-blend-screen opacity-50 dark:opacity-30"></div>
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-indigo-500/20 rounded-full blur-[100px] mix-blend-screen opacity-60 dark:opacity-40"></div>

      <div className="relative z-10 w-full max-w-md p-6">
        {/* Elegant Logo / Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent drop-shadow-sm">
            Lamaha.
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">
            Minimalist Financial Intelligence
          </p>
        </div>

        {/* Minimalist Glass Card */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-950/70 border border-white/20 dark:border-gray-800/50 shadow-2xl shadow-blue-500/5 rounded-3xl p-8 relative overflow-hidden">
          {/* Subtle noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
