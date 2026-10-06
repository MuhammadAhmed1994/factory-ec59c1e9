import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SignInForm from './sign-in-form'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('sign-in form', () => {
  it('[AC-1] submits credentials with cookie credentials and navigates to /board', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({}),
    } as Response)
    globalThis.fetch = fetchMock as typeof fetch
    mockPush.mockClear()

    render(<SignInForm />)
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'alex@team.example' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/board'))
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/auth/sessions',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'alex@team.example', password: 'secret-password' }),
      }),
    )
    expect(screen.getByLabelText('Email address')).toHaveValue('alex@team.example')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('status')).toHaveTextContent("You're signed in. Opening the kudos board…")
  })
})
