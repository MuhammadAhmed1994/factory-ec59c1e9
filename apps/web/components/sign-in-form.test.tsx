import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SignInForm from './sign-in-form'

const mockPush = jest.fn()
const originalFetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch')

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

afterEach(() => {
  jest.restoreAllMocks()
  mockPush.mockReset()
  if (originalFetchDescriptor) {
    Object.defineProperty(globalThis, 'fetch', originalFetchDescriptor)
  } else {
    Reflect.deleteProperty(globalThis, 'fetch')
  }
})

describe('sign-in form', () => {
  it('[AC-1] submits credentials, establishes the cookie-backed session request, and navigates to /board', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ user: { id: 'member-1', email: 'alex@team.example', name: 'Alex', role: 'MEMBER' } }),
    } as Response)
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: fetchMock })

    render(<SignInForm />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
      target: { value: 'alex@team.example' },
    })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/board'))
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/auth/sessions',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'alex@team.example', password: 'correct-horse' }),
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent("You're signed in. Opening the kudos board…")
  })
})
