import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SignInForm } from './sign-in-form'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('SignInForm', () => {
  it('[AC-1] submits credentials, keeps the session cookie-backed, and navigates to the board on success', async () => {
    const originalFetch = global.fetch
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: { get: () => 'session=opaque; HttpOnly; Secure; SameSite=Lax; Path=/' },
      json: async () => ({ user: { id: 'member-1', email: 'alex@team.example', name: 'Alex', role: 'member' } }),
    })
    global.fetch = fetchMock as jest.MockedFunction<typeof fetch>

    try {
      render(<SignInForm />)
      fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
        target: { value: 'alex@team.example' },
      })
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse' } })
      fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }))

      expect(await screen.findByText("You're signed in. Opening the kudos board…")).toBeInTheDocument()
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/board'))
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/auth/sessions',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ email: 'alex@team.example', password: 'correct-horse' }),
        }),
      )
      expect(screen.getByLabelText('Email address')).toHaveValue('alex@team.example')
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    } finally {
      global.fetch = originalFetch
      mockPush.mockReset()
    }
  })
})
