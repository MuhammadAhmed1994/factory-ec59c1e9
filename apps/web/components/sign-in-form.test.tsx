import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '../lib/api-client'
import SignInForm from './sign-in-form'

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../lib/api-client', () => ({ apiRequest: jest.fn() }))

it('[AC-1] successful credentials submission establishes signed-in state and navigates to /board', async () => {
  const push = jest.fn()
  jest.mocked(useRouter).mockReturnValue({ push } as never)
  jest.mocked(apiRequest).mockResolvedValue({
    user: { id: 'member-1', email: 'alex@team.example' },
  } as never)

  render(<SignInForm />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
    target: { value: 'alex@team.example' },
  })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } })
  fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }))

  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/auth/sessions', {
    method: 'POST',
    body: JSON.stringify({ email: 'alex@team.example', password: 'secret-password' }),
  }))
  expect(screen.getByRole('status')).toHaveTextContent("You're signed in. Opening the kudos board…")
  expect(push).toHaveBeenCalledWith('/board')
})
