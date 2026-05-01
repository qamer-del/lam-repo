import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from '@/providers/language-provider';
import { Sidebar, MobileNav, MobileTopBar } from '@/components/navigation';
import { auth } from "@/auth"
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "AUTO-GLOSS | Accounting & Payroll",
  description: "Professional internal accounting and payroll management system for Car Detailing Shop",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth()
  console.log("LAYOUT SESSION:", session)

  return (
    <html lang="en" className={`${inter.variable} ${cairo.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <SessionProvider session={session}>
          <LanguageProvider>
            {session ? (
              <div className="flex flex-col md:flex-row min-h-screen">
                <Sidebar role={session?.user?.role} />
                <div className="flex-1 flex flex-col min-w-0">
                  <MobileTopBar />
                  <main className="flex-1 pb-24 md:pb-0">
                    {children}
                  </main>
                </div>
                <MobileNav role={session?.user?.role} />
              </div>
            ) : (
              children
            )}
            <Toaster position="top-right" richColors />
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
