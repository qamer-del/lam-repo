'use server'

import { signIn } from '@/auth'
import { AuthError } from 'next-auth'

export async function signInAction(formData: FormData) {
  try {
    // Redirect to home; the home page will forward to /branch-select if needed
    await signIn('credentials', { ...Object.fromEntries(formData), redirectTo: '/' })
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === 'CredentialsSignin') return { error: 'Invalid credentials.' }
      return { error: 'Something went wrong.' }
    }
    throw error
  }
}
