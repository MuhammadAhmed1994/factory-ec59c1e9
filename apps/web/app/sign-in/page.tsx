import type { Metadata } from 'next'
import { SignInForm } from '../../components/sign-in-form'

export const metadata: Metadata = {
  title: 'Sign in — Kudos Board',
}

export default function SignInPage() {
  return <SignInForm />
}
