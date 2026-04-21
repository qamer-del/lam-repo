'use server'

import { signIn } from '@/auth'
import { AuthError } from 'next-auth'

export async function signInAction(formData: FormData) {
  try {
    await signIn('credentials', formData)
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === 'CredentialsSignin') return { error: 'Invalid credentials.' }
      return { error: 'Something went wrong.' }
    }
    throw error
  }
}
